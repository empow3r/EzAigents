const Redis = require('ioredis');
const EventEmitter = require('events');

class IntelligentLoadBalancer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      rebalanceThreshold: config.rebalanceThreshold || 0.7,
      minRebalanceInterval: config.minRebalanceInterval || 10000,
      maxLoadImbalance: config.maxLoadImbalance || 0.4,
      emergencyThreshold: config.emergencyThreshold || 0.9,
      resourceWeights: {
        cpuUsage: 0.3,
        memoryUsage: 0.25,
        activeConnections: 0.2,
        responseTime: 0.15,
        errorRate: 0.1
      },
      ...config
    };

    this.agents = new Map();
    this.loadHistory = new Map();
    this.rebalanceHistory = [];
    this.isRebalancing = false;
    this.lastRebalance = 0;
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on('agentOverload', this.handleAgentOverload.bind(this));
    this.on('agentUnderload', this.handleAgentUnderload.bind(this));
    this.on('emergencyRebalance', this.handleEmergencyRebalance.bind(this));
  }

  async registerAgent(agentId, config = {}) {
    const agent = {
      id: agentId,
      capabilities: config.capabilities || [],
      maxConcurrency: config.maxConcurrency || 10,
      currentLoad: 0,
      resourceUsage: {
        cpu: 0,
        memory: 0,
        connections: 0,
        responseTime: 0,
        errorRate: 0
      },
      performance: {
        throughput: 0,
        avgResponseTime: 0,
        successRate: 1.0,
        tasksCompleted: 0
      },
      loadScore: 0,
      healthScore: 1.0,
      lastUpdate: Date.now(),
      zone: config.zone || 'default',
      priority: config.priority || 1,
      config
    };

    this.agents.set(agentId, agent);
    this.loadHistory.set(agentId, []);
    
    await this.redis.hset('loadbalancer:agents', agentId, JSON.stringify(agent));
    console.log(`Load Balancer: Registered agent ${agentId}`);
    
    this.emit('agentRegistered', agent);
    return agent;
  }

  async unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Migrate any remaining tasks
    await this.migrateAgentTasks(agentId);
    
    this.agents.delete(agentId);
    this.loadHistory.delete(agentId);
    await this.redis.hdel('loadbalancer:agents', agentId);
    
    console.log(`Load Balancer: Unregistered agent ${agentId}`);
    this.emit('agentUnregistered', agent);
  }

  calculateLoadScore(agent) {
    const weights = this.config.resourceWeights;
    
    // Normalize metrics to 0-1 scale
    const normalizedMetrics = {
      cpu: Math.min(agent.resourceUsage.cpu, 1),
      memory: Math.min(agent.resourceUsage.memory, 1),
      connections: Math.min(agent.resourceUsage.connections / agent.maxConcurrency, 1),
      responseTime: Math.min(agent.resourceUsage.responseTime / 10000, 1), // 10s max
      errorRate: Math.min(agent.resourceUsage.errorRate, 1)
    };

    // Calculate weighted load score
    const loadScore = 
      normalizedMetrics.cpu * weights.cpuUsage +
      normalizedMetrics.memory * weights.memoryUsage +
      normalizedMetrics.connections * weights.activeConnections +
      normalizedMetrics.responseTime * weights.responseTime +
      normalizedMetrics.errorRate * weights.errorRate;

    return Math.min(loadScore, 1);
  }

  calculateHealthScore(agent) {
    const now = Date.now();
    const timeSinceUpdate = now - agent.lastUpdate;
    
    let healthScore = 1.0;
    
    // Penalize stale updates
    if (timeSinceUpdate > 60000) { // 1 minute
      healthScore *= 0.5;
    }
    
    // Factor in error rate
    healthScore *= (1 - agent.resourceUsage.errorRate);
    
    // Factor in response time
    if (agent.resourceUsage.responseTime > 5000) {
      healthScore *= 0.7;
    }
    
    // Factor in resource usage
    if (agent.resourceUsage.cpu > 0.9 || agent.resourceUsage.memory > 0.9) {
      healthScore *= 0.6;
    }

    return Math.max(healthScore, 0);
  }

  async updateAgentMetrics(agentId, metrics) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Update resource usage
    agent.resourceUsage = {
      cpu: metrics.cpu || 0,
      memory: metrics.memory || 0,
      connections: metrics.connections || agent.currentLoad,
      responseTime: metrics.responseTime || 0,
      errorRate: metrics.errorRate || 0
    };

    // Update performance metrics
    if (metrics.performance) {
      agent.performance = {
        ...agent.performance,
        ...metrics.performance
      };
    }

    // Calculate scores
    agent.loadScore = this.calculateLoadScore(agent);
    agent.healthScore = this.calculateHealthScore(agent);
    agent.lastUpdate = Date.now();

    // Store load history
    const history = this.loadHistory.get(agentId);
    history.push({
      timestamp: Date.now(),
      loadScore: agent.loadScore,
      healthScore: agent.healthScore,
      currentLoad: agent.currentLoad
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    await this.redis.hset('loadbalancer:agents', agentId, JSON.stringify(agent));

    // Check for load issues
    this.checkLoadThresholds(agent);
    
    this.emit('agentMetricsUpdated', agent);
  }

  checkLoadThresholds(agent) {
    if (agent.loadScore > this.config.emergencyThreshold) {
      this.emit('emergencyRebalance', agent);
    } else if (agent.loadScore > this.config.rebalanceThreshold) {
      this.emit('agentOverload', agent);
    } else if (agent.loadScore < 0.2 && agent.currentLoad > 0) {
      this.emit('agentUnderload', agent);
    }
  }

  async selectOptimalAgent(task, excludeAgents = []) {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        !excludeAgents.includes(agent.id) &&
        agent.healthScore > 0.3 &&
        agent.currentLoad < agent.maxConcurrency &&
        this.agentCanHandleTask(agent, task)
      );

    if (availableAgents.length === 0) {
      throw new Error('No available agents for task');
    }

    // Score agents based on multiple factors
    const scoredAgents = availableAgents.map(agent => {
      const score = this.calculateAgentSelectionScore(agent, task);
      return { agent, score };
    });

    // Sort by score (higher is better)
    scoredAgents.sort((a, b) => b.score - a.score);

    // Apply load balancing logic
    const selectedAgent = this.applyLoadBalancingStrategy(scoredAgents, task);
    
    console.log(`Load Balancer: Selected agent ${selectedAgent.id} (score: ${scoredAgents.find(s => s.agent.id === selectedAgent.id)?.score})`);
    
    return selectedAgent;
  }

  calculateAgentSelectionScore(agent, task) {
    let score = 0;

    // Capability matching (40% weight)
    const capabilityScore = this.calculateCapabilityMatch(agent, task);
    score += capabilityScore * 0.4;

    // Load balancing (30% weight) - prefer less loaded agents
    const loadScore = (1 - agent.loadScore) * 30;
    score += loadScore * 0.3;

    // Health score (20% weight)
    score += agent.healthScore * 20;

    // Performance history (10% weight)
    const performanceScore = agent.performance.successRate * 10;
    score += performanceScore * 0.1;

    // Zone preference bonus
    if (task.preferredZone && agent.zone === task.preferredZone) {
      score += 5;
    }

    // Priority bonus for high-priority agents
    score += agent.priority * 2;

    return score;
  }

  calculateCapabilityMatch(agent, task) {
    if (!task.requiredCapabilities || task.requiredCapabilities.length === 0) {
      return 30; // Default score
    }

    const matchingCapabilities = agent.capabilities.filter(cap =>
      task.requiredCapabilities.some(req => 
        cap.toLowerCase().includes(req.toLowerCase()) ||
        req.toLowerCase().includes(cap.toLowerCase())
      )
    );

    return (matchingCapabilities.length / task.requiredCapabilities.length) * 40;
  }

  agentCanHandleTask(agent, task) {
    // Check if agent has required capabilities
    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      const hasCapability = task.requiredCapabilities.some(req =>
        agent.capabilities.some(cap => 
          cap.toLowerCase().includes(req.toLowerCase()) ||
          req.toLowerCase().includes(cap.toLowerCase())
        )
      );
      if (!hasCapability) return false;
    }

    // Check zone restrictions
    if (task.requiredZone && agent.zone !== task.requiredZone) {
      return false;
    }

    return true;
  }

  applyLoadBalancingStrategy(scoredAgents, task) {
    const strategy = task.loadBalancingStrategy || 'weighted_round_robin';

    switch (strategy) {
      case 'least_loaded':
        return this.selectLeastLoaded(scoredAgents);
      
      case 'weighted_round_robin':
        return this.selectWeightedRoundRobin(scoredAgents);
      
      case 'consistent_hash':
        return this.selectConsistentHash(scoredAgents, task);
      
      case 'random':
        return this.selectRandom(scoredAgents);
      
      default:
        return scoredAgents[0].agent; // Highest score
    }
  }

  selectLeastLoaded(scoredAgents) {
    return scoredAgents.reduce((least, current) => 
      current.agent.loadScore < least.agent.loadScore ? current : least
    ).agent;
  }

  selectWeightedRoundRobin(scoredAgents) {
    // Select based on inverted load scores (higher available capacity = higher chance)
    const weights = scoredAgents.map(s => (1 - s.agent.loadScore + 0.1) * s.score);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return scoredAgents[i].agent;
      }
    }
    
    return scoredAgents[0].agent;
  }

  selectConsistentHash(scoredAgents, task) {
    // Use task ID for consistent routing
    const hash = this.hashString(task.id || JSON.stringify(task));
    const index = hash % scoredAgents.length;
    return scoredAgents[index].agent;
  }

  selectRandom(scoredAgents) {
    const index = Math.floor(Math.random() * scoredAgents.length);
    return scoredAgents[index].agent;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async handleAgentOverload(agent) {
    console.log(`Load Balancer: Agent ${agent.id} is overloaded (load: ${agent.loadScore})`);
    
    if (this.shouldRebalance()) {
      await this.rebalanceLoad(agent);
    }
  }

  async handleAgentUnderload(agent) {
    console.log(`Load Balancer: Agent ${agent.id} is underloaded (load: ${agent.loadScore})`);
    
    // Could implement task migration from other agents
    await this.considerTaskMigration(agent);
  }

  async handleEmergencyRebalance(agent) {
    console.error(`Load Balancer: Emergency rebalance needed for agent ${agent.id} (load: ${agent.loadScore})`);
    
    // Force immediate rebalancing
    this.lastRebalance = 0;
    await this.rebalanceLoad(agent, true);
  }

  shouldRebalance() {
    const now = Date.now();
    const timeSinceLastRebalance = now - this.lastRebalance;
    
    return !this.isRebalancing && timeSinceLastRebalance > this.config.minRebalanceInterval;
  }

  async rebalanceLoad(overloadedAgent = null, emergency = false) {
    if (this.isRebalancing && !emergency) return;
    
    this.isRebalancing = true;
    console.log(`Load Balancer: Starting ${emergency ? 'emergency ' : ''}rebalance`);
    
    try {
      const agents = Array.from(this.agents.values());
      const overloadedAgents = overloadedAgent ? 
        [overloadedAgent] : 
        agents.filter(a => a.loadScore > this.config.rebalanceThreshold);
      
      const underloadedAgents = agents.filter(a => 
        a.loadScore < 0.5 && 
        a.healthScore > 0.7 &&
        a.currentLoad < a.maxConcurrency
      );

      if (overloadedAgents.length === 0 || underloadedAgents.length === 0) {
        console.log('Load Balancer: No rebalancing needed');
        return;
      }

      let tasksRebalanced = 0;
      
      for (const agent of overloadedAgents) {
        const tasksMigrated = await this.migrateTasksFromAgent(agent, underloadedAgents);
        tasksRebalanced += tasksMigrated;
        
        if (tasksRebalanced >= 10) break; // Limit migrations per cycle
      }

      this.rebalanceHistory.push({
        timestamp: Date.now(),
        tasksRebalanced,
        emergency,
        overloadedAgents: overloadedAgents.length,
        underloadedAgents: underloadedAgents.length
      });

      // Keep only last 50 rebalance records
      if (this.rebalanceHistory.length > 50) {
        this.rebalanceHistory.splice(0, this.rebalanceHistory.length - 50);
      }

      console.log(`Load Balancer: Rebalanced ${tasksRebalanced} tasks`);
      this.emit('rebalanceCompleted', { tasksRebalanced, emergency });
      
    } catch (error) {
      console.error('Load Balancer: Error during rebalancing:', error);
      this.emit('rebalanceError', error);
    } finally {
      this.isRebalancing = false;
      this.lastRebalance = Date.now();
    }
  }

  async migrateTasksFromAgent(sourceAgent, targetAgents) {
    if (targetAgents.length === 0) return 0;
    
    const queueKeys = await this.redis.keys(`queue:${sourceAgent.id}:*`);
    let migrated = 0;
    
    for (const queueKey of queueKeys) {
      const tasks = await this.redis.zrange(queueKey, 0, 2, 'WITHSCORES');
      
      for (let i = 0; i < tasks.length && migrated < 5; i += 2) {
        const taskData = JSON.parse(tasks[i]);
        const score = tasks[i + 1];
        
        // Find best target agent
        const targetAgent = this.findBestMigrationTarget(taskData, targetAgents);
        
        if (targetAgent) {
          // Move task
          await this.redis.zrem(queueKey, tasks[i]);
          
          const targetQueueKey = queueKey.replace(sourceAgent.id, targetAgent.id);
          await this.redis.zadd(targetQueueKey, score, JSON.stringify({
            ...taskData,
            migratedFrom: sourceAgent.id,
            migratedAt: Date.now()
          }));
          
          migrated++;
          console.log(`Load Balancer: Migrated task ${taskData.id} from ${sourceAgent.id} to ${targetAgent.id}`);
        }
      }
    }
    
    return migrated;
  }

  findBestMigrationTarget(task, targetAgents) {
    // Score target agents for this specific task
    const candidates = targetAgents
      .filter(agent => this.agentCanHandleTask(agent, task))
      .map(agent => ({
        agent,
        score: this.calculateAgentSelectionScore(agent, task)
      }))
      .sort((a, b) => b.score - a.score);
    
    return candidates.length > 0 ? candidates[0].agent : null;
  }

  async considerTaskMigration(underloadedAgent) {
    // Look for tasks from overloaded agents that could be migrated
    const overloadedAgents = Array.from(this.agents.values())
      .filter(a => a.loadScore > this.config.rebalanceThreshold && a.id !== underloadedAgent.id);
    
    if (overloadedAgents.length === 0) return;
    
    // Try to migrate one task to the underloaded agent
    for (const sourceAgent of overloadedAgents) {
      const migrated = await this.migrateTasksFromAgent(sourceAgent, [underloadedAgent]);
      if (migrated > 0) break;
    }
  }

  async migrateAgentTasks(agentId) {
    const queueKeys = await this.redis.keys(`queue:${agentId}:*`);
    const availableAgents = Array.from(this.agents.values())
      .filter(a => a.id !== agentId && a.healthScore > 0.5);
    
    if (availableAgents.length === 0) {
      console.warn(`Load Balancer: No available agents to migrate tasks from ${agentId}`);
      return;
    }
    
    let totalMigrated = 0;
    
    for (const queueKey of queueKeys) {
      const tasks = await this.redis.zrange(queueKey, 0, -1, 'WITHSCORES');
      
      for (let i = 0; i < tasks.length; i += 2) {
        const taskData = JSON.parse(tasks[i]);
        const score = tasks[i + 1];
        
        const targetAgent = await this.selectOptimalAgent(taskData, [agentId]);
        
        if (targetAgent) {
          const targetQueueKey = queueKey.replace(agentId, targetAgent.id);
          await this.redis.zadd(targetQueueKey, score, JSON.stringify({
            ...taskData,
            assignedAgent: targetAgent.id,
            migratedFrom: agentId
          }));
          
          totalMigrated++;
        }
      }
      
      // Clear the original queue
      await this.redis.del(queueKey);
    }
    
    console.log(`Load Balancer: Migrated ${totalMigrated} tasks from agent ${agentId}`);
  }

  async getLoadBalancingStats() {
    const agents = Array.from(this.agents.values());
    
    const stats = {
      totalAgents: agents.length,
      healthyAgents: agents.filter(a => a.healthScore > 0.7).length,
      overloadedAgents: agents.filter(a => a.loadScore > this.config.rebalanceThreshold).length,
      averageLoad: agents.reduce((sum, a) => sum + a.loadScore, 0) / agents.length,
      loadVariance: 0,
      rebalanceHistory: this.rebalanceHistory.slice(-10),
      agentStats: agents.map(a => ({
        id: a.id,
        loadScore: a.loadScore,
        healthScore: a.healthScore,
        currentLoad: a.currentLoad,
        maxConcurrency: a.maxConcurrency,
        zone: a.zone
      }))
    };
    
    // Calculate load variance
    const avgLoad = stats.averageLoad;
    stats.loadVariance = agents.reduce((sum, a) => sum + Math.pow(a.loadScore - avgLoad, 2), 0) / agents.length;
    
    return stats;
  }

  async start() {
    console.log('Intelligent Load Balancer started');
    
    // Start periodic rebalancing check
    this.rebalanceTimer = setInterval(() => {
      if (this.shouldRebalance()) {
        this.checkForRebalancing();
      }
    }, 30000); // Every 30 seconds
  }

  async stop() {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
    }
    console.log('Intelligent Load Balancer stopped');
  }

  async checkForRebalancing() {
    const agents = Array.from(this.agents.values());
    const loadImbalance = this.calculateLoadImbalance(agents);
    
    if (loadImbalance > this.config.maxLoadImbalance) {
      console.log(`Load Balancer: Load imbalance detected (${loadImbalance}), initiating rebalance`);
      await this.rebalanceLoad();
    }
  }

  calculateLoadImbalance(agents) {
    if (agents.length < 2) return 0;
    
    const loads = agents.map(a => a.loadScore);
    const maxLoad = Math.max(...loads);
    const minLoad = Math.min(...loads);
    
    return maxLoad - minLoad;
  }
}

module.exports = IntelligentLoadBalancer;