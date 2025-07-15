/**
 * Dead Letter Queue Manager
 * Handles failed tasks with sophisticated retry strategies
 */

const Redis = require('ioredis');
const EventEmitter = require('events');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

class DLQManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(this.redisUrl);
    this.pubClient = new Redis(this.redisUrl);
    
    this.config = {
      maxRetries: config.maxRetries || 5,
      retryDelay: config.retryDelay || 60000, // 1 minute base delay
      exponentialBackoff: config.exponentialBackoff !== false,
      dlqTTL: config.dlqTTL || 604800000, // 7 days
      processInterval: config.processInterval || 30000, // 30 seconds
      batchSize: config.batchSize || 10,
      ...config
    };
    
    this.retryStrategies = new Map();
    this.processing = new Set();
    
    // Logger setup
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'dlq-manager' },
      transports: [
        new winston.transports.File({ filename: 'dlq-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'dlq.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
    
    // Initialize retry strategies
    this.initializeRetryStrategies();
  }

  initializeRetryStrategies() {
    // Rate limit errors - use exponential backoff
    this.retryStrategies.set('rate_limit', {
      shouldRetry: (task) => (task.retries || 0) < 3,
      calculateDelay: (task) => Math.pow(2, task.retries || 0) * 60000, // 1, 2, 4 minutes
      modifyTask: (task) => {
        task.priority = 'low'; // Lower priority to avoid hitting limits again
        return task;
      }
    });
    
    // Timeout errors - retry with extended timeout
    this.retryStrategies.set('timeout', {
      shouldRetry: (task) => (task.retries || 0) < 3,
      calculateDelay: (task) => 30000, // 30 seconds
      modifyTask: (task) => {
        task.timeout = (task.timeout || 1800000) * 1.5; // Increase timeout by 50%
        return task;
      }
    });
    
    // Connection errors - retry quickly
    this.retryStrategies.set('connection', {
      shouldRetry: (task) => (task.retries || 0) < 5,
      calculateDelay: (task) => 5000 * (task.retries || 1), // 5, 10, 15, 20, 25 seconds
      modifyTask: (task) => task
    });
    
    // Parse errors - retry with different model
    this.retryStrategies.set('parse', {
      shouldRetry: (task) => (task.retries || 0) < 2,
      calculateDelay: (task) => 10000,
      modifyTask: (task) => {
        // Try a different model
        const fallbacks = {
          'claude-3-opus': 'gpt-4o',
          'gpt-4o': 'claude-3-opus',
          'deepseek-coder': 'gpt-4o',
          'command-r-plus': 'gemini-pro',
          'gemini-pro': 'command-r-plus'
        };
        
        const currentModel = task.originalQueue?.split(':')[1];
        if (currentModel && fallbacks[currentModel]) {
          task.targetQueue = `queue:${fallbacks[currentModel]}`;
          task.fallbackUsed = true;
        }
        
        return task;
      }
    });
    
    // Memory errors - retry with reduced context
    this.retryStrategies.set('memory', {
      shouldRetry: (task) => (task.retries || 0) < 2,
      calculateDelay: (task) => 15000,
      modifyTask: (task) => {
        task.reduceContext = true;
        task.maxTokens = Math.floor((task.maxTokens || 4096) * 0.5);
        return task;
      }
    });
  }

  async start() {
    this.logger.info('Starting DLQ Manager');
    
    // Start processing DLQs
    this.processingInterval = setInterval(() => {
      this.processDLQs();
    }, this.config.processInterval);
    
    // Subscribe to DLQ events
    await this.subscribeToDLQEvents();
    
    // Clean up old DLQ entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEntries();
    }, 3600000); // Every hour
    
    this.emit('started');
  }

  async processDLQs() {
    const dlqQueues = [
      'dlq:claude-3-opus',
      'dlq:gpt-4o',
      'dlq:deepseek-coder',
      'dlq:command-r-plus',
      'dlq:gemini-pro'
    ];
    
    for (const dlq of dlqQueues) {
      try {
        await this.processDLQ(dlq);
      } catch (error) {
        this.logger.error('Error processing DLQ', { dlq, error });
      }
    }
  }

  async processDLQ(dlqName) {
    // Get batch of tasks from DLQ
    const tasks = await this.redis.lrange(dlqName, 0, this.config.batchSize - 1);
    
    for (const taskStr of tasks) {
      // Skip if already processing
      const taskHash = this.hashTask(taskStr);
      if (this.processing.has(taskHash)) {
        continue;
      }
      
      this.processing.add(taskHash);
      
      try {
        const task = JSON.parse(taskStr);
        
        // Analyze task failure
        const analysis = await this.analyzeFailure(task);
        
        if (analysis.canRetry) {
          await this.retryTask(dlqName, task, taskStr, analysis);
        } else if (analysis.canArchive) {
          await this.archiveTask(dlqName, task, taskStr, analysis.reason);
        } else {
          // Task cannot be retried or archived, move to permanent failure
          await this.permanentFailure(dlqName, task, taskStr, analysis.reason);
        }
        
      } catch (error) {
        this.logger.error('Error processing DLQ task', { error });
      } finally {
        this.processing.delete(taskHash);
      }
    }
  }

  async analyzeFailure(task) {
    const analysis = {
      canRetry: false,
      canArchive: false,
      strategy: null,
      reason: null
    };
    
    // Check if task is too old
    if (task.failedAt && Date.now() - task.failedAt > this.config.dlqTTL) {
      analysis.canArchive = true;
      analysis.reason = 'expired';
      return analysis;
    }
    
    // Check retry count
    if ((task.retries || 0) >= this.config.maxRetries) {
      analysis.canArchive = true;
      analysis.reason = 'max_retries_exceeded';
      return analysis;
    }
    
    // Categorize error and get retry strategy
    const errorType = this.categorizeError(task.error || task.reason || '');
    const strategy = this.retryStrategies.get(errorType);
    
    if (strategy && strategy.shouldRetry(task)) {
      analysis.canRetry = true;
      analysis.strategy = strategy;
      analysis.errorType = errorType;
    } else {
      // Check for special cases
      if (this.isTemporaryError(task.error)) {
        analysis.canRetry = true;
        analysis.strategy = {
          calculateDelay: () => this.config.retryDelay,
          modifyTask: (t) => t
        };
      } else {
        analysis.canArchive = true;
        analysis.reason = 'non_retryable_error';
      }
    }
    
    return analysis;
  }

  async retryTask(dlqName, task, taskStr, analysis) {
    try {
      // Remove from DLQ
      await this.redis.lrem(dlqName, 1, taskStr);
      
      // Modify task based on strategy
      const modifiedTask = analysis.strategy.modifyTask({ ...task });
      
      // Update retry metadata
      modifiedTask.retries = (modifiedTask.retries || 0) + 1;
      modifiedTask.lastRetryAt = Date.now();
      modifiedTask.retryStrategy = analysis.errorType;
      modifiedTask.dlqProcessed = true;
      
      // Clear error for retry
      delete modifiedTask.error;
      delete modifiedTask.failedAt;
      delete modifiedTask.failedBy;
      
      // Calculate delay
      const delay = analysis.strategy.calculateDelay(modifiedTask);
      
      // Determine target queue
      const targetQueue = modifiedTask.targetQueue || modifiedTask.originalQueue || dlqName.replace('dlq:', 'queue:');
      
      // Schedule retry
      if (delay > 0) {
        setTimeout(async () => {
          await this.redis.rpush(targetQueue, JSON.stringify(modifiedTask));
          
          this.logger.info('Task retried from DLQ', {
            taskId: modifiedTask.id,
            targetQueue,
            delay,
            retries: modifiedTask.retries,
            strategy: analysis.errorType
          });
          
          // Emit retry event
          this.emit('task_retried', {
            task: modifiedTask,
            dlq: dlqName,
            targetQueue,
            strategy: analysis.errorType
          });
        }, delay);
      } else {
        // Immediate retry
        await this.redis.rpush(targetQueue, JSON.stringify(modifiedTask));
      }
      
      // Log retry
      await this.logDLQAction(dlqName, 'retry', {
        taskId: modifiedTask.id,
        targetQueue,
        delay,
        strategy: analysis.errorType
      });
      
    } catch (error) {
      this.logger.error('Error retrying task', { taskId: task.id, error });
      
      // Put back in DLQ if retry fails
      await this.redis.rpush(dlqName, taskStr);
    }
  }

  async archiveTask(dlqName, task, taskStr, reason) {
    try {
      // Remove from DLQ
      await this.redis.lrem(dlqName, 1, taskStr);
      
      // Archive task
      const archiveKey = `archive:${dlqName}:${new Date().toISOString().split('T')[0]}`;
      
      await this.redis.zadd(archiveKey, Date.now(), JSON.stringify({
        ...task,
        archivedAt: Date.now(),
        archiveReason: reason
      }));
      
      // Set TTL on archive (30 days)
      await this.redis.expire(archiveKey, 2592000);
      
      this.logger.info('Task archived', {
        taskId: task.id,
        dlq: dlqName,
        reason
      });
      
      // Log archive action
      await this.logDLQAction(dlqName, 'archive', {
        taskId: task.id,
        reason
      });
      
    } catch (error) {
      this.logger.error('Error archiving task', { taskId: task.id, error });
    }
  }

  async permanentFailure(dlqName, task, taskStr, reason) {
    try {
      // Remove from DLQ
      await this.redis.lrem(dlqName, 1, taskStr);
      
      // Store in permanent failures
      const failureKey = 'permanent_failures';
      
      await this.redis.zadd(failureKey, Date.now(), JSON.stringify({
        ...task,
        permanentFailureAt: Date.now(),
        failureReason: reason,
        dlq: dlqName
      }));
      
      // Alert about permanent failure
      await this.pubClient.publish('alert:permanent_failure', JSON.stringify({
        taskId: task.id,
        dlq: dlqName,
        reason,
        task: task
      }));
      
      this.logger.error('Task permanently failed', {
        taskId: task.id,
        dlq: dlqName,
        reason
      });
      
      // Log permanent failure
      await this.logDLQAction(dlqName, 'permanent_failure', {
        taskId: task.id,
        reason
      });
      
    } catch (error) {
      this.logger.error('Error handling permanent failure', { taskId: task.id, error });
    }
  }

  categorizeError(error) {
    const errorStr = String(error).toLowerCase();
    
    if (errorStr.includes('rate') && errorStr.includes('limit')) return 'rate_limit';
    if (errorStr.includes('timeout')) return 'timeout';
    if (errorStr.includes('connection') || errorStr.includes('econnrefused')) return 'connection';
    if (errorStr.includes('parse') || errorStr.includes('json')) return 'parse';
    if (errorStr.includes('memory') || errorStr.includes('heap')) return 'memory';
    
    return 'unknown';
  }

  isTemporaryError(error) {
    const temporaryPatterns = [
      /temporary/i,
      /try.*again/i,
      /unavailable/i,
      /busy/i,
      /concurrent/i
    ];
    
    const errorStr = String(error);
    return temporaryPatterns.some(pattern => pattern.test(errorStr));
  }

  hashTask(taskStr) {
    // Simple hash to identify unique tasks
    let hash = 0;
    for (let i = 0; i < taskStr.length; i++) {
      const char = taskStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  async subscribeToDLQEvents() {
    const sub = new Redis(this.redisUrl);
    
    // Subscribe to manual DLQ operations
    await sub.subscribe('dlq:retry', async (message) => {
      const { dlq, taskId } = JSON.parse(message);
      await this.manualRetry(dlq, taskId);
    });
    
    await sub.subscribe('dlq:archive', async (message) => {
      const { dlq, taskId } = JSON.parse(message);
      await this.manualArchive(dlq, taskId);
    });
    
    await sub.subscribe('dlq:clear', async (message) => {
      const { dlq } = JSON.parse(message);
      await this.clearDLQ(dlq);
    });
  }

  async manualRetry(dlq, taskId) {
    const tasks = await this.redis.lrange(dlq, 0, -1);
    
    for (const taskStr of tasks) {
      try {
        const task = JSON.parse(taskStr);
        if (task.id === taskId) {
          const analysis = await this.analyzeFailure(task);
          analysis.canRetry = true; // Force retry
          
          await this.retryTask(dlq, task, taskStr, analysis);
          break;
        }
      } catch (error) {
        this.logger.error('Error in manual retry', { taskId, error });
      }
    }
  }

  async manualArchive(dlq, taskId) {
    const tasks = await this.redis.lrange(dlq, 0, -1);
    
    for (const taskStr of tasks) {
      try {
        const task = JSON.parse(taskStr);
        if (task.id === taskId) {
          await this.archiveTask(dlq, task, taskStr, 'manual_archive');
          break;
        }
      } catch (error) {
        this.logger.error('Error in manual archive', { taskId, error });
      }
    }
  }

  async clearDLQ(dlq) {
    const count = await this.redis.llen(dlq);
    
    if (count > 0) {
      // Archive all tasks before clearing
      const tasks = await this.redis.lrange(dlq, 0, -1);
      
      for (const taskStr of tasks) {
        try {
          const task = JSON.parse(taskStr);
          await this.archiveTask(dlq, task, taskStr, 'dlq_cleared');
        } catch (error) {
          this.logger.error('Error archiving task during clear', error);
        }
      }
      
      // Clear the DLQ
      await this.redis.del(dlq);
      
      this.logger.info('DLQ cleared', { dlq, count });
    }
  }

  async cleanupOldEntries() {
    try {
      // Clean up old archives
      const archivePattern = 'archive:dlq:*';
      const archives = await this.redis.keys(archivePattern);
      
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      for (const archive of archives) {
        // Parse date from key
        const dateStr = archive.split(':').pop();
        const archiveDate = new Date(dateStr).getTime();
        
        if (archiveDate < thirtyDaysAgo) {
          await this.redis.del(archive);
          this.logger.info('Deleted old archive', { archive });
        }
      }
      
      // Clean up old permanent failures (keep last 1000)
      await this.redis.zremrangebyrank('permanent_failures', 0, -1001);
      
    } catch (error) {
      this.logger.error('Error cleaning up old entries', error);
    }
  }

  async logDLQAction(dlq, action, metadata) {
    const logKey = `dlq:log:${dlq}`;
    
    await this.redis.zadd(logKey, Date.now(), JSON.stringify({
      action,
      timestamp: new Date().toISOString(),
      ...metadata
    }));
    
    // Keep only last 1000 log entries
    await this.redis.zremrangebyrank(logKey, 0, -1001);
  }

  async getStats() {
    const stats = {
      timestamp: Date.now(),
      dlqs: {}
    };
    
    const dlqQueues = [
      'dlq:claude-3-opus',
      'dlq:gpt-4o',
      'dlq:deepseek-coder',
      'dlq:command-r-plus',
      'dlq:gemini-pro'
    ];
    
    for (const dlq of dlqQueues) {
      const depth = await this.redis.llen(dlq);
      const logKey = `dlq:log:${dlq}`;
      
      // Get recent actions
      const recentLogs = await this.redis.zrevrange(logKey, 0, 9, 'WITHSCORES');
      const actions = {
        retry: 0,
        archive: 0,
        permanent_failure: 0
      };
      
      for (let i = 0; i < recentLogs.length; i += 2) {
        try {
          const log = JSON.parse(recentLogs[i]);
          if (actions[log.action] !== undefined) {
            actions[log.action]++;
          }
        } catch (e) {
          // Skip invalid logs
        }
      }
      
      stats.dlqs[dlq] = {
        depth,
        recentActions: actions
      };
    }
    
    return stats;
  }

  async stop() {
    this.logger.info('Stopping DLQ Manager');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    await this.redis.disconnect();
    await this.pubClient.disconnect();
    
    this.emit('stopped');
  }
}

module.exports = DLQManager;

// Start if run directly
if (require.main === module) {
  const manager = new DLQManager();
  
  manager.start().catch(error => {
    console.error('Failed to start DLQ manager:', error);
    process.exit(1);
  });
  
  process.on('SIGINT', async () => {
    await manager.stop();
    process.exit(0);
  });
}