#!/usr/bin/env node

/**
 * API Health Monitor
 * 
 * Real-time monitoring and alerting for API key health
 */

const Redis = require('ioredis');
const axios = require('axios');
const EventEmitter = require('events');
const express = require('express');
const WebSocket = require('ws');

class APIHealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.healthChecks = new Map();
    this.alerts = [];
    this.monitoringInterval = 60000; // 1 minute
    this.alertThresholds = {
      errorRate: 0.2,      // 20% error rate
      latency: 5000,       // 5 seconds
      consecutive: 3       // 3 consecutive failures
    };
  }

  /**
   * Define health check endpoints
   */
  getHealthEndpoints() {
    return {
      'claude-3-opus': {
        name: 'Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: (key) => ({
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }),
        body: {
          model: 'claude-3-opus-20240229',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        },
        timeout: 10000
      },
      'gpt-4o': {
        name: 'OpenAI GPT-4',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: (key) => ({
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }),
        body: {
          model: 'gpt-4o',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        },
        timeout: 10000
      },
      'deepseek-coder': {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        method: 'POST',
        headers: (key) => ({
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }),
        body: {
          model: 'deepseek-coder',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        },
        timeout: 10000
      },
      'command-r-plus': {
        name: 'Mistral',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        method: 'POST',
        headers: (key) => ({
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }),
        body: {
          model: 'mistral-large-latest',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        },
        timeout: 10000
      },
      'gemini-pro': {
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        method: 'POST',
        headers: () => ({
          'Content-Type': 'application/json'
        }),
        body: {
          contents: [{
            parts: [{ text: 'test' }]
          }]
        },
        params: (key) => ({ key }),
        timeout: 10000
      }
    };
  }

  /**
   * Perform health check for a specific API key
   */
  async checkHealth(model, key, keyIndex) {
    const endpoint = this.getHealthEndpoints()[model];
    if (!endpoint) return null;
    
    const checkId = `${model}:${keyIndex}`;
    const startTime = Date.now();
    
    try {
      const config = {
        method: endpoint.method,
        url: endpoint.endpoint,
        headers: endpoint.headers(key),
        data: endpoint.body,
        timeout: endpoint.timeout
      };
      
      if (endpoint.params) {
        config.params = endpoint.params(key);
      }
      
      const response = await axios(config);
      const latency = Date.now() - startTime;
      
      const result = {
        status: 'healthy',
        statusCode: response.status,
        latency,
        timestamp: new Date(),
        rateLimit: {
          remaining: response.headers['x-ratelimit-remaining'],
          reset: response.headers['x-ratelimit-reset']
        }
      };
      
      // Update health status
      await this.updateHealthStatus(checkId, result);
      
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      
      const result = {
        status: 'unhealthy',
        statusCode: error.response?.status || 0,
        error: error.response?.data?.error || error.message,
        latency,
        timestamp: new Date()
      };
      
      // Update health status
      await this.updateHealthStatus(checkId, result);
      
      // Check if we need to raise an alert
      await this.checkAlertConditions(checkId, result);
      
      return result;
    }
  }

  /**
   * Update health status in Redis
   */
  async updateHealthStatus(checkId, result) {
    const key = `health:status:${checkId}`;
    const historyKey = `health:history:${checkId}`;
    
    // Store current status
    await this.redis.set(key, JSON.stringify(result), 'EX', 3600);
    
    // Add to history
    await this.redis.zadd(historyKey, Date.now(), JSON.stringify(result));
    
    // Keep only last 100 entries
    await this.redis.zremrangebyrank(historyKey, 0, -101);
    
    // Update metrics
    if (result.status === 'healthy') {
      await this.redis.incr(`health:metrics:${checkId}:success`);
    } else {
      await this.redis.incr(`health:metrics:${checkId}:failures`);
    }
    
    await this.redis.lpush(`health:metrics:${checkId}:latencies`, result.latency);
    await this.redis.ltrim(`health:metrics:${checkId}:latencies`, 0, 99);
  }

  /**
   * Check if alert conditions are met
   */
  async checkAlertConditions(checkId, result) {
    const [model, keyIndex] = checkId.split(':');
    
    // Get recent history
    const historyKey = `health:history:${checkId}`;
    const recentHistory = await this.redis.zrevrange(historyKey, 0, 9);
    
    const failures = recentHistory.filter(entry => {
      const data = JSON.parse(entry);
      return data.status === 'unhealthy';
    }).length;
    
    // Check consecutive failures
    if (failures >= this.alertThresholds.consecutive) {
      await this.raiseAlert({
        type: 'consecutive_failures',
        severity: 'high',
        model,
        keyIndex,
        message: `API key ${model}:${keyIndex} has failed ${failures} consecutive health checks`,
        details: result
      });
    }
    
    // Check error rate
    const totalChecks = await this.redis.get(`health:metrics:${checkId}:success`) || 0;
    const totalFailures = await this.redis.get(`health:metrics:${checkId}:failures`) || 0;
    const errorRate = totalFailures / (parseInt(totalChecks) + parseInt(totalFailures));
    
    if (errorRate > this.alertThresholds.errorRate) {
      await this.raiseAlert({
        type: 'high_error_rate',
        severity: 'medium',
        model,
        keyIndex,
        message: `API key ${model}:${keyIndex} has ${(errorRate * 100).toFixed(1)}% error rate`,
        errorRate
      });
    }
    
    // Check latency
    if (result.latency > this.alertThresholds.latency) {
      await this.raiseAlert({
        type: 'high_latency',
        severity: 'low',
        model,
        keyIndex,
        message: `API key ${model}:${keyIndex} has high latency: ${result.latency}ms`,
        latency: result.latency
      });
    }
  }

  /**
   * Raise an alert
   */
  async raiseAlert(alert) {
    alert.timestamp = new Date();
    alert.id = `${alert.type}:${alert.model}:${alert.keyIndex}:${Date.now()}`;
    
    // Store alert
    this.alerts.push(alert);
    await this.redis.lpush('health:alerts', JSON.stringify(alert));
    await this.redis.ltrim('health:alerts', 0, 99);
    
    // Emit alert event
    this.emit('alert', alert);
    
    console.log(`🚨 ALERT [${alert.severity}]: ${alert.message}`);
  }

  /**
   * Get health summary
   */
  async getHealthSummary() {
    const summary = {
      timestamp: new Date(),
      providers: {},
      alerts: []
    };
    
    // Get token pool
    const tokenPool = await this.loadTokenPool();
    
    for (const [model, keys] of Object.entries(tokenPool)) {
      summary.providers[model] = {
        name: this.getHealthEndpoints()[model]?.name || model,
        keys: []
      };
      
      for (let i = 0; i < keys.length; i++) {
        const checkId = `${model}:${i}`;
        const status = await this.redis.get(`health:status:${checkId}`);
        const successCount = await this.redis.get(`health:metrics:${checkId}:success`) || 0;
        const failureCount = await this.redis.get(`health:metrics:${checkId}:failures`) || 0;
        const latencies = await this.redis.lrange(`health:metrics:${checkId}:latencies`, 0, -1);
        
        const avgLatency = latencies.length > 0
          ? latencies.reduce((sum, l) => sum + parseInt(l), 0) / latencies.length
          : 0;
        
        summary.providers[model].keys.push({
          index: i,
          status: status ? JSON.parse(status).status : 'unknown',
          lastCheck: status ? JSON.parse(status).timestamp : null,
          metrics: {
            successCount: parseInt(successCount),
            failureCount: parseInt(failureCount),
            successRate: parseInt(successCount) / (parseInt(successCount) + parseInt(failureCount)) || 0,
            avgLatency: Math.round(avgLatency)
          }
        });
      }
    }
    
    // Get recent alerts
    const recentAlerts = await this.redis.lrange('health:alerts', 0, 9);
    summary.alerts = recentAlerts.map(a => JSON.parse(a));
    
    return summary;
  }

  /**
   * Load token pool
   */
  async loadTokenPool() {
    const fs = require('fs').promises;
    const path = require('path');
    const tokenPoolPath = process.env.TOKENPOOL_PATH || path.join(__dirname, '../shared/tokenpool.json');
    
    try {
      const content = await fs.readFile(tokenPoolPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load token pool:', error);
      return {};
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log('🏥 Starting API health monitoring...');
    
    const performChecks = async () => {
      const tokenPool = await this.loadTokenPool();
      
      for (const [model, keys] of Object.entries(tokenPool)) {
        for (let i = 0; i < keys.length; i++) {
          await this.checkHealth(model, keys[i], i);
        }
      }
    };
    
    // Initial check
    await performChecks();
    
    // Schedule periodic checks
    setInterval(performChecks, this.monitoringInterval);
  }

  /**
   * Start web dashboard
   */
  async startDashboard() {
    const app = express();
    const server = require('http').createServer(app);
    const wss = new WebSocket.Server({ server });
    
    // Serve static files
    app.use(express.static(require('path').join(__dirname, '../dashboard/public')));
    
    // API endpoints
    app.get('/api/health/summary', async (req, res) => {
      const summary = await this.getHealthSummary();
      res.json(summary);
    });
    
    app.get('/api/health/alerts', async (req, res) => {
      const alerts = await this.redis.lrange('health:alerts', 0, 49);
      res.json(alerts.map(a => JSON.parse(a)));
    });
    
    app.get('/api/health/:model/:keyIndex', async (req, res) => {
      const checkId = `${req.params.model}:${req.params.keyIndex}`;
      const status = await this.redis.get(`health:status:${checkId}`);
      const history = await this.redis.zrevrange(`health:history:${checkId}`, 0, 49);
      
      res.json({
        current: status ? JSON.parse(status) : null,
        history: history.map(h => JSON.parse(h))
      });
    });
    
    // WebSocket for real-time updates
    wss.on('connection', (ws) => {
      console.log('📡 New dashboard connection');
      
      // Send initial summary
      this.getHealthSummary().then(summary => {
        ws.send(JSON.stringify({ type: 'summary', data: summary }));
      });
      
      // Forward alerts
      const alertHandler = (alert) => {
        ws.send(JSON.stringify({ type: 'alert', data: alert }));
      };
      
      this.on('alert', alertHandler);
      
      ws.on('close', () => {
        this.off('alert', alertHandler);
      });
    });
    
    const port = process.env.HEALTH_DASHBOARD_PORT || 3002;
    server.listen(port, () => {
      console.log(`📊 Health dashboard running on http://localhost:${port}`);
    });
  }

  /**
   * Cleanup
   */
  async cleanup() {
    await this.redis.quit();
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new APIHealthMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      // One-time health check
      (async () => {
        const tokenPool = await monitor.loadTokenPool();
        console.log('\n🏥 API Health Check Results:\n');
        
        for (const [model, keys] of Object.entries(tokenPool)) {
          console.log(`\n${model}:`);
          for (let i = 0; i < keys.length; i++) {
            const result = await monitor.checkHealth(model, keys[i], i);
            console.log(`  Key ${i}: ${result.status} (${result.latency}ms)`);
            if (result.error) {
              console.log(`    Error: ${result.error}`);
            }
          }
        }
        
        await monitor.cleanup();
      })();
      break;
      
    case 'summary':
      // Show health summary
      (async () => {
        const summary = await monitor.getHealthSummary();
        console.log('\n📊 API Health Summary:\n');
        console.log(JSON.stringify(summary, null, 2));
        await monitor.cleanup();
      })();
      break;
      
    case 'monitor':
      // Start continuous monitoring
      monitor.startMonitoring();
      monitor.startDashboard();
      
      // Alert notifications
      monitor.on('alert', (alert) => {
        console.log(`\n🚨 ALERT [${alert.severity}]: ${alert.message}`);
      });
      
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping health monitor...');
        await monitor.cleanup();
        process.exit(0);
      });
      break;
      
    default:
      console.log(`
API Health Monitor

Usage:
  node api-health-monitor.js check    - One-time health check
  node api-health-monitor.js summary  - Show health summary
  node api-health-monitor.js monitor  - Start continuous monitoring

The monitor command also starts a web dashboard on http://localhost:3002
`);
      process.exit(0);
  }
}

module.exports = APIHealthMonitor;