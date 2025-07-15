const BaseHook = require('../../core/BaseHook');
const fs = require('fs').promises;
const path = require('path');

class PostExecutionLoggingHook extends BaseHook {
  constructor(config = {}) {
    super(config);
    
    this.metadata = {
      name: 'post-execution-logging',
      version: '1.0.0',
      type: 'post-task',
      description: 'Logs task execution details and performance metrics',
      priority: 90,
      enabled: true,
      timeout: 3000
    };

    this.logPath = config.logPath || path.join(__dirname, '../../logs');
    this.metricsBuffer = [];
    this.flushInterval = null;
  }

  async validate(context) {
    if (!context.task || !context.execution) {
      return { valid: false, reason: 'Missing task or execution context' };
    }
    return { valid: true };
  }

  async execute(context) {
    const { task, agent, execution, result } = context;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      executionId: execution.id,
      agent: {
        id: agent.id,
        type: agent.type,
        model: agent.model
      },
      task: {
        id: task.id,
        type: task.type,
        complexity: task.complexity,
        priority: task.priority
      },
      performance: {
        duration: execution.duration || (Date.now() - execution.startTime),
        success: execution.success !== false,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      result: this.sanitizeResult(result)
    };

    // Add to metrics buffer
    this.metricsBuffer.push(logEntry);

    // Log to file
    await this.logToFile(logEntry);

    // Log to Redis for real-time analytics
    await this.logToRedis(context, logEntry);

    // Track performance patterns
    await this.trackPerformancePatterns(context, logEntry);

    // Check for performance anomalies
    const anomalies = await this.detectAnomalies(context, logEntry);
    if (anomalies.length > 0) {
      await this.handleAnomalies(context, anomalies);
    }

    return {
      logged: true,
      entry: logEntry.executionId,
      anomalies: anomalies.length > 0 ? anomalies : undefined
    };
  }

  sanitizeResult(result) {
    if (!result) return null;

    // Remove sensitive data from results
    const sanitized = { ...result };
    const sensitiveKeys = ['password', 'apiKey', 'secret', 'token', 'credential'];
    
    const removeSensitive = (obj) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          removeSensitive(obj[key]);
        }
      }
    };

    removeSensitive(sanitized);
    return sanitized;
  }

  async logToFile(entry) {
    try {
      // Ensure log directory exists
      await fs.mkdir(this.logPath, { recursive: true });

      // Create date-based log file
      const date = new Date();
      const filename = `execution-${date.toISOString().split('T')[0]}.jsonl`;
      const filepath = path.join(this.logPath, filename);

      // Append to log file
      await fs.appendFile(filepath, JSON.stringify(entry) + '\n');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  async logToRedis(context, entry) {
    try {
      // Store full log entry
      const key = `log:execution:${entry.executionId}`;
      await context.redis.setEx(key, 86400 * 7, JSON.stringify(entry)); // 7 day TTL

      // Add to time series
      await context.redis.zAdd('log:executions:timeline', {
        score: Date.now(),
        value: entry.executionId
      });

      // Update agent metrics
      const agentKey = `metrics:agent:${entry.agent.id}`;
      await context.redis.hIncrBy(agentKey, 'totalTasks', 1);
      if (entry.performance.success) {
        await context.redis.hIncrBy(agentKey, 'successfulTasks', 1);
      }
      await context.redis.hIncrByFloat(agentKey, 'totalDuration', entry.performance.duration);

      // Update task type metrics
      const taskTypeKey = `metrics:tasktype:${entry.task.type}`;
      await context.redis.hIncrBy(taskTypeKey, 'count', 1);
      await context.redis.hIncrByFloat(taskTypeKey, 'totalDuration', entry.performance.duration);

      // Publish for real-time monitoring
      await context.redis.publish('logs:execution', JSON.stringify({
        executionId: entry.executionId,
        agentId: entry.agent.id,
        taskType: entry.task.type,
        duration: entry.performance.duration,
        success: entry.performance.success,
        timestamp: entry.timestamp
      }));
    } catch (error) {
      console.error('Failed to log to Redis:', error);
    }
  }

  async trackPerformancePatterns(context, entry) {
    const patternKey = `pattern:${entry.agent.id}:${entry.task.type}`;
    
    // Store recent performance data
    await context.redis.zAdd(patternKey, {
      score: Date.now(),
      value: JSON.stringify({
        duration: entry.performance.duration,
        success: entry.performance.success,
        complexity: entry.task.complexity,
        memoryUsage: entry.performance.memoryUsage.heapUsed
      })
    });

    // Keep only recent data (last 1000 entries)
    await context.redis.zRemRangeByRank(patternKey, 0, -1001);

    // Calculate rolling statistics
    const recentData = await context.redis.zRange(patternKey, -100, -1);
    if (recentData.length >= 10) {
      const durations = recentData.map(d => JSON.parse(d).duration);
      const stats = {
        avg: durations.reduce((a, b) => a + b) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p50: this.percentile(durations, 0.5),
        p90: this.percentile(durations, 0.9),
        p99: this.percentile(durations, 0.99)
      };

      await context.redis.hSet(`stats:${entry.agent.id}:${entry.task.type}`, {
        ...stats,
        updated: Date.now()
      });
    }
  }

  async detectAnomalies(context, entry) {
    const anomalies = [];
    const statsKey = `stats:${entry.agent.id}:${entry.task.type}`;
    const stats = await context.redis.hGetAll(statsKey);

    if (stats && stats.avg) {
      const avgDuration = parseFloat(stats.avg);
      const p99Duration = parseFloat(stats.p99);

      // Check for performance degradation
      if (entry.performance.duration > p99Duration * 1.5) {
        anomalies.push({
          type: 'performance_degradation',
          severity: 'warning',
          message: `Task took ${entry.performance.duration}ms, which is 50% above p99 (${p99Duration}ms)`,
          details: {
            actual: entry.performance.duration,
            expected: avgDuration,
            p99: p99Duration
          }
        });
      }

      // Check for sudden failures
      if (!entry.performance.success) {
        const recentFailures = await this.getRecentFailureRate(context, entry.agent.id);
        if (recentFailures > 0.2) { // 20% failure rate
          anomalies.push({
            type: 'high_failure_rate',
            severity: 'critical',
            message: `Agent ${entry.agent.id} has ${(recentFailures * 100).toFixed(1)}% failure rate`,
            details: {
              failureRate: recentFailures,
              agentId: entry.agent.id
            }
          });
        }
      }

      // Check for memory leaks
      const memoryTrend = await this.getMemoryTrend(context, entry.agent.id);
      if (memoryTrend.increasing && memoryTrend.rate > 0.1) { // 10% increase per task
        anomalies.push({
          type: 'potential_memory_leak',
          severity: 'warning',
          message: `Memory usage increasing at ${(memoryTrend.rate * 100).toFixed(1)}% per task`,
          details: memoryTrend
        });
      }
    }

    return anomalies;
  }

  async getRecentFailureRate(context, agentId) {
    const metrics = await context.redis.hGetAll(`metrics:agent:${agentId}`);
    if (!metrics || !metrics.totalTasks) return 0;

    const total = parseInt(metrics.totalTasks);
    const successful = parseInt(metrics.successfulTasks || 0);
    const failures = total - successful;

    return failures / total;
  }

  async getMemoryTrend(context, agentId) {
    const patternKey = `pattern:${agentId}:*`;
    const keys = await context.redis.keys(patternKey);
    
    let totalData = [];
    for (const key of keys) {
      const data = await context.redis.zRange(key, -20, -1);
      totalData = totalData.concat(data.map(d => JSON.parse(d)));
    }

    if (totalData.length < 10) {
      return { increasing: false, rate: 0 };
    }

    // Sort by timestamp
    totalData.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate trend
    const memoryValues = totalData.map(d => d.memoryUsage);
    const firstHalf = memoryValues.slice(0, Math.floor(memoryValues.length / 2));
    const secondHalf = memoryValues.slice(Math.floor(memoryValues.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    const rate = (secondAvg - firstAvg) / firstAvg;

    return {
      increasing: rate > 0,
      rate,
      firstAvg,
      secondAvg,
      samples: totalData.length
    };
  }

  async handleAnomalies(context, anomalies) {
    for (const anomaly of anomalies) {
      // Store anomaly
      const anomalyKey = `anomaly:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      await context.redis.setEx(anomalyKey, 86400 * 30, JSON.stringify({
        ...anomaly,
        timestamp: new Date().toISOString(),
        agent: context.agent,
        task: context.task
      }));

      // Add to sorted set
      await context.redis.zAdd('anomalies:timeline', {
        score: Date.now(),
        value: anomalyKey
      });

      // Publish alert
      if (anomaly.severity === 'critical') {
        await context.redis.publish('alerts:critical', JSON.stringify(anomaly));
      }

      // Log anomaly
      context.warn(`Performance anomaly detected: ${anomaly.type}`, anomaly);
    }
  }

  percentile(values, p) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  async shutdown() {
    // Flush any remaining metrics
    if (this.metricsBuffer.length > 0) {
      for (const entry of this.metricsBuffer) {
        await this.logToFile(entry);
      }
      this.metricsBuffer = [];
    }

    super.shutdown();
  }
}

module.exports = PostExecutionLoggingHook;