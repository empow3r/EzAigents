const Redis = require('ioredis');
const EventEmitter = require('events');
const crypto = require('crypto');

class EnhancedRetryRecovery extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      maxRetries: config.maxRetries || 5,
      baseBackoffMs: config.baseBackoffMs || 1000,
      maxBackoffMs: config.maxBackoffMs || 300000, // 5 minutes
      retryTimeoutMs: config.retryTimeoutMs || 600000, // 10 minutes
      circuitBreakerThreshold: config.circuitBreakerThreshold || 10,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 300000, // 5 minutes
      deadLetterQueueTtl: config.deadLetterQueueTtl || 86400, // 24 hours
      retryStrategies: {
        exponential: this.exponentialBackoff.bind(this),
        linear: this.linearBackoff.bind(this),
        immediate: this.immediateRetry.bind(this),
        adaptive: this.adaptiveBackoff.bind(this)
      },
      errorClassification: {
        'rate_limit': { strategy: 'exponential', maxRetries: 10, recoverable: true },
        'timeout': { strategy: 'linear', maxRetries: 5, recoverable: true },
        'connection': { strategy: 'exponential', maxRetries: 7, recoverable: true },
        'parse_error': { strategy: 'immediate', maxRetries: 2, recoverable: false },
        'memory_limit': { strategy: 'adaptive', maxRetries: 3, recoverable: true },
        'authentication': { strategy: 'immediate', maxRetries: 1, recoverable: false },
        'permission': { strategy: 'immediate', maxRetries: 1, recoverable: false },
        'validation': { strategy: 'immediate', maxRetries: 2, recoverable: false },
        'unknown': { strategy: 'exponential', maxRetries: 3, recoverable: true }
      },
      ...config
    };

    this.retryQueues = new Map();
    this.circuitBreakers = new Map();
    this.retryHistory = new Map();
    this.failurePatterns = new Map();
    this.recoveryMetrics = new Map();
    
    this.initializeRetrySystem();
  }

  initializeRetrySystem() {
    // Start retry processing
    this.startRetryProcessor();
    
    // Start circuit breaker monitoring
    this.startCircuitBreakerMonitoring();
    
    // Start cleanup routines
    this.startCleanupRoutines();
    
    // Start pattern analysis
    this.startPatternAnalysis();
    
    console.log('Enhanced Retry Recovery System initialized');
  }

  async scheduleRetry(task, error, attempt = 1) {
    try {
      const taskId = task.id || crypto.randomUUID();
      const errorType = this.classifyError(error);
      const retryConfig = this.config.errorClassification[errorType];
      
      // Check if task is recoverable
      if (!retryConfig.recoverable) {
        return await this.moveToDeadLetterQueue(task, error, 'non_recoverable');
      }
      
      // Check retry limits
      if (attempt > (retryConfig.maxRetries || this.config.maxRetries)) {
        return await this.moveToDeadLetterQueue(task, error, 'max_retries_exceeded');
      }
      
      // Check circuit breaker
      const agentId = task.assignedAgent || task.targetAgent;
      if (this.isCircuitBreakerOpen(agentId, errorType)) {
        return await this.moveToDeadLetterQueue(task, error, 'circuit_breaker_open');
      }
      
      // Calculate retry delay
      const delay = await this.calculateRetryDelay(task, error, attempt, retryConfig);
      
      // Create retry record
      const retryRecord = {
        taskId,
        originalTask: task,
        error: {
          message: error.message,
          type: errorType,
          stack: error.stack,
          timestamp: Date.now()
        },
        attempt,
        maxAttempts: retryConfig.maxRetries,
        strategy: retryConfig.strategy,
        scheduledFor: Date.now() + delay,
        createdAt: Date.now(),
        agentId
      };
      
      // Store retry record
      await this.redis.zadd(
        'retry:scheduled',
        retryRecord.scheduledFor,
        JSON.stringify(retryRecord)
      );
      
      // Update retry history
      await this.updateRetryHistory(taskId, retryRecord);
      
      // Update circuit breaker
      await this.updateCircuitBreaker(agentId, errorType, false);
      
      // Update metrics
      await this.updateRetryMetrics(errorType, 'scheduled');
      
      console.log(`Retry scheduled for task ${taskId}, attempt ${attempt}/${retryConfig.maxRetries}, delay: ${delay}ms`);
      
      this.emit('retryScheduled', retryRecord);
      
      return retryRecord;
      
    } catch (retryError) {
      console.error('Error scheduling retry:', retryError);
      await this.moveToDeadLetterQueue(task, error, 'retry_scheduling_failed');
      throw retryError;
    }
  }

  classifyError(error) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    
    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests') || 
        message.includes('429')) {
      return 'rate_limit';
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out') ||
        message.includes('etimedout')) {
      return 'timeout';
    }
    
    // Connection errors
    if (message.includes('connection') || message.includes('network') ||
        message.includes('econnreset') || message.includes('enotfound')) {
      return 'connection';
    }
    
    // Parse errors
    if (message.includes('parse') || message.includes('json') ||
        message.includes('syntax') || message.includes('unexpected token')) {
      return 'parse_error';
    }
    
    // Memory errors
    if (message.includes('memory') || message.includes('heap') ||
        message.includes('out of memory')) {
      return 'memory_limit';
    }
    
    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized') ||
        message.includes('invalid key') || message.includes('401')) {
      return 'authentication';
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') ||
        message.includes('access denied') || message.includes('403')) {
      return 'permission';
    }
    
    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('bad request') || message.includes('400')) {
      return 'validation';
    }
    
    return 'unknown';
  }

  async calculateRetryDelay(task, error, attempt, retryConfig) {
    const strategy = this.config.retryStrategies[retryConfig.strategy];
    
    if (!strategy) {
      console.warn(`Unknown retry strategy: ${retryConfig.strategy}, using exponential`);
      return this.exponentialBackoff(attempt);
    }
    
    return await strategy(task, error, attempt, retryConfig);
  }

  exponentialBackoff(attempt) {
    const delay = this.config.baseBackoffMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    return Math.min(delay + jitter, this.config.maxBackoffMs);
  }

  linearBackoff(attempt) {
    const delay = this.config.baseBackoffMs * attempt;
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, this.config.maxBackoffMs);
  }

  immediateRetry() {
    return Math.random() * 1000; // Random delay up to 1 second
  }

  async adaptiveBackoff(task, error, attempt) {
    const errorType = this.classifyError(error);
    const agentId = task.assignedAgent || task.targetAgent;
    
    // Get failure patterns for this agent/error type
    const pattern = await this.getFailurePattern(agentId, errorType);
    
    if (pattern && pattern.successRate < 0.5) {
      // High failure rate - use longer delays
      return this.exponentialBackoff(attempt) * 2;
    } else if (pattern && pattern.avgRecoveryTime > 0) {
      // Use historical recovery time
      return Math.min(pattern.avgRecoveryTime * 1.5, this.config.maxBackoffMs);
    }
    
    // Fallback to exponential
    return this.exponentialBackoff(attempt);
  }

  async getFailurePattern(agentId, errorType) {
    const key = `${agentId}:${errorType}`;
    return this.failurePatterns.get(key);
  }

  async updateFailurePattern(agentId, errorType, success, recoveryTime) {
    const key = `${agentId}:${errorType}`;
    let pattern = this.failurePatterns.get(key) || {
      totalAttempts: 0,
      successCount: 0,
      totalRecoveryTime: 0,
      lastUpdated: Date.now()
    };
    
    pattern.totalAttempts++;
    if (success) {
      pattern.successCount++;
      pattern.totalRecoveryTime += recoveryTime;
    }
    
    pattern.successRate = pattern.successCount / pattern.totalAttempts;
    pattern.avgRecoveryTime = pattern.successCount > 0 
      ? pattern.totalRecoveryTime / pattern.successCount 
      : 0;
    pattern.lastUpdated = Date.now();
    
    this.failurePatterns.set(key, pattern);
    
    // Store in Redis for persistence
    await this.redis.hset('recovery:patterns', key, JSON.stringify(pattern));
  }

  isCircuitBreakerOpen(agentId, errorType) {
    const key = `${agentId}:${errorType}`;
    const breaker = this.circuitBreakers.get(key);
    
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      if (Date.now() - breaker.openedAt > this.config.circuitBreakerTimeout) {
        // Try to half-open the circuit
        breaker.state = 'half-open';
        breaker.halfOpenedAt = Date.now();
        return false;
      }
      return true;
    }
    
    return false;
  }

  async updateCircuitBreaker(agentId, errorType, success) {
    const key = `${agentId}:${errorType}`;
    let breaker = this.circuitBreakers.get(key) || {
      state: 'closed',
      failureCount: 0,
      lastFailure: 0,
      openedAt: 0,
      halfOpenedAt: 0
    };
    
    if (success) {
      if (breaker.state === 'half-open') {
        // Recovery successful, close the circuit
        breaker.state = 'closed';
        breaker.failureCount = 0;
        console.log(`Circuit breaker closed for ${key}`);
      } else {
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
        if (breaker.state !== 'open') {
          breaker.state = 'open';
          breaker.openedAt = Date.now();
          console.warn(`Circuit breaker opened for ${key} after ${breaker.failureCount} failures`);
          
          this.emit('circuitBreakerOpened', {
            agentId,
            errorType,
            failureCount: breaker.failureCount
          });
        }
      }
    }
    
    this.circuitBreakers.set(key, breaker);
    await this.redis.hset('circuit:breakers', key, JSON.stringify(breaker));
  }

  async moveToDeadLetterQueue(task, error, reason) {
    const dlqRecord = {
      taskId: task.id || crypto.randomUUID(),
      originalTask: task,
      error: {
        message: error.message,
        type: this.classifyError(error),
        stack: error.stack,
        timestamp: Date.now()
      },
      reason,
      movedAt: Date.now(),
      expiresAt: Date.now() + (this.config.deadLetterQueueTtl * 1000)
    };
    
    // Add to dead letter queue
    await this.redis.zadd(
      'dlq:failed_tasks',
      dlqRecord.expiresAt,
      JSON.stringify(dlqRecord)
    );
    
    // Update metrics
    await this.updateRetryMetrics(dlqRecord.error.type, 'dead_letter');
    
    console.log(`Task ${dlqRecord.taskId} moved to DLQ: ${reason}`);
    
    this.emit('taskMovedToDLQ', dlqRecord);
    
    return dlqRecord;
  }

  async updateRetryHistory(taskId, retryRecord) {
    const historyKey = `retry:history:${taskId}`;
    
    await this.redis.lpush(historyKey, JSON.stringify({
      attempt: retryRecord.attempt,
      errorType: retryRecord.error.type,
      scheduledFor: retryRecord.scheduledFor,
      timestamp: Date.now()
    }));
    
    // Keep only last 10 retry attempts
    await this.redis.ltrim(historyKey, 0, 9);
    
    // Set expiration
    await this.redis.expire(historyKey, this.config.retryTimeoutMs / 1000);
  }

  async updateRetryMetrics(errorType, action) {
    const metricsKey = `metrics:retry:${errorType}`;
    let metrics = this.recoveryMetrics.get(metricsKey) || {
      scheduled: 0,
      successful: 0,
      failed: 0,
      dead_letter: 0,
      total: 0
    };
    
    metrics[action] = (metrics[action] || 0) + 1;
    metrics.total++;
    
    this.recoveryMetrics.set(metricsKey, metrics);
    
    // Store in Redis
    await this.redis.hset('metrics:recovery', metricsKey, JSON.stringify(metrics));
  }

  startRetryProcessor() {
    setInterval(async () => {
      try {
        await this.processRetries();
      } catch (error) {
        console.error('Error processing retries:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  async processRetries() {
    const now = Date.now();
    
    // Get ready retries
    const readyRetries = await this.redis.zrangebyscore(
      'retry:scheduled',
      0,
      now,
      'WITHSCORES'
    );
    
    if (readyRetries.length === 0) return;
    
    console.log(`Processing ${readyRetries.length / 2} ready retries`);
    
    for (let i = 0; i < readyRetries.length; i += 2) {
      const retryData = JSON.parse(readyRetries[i]);
      const score = readyRetries[i + 1];
      
      try {
        // Remove from scheduled queue
        await this.redis.zrem('retry:scheduled', readyRetries[i]);
        
        // Execute retry
        await this.executeRetry(retryData);
        
      } catch (error) {
        console.error('Error executing retry:', error);
        
        // Move to DLQ if retry execution fails
        await this.moveToDeadLetterQueue(
          retryData.originalTask,
          error,
          'retry_execution_failed'
        );
      }
    }
  }

  async executeRetry(retryData) {
    const { taskId, originalTask, attempt, agentId, error } = retryData;
    
    console.log(`Executing retry for task ${taskId}, attempt ${attempt}`);
    
    try {
      // Add back to appropriate queue with retry metadata
      const retryTask = {
        ...originalTask,
        retryMetadata: {
          isRetry: true,
          attempt,
          originalError: error,
          retryStartTime: Date.now()
        }
      };
      
      // Determine target queue based on task priority and agent
      const queueKey = this.determineRetryQueue(retryTask, agentId);
      
      // Add to queue with retry priority boost
      const priority = this.calculateRetryPriority(retryTask, attempt);
      await this.redis.zadd(queueKey, priority, JSON.stringify(retryTask));
      
      // Update metrics
      await this.updateRetryMetrics(error.type, 'executed');
      
      console.log(`Retry task ${taskId} added to queue ${queueKey} with priority ${priority}`);
      
      this.emit('retryExecuted', {
        taskId,
        attempt,
        queueKey,
        priority
      });
      
    } catch (executeError) {
      // If we can't even re-queue, move to DLQ
      await this.moveToDeadLetterQueue(
        originalTask,
        executeError,
        'requeue_failed'
      );
      throw executeError;
    }
  }

  determineRetryQueue(task, agentId) {
    const priority = task.priority || 'normal';
    return `queue:${agentId}:p:${priority}`;
  }

  calculateRetryPriority(task, attempt) {
    // Base priority from task
    let priority = this.getPriorityScore(task.priority || 'normal');
    
    // Boost priority for retries (more attempts = higher priority)
    const retryBoost = attempt * 10;
    priority += retryBoost;
    
    // Add timestamp to ensure FIFO within same priority
    return priority * 1000000 + Date.now();
  }

  getPriorityScore(priority) {
    const scores = {
      'critical': 100,
      'high': 80,
      'normal': 60,
      'low': 40,
      'deferred': 20
    };
    return scores[priority] || 60;
  }

  async recordRetrySuccess(taskId, completionTime) {
    try {
      // Get retry history
      const historyData = await this.redis.lrange(`retry:history:${taskId}`, 0, -1);
      
      if (historyData.length > 0) {
        const latestRetry = JSON.parse(historyData[0]);
        const recoveryTime = Date.now() - latestRetry.scheduledFor;
        
        // Update success metrics
        await this.updateRetryMetrics(latestRetry.errorType, 'successful');
        
        // Update failure patterns
        const task = await this.getTaskInfo(taskId);
        if (task && task.assignedAgent) {
          await this.updateFailurePattern(
            task.assignedAgent,
            latestRetry.errorType,
            true,
            recoveryTime
          );
        }
        
        // Update circuit breaker
        if (task && task.assignedAgent) {
          await this.updateCircuitBreaker(
            task.assignedAgent,
            latestRetry.errorType,
            true
          );
        }
        
        // Clean up retry history
        await this.redis.del(`retry:history:${taskId}`);
        
        console.log(`Retry success recorded for task ${taskId}, recovery time: ${recoveryTime}ms`);
        
        this.emit('retrySuccess', {
          taskId,
          recoveryTime,
          errorType: latestRetry.errorType,
          totalAttempts: latestRetry.attempt
        });
      }
    } catch (error) {
      console.error('Error recording retry success:', error);
    }
  }

  async recordRetryFailure(taskId, error) {
    try {
      const historyData = await this.redis.lrange(`retry:history:${taskId}`, 0, -1);
      
      if (historyData.length > 0) {
        const latestRetry = JSON.parse(historyData[0]);
        
        // Update failure metrics
        await this.updateRetryMetrics(latestRetry.errorType, 'failed');
        
        // Update failure patterns
        const task = await this.getTaskInfo(taskId);
        if (task && task.assignedAgent) {
          await this.updateFailurePattern(
            task.assignedAgent,
            latestRetry.errorType,
            false,
            0
          );
        }
        
        // Update circuit breaker
        if (task && task.assignedAgent) {
          await this.updateCircuitBreaker(
            task.assignedAgent,
            latestRetry.errorType,
            false
          );
        }
        
        console.log(`Retry failure recorded for task ${taskId}`);
        
        this.emit('retryFailure', {
          taskId,
          errorType: latestRetry.errorType,
          totalAttempts: latestRetry.attempt
        });
      }
    } catch (recordError) {
      console.error('Error recording retry failure:', recordError);
    }
  }

  async getTaskInfo(taskId) {
    // This would need to be implemented based on your task storage system
    // For now, return null
    return null;
  }

  startCircuitBreakerMonitoring() {
    setInterval(async () => {
      try {
        await this.monitorCircuitBreakers();
      } catch (error) {
        console.error('Error monitoring circuit breakers:', error);
      }
    }, 60000); // Check every minute
  }

  async monitorCircuitBreakers() {
    for (const [key, breaker] of this.circuitBreakers) {
      if (breaker.state === 'open') {
        const timeOpen = Date.now() - breaker.openedAt;
        
        if (timeOpen > this.config.circuitBreakerTimeout) {
          // Try to half-open
          breaker.state = 'half-open';
          breaker.halfOpenedAt = Date.now();
          
          console.log(`Circuit breaker ${key} moved to half-open state`);
          
          this.emit('circuitBreakerHalfOpen', {
            key,
            timeOpen
          });
        }
      }
    }
  }

  startCleanupRoutines() {
    // Clean up expired retries and DLQ items
    setInterval(async () => {
      try {
        await this.cleanupExpiredItems();
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
    }, 300000); // Every 5 minutes
  }

  async cleanupExpiredItems() {
    const now = Date.now();
    
    // Clean up expired DLQ items
    const expiredDLQ = await this.redis.zremrangebyscore('dlq:failed_tasks', 0, now);
    if (expiredDLQ > 0) {
      console.log(`Cleaned up ${expiredDLQ} expired DLQ items`);
    }
    
    // Clean up old retry history
    const historyKeys = await this.redis.keys('retry:history:*');
    for (const key of historyKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // No TTL set, set one
        await this.redis.expire(key, this.config.retryTimeoutMs / 1000);
      }
    }
    
    // Clean up old circuit breaker data
    const now24hAgo = now - (24 * 60 * 60 * 1000);
    for (const [key, breaker] of this.circuitBreakers) {
      if (breaker.lastFailure < now24hAgo && breaker.state === 'closed' && breaker.failureCount === 0) {
        this.circuitBreakers.delete(key);
        await this.redis.hdel('circuit:breakers', key);
      }
    }
  }

  startPatternAnalysis() {
    setInterval(async () => {
      try {
        await this.analyzeFailurePatterns();
      } catch (error) {
        console.error('Error in pattern analysis:', error);
      }
    }, 600000); // Every 10 minutes
  }

  async analyzeFailurePatterns() {
    const patterns = Array.from(this.failurePatterns.entries());
    
    for (const [key, pattern] of patterns) {
      const [agentId, errorType] = key.split(':');
      
      // Identify agents with consistently high failure rates
      if (pattern.successRate < 0.3 && pattern.totalAttempts > 10) {
        console.warn(`High failure rate detected for ${agentId}:${errorType} (${(pattern.successRate * 100).toFixed(1)}%)`);
        
        this.emit('highFailureRateDetected', {
          agentId,
          errorType,
          successRate: pattern.successRate,
          totalAttempts: pattern.totalAttempts
        });
      }
      
      // Identify patterns with long recovery times
      if (pattern.avgRecoveryTime > 300000 && pattern.successCount > 5) { // 5 minutes
        console.warn(`Long recovery time detected for ${agentId}:${errorType} (${pattern.avgRecoveryTime}ms)`);
        
        this.emit('longRecoveryTimeDetected', {
          agentId,
          errorType,
          avgRecoveryTime: pattern.avgRecoveryTime,
          successCount: pattern.successCount
        });
      }
    }
  }

  async getRetryStats() {
    const stats = {
      retryMetrics: Object.fromEntries(this.recoveryMetrics),
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      failurePatterns: Object.fromEntries(this.failurePatterns),
      queueStats: {
        scheduledRetries: await this.redis.zcard('retry:scheduled'),
        dlqItems: await this.redis.zcard('dlq:failed_tasks')
      },
      summary: {
        totalRetries: 0,
        successRate: 0,
        avgRecoveryTime: 0,
        openCircuitBreakers: 0
      }
    };
    
    // Calculate summary statistics
    let totalRetries = 0;
    let totalSuccessful = 0;
    let totalRecoveryTime = 0;
    let successfulWithTime = 0;
    
    for (const metrics of this.recoveryMetrics.values()) {
      totalRetries += metrics.total || 0;
      totalSuccessful += metrics.successful || 0;
    }
    
    for (const pattern of this.failurePatterns.values()) {
      if (pattern.successCount > 0) {
        totalRecoveryTime += pattern.totalRecoveryTime;
        successfulWithTime += pattern.successCount;
      }
    }
    
    stats.summary.totalRetries = totalRetries;
    stats.summary.successRate = totalRetries > 0 ? totalSuccessful / totalRetries : 0;
    stats.summary.avgRecoveryTime = successfulWithTime > 0 ? totalRecoveryTime / successfulWithTime : 0;
    stats.summary.openCircuitBreakers = Array.from(this.circuitBreakers.values())
      .filter(cb => cb.state === 'open').length;
    
    return stats;
  }

  async forceRetry(taskId) {
    // Force immediate retry of a task in DLQ
    const dlqItems = await this.redis.zrange('dlq:failed_tasks', 0, -1, 'WITHSCORES');
    
    for (let i = 0; i < dlqItems.length; i += 2) {
      const dlqData = JSON.parse(dlqItems[i]);
      
      if (dlqData.taskId === taskId) {
        // Remove from DLQ
        await this.redis.zrem('dlq:failed_tasks', dlqItems[i]);
        
        // Schedule immediate retry
        const retryRecord = {
          taskId: dlqData.taskId,
          originalTask: dlqData.originalTask,
          error: dlqData.error,
          attempt: 1,
          maxAttempts: 3,
          strategy: 'immediate',
          scheduledFor: Date.now(),
          createdAt: Date.now(),
          agentId: dlqData.originalTask.assignedAgent
        };
        
        await this.redis.zadd('retry:scheduled', Date.now(), JSON.stringify(retryRecord));
        
        console.log(`Forced retry scheduled for task ${taskId}`);
        this.emit('retryForced', { taskId });
        
        return true;
      }
    }
    
    return false;
  }

  async shutdown() {
    console.log('Enhanced Retry Recovery shutting down...');
    await this.redis.quit();
    console.log('Enhanced Retry Recovery shutdown complete');
  }
}

module.exports = EnhancedRetryRecovery;