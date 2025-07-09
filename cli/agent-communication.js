const Redis = require('ioredis');
const EventEmitter = require('events');

class AgentCommunication extends EventEmitter {
  constructor(agentId) {
    super();
    this.agentId = agentId;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.messageHistory = [];
    this.maxHistorySize = 1000;
    
    this.init();
  }
  
  async init() {
    // Subscribe to channels
    await this.subscribeToChannels();
    
    // Set up message handling
    this.setupMessageHandling();
    
    // Start periodic cleanup
    this.startCleanup();
  }
  
  async subscribeToChannels() {
    const channels = [
      `messages:${this.agentId}`,    // Personal messages
      'agent-chat',                   // Global chat
      'agent-emergency',              // Emergency broadcasts
      'agent-announcements',          // System announcements
      'code-review-requests',         // Code review requests
      'coordination-required',        // Coordination requests
      'file-locks',                   // File lock notifications
      'agent-registry',               // Agent registration events
      'project-updates',              // Project status updates
      'conflict-resolution',          // Conflict resolution events
      'approval-required'             // Approval requests
    ];
    
    for (const channel of channels) {
      await this.subscriber.subscribe(channel);
    }
    
    console.log(`📡 Agent ${this.agentId} subscribed to communication channels`);
  }
  
  setupMessageHandling() {
    this.subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.processMessage(channel, data);
      } catch (error) {
        console.error(`❌ Error processing message on ${channel}:`, error);
      }
    });
  }
  
  async processMessage(channel, data) {
    // Store in history
    this.addToHistory(channel, data);
    
    // Route message based on channel
    switch (channel) {
      case `messages:${this.agentId}`:
        await this.handleDirectMessage(data);
        break;
      case 'agent-chat':
        await this.handleChatMessage(data);
        break;
      case 'agent-emergency':
        await this.handleEmergencyMessage(data);
        break;
      case 'code-review-requests':
        await this.handleCodeReviewRequest(data);
        break;
      case 'coordination-required':
        await this.handleCoordinationRequest(data);
        break;
      case 'file-locks':
        await this.handleFileLockNotification(data);
        break;
      case 'agent-registry':
        await this.handleAgentRegistryEvent(data);
        break;
      case 'project-updates':
        await this.handleProjectUpdate(data);
        break;
      case 'conflict-resolution':
        await this.handleConflictResolution(data);
        break;
      case 'approval-required':
        await this.handleApprovalRequest(data);
        break;
      default:
        console.log(`📨 Unhandled channel: ${channel}`, data);
    }
    
    // Emit event for external handling
    this.emit('message', { channel, data });
  }
  
  async handleDirectMessage(data) {
    console.log(`💬 Direct message from ${data.from}: ${data.message}`);
    
    // Auto-respond to certain message types
    if (data.type === 'ping') {
      await this.sendDirectMessage(data.from, 'pong', 'ping_response');
    }
    
    if (data.type === 'status_request') {
      const status = await this.getAgentStatus();
      await this.sendDirectMessage(data.from, JSON.stringify(status), 'status_response');
    }
    
    this.emit('directMessage', data);
  }
  
  async handleChatMessage(data) {
    if (data.from !== this.agentId) {
      console.log(`🗨️  [${data.from}]: ${data.message}`);
      
      // Respond to mentions
      if (data.message.includes(`@${this.agentId}`)) {
        this.emit('mentioned', data);
      }
    }
  }
  
  async handleEmergencyMessage(data) {
    console.log(`🚨 EMERGENCY: ${data.message}`);
    
    // Implement emergency protocols
    if (data.type === 'shutdown') {
      console.log('🛑 Emergency shutdown initiated');
      this.emit('emergencyShutdown', data);
    }
    
    if (data.type === 'conflict_resolution') {
      console.log('⚡ Conflict resolution protocol activated');
      this.emit('conflictResolution', data);
    }
  }
  
  async handleCodeReviewRequest(data) {
    console.log(`📋 Code review request for ${data.file} from ${data.from}`);
    
    // Check if this agent has relevant capabilities
    const agentInfo = await this.redis.hgetall(`agent:${this.agentId}`);
    const capabilities = JSON.parse(agentInfo.capabilities || '[]');
    
    if (this.hasRelevantCapabilities(data.file, capabilities)) {
      console.log(`✅ Accepting code review for ${data.file}`);
      await this.sendDirectMessage(data.from, `I'll review ${data.file}`, 'review_accepted');
      this.emit('codeReviewRequest', data);
    }
  }
  
  async handleCoordinationRequest(data) {
    console.log(`🤝 Coordination request for ${data.file} from ${data.requesting_agent}`);
    
    if (data.owning_agent === this.agentId) {
      console.log('📞 I am the file owner, initiating coordination');
      await this.initiateCoordination(data);
    }
    
    this.emit('coordinationRequest', data);
  }
  
  async handleFileLockNotification(data) {
    switch (data.type) {
      case 'file_claimed':
        console.log(`🔒 ${data.agent} claimed ${data.file}`);
        break;
      case 'file_released':
        console.log(`🔓 ${data.agent} released ${data.file}`);
        break;
      case 'file_force_locked':
        console.log(`⚡ ${data.agent} force-locked ${data.file} from ${data.previous_owner}`);
        break;
    }
    
    this.emit('fileLockNotification', data);
  }
  
  async handleAgentRegistryEvent(data) {
    switch (data.type) {
      case 'agent_registered':
        console.log(`👋 Agent ${data.agent.id} joined with capabilities: ${data.agent.capabilities}`);
        break;
      case 'agent_status_updated':
        console.log(`📊 Agent ${data.agent} status: ${data.status}`);
        break;
    }
    
    this.emit('agentRegistryEvent', data);
  }
  
  async handleProjectUpdate(data) {
    console.log(`📈 Project update: ${data.message}`);
    this.emit('projectUpdate', data);
  }
  
  async handleConflictResolution(data) {
    console.log(`⚖️  Conflict resolution for ${data.file}: ${data.type}`);
    this.emit('conflictResolution', data);
  }
  
  async handleApprovalRequest(data) {
    console.log(`✋ Approval required for ${data.file} by ${data.requesting_agent}`);
    this.emit('approvalRequest', data);
  }
  
  async sendDirectMessage(targetAgent, message, type = 'general', priority = 'normal') {
    const msg = {
      type,
      from: this.agentId,
      to: targetAgent,
      message,
      priority,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.lpush(`messages:${targetAgent}`, JSON.stringify(msg));
    console.log(`📤 Direct message sent to ${targetAgent}: ${message}`);
    
    return msg;
  }
  
  async broadcastMessage(message, type = 'general', priority = 'normal') {
    const msg = {
      type,
      from: this.agentId,
      to: 'all',
      message,
      priority,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.publish('agent-chat', JSON.stringify(msg));
    console.log(`📢 Broadcast message: ${message}`);
    
    return msg;
  }
  
  async sendEmergencyMessage(message, type = 'emergency') {
    const msg = {
      type,
      from: this.agentId,
      message,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.publish('agent-emergency', JSON.stringify(msg));
    console.log(`🚨 Emergency message: ${message}`);
    
    return msg;
  }
  
  async requestCodeReview(filePath, targetAgent, message = '') {
    const reviewRequest = {
      type: 'code_review',
      from: this.agentId,
      file: filePath,
      message: message || `Please review ${filePath}`,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.publish('code-review-requests', JSON.stringify(reviewRequest));
    console.log(`📋 Code review requested for ${filePath}`);
    
    return reviewRequest;
  }
  
  async announceProjectUpdate(message, type = 'general') {
    const update = {
      type,
      from: this.agentId,
      message,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.publish('project-updates', JSON.stringify(update));
    console.log(`📈 Project update announced: ${message}`);
    
    return update;
  }
  
  async getActiveConversations() {
    const conversations = await this.redis.lrange(`messages:${this.agentId}`, 0, -1);
    return conversations.map(msg => JSON.parse(msg));
  }
  
  async getAgentStatus() {
    return await this.redis.hgetall(`agent:${this.agentId}`);
  }
  
  async getOnlineAgents() {
    const keys = await this.redis.keys('agent:*');
    const agents = [];
    
    for (const key of keys) {
      const agentData = await this.redis.hgetall(key);
      if (agentData.status === 'active') {
        agents.push(agentData);
      }
    }
    
    return agents;
  }
  
  hasRelevantCapabilities(filePath, capabilities) {
    const fileExt = filePath.split('.').pop();
    const relevantCapabilities = {
      'js': ['javascript', 'node', 'frontend', 'backend'],
      'jsx': ['react', 'frontend', 'ui'],
      'ts': ['typescript', 'frontend', 'backend'],
      'tsx': ['react', 'typescript', 'frontend'],
      'py': ['python', 'backend', 'ai'],
      'css': ['css', 'frontend', 'ui'],
      'html': ['html', 'frontend', 'ui'],
      'md': ['documentation', 'writing'],
      'yaml': ['devops', 'deployment'],
      'json': ['configuration', 'data']
    };
    
    const fileCapabilities = relevantCapabilities[fileExt] || [];
    return capabilities.some(cap => fileCapabilities.includes(cap));
  }
  
  async initiateCoordination(data) {
    const coordinationSession = {
      id: `coord_${Date.now()}`,
      file: data.file,
      participants: [this.agentId, data.requesting_agent],
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    await this.redis.hset(`coordination:${coordinationSession.id}`, coordinationSession);
    
    // Notify participants
    await this.sendDirectMessage(data.requesting_agent, 
      `Coordination session started for ${data.file}. Session ID: ${coordinationSession.id}`,
      'coordination_started'
    );
    
    return coordinationSession;
  }
  
  addToHistory(channel, data) {
    this.messageHistory.push({
      channel,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }
  
  startCleanup() {
    // Clean up old messages every hour
    setInterval(async () => {
      try {
        // Clean up old direct messages
        const messageKeys = await this.redis.keys('messages:*');
        for (const key of messageKeys) {
          const length = await this.redis.llen(key);
          if (length > 100) {
            await this.redis.ltrim(key, 0, 99); // Keep last 100 messages
          }
        }
        
        console.log(`🧹 Cleaned up old messages`);
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    }, 3600000); // 1 hour
  }
  
  async disconnect() {
    await this.subscriber.quit();
    await this.redis.quit();
    console.log(`📡 Agent ${this.agentId} disconnected from communication system`);
  }
}

module.exports = AgentCommunication;