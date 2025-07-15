const Redis = require('ioredis');
const EventEmitter = require('events');
const os = require('os');

class AgentHealthMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      unresponsiveThreshold: config.unresponsiveThreshold || 90000, // 90 seconds
      autoRecoveryEnabled: config.autoRecoveryEnabled !== false,
      maxResponseTime: config.maxResponseTime || 5000,
      criticalMemoryThreshold: config.criticalMemoryThreshold || 0.9,
      criticalCpuThreshold: config.criticalCpuThreshold || 0.8,
      alertThresholds: {
        responseTime: 3000,
        errorRate: 0.1,
        memoryUsage: 0.8,
        cpuUsage: 0.7,
        taskFailureRate: 0.2,
        ...config.alertThresholds
      },
      ...config
    };
    this.agentRegistry = new Map();
    this.healthStats = new Map();
    this.capacityMetrics = new Map();
    this.performanceHistory = new Map();
    this.alerts = new Map();
    
    this.init();
  }
  
  async init() {
    console.log('🏥 Agent Health Monitor initializing...');
    
    // Subscribe to agent events
    await this.subscribeToEvents();
    
    // Start health checking
    this.startHealthChecking();
    
    // Start capacity monitoring
    this.startCapacityMonitoring();
    
    // Start auto-recovery if enabled
    if (this.config.autoRecoveryEnabled) {
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
    }, this.config.healthCheckInterval);
  }
  
  async startCapacityMonitoring() {
    setInterval(async () => {
      try {
        await this.monitorAgentCapacity();
      } catch (error) {
        console.error('❌ Capacity monitoring error:', error);
      }
    }, 60000); // Every minute
  }
  
  async performHealthChecks() {
    const now = Date.now();
    const unresponsiveAgents = [];
    
    for (const [agentId, agent] of this.agentRegistry) {
      const lastHeartbeat = new Date(agent.last_heartbeat).getTime();
      const timeSinceHeartbeat = now - lastHeartbeat;
      
      // Perform comprehensive health check
      const healthResult = await this.performAgentHealthCheck(agentId, agent);
      await this.updatePerformanceHistory(agentId, healthResult);
      
      if (timeSinceHeartbeat > this.config.unresponsiveThreshold) {
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
        if (this.config.autoRecoveryEnabled) {
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
  
  async performAgentHealthCheck(agentId, agent) {
    const startTime = Date.now();
    let healthResult = {
      agentId,
      timestamp: startTime,
      status: 'unknown',
      responseTime: 0,
      metrics: {},
      score: 0
    };

    try {
      // Check Redis connectivity for agent
      const redisHealthy = await this.checkAgentRedisHealth(agentId);
      
      // Get system metrics
      const systemMetrics = await this.getAgentSystemMetrics(agentId);
      
      // Check queue health
      const queueHealth = await this.checkAgentQueueHealth(agentId);
      
      // Calculate response time
      healthResult.responseTime = Date.now() - startTime;
      
      // Determine status
      let status = 'healthy';
      if (!redisHealthy) status = 'unhealthy';
      if (systemMetrics.memoryUsage > this.config.criticalMemoryThreshold) status = 'critical';
      if (systemMetrics.cpuUsage > this.config.criticalCpuThreshold) status = 'degraded';
      if (queueHealth.backlog > 100) status = 'degraded';
      
      healthResult.status = status;
      healthResult.metrics = { ...systemMetrics, ...queueHealth, redisHealthy };
      healthResult.score = this.calculateAgentHealthScore(healthResult);
      
    } catch (error) {
      healthResult.status = 'error';
      healthResult.error = error.message;
      healthResult.score = 0;
    }

    return healthResult;
  }

  async checkAgentRedisHealth(agentId) {
    try {
      const start = Date.now();
      await this.redis.ping();
      return (Date.now() - start) < 1000;
    } catch (error) {
      return false;
    }
  }

  async getAgentSystemMetrics(agentId) {
    try {
      const freeMemory = os.freemem();
      const totalMemory = os.totalmem();
      const memoryUsage = (totalMemory - freeMemory) / totalMemory;
      
      // Get CPU usage (simplified)
      const cpuUsage = await this.getCpuUsage();
      
      return {
        memoryUsage,
        cpuUsage,
        freeMemory,
        totalMemory,
        loadAverage: os.loadavg()[0]
      };
    } catch (error) {
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        loadAverage: 0
      };
    }
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalTime = 100000; // 100ms in microseconds
        const cpuPercent = (endUsage.user + endUsage.system) / totalTime;
        resolve(Math.min(cpuPercent, 1));
      }, 100);
    });
  }

  async checkAgentQueueHealth(agentId) {
    try {
      const queueKeys = await this.redis.keys(`queue:${agentId}*`);
      let totalBacklog = 0;
      
      for (const queueKey of queueKeys) {
        const queueSize = await this.redis.zcard(queueKey);
        totalBacklog += queueSize;
      }
      
      return {
        backlog: totalBacklog,
        queueCount: queueKeys.length
      };
    } catch (error) {
      return {
        backlog: 0,
        queueCount: 0
      };
    }
  }

  calculateAgentHealthScore(healthResult) {
    let score = 1.0;
    
    switch (healthResult.status) {
      case 'healthy': score *= 1.0; break;
      case 'degraded': score *= 0.7; break;
      case 'unhealthy': score *= 0.3; break;
      case 'critical': score *= 0.1; break;
      case 'error': score *= 0.0; break;
      default: score *= 0.5;
    }
    
    if (healthResult.responseTime > this.config.alertThresholds.responseTime) {
      score *= 0.8;
    }
    
    if (healthResult.metrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      score *= 0.7;
    }
    
    if (healthResult.metrics.cpuUsage > this.config.alertThresholds.cpuUsage) {
      score *= 0.8;
    }
    
    return Math.max(score, 0);
  }

  async updatePerformanceHistory(agentId, healthResult) {
    if (!this.performanceHistory.has(agentId)) {
      this.performanceHistory.set(agentId, []);
    }
    
    const history = this.performanceHistory.get(agentId);
    history.push(healthResult);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    // Store in Redis
    await this.redis.hset(`agent:performance:${agentId}`, 
      'history', JSON.stringify(history.slice(-20)) // Store last 20 for persistence
    );
  }

  async monitorAgentCapacity() {
    for (const [agentId, agent] of this.agentRegistry) {
      const capacity = await this.calculateAgentCapacity(agentId, agent);
      this.capacityMetrics.set(agentId, capacity);
      
      // Store capacity metrics
      await this.redis.hset(`agent:capacity:${agentId}`, {
        currentLoad: capacity.currentLoad,
        maxCapacity: capacity.maxCapacity,
        utilizationPercentage: capacity.utilizationPercentage,
        availableCapacity: capacity.availableCapacity,
        timestamp: new Date().toISOString()
      });
      
      // Check for capacity alerts
      if (capacity.utilizationPercentage > 90) {
        await this.createCapacityAlert(agentId, 'high_utilization', capacity);
      }
    }
  }

  async calculateAgentCapacity(agentId, agent) {
    try {
      // Get current queue sizes
      const queueKeys = await this.redis.keys(`queue:${agentId}*`);
      let currentLoad = 0;
      
      for (const queueKey of queueKeys) {
        currentLoad += await this.redis.zcard(queueKey);
      }
      
      // Get processing tasks
      const processingTasks = await this.redis.zcard(`processing:${agentId}`) || 0;
      currentLoad += processingTasks;
      
      const maxCapacity = agent.max_capacity || 50; // Default max capacity
      const utilizationPercentage = (currentLoad / maxCapacity) * 100;
      const availableCapacity = Math.max(0, maxCapacity - currentLoad);
      
      return {
        currentLoad,
        maxCapacity,
        utilizationPercentage,
        availableCapacity,
        healthScore: this.performanceHistory.get(agentId)?.slice(-1)[0]?.score || 0.5
      };
    } catch (error) {
      return {
        currentLoad: 0,
        maxCapacity: 50,
        utilizationPercentage: 0,
        availableCapacity: 50,
        healthScore: 0.5
      };
    }
  }

  async createCapacityAlert(agentId, type, capacity) {
    const alertKey = `${agentId}:${type}`;
    
    if (!this.alerts.has(alertKey)) {
      const alert = {
        agentId,
        type,
        message: `Agent ${agentId} ${type}: ${capacity.utilizationPercentage.toFixed(1)}% utilized`,
        capacity,
        timestamp: Date.now(),
        acknowledged: false
      };
      
      this.alerts.set(alertKey, alert);
      await this.redis.hset('capacity:alerts', alertKey, JSON.stringify(alert));
      
      console.warn(`⚠️ Capacity Alert: ${alert.message}`);
      this.emit('capacityAlert', alert);
    }
  }

  async getCapacityReport() {
    const capacityData = Array.from(this.capacityMetrics.entries()).map(([agentId, capacity]) => ({
      agentId,
      ...capacity
    }));
    
    const totalCapacity = capacityData.reduce((sum, c) => sum + c.maxCapacity, 0);
    const totalLoad = capacityData.reduce((sum, c) => sum + c.currentLoad, 0);
    const avgUtilization = capacityData.length > 0 
      ? capacityData.reduce((sum, c) => sum + c.utilizationPercentage, 0) / capacityData.length 
      : 0;
    
    return {
      agents: capacityData,
      summary: {
        totalAgents: capacityData.length,
        totalCapacity,
        totalLoad,
        avgUtilization,
        systemUtilization: totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0
      },
      alerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged),
      timestamp: Date.now()
    };
  }

  async getAdvancedHealthReport() {
    const baseReport = await this.getHealthReport();
    const capacityReport = await this.getCapacityReport();
    
    // Enhanced agent details with performance history
    const enhancedAgents = baseReport.agents.map(agent => {
      const performance = this.performanceHistory.get(agent.id) || [];
      const capacity = this.capacityMetrics.get(agent.id);
      
      return {
        ...agent,
        capacity,
        performance: {
          avgHealthScore: performance.length > 0 
            ? performance.reduce((sum, p) => sum + p.score, 0) / performance.length 
            : 0,
          avgResponseTime: performance.length > 0
            ? performance.reduce((sum, p) => sum + p.responseTime, 0) / performance.length
            : 0,
          recentTrend: this.calculateHealthTrend(performance)
        }
      };
    });
    
    return {
      ...baseReport,
      agents: enhancedAgents,
      capacity: capacityReport.summary,
      alerts: Array.from(this.alerts.values()).filter(a => !a.acknowledged),
      systemPerformance: {
        avgHealthScore: enhancedAgents.length > 0
          ? enhancedAgents.reduce((sum, a) => sum + a.performance.avgHealthScore, 0) / enhancedAgents.length
          : 0,
        avgResponseTime: enhancedAgents.length > 0
          ? enhancedAgents.reduce((sum, a) => sum + a.performance.avgResponseTime, 0) / enhancedAgents.length
          : 0
      }
    };
  }

  calculateHealthTrend(performance) {
    if (performance.length < 2) return 'stable';
    
    const recent = performance.slice(-5); // Last 5 measurements
    const older = performance.slice(-10, -5); // Previous 5 measurements
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, p) => sum + p.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.score, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  async shutdown() {
    console.log('🛑 Health Monitor shutting down...');
    
    await this.subscriber.quit();
    await this.redis.quit();
    
    console.log('✅ Health Monitor shutdown complete');
  }
}

module.exports = AgentHealthMonitor;