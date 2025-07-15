/**
 * Enhanced Load Balancing and Auto-Scaling System
 * Provides intelligent request distribution and automatic capacity management
 */

const EventEmitter = require('events');

class LoadBalancer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.strategy = options.strategy || 'health-weighted';
    this.healthCheckInterval = options.healthCheckInterval || 15000;
    this.maxResponseTime = options.maxResponseTime || 5000;
    this.minHealthScore = options.minHealthScore || 0.7;
    
    this.agents = new Map();
    this.healthScores = new Map();
    this.requestCounts = new Map();
    this.responseTimes = new Map();
    this.errorCounts = new Map();
    
    this.roundRobinIndex = 0;
    this.lastHealthCheck = Date.now();
    
    this.startHealthMonitoring();
  }

  registerAgent(agentId, config = {}) {
    this.agents.set(agentId, {
      id: agentId,
      url: config.url,
      capabilities: config.capabilities || [],
      weight: config.weight || 1,
      maxConcurrency: config.maxConcurrency || 10,
      currentLoad: 0,
      status: 'active',
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      metadata: config.metadata || {}
    });
    
    this.healthScores.set(agentId, 1.0);
    this.requestCounts.set(agentId, 0);
    this.responseTimes.set(agentId, []);
    this.errorCounts.set(agentId, 0);
    
    this.emit('agent:registered', agentId);
    console.log(`🤖 Agent registered: ${agentId}`);
  }

  unregisterAgent(agentId) {
    if (this.agents.has(agentId)) {
      this.agents.delete(agentId);
      this.healthScores.delete(agentId);
      this.requestCounts.delete(agentId);
      this.responseTimes.delete(agentId);
      this.errorCounts.delete(agentId);
      
      this.emit('agent:unregistered', agentId);
      console.log(`🤖 Agent unregistered: ${agentId}`);
    }
  }

  async selectAgent(task = {}) {
    const availableAgents = this.getAvailableAgents(task);
    
    if (availableAgents.length === 0) {
      throw new Error('No available agents for task');
    }

    let selectedAgent;
    
    switch (this.strategy) {
      case 'round-robin':
        selectedAgent = this.roundRobinSelection(availableAgents);
        break;
      case 'least-connections':
        selectedAgent = this.leastConnectionsSelection(availableAgents);
        break;
      case 'weighted-random':
        selectedAgent = this.weightedRandomSelection(availableAgents);
        break;
      case 'fastest-response':
        selectedAgent = this.fastestResponseSelection(availableAgents);
        break;
      case 'health-weighted':
      default:
        selectedAgent = this.healthWeightedSelection(availableAgents);
        break;
    }
    
    // Update agent load
    const agent = this.agents.get(selectedAgent);
    if (agent) {
      agent.currentLoad++;
      agent.lastSeen = Date.now();
    }
    
    return selectedAgent;
  }

  getAvailableAgents(task = {}) {
    const available = [];
    
    for (const [agentId, agent] of this.agents.entries()) {
      // Check if agent is active
      if (agent.status !== 'active') continue;
      
      // Check health score
      const healthScore = this.healthScores.get(agentId);
      if (healthScore < this.minHealthScore) continue;
      
      // Check capacity
      if (agent.currentLoad >= agent.maxConcurrency) continue;
      
      // Check capabilities if specified
      if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
        const hasRequired = task.requiredCapabilities.every(cap => 
          agent.capabilities.includes(cap)
        );
        if (!hasRequired) continue;
      }
      
      // Check if agent has been seen recently
      const timeSinceLastSeen = Date.now() - agent.lastSeen;
      if (timeSinceLastSeen > 60000) continue; // 1 minute timeout
      
      available.push(agentId);
    }
    
    return available;
  }

  roundRobinSelection(agents) {
    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex++;
    return agent;
  }

  leastConnectionsSelection(agents) {
    return agents.reduce((best, current) => {
      const currentAgent = this.agents.get(current);
      const bestAgent = this.agents.get(best);
      
      return currentAgent.currentLoad < bestAgent.currentLoad ? current : best;
    });
  }

  weightedRandomSelection(agents) {
    const weights = agents.map(agentId => {
      const agent = this.agents.get(agentId);
      const healthScore = this.healthScores.get(agentId);
      return agent.weight * healthScore;
    });
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < agents.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return agents[i];
      }
    }
    
    return agents[0];
  }

  fastestResponseSelection(agents) {
    return agents.reduce((fastest, current) => {
      const currentAvgTime = this.getAverageResponseTime(current);
      const fastestAvgTime = this.getAverageResponseTime(fastest);
      
      return currentAvgTime < fastestAvgTime ? current : fastest;
    });
  }

  healthWeightedSelection(agents) {
    const scores = agents.map(agentId => {
      const agent = this.agents.get(agentId);
      const healthScore = this.healthScores.get(agentId);
      const avgResponseTime = this.getAverageResponseTime(agentId);
      const loadFactor = 1 - (agent.currentLoad / agent.maxConcurrency);
      
      // Composite score considering health, response time, and load
      return {
        agentId,
        score: healthScore * loadFactor * agent.weight * (1000 / Math.max(avgResponseTime, 100))
      };
    });
    
    // Select agent with highest score
    const best = scores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    return best.agentId;
  }

  recordRequestStart(agentId) {
    const requestCount = this.requestCounts.get(agentId) || 0;
    this.requestCounts.set(agentId, requestCount + 1);
    
    return {
      agentId,
      startTime: Date.now()
    };
  }

  recordRequestComplete(context, success = true) {
    const { agentId, startTime } = context;
    const responseTime = Date.now() - startTime;
    
    // Update response times
    const responseTimes = this.responseTimes.get(agentId) || [];
    responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }
    this.responseTimes.set(agentId, responseTimes);
    
    // Update error count if failed
    if (!success) {
      const errorCount = this.errorCounts.get(agentId) || 0;
      this.errorCounts.set(agentId, errorCount + 1);
    }
    
    // Decrease current load
    const agent = this.agents.get(agentId);
    if (agent && agent.currentLoad > 0) {
      agent.currentLoad--;
    }
    
    // Update health score
    this.updateHealthScore(agentId, success, responseTime);
  }

  updateHealthScore(agentId, success, responseTime) {
    const currentScore = this.healthScores.get(agentId) || 1.0;
    let newScore = currentScore;
    
    if (success) {
      // Improve score for successful requests
      newScore = Math.min(1.0, currentScore + 0.01);
      
      // Bonus for fast response times
      if (responseTime < 1000) {
        newScore = Math.min(1.0, newScore + 0.005);
      }
    } else {
      // Penalize for failures
      newScore = Math.max(0.0, currentScore - 0.1);
    }
    
    // Penalize for slow response times
    if (responseTime > this.maxResponseTime) {
      newScore = Math.max(0.0, newScore - 0.05);
    }
    
    this.healthScores.set(agentId, newScore);
    
    // Emit health change event
    this.emit('agent:health-changed', {
      agentId,
      oldScore: currentScore,
      newScore,
      success,
      responseTime
    });
  }

  getAverageResponseTime(agentId) {
    const responseTimes = this.responseTimes.get(agentId) || [];
    if (responseTimes.length === 0) return 1000; // Default assumption
    
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  async performHealthChecks() {
    for (const [agentId, agent] of this.agents.entries()) {
      try {
        await this.checkAgentHealth(agentId, agent);
      } catch (error) {
        console.error(`Health check failed for agent ${agentId}:`, error);
        this.updateHealthScore(agentId, false, this.maxResponseTime);
      }
    }
    
    this.lastHealthCheck = Date.now();
  }

  async checkAgentHealth(agentId, agent) {
    if (!agent.url) return; // Skip agents without URLs
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${agent.url}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.ok;
      
      this.updateHealthScore(agentId, success, responseTime);
      
      if (success) {
        agent.status = 'active';
        agent.lastSeen = Date.now();
      } else {
        agent.status = 'unhealthy';
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateHealthScore(agentId, false, responseTime);
      agent.status = 'unreachable';
    }
  }

  getStats() {
    const stats = {
      totalAgents: this.agents.size,
      activeAgents: 0,
      unhealthyAgents: 0,
      totalRequests: 0,
      totalErrors: 0,
      averageHealthScore: 0,
      averageResponseTime: 0,
      strategy: this.strategy,
      lastHealthCheck: this.lastHealthCheck
    };
    
    let totalHealthScore = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.status === 'active') {
        stats.activeAgents++;
      } else {
        stats.unhealthyAgents++;
      }
      
      const requests = this.requestCounts.get(agentId) || 0;
      const errors = this.errorCounts.get(agentId) || 0;
      const health = this.healthScores.get(agentId) || 0;
      const responseTimes = this.responseTimes.get(agentId) || [];
      
      stats.totalRequests += requests;
      stats.totalErrors += errors;
      totalHealthScore += health;
      
      if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        totalResponseTime += avgTime;
        responseTimeCount++;
      }
    }
    
    if (this.agents.size > 0) {
      stats.averageHealthScore = totalHealthScore / this.agents.size;
    }
    
    if (responseTimeCount > 0) {
      stats.averageResponseTime = totalResponseTime / responseTimeCount;
    }
    
    return stats;
  }

  getAgentDetails(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    
    return {
      ...agent,
      healthScore: this.healthScores.get(agentId),
      requestCount: this.requestCounts.get(agentId),
      errorCount: this.errorCounts.get(agentId),
      averageResponseTime: this.getAverageResponseTime(agentId),
      recentResponseTimes: this.responseTimes.get(agentId)?.slice(-10) || []
    };
  }

  getAllAgentDetails() {
    const details = {};
    for (const agentId of this.agents.keys()) {
      details[agentId] = this.getAgentDetails(agentId);
    }
    return details;
  }

  setStrategy(strategy) {
    const validStrategies = [
      'round-robin',
      'least-connections', 
      'weighted-random',
      'fastest-response',
      'health-weighted'
    ];
    
    if (validStrategies.includes(strategy)) {
      this.strategy = strategy;
      this.emit('strategy:changed', strategy);
      console.log(`🔄 Load balancing strategy changed to: ${strategy}`);
    } else {
      throw new Error(`Invalid strategy: ${strategy}`);
    }
  }
}

class AutoScaler extends EventEmitter {
  constructor(loadBalancer, options = {}) {
    super();
    
    this.loadBalancer = loadBalancer;
    this.minAgents = options.minAgents || 1;
    this.maxAgents = options.maxAgents || 10;
    this.scaleUpThreshold = options.scaleUpThreshold || 0.8;
    this.scaleDownThreshold = options.scaleDownThreshold || 0.3;
    this.cooldownPeriod = options.cooldownPeriod || 300000; // 5 minutes
    
    this.lastScaleAction = 0;
    this.scalingHistory = [];
    
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      this.evaluateScaling();
    }, 30000); // Check every 30 seconds
  }

  evaluateScaling() {
    const now = Date.now();
    
    // Respect cooldown period
    if (now - this.lastScaleAction < this.cooldownPeriod) {
      return;
    }
    
    const stats = this.loadBalancer.getStats();
    const loadFactor = this.calculateLoadFactor(stats);
    
    console.log(`📊 Current load factor: ${(loadFactor * 100).toFixed(1)}%`);
    
    if (loadFactor > this.scaleUpThreshold && stats.activeAgents < this.maxAgents) {
      this.scaleUp();
    } else if (loadFactor < this.scaleDownThreshold && stats.activeAgents > this.minAgents) {
      this.scaleDown();
    }
  }

  calculateLoadFactor(stats) {
    if (stats.activeAgents === 0) return 1.0;
    
    // Calculate load based on multiple factors
    const agentDetails = this.loadBalancer.getAllAgentDetails();
    let totalLoad = 0;
    let totalCapacity = 0;
    
    for (const agent of Object.values(agentDetails)) {
      totalLoad += agent.currentLoad;
      totalCapacity += agent.maxConcurrency;
    }
    
    const utilizationFactor = totalCapacity > 0 ? totalLoad / totalCapacity : 0;
    const healthFactor = 1 - stats.averageHealthScore;
    const responseTimeFactor = Math.min(1, stats.averageResponseTime / 1000);
    
    // Weighted combination of factors
    return (utilizationFactor * 0.5) + (healthFactor * 0.3) + (responseTimeFactor * 0.2);
  }

  scaleUp() {
    console.log('📈 Scaling up: Adding new agent instance');
    
    this.lastScaleAction = Date.now();
    this.scalingHistory.push({
      action: 'scale_up',
      timestamp: this.lastScaleAction,
      reason: 'High load detected'
    });
    
    this.emit('scale:up', {
      timestamp: this.lastScaleAction,
      currentAgents: this.loadBalancer.getStats().activeAgents
    });
    
    // In a real implementation, this would trigger container/VM creation
    // For now, we just emit the event for external handlers
  }

  scaleDown() {
    console.log('📉 Scaling down: Removing agent instance');
    
    this.lastScaleAction = Date.now();
    this.scalingHistory.push({
      action: 'scale_down',
      timestamp: this.lastScaleAction,
      reason: 'Low load detected'
    });
    
    this.emit('scale:down', {
      timestamp: this.lastScaleAction,
      currentAgents: this.loadBalancer.getStats().activeAgents
    });
    
    // In a real implementation, this would gracefully terminate an agent
  }

  getScalingHistory() {
    return this.scalingHistory.slice(-20); // Last 20 scaling events
  }

  getScalingConfig() {
    return {
      minAgents: this.minAgents,
      maxAgents: this.maxAgents,
      scaleUpThreshold: this.scaleUpThreshold,
      scaleDownThreshold: this.scaleDownThreshold,
      cooldownPeriod: this.cooldownPeriod
    };
  }

  updateConfig(config) {
    if (config.minAgents !== undefined) this.minAgents = config.minAgents;
    if (config.maxAgents !== undefined) this.maxAgents = config.maxAgents;
    if (config.scaleUpThreshold !== undefined) this.scaleUpThreshold = config.scaleUpThreshold;
    if (config.scaleDownThreshold !== undefined) this.scaleDownThreshold = config.scaleDownThreshold;
    if (config.cooldownPeriod !== undefined) this.cooldownPeriod = config.cooldownPeriod;
    
    this.emit('config:updated', this.getScalingConfig());
  }
}

module.exports = {
  LoadBalancer,
  AutoScaler
};