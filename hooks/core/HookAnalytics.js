const EventEmitter = require('events');
const Redis = require('redis');

class HookAnalytics extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      retentionDays: 7,
      aggregationIntervals: ['1m', '5m', '1h', '1d'],
      ...config
    };
    this.redisClient = null;
    this.metricsBuffer = [];
    this.flushInterval = null;
  }

  async initialize() {
    this.redisClient = Redis.createClient({ url: this.config.redisUrl });
    await this.redisClient.connect();

    // Start metrics flush interval
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 5000); // Flush every 5 seconds

    // Subscribe to hook events
    await this.subscribeToEvents();
  }

  async subscribeToEvents() {
    const subClient = this.redisClient.duplicate();
    await subClient.connect();

    await subClient.subscribe('hooks:events', async (message) => {
      const event = JSON.parse(message);
      await this.processEvent(event);
    });
  }

  async processEvent(event) {
    switch (event.type) {
      case 'hook:execution':
        await this.trackExecution(event.execution);
        break;
      case 'hook:error':
        await this.trackError(event);
        break;
      case 'hook:performance':
        await this.trackPerformance(event);
        break;
    }
  }

  async trackExecution(execution) {
    const metric = {
      timestamp: Date.now(),
      type: 'execution',
      hookType: execution.type,
      hookId: execution.id,
      duration: execution.duration,
      success: execution.success,
      hookCount: execution.hookCount
    };

    this.metricsBuffer.push(metric);

    // Update real-time counters
    const key = `hook:metrics:${execution.type}`;
    await this.redisClient.hIncrBy(key, 'total', 1);
    if (execution.success) {
      await this.redisClient.hIncrBy(key, 'success', 1);
    } else {
      await this.redisClient.hIncrBy(key, 'failure', 1);
    }
  }

  async trackError(event) {
    const errorKey = `hook:errors:${event.hookId}`;
    await this.redisClient.zAdd(errorKey, {
      score: Date.now(),
      value: JSON.stringify({
        error: event.error,
        context: event.context,
        timestamp: new Date().toISOString()
      })
    });

    // Trim old errors
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    await this.redisClient.zRemRangeByScore(errorKey, 0, cutoff);
  }

  async trackPerformance(event) {
    const perfKey = `hook:performance:${event.hookId}`;
    await this.redisClient.zAdd(perfKey, {
      score: Date.now(),
      value: JSON.stringify({
        duration: event.duration,
        memory: event.memory,
        cpu: event.cpu
      })
    });
  }

  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Aggregate metrics by interval
      for (const interval of this.config.aggregationIntervals) {
        await this.aggregateMetrics(metrics, interval);
      }

      // Store raw metrics
      await this.storeRawMetrics(metrics);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer
      this.metricsBuffer.unshift(...metrics);
    }
  }

  async aggregateMetrics(metrics, interval) {
    const bucketSize = this.parseInterval(interval);
    const aggregated = new Map();

    for (const metric of metrics) {
      const bucket = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      const key = `${metric.hookType}:${bucket}`;

      if (!aggregated.has(key)) {
        aggregated.set(key, {
          hookType: metric.hookType,
          bucket,
          count: 0,
          successCount: 0,
          totalDuration: 0,
          minDuration: Infinity,
          maxDuration: 0
        });
      }

      const agg = aggregated.get(key);
      agg.count++;
      if (metric.success) agg.successCount++;
      agg.totalDuration += metric.duration;
      agg.minDuration = Math.min(agg.minDuration, metric.duration);
      agg.maxDuration = Math.max(agg.maxDuration, metric.duration);
    }

    // Store aggregated metrics
    for (const [key, agg] of aggregated) {
      const redisKey = `hook:agg:${interval}:${agg.hookType}`;
      await this.redisClient.zAdd(redisKey, {
        score: agg.bucket,
        value: JSON.stringify({
          ...agg,
          avgDuration: agg.totalDuration / agg.count,
          successRate: agg.successCount / agg.count
        })
      });

      // Set expiration
      await this.redisClient.expire(redisKey, this.config.retentionDays * 24 * 60 * 60);
    }
  }

  async storeRawMetrics(metrics) {
    const pipeline = this.redisClient.multi();

    for (const metric of metrics) {
      const key = `hook:raw:${metric.hookType}`;
      pipeline.zAdd(key, {
        score: metric.timestamp,
        value: JSON.stringify(metric)
      });
    }

    await pipeline.exec();
  }

  parseInterval(interval) {
    const units = {
      's': 1000,
      'm': 60000,
      'h': 3600000,
      'd': 86400000
    };

    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid interval: ${interval}`);

    return parseInt(match[1]) * units[match[2]];
  }

  // Query methods
  async getMetrics(hookType, interval = '1h', duration = '24h') {
    const now = Date.now();
    const durationMs = this.parseInterval(duration);
    const startTime = now - durationMs;

    const key = `hook:agg:${interval}:${hookType}`;
    const metrics = await this.redisClient.zRangeWithScores(key, startTime, now, {
      BY: 'SCORE'
    });

    return metrics.map(m => ({
      ...JSON.parse(m.value),
      timestamp: m.score
    }));
  }

  async getTopHooks(limit = 10, sortBy = 'count') {
    const hookTypes = await this.redisClient.keys('hook:metrics:*');
    const metrics = [];

    for (const key of hookTypes) {
      const hookType = key.split(':').pop();
      const data = await this.redisClient.hGetAll(key);
      
      metrics.push({
        hookType,
        total: parseInt(data.total || 0),
        success: parseInt(data.success || 0),
        failure: parseInt(data.failure || 0),
        successRate: data.total > 0 ? (data.success / data.total) : 0
      });
    }

    // Sort by specified field
    metrics.sort((a, b) => b[sortBy] - a[sortBy]);
    
    return metrics.slice(0, limit);
  }

  async getErrors(hookId, limit = 100) {
    const key = `hook:errors:${hookId}`;
    const errors = await this.redisClient.zRange(key, -limit, -1, {
      REV: true
    });

    return errors.map(e => JSON.parse(e));
  }

  async getPerformanceStats(hookId, duration = '1h') {
    const now = Date.now();
    const durationMs = this.parseInterval(duration);
    const startTime = now - durationMs;

    const key = `hook:performance:${hookId}`;
    const data = await this.redisClient.zRangeWithScores(key, startTime, now, {
      BY: 'SCORE'
    });

    if (data.length === 0) return null;

    const values = data.map(d => JSON.parse(d.value));
    const durations = values.map(v => v.duration);

    return {
      hookId,
      samples: values.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50: this.percentile(durations, 0.5),
        p90: this.percentile(durations, 0.9),
        p99: this.percentile(durations, 0.99)
      }
    };
  }

  percentile(values, p) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  async generateReport(options = {}) {
    const {
      duration = '24h',
      includeErrors = true,
      includePerformance = true
    } = options;

    const report = {
      generated: new Date().toISOString(),
      duration,
      summary: await this.getTopHooks(),
      byHookType: {}
    };

    for (const hook of report.summary) {
      const hookReport = {
        metrics: await this.getMetrics(hook.hookType, '1h', duration)
      };

      if (includeErrors) {
        hookReport.recentErrors = await this.getErrors(hook.hookType, 10);
      }

      if (includePerformance) {
        hookReport.performance = await this.getPerformanceStats(hook.hookType, duration);
      }

      report.byHookType[hook.hookType] = hookReport;
    }

    return report;
  }

  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flushMetrics();

    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = HookAnalytics;