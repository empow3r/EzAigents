const Redis = require('ioredis');
const EventEmitter = require('events');

class AgentHealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.healthCheckInterval = 30000; // 30 seconds
    this.unresponsiveThreshold = 90000; // 90 seconds
    this.autoRecoveryEnabled = true;
    this.agentRegistry = new Map();
    this.healthStats = new Map();
    
    this.init();
  }
  
  async init() {
    console.log('🏥 Agent Health Monitor initializing...');
    
    // Subscribe to agent events
    await this.subscribeToEvents();
    
    // Start health checking
    this.startHealthChecking();
    
    // Start auto-recovery if enabled
    if (this.autoRecoveryEnabled) {
      this.startAutoRecovery();
    }
    
    // Start cleanup routines
    this.startCleanup();
    
    console.log('✅ Agent Health Monitor online');
  }
  
  async subscribeToEvents() {
    const channels = [
      'agent-registry',
      'agent-heartbeat',
      'agent-status',
      'agent-errors',
      'agent-chat',
      'agent-emergency'
    ];
    
    for (const channel of channels) {
      await this.subscriber.subscribe(channel);
    }
    
    this.subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.processHealthEvent(channel, data);
      } catch (error) {
        console.error(`❌ Error processing health event on ${channel}:`, error);
      }
    });
  }
  
  async processHealthEvent(channel, data) {
    switch (channel) {
      case 'agent-registry':
        await this.handleAgentRegistration(data);
        break;
      case 'agent-heartbeat':
        await this.handleHeartbeat(data);
        break;
      case 'agent-status':
        await this.handleStatusUpdate(data);
        break;
      case 'agent-errors':
        await this.handleAgentError(data);
        break;
      case 'agent-emergency':
        await this.handleEmergency(data);
        break;
    }
  }
  
  async handleAgentRegistration(data) {
    const { agent, type } = data;
    
    if (type === 'agent_registered') {
      console.log(`🤖 Registering agent: ${agent.id}`);
      
      this.agentRegistry.set(agent.id, {
        ...agent,
        registered_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        status: 'active',
        error_count: 0,
        recovery_attempts: 0
      });
      
      this.healthStats.set(agent.id, {
        total_heartbeats: 0,
        missed_heartbeats: 0,
        error_count: 0,
        last_error: null,
        uptime_start: Date.now(),
        recovery_count: 0
      });
      
      // Store in Redis for persistence
      await this.redis.hset(`agent:${agent.id}`, {
        id: agent.id,
        capabilities: JSON.stringify(agent.capabilities || []),
        status: 'active',
        registered_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString()
      });
      
      this.emit('agentRegistered', agent);
    } else if (type === 'agent_unregistered') {
      console.log(`👋 Unregistering agent: ${agent.id}`);
      
      this.agentRegistry.delete(agent.id);
      this.healthStats.delete(agent.id);
      
      await this.redis.del(`agent:${agent.id}`);
      
      this.emit('agentUnregistered', agent);
    }
  }
  
  async handleHeartbeat(data) {
    const { agent_id, timestamp, status, metrics } = data;
    
    if (this.agentRegistry.has(agent_id)) {
      const agent = this.agentRegistry.get(agent_id);
      const stats = this.healthStats.get(agent_id);
      
      // Update agent info
      agent.last_heartbeat = timestamp || new Date().toISOString();
      agent.status = status || 'active';
      
      // Update stats
      stats.total_heartbeats++;
      stats.last_heartbeat = timestamp || new Date().toISOString();
      
      // Store metrics if provided
      if (metrics) {
        agent.metrics = metrics;
        await this.redis.hset(`agent:metrics:${agent_id}`, {
          ...metrics,
          timestamp: timestamp || new Date().toISOString()
        });
      }
      
      // Update Redis
      await this.redis.hset(`agent:${agent_id}`, {
        status: agent.status,
        last_heartbeat: agent.last_heartbeat,
        metrics: JSON.stringify(metrics || {})
      });
      
      this.emit('heartbeat', { agent_id, timestamp, status, metrics });
    }
  }
  
  async handleStatusUpdate(data) {
    const { agent_id, status, current_task, message } = data;
    
    if (this.agentRegistry.has(agent_id)) {
      const agent = this.agentRegistry.get(agent_id);
      
      agent.status = status;
      agent.current_task = current_task;
      agent.last_status_update = new Date().toISOString();
      
      await this.redis.hset(`agent:${agent_id}`, {
        status,
        current_task: current_task || '',
        last_status_update: agent.last_status_update
      });
      
      console.log(`📊 Agent ${agent_id} status: ${status} ${current_task ? `(${current_task})` : ''}`);
      
      this.emit('statusUpdate', { agent_id, status, current_task, message });
    }
  }
  
  async handleAgentError(data) {
    const { agent_id, error, timestamp, severity } = data;
    
    console.error(`❌ Agent error from ${agent_id}: ${error} (severity: ${severity})`);
    
    if (this.agentRegistry.has(agent_id)) {
      const agent = this.agentRegistry.get(agent_id);
      const stats = this.healthStats.get(agent_id);
      
      agent.error_count++;
      agent.last_error = { error, timestamp, severity };
      
      stats.error_count++;
      stats.last_error = { error, timestamp, severity };
      
      // Log error to Redis
      await this.redis.lpush(`agent:errors:${agent_id}`, JSON.stringify({
        error,
        timestamp: timestamp || new Date().toISOString(),
        severity: severity || 'medium'
      }));
      
      // Trim error log to last 100 entries
      await this.redis.ltrim(`agent:errors:${agent_id}`, 0, 99);
      
      this.emit('agentError', { agent_id, error, timestamp, severity });
      
      // Trigger recovery if critical error
      if (severity === 'critical' && this.autoRecoveryEnabled) {
        await this.attemptRecovery(agent_id, 'critical_error');
      }
    }
  }
  
  async handleEmergency(data) {
    const { type, agent_id, message } = data;
    
    console.log(`🚨 Emergency event: ${type} from ${agent_id || 'unknown'}`);
    
    if (type === 'agent_crashed' && agent_id) {
      await this.handleAgentCrash(agent_id);
    } else if (type === 'system_overload') {
      await this.handleSystemOverload();
    }
    
    this.emit('emergency', data);
  }
  
  async startHealthChecking() {
    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('❌ Health check error:', error);
      }
    }, this.healthCheckInterval);
  }
  
  async performHealthChecks() {
    const now = Date.now();
    const unresponsiveAgents = [];
    
    for (const [agentId, agent] of this.agentRegistry) {
      const lastHeartbeat = new Date(agent.last_heartbeat).getTime();
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      if (timeSinceHeartbeat > this.unresponsiveThreshold) {
        unresponsiveAgents.push(agentId);
        
        // Mark as unresponsive
        agent.status = 'unresponsive';
        
        const stats = this.healthStats.get(agentId);
        stats.missed_heartbeats++;
        
        await this.redis.hset(`agent:${agentId}`, {
          status: 'unresponsive',
          last_health_check: new Date().toISOString()
        });
        
        console.log(`⚠️  Agent ${agentId} is unresponsive (${Math.floor(timeSinceHeartbeat / 1000)}s since last heartbeat)`);
        
        this.emit('agentUnresponsive', { 
          agent_id: agentId, 
          time_since_heartbeat: timeSinceHeartbeat 
        });
        
        // Attempt recovery
        if (this.autoRecoveryEnabled) {
          await this.attemptRecovery(agentId, 'unresponsive');
        }
      }
    }
    
    // Check system health
    await this.checkSystemHealth();
  }
  
  async checkSystemHealth() {
    const totalAgents = this.agentRegistry.size;
    const activeAgents = Array.from(this.agentRegistry.values())
      .filter(agent => agent.status === 'active').length;
    
    const systemHealth = {
      total_agents: totalAgents,
      active_agents: activeAgents,
      inactive_agents: totalAgents - activeAgents,
      health_percentage: totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 100,
      timestamp: new Date().toISOString()
    };
    
    await this.redis.hset('system:health', systemHealth);
    
    // Alert if system health is low
    if (systemHealth.health_percentage < 70) {
      console.log(`⚠️  System health warning: ${systemHealth.health_percentage.toFixed(1)}% agents active`);
      
      await this.redis.publish('agent-emergency', JSON.stringify({
        type: 'low_system_health',
        health_percentage: systemHealth.health_percentage,
        details: systemHealth
      }));
    }
    
    this.emit('systemHealthUpdate', systemHealth);
  }
  
  async attemptRecovery(agentId, reason) {
    const agent = this.agentRegistry.get(agentId);
    const stats = this.healthStats.get(agentId);
    
    if (!agent) return;
    
    agent.recovery_attempts++;
    stats.recovery_count++;
    
    console.log(`🔄 Attempting recovery for agent ${agentId} (reason: ${reason}, attempt: ${agent.recovery_attempts})`);
    
    // Try different recovery strategies
    const recoveryStrategies = [
      () => this.pingAgent(agentId),
      () => this.restartAgent(agentId),
      () => this.escalateToHuman(agentId, reason)
    ];
    
    const strategyIndex = Math.min(agent.recovery_attempts - 1, recoveryStrategies.length - 1);
    
    try {
      await recoveryStrategies[strategyIndex]();
      
      // Log recovery attempt
      await this.redis.lpush(`agent:recovery:${agentId}`, JSON.stringify({
        reason,
        strategy: strategyIndex,
        timestamp: new Date().toISOString(),
        attempt: agent.recovery_attempts
      }));
      
      this.emit('recoveryAttempt', { 
        agent_id: agentId, 
        reason, 
        strategy: strategyIndex, 
        attempt: agent.recovery_attempts 
      });
      
    } catch (error) {
      console.error(`❌ Recovery failed for agent ${agentId}:`, error);
      
      this.emit('recoveryFailed', { 
        agent_id: agentId, 
        reason, 
        error: error.message 
      });
    }
  }
  
  async pingAgent(agentId) {
    console.log(`📡 Pinging agent ${agentId}...`);
    
    // Send ping message
    await this.redis.lpush(`messages:${agentId}`, JSON.stringify({
      type: 'ping',
      from: 'health-monitor',
      message: 'Health check ping',
      timestamp: new Date().toISOString()
    }));
    
    // Publish ping to agent's channel
    await this.redis.publish('agent-health-ping', JSON.stringify({
      target_agent: agentId,
      timestamp: new Date().toISOString()
    }));
  }
  
  async restartAgent(agentId) {
    console.log(`🔄 Requesting restart for agent ${agentId}...`);
    
    // Send restart command
    await this.redis.publish('agent-commands', JSON.stringify({
      type: 'restart',
      target_agent: agentId,
      reason: 'health_monitor_recovery',
      timestamp: new Date().toISOString()
    }));
  }
  
  async escalateToHuman(agentId, reason) {
    console.log(`🚨 Escalating agent ${agentId} to human intervention (reason: ${reason})`);
    
    const escalation = {
      type: 'human_intervention_required',
      agent_id: agentId,
      reason,
      recovery_attempts: this.agentRegistry.get(agentId)?.recovery_attempts || 0,
      timestamp: new Date().toISOString()
    };
    
    // Log escalation
    await this.redis.lpush('human-escalations', JSON.stringify(escalation));
    
    // Send emergency notification
    await this.redis.publish('agent-emergency', JSON.stringify(escalation));
    
    this.emit('humanEscalation', escalation);
  }
  
  async handleAgentCrash(agentId) {
    console.log(`💥 Handling crash for agent ${agentId}`);
    
    if (this.agentRegistry.has(agentId)) {
      const agent = this.agentRegistry.get(agentId);
      agent.status = 'crashed';
      
      await this.redis.hset(`agent:${agentId}`, {
        status: 'crashed',
        crashed_at: new Date().toISOString()
      });
      
      // Attempt immediate recovery
      if (this.autoRecoveryEnabled) {
        await this.attemptRecovery(agentId, 'crashed');
      }
    }
  }
  
  async handleSystemOverload() {
    console.log('🚨 Handling system overload...');
    
    // Pause non-critical tasks
    await this.redis.publish('agent-commands', JSON.stringify({
      type: 'pause_non_critical',
      reason: 'system_overload',
      timestamp: new Date().toISOString()
    }));
    
    // Scale down if possible
    await this.attemptSystemScaleDown();
  }
  
  async attemptSystemScaleDown() {
    const agents = Array.from(this.agentRegistry.values());
    const idleAgents = agents.filter(agent => 
      agent.status === 'idle' || agent.status === 'waiting'
    );
    
    if (idleAgents.length > 0) {
      console.log(`📉 Scaling down ${idleAgents.length} idle agents`);
      
      for (const agent of idleAgents.slice(0, Math.ceil(idleAgents.length / 2))) {
        await this.redis.publish('agent-commands', JSON.stringify({
          type: 'graceful_shutdown',
          target_agent: agent.id,
          reason: 'system_scale_down',
          timestamp: new Date().toISOString()
        }));
      }
    }
  }
  
  async startAutoRecovery() {
    console.log('🔄 Auto-recovery enabled');
    
    // Recovery runs every 2 minutes
    setInterval(async () => {
      try {
        await this.runAutoRecovery();
      } catch (error) {
        console.error('❌ Auto-recovery error:', error);
      }
    }, 120000);
  }
  
  async runAutoRecovery() {
    const unresponsiveAgents = Array.from(this.agentRegistry.values())
      .filter(agent => agent.status === 'unresponsive' || agent.status === 'crashed');
    
    for (const agent of unresponsiveAgents) {
      if (agent.recovery_attempts < 3) {
        await this.attemptRecovery(agent.id, 'auto_recovery');
      }
    }
  }
  
  async startCleanup() {
    // Cleanup old data every hour
    setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    }, 3600000);
  }
  
  async cleanupOldData() {
    console.log('🧹 Cleaning up old health data...');
    
    // Clean old error logs
    const agentKeys = await this.redis.keys('agent:errors:*');
    for (const key of agentKeys) {
      await this.redis.ltrim(key, 0, 99); // Keep last 100 errors
    }
    
    // Clean old recovery logs
    const recoveryKeys = await this.redis.keys('agent:recovery:*');
    for (const key of recoveryKeys) {
      await this.redis.ltrim(key, 0, 49); // Keep last 50 recovery attempts
    }
    
    // Clean old escalations
    await this.redis.ltrim('human-escalations', 0, 99);
    
    console.log('✅ Health data cleanup completed');
  }
  
  async getHealthReport() {
    const agents = Array.from(this.agentRegistry.values());
    const stats = Array.from(this.healthStats.entries()).map(([id, stats]) => ({
      agent_id: id,
      ...stats
    }));
    
    const systemHealth = await this.redis.hgetall('system:health');
    
    return {
      agents,
      stats,
      system_health: systemHealth,
      generated_at: new Date().toISOString()
    };
  }
  
  async getAgentHealth(agentId) {
    const agent = this.agentRegistry.get(agentId);
    const stats = this.healthStats.get(agentId);
    
    if (!agent || !stats) {
      return null;
    }
    
    const errors = await this.redis.lrange(`agent:errors:${agentId}`, 0, -1);
    const recovery = await this.redis.lrange(`agent:recovery:${agentId}`, 0, -1);
    
    return {
      agent,
      stats,
      recent_errors: errors.map(e => JSON.parse(e)).slice(0, 10),
      recent_recovery: recovery.map(r => JSON.parse(r)).slice(0, 10)
    };
  }
  
  async shutdown() {
    console.log('🛑 Health Monitor shutting down...');
    
    await this.subscriber.quit();
    await this.redis.quit();
    
    console.log('✅ Health Monitor shutdown complete');
  }
}

module.exports = AgentHealthMonitor;