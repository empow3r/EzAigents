const Redis = require('ioredis');
const EventEmitter = require('events');
const os = require('os');

class PerformanceMetricsMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      metricsInterval: config.metricsInterval || 30000, // 30 seconds
      retentionPeriod: config.retentionPeriod || 86400000, // 24 hours
      aggregationIntervals: config.aggregationIntervals || [
        { name: '1min', duration: 60000, samples: 60 },
        { name: '5min', duration: 300000, samples: 288 },
        { name: '1hour', duration: 3600000, samples: 168 },
        { name: '1day', duration: 86400000, samples: 30 }
      ],
      alertThresholds: {
        avgResponseTime: 10000, // 10 seconds
        errorRate: 0.05, // 5%
        throughput: 0.1, // tasks per second
        memoryUsage: 0.85, // 85%
        cpuUsage: 0.8, // 80%
        queueBacklog: 1000,
        agentUtilization: 0.9 // 90%
      },
      ...config
    };

    this.metrics = new Map();
    this.aggregatedMetrics = new Map();
    this.alerts = new Map();
    this.isMonitoring = false;
    
    this.initializeMetrics();
  }

  initializeMetrics() {
    // Initialize metric collectors
    this.metricCollectors = {
      system: this.collectSystemMetrics.bind(this),
      agents: this.collectAgentMetrics.bind(this),
      queues: this.collectQueueMetrics.bind(this),
      tasks: this.collectTaskMetrics.bind(this),
      network: this.collectNetworkMetrics.bind(this),
      errors: this.collectErrorMetrics.bind(this)
    };

    // Initialize aggregation buckets
    for (const interval of this.config.aggregationIntervals) {
      this.aggregatedMetrics.set(interval.name, new Map());
    }
  }

  async start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Performance Metrics Monitor started');
    
    // Start metric collection
    this.metricsTimer = setInterval(() => {
      this.collectAllMetrics().catch(console.error);
    }, this.config.metricsInterval);
    
    // Start aggregation
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics().catch(console.error);
    }, 60000); // Every minute
    
    // Start cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics().catch(console.error);
    }, 3600000); // Every hour
    
    // Start alert checking
    this.alertTimer = setInterval(() => {
      this.checkAlerts().catch(console.error);
    }, this.config.metricsInterval);
    
    // Initial collection
    await this.collectAllMetrics();
  }

  async stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.aggregationTimer) clearInterval(this.aggregationTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.alertTimer) clearInterval(this.alertTimer);
    
    console.log('Performance Metrics Monitor stopped');
  }

  async collectAllMetrics() {
    const timestamp = Date.now();
    const collectedMetrics = {};
    
    try {
      // Collect metrics from all sources
      for (const [name, collector] of Object.entries(this.metricCollectors)) {
        try {
          collectedMetrics[name] = await collector();
        } catch (error) {
          console.error(`Error collecting ${name} metrics:`, error);
          collectedMetrics[name] = { error: error.message };
        }
      }
      
      // Store raw metrics
      const metricsEntry = {
        timestamp,
        ...collectedMetrics
      };
      
      await this.storeRawMetrics(metricsEntry);
      
      // Update in-memory cache
      this.metrics.set(timestamp, metricsEntry);
      
      // Emit metrics event
      this.emit('metricsCollected', metricsEntry);
      
    } catch (error) {
      console.error('Error in metrics collection:', error);
    }
  }

  async collectSystemMetrics() {
    const cpus = os.cpus();
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const loadAvg = os.loadavg();
    
    return {
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'unknown',
        usage: await this.getCpuUsage(),
        loadAverage: {
          '1min': loadAvg[0],
          '5min': loadAvg[1],
          '15min': loadAvg[2]
        }
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        usagePercentage: (totalMemory - freeMemory) / totalMemory
      },
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname()
    };
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const totalCpuTime = endUsage.user + endUsage.system;
        const cpuPercent = totalCpuTime / totalTime;
        
        resolve(Math.min(cpuPercent, 1));
      }, 100);
    });
  }

  async collectAgentMetrics() {
    try {
      const agentKeys = await this.redis.keys('agent:*');
      const agents = {};
      let totalAgents = 0;
      let activeAgents = 0;
      let busyAgents = 0;
      
      for (const key of agentKeys) {
        if (key.includes(':')) continue; // Skip sub-keys
        
        const agentData = await this.redis.hgetall(key);
        if (!agentData.id) continue;
        
        const agentId = agentData.id;
        totalAgents++;
        
        // Get agent status
        const status = agentData.status || 'unknown';
        if (status === 'active' || status === 'working') {
          activeAgents++;
        }
        if (status === 'working' || status === 'busy') {
          busyAgents++;
        }
        
        // Get agent metrics
        const metricsData = await this.redis.hgetall(`agent:metrics:${agentId}`);
        const healthData = await this.redis.hgetall(`agent:${agentId}`);
        
        agents[agentId] = {
          status,
          lastHeartbeat: agentData.last_heartbeat,
          capabilities: JSON.parse(agentData.capabilities || '[]'),
          metrics: metricsData,
          health: healthData,
          uptime: this.calculateUptime(agentData.registered_at)
        };
      }
      
      return {
        total: totalAgents,
        active: activeAgents,
        busy: busyAgents,
        idle: activeAgents - busyAgents,
        utilization: totalAgents > 0 ? busyAgents / totalAgents : 0,
        agents
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectQueueMetrics() {
    try {
      const queueKeys = await this.redis.keys('queue:*');
      const queues = {};
      let totalTasks = 0;
      let totalBacklog = 0;
      
      for (const queueKey of queueKeys) {
        const queueSize = await this.redis.zcard(queueKey);
        const oldestTask = await this.redis.zrange(queueKey, 0, 0, 'WITHSCORES');
        
        let waitTime = 0;
        if (oldestTask.length > 0) {
          waitTime = Date.now() - parseFloat(oldestTask[1]);
        }
        
        queues[queueKey] = {
          size: queueSize,
          oldestTaskWaitTime: waitTime
        };
        
        totalTasks += queueSize;
        if (queueSize > 0) totalBacklog++;
      }
      
      return {
        totalQueues: queueKeys.length,
        totalTasks,
        backlogQueues: totalBacklog,
        avgQueueSize: queueKeys.length > 0 ? totalTasks / queueKeys.length : 0,
        queues
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectTaskMetrics() {
    try {
      // Get task completion metrics from the last interval
      const completedTasks = await this.getTaskCompletionMetrics();
      const failedTasks = await this.getTaskFailureMetrics();
      const processingTasks = await this.getProcessingTaskMetrics();
      
      const totalCompleted = completedTasks.count;
      const totalFailed = failedTasks.count;
      const totalProcessed = totalCompleted + totalFailed;
      
      return {
        completed: totalCompleted,
        failed: totalFailed,
        processing: processingTasks.count,
        successRate: totalProcessed > 0 ? totalCompleted / totalProcessed : 1,
        errorRate: totalProcessed > 0 ? totalFailed / totalProcessed : 0,
        throughput: completedTasks.throughput,
        avgCompletionTime: completedTasks.avgTime,
        avgProcessingTime: processingTasks.avgTime
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getTaskCompletionMetrics() {
    const since = Date.now() - this.config.metricsInterval;
    const completionKeys = await this.redis.keys('task:completed:*');
    
    let count = 0;
    let totalTime = 0;
    
    for (const key of completionKeys) {
      const completionData = await this.redis.hgetall(key);
      const completedAt = parseInt(completionData.completedAt || '0');
      
      if (completedAt > since) {
        count++;
        const startTime = parseInt(completionData.startTime || '0');
        if (startTime > 0) {
          totalTime += completedAt - startTime;
        }
      }
    }
    
    return {
      count,
      avgTime: count > 0 ? totalTime / count : 0,
      throughput: count / (this.config.metricsInterval / 1000) // tasks per second
    };
  }

  async getTaskFailureMetrics() {
    const since = Date.now() - this.config.metricsInterval;
    const failureKeys = await this.redis.keys('task:failed:*');
    
    let count = 0;
    const errorTypes = {};
    
    for (const key of failureKeys) {
      const failureData = await this.redis.hgetall(key);
      const failedAt = parseInt(failureData.failedAt || '0');
      
      if (failedAt > since) {
        count++;
        const errorType = failureData.errorType || 'unknown';
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      }
    }
    
    return { count, errorTypes };
  }

  async getProcessingTaskMetrics() {
    const processingKeys = await this.redis.keys('processing:*');
    let count = 0;
    let totalTime = 0;
    
    for (const key of processingKeys) {
      const tasks = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
      count += tasks.length / 2;
      
      // Calculate average processing time
      for (let i = 1; i < tasks.length; i += 2) {
        const startTime = parseFloat(tasks[i]);
        totalTime += Date.now() - startTime;
      }
    }
    
    return {
      count,
      avgTime: count > 0 ? totalTime / count : 0
    };
  }

  async collectNetworkMetrics() {
    try {
      // Redis connection metrics
      const redisInfo = await this.redis.info('stats');
      const redisStats = this.parseRedisInfo(redisInfo);
      
      return {
        redis: {
          connectedClients: redisStats.connected_clients || 0,
          totalCommandsProcessed: redisStats.total_commands_processed || 0,
          instantaneousOpsPerSec: redisStats.instantaneous_ops_per_sec || 0,
          usedMemory: redisStats.used_memory || 0,
          keyspaceHits: redisStats.keyspace_hits || 0,
          keyspaceMisses: redisStats.keyspace_misses || 0
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  parseRedisInfo(infoString) {
    const stats = {};
    const lines = infoString.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        const numValue = parseFloat(value);
        stats[key] = isNaN(numValue) ? value : numValue;
      }
    }
    
    return stats;
  }

  async collectErrorMetrics() {
    try {
      const errorKeys = await this.redis.keys('agent:errors:*');
      const errors = {};
      let totalErrors = 0;
      
      for (const key of errorKeys) {
        const agentId = key.split(':').pop();
        const errorList = await this.redis.lrange(key, 0, -1);
        
        const recentErrors = errorList
          .map(e => JSON.parse(e))
          .filter(e => Date.now() - new Date(e.timestamp).getTime() < this.config.metricsInterval);
        
        errors[agentId] = {
          total: errorList.length,
          recent: recentErrors.length,
          types: this.categorizeErrors(recentErrors)
        };
        
        totalErrors += recentErrors.length;
      }
      
      return {
        totalRecentErrors: totalErrors,
        errorsByAgent: errors,
        errorRate: totalErrors / (this.config.metricsInterval / 1000) // errors per second
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  categorizeErrors(errors) {
    const types = {};
    for (const error of errors) {
      const severity = error.severity || 'medium';
      types[severity] = (types[severity] || 0) + 1;
    }
    return types;
  }

  calculateUptime(registeredAt) {
    if (!registeredAt) return 0;
    return Date.now() - new Date(registeredAt).getTime();
  }

  async storeRawMetrics(metricsEntry) {
    const key = `metrics:raw:${metricsEntry.timestamp}`;
    await this.redis.hset(key, 'data', JSON.stringify(metricsEntry));
    await this.redis.expire(key, this.config.retentionPeriod / 1000);
  }

  async aggregateMetrics() {
    try {
      for (const interval of this.config.aggregationIntervals) {
        await this.aggregateMetricsForInterval(interval);
      }
    } catch (error) {
      console.error('Error aggregating metrics:', error);
    }
  }

  async aggregateMetricsForInterval(interval) {
    const now = Date.now();
    const bucketStart = Math.floor(now / interval.duration) * interval.duration;
    const bucketKey = `${interval.name}:${bucketStart}`;
    
    // Get existing aggregation
    let aggregation = this.aggregatedMetrics.get(interval.name)?.get(bucketKey);
    
    if (!aggregation) {
      // Get raw metrics for this interval
      const rawMetrics = await this.getRawMetricsForPeriod(
        bucketStart,
        bucketStart + interval.duration
      );
      
      if (rawMetrics.length > 0) {
        aggregation = this.calculateAggregation(rawMetrics);
        
        // Store in memory
        if (!this.aggregatedMetrics.has(interval.name)) {
          this.aggregatedMetrics.set(interval.name, new Map());
        }
        this.aggregatedMetrics.get(interval.name).set(bucketKey, aggregation);
        
        // Store in Redis
        await this.redis.hset(
          `metrics:agg:${interval.name}`,
          bucketKey,
          JSON.stringify(aggregation)
        );
        
        // Set expiration
        const retentionSeconds = (interval.duration * interval.samples) / 1000;
        await this.redis.expire(`metrics:agg:${interval.name}`, retentionSeconds);
      }
    }
  }

  async getRawMetricsForPeriod(start, end) {
    const keys = await this.redis.keys('metrics:raw:*');
    const metrics = [];
    
    for (const key of keys) {
      const timestamp = parseInt(key.split(':').pop());
      if (timestamp >= start && timestamp < end) {
        const data = await this.redis.hget(key, 'data');
        if (data) {
          metrics.push(JSON.parse(data));
        }
      }
    }
    
    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }

  calculateAggregation(rawMetrics) {
    if (rawMetrics.length === 0) return null;
    
    const aggregation = {
      timestamp: rawMetrics[0].timestamp,
      samples: rawMetrics.length,
      system: this.aggregateSystemMetrics(rawMetrics),
      agents: this.aggregateAgentMetrics(rawMetrics),
      queues: this.aggregateQueueMetrics(rawMetrics),
      tasks: this.aggregateTaskMetrics(rawMetrics),
      network: this.aggregateNetworkMetrics(rawMetrics),
      errors: this.aggregateErrorMetrics(rawMetrics)
    };
    
    return aggregation;
  }

  aggregateSystemMetrics(rawMetrics) {
    const systemMetrics = rawMetrics.map(m => m.system).filter(Boolean);
    if (systemMetrics.length === 0) return null;
    
    return {
      cpu: {
        avgUsage: this.average(systemMetrics.map(s => s.cpu?.usage || 0)),
        maxUsage: this.max(systemMetrics.map(s => s.cpu?.usage || 0)),
        avgLoadAverage: this.average(systemMetrics.map(s => s.cpu?.loadAverage?.['1min'] || 0))
      },
      memory: {
        avgUsage: this.average(systemMetrics.map(s => s.memory?.usagePercentage || 0)),
        maxUsage: this.max(systemMetrics.map(s => s.memory?.usagePercentage || 0)),
        avgFree: this.average(systemMetrics.map(s => s.memory?.free || 0))
      }
    };
  }

  aggregateAgentMetrics(rawMetrics) {
    const agentMetrics = rawMetrics.map(m => m.agents).filter(Boolean);
    if (agentMetrics.length === 0) return null;
    
    return {
      avgTotal: this.average(agentMetrics.map(a => a.total || 0)),
      avgActive: this.average(agentMetrics.map(a => a.active || 0)),
      avgUtilization: this.average(agentMetrics.map(a => a.utilization || 0)),
      maxUtilization: this.max(agentMetrics.map(a => a.utilization || 0))
    };
  }

  aggregateQueueMetrics(rawMetrics) {
    const queueMetrics = rawMetrics.map(m => m.queues).filter(Boolean);
    if (queueMetrics.length === 0) return null;
    
    return {
      avgTotalTasks: this.average(queueMetrics.map(q => q.totalTasks || 0)),
      maxTotalTasks: this.max(queueMetrics.map(q => q.totalTasks || 0)),
      avgBacklogQueues: this.average(queueMetrics.map(q => q.backlogQueues || 0)),
      avgQueueSize: this.average(queueMetrics.map(q => q.avgQueueSize || 0))
    };
  }

  aggregateTaskMetrics(rawMetrics) {
    const taskMetrics = rawMetrics.map(m => m.tasks).filter(Boolean);
    if (taskMetrics.length === 0) return null;
    
    return {
      totalCompleted: this.sum(taskMetrics.map(t => t.completed || 0)),
      totalFailed: this.sum(taskMetrics.map(t => t.failed || 0)),
      avgSuccessRate: this.average(taskMetrics.map(t => t.successRate || 0)),
      avgThroughput: this.average(taskMetrics.map(t => t.throughput || 0)),
      avgCompletionTime: this.average(taskMetrics.map(t => t.avgCompletionTime || 0))
    };
  }

  aggregateNetworkMetrics(rawMetrics) {
    const networkMetrics = rawMetrics.map(m => m.network).filter(Boolean);
    if (networkMetrics.length === 0) return null;
    
    return {
      redis: {
        avgOpsPerSec: this.average(networkMetrics.map(n => n.redis?.instantaneousOpsPerSec || 0)),
        maxOpsPerSec: this.max(networkMetrics.map(n => n.redis?.instantaneousOpsPerSec || 0)),
        avgConnectedClients: this.average(networkMetrics.map(n => n.redis?.connectedClients || 0))
      }
    };
  }

  aggregateErrorMetrics(rawMetrics) {
    const errorMetrics = rawMetrics.map(m => m.errors).filter(Boolean);
    if (errorMetrics.length === 0) return null;
    
    return {
      totalErrors: this.sum(errorMetrics.map(e => e.totalRecentErrors || 0)),
      avgErrorRate: this.average(errorMetrics.map(e => e.errorRate || 0)),
      maxErrorRate: this.max(errorMetrics.map(e => e.errorRate || 0))
    };
  }

  // Utility functions for aggregation
  average(numbers) {
    return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
  }

  max(numbers) {
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }

  sum(numbers) {
    return numbers.reduce((sum, n) => sum + n, 0);
  }

  async checkAlerts() {
    try {
      const latestMetrics = Array.from(this.metrics.values()).slice(-1)[0];
      if (!latestMetrics) return;
      
      const alertsToCheck = [
        { name: 'high_response_time', check: this.checkResponseTimeAlert.bind(this) },
        { name: 'high_error_rate', check: this.checkErrorRateAlert.bind(this) },
        { name: 'low_throughput', check: this.checkThroughputAlert.bind(this) },
        { name: 'high_memory_usage', check: this.checkMemoryAlert.bind(this) },
        { name: 'high_cpu_usage', check: this.checkCpuAlert.bind(this) },
        { name: 'high_queue_backlog', check: this.checkQueueBacklogAlert.bind(this) },
        { name: 'high_agent_utilization', check: this.checkAgentUtilizationAlert.bind(this) }
      ];
      
      for (const alert of alertsToCheck) {
        await alert.check(latestMetrics);
      }
      
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  async checkResponseTimeAlert(metrics) {
    const avgResponseTime = metrics.tasks?.avgCompletionTime || 0;
    if (avgResponseTime > this.config.alertThresholds.avgResponseTime) {
      await this.createAlert('high_response_time', {
        value: avgResponseTime,
        threshold: this.config.alertThresholds.avgResponseTime,
        message: `Average response time is ${avgResponseTime}ms (threshold: ${this.config.alertThresholds.avgResponseTime}ms)`
      });
    }
  }

  async checkErrorRateAlert(metrics) {
    const errorRate = metrics.tasks?.errorRate || 0;
    if (errorRate > this.config.alertThresholds.errorRate) {
      await this.createAlert('high_error_rate', {
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate,
        message: `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%)`
      });
    }
  }

  async checkThroughputAlert(metrics) {
    const throughput = metrics.tasks?.throughput || 0;
    if (throughput < this.config.alertThresholds.throughput) {
      await this.createAlert('low_throughput', {
        value: throughput,
        threshold: this.config.alertThresholds.throughput,
        message: `Throughput is ${throughput.toFixed(3)} tasks/sec (threshold: ${this.config.alertThresholds.throughput} tasks/sec)`
      });
    }
  }

  async checkMemoryAlert(metrics) {
    const memoryUsage = metrics.system?.memory?.usagePercentage || 0;
    if (memoryUsage > this.config.alertThresholds.memoryUsage) {
      await this.createAlert('high_memory_usage', {
        value: memoryUsage,
        threshold: this.config.alertThresholds.memoryUsage,
        message: `Memory usage is ${(memoryUsage * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.memoryUsage * 100).toFixed(1)}%)`
      });
    }
  }

  async checkCpuAlert(metrics) {
    const cpuUsage = metrics.system?.cpu?.usage || 0;
    if (cpuUsage > this.config.alertThresholds.cpuUsage) {
      await this.createAlert('high_cpu_usage', {
        value: cpuUsage,
        threshold: this.config.alertThresholds.cpuUsage,
        message: `CPU usage is ${(cpuUsage * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.cpuUsage * 100).toFixed(1)}%)`
      });
    }
  }

  async checkQueueBacklogAlert(metrics) {
    const totalTasks = metrics.queues?.totalTasks || 0;
    if (totalTasks > this.config.alertThresholds.queueBacklog) {
      await this.createAlert('high_queue_backlog', {
        value: totalTasks,
        threshold: this.config.alertThresholds.queueBacklog,
        message: `Queue backlog is ${totalTasks} tasks (threshold: ${this.config.alertThresholds.queueBacklog} tasks)`
      });
    }
  }

  async checkAgentUtilizationAlert(metrics) {
    const utilization = metrics.agents?.utilization || 0;
    if (utilization > this.config.alertThresholds.agentUtilization) {
      await this.createAlert('high_agent_utilization', {
        value: utilization,
        threshold: this.config.alertThresholds.agentUtilization,
        message: `Agent utilization is ${(utilization * 100).toFixed(1)}% (threshold: ${(this.config.alertThresholds.agentUtilization * 100).toFixed(1)}%)`
      });
    }
  }

  async createAlert(type, data) {
    const alertKey = `${type}:${Date.now()}`;
    const alert = {
      type,
      timestamp: Date.now(),
      ...data,
      acknowledged: false
    };
    
    this.alerts.set(alertKey, alert);
    await this.redis.hset('metrics:alerts', alertKey, JSON.stringify(alert));
    
    console.warn(`Performance Alert: ${alert.message}`);
    this.emit('alert', alert);
  }

  async cleanupOldMetrics() {
    try {
      const cutoff = Date.now() - this.config.retentionPeriod;
      
      // Clean up raw metrics
      const rawKeys = await this.redis.keys('metrics:raw:*');
      for (const key of rawKeys) {
        const timestamp = parseInt(key.split(':').pop());
        if (timestamp < cutoff) {
          await this.redis.del(key);
        }
      }
      
      // Clean up in-memory cache
      for (const [timestamp] of this.metrics) {
        if (timestamp < cutoff) {
          this.metrics.delete(timestamp);
        }
      }
      
      // Clean up old alerts
      const alertCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
      for (const [alertKey, alert] of this.alerts) {
        if (alert.timestamp < alertCutoff) {
          this.alerts.delete(alertKey);
          await this.redis.hdel('metrics:alerts', alertKey);
        }
      }
      
      console.log('Cleaned up old metrics and alerts');
    } catch (error) {
      console.error('Error cleaning up metrics:', error);
    }
  }

  async getMetricsReport(timeRange = '1hour') {
    try {
      const aggregatedData = this.aggregatedMetrics.get(timeRange);
      const latestRaw = Array.from(this.metrics.values()).slice(-1)[0];
      const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.acknowledged);
      
      return {
        timeRange,
        timestamp: Date.now(),
        current: latestRaw,
        aggregated: aggregatedData ? Object.fromEntries(aggregatedData) : {},
        alerts: activeAlerts,
        summary: {
          systemHealth: this.calculateSystemHealth(latestRaw),
          performance: this.calculatePerformanceSummary(latestRaw),
          alertCount: activeAlerts.length
        }
      };
    } catch (error) {
      console.error('Error generating metrics report:', error);
      return { error: error.message };
    }
  }

  calculateSystemHealth(metrics) {
    if (!metrics) return 'unknown';
    
    let healthScore = 1.0;
    
    // CPU health
    const cpuUsage = metrics.system?.cpu?.usage || 0;
    if (cpuUsage > 0.9) healthScore *= 0.5;
    else if (cpuUsage > 0.7) healthScore *= 0.8;
    
    // Memory health
    const memoryUsage = metrics.system?.memory?.usagePercentage || 0;
    if (memoryUsage > 0.9) healthScore *= 0.5;
    else if (memoryUsage > 0.8) healthScore *= 0.8;
    
    // Agent health
    const agentUtilization = metrics.agents?.utilization || 0;
    if (agentUtilization > 0.95) healthScore *= 0.7;
    
    // Error rate health
    const errorRate = metrics.tasks?.errorRate || 0;
    if (errorRate > 0.1) healthScore *= 0.6;
    else if (errorRate > 0.05) healthScore *= 0.8;
    
    if (healthScore > 0.8) return 'excellent';
    if (healthScore > 0.6) return 'good';
    if (healthScore > 0.4) return 'fair';
    if (healthScore > 0.2) return 'poor';
    return 'critical';
  }

  calculatePerformanceSummary(metrics) {
    if (!metrics) return null;
    
    return {
      throughput: metrics.tasks?.throughput || 0,
      successRate: (metrics.tasks?.successRate || 0) * 100,
      avgResponseTime: metrics.tasks?.avgCompletionTime || 0,
      agentUtilization: (metrics.agents?.utilization || 0) * 100,
      queueBacklog: metrics.queues?.totalTasks || 0
    };
  }

  async acknowledgeAlert(alertKey) {
    const alert = this.alerts.get(alertKey);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      await this.redis.hset('metrics:alerts', alertKey, JSON.stringify(alert));
      this.emit('alertAcknowledged', alert);
    }
  }

  async shutdown() {
    await this.stop();
    await this.redis.quit();
    console.log('Performance Metrics Monitor shutdown complete');
  }
}

module.exports = PerformanceMetricsMonitor;