/**
 * Enhanced Monitoring and Alerting System
 * Provides comprehensive metrics, real-time alerts, and performance analytics
 */

const EventEmitter = require('events');

class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.timeSeries = new Map();
    this.alerts = new Map();
    this.thresholds = new Map();
    
    this.initializeMetrics();
    this.startCollection();
  }

  initializeMetrics() {
    // System metrics
    this.registerMetric('system.cpu_usage', { type: 'gauge', unit: 'percentage' });
    this.registerMetric('system.memory_usage', { type: 'gauge', unit: 'bytes' });
    this.registerMetric('system.disk_usage', { type: 'gauge', unit: 'percentage' });
    this.registerMetric('system.network_io', { type: 'counter', unit: 'bytes' });
    
    // Agent metrics
    this.registerMetric('agents.total_count', { type: 'gauge', unit: 'count' });
    this.registerMetric('agents.healthy_count', { type: 'gauge', unit: 'count' });
    this.registerMetric('agents.response_time', { type: 'histogram', unit: 'milliseconds' });
    this.registerMetric('agents.error_rate', { type: 'gauge', unit: 'percentage' });
    this.registerMetric('agents.throughput', { type: 'counter', unit: 'requests_per_second' });
    
    // API metrics
    this.registerMetric('api.requests_total', { type: 'counter', unit: 'count' });
    this.registerMetric('api.requests_duration', { type: 'histogram', unit: 'milliseconds' });
    this.registerMetric('api.errors_total', { type: 'counter', unit: 'count' });
    this.registerMetric('api.rate_limit_hits', { type: 'counter', unit: 'count' });
    
    // Redis metrics
    this.registerMetric('redis.connections', { type: 'gauge', unit: 'count' });
    this.registerMetric('redis.memory_usage', { type: 'gauge', unit: 'bytes' });
    this.registerMetric('redis.commands_per_second', { type: 'gauge', unit: 'ops' });
    
    // Queue metrics
    this.registerMetric('queue.depth', { type: 'gauge', unit: 'count' });
    this.registerMetric('queue.processing_time', { type: 'histogram', unit: 'milliseconds' });
    this.registerMetric('queue.failed_jobs', { type: 'counter', unit: 'count' });
  }

  registerMetric(name, config) {
    this.metrics.set(name, {
      ...config,
      value: config.type === 'counter' ? 0 : null,
      timestamp: Date.now(),
      history: []
    });
  }

  recordMetric(name, value, labels = {}) {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Unknown metric: ${name}`);
      return;
    }

    const timestamp = Date.now();
    const entry = { value, labels, timestamp };

    if (metric.type === 'counter') {
      metric.value += value;
    } else {
      metric.value = value;
    }

    metric.timestamp = timestamp;
    metric.history.push(entry);

    // Keep only last 1000 entries
    if (metric.history.length > 1000) {
      metric.history.shift();
    }

    // Store in time series
    this.storeTimeSeries(name, entry);
    
    // Check thresholds
    this.checkThresholds(name, value, labels);
  }

  storeTimeSeries(name, entry) {
    if (!this.timeSeries.has(name)) {
      this.timeSeries.set(name, []);
    }
    
    const series = this.timeSeries.get(name);
    series.push(entry);
    
    // Keep only last 24 hours of data
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    while (series.length > 0 && series[0].timestamp < cutoff) {
      series.shift();
    }
  }

  setThreshold(metricName, config) {
    this.thresholds.set(metricName, {
      warning: config.warning,
      critical: config.critical,
      operator: config.operator || 'gt', // gt, lt, eq
      duration: config.duration || 0, // How long threshold must be breached
      ...config
    });
  }

  checkThresholds(metricName, value, labels) {
    const threshold = this.thresholds.get(metricName);
    if (!threshold) return;

    const isBreached = this.evaluateThreshold(value, threshold);
    if (!isBreached) return;

    const alertKey = `${metricName}_${JSON.stringify(labels)}`;
    const existingAlert = this.alerts.get(alertKey);
    
    if (!existingAlert) {
      const alert = {
        id: this.generateAlertId(),
        metricName,
        value,
        labels,
        threshold,
        severity: this.getSeverity(value, threshold),
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false
      };
      
      this.alerts.set(alertKey, alert);
      this.emitAlert(alert);
    } else if (!existingAlert.resolved) {
      // Update existing alert
      existingAlert.value = value;
      existingAlert.timestamp = Date.now();
      existingAlert.severity = this.getSeverity(value, threshold);
    }
  }

  evaluateThreshold(value, threshold) {
    switch (threshold.operator) {
      case 'gt': return value > threshold.critical || value > threshold.warning;
      case 'lt': return value < threshold.critical || value < threshold.warning;
      case 'eq': return value === threshold.critical || value === threshold.warning;
      default: return false;
    }
  }

  getSeverity(value, threshold) {
    if (threshold.critical !== undefined) {
      switch (threshold.operator) {
        case 'gt': return value > threshold.critical ? 'critical' : 'warning';
        case 'lt': return value < threshold.critical ? 'critical' : 'warning';
        case 'eq': return value === threshold.critical ? 'critical' : 'warning';
      }
    }
    return 'warning';
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  emitAlert(alert) {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.metricName} = ${alert.value}`);
    
    // Emit event for external handlers
    process.emit('monitoring:alert', alert);
  }

  startCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
    
    // Collect agent metrics every 15 seconds
    setInterval(() => {
      this.collectAgentMetrics();
    }, 15000);
    
    // Clean up old alerts every 5 minutes
    setInterval(() => {
      this.cleanupAlerts();
    }, 5 * 60 * 1000);
  }

  async collectSystemMetrics() {
    try {
      const os = require('os');
      const process = require('process');
      
      // CPU usage
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      this.recordMetric('system.cpu_usage', cpuPercent);
      
      // Memory usage
      const memUsage = process.memoryUsage();
      this.recordMetric('system.memory_usage', memUsage.heapUsed);
      
      // Load average
      const loadAvg = os.loadavg()[0];
      this.recordMetric('system.load_average', loadAvg);
      
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  async collectAgentMetrics() {
    try {
      // This would integrate with your agent coordinator
      // For now, simulate some metrics
      const agentCount = 5; // Get from coordinator
      const healthyCount = 4; // Get from health checks
      
      this.recordMetric('agents.total_count', agentCount);
      this.recordMetric('agents.healthy_count', healthyCount);
      this.recordMetric('agents.error_rate', ((agentCount - healthyCount) / agentCount) * 100);
      
    } catch (error) {
      console.error('Error collecting agent metrics:', error);
    }
  }

  cleanupAlerts() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [key, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.timestamp < cutoff) {
        this.alerts.delete(key);
      }
    }
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  getAllMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics.entries()) {
      result[name] = {
        value: metric.value,
        timestamp: metric.timestamp,
        type: metric.type,
        unit: metric.unit
      };
    }
    return result;
  }

  getTimeSeries(name, duration = 3600000) { // Default 1 hour
    const series = this.timeSeries.get(name) || [];
    const cutoff = Date.now() - duration;
    return series.filter(entry => entry.timestamp >= cutoff);
  }

  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  acknowledgeAlert(alertId) {
    for (const alert of this.alerts.values()) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        alert.acknowledgedAt = Date.now();
        return true;
      }
    }
    return false;
  }

  resolveAlert(alertId) {
    for (const alert of this.alerts.values()) {
      if (alert.id === alertId) {
        alert.resolved = true;
        alert.resolvedAt = Date.now();
        return true;
      }
    }
    return false;
  }
}

class PerformanceAnalyzer {
  constructor(metricsCollector) {
    this.metrics = metricsCollector;
    this.analysis = new Map();
  }

  analyzePerformance() {
    return {
      systemHealth: this.analyzeSystemHealth(),
      agentPerformance: this.analyzeAgentPerformance(),
      apiPerformance: this.analyzeAPIPerformance(),
      trends: this.analyzeTrends(),
      recommendations: this.generateRecommendations()
    };
  }

  analyzeSystemHealth() {
    const cpuMetric = this.metrics.getMetric('system.cpu_usage');
    const memoryMetric = this.metrics.getMetric('system.memory_usage');
    
    let score = 100;
    const issues = [];
    
    if (cpuMetric?.value > 80) {
      score -= 30;
      issues.push('High CPU usage detected');
    }
    
    if (memoryMetric?.value > 1024 * 1024 * 1024) { // 1GB
      score -= 20;
      issues.push('High memory usage detected');
    }
    
    return {
      score: Math.max(0, score),
      status: score > 80 ? 'healthy' : score > 60 ? 'warning' : 'critical',
      issues
    };
  }

  analyzeAgentPerformance() {
    const totalAgents = this.metrics.getMetric('agents.total_count')?.value || 0;
    const healthyAgents = this.metrics.getMetric('agents.healthy_count')?.value || 0;
    const errorRate = this.metrics.getMetric('agents.error_rate')?.value || 0;
    
    const availability = totalAgents > 0 ? (healthyAgents / totalAgents) * 100 : 0;
    
    return {
      availability,
      errorRate,
      totalAgents,
      healthyAgents,
      status: availability > 90 ? 'excellent' : availability > 75 ? 'good' : 'poor'
    };
  }

  analyzeAPIPerformance() {
    const requestDuration = this.metrics.getTimeSeries('api.requests_duration', 3600000); // Last hour
    const errorCount = this.metrics.getTimeSeries('api.errors_total', 3600000);
    
    if (requestDuration.length === 0) {
      return { status: 'no_data' };
    }
    
    const avgDuration = requestDuration.reduce((sum, entry) => sum + entry.value, 0) / requestDuration.length;
    const p95Duration = this.calculatePercentile(requestDuration.map(e => e.value), 95);
    
    return {
      averageResponseTime: Math.round(avgDuration),
      p95ResponseTime: Math.round(p95Duration),
      errorCount: errorCount.length,
      status: avgDuration < 200 ? 'fast' : avgDuration < 500 ? 'acceptable' : 'slow'
    };
  }

  calculatePercentile(values, percentile) {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  analyzeTrends() {
    const trends = {};
    
    // Analyze CPU trend
    const cpuSeries = this.metrics.getTimeSeries('system.cpu_usage', 3600000);
    if (cpuSeries.length > 10) {
      trends.cpu = this.calculateTrend(cpuSeries.map(e => e.value));
    }
    
    // Analyze response time trend
    const responseSeries = this.metrics.getTimeSeries('api.requests_duration', 3600000);
    if (responseSeries.length > 10) {
      trends.responseTime = this.calculateTrend(responseSeries.map(e => e.value));
    }
    
    return trends;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'insufficient_data';
    
    const recent = values.slice(-10); // Last 10 values
    const older = values.slice(-20, -10); // Previous 10 values
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  generateRecommendations() {
    const recommendations = [];
    const systemHealth = this.analyzeSystemHealth();
    const agentPerf = this.analyzeAgentPerformance();
    const apiPerf = this.analyzeAPIPerformance();
    
    if (systemHealth.score < 70) {
      recommendations.push({
        priority: 'high',
        category: 'system',
        message: 'System resources are under stress. Consider scaling up or optimizing resource usage.',
        action: 'scale_up'
      });
    }
    
    if (agentPerf.availability < 80) {
      recommendations.push({
        priority: 'high',
        category: 'agents',
        message: 'Agent availability is low. Check agent health and consider restart or scaling.',
        action: 'check_agents'
      });
    }
    
    if (apiPerf.averageResponseTime > 500) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: 'API response times are high. Consider optimizing queries or adding caching.',
        action: 'optimize_api'
      });
    }
    
    return recommendations;
  }
}

class AlertManager extends EventEmitter {
  constructor(metricsCollector) {
    super();
    this.metrics = metricsCollector;
    this.channels = new Map();
    this.rules = new Map();
    
    this.setupDefaultThresholds();
    this.setupDefaultChannels();
  }

  setupDefaultThresholds() {
    // System thresholds
    this.metrics.setThreshold('system.cpu_usage', {
      warning: 70,
      critical: 90,
      operator: 'gt',
      duration: 60000 // 1 minute
    });
    
    this.metrics.setThreshold('system.memory_usage', {
      warning: 1024 * 1024 * 1024, // 1GB
      critical: 2 * 1024 * 1024 * 1024, // 2GB
      operator: 'gt'
    });
    
    // Agent thresholds
    this.metrics.setThreshold('agents.error_rate', {
      warning: 10,
      critical: 25,
      operator: 'gt'
    });
    
    // API thresholds
    this.metrics.setThreshold('api.requests_duration', {
      warning: 500,
      critical: 1000,
      operator: 'gt'
    });
  }

  setupDefaultChannels() {
    // Console logging channel
    this.addChannel('console', {
      type: 'console',
      enabled: true,
      handler: (alert) => {
        console.log(`🚨 [${alert.severity.toUpperCase()}] ${alert.metricName}: ${alert.value}`);
      }
    });
    
    // File logging channel
    this.addChannel('file', {
      type: 'file',
      enabled: true,
      path: './logs/alerts.log',
      handler: (alert) => {
        const fs = require('fs');
        const logEntry = `${new Date().toISOString()} [${alert.severity.toUpperCase()}] ${alert.metricName}: ${alert.value}\n`;
        fs.appendFileSync('./logs/alerts.log', logEntry);
      }
    });
  }

  addChannel(name, config) {
    this.channels.set(name, config);
  }

  removeChannel(name) {
    this.channels.delete(name);
  }

  sendAlert(alert) {
    for (const [name, channel] of this.channels.entries()) {
      if (channel.enabled) {
        try {
          channel.handler(alert);
        } catch (error) {
          console.error(`Error sending alert via ${name}:`, error);
        }
      }
    }
  }
}

// Global monitoring system
const globalMonitoring = {
  metrics: new MetricsCollector(),
  analyzer: null,
  alerts: null,
  
  initialize() {
    this.analyzer = new PerformanceAnalyzer(this.metrics);
    this.alerts = new AlertManager(this.metrics);
    
    // Listen for alerts and send them
    process.on('monitoring:alert', (alert) => {
      this.alerts.sendAlert(alert);
    });
    
    return this;
  }
};

module.exports = {
  MetricsCollector,
  PerformanceAnalyzer,
  AlertManager,
  globalMonitoring
};