const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

class AgentCoordinator {
  constructor(agentId, capabilities = [], priority = 'normal') {
    this.agentId = agentId;
    this.capabilities = capabilities;
    this.priority = priority;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.heartbeatInterval = 30000; // 30 seconds
    this.lockTimeout = 1800; // 30 minutes
    
    this.init();
  }
  
  async init() {
    // Register agent
    await this.registerAgent();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Listen for messages
    this.subscribeToMessages();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  async registerAgent() {
    const agentData = {
      id: this.agentId,
      status: 'active',
      capabilities: JSON.stringify(this.capabilities),
      priority: this.priority,
      registered_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString()
    };
    
    await this.redis.hset(`agent:${this.agentId}`, agentData);
    await this.redis.publish('agent-registry', JSON.stringify({
      type: 'agent_registered',
      agent: agentData
    }));
    
    console.log(`✅ Agent ${this.agentId} registered with capabilities: ${this.capabilities.join(', ')}`);
  }
  
  startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.redis.hset(`agent:${this.agentId}`, 'last_heartbeat', new Date().toISOString());
        await this.redis.expire(`agent:${this.agentId}`, 120); // 2 minutes TTL
      } catch (error) {
        console.error('❌ Heartbeat failed:', error);
      }
    }, this.heartbeatInterval);
  }
  
  async subscribeToMessages() {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Subscribe to personal messages
    await subscriber.subscribe(`messages:${this.agentId}`);
    
    // Subscribe to broadcast channels
    await subscriber.subscribe('agent-chat');
    await subscriber.subscribe('agent-emergency');
    await subscriber.subscribe('file-updates');
    
    subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleMessage(channel, data);
      } catch (error) {
        console.error('❌ Message handling error:', error);
      }
    });
  }
  
  async handleMessage(channel, data) {
    switch (channel) {
      case `messages:${this.agentId}`:
        console.log(`📨 Direct message from ${data.from}: ${data.message}`);
        break;
      case 'agent-chat':
        if (data.from !== this.agentId) {
          console.log(`💬 ${data.from}: ${data.message}`);
        }
        break;
      case 'agent-emergency':
        console.log(`🚨 EMERGENCY: ${data.message}`);
        break;
      case 'file-updates':
        console.log(`📁 File updated: ${data.file} by ${data.agent}`);
        break;
    }
  }
  
  async claimFile(filePath) {
    const lockKey = `lock:${filePath}`;
    const result = await this.redis.set(lockKey, this.agentId, 'EX', this.lockTimeout, 'NX');
    
    if (result === 'OK') {
      console.log(`🔒 File claimed: ${filePath}`);
      await this.redis.publish('file-updates', JSON.stringify({
        type: 'file_claimed',
        file: filePath,
        agent: this.agentId,
        timestamp: new Date().toISOString()
      }));
      return true;
    } else {
      const currentOwner = await this.redis.get(lockKey);
      console.log(`❌ File already locked by: ${currentOwner}`);
      return false;
    }
  }
  
  async releaseFile(filePath) {
    const lockKey = `lock:${filePath}`;
    const currentOwner = await this.redis.get(lockKey);
    
    if (currentOwner === this.agentId) {
      await this.redis.del(lockKey);
      console.log(`🔓 File released: ${filePath}`);
      
      await this.redis.publish('file-updates', JSON.stringify({
        type: 'file_released',
        file: filePath,
        agent: this.agentId,
        timestamp: new Date().toISOString()
      }));
      return true;
    } else {
      console.log(`❌ Cannot release file ${filePath} - not owned by ${this.agentId}`);
      return false;
    }
  }
  
  async sendMessage(targetAgent, message, type = 'general', priority = 'normal') {
    const msg = {
      type,
      from: this.agentId,
      to: targetAgent,
      message,
      priority,
      timestamp: new Date().toISOString()
    };
    
    if (targetAgent === 'all') {
      await this.redis.publish('agent-chat', JSON.stringify(msg));
    } else {
      await this.redis.lpush(`messages:${targetAgent}`, JSON.stringify(msg));
      await this.redis.publish('agent-chat', JSON.stringify(msg));
    }
    
    console.log(`📤 Message sent to ${targetAgent}: ${message}`);
  }
  
  async getMessages() {
    const messages = await this.redis.lrange(`messages:${this.agentId}`, 0, -1);
    await this.redis.del(`messages:${this.agentId}`); // Clear after reading
    return messages.map(msg => JSON.parse(msg));
  }
  
  async getActiveAgents() {
    const agents = [];
    const stream = this.redis.scanStream({ match: 'agent:*', count: 100 });
    
    const pipeline = this.redis.pipeline();
    const keys = [];
    
    for await (const batch of stream) {
      keys.push(...batch);
      batch.forEach(key => pipeline.hgetall(key));
    }
    
    if (keys.length === 0) return agents;
    
    const results = await pipeline.exec();
    
    for (let i = 0; i < results.length; i++) {
      const [err, agentData] = results[i];
      if (!err && agentData.status === 'active') {
        agents.push({
          id: agentData.id,
          capabilities: JSON.parse(agentData.capabilities || '[]'),
          priority: agentData.priority,
          last_heartbeat: agentData.last_heartbeat
        });
      }
    }
    
    return agents;
  }
  
  async getFileLocks() {
    const locks = {};
    const stream = this.redis.scanStream({ match: 'lock:*', count: 100 });
    
    const pipeline = this.redis.pipeline();
    const keys = [];
    
    for await (const batch of stream) {
      keys.push(...batch);
      batch.forEach(key => {
        pipeline.get(key);
        pipeline.ttl(key);
      });
    }
    
    if (keys.length === 0) return locks;
    
    const results = await pipeline.exec();
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const filePath = key.replace('lock:', '');
      const [ownerErr, owner] = results[i * 2];
      const [ttlErr, ttl] = results[i * 2 + 1];
      
      if (!ownerErr && !ttlErr) {
        locks[filePath] = { owner, ttl };
      }
    }
    
    return locks;
  }
  
  async requestReview(filePath, reviewerAgent, message) {
    await this.sendMessage(reviewerAgent, 
      `Code review requested for ${filePath}: ${message}`, 
      'review_request', 
      'high'
    );
  }
  
  async updateStatus(status, currentTask = null) {
    const updates = { status, last_heartbeat: new Date().toISOString() };
    if (currentTask) {
      updates.current_task = currentTask;
    }
    
    await this.redis.hset(`agent:${this.agentId}`, updates);
    
    await this.redis.publish('agent-registry', JSON.stringify({
      type: 'agent_status_updated',
      agent: this.agentId,
      status,
      current_task: currentTask,
      timestamp: new Date().toISOString()
    }));
  }
  
  async waitForFile(filePath, timeout = 300000) { // 5 minutes default
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.claimFile(filePath)) {
        return true;
      }
      
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(`⏰ Timeout waiting for file: ${filePath}`);
    return false;
  }
  
  async shutdown() {
    console.log(`🛑 Shutting down agent ${this.agentId}`);
    
    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Release all file locks
    const locks = await this.getFileLocks();
    for (const [filePath, lockInfo] of Object.entries(locks)) {
      if (lockInfo.owner === this.agentId) {
        await this.releaseFile(filePath);
      }
    }
    
    // Update status
    await this.updateStatus('offline');
    
    // Close Redis connections
    await this.redis.quit();
    
    console.log(`✅ Agent ${this.agentId} shut down gracefully`);
    process.exit(0);
  }
}

module.exports = AgentCoordinator;