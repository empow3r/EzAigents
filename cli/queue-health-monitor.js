/**
 * Queue Health Monitor Service
 * Monitors queue health, detects issues, and performs auto-correction
 */

const Redis = require('ioredis');
const EventEmitter = require('events');
const winston = require('winston');

class QueueHealthMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(this.redisUrl);
    this.pubClient = new Redis(this.redisUrl);
    
    this.config = {
      checkInterval: config.checkInterval || 5000,
      unhealthyThresholds: {
        queueDepth: 100,
        processingTime: 3600000, // 1 hour
        failureRate: 0.2, // 20%
        stuckTasks: 10,
        memoryUsage: 0.8 // 80%
      },
      autoCorrect: config.autoCorrect !== false,
      ...config
    };
    
    this.queues = new Map();
    this.healthHistory = new Map();
    this.correctionHistory = [];
    
    // Logger setup
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'queue-health-monitor' },
      transports: [
        new winston.transports.File({ filename: 'queue-health-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'queue-health.log' }),
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
    this.logger.info('Starting Queue Health Monitor');
    
    // Initialize queue tracking
    await this.initializeQueues();
    
    // Start monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
    
    // Subscribe to health events
    await this.subscribeToHealthEvents();
    
    this.emit('started');
  }

  async initializeQueues() {
    const queueNames = [
      'queue:claude-3-opus',
      'queue:gpt-4o',
      'queue:deepseek-coder',
      'queue:command-r-plus',
      'queue:gemini-pro'
    ];
    
    for (const queueName of queueNames) {
      this.queues.set(queueName, {
        name: queueName,
        status: 'healthy',
        metrics: {
          depth: 0,
          processingCount: 0,
          failureCount: 0,
          completedCount: 0,
          avgProcessingTime: 0,
          lastCheck: Date.now()
        },
        issues: []
      });
      
      // Initialize health history
      this.healthHistory.set(queueName, []);
    }
  }

  async performHealthCheck() {
    try {
      for (const [queueName, queueData] of this.queues) {
        const health = await this.checkQueueHealth(queueName);
        
        // Update queue data
        queueData.metrics = health.metrics;
        queueData.status = health.status;
        queueData.issues = health.issues;
        
        // Store history
        this.addToHistory(queueName, health);
        
        // Handle unhealthy queues
        if (health.status !== 'healthy' && this.config.autoCorrect) {
          await this.performAutoCorrection(queueName, health);
        }
        
        // Emit health update
        this.emit('health_update', {
          queue: queueName,
          health: health
        });
      }
      
      // Check overall system health
      await this.checkSystemHealth();
      
    } catch (error) {
      this.logger.error('Health check error', error);
    }
  }

  async checkQueueHealth(queueName) {
    const health = {
      queue: queueName,
      timestamp: Date.now(),
      status: 'healthy',
      metrics: {},
      issues: []
    };
    
    try {
      // Get queue metrics
      const [depth, dlqDepth] = await Promise.all([
        this.redis.llen(queueName),
        this.redis.llen(queueName.replace('queue:', 'dlq:'))
      ]);
      
      const processingKey = `processing:${queueName}`;
      const processing = await this.redis.hgetall(processingKey);
      const processingCount = Object.keys(processing).length;
      
      // Calculate processing times
      const now = Date.now();
      const processingTimes = [];
      const stuckTasks = [];
      
      for (const [taskId, taskData] of Object.entries(processing)) {
        try {
          const task = JSON.parse(taskData);
          const processingTime = now - task.startTime;
          processingTimes.push(processingTime);
          
          if (processingTime > this.config.unhealthyThresholds.processingTime) {
            stuckTasks.push({ taskId, duration: processingTime });
          }
        } catch (e) {
          this.logger.error('Error parsing task data', { taskId, error: e });
        }
      }
      
      const avgProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;
      
      // Get failure metrics
      const recentFailures = await this.getRecentFailures(queueName);
      const recentCompletions = await this.getRecentCompletions(queueName);
      const totalRecent = recentFailures + recentCompletions;
      const failureRate = totalRecent > 0 ? recentFailures / totalRecent : 0;
      
      // Update metrics
      health.metrics = {
        depth,
        dlqDepth,
        processingCount,
        stuckTasks: stuckTasks.length,
        avgProcessingTime,
        failureRate,
        recentFailures,
        recentCompletions,
        lastCheck: now
      };
      
      // Check thresholds
      if (depth > this.config.unhealthyThresholds.queueDepth) {
        health.issues.push({
          type: 'high_queue_depth',
          severity: 'warning',
          value: depth,
          threshold: this.config.unhealthyThresholds.queueDepth
        });
      }
      
      if (stuckTasks.length > this.config.unhealthyThresholds.stuckTasks) {
        health.issues.push({
          type: 'stuck_tasks',
          severity: 'critical',
          value: stuckTasks.length,
          tasks: stuckTasks
        });
      }
      
      if (failureRate > this.config.unhealthyThresholds.failureRate) {
        health.issues.push({
          type: 'high_failure_rate',
          severity: 'warning',
          value: failureRate,
          threshold: this.config.unhealthyThresholds.failureRate
        });
      }
      
      if (dlqDepth > 50) {
        health.issues.push({
          type: 'high_dlq_depth',
          severity: 'warning',
          value: dlqDepth
        });
      }
      
      // Determine overall status
      if (health.issues.some(i => i.severity === 'critical')) {
        health.status = 'critical';
      } else if (health.issues.length > 0) {
        health.status = 'warning';
      }
      
    } catch (error) {
      this.logger.error('Queue health check error', { queue: queueName, error });
      health.status = 'error';
      health.issues.push({
        type: 'health_check_error',
        severity: 'critical',
        error: error.message
      });
    }
    
    return health;
  }

  async performAutoCorrection(queueName, health) {
    this.logger.info('Performing auto-correction', { queue: queueName, issues: health.issues });
    
    const corrections = [];
    
    for (const issue of health.issues) {
      try {
        switch (issue.type) {
          case 'stuck_tasks':
            const stuckCorrection = await this.correctStuckTasks(queueName, issue.tasks);
            corrections.push(stuckCorrection);
            break;
            
          case 'high_queue_depth':
            const depthCorrection = await this.correctHighQueueDepth(queueName, health.metrics);
            corrections.push(depthCorrection);
            break;
            
          case 'high_failure_rate':
            const failureCorrection = await this.correctHighFailureRate(queueName, health.metrics);
            corrections.push(failureCorrection);
            break;
            
          case 'high_dlq_depth':
            const dlqCorrection = await this.correctHighDLQDepth(queueName, health.metrics);
            corrections.push(dlqCorrection);
            break;
        }
      } catch (error) {
        this.logger.error('Auto-correction error', { queue: queueName, issue: issue.type, error });
      }
    }
    
    // Log corrections
    if (corrections.length > 0) {
      this.correctionHistory.push({
        timestamp: Date.now(),
        queue: queueName,
        corrections: corrections
      });
      
      // Keep only last 1000 corrections
      if (this.correctionHistory.length > 1000) {
        this.correctionHistory = this.correctionHistory.slice(-1000);
      }
      
      // Notify orchestrator
      await this.pubClient.publish('health:correction', JSON.stringify({
        queue: queueName,
        corrections: corrections,
        timestamp: Date.now()
      }));
    }
  }

  async correctStuckTasks(queueName, stuckTasks) {
    const correction = {
      type: 'stuck_tasks',
      actions: []
    };
    
    const processingKey = `processing:${queueName}`;
    
    for (const stuck of stuckTasks) {
      try {
        // Get task data
        const taskData = await this.redis.hget(processingKey, stuck.taskId);
        if (!taskData) continue;
        
        const task = JSON.parse(taskData);
        
        // Remove from processing
        await this.redis.hdel(processingKey, stuck.taskId);
        
        // Re-queue with increased priority
        task.priority = 'high';
        task.previouslyStuck = true;
        task.stuckDuration = stuck.duration;
        
        await this.redis.lpush(queueName, JSON.stringify(task));
        
        correction.actions.push({
          action: 'requeued_stuck_task',
          taskId: stuck.taskId,
          duration: stuck.duration
        });
        
        this.logger.info('Requeued stuck task', { taskId: stuck.taskId, duration: stuck.duration });
        
      } catch (error) {
        this.logger.error('Error correcting stuck task', { taskId: stuck.taskId, error });
      }
    }
    
    return correction;
  }

  async correctHighQueueDepth(queueName, metrics) {
    const correction = {
      type: 'high_queue_depth',
      actions: []
    };
    
    // Request more agents
    await this.pubClient.publish('orchestrator:command', JSON.stringify({
      type: 'scale_up',
      queue: queueName,
      reason: 'high_queue_depth',
      currentDepth: metrics.depth
    }));
    
    correction.actions.push({
      action: 'requested_scale_up',
      currentDepth: metrics.depth
    });
    
    // Redistribute tasks if possible
    const otherQueues = await this.findAvailableQueues(queueName);
    if (otherQueues.length > 0) {
      const redistributed = await this.redistributeTasks(queueName, otherQueues, 10);
      correction.actions.push({
        action: 'redistributed_tasks',
        count: redistributed,
        targetQueues: otherQueues.map(q => q.name)
      });
    }
    
    return correction;
  }

  async correctHighFailureRate(queueName, metrics) {
    const correction = {
      type: 'high_failure_rate',
      actions: []
    };
    
    // Analyze recent failures
    const failures = await this.analyzeRecentFailures(queueName);
    
    // If most failures are from specific agents, notify orchestrator
    if (failures.problematicAgents.length > 0) {
      await this.pubClient.publish('orchestrator:command', JSON.stringify({
        type: 'agent_health_check',
        agents: failures.problematicAgents,
        reason: 'high_failure_rate'
      }));
      
      correction.actions.push({
        action: 'flagged_problematic_agents',
        agents: failures.problematicAgents
      });
    }
    
    // If failures are due to specific error types, adjust retry strategy
    if (failures.commonErrors.length > 0) {
      correction.actions.push({
        action: 'identified_common_errors',
        errors: failures.commonErrors
      });
    }
    
    return correction;
  }

  async correctHighDLQDepth(queueName, metrics) {
    const correction = {
      type: 'high_dlq_depth',
      actions: []
    };
    
    const dlqName = queueName.replace('queue:', 'dlq:');
    
    // Analyze DLQ tasks
    const dlqTasks = await this.redis.lrange(dlqName, 0, 9);
    let retriableCount = 0;
    
    for (const taskStr of dlqTasks) {
      try {
        const task = JSON.parse(taskStr);
        
        // Check if task can be retried
        if (this.canRetryDLQTask(task)) {
          // Move back to main queue
          await this.redis.lrem(dlqName, 1, taskStr);
          
          // Reset retry count and add retry metadata
          task.retriedFromDLQ = true;
          task.dlqRetryAt = Date.now();
          delete task.error;
          
          await this.redis.rpush(queueName, JSON.stringify(task));
          retriableCount++;
        }
      } catch (error) {
        this.logger.error('Error processing DLQ task', error);
      }
    }
    
    correction.actions.push({
      action: 'retried_dlq_tasks',
      count: retriableCount,
      totalDLQ: metrics.dlqDepth
    });
    
    return correction;
  }

  async checkSystemHealth() {
    try {
      // Get Redis memory info
      const info = await this.redis.info('memory');
      const memoryUsage = this.parseRedisMemoryUsage(info);
      
      if (memoryUsage > this.config.unhealthyThresholds.memoryUsage) {
        this.logger.warn('High Redis memory usage', { usage: memoryUsage });
        
        // Trigger memory optimization
        await this.optimizeMemory();
      }
      
      // Check connection count
      const clients = await this.redis.client('LIST');
      const connectionCount = clients.split('\n').length - 1;
      
      if (connectionCount > 100) {
        this.logger.warn('High connection count', { count: connectionCount });
      }
      
      // Emit system health
      this.emit('system_health', {
        memoryUsage,
        connectionCount,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.logger.error('System health check error', error);
    }
  }

  async optimizeMemory() {
    // Clean up old transaction logs
    const queues = Array.from(this.queues.keys());
    
    for (const queue of queues) {
      const txlogKey = `txlog:${queue}`;
      // Keep only last 1000 entries
      await this.redis.zremrangebyrank(txlogKey, 0, -1001);
    }
    
    // Clean up old completed tasks
    await this.redis.del('completed:tasks:old');
    
    this.logger.info('Memory optimization completed');
  }

  // Helper methods
  async getRecentFailures(queueName) {
    const failures = await this.redis.lrange('queue:failures', 0, -1);
    const recent = failures.filter(f => {
      try {
        const failure = JSON.parse(f);
        return failure.model === queueName.split(':')[1] &&
               Date.now() - new Date(failure.timestamp).getTime() < 3600000; // Last hour
      } catch (e) {
        return false;
      }
    });
    
    return recent.length;
  }

  async getRecentCompletions(queueName) {
    const txlogKey = `txlog:${queueName}`;
    const logs = await this.redis.zrangebyscore(
      txlogKey, 
      Date.now() - 3600000, 
      Date.now()
    );
    
    return logs.filter(log => {
      try {
        const entry = JSON.parse(log);
        return entry.event === 'task_completed';
      } catch (e) {
        return false;
      }
    }).length;
  }

  async findAvailableQueues(excludeQueue) {
    const available = [];
    
    for (const [queueName, queueData] of this.queues) {
      if (queueName !== excludeQueue && 
          queueData.status === 'healthy' &&
          queueData.metrics.depth < 20) {
        available.push(queueData);
      }
    }
    
    return available;
  }

  async redistributeTasks(sourceQueue, targetQueues, count) {
    let redistributed = 0;
    
    for (let i = 0; i < count && targetQueues.length > 0; i++) {
      const task = await this.redis.rpop(sourceQueue);
      if (!task) break;
      
      // Round-robin distribution
      const targetQueue = targetQueues[i % targetQueues.length];
      await this.redis.lpush(targetQueue.name, task);
      redistributed++;
    }
    
    return redistributed;
  }

  async analyzeRecentFailures(queueName) {
    const failures = await this.redis.lrange('queue:failures', 0, 99);
    const analysis = {
      problematicAgents: [],
      commonErrors: []
    };
    
    const agentFailures = {};
    const errorTypes = {};
    
    for (const failureStr of failures) {
      try {
        const failure = JSON.parse(failureStr);
        
        if (failure.model === queueName.split(':')[1]) {
          // Track agent failures
          if (failure.agent_id) {
            agentFailures[failure.agent_id] = (agentFailures[failure.agent_id] || 0) + 1;
          }
          
          // Track error types
          if (failure.error) {
            const errorType = this.categorizeError(failure.error);
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
    
    // Find problematic agents (>5 failures)
    for (const [agent, count] of Object.entries(agentFailures)) {
      if (count > 5) {
        analysis.problematicAgents.push({ agent, failureCount: count });
      }
    }
    
    // Find common errors
    for (const [error, count] of Object.entries(errorTypes)) {
      if (count > 3) {
        analysis.commonErrors.push({ error, count });
      }
    }
    
    return analysis;
  }

  categorizeError(error) {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('rate_limit')) return 'rate_limit';
    if (error.includes('connection')) return 'connection';
    if (error.includes('memory')) return 'memory';
    if (error.includes('parse')) return 'parse';
    return 'unknown';
  }

  canRetryDLQTask(task) {
    // Don't retry if failed too many times
    if ((task.retries || 0) >= 5) return false;
    
    // Don't retry if recently failed
    if (task.failedAt && Date.now() - task.failedAt < 300000) return false; // 5 minutes
    
    // Don't retry certain error types
    const permanentErrors = ['invalid_format', 'unauthorized', 'not_found'];
    if (task.reason && permanentErrors.some(e => task.reason.includes(e))) return false;
    
    return true;
  }

  parseRedisMemoryUsage(info) {
    const lines = info.split('\r\n');
    let used = 0;
    let total = 0;
    
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        used = parseInt(line.split(':')[1]);
      }
      if (line.startsWith('maxmemory:')) {
        total = parseInt(line.split(':')[1]);
      }
    }
    
    if (total === 0) return 0;
    return used / total;
  }

  addToHistory(queueName, health) {
    const history = this.healthHistory.get(queueName);
    history.push({
      timestamp: health.timestamp,
      status: health.status,
      metrics: health.metrics
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }

  async subscribeToHealthEvents() {
    // Subscribe to health-related events
    const sub = new Redis(this.redisUrl);
    
    await sub.subscribe('health:query', async (message) => {
      const query = JSON.parse(message);
      await this.handleHealthQuery(query);
    });
  }

  async handleHealthQuery(query) {
    const response = {
      queryId: query.id,
      timestamp: Date.now(),
      queues: {}
    };
    
    for (const [queueName, queueData] of this.queues) {
      response.queues[queueName] = {
        status: queueData.status,
        metrics: queueData.metrics,
        issues: queueData.issues,
        history: this.healthHistory.get(queueName).slice(-10)
      };
    }
    
    await this.pubClient.publish('health:response', JSON.stringify(response));
  }

  async stop() {
    this.logger.info('Stopping Queue Health Monitor');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    await this.redis.disconnect();
    await this.pubClient.disconnect();
    
    this.emit('stopped');
  }
}

module.exports = QueueHealthMonitor;

// Start if run directly
if (require.main === module) {
  const monitor = new QueueHealthMonitor();
  
  monitor.start().catch(error => {
    console.error('Failed to start health monitor:', error);
    process.exit(1);
  });
  
  process.on('SIGINT', async () => {
    await monitor.stop();
    process.exit(0);
  });
}