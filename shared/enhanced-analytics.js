/**
 * Enhanced Analytics and Logging System
 * Provides comprehensive data collection, analysis, and insights
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class AnalyticsEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.dataDir = options.dataDir || './analytics-data';
    this.retentionDays = options.retentionDays || 30;
    this.batchSize = options.batchSize || 1000;
    this.flushInterval = options.flushInterval || 60000; // 1 minute
    
    this.eventBuffer = [];
    this.metrics = new Map();
    this.sessions = new Map();
    this.insights = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'events'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'metrics'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'sessions'), { recursive: true });
      
      this.startPeriodicFlush();
      this.startDataCleanup();
      
      console.log('📊 Analytics engine initialized');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // Event Tracking
  trackEvent(eventType, data = {}, context = {}) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: Date.now(),
      data: { ...data },
      context: {
        sessionId: context.sessionId,
        userId: context.userId,
        agentId: context.agentId,
        ip: context.ip,
        userAgent: context.userAgent,
        ...context
      },
      metadata: {
        source: 'ezaigents',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    this.eventBuffer.push(event);
    this.emit('event:tracked', event);

    // Auto-flush if buffer is full
    if (this.eventBuffer.length >= this.batchSize) {
      this.flushEvents();
    }

    return event.id;
  }

  // Session Management
  startSession(sessionId, context = {}) {
    const session = {
      id: sessionId,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      events: [],
      context: { ...context },
      metrics: {
        eventCount: 0,
        errorCount: 0,
        apiCalls: 0,
        responseTime: []
      }
    };

    this.sessions.set(sessionId, session);
    this.trackEvent('session:started', { sessionId }, context);
    
    return session;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    this.trackEvent('session:ended', {
      sessionId,
      duration: session.duration,
      eventCount: session.metrics.eventCount
    }, session.context);

    // Archive session
    this.archiveSession(session);
    this.sessions.delete(sessionId);

    return session;
  }

  // Agent Analytics
  trackAgentActivity(agentId, activity, data = {}) {
    const activityData = {
      agentId,
      activity,
      timestamp: Date.now(),
      ...data
    };

    this.trackEvent('agent:activity', activityData, { agentId });
    this.updateAgentMetrics(agentId, activity, data);
  }

  updateAgentMetrics(agentId, activity, data) {
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, {
        totalActivities: 0,
        successfulActivities: 0,
        failedActivities: 0,
        averageResponseTime: 0,
        responseTimes: [],
        activitiesByType: {},
        lastActivity: null,
        uptime: Date.now(),
        errors: []
      });
    }

    const metrics = this.metrics.get(agentId);
    metrics.totalActivities++;
    metrics.lastActivity = Date.now();

    // Track by activity type
    if (!metrics.activitiesByType[activity]) {
      metrics.activitiesByType[activity] = 0;
    }
    metrics.activitiesByType[activity]++;

    // Track success/failure
    if (data.success !== false) {
      metrics.successfulActivities++;
    } else {
      metrics.failedActivities++;
      if (data.error) {
        metrics.errors.push({
          error: data.error,
          timestamp: Date.now(),
          activity
        });
      }
    }

    // Track response time
    if (data.responseTime) {
      metrics.responseTimes.push(data.responseTime);
      if (metrics.responseTimes.length > 100) {
        metrics.responseTimes.shift();
      }
      
      const avgTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
      metrics.averageResponseTime = avgTime;
    }
  }

  // API Analytics
  trackAPICall(endpoint, method, statusCode, responseTime, context = {}) {
    const apiData = {
      endpoint,
      method,
      statusCode,
      responseTime,
      success: statusCode >= 200 && statusCode < 400
    };

    this.trackEvent('api:call', apiData, context);
    this.updateAPIMetrics(endpoint, method, statusCode, responseTime);
  }

  updateAPIMetrics(endpoint, method, statusCode, responseTime) {
    const key = `${method}:${endpoint}`;
    
    if (!this.metrics.has(`api:${key}`)) {
      this.metrics.set(`api:${key}`, {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0,
        responseTimes: [],
        statusCodes: {},
        lastCall: null
      });
    }

    const metrics = this.metrics.get(`api:${key}`);
    metrics.totalCalls++;
    metrics.lastCall = Date.now();

    // Track status codes
    if (!metrics.statusCodes[statusCode]) {
      metrics.statusCodes[statusCode] = 0;
    }
    metrics.statusCodes[statusCode]++;

    // Track success/failure
    if (statusCode >= 200 && statusCode < 400) {
      metrics.successfulCalls++;
    } else {
      metrics.failedCalls++;
    }

    // Track response time
    metrics.responseTimes.push(responseTime);
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes.shift();
    }
    
    const avgTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length;
    metrics.averageResponseTime = avgTime;
  }

  // Error Analytics
  trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      code: error.code,
      stack: error.stack,
      severity: this.classifyErrorSeverity(error),
      category: this.categorizeError(error)
    };

    this.trackEvent('error:occurred', errorData, context);
    this.updateErrorMetrics(errorData);
  }

  classifyErrorSeverity(error) {
    if (error.code === 'AUTHENTICATION_FAILED') return 'critical';
    if (error.status >= 500) return 'high';
    if (error.status >= 400) return 'medium';
    return 'low';
  }

  categorizeError(error) {
    if (error.code === 'NETWORK_ERROR') return 'network';
    if (error.code === 'AUTHENTICATION_FAILED') return 'auth';
    if (error.status >= 500) return 'server';
    if (error.status >= 400) return 'client';
    return 'unknown';
  }

  updateErrorMetrics(errorData) {
    const key = `errors:${errorData.category}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        totalErrors: 0,
        errorsBySeverity: {},
        recentErrors: [],
        errorRate: 0
      });
    }

    const metrics = this.metrics.get(key);
    metrics.totalErrors++;

    if (!metrics.errorsBySeverity[errorData.severity]) {
      metrics.errorsBySeverity[errorData.severity] = 0;
    }
    metrics.errorsBySeverity[errorData.severity]++;

    metrics.recentErrors.push({
      ...errorData,
      timestamp: Date.now()
    });

    if (metrics.recentErrors.length > 50) {
      metrics.recentErrors.shift();
    }
  }

  // Performance Analytics
  generatePerformanceReport(timeRange = '24h') {
    const endTime = Date.now();
    const startTime = endTime - this.parseTimeRange(timeRange);

    const report = {
      timeRange,
      startTime,
      endTime,
      agents: this.getAgentPerformanceMetrics(),
      api: this.getAPIPerformanceMetrics(),
      errors: this.getErrorMetrics(),
      system: this.getSystemMetrics(),
      insights: this.generateInsights()
    };

    return report;
  }

  getAgentPerformanceMetrics() {
    const agentMetrics = {};
    
    for (const [agentId, metrics] of this.metrics.entries()) {
      if (agentId.startsWith('api:')) continue;
      
      const successRate = metrics.totalActivities > 0 
        ? (metrics.successfulActivities / metrics.totalActivities) * 100 
        : 0;

      agentMetrics[agentId] = {
        totalActivities: metrics.totalActivities,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        uptime: Date.now() - metrics.uptime,
        lastActivity: metrics.lastActivity,
        topActivities: this.getTopActivities(metrics.activitiesByType),
        recentErrors: metrics.errors.slice(-5)
      };
    }

    return agentMetrics;
  }

  getAPIPerformanceMetrics() {
    const apiMetrics = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (!key.startsWith('api:')) continue;
      
      const endpoint = key.substring(4);
      const successRate = metrics.totalCalls > 0 
        ? (metrics.successfulCalls / metrics.totalCalls) * 100 
        : 0;

      apiMetrics[endpoint] = {
        totalCalls: metrics.totalCalls,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        lastCall: metrics.lastCall,
        statusCodeDistribution: metrics.statusCodes
      };
    }

    return apiMetrics;
  }

  getErrorMetrics() {
    const errorMetrics = {};
    
    for (const [key, metrics] of this.metrics.entries()) {
      if (!key.startsWith('errors:')) continue;
      
      const category = key.substring(7);
      errorMetrics[category] = {
        totalErrors: metrics.totalErrors,
        errorsBySeverity: metrics.errorsBySeverity,
        recentErrors: metrics.recentErrors.slice(-10)
      };
    }

    return errorMetrics;
  }

  getSystemMetrics() {
    return {
      activeSessions: this.sessions.size,
      bufferedEvents: this.eventBuffer.length,
      totalMetrics: this.metrics.size,
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage()
    };
  }

  generateInsights() {
    const insights = [];

    // Performance insights
    const agentMetrics = this.getAgentPerformanceMetrics();
    for (const [agentId, metrics] of Object.entries(agentMetrics)) {
      if (metrics.successRate < 90) {
        insights.push({
          type: 'performance',
          severity: 'high',
          message: `Agent ${agentId} has low success rate: ${metrics.successRate}%`,
          recommendation: 'Investigate agent health and error logs'
        });
      }
      
      if (metrics.averageResponseTime > 2000) {
        insights.push({
          type: 'performance',
          severity: 'medium',
          message: `Agent ${agentId} has slow response time: ${metrics.averageResponseTime}ms`,
          recommendation: 'Consider performance optimization or scaling'
        });
      }
    }

    // API insights
    const apiMetrics = this.getAPIPerformanceMetrics();
    for (const [endpoint, metrics] of Object.entries(apiMetrics)) {
      if (metrics.successRate < 95) {
        insights.push({
          type: 'api',
          severity: 'high',
          message: `API endpoint ${endpoint} has low success rate: ${metrics.successRate}%`,
          recommendation: 'Check API health and error handling'
        });
      }
    }

    // Error insights
    const errorMetrics = this.getErrorMetrics();
    for (const [category, metrics] of Object.entries(errorMetrics)) {
      if (metrics.totalErrors > 50) {
        insights.push({
          type: 'error',
          severity: 'high',
          message: `High error count in category ${category}: ${metrics.totalErrors}`,
          recommendation: 'Implement error reduction strategies'
        });
      }
    }

    return insights;
  }

  // Utility Methods
  getTopActivities(activitiesByType, limit = 5) {
    return Object.entries(activitiesByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([activity, count]) => ({ activity, count }));
  }

  parseTimeRange(range) {
    const value = parseInt(range);
    const unit = range.slice(-1);
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return 24 * 60 * 60 * 1000; // Default 24 hours
    }
  }

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Data Management
  async flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    const fileName = `events_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filePath = path.join(this.dataDir, 'events', fileName);

    try {
      const lines = events.map(event => JSON.stringify(event)).join('\n') + '\n';
      await fs.appendFile(filePath, lines);
      
      this.emit('events:flushed', { count: events.length, file: fileName });
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  async archiveSession(session) {
    const fileName = `session_${session.id}.json`;
    const filePath = path.join(this.dataDir, 'sessions', fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.error('Failed to archive session:', error);
    }
  }

  startPeriodicFlush() {
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  startDataCleanup() {
    // Clean up old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
  }

  async cleanupOldData() {
    const cutoffDate = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));
    
    try {
      // Clean up old event files
      const eventsDir = path.join(this.dataDir, 'events');
      const eventFiles = await fs.readdir(eventsDir);
      
      for (const file of eventFiles) {
        const filePath = path.join(eventsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old data file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // Export Methods
  async exportData(format = 'json', timeRange = '24h') {
    const report = this.generatePerformanceReport(timeRange);
    
    switch (format) {
      case 'csv':
        return this.exportToCSV(report);
      case 'json':
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  exportToCSV(report) {
    // Simplified CSV export for agents
    const headers = ['Agent ID', 'Total Activities', 'Success Rate', 'Avg Response Time', 'Last Activity'];
    const rows = [headers.join(',')];
    
    for (const [agentId, metrics] of Object.entries(report.agents)) {
      const row = [
        agentId,
        metrics.totalActivities,
        metrics.successRate,
        metrics.averageResponseTime,
        new Date(metrics.lastActivity).toISOString()
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }
}

// Global analytics instance
const globalAnalytics = new AnalyticsEngine();

module.exports = {
  AnalyticsEngine,
  globalAnalytics
};