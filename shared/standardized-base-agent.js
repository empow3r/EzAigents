/**
 * Standardized Base Agent with Enhanced Features
 * - Circuit breaker pattern
 * - Rate limiting
 * - Health checks
 * - Input validation
 * - Performance monitoring
 * - Secure API key management
 */

const EventEmitter = require('events');
const winston = require('winston');
const crypto = require('crypto');
const Joi = require('joi');
const EnhancedAgentCoordinator = require('./enhanced-agent-coordinator');

class StandardizedBaseAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Core configuration
    this.agentId = config.agentId || `${config.agentType}_${Date.now()}`;
    this.agentType = config.agentType;
    this.model = config.model;
    this.role = config.role || 'worker';
    this.capabilities = config.capabilities || [];
    this.maxLoad = config.maxLoad || 5;
    this.currentLoad = 0;
    
    // Performance configuration
    this.rateLimitPerMinute = config.rateLimitPerMinute || 60;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.taskTimeout = config.taskTimeout || 30000; // 30 seconds
    this.memoryLimit = config.memoryLimit || 512; // MB
    
    // Security configuration
    this.apiKey = null;
    this.encryptionKey = config.encryptionKey || process.env.ENCRYPTION_KEY;
    
    // Internal state
    this.status = 'initializing';
    this.assignedTasks = new Map();
    this.apiCallTimes = [];
    this.healthCheckInterval = null;
    this.memoryCheckInterval = null;
    
    // Enhanced coordinator
    this.coordinator = new EnhancedAgentCoordinator({
      agentId: this.agentId,
      redisUrl: config.redisUrl,
      encryptionKey: this.encryptionKey,
      maxRetries: this.maxRetries
    });
    
    // Metrics
    this.metrics = {
      tasksCompleted: 0,
      tasksActive: 0,
      tasksFailed: 0,
      apiCallsTotal: 0,
      apiCallsSuccessful: 0,
      averageTaskDuration: 0,
      lastTaskTime: null,
      startTime: Date.now()
    };
    
    // Logger setup
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        agent: this.agentId, 
        type: this.agentType, 
        model: this.model 
      },
      transports: [
        new winston.transports.File({ 
          filename: `.agent-memory/${this.agentType}/agent.log`,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
    
    this.setupValidationSchemas();
  }

  setupValidationSchemas() {
    this.taskSchema = Joi.object({
      id: Joi.string().required(),
      prompt: Joi.string().max(50000).required(),
      file: Joi.string().optional(),
      agentType: Joi.string().valid(...['claude', 'gpt', 'deepseek', 'mistral', 'gemini']).required(),
      priority: Joi.number().min(1).max(10).default(5),
      timeout: Joi.number().min(1000).max(300000).default(30000), // 1s to 5min
      metadata: Joi.object().optional()
    });
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Standardized Base Agent...');
      
      // Load and validate API key
      await this.loadApiKey();
      
      // Initialize coordinator
      await this.coordinator.initialize();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Register agent capabilities
      await this.registerCapabilities();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start memory monitoring
      this.startMemoryMonitoring();
      
      // Test API connectivity
      await this.testApiConnectivity();
      
      this.status = 'active';
      this.emit('initialized');
      
      this.logger.info('✅ Standardized Base Agent initialized successfully');
      
    } catch (error) {
      this.logger.error('❌ Initialization failed:', error);
      this.status = 'error';
      throw error;
    }
  }

  async loadApiKey() {
    const apiKeyEnvVar = `${this.agentType.toUpperCase()}_API_KEY`;
    const encryptedKey = process.env[apiKeyEnvVar];
    
    if (!encryptedKey) {
      throw new Error(`${apiKeyEnvVar} environment variable is required`);
    }
    
    // Decrypt API key if encryption is enabled
    if (this.encryptionKey && encryptedKey.startsWith('encrypted:')) {
      this.apiKey = await this.decryptApiKey(encryptedKey.replace('encrypted:', ''));
    } else {
      this.apiKey = encryptedKey;
    }
    
    this.logger.info('🔑 API key loaded securely');
  }

  async decryptApiKey(encryptedKey) {
    const [iv, encrypted] = encryptedKey.split(':');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  setupEventHandlers() {
    this.coordinator.on('task_received', async (task) => {
      await this.handleTaskAssignment(task);
    });
    
    this.coordinator.on('direct_message', async (message) => {
      await this.handleDirectMessage(message);
    });
    
    this.coordinator.on('broadcast_message', async (message) => {
      await this.handleBroadcastMessage(message);
    });
    
    this.coordinator.on('redis_error', (error) => {
      this.logger.error('Redis error in coordinator:', error);
      this.status = 'degraded';
    });
  }

  async registerCapabilities() {
    const agentInfo = {
      agentId: this.agentId,
      agentType: this.agentType,
      model: this.model,
      role: this.role,
      capabilities: this.capabilities,
      maxLoad: this.maxLoad,
      currentLoad: this.currentLoad,
      status: this.status,
      rateLimitPerMinute: this.rateLimitPerMinute,
      registeredAt: new Date().toISOString()
    };
    
    await this.coordinator.redis.hset('agents:registry', this.agentId, JSON.stringify(agentInfo));
    this.logger.info('📋 Agent capabilities registered');
  }

  async validateTask(task) {
    const { error, value } = this.taskSchema.validate(task);
    if (error) {
      throw new Error(`Invalid task: ${error.message}`);
    }
    return value;
  }

  async handleTaskAssignment(task) {
    const startTime = Date.now();
    let taskResult = null;
    
    try {
      this.logger.info(`📥 Task assigned: ${task.id}`);
      
      // Validate task
      const validatedTask = await this.validateTask(task);
      
      // Check capacity
      if (this.currentLoad >= this.maxLoad) {
        await this.rejectTask(validatedTask, 'Agent at maximum capacity');
        return;
      }
      
      // Check health
      if (this.status !== 'active') {
        await this.rejectTask(validatedTask, `Agent status: ${this.status}`);
        return;
      }
      
      // Add to assigned tasks
      this.assignedTasks.set(validatedTask.id, {
        ...validatedTask,
        startTime,
        status: 'processing'
      });
      
      this.currentLoad++;
      this.metrics.tasksActive++;
      
      // Set task timeout
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(validatedTask.id);
      }, validatedTask.timeout || this.taskTimeout);
      
      // Process task with rate limiting
      taskResult = await this.processTaskWithRateLimit(validatedTask);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateTaskMetrics(duration, true);
      
      // Report success
      await this.reportTaskComplete(validatedTask, taskResult, duration);
      
      this.logger.info(`✅ Task completed: ${validatedTask.id} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateTaskMetrics(duration, false);
      
      this.logger.error(`❌ Task failed: ${task.id}:`, error);
      await this.reportTaskFailed(task, error, duration);
      
    } finally {
      // Cleanup
      this.assignedTasks.delete(task.id);
      this.currentLoad--;
      this.metrics.tasksActive--;
    }
  }

  async processTaskWithRateLimit(task) {
    // Check rate limit
    await this.enforceRateLimit();
    
    // Process with retry logic and circuit breaker
    return await this.coordinator.executeWithCircuitBreaker('task_execution', async () => {
      return await this.executeWithRetry(async () => {
        return await this.processTask(task);
      });
    });
  }

  async enforceRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old entries
    this.apiCallTimes = this.apiCallTimes.filter(time => time > oneMinuteAgo);
    
    // Check limit
    if (this.apiCallTimes.length >= this.rateLimitPerMinute) {
      const oldestCall = this.apiCallTimes[0];
      const waitTime = 60000 - (now - oldestCall);
      
      this.logger.warn(`⏱️ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Record this call
    this.apiCallTimes.push(now);
  }

  async executeWithRetry(operation, retryCount = 0) {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        
        this.logger.warn(`⚠️ Retrying operation (${retryCount + 1}/${this.maxRetries}) after ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.executeWithRetry(operation, retryCount + 1);
      }
      throw error;
    }
  }

  isRetryableError(error) {
    const retryablePatterns = [
      /rate.?limit/i,
      /timeout/i,
      /503/,
      /502/,
      /500/,
      /ECONNRESET/,
      /ETIMEDOUT/,
      /ENOTFOUND/
    ];
    
    const errorMessage = error.message || String(error);
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  async processTask(task) {
    // To be implemented by child classes
    throw new Error('processTask must be implemented by child class');
  }

  async testApiConnectivity() {
    try {
      await this.performConnectivityTest();
      this.logger.info('✅ API connectivity test passed');
    } catch (error) {
      this.logger.warn('⚠️ API connectivity test failed:', error.message);
      this.status = 'degraded';
    }
  }

  async performConnectivityTest() {
    // To be implemented by child classes
    return true;
  }

  async performHealthCheck() {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    const health = {
      status: this.status,
      agentId: this.agentId,
      agentType: this.agentType,
      uptime: Date.now() - this.metrics.startTime,
      memoryUsage: {
        used: memoryUsageMB,
        limit: this.memoryLimit,
        percentage: Math.round((memoryUsageMB / this.memoryLimit) * 100)
      },
      performance: {
        tasksCompleted: this.metrics.tasksCompleted,
        tasksActive: this.metrics.tasksActive,
        tasksFailed: this.metrics.tasksFailed,
        averageTaskDuration: this.metrics.averageTaskDuration,
        successRate: this.metrics.tasksCompleted + this.metrics.tasksFailed > 0 
          ? Math.round((this.metrics.tasksCompleted / (this.metrics.tasksCompleted + this.metrics.tasksFailed)) * 100)
          : 100
      },
      apiHealth: {
        callsTotal: this.metrics.apiCallsTotal,
        callsSuccessful: this.metrics.apiCallsSuccessful,
        successRate: this.metrics.apiCallsTotal > 0 
          ? Math.round((this.metrics.apiCallsSuccessful / this.metrics.apiCallsTotal) * 100)
          : 100
      },
      queueHealth: {
        currentLoad: this.currentLoad,
        maxLoad: this.maxLoad,
        utilization: Math.round((this.currentLoad / this.maxLoad) * 100)
      },
      timestamp: new Date().toISOString()
    };
    
    // Determine overall health status
    if (health.memoryUsage.percentage > 90) {
      health.status = 'critical';
      health.issues = ['High memory usage'];
    } else if (health.performance.successRate < 50 || health.apiHealth.successRate < 50) {
      health.status = 'degraded';
      health.issues = ['Low success rate'];
    } else if (health.queueHealth.utilization > 80) {
      health.status = 'degraded';
      health.issues = ['High queue utilization'];
    }
    
    return health;
  }

  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        
        // Store health data
        await this.coordinator.redis.setex(
          `health:${this.agentId}`,
          60, // TTL 60 seconds
          JSON.stringify(health)
        );
        
        // Update status
        if (health.status !== this.status) {
          this.status = health.status;
          this.logger.info(`🏥 Health status changed to: ${this.status}`);
          await this.updateAgentStatus();
        }
        
      } catch (error) {
        this.logger.error('❌ Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
    
    this.logger.info('🏥 Health monitoring started');
  }

  startMemoryMonitoring() {
    this.memoryCheckInterval = setInterval(async () => {
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      if (memoryUsageMB > this.memoryLimit * 0.8) {
        this.logger.warn(`⚠️ High memory usage: ${memoryUsageMB}MB (${Math.round((memoryUsageMB / this.memoryLimit) * 100)}%)`);
        
        if (memoryUsageMB > this.memoryLimit) {
          this.logger.error('🚨 Memory limit exceeded, triggering cleanup');
          await this.performMemoryCleanup();
        }
      }
    }, 60000); // Every minute
    
    this.logger.info('🧠 Memory monitoring started');
  }

  async performMemoryCleanup() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear old log entries
    this.apiCallTimes = this.apiCallTimes.slice(-100);
    
    // Clear completed tasks older than 1 hour
    const oneHourAgo = Date.now() - 3600000;
    for (const [taskId, task] of this.assignedTasks.entries()) {
      if (task.startTime < oneHourAgo && task.status === 'completed') {
        this.assignedTasks.delete(taskId);
      }
    }
    
    this.logger.info('🧹 Memory cleanup performed');
  }

  updateTaskMetrics(duration, success) {
    if (success) {
      this.metrics.tasksCompleted++;
    } else {
      this.metrics.tasksFailed++;
    }
    
    // Update average duration
    const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksFailed;
    this.metrics.averageTaskDuration = Math.round(
      ((this.metrics.averageTaskDuration * (totalTasks - 1)) + duration) / totalTasks
    );
    
    this.metrics.lastTaskTime = Date.now();
  }

  async updateAgentStatus() {
    const agentInfo = {
      agentId: this.agentId,
      status: this.status,
      currentLoad: this.currentLoad,
      lastUpdate: new Date().toISOString()
    };
    
    await this.coordinator.redis.hset('agents:status', this.agentId, JSON.stringify(agentInfo));
  }

  async reportTaskComplete(task, result, duration) {
    await this.coordinator.redis.publish('task:complete', JSON.stringify({
      taskId: task.id,
      agentId: this.agentId,
      agentType: this.agentType,
      result: result,
      duration: duration,
      completedAt: new Date().toISOString()
    }));
  }

  async reportTaskFailed(task, error, duration) {
    await this.coordinator.redis.publish('task:failed', JSON.stringify({
      taskId: task.id,
      agentId: this.agentId,
      agentType: this.agentType,
      error: error.message,
      errorStack: error.stack,
      duration: duration,
      failedAt: new Date().toISOString()
    }));
  }

  async rejectTask(task, reason) {
    this.logger.warn(`⚠️ Task rejected: ${task.id} - ${reason}`);
    
    await this.coordinator.redis.publish('task:rejected', JSON.stringify({
      taskId: task.id,
      agentId: this.agentId,
      agentType: this.agentType,
      reason: reason,
      rejectedAt: new Date().toISOString()
    }));
  }

  async handleTaskTimeout(taskId) {
    this.logger.error(`⏰ Task timeout: ${taskId}`);
    
    const task = this.assignedTasks.get(taskId);
    if (task) {
      task.status = 'timeout';
      await this.reportTaskFailed(task, new Error('Task timeout'), Date.now() - task.startTime);
      this.assignedTasks.delete(taskId);
      this.currentLoad--;
      this.metrics.tasksActive--;
    }
  }

  async handleDirectMessage(message) {
    this.logger.info(`📨 Direct message from ${message.from}: ${message.type}`);
    this.emit('direct_message', message);
  }

  async handleBroadcastMessage(message) {
    this.logger.info(`📢 Broadcast from ${message.from}: ${message.type}`);
    this.emit('broadcast_message', message);
  }

  async shutdown() {
    this.logger.info('🛑 Shutting down Standardized Base Agent...');
    this.status = 'shutting_down';
    
    // Clear intervals
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.memoryCheckInterval) clearInterval(this.memoryCheckInterval);
    
    // Wait for current tasks to complete (with timeout)
    const shutdownTimeout = setTimeout(() => {
      this.logger.warn('⚠️ Shutdown timeout, forcing shutdown');
    }, 30000);
    
    while (this.currentLoad > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    clearTimeout(shutdownTimeout);
    
    // Shutdown coordinator
    await this.coordinator.shutdown();
    
    this.emit('shutdown');
    this.logger.info('✅ Standardized Base Agent shutdown complete');
  }
}

module.exports = StandardizedBaseAgent;