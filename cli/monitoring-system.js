/**
 * Production Monitoring and Alerting System for Ez Aigent Platform
 * Real-time monitoring, metrics collection, and intelligent alerting
 */

const { EventEmitter } = require('events');
const Redis = require('ioredis');
const axios = require('axios');

class MonitoringSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL);
    this.config = {
      metricsRetention: config.metricsRetention || 7 * 24 * 60 * 60 * 1000, // 7 days
      alertingEnabled: config.alertingEnabled !== false,
      slackWebhook: config.slackWebhook || process.env.SLACK_WEBHOOK_URL,
      emailConfig: config.emailConfig || {},
      thresholds: config.thresholds || this.getDefaultThresholds(),
      checkInterval: config.checkInterval || 30000, // 30 seconds
      ...config
    };
    
    this.metrics = new Map();
    this.alerts = new Map();
    this.monitoringActive = false;
  }

  /**
   * Start monitoring system
   */
  async start() {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    console.log('📊 Starting production monitoring system...');
    
    // Start metric collection
    this.startMetricCollection();
    
    // Start alerting engine
    this.startAlertingEngine();
    
    // Start health checks
    this.startHealthChecks();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    this.emit('monitoringStarted');
  }

  /**
   * Get default monitoring thresholds
   */
  getDefaultThresholds() {
    return {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      queueDepth: { warning: 100, critical: 500 },
      responseTime: { warning: 2000, critical: 5000 },
      errorRate: { warning: 5, critical: 10 },
      agentFailures: { warning: 3, critical: 10 },
      redisConnections: { warning: 80, critical: 95 }
    };
  }

  /**
   * Start collecting system metrics
   */
  startMetricCollection() {
    const collectMetrics = async () => {
      if (!this.monitoringActive) return;
      
      try {
        const metrics = await this.collectAllMetrics();
        await this.storeMetrics(metrics);
        this.evaluateAlerts(metrics);
        
        this.emit('metricsCollected', metrics);
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
      
      setTimeout(collectMetrics, this.config.checkInterval);
    };
    
    collectMetrics();
  }

  /**
   * Collect all system metrics
   */
  async collectAllMetrics() {
    const timestamp = Date.now();
    
    return {
      timestamp,
      system: await this.collectSystemMetrics(),
      queues: await this.collectQueueMetrics(),
      agents: await this.collectAgentMetrics(),
      redis: await this.collectRedisMetrics(),
      application: await this.collectApplicationMetrics(),
      performance: await this.collectPerformanceMetrics()
    };
  }

  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    // Simulated system metrics (replace with actual system monitoring)
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
      uptime: process.uptime(),
      loadAverage: process.loadavg(),
      processMemory: process.memoryUsage()
    };
  }

  /**
   * Collect queue metrics
   */
  async collectQueueMetrics() {
    const queueTypes = ['orchestration', 'enhancement', 'analysis', 'deployment', 'monitoring'];
    const queueMetrics = {};
    
    for (const type of queueTypes) {
      const pending = await this.redis.llen(`queue:${type}`);
      const processing = await this.redis.llen(`processing:${type}`);
      
      queueMetrics[type] = {
        pending,
        processing,
        total: pending + processing
      };
    }
    
    const failures = await this.redis.llen('queue:failures');
    queueMetrics.failures = failures;
    
    return queueMetrics;
  }

  /**
   * Collect agent metrics
   */
  async collectAgentMetrics() {
    const agentStats = {};
    const agentTypes = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    
    for (const type of agentTypes) {
      const statsKey = `agent:stats:${type}`;
      const stats = await this.redis.hgetall(statsKey);
      
      agentStats[type] = {
        tasksCompleted: parseInt(stats.tasksCompleted) || 0,
        tasksFailed: parseInt(stats.tasksFailed) || 0,
        averageResponseTime: parseFloat(stats.averageResponseTime) || 0,
        lastActiveAt: stats.lastActiveAt || null,
        status: stats.status || 'unknown'
      };
    }
    
    return agentStats;
  }

  /**
   * Collect Redis metrics
   */
  async collectRedisMetrics() {
    try {
      const info = await this.redis.info();
      const keyspace = await this.redis.dbsize();
      
      // Parse Redis info
      const lines = info.split('\r\n');
      const metrics = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          metrics[key] = isNaN(value) ? value : parseFloat(value);
        }
      });
      
      return {
        connectedClients: metrics.connected_clients || 0,
        usedMemory: metrics.used_memory || 0,
        usedMemoryHuman: metrics.used_memory_human || '0B',
        totalConnectionsReceived: metrics.total_connections_received || 0,
        totalCommandsProcessed: metrics.total_commands_processed || 0,
        keyspaceHits: metrics.keyspace_hits || 0,
        keyspaceMisses: metrics.keyspace_misses || 0,
        totalKeys: keyspace
      };
    } catch (error) {
      console.error('Redis metrics collection failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Collect application-specific metrics
   */
  async collectApplicationMetrics() {
    return {
      dashboardRequests: await this.redis.get('metrics:dashboard:requests') || 0,
      apiResponseTime: await this.redis.get('metrics:api:avgResponseTime') || 0,
      errorRate: await this.redis.get('metrics:errors:rate') || 0,
      activeUsers: await this.redis.scard('users:active') || 0,
      featuresUsed: await this.redis.hgetall('metrics:features') || {}
    };
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    return {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      external: process.memoryUsage().external,
      eventLoopDelay: await this.measureEventLoopDelay(),
      gcMetrics: this.getGCMetrics()
    };
  }

  /**
   * Measure event loop delay
   */
  async measureEventLoopDelay() {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        resolve(Number(delta) / 1000000); // Convert to milliseconds
      });
    });
  }

  /**
   * Get garbage collection metrics
   */
  getGCMetrics() {
    // Simplified GC metrics (can be enhanced with v8 module)
    return {
      collections: Math.floor(Math.random() * 100),
      avgDuration: Math.random() * 10
    };
  }

  /**
   * Store metrics in Redis with TTL
   */
  async storeMetrics(metrics) {
    const key = `metrics:${metrics.timestamp}`;
    
    await this.redis.setex(
      key,
      this.config.metricsRetention / 1000,
      JSON.stringify(metrics)
    );
    
    // Also store in time series for easy querying
    await this.redis.zadd('metrics:timeline', metrics.timestamp, key);
    
    // Clean up old entries
    const cutoff = Date.now() - this.config.metricsRetention;
    await this.redis.zremrangebyscore('metrics:timeline', 0, cutoff);
  }

  /**
   * Evaluate metrics against thresholds and trigger alerts
   */
  evaluateAlerts(metrics) {
    const { thresholds } = this.config;
    const alerts = [];
    
    // System alerts
    if (metrics.system.cpu > thresholds.cpu.critical) {
      alerts.push(this.createAlert('cpu_critical', `CPU usage at ${metrics.system.cpu.toFixed(1)}%`, 'critical'));
    } else if (metrics.system.cpu > thresholds.cpu.warning) {
      alerts.push(this.createAlert('cpu_warning', `CPU usage at ${metrics.system.cpu.toFixed(1)}%`, 'warning'));
    }
    
    if (metrics.system.memory > thresholds.memory.critical) {
      alerts.push(this.createAlert('memory_critical', `Memory usage at ${metrics.system.memory.toFixed(1)}%`, 'critical'));
    } else if (metrics.system.memory > thresholds.memory.warning) {
      alerts.push(this.createAlert('memory_warning', `Memory usage at ${metrics.system.memory.toFixed(1)}%`, 'warning'));
    }
    
    // Queue alerts
    const totalQueueDepth = Object.values(metrics.queues)
      .filter(q => typeof q === 'object' && q.total)
      .reduce((sum, q) => sum + q.total, 0);
    
    if (totalQueueDepth > thresholds.queueDepth.critical) {
      alerts.push(this.createAlert('queue_critical', `Queue depth at ${totalQueueDepth} tasks`, 'critical'));
    } else if (totalQueueDepth > thresholds.queueDepth.warning) {
      alerts.push(this.createAlert('queue_warning', `Queue depth at ${totalQueueDepth} tasks`, 'warning'));
    }
    
    // Agent failure alerts
    const totalFailures = Object.values(metrics.agents)
      .reduce((sum, agent) => sum + agent.tasksFailed, 0);
    
    if (totalFailures > thresholds.agentFailures.critical) {
      alerts.push(this.createAlert('agent_failures_critical', `${totalFailures} agent failures detected`, 'critical'));
    } else if (totalFailures > thresholds.agentFailures.warning) {
      alerts.push(this.createAlert('agent_failures_warning', `${totalFailures} agent failures detected`, 'warning'));
    }
    
    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Create alert object
   */
  createAlert(type, message, severity) {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      severity,
      timestamp: Date.now(),
      acknowledged: false
    };
  }

  /**
   * Process and send alerts
   */
  async processAlert(alert) {
    // Check if similar alert already exists (avoid spam)
    const existingAlert = Array.from(this.alerts.values())
      .find(a => a.type === alert.type && !a.acknowledged && (Date.now() - a.timestamp) < 300000); // 5 minutes
    
    if (existingAlert) return; // Don't send duplicate alerts
    
    this.alerts.set(alert.id, alert);
    
    console.log(`🚨 Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    if (this.config.alertingEnabled) {
      // Send to Slack
      if (this.config.slackWebhook) {
        await this.sendSlackAlert(alert);
      }
      
      // Send email (if configured)
      if (this.config.emailConfig.enabled) {
        await this.sendEmailAlert(alert);
      }
      
      // Store alert in Redis
      await this.redis.lpush('alerts:history', JSON.stringify(alert));
      await this.redis.ltrim('alerts:history', 0, 1000); // Keep last 1000 alerts
    }
    
    this.emit('alertTriggered', alert);
  }

  /**
   * Send alert to Slack
   */
  async sendSlackAlert(alert) {
    try {
      const color = alert.severity === 'critical' ? '#ff0000' : '#ffaa00';
      const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
      
      await axios.post(this.config.slackWebhook, {
        attachments: [{
          color,
          title: `${emoji} Ez Aigent Alert - ${alert.severity.toUpperCase()}`,
          text: alert.message,
          fields: [
            { title: 'Alert Type', value: alert.type, short: true },
            { title: 'Timestamp', value: new Date(alert.timestamp).toISOString(), short: true }
          ],
          footer: 'Ez Aigent Monitoring',
          ts: Math.floor(alert.timestamp / 1000)
        }]
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Send email alert (placeholder)
   */
  async sendEmailAlert(alert) {
    // Implement email sending logic
    console.log(`📧 Email alert would be sent: ${alert.message}`);
  }

  /**
   * Start health checks for critical services
   */
  startHealthChecks() {
    const runHealthChecks = async () => {
      if (!this.monitoringActive) return;
      
      const services = [
        { name: 'Redis', check: () => this.checkRedisHealth() },
        { name: 'Dashboard', check: () => this.checkDashboardHealth() },
        { name: 'Queue System', check: () => this.checkQueueSystemHealth() }
      ];
      
      for (const service of services) {
        try {
          const healthy = await service.check();
          await this.redis.hset('health:services', service.name, healthy ? 'healthy' : 'unhealthy');
          
          if (!healthy) {
            const alert = this.createAlert(
              `${service.name.toLowerCase()}_unhealthy`,
              `${service.name} health check failed`,
              'critical'
            );
            await this.processAlert(alert);
          }
        } catch (error) {
          console.error(`Health check failed for ${service.name}:`, error);
        }
      }
      
      setTimeout(runHealthChecks, 60000); // Check every minute
    };
    
    runHealthChecks();
  }

  /**
   * Check Redis health
   */
  async checkRedisHealth() {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check dashboard health
   */
  async checkDashboardHealth() {
    try {
      const response = await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check queue system health
   */
  async checkQueueSystemHealth() {
    try {
      const processingQueues = await this.redis.keys('processing:*');
      // Check if any queues are stuck (tasks processing for too long)
      return processingQueues.length < 10; // Simple check
    } catch (error) {
      return false;
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor Node.js process performance
    setInterval(() => {
      if (!this.monitoringActive) return;
      
      const usage = process.cpuUsage();
      const memory = process.memoryUsage();
      
      this.redis.hmset('performance:nodejs', {
        cpuUser: usage.user,
        cpuSystem: usage.system,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        timestamp: Date.now()
      });
    }, 10000); // Every 10 seconds
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(timeRange = 3600000) { // 1 hour default
    const cutoff = Date.now() - timeRange;
    const metricKeys = await this.redis.zrangebyscore('metrics:timeline', cutoff, '+inf');
    
    const metrics = [];
    for (const key of metricKeys) {
      const data = await this.redis.get(key);
      if (data) {
        metrics.push(JSON.parse(data));
      }
    }
    
    const alerts = await this.redis.lrange('alerts:history', 0, 50);
    const recentAlerts = alerts.map(alert => JSON.parse(alert))
      .filter(alert => alert.timestamp > cutoff);
    
    return {
      metrics,
      alerts: recentAlerts,
      summary: this.generateSummary(metrics)
    };
  }

  /**
   * Generate metrics summary
   */
  generateSummary(metrics) {
    if (metrics.length === 0) return {};
    
    const latest = metrics[metrics.length - 1];
    
    return {
      systemHealth: {
        cpu: latest.system.cpu,
        memory: latest.system.memory,
        disk: latest.system.disk
      },
      queueStatus: latest.queues,
      agentPerformance: latest.agents,
      redisStatus: latest.redis,
      totalAlerts: this.alerts.size,
      criticalAlerts: Array.from(this.alerts.values())
        .filter(a => a.severity === 'critical' && !a.acknowledged).length
    };
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.emit('alertAcknowledged', alert);
    }
  }

  /**
   * Stop monitoring system
   */
  async stop() {
    console.log('⏹️ Stopping monitoring system...');
    this.monitoringActive = false;
    await this.redis.disconnect();
    this.emit('monitoringStopped');
  }
}

module.exports = MonitoringSystem;