/**
 * Base Agent Class with Orchestrator Communication
 * All agents inherit from this for bulletproof queue handling
 */

const Redis = require('redis');
const EventEmitter = require('events');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class BaseAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.agentId = config.agentId || `${config.model}_${uuidv4()}`;
    this.model = config.model;
    this.role = config.role || 'worker';
    this.capabilities = config.capabilities || [];
    this.maxLoad = config.maxLoad || 5;
    this.currentLoad = 0;
    this.assignedTasks = new Map();
    
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = null;
    this.pubClient = null;
    this.subClient = null;
    
    this.status = 'initializing';
    this.orchestratorConnected = false;
    this.heartbeatInterval = null;
    this.taskTimeout = 1800000; // 30 minutes default
    
    // Logger setup
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { agent: this.agentId, model: this.model, role: this.role },
      transports: [
        new winston.transports.File({ filename: `${this.model}-error.log`, level: 'error' }),
        new winston.transports.File({ filename: `${this.model}.log` }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  async initialize() {
    try {
      this.logger.info('Initializing agent', { agentId: this.agentId });
      
      // Initialize Redis connections
      await this.initializeRedis();
      
      // Register with orchestrator
      await this.registerWithOrchestrator();
      
      // Set up communication channels
      await this.setupCommunicationChannels();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.status = 'active';
      this.emit('initialized');
      
      this.logger.info('Agent initialized successfully');
      
    } catch (error) {
      this.logger.error('Initialization failed', error);
      throw error;
    }
  }

  async initializeRedis() {
    // Main Redis client
    this.redis = Redis.createClient({ url: this.redisUrl });
    this.redis.on('error', (err) => this.handleRedisError('main', err));
    
    // Pub client for publishing
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

  async registerWithOrchestrator() {
    const registrationData = {
      agentId: this.agentId,
      model: this.model,
      role: this.role,
      capabilities: this.capabilities,
      maxLoad: this.maxLoad,
      timestamp: Date.now()
    };
    
    await this.pubClient.publish('agent:register', JSON.stringify(registrationData));
    
    // Wait for acknowledgment
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Orchestrator registration timeout'));
      }, 10000);
      
      this.once('registration_acknowledged', () => {
        clearTimeout(timeout);
        this.orchestratorConnected = true;
        resolve();
      });
    });
  }

  async setupCommunicationChannels() {
    // Subscribe to agent-specific channels
    await this.subClient.subscribe(`agent:${this.agentId}:task`, (message) => {
      this.handleTaskAssignment(JSON.parse(message));
    });
    
    await this.subClient.subscribe(`agent:${this.agentId}:control`, (message) => {
      this.handleControlMessage(JSON.parse(message));
    });
    
    // Subscribe to broadcast channels
    await this.subClient.subscribe('agent:broadcast', (message) => {
      this.handleBroadcast(JSON.parse(message));
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendStatus();
      } catch (error) {
        this.logger.error('Heartbeat error', error);
      }
    }, 10000);
  }

  async sendStatus() {
    const status = {
      agentId: this.agentId,
      status: this.status,
      currentLoad: this.currentLoad,
      maxLoad: this.maxLoad,
      assignedTasks: Array.from(this.assignedTasks.keys()),
      timestamp: Date.now()
    };
    
    await this.pubClient.publish('agent:status', JSON.stringify(status));
  }

  async handleTaskAssignment(task) {
    try {
      this.logger.info('Task assigned', { taskId: task.id });
      
      // Validate we can handle this task
      if (this.currentLoad >= this.maxLoad) {
        await this.rejectTask(task, 'Agent at max capacity');
        return;
      }
      
      // Store task
      this.assignedTasks.set(task.id, {
        ...task,
        startTime: Date.now(),
        status: 'processing'
      });
      
      this.currentLoad++;
      
      // Set timeout for task
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, task.timeout || this.taskTimeout);
      
      // Process task (to be implemented by child classes)
      this.emit('task_received', task);
      
      try {
        const result = await this.processTask(task);
        
        // Clear timeout
        clearTimeout(timeoutId);
        
        // Report success
        await this.reportTaskComplete(task, result);
        
      } catch (error) {
        // Clear timeout
        clearTimeout(timeoutId);
        
        // Report failure
        await this.reportTaskFailed(task, error);
      }
      
    } catch (error) {
      this.logger.error('Task assignment error', { taskId: task.id, error });
      await this.reportTaskFailed(task, error);
    }
  }

  async processTask(task) {
    // To be implemented by child classes
    throw new Error('processTask must be implemented by child class');
  }

  async reportTaskComplete(task, result) {
    this.logger.info('Task completed', { taskId: task.id });
    
    // Remove from assigned tasks
    this.assignedTasks.delete(task.id);
    this.currentLoad--;
    
    // Report to orchestrator
    await this.pubClient.publish('task:complete', JSON.stringify({
      taskId: task.id,
      agentId: this.agentId,
      queueName: task.queueName,
      result: result,
      startTime: task.startTime,
      completedAt: Date.now()
    }));
  }

  async reportTaskFailed(task, error) {
    this.logger.error('Task failed', { taskId: task.id, error: error.message });
    
    // Remove from assigned tasks
    this.assignedTasks.delete(task.id);
    this.currentLoad--;
    
    // Determine if task can be retried
    const canRetry = this.isRetryableError(error);
    
    // Report to orchestrator
    await this.pubClient.publish('task:failed', JSON.stringify({
      taskId: task.id,
      agentId: this.agentId,
      queueName: task.queueName,
      error: error.message || String(error),
      errorStack: error.stack,
      canRetry: canRetry,
      startTime: task.startTime,
      failedAt: Date.now()
    }));
    
    // Also send error event
    await this.pubClient.publish('agent:error', JSON.stringify({
      agentId: this.agentId,
      taskId: task.id,
      error: error.message || String(error),
      timestamp: Date.now()
    }));
  }

  async rejectTask(task, reason) {
    this.logger.warn('Task rejected', { taskId: task.id, reason });
    
    await this.pubClient.publish('task:rejected', JSON.stringify({
      taskId: task.id,
      agentId: this.agentId,
      queueName: task.queueName,
      reason: reason,
      timestamp: Date.now()
    }));
  }

  async handleTaskTimeout(taskId) {
    this.logger.error('Task timeout', { taskId });
    
    const task = this.assignedTasks.get(taskId);
    if (task) {
      await this.reportTaskFailed(task, new Error('Task timeout'));
    }
  }

  async handleControlMessage(message) {
    this.logger.info('Control message received', message);
    
    switch (message.command) {
      case 'registration_acknowledged':
        this.emit('registration_acknowledged');
        if (message.config) {
          if (message.config.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.startHeartbeat();
          }
          if (message.config.taskTimeout) {
            this.taskTimeout = message.config.taskTimeout;
          }
        }
        break;
        
      case 'task_timeout':
        const task = this.assignedTasks.get(message.taskId);
        if (task) {
          this.assignedTasks.delete(message.taskId);
          this.currentLoad--;
        }
        break;
        
      case 'pause':
        this.status = 'paused';
        break;
        
      case 'resume':
        this.status = 'active';
        break;
        
      case 'shutdown':
        await this.shutdown();
        break;
        
      default:
        this.logger.warn('Unknown control command', message);
    }
  }

  async handleBroadcast(message) {
    this.logger.info('Broadcast received', message);
    this.emit('broadcast', message);
  }

  isRetryableError(error) {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'rate_limit_exceeded',
      'temporary_failure',
      'concurrent_modification'
    ];
    
    const errorMessage = error.message || String(error);
    return retryableErrors.some(err => 
      errorMessage.toLowerCase().includes(err.toLowerCase())
    );
  }

  handleRedisError(client, error) {
    this.logger.error(`Redis ${client} error`, error);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.status = 'error';
      this.emit('error', error);
    }
  }

  async shutdown() {
    this.logger.info('Shutting down agent');
    this.status = 'shutting_down';
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Wait for current tasks to complete (with timeout)
    const timeout = setTimeout(() => {
      this.logger.warn('Shutdown timeout, forcing shutdown');
    }, 30000);
    
    while (this.currentLoad > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    clearTimeout(timeout);
    
    // Close Redis connections
    await Promise.all([
      this.redis?.quit(),
      this.pubClient?.quit(),
      this.subClient?.quit()
    ]);
    
    this.emit('shutdown');
  }

  // Helper method for inter-agent communication
  async sendMessageToAgent(targetAgentId, message) {
    await this.pubClient.publish(`agent:${targetAgentId}:message`, JSON.stringify({
      from: this.agentId,
      to: targetAgentId,
      message: message,
      timestamp: Date.now()
    }));
  }

  // Collaborate with other agents
  async requestCollaboration(task, requiredCapability) {
    await this.pubClient.publish('collaboration:request', JSON.stringify({
      requestingAgent: this.agentId,
      taskId: task.id,
      requiredCapability: requiredCapability,
      task: task,
      timestamp: Date.now()
    }));
  }
}

module.exports = BaseAgent;