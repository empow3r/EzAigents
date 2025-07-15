/**
 * Advanced Metrics Collection and Monitoring System
 * - Real-time performance tracking
 * - Agent health monitoring
 * - Queue depth analysis
 * - Resource utilization metrics
 * - Alert system
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class MetricsCollector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.agentId = config.agentId;
    this.redisClient = config.redisClient;
    this.metricsPath = config.metricsPath || '.agent-memory/metrics';
    this.alertThresholds = config.alertThresholds || this.getDefaultThresholds();
    
    // Metrics storage
    this.metrics = {
      system: {
        startTime: Date.now(),
        lastUpdate: Date.now(),
        uptime: 0
      },
      performance: {
        tasksCompleted: 0,
        tasksActive: 0,
        tasksFailed: 0,
        tasksPerMinute: 0,
        averageTaskDuration: 0,
        totalProcessingTime: 0
      },
      resources: {
        memoryUsage: { used: 0, total: 0, percentage: 0 },
        cpuUsage: 0,
        queueDepth: 0,
        activeConnections: 0
      },
      api: {
        callsTotal: 0,
        callsSuccessful: 0,
        callsFailed: 0,
        averageResponseTime: 0,
        rateLimitHits: 0
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      collaboration: {
        messagesPublished: 0,
        messagesReceived: 0,
        collaborationsInitiated: 0,
        collaborationsCompleted: 0
      }
    };
    
    // Time series data (last 24 hours)
    this.timeSeries = {
      taskThroughput: [],
      memoryUsage: [],
      errorRate: [],
      responseTime: []
    };
    
    // Collection intervals
    this.collectionInterval = null;
    this.persistenceInterval = null;
    this.alertCheckInterval = null;
    
    this.isCollecting = false;
  }

  getDefaultThresholds() {
    return {
      memory: {
        warning: 70, // 70% memory usage
        critical: 90 // 90% memory usage
      },
      taskFailureRate: {
        warning: 10, // 10% failure rate
        critical: 25 // 25% failure rate
      },
      responseTime: {
        warning: 30000, // 30 seconds
        critical: 60000 // 60 seconds
      },
      queueDepth: {
        warning: 50, // 50 tasks in queue
        critical: 100 // 100 tasks in queue
      },
      errorRate: {
        warning: 5, // 5 errors per minute
        critical: 15 // 15 errors per minute
      }
    };
  }

  async initialize() {
    try {
      console.log('📊 Initializing Metrics Collector...');
      
      // Ensure metrics directory exists
      await this.ensureMetricsDirectory();
      
      // Load historical data
      await this.loadHistoricalMetrics();
      
      // Start collection
      this.startCollection();
      
      console.log('✅ Metrics Collector initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Metrics Collector:', error);
      throw error;
    }
  }

  async ensureMetricsDirectory() {
    try {
      await fs.mkdir(this.metricsPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async loadHistoricalMetrics() {
    try {
      const metricsFile = path.join(this.metricsPath, `${this.agentId}-metrics.json`);
      const data = await fs.readFile(metricsFile, 'utf8');
      const historicalData = JSON.parse(data);
      
      // Merge with current metrics, preserving runtime data
      this.metrics = {
        ...this.metrics,
        performance: { ...this.metrics.performance, ...historicalData.performance },
        api: { ...this.metrics.api, ...historicalData.api },
        errors: { ...this.metrics.errors, ...historicalData.errors },
        collaboration: { ...this.metrics.collaboration, ...historicalData.collaboration }
      };
      
      console.log('📊 Historical metrics loaded');
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️ Failed to load historical metrics:', error.message);
      }
    }
  }

  startCollection() {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    
    // Collect metrics every 10 seconds
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, 10000);
    
    // Persist metrics every 5 minutes
    this.persistenceInterval = setInterval(() => {
      this.persistMetrics();
    }, 300000);
    
    // Check alerts every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000);
    
    console.log('📊 Metrics collection started');
  }

  stopCollection() {
    if (!this.isCollecting) return;
    
    this.isCollecting = false;
    
    if (this.collectionInterval) clearInterval(this.collectionInterval);
    if (this.persistenceInterval) clearInterval(this.persistenceInterval);
    if (this.alertCheckInterval) clearInterval(this.alertCheckInterval);
    
    console.log('📊 Metrics collection stopped');
  }

  async collectMetrics() {
    try {
      const now = Date.now();
      
      // Update system metrics
      this.metrics.system.uptime = now - this.metrics.system.startTime;
      this.metrics.system.lastUpdate = now;
      
      // Collect resource metrics
      await this.collectResourceMetrics();
      
      // Collect queue metrics
      await this.collectQueueMetrics();
      
      // Calculate derived metrics
      this.calculateDerivedMetrics();
      
      // Update time series
      this.updateTimeSeries();
      
      // Store in Redis for real-time access
      await this.storeInRedis();
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  async collectResourceMetrics() {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    
    this.metrics.resources.memoryUsage = {
      used: memoryUsedMB,
      total: memoryTotalMB,
      percentage: Math.round((memoryUsedMB / memoryTotalMB) * 100)
    };
    
    // CPU usage (simplified - in production, use proper CPU monitoring)
    this.metrics.resources.cpuUsage = process.cpuUsage();
  }

  async collectQueueMetrics() {
    if (!this.redisClient) return;
    
    try {
      // Get queue depths for all known queues
      const queueKeys = await this.redisClient.keys('queue:*');
      let totalQueueDepth = 0;
      
      for (const queueKey of queueKeys) {
        const depth = await this.redisClient.llen(queueKey);
        totalQueueDepth += depth;
      }
      
      this.metrics.resources.queueDepth = totalQueueDepth;
      
      // Get active connections count
      const info = await this.redisClient.info('clients');
      const connectionsMatch = info.match(/connected_clients:(\d+)/);
      if (connectionsMatch) {
        this.metrics.resources.activeConnections = parseInt(connectionsMatch[1]);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to collect queue metrics:', error.message);
    }
  }

  calculateDerivedMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Calculate tasks per minute from time series data
    const recentTasks = this.timeSeries.taskThroughput.filter(
      entry => entry.timestamp > oneMinuteAgo
    );
    
    this.metrics.performance.tasksPerMinute = recentTasks.length;
    
    // Calculate error rate
    const recentErrors = this.metrics.errors.recent.filter(
      error => error.timestamp > oneMinuteAgo
    );
    
    this.metrics.errors.recentRate = recentErrors.length;
    
    // Calculate success rate
    const totalTasks = this.metrics.performance.tasksCompleted + this.metrics.performance.tasksFailed;
    this.metrics.performance.successRate = totalTasks > 0 
      ? Math.round((this.metrics.performance.tasksCompleted / totalTasks) * 100)
      : 100;
  }

  updateTimeSeries() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Add current data points
    this.timeSeries.taskThroughput.push({
      timestamp: now,
      value: this.metrics.performance.tasksPerMinute
    });
    
    this.timeSeries.memoryUsage.push({
      timestamp: now,
      value: this.metrics.resources.memoryUsage.percentage
    });
    
    this.timeSeries.errorRate.push({
      timestamp: now,
      value: this.metrics.errors.recentRate || 0
    });
    
    this.timeSeries.responseTime.push({
      timestamp: now,
      value: this.metrics.api.averageResponseTime
    });
    
    // Remove old data points
    Object.keys(this.timeSeries).forEach(key => {
      this.timeSeries[key] = this.timeSeries[key].filter(
        entry => now - entry.timestamp < maxAge
      );
    });
  }

  async storeInRedis() {
    if (!this.redisClient) return;
    
    try {
      const metricsData = {
        ...this.metrics,
        timeSeries: this.timeSeries
      };
      
      await this.redisClient.setex(
        `metrics:${this.agentId}`,
        300, // TTL 5 minutes
        JSON.stringify(metricsData)
      );
      
    } catch (error) {
      console.warn('⚠️ Failed to store metrics in Redis:', error.message);
    }
  }

  async persistMetrics() {
    try {
      const metricsFile = path.join(this.metricsPath, `${this.agentId}-metrics.json`);
      const data = JSON.stringify(this.metrics, null, 2);
      
      await fs.writeFile(metricsFile, data);
      
      // Also save time series data
      const timeSeriesFile = path.join(this.metricsPath, `${this.agentId}-timeseries.json`);
      const timeSeriesData = JSON.stringify(this.timeSeries, null, 2);
      
      await fs.writeFile(timeSeriesFile, timeSeriesData);
      
      console.log('💾 Metrics persisted to disk');
      
    } catch (error) {
      console.error('❌ Failed to persist metrics:', error);
    }
  }

  checkAlerts() {
    const alerts = [];
    
    // Memory usage alerts
    const memoryPercentage = this.metrics.resources.memoryUsage.percentage;
    if (memoryPercentage >= this.alertThresholds.memory.critical) {
      alerts.push({
        type: 'critical',
        category: 'memory',
        message: `Critical memory usage: ${memoryPercentage}%`,
        value: memoryPercentage,
        threshold: this.alertThresholds.memory.critical
      });
    } else if (memoryPercentage >= this.alertThresholds.memory.warning) {
      alerts.push({
        type: 'warning',
        category: 'memory',
        message: `High memory usage: ${memoryPercentage}%`,
        value: memoryPercentage,
        threshold: this.alertThresholds.memory.warning
      });
    }
    
    // Task failure rate alerts
    const failureRate = 100 - this.metrics.performance.successRate;
    if (failureRate >= this.alertThresholds.taskFailureRate.critical) {
      alerts.push({
        type: 'critical',
        category: 'performance',
        message: `Critical task failure rate: ${failureRate}%`,
        value: failureRate,
        threshold: this.alertThresholds.taskFailureRate.critical
      });
    } else if (failureRate >= this.alertThresholds.taskFailureRate.warning) {
      alerts.push({
        type: 'warning',
        category: 'performance',
        message: `High task failure rate: ${failureRate}%`,
        value: failureRate,
        threshold: this.alertThresholds.taskFailureRate.warning
      });
    }
    
    // Queue depth alerts
    const queueDepth = this.metrics.resources.queueDepth;
    if (queueDepth >= this.alertThresholds.queueDepth.critical) {
      alerts.push({
        type: 'critical',
        category: 'queue',
        message: `Critical queue depth: ${queueDepth} tasks`,
        value: queueDepth,
        threshold: this.alertThresholds.queueDepth.critical
      });
    } else if (queueDepth >= this.alertThresholds.queueDepth.warning) {
      alerts.push({
        type: 'warning',
        category: 'queue',
        message: `High queue depth: ${queueDepth} tasks`,
        value: queueDepth,
        threshold: this.alertThresholds.queueDepth.warning
      });
    }
    
    // Error rate alerts
    const errorRate = this.metrics.errors.recentRate || 0;
    if (errorRate >= this.alertThresholds.errorRate.critical) {
      alerts.push({
        type: 'critical',
        category: 'errors',
        message: `Critical error rate: ${errorRate} errors/minute`,
        value: errorRate,
        threshold: this.alertThresholds.errorRate.critical
      });
    } else if (errorRate >= this.alertThresholds.errorRate.warning) {
      alerts.push({
        type: 'warning',
        category: 'errors',
        message: `High error rate: ${errorRate} errors/minute`,
        value: errorRate,
        threshold: this.alertThresholds.errorRate.warning
      });
    }
    
    // Emit alerts
    alerts.forEach(alert => {
      this.emit('alert', alert);
      console.log(`🚨 ${alert.type.toUpperCase()} ALERT: ${alert.message}`);
    });
    
    // Store alerts in Redis
    if (alerts.length > 0) {
      this.storeAlerts(alerts);
    }
  }

  async storeAlerts(alerts) {
    if (!this.redisClient) return;
    
    try {
      const alertData = {
        agentId: this.agentId,
        timestamp: Date.now(),
        alerts: alerts
      };
      
      await this.redisClient.lpush('alerts:active', JSON.stringify(alertData));
      await this.redisClient.ltrim('alerts:active', 0, 99); // Keep last 100 alerts
      
    } catch (error) {
      console.warn('⚠️ Failed to store alerts:', error.message);
    }
  }

  // Public methods for recording metrics

  recordTaskStart(taskId) {
    this.metrics.performance.tasksActive++;
  }

  recordTaskComplete(taskId, duration) {
    this.metrics.performance.tasksCompleted++;
    this.metrics.performance.tasksActive = Math.max(0, this.metrics.performance.tasksActive - 1);
    this.metrics.performance.totalProcessingTime += duration;
    
    // Update average duration
    const totalTasks = this.metrics.performance.tasksCompleted;
    this.metrics.performance.averageTaskDuration = Math.round(
      this.metrics.performance.totalProcessingTime / totalTasks
    );
  }

  recordTaskFailure(taskId, duration, error) {
    this.metrics.performance.tasksFailed++;
    this.metrics.performance.tasksActive = Math.max(0, this.metrics.performance.tasksActive - 1);
    
    // Record error
    this.recordError(error, 'task_failure');
  }

  recordApiCall(success, responseTime) {
    this.metrics.api.callsTotal++;
    
    if (success) {
      this.metrics.api.callsSuccessful++;
    } else {
      this.metrics.api.callsFailed++;
    }
    
    // Update average response time
    const totalCalls = this.metrics.api.callsTotal;
    this.metrics.api.averageResponseTime = Math.round(
      ((this.metrics.api.averageResponseTime * (totalCalls - 1)) + responseTime) / totalCalls
    );
  }

  recordRateLimitHit() {
    this.metrics.api.rateLimitHits++;
  }

  recordError(error, category = 'general') {
    this.metrics.errors.total++;
    
    // Count by type
    const errorType = error.name || 'UnknownError';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    
    // Add to recent errors
    this.metrics.errors.recent.push({
      timestamp: Date.now(),
      type: errorType,
      message: error.message,
      category: category
    });
    
    // Keep only last 100 errors
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
    }
  }

  recordCollaborationMessage(type) {
    if (type === 'published') {
      this.metrics.collaboration.messagesPublished++;
    } else if (type === 'received') {
      this.metrics.collaboration.messagesReceived++;
    }
  }

  recordCollaboration(type) {
    if (type === 'initiated') {
      this.metrics.collaboration.collaborationsInitiated++;
    } else if (type === 'completed') {
      this.metrics.collaboration.collaborationsCompleted++;
    }
  }

  // Getter methods for external access

  getMetrics() {
    return { ...this.metrics };
  }

  getTimeSeries() {
    return { ...this.timeSeries };
  }

  getSummary() {
    return {
      agentId: this.agentId,
      status: this.getHealthStatus(),
      uptime: this.metrics.system.uptime,
      performance: {
        tasksCompleted: this.metrics.performance.tasksCompleted,
        successRate: this.metrics.performance.successRate,
        averageTaskDuration: this.metrics.performance.averageTaskDuration,
        tasksPerMinute: this.metrics.performance.tasksPerMinute
      },
      resources: {
        memoryUsage: this.metrics.resources.memoryUsage.percentage,
        queueDepth: this.metrics.resources.queueDepth
      },
      lastUpdate: this.metrics.system.lastUpdate
    };
  }

  getHealthStatus() {
    const memoryPercentage = this.metrics.resources.memoryUsage.percentage;
    const failureRate = 100 - this.metrics.performance.successRate;
    const errorRate = this.metrics.errors.recentRate || 0;
    
    if (memoryPercentage >= 90 || failureRate >= 25 || errorRate >= 15) {
      return 'critical';
    } else if (memoryPercentage >= 70 || failureRate >= 10 || errorRate >= 5) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down Metrics Collector...');
    
    this.stopCollection();
    
    // Final persistence
    await this.persistMetrics();
    
    console.log('✅ Metrics Collector shutdown complete');
  }
}

module.exports = MetricsCollector;