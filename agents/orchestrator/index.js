/**
 * Dedicated Orchestrator Agent
 * This agent focuses solely on queue management, coordination, and system health
 */

const Redis = require('redis');
const { EventEmitter } = require('events');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class OrchestratorAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.agentId = config.agentId || `orchestrator_${uuidv4()}`;
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.role = 'orchestrator';
    this.status = 'initializing';
    
    // Redis clients
    this.redis = null;
    this.pubClient = null;
    this.subClient = null;
    
    // Queue monitoring
    this.queues = new Map();
    this.agents = new Map();
    this.healthChecks = new Map();
    
    // Configuration
    this.config = {
      healthCheckInterval: 5000,
      deadLetterThreshold: 3,
      maxRetries: 5,
      taskTimeout: 1800000, // 30 minutes
      queuePriorities: {
        'queue:claude-3-opus': 10,
        'queue:gpt-4o': 8,
        'queue:deepseek-coder': 6,
        'queue:command-r-plus': 5,
        'queue:gemini-pro': 5
      },
      ...config
    };
    
    // Logger setup
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { agent: this.agentId, role: this.role },
      transports: [
        new winston.transports.File({ filename: 'orchestrator-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'orchestrator.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  async start() {
    try {
      this.logger.info('Starting Orchestrator Agent', { agentId: this.agentId });
      
      // Initialize Redis connections
      await this.initializeRedis();
      
      // Set up communication channels
      await this.setupCommunicationChannels();
      
      // Start monitoring
      this.startHealthMonitoring();
      this.startQueueMonitoring();
      this.startAgentMonitoring();
      
      // Initialize queue structures
      await this.initializeQueueStructures();
      
      this.status = 'active';
      this.emit('started');
      
      this.logger.info('Orchestrator Agent started successfully');
      
      // Start main orchestration loop
      this.orchestrate();
      
    } catch (error) {
      this.logger.error('Failed to start orchestrator', error);
      throw error;
    }
  }

  async initializeRedis() {
    // Main Redis client for general operations
    this.redis = Redis.createClient({ url: this.redisUrl });
    this.redis.on('error', (err) => this.handleRedisError('main', err));
    
    // Pub client for publishing messages
    this.pubClient = Redis.createClient({ url: this.redisUrl });
    this.pubClient.on('error', (err) => this.handleRedisError('pub', err));
    
    // Sub client for subscriptions
    this.subClient = Redis.createClient({ url: this.redisUrl });
    this.subClient.on('error', (err) => this.handleRedisError('sub', err));
    
    await Promise.all([
      this.redis.connect(),
      this.pubClient.connect(),
      this.subClient.connect()
    ]);
  }

  async setupCommunicationChannels() {
    // Subscribe to agent channels
    await this.subClient.subscribe('agent:register', (message) => {
      this.handleAgentRegistration(JSON.parse(message));
    });
    
    await this.subClient.subscribe('agent:status', (message) => {
      this.handleAgentStatus(JSON.parse(message));
    });
    
    await this.subClient.subscribe('agent:error', (message) => {
      this.handleAgentError(JSON.parse(message));
    });
    
    await this.subClient.subscribe('task:complete', (message) => {
      this.handleTaskComplete(JSON.parse(message));
    });
    
    await this.subClient.subscribe('task:failed', (message) => {
      this.handleTaskFailed(JSON.parse(message));
    });
    
    // Subscribe to orchestrator control channel
    await this.subClient.subscribe('orchestrator:command', (message) => {
      this.handleCommand(JSON.parse(message));
    });
  }

  async initializeQueueStructures() {
    // Create dead letter queues
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    
    for (const model of models) {
      // Initialize queue metadata
      this.queues.set(`queue:${model}`, {
        name: `queue:${model}`,
        model: model,
        depth: 0,
        processing: 0,
        failed: 0,
        completed: 0,
        avgProcessingTime: 0,
        lastCheck: Date.now()
      });
      
      // Ensure dead letter queue exists
      await this.redis.lLen(`dlq:${model}`).catch(() => 0);
      
      // Initialize transaction log
      await this.redis.zAdd(`txlog:${model}`, [{
        score: Date.now(),
        value: JSON.stringify({ 
          event: 'queue_initialized', 
          timestamp: new Date().toISOString() 
        })
      }]).catch(() => {});
    }
  }

  startHealthMonitoring() {
    setInterval(async () => {
      try {
        // Check Redis connection
        await this.redis.ping();
        
        // Check queue health
        for (const [queueName, queueData] of this.queues) {
          await this.checkQueueHealth(queueName);
        }
        
        // Check agent health
        for (const [agentId, agentData] of this.agents) {
          await this.checkAgentHealth(agentId);
        }
        
        // Publish health status
        await this.publishHealthStatus();
        
      } catch (error) {
        this.logger.error('Health monitoring error', error);
      }
    }, this.config.healthCheckInterval);
  }

  startQueueMonitoring() {
    setInterval(async () => {
      try {
        // Monitor all queues
        for (const [queueName, queueData] of this.queues) {
          const stats = await this.getQueueStats(queueName);
          
          // Update queue data
          queueData.depth = stats.depth;
          queueData.processing = stats.processing;
          queueData.failed = stats.failed;
          
          // Check for stuck tasks
          await this.checkStuckTasks(queueName);
          
          // Balance queues if needed
          await this.balanceQueues();
        }
      } catch (error) {
        this.logger.error('Queue monitoring error', error);
      }
    }, 3000);
  }

  startAgentMonitoring() {
    setInterval(async () => {
      try {
        const now = Date.now();
        
        for (const [agentId, agentData] of this.agents) {
          // Check if agent is responsive
          if (now - agentData.lastHeartbeat > 30000) {
            this.logger.warn('Agent unresponsive', { agentId });
            await this.handleUnresponsiveAgent(agentId);
          }
          
          // Check agent load
          if (agentData.currentLoad > agentData.maxLoad * 0.9) {
            this.logger.warn('Agent overloaded', { agentId, load: agentData.currentLoad });
            await this.redistributeAgentTasks(agentId);
          }
        }
      } catch (error) {
        this.logger.error('Agent monitoring error', error);
      }
    }, 5000);
  }

  async orchestrate() {
    while (this.status === 'active') {
      try {
        // Get queue priorities
        const prioritizedQueues = this.getPrioritizedQueues();
        
        // Check each queue for tasks
        for (const queue of prioritizedQueues) {
          await this.processQueue(queue);
        }
        
        // Handle failed tasks
        await this.processFailedTasks();
        
        // Optimize task distribution
        await this.optimizeTaskDistribution();
        
        // Small delay to prevent CPU spinning
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        this.logger.error('Orchestration error', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async processQueue(queueName) {
    try {
      // Check if any agents are available for this model
      const availableAgents = this.getAvailableAgents(queueName);
      
      if (availableAgents.length === 0) {
        return;
      }
      
      // Get task from queue
      const task = await this.redis.lIndex(queueName, 0);
      if (!task) return;
      
      const taskData = JSON.parse(task);
      
      // Validate task
      if (!this.validateTask(taskData)) {
        await this.moveToDeadLetter(queueName, taskData, 'Invalid task format');
        await this.redis.lPop(queueName);
        return;
      }
      
      // Select best agent
      const agent = this.selectBestAgent(availableAgents, taskData);
      
      if (agent) {
        // Assign task to agent
        await this.assignTaskToAgent(agent, taskData, queueName);
      }
      
    } catch (error) {
      this.logger.error('Queue processing error', { queue: queueName, error });
    }
  }

  async assignTaskToAgent(agent, task, queueName) {
    const transactionId = uuidv4();
    
    try {
      // Start transaction
      await this.logTransaction(queueName, 'task_assignment_start', { 
        transactionId, 
        agentId: agent.id, 
        taskId: task.id 
      });
      
      // Atomically move task from queue to processing
      const multi = this.redis.multi();
      multi.lPop(queueName);
      multi.hSet(`processing:${queueName}`, task.id, JSON.stringify({
        ...task,
        agentId: agent.id,
        startTime: Date.now(),
        transactionId
      }));
      
      await multi.exec();
      
      // Update agent status
      agent.currentLoad++;
      agent.assignedTasks.push(task.id);
      
      // Send task to agent
      await this.pubClient.publish(`agent:${agent.id}:task`, JSON.stringify({
        ...task,
        queueName,
        transactionId,
        timeout: this.config.taskTimeout
      }));
      
      // Log successful assignment
      await this.logTransaction(queueName, 'task_assignment_complete', { 
        transactionId, 
        agentId: agent.id, 
        taskId: task.id 
      });
      
      this.logger.info('Task assigned', { 
        taskId: task.id, 
        agentId: agent.id, 
        queue: queueName 
      });
      
    } catch (error) {
      this.logger.error('Task assignment error', { error, task: task.id, agent: agent.id });
      
      // Rollback
      await this.rollbackTaskAssignment(task, queueName, transactionId);
    }
  }

  async checkStuckTasks(queueName) {
    try {
      const processingKey = `processing:${queueName}`;
      const tasks = await this.redis.hGetAll(processingKey);
      const now = Date.now();
      
      for (const [taskId, taskData] of Object.entries(tasks)) {
        const task = JSON.parse(taskData);
        
        if (now - task.startTime > this.config.taskTimeout) {
          this.logger.warn('Stuck task detected', { 
            taskId, 
            agentId: task.agentId, 
            duration: now - task.startTime 
          });
          
          // Handle stuck task
          await this.handleStuckTask(task, queueName);
        }
      }
    } catch (error) {
      this.logger.error('Stuck task check error', { queue: queueName, error });
    }
  }

  async handleStuckTask(task, queueName) {
    try {
      // Remove from processing
      await this.redis.hDel(`processing:${queueName}`, task.id);
      
      // Check retry count
      task.retries = (task.retries || 0) + 1;
      
      if (task.retries < this.config.maxRetries) {
        // Re-queue with exponential backoff
        const delay = Math.pow(2, task.retries) * 1000;
        
        setTimeout(async () => {
          await this.redis.rPush(queueName, JSON.stringify(task));
          this.logger.info('Task re-queued', { taskId: task.id, retries: task.retries });
        }, delay);
        
      } else {
        // Move to dead letter queue
        await this.moveToDeadLetter(queueName, task, 'Max retries exceeded');
      }
      
      // Notify agent of task timeout
      if (task.agentId) {
        await this.pubClient.publish(`agent:${task.agentId}:control`, JSON.stringify({
          command: 'task_timeout',
          taskId: task.id
        }));
      }
      
    } catch (error) {
      this.logger.error('Stuck task handling error', { taskId: task.id, error });
    }
  }

  async moveToDeadLetter(queueName, task, reason) {
    const dlqName = queueName.replace('queue:', 'dlq:');
    
    await this.redis.rPush(dlqName, JSON.stringify({
      ...task,
      failedAt: Date.now(),
      reason,
      originalQueue: queueName
    }));
    
    await this.logTransaction(queueName, 'task_dead_lettered', { 
      taskId: task.id, 
      reason 
    });
    
    this.logger.error('Task moved to DLQ', { taskId: task.id, reason });
  }

  async processFailedTasks() {
    try {
      const failedTasks = await this.redis.lRange('queue:failures', 0, 9);
      
      for (const taskStr of failedTasks) {
        const task = JSON.parse(taskStr);
        
        // Analyze failure
        const canRetry = await this.analyzeFailure(task);
        
        if (canRetry) {
          // Determine best queue for retry
          const targetQueue = this.determineRetryQueue(task);
          
          // Re-queue with updated metadata
          task.retries = (task.retries || 0) + 1;
          task.lastFailure = task.error;
          delete task.error;
          
          await this.redis.rPush(targetQueue, JSON.stringify(task));
          await this.redis.lRem('queue:failures', 1, taskStr);
          
          this.logger.info('Failed task re-queued', { 
            taskId: task.id, 
            targetQueue, 
            retries: task.retries 
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed task processing error', error);
    }
  }

  async balanceQueues() {
    try {
      const queueStats = await this.getAllQueueStats();
      
      // Find overloaded and underutilized queues
      const overloaded = [];
      const underutilized = [];
      
      for (const [queue, stats] of Object.entries(queueStats)) {
        if (stats.depth > 50 && stats.availableAgents < 2) {
          overloaded.push({ queue, stats });
        } else if (stats.depth < 5 && stats.availableAgents > 3) {
          underutilized.push({ queue, stats });
        }
      }
      
      // Redistribute if needed
      if (overloaded.length > 0 && underutilized.length > 0) {
        await this.redistributeTasks(overloaded, underutilized);
      }
      
    } catch (error) {
      this.logger.error('Queue balancing error', error);
    }
  }

  async optimizeTaskDistribution() {
    try {
      // Analyze task patterns
      const taskPatterns = await this.analyzeTaskPatterns();
      
      // Update queue priorities based on patterns
      for (const [pattern, data] of Object.entries(taskPatterns)) {
        if (data.avgProcessingTime > 600000) { // 10 minutes
          // Increase priority for slow-processing queues
          const queueName = `queue:${pattern}`;
          if (this.config.queuePriorities[queueName]) {
            this.config.queuePriorities[queueName] = Math.min(
              this.config.queuePriorities[queueName] + 1,
              10
            );
          }
        }
      }
      
      // Rebalance agent assignments
      await this.rebalanceAgentAssignments();
      
    } catch (error) {
      this.logger.error('Task distribution optimization error', error);
    }
  }

  // Communication handlers
  async handleAgentRegistration(data) {
    this.logger.info('Agent registered', { agentId: data.agentId, model: data.model });
    
    this.agents.set(data.agentId, {
      id: data.agentId,
      model: data.model,
      capabilities: data.capabilities || [],
      maxLoad: data.maxLoad || 5,
      currentLoad: 0,
      assignedTasks: [],
      lastHeartbeat: Date.now(),
      status: 'active',
      performance: {
        tasksCompleted: 0,
        tasksFailed: 0,
        avgProcessingTime: 0
      }
    });
    
    // Send acknowledgment
    await this.pubClient.publish(`agent:${data.agentId}:control`, JSON.stringify({
      command: 'registration_acknowledged',
      orchestratorId: this.agentId,
      config: {
        heartbeatInterval: 10000,
        taskTimeout: this.config.taskTimeout
      }
    }));
  }

  async handleAgentStatus(data) {
    const agent = this.agents.get(data.agentId);
    
    if (agent) {
      agent.lastHeartbeat = Date.now();
      agent.status = data.status;
      agent.currentLoad = data.currentLoad || agent.currentLoad;
      
      if (data.completedTask) {
        agent.performance.tasksCompleted++;
      }
    }
  }

  async handleAgentError(data) {
    this.logger.error('Agent error reported', data);
    
    const agent = this.agents.get(data.agentId);
    if (agent) {
      agent.performance.tasksFailed++;
      
      // If agent is failing too often, reduce its load
      if (agent.performance.tasksFailed > agent.performance.tasksCompleted * 0.3) {
        agent.maxLoad = Math.max(1, agent.maxLoad - 1);
        this.logger.warn('Reducing agent max load due to errors', { 
          agentId: data.agentId, 
          newMaxLoad: agent.maxLoad 
        });
      }
    }
    
    // Handle the specific error
    if (data.taskId) {
      await this.handleTaskError(data);
    }
  }

  async handleTaskComplete(data) {
    try {
      const { taskId, agentId, queueName, result } = data;
      
      // Remove from processing
      await this.redis.hDel(`processing:${queueName}`, taskId);
      
      // Update agent
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.currentLoad--;
        agent.assignedTasks = agent.assignedTasks.filter(id => id !== taskId);
        
        // Update performance metrics
        const processingTime = Date.now() - (data.startTime || Date.now());
        agent.performance.avgProcessingTime = 
          (agent.performance.avgProcessingTime * agent.performance.tasksCompleted + processingTime) /
          (agent.performance.tasksCompleted + 1);
      }
      
      // Update queue stats
      const queue = this.queues.get(queueName);
      if (queue) {
        queue.completed++;
        queue.processing--;
      }
      
      // Log transaction
      await this.logTransaction(queueName, 'task_completed', { 
        taskId, 
        agentId, 
        duration: Date.now() - (data.startTime || Date.now()) 
      });
      
      this.logger.info('Task completed', { taskId, agentId, queueName });
      
    } catch (error) {
      this.logger.error('Task completion handling error', error);
    }
  }

  async handleTaskFailed(data) {
    try {
      const { taskId, agentId, queueName, error, canRetry } = data;
      
      // Get task from processing
      const taskStr = await this.redis.hGet(`processing:${queueName}`, taskId);
      if (!taskStr) return;
      
      const task = JSON.parse(taskStr);
      task.error = error;
      task.failedAt = Date.now();
      task.failedBy = agentId;
      
      // Remove from processing
      await this.redis.hDel(`processing:${queueName}`, taskId);
      
      // Update agent
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.currentLoad--;
        agent.assignedTasks = agent.assignedTasks.filter(id => id !== taskId);
      }
      
      // Decide what to do with the task
      if (canRetry && (task.retries || 0) < this.config.maxRetries) {
        // Re-queue with backoff
        task.retries = (task.retries || 0) + 1;
        const delay = Math.pow(2, task.retries) * 1000;
        
        setTimeout(async () => {
          await this.redis.rPush(queueName, JSON.stringify(task));
        }, delay);
        
      } else {
        // Move to failures or DLQ
        if ((task.retries || 0) >= this.config.deadLetterThreshold) {
          await this.moveToDeadLetter(queueName, task, error);
        } else {
          await this.redis.rPush('queue:failures', JSON.stringify(task));
        }
      }
      
      // Log transaction
      await this.logTransaction(queueName, 'task_failed', { 
        taskId, 
        agentId, 
        error,
        retries: task.retries || 0
      });
      
    } catch (err) {
      this.logger.error('Task failure handling error', err);
    }
  }

  async handleCommand(command) {
    this.logger.info('Received command', command);
    
    switch (command.type) {
      case 'pause':
        this.status = 'paused';
        break;
        
      case 'resume':
        this.status = 'active';
        this.orchestrate();
        break;
        
      case 'rebalance':
        await this.balanceQueues();
        break;
        
      case 'health_check':
        await this.publishHealthStatus();
        break;
        
      case 'clear_dlq':
        await this.clearDeadLetterQueues(command.queue);
        break;
        
      default:
        this.logger.warn('Unknown command', command);
    }
  }

  // Helper methods
  getPrioritizedQueues() {
    return Object.entries(this.config.queuePriorities)
      .sort(([, a], [, b]) => b - a)
      .map(([queue]) => queue);
  }

  getAvailableAgents(queueName) {
    const model = queueName.split(':')[1];
    const availableAgents = [];
    
    for (const [agentId, agent] of this.agents) {
      if (agent.model === model && 
          agent.status === 'active' && 
          agent.currentLoad < agent.maxLoad) {
        availableAgents.push(agent);
      }
    }
    
    return availableAgents;
  }

  selectBestAgent(agents, task) {
    // Sort agents by performance and current load
    return agents.sort((a, b) => {
      // Prefer agents with lower load
      const loadDiff = (a.currentLoad / a.maxLoad) - (b.currentLoad / b.maxLoad);
      if (loadDiff !== 0) return loadDiff;
      
      // Then by success rate
      const aSuccessRate = a.performance.tasksCompleted / 
        (a.performance.tasksCompleted + a.performance.tasksFailed || 1);
      const bSuccessRate = b.performance.tasksCompleted / 
        (b.performance.tasksCompleted + b.performance.tasksFailed || 1);
      
      return bSuccessRate - aSuccessRate;
    })[0];
  }

  validateTask(task) {
    return task && 
           task.id && 
           task.prompt && 
           (task.file || task.action || task.type);
  }

  async getQueueStats(queueName) {
    const [depth, processingCount] = await Promise.all([
      this.redis.lLen(queueName),
      this.redis.hLen(`processing:${queueName}`)
    ]);
    
    const failed = await this.redis.lLen(`dlq:${queueName.replace('queue:', '')}`);
    
    return {
      depth,
      processing: processingCount,
      failed,
      availableAgents: this.getAvailableAgents(queueName).length
    };
  }

  async analyzeFailure(task) {
    // Check if error is retryable
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'rate_limit',
      'temporary_failure'
    ];
    
    if (task.error) {
      return retryableErrors.some(err => 
        task.error.toLowerCase().includes(err.toLowerCase())
      );
    }
    
    return task.retries < this.config.maxRetries;
  }

  determineRetryQueue(task) {
    // If task has failed multiple times on one model, try another
    if (task.retries >= 2 && task.failedBy) {
      const agent = this.agents.get(task.failedBy);
      if (agent) {
        const currentModel = agent.model;
        
        // Fallback order
        const fallbacks = {
          'claude-3-opus': 'gpt-4o',
          'gpt-4o': 'claude-3-opus',
          'deepseek-coder': 'gpt-4o',
          'command-r-plus': 'gemini-pro',
          'gemini-pro': 'command-r-plus'
        };
        
        const fallbackModel = fallbacks[currentModel];
        if (fallbackModel) {
          return `queue:${fallbackModel}`;
        }
      }
    }
    
    return task.originalQueue || 'queue:gpt-4o';
  }

  async logTransaction(queue, event, data) {
    const logEntry = {
      event,
      queue,
      timestamp: new Date().toISOString(),
      orchestrator: this.agentId,
      ...data
    };
    
    await this.redis.zAdd(`txlog:${queue}`, [{
      score: Date.now(),
      value: JSON.stringify(logEntry)
    }]);
    
    // Keep only last 10000 entries
    await this.redis.zRemRangeByRank(`txlog:${queue}`, 0, -10001);
  }

  async publishHealthStatus() {
    const status = {
      orchestrator: {
        id: this.agentId,
        status: this.status,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      queues: {},
      agents: {}
    };
    
    // Add queue stats
    for (const [queueName, queueData] of this.queues) {
      status.queues[queueName] = {
        ...queueData,
        healthy: queueData.failed < 10 && queueData.processing < 50
      };
    }
    
    // Add agent stats
    for (const [agentId, agentData] of this.agents) {
      status.agents[agentId] = {
        id: agentId,
        model: agentData.model,
        status: agentData.status,
        load: `${agentData.currentLoad}/${agentData.maxLoad}`,
        performance: agentData.performance,
        healthy: Date.now() - agentData.lastHeartbeat < 30000
      };
    }
    
    await this.pubClient.publish('orchestrator:health', JSON.stringify(status));
  }

  handleRedisError(client, error) {
    this.logger.error(`Redis ${client} error`, error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.status = 'error';
      this.emit('error', error);
    }
  }

  async shutdown() {
    this.logger.info('Shutting down orchestrator');
    this.status = 'shutting_down';
    
    // Close Redis connections
    await Promise.all([
      this.redis?.quit(),
      this.pubClient?.quit(),
      this.subClient?.quit()
    ]);
    
    this.emit('shutdown');
  }
}

// Export and start if run directly
module.exports = OrchestratorAgent;

if (require.main === module) {
  const orchestrator = new OrchestratorAgent({
    agentId: process.env.AGENT_ID || 'orchestrator_main'
  });
  
  orchestrator.start().catch(error => {
    console.error('Failed to start orchestrator:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await orchestrator.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await orchestrator.shutdown();
    process.exit(0);
  });
}