const Redis = require('ioredis');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class AdvancedTaskScheduler {
  constructor(config = {}) {
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 100,
      predictionWindow: config.predictionWindow || 300000, // 5 minutes
      learningRate: config.learningRate || 0.1,
      rebalanceInterval: config.rebalanceInterval || 30000, // 30 seconds
      healthCheckInterval: config.healthCheckInterval || 15000, // 15 seconds
      mlModelPath: config.mlModelPath || './models/scheduling-model.json',
      ...config
    };
    
    this.agents = new Map();
    this.taskHistory = [];
    this.performanceMetrics = new Map();
    this.schedulingModel = null;
    this.isRunning = false;
    
    this.loadSchedulingModel();
    this.initializeMetrics();
  }

  async loadSchedulingModel() {
    try {
      const modelData = await fs.readFile(this.config.mlModelPath, 'utf8');
      this.schedulingModel = JSON.parse(modelData);
    } catch (error) {
      // Initialize with default model if file doesn't exist
      this.schedulingModel = {
        taskCompletionTimes: new Map(),
        agentPerformanceWeights: new Map(),
        loadBalancingWeights: {
          taskComplexity: 0.3,
          agentLoad: 0.4,
          historicalPerformance: 0.2,
          resourceUtilization: 0.1
        },
        lastUpdated: Date.now()
      };
    }
  }

  async saveSchedulingModel() {
    try {
      await fs.mkdir(path.dirname(this.config.mlModelPath), { recursive: true });
      await fs.writeFile(
        this.config.mlModelPath, 
        JSON.stringify(this.schedulingModel, null, 2)
      );
    } catch (error) {
      console.error('Error saving scheduling model:', error);
    }
  }

  initializeMetrics() {
    this.metrics = {
      totalTasksScheduled: 0,
      totalTasksCompleted: 0,
      averageCompletionTime: 0,
      loadBalancingEfficiency: 0,
      predictionAccuracy: 0,
      resourceUtilization: new Map(),
      queueWaitTimes: new Map(),
      agentHealthScores: new Map()
    };
  }

  async registerAgent(agentId, capabilities, config = {}) {
    const agent = {
      id: agentId,
      capabilities: Array.isArray(capabilities) ? capabilities : [capabilities],
      maxConcurrency: config.maxConcurrency || 5,
      currentLoad: 0,
      healthScore: 1.0,
      lastHeartbeat: Date.now(),
      performanceHistory: [],
      resourceUsage: {
        cpu: 0,
        memory: 0,
        activeTasks: 0
      },
      config
    };

    this.agents.set(agentId, agent);
    await this.redis.hset('scheduler:agents', agentId, JSON.stringify(agent));
    
    console.log(`Advanced Scheduler: Registered agent ${agentId} with capabilities: ${capabilities.join(', ')}`);
  }

  async unregisterAgent(agentId) {
    this.agents.delete(agentId);
    await this.redis.hdel('scheduler:agents', agentId);
    console.log(`Advanced Scheduler: Unregistered agent ${agentId}`);
  }

  calculateTaskComplexity(task) {
    let complexity = 1.0;
    
    // File-based complexity
    if (task.files && task.files.length > 0) {
      complexity += task.files.length * 0.1;
      
      // Check file types and sizes
      task.files.forEach(file => {
        if (file.size && file.size > 50000) complexity += 0.2;
        if (file.type === 'code') complexity += 0.3;
        if (file.type === 'test') complexity += 0.1;
      });
    }

    // Content-based complexity
    if (task.content) {
      const lines = task.content.split('\n').length;
      complexity += Math.min(lines / 1000, 1.0);
    }

    // Task type complexity
    const complexityMap = {
      'architecture': 2.0,
      'refactoring': 1.8,
      'testing': 1.2,
      'documentation': 0.8,
      'analysis': 1.5,
      'optimization': 1.7,
      'debugging': 1.4
    };

    if (task.type && complexityMap[task.type]) {
      complexity *= complexityMap[task.type];
    }

    // Priority affects complexity scoring
    const priorityMultiplier = {
      'critical': 1.5,
      'high': 1.2,
      'normal': 1.0,
      'low': 0.8,
      'deferred': 0.6
    };

    complexity *= priorityMultiplier[task.priority] || 1.0;

    return Math.min(complexity, 5.0); // Cap at 5.0
  }

  predictCompletionTime(task, agentId) {
    const taskComplexity = this.calculateTaskComplexity(task);
    const agent = this.agents.get(agentId);
    
    if (!agent) return 300000; // Default 5 minutes

    // Base time estimation
    let baseTime = taskComplexity * 60000; // 1 minute per complexity point

    // Agent performance factor
    const avgPerformance = agent.performanceHistory.length > 0
      ? agent.performanceHistory.reduce((sum, p) => sum + p.completionTime, 0) / agent.performanceHistory.length
      : baseTime;

    // Current load factor
    const loadFactor = 1 + (agent.currentLoad / agent.maxConcurrency) * 0.5;

    // Health score factor
    const healthFactor = 2 - agent.healthScore; // Lower health = longer time

    // Historical model adjustment
    const taskKey = `${task.type}_${Math.floor(taskComplexity)}`;
    const historicalTime = this.schedulingModel.taskCompletionTimes.get?.(taskKey) || baseTime;

    // Weighted prediction
    const prediction = (baseTime * 0.3 + avgPerformance * 0.3 + historicalTime * 0.4) 
                      * loadFactor * healthFactor;

    return Math.max(prediction, 30000); // Minimum 30 seconds
  }

  calculateAgentScore(task, agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return 0;

    let score = 0;

    // Capability matching score (0-40 points)
    const requiredCapabilities = task.requiredCapabilities || [task.type];
    const matchingCapabilities = agent.capabilities.filter(cap => 
      requiredCapabilities.some(req => cap.includes(req) || req.includes(cap))
    );
    score += (matchingCapabilities.length / requiredCapabilities.length) * 40;

    // Load balancing score (0-25 points)
    const loadScore = Math.max(0, 25 - (agent.currentLoad / agent.maxConcurrency) * 25);
    score += loadScore;

    // Health score (0-20 points)
    score += agent.healthScore * 20;

    // Performance history score (0-15 points)
    if (agent.performanceHistory.length > 0) {
      const avgSuccess = agent.performanceHistory.reduce((sum, p) => sum + (p.success ? 1 : 0), 0) 
                        / agent.performanceHistory.length;
      score += avgSuccess * 15;
    } else {
      score += 10; // Default for new agents
    }

    return score;
  }

  async selectOptimalAgent(task) {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.currentLoad < agent.maxConcurrency && 
        agent.healthScore > 0.3 &&
        Date.now() - agent.lastHeartbeat < 60000
      );

    if (availableAgents.length === 0) {
      throw new Error('No available agents for task scheduling');
    }

    // Score all available agents
    const agentScores = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(task, agent.id),
      predictedTime: this.predictCompletionTime(task, agent.id)
    }));

    // Sort by score (descending) and predicted time (ascending)
    agentScores.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 5) {
        // If scores are close, prefer faster completion
        return a.predictedTime - b.predictedTime;
      }
      return b.score - a.score;
    });

    const selectedAgent = agentScores[0].agent;
    
    // Log selection reasoning
    console.log(`Advanced Scheduler: Selected agent ${selectedAgent.id} for task ${task.id}`, {
      score: agentScores[0].score,
      predictedTime: agentScores[0].predictedTime,
      currentLoad: selectedAgent.currentLoad,
      healthScore: selectedAgent.healthScore
    });

    return selectedAgent;
  }

  async scheduleTask(task) {
    try {
      const taskId = task.id || crypto.randomUUID();
      task.id = taskId;
      task.scheduledAt = Date.now();
      task.complexity = this.calculateTaskComplexity(task);

      // Select optimal agent
      const selectedAgent = await this.selectOptimalAgent(task);
      
      // Update agent load
      selectedAgent.currentLoad++;
      await this.redis.hset('scheduler:agents', selectedAgent.id, JSON.stringify(selectedAgent));

      // Schedule the task
      const scheduledTask = {
        ...task,
        assignedAgent: selectedAgent.id,
        predictedCompletionTime: this.predictCompletionTime(task, selectedAgent.id),
        schedulingScore: this.calculateAgentScore(task, selectedAgent.id)
      };

      // Add to appropriate queue with priority
      const queueKey = `queue:${selectedAgent.id}:p:${task.priority || 'normal'}`;
      await this.redis.zadd(queueKey, Date.now(), JSON.stringify(scheduledTask));

      // Track in scheduling metrics
      this.metrics.totalTasksScheduled++;
      await this.updateMetrics();

      console.log(`Advanced Scheduler: Scheduled task ${taskId} to agent ${selectedAgent.id}`);
      
      return {
        taskId,
        assignedAgent: selectedAgent.id,
        queuePosition: await this.redis.zcard(queueKey),
        predictedCompletionTime: scheduledTask.predictedCompletionTime
      };

    } catch (error) {
      console.error('Error scheduling task:', error);
      throw error;
    }
  }

  async updateTaskCompletion(taskId, result) {
    try {
      const task = result.task;
      const agent = this.agents.get(task.assignedAgent);
      
      if (agent) {
        // Update agent load
        agent.currentLoad = Math.max(0, agent.currentLoad - 1);
        
        // Record performance history
        const completionTime = Date.now() - task.scheduledAt;
        const performanceRecord = {
          taskId,
          completionTime,
          success: result.success,
          complexity: task.complexity,
          timestamp: Date.now()
        };

        agent.performanceHistory.push(performanceRecord);
        
        // Keep only last 100 records
        if (agent.performanceHistory.length > 100) {
          agent.performanceHistory = agent.performanceHistory.slice(-100);
        }

        await this.redis.hset('scheduler:agents', agent.id, JSON.stringify(agent));

        // Update scheduling model
        await this.updateSchedulingModel(task, completionTime, result.success);
        
        // Update metrics
        this.metrics.totalTasksCompleted++;
        this.updateCompletionTimeAverage(completionTime);
      }

      console.log(`Advanced Scheduler: Task ${taskId} completed by agent ${task.assignedAgent}`);
      
    } catch (error) {
      console.error('Error updating task completion:', error);
    }
  }

  async updateSchedulingModel(task, actualTime, success) {
    const taskKey = `${task.type}_${Math.floor(task.complexity)}`;
    
    // Update task completion times with exponential moving average
    const currentEstimate = this.schedulingModel.taskCompletionTimes.get?.(taskKey) || actualTime;
    const newEstimate = currentEstimate * (1 - this.config.learningRate) + actualTime * this.config.learningRate;
    
    if (!this.schedulingModel.taskCompletionTimes.set) {
      this.schedulingModel.taskCompletionTimes = new Map();
    }
    this.schedulingModel.taskCompletionTimes.set(taskKey, newEstimate);

    // Update agent performance weights
    const agentKey = task.assignedAgent;
    const currentWeight = this.schedulingModel.agentPerformanceWeights.get?.(agentKey) || 1.0;
    const performanceScore = success ? (task.predictedCompletionTime / actualTime) : 0.5;
    const newWeight = currentWeight * (1 - this.config.learningRate) + performanceScore * this.config.learningRate;
    
    if (!this.schedulingModel.agentPerformanceWeights.set) {
      this.schedulingModel.agentPerformanceWeights = new Map();
    }
    this.schedulingModel.agentPerformanceWeights.set(agentKey, newWeight);

    this.schedulingModel.lastUpdated = Date.now();
    
    // Save model periodically
    if (Date.now() - this.schedulingModel.lastUpdated > 300000) { // 5 minutes
      await this.saveSchedulingModel();
    }
  }

  updateCompletionTimeAverage(completionTime) {
    const alpha = 0.1; // Smoothing factor
    this.metrics.averageCompletionTime = this.metrics.averageCompletionTime * (1 - alpha) + completionTime * alpha;
  }

  async updateMetrics() {
    // Calculate load balancing efficiency
    const agentLoads = Array.from(this.agents.values()).map(a => a.currentLoad);
    const avgLoad = agentLoads.reduce((sum, load) => sum + load, 0) / agentLoads.length;
    const loadVariance = agentLoads.reduce((sum, load) => sum + Math.pow(load - avgLoad, 2), 0) / agentLoads.length;
    this.metrics.loadBalancingEfficiency = Math.max(0, 1 - (loadVariance / (avgLoad + 1)));

    // Store metrics in Redis
    await this.redis.hset('scheduler:metrics', {
      totalTasksScheduled: this.metrics.totalTasksScheduled,
      totalTasksCompleted: this.metrics.totalTasksCompleted,
      averageCompletionTime: this.metrics.averageCompletionTime,
      loadBalancingEfficiency: this.metrics.loadBalancingEfficiency,
      timestamp: Date.now()
    });
  }

  async rebalanceWorkload() {
    try {
      const agents = Array.from(this.agents.values());
      const overloadedAgents = agents.filter(a => a.currentLoad > a.maxConcurrency * 0.8);
      const underloadedAgents = agents.filter(a => a.currentLoad < a.maxConcurrency * 0.3);

      if (overloadedAgents.length === 0 || underloadedAgents.length === 0) {
        return;
      }

      console.log(`Advanced Scheduler: Rebalancing workload - ${overloadedAgents.length} overloaded, ${underloadedAgents.length} underloaded agents`);

      for (const overloadedAgent of overloadedAgents) {
        // Find tasks that can be migrated
        const queueKeys = await this.redis.keys(`queue:${overloadedAgent.id}:p:*`);
        
        for (const queueKey of queueKeys) {
          const tasks = await this.redis.zrange(queueKey, 0, 2, 'WITHSCORES');
          
          for (let i = 0; i < tasks.length; i += 2) {
            const taskData = JSON.parse(tasks[i]);
            const taskScore = tasks[i + 1];
            
            // Try to find a better agent for this task
            const betterAgent = await this.findBetterAgent(taskData, underloadedAgents);
            
            if (betterAgent) {
              // Move task to better agent
              await this.redis.zrem(queueKey, tasks[i]);
              const newQueueKey = `queue:${betterAgent.id}:p:${taskData.priority}`;
              await this.redis.zadd(newQueueKey, taskScore, JSON.stringify({
                ...taskData,
                assignedAgent: betterAgent.id,
                rebalanced: true
              }));
              
              console.log(`Advanced Scheduler: Migrated task ${taskData.id} from ${overloadedAgent.id} to ${betterAgent.id}`);
              break; // Only migrate one task per iteration
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during workload rebalancing:', error);
    }
  }

  async findBetterAgent(task, candidateAgents) {
    let bestAgent = null;
    let bestScore = 0;

    for (const agent of candidateAgents) {
      const score = this.calculateAgentScore(task, agent.id);
      if (score > bestScore && agent.currentLoad < agent.maxConcurrency * 0.7) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  async updateAgentHealth(agentId, healthData) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.lastHeartbeat = Date.now();
    
    // Calculate health score based on multiple factors
    let healthScore = 1.0;
    
    if (healthData.responseTime > 10000) healthScore -= 0.2; // Slow response
    if (healthData.errorRate > 0.1) healthScore -= 0.3; // High error rate
    if (healthData.memoryUsage > 0.9) healthScore -= 0.2; // High memory usage
    if (healthData.cpuUsage > 0.9) healthScore -= 0.2; // High CPU usage
    
    agent.healthScore = Math.max(0, healthScore);
    agent.resourceUsage = {
      cpu: healthData.cpuUsage || 0,
      memory: healthData.memoryUsage || 0,
      activeTasks: agent.currentLoad
    };

    await this.redis.hset('scheduler:agents', agentId, JSON.stringify(agent));
    
    // If health is critically low, mark agent as unhealthy
    if (agent.healthScore < 0.3) {
      console.warn(`Advanced Scheduler: Agent ${agentId} health critically low: ${agent.healthScore}`);
      await this.redis.sadd('scheduler:unhealthy_agents', agentId);
    } else {
      await this.redis.srem('scheduler:unhealthy_agents', agentId);
    }
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Advanced Task Scheduler started');

    // Start rebalancing interval
    this.rebalanceInterval = setInterval(() => {
      this.rebalanceWorkload().catch(console.error);
    }, this.config.rebalanceInterval);

    // Start health check interval
    this.healthInterval = setInterval(() => {
      this.checkAgentHealth().catch(console.error);
    }, this.config.healthCheckInterval);

    // Start metrics update interval
    this.metricsInterval = setInterval(() => {
      this.updateMetrics().catch(console.error);
    }, 60000); // Every minute
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.rebalanceInterval) clearInterval(this.rebalanceInterval);
    if (this.healthInterval) clearInterval(this.healthInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    
    await this.saveSchedulingModel();
    console.log('Advanced Task Scheduler stopped');
  }

  async checkAgentHealth() {
    const currentTime = Date.now();
    const healthThreshold = 60000; // 1 minute

    for (const [agentId, agent] of this.agents) {
      if (currentTime - agent.lastHeartbeat > healthThreshold) {
        console.warn(`Advanced Scheduler: Agent ${agentId} appears to be offline`);
        agent.healthScore = 0;
        await this.redis.sadd('scheduler:offline_agents', agentId);
      }
    }
  }

  async getSchedulingStats() {
    const stats = {
      ...this.metrics,
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.healthScore > 0.3).length,
      totalQueuedTasks: 0,
      agentDetails: []
    };

    // Count queued tasks
    const queueKeys = await this.redis.keys('queue:*:p:*');
    for (const key of queueKeys) {
      stats.totalQueuedTasks += await this.redis.zcard(key);
    }

    // Agent details
    for (const [agentId, agent] of this.agents) {
      stats.agentDetails.push({
        id: agentId,
        capabilities: agent.capabilities,
        currentLoad: agent.currentLoad,
        maxConcurrency: agent.maxConcurrency,
        healthScore: agent.healthScore,
        avgPerformance: agent.performanceHistory.length > 0 
          ? agent.performanceHistory.reduce((sum, p) => sum + p.completionTime, 0) / agent.performanceHistory.length
          : 0
      });
    }

    return stats;
  }
}

module.exports = AdvancedTaskScheduler;