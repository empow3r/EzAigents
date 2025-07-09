#!/usr/bin/env node

const Redis = require('ioredis');
const { spawn } = require('child_process');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class AutoScaler {
  constructor() {
    this.models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    this.runningAgents = new Map(); // Track running agent processes
    this.scalingHistory = [];
    this.config = {
      minAgents: 1,
      maxAgents: 10,
      scaleUpThreshold: 20,    // Scale up when queue depth > 20
      scaleDownThreshold: 5,   // Scale down when queue depth < 5
      cooldownPeriod: 300,     // 5 minutes between scaling actions
      performanceWindow: 60,   // 1 minute performance window
      costOptimization: true   // Enable cost-based scaling
    };
    this.lastScaleAction = new Map();
  }

  async initialize() {
    console.log('🚀 Initializing Auto-Scaler...');
    
    // Load configuration from Redis
    const savedConfig = await redis.get('autoscaler:config');
    if (savedConfig) {
      this.config = { ...this.config, ...JSON.parse(savedConfig) };
    }
    
    // Initialize agent tracking
    for (const model of this.models) {
      this.runningAgents.set(model, []);
      this.lastScaleAction.set(model, 0);
    }
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('✅ Auto-Scaler initialized');
    console.log(`📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  async startMonitoring() {
    setInterval(async () => {
      try {
        await this.evaluateScaling();
      } catch (error) {
        console.error('❌ Error in scaling evaluation:', error);
      }
    }, 30000); // Check every 30 seconds
    
    // Performance monitoring
    setInterval(async () => {
      try {
        await this.monitorPerformance();
      } catch (error) {
        console.error('❌ Error in performance monitoring:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  async evaluateScaling() {
    console.log('📊 Evaluating scaling decisions...');
    
    for (const model of this.models) {
      const metrics = await this.getModelMetrics(model);
      const decision = await this.makeScalingDecision(model, metrics);
      
      if (decision.action !== 'none') {
        await this.executeScalingAction(model, decision);
      }
    }
  }

  async getModelMetrics(model) {
    const [
      queueDepth,
      processingCount,
      failedCount,
      avgProcessingTime,
      errorRate
    ] = await Promise.all([
      redis.llen(`queue:${model}`),
      redis.llen(`processing:${model}`),
      redis.llen(`queue:${model}:failed`),
      this.getAverageProcessingTime(model),
      this.getErrorRate(model)
    ]);

    const currentAgents = this.runningAgents.get(model).length;
    const totalLoad = queueDepth + processingCount;
    const loadPerAgent = currentAgents > 0 ? totalLoad / currentAgents : totalLoad;

    return {
      model,
      queueDepth,
      processingCount,
      failedCount,
      totalLoad,
      loadPerAgent,
      currentAgents,
      avgProcessingTime,
      errorRate,
      timestamp: Date.now()
    };
  }

  async makeScalingDecision(model, metrics) {
    const now = Date.now();
    const lastAction = this.lastScaleAction.get(model);
    const timeSinceLastAction = now - lastAction;

    // Check cooldown period
    if (timeSinceLastAction < this.config.cooldownPeriod * 1000) {
      return { action: 'none', reason: 'cooldown_period' };
    }

    // Scale up conditions
    if (metrics.queueDepth > this.config.scaleUpThreshold && 
        metrics.currentAgents < this.config.maxAgents) {
      
      const urgency = this.calculateUrgency(metrics);
      const targetAgents = Math.min(
        this.config.maxAgents,
        Math.ceil(metrics.totalLoad / this.config.scaleUpThreshold)
      );
      
      return {
        action: 'scale_up',
        targetAgents,
        urgency,
        reason: `Queue depth ${metrics.queueDepth} > threshold ${this.config.scaleUpThreshold}`
      };
    }

    // Scale down conditions
    if (metrics.queueDepth < this.config.scaleDownThreshold && 
        metrics.currentAgents > this.config.minAgents &&
        metrics.processingCount === 0) {
      
      const targetAgents = Math.max(
        this.config.minAgents,
        Math.ceil(metrics.totalLoad / this.config.scaleDownThreshold) || 1
      );
      
      if (targetAgents < metrics.currentAgents) {
        return {
          action: 'scale_down',
          targetAgents,
          reason: `Queue depth ${metrics.queueDepth} < threshold ${this.config.scaleDownThreshold}`
        };
      }
    }

    // Performance-based scaling
    if (metrics.avgProcessingTime > 300 && metrics.errorRate > 0.1) { // 5 minutes, 10% error rate
      return {
        action: 'scale_up',
        targetAgents: Math.min(this.config.maxAgents, metrics.currentAgents + 1),
        urgency: 'high',
        reason: 'Performance degradation detected'
      };
    }

    return { action: 'none', reason: 'no_scaling_needed' };
  }

  calculateUrgency(metrics) {
    const queueRatio = metrics.queueDepth / this.config.scaleUpThreshold;
    const errorFactor = metrics.errorRate * 10; // Weight error rate heavily
    const timeFactor = metrics.avgProcessingTime / 60; // Convert to minutes
    
    const urgencyScore = queueRatio + errorFactor + timeFactor;
    
    if (urgencyScore > 3) return 'critical';
    if (urgencyScore > 2) return 'high';
    if (urgencyScore > 1) return 'medium';
    return 'low';
  }

  async executeScalingAction(model, decision) {
    const currentAgents = this.runningAgents.get(model).length;
    const targetAgents = decision.targetAgents;
    
    console.log(`🔄 Scaling ${model}: ${currentAgents} → ${targetAgents} agents`);
    console.log(`📝 Reason: ${decision.reason}`);
    
    if (decision.action === 'scale_up') {
      await this.scaleUp(model, targetAgents - currentAgents, decision.urgency);
    } else if (decision.action === 'scale_down') {
      await this.scaleDown(model, currentAgents - targetAgents);
    }
    
    // Record scaling action
    this.lastScaleAction.set(model, Date.now());
    this.recordScalingHistory(model, decision, currentAgents, targetAgents);
    
    // Notify via Redis
    await redis.publish('autoscaler:action', JSON.stringify({
      model,
      action: decision.action,
      from: currentAgents,
      to: targetAgents,
      reason: decision.reason,
      timestamp: new Date().toISOString()
    }));
  }

  async scaleUp(model, count, urgency = 'medium') {
    console.log(`📈 Scaling up ${model} by ${count} agents (urgency: ${urgency})`);
    
    for (let i = 0; i < count; i++) {
      const agentId = `${model}-${Date.now()}-${i}`;
      const agentProcess = await this.startAgent(model, agentId, urgency);
      
      if (agentProcess) {
        this.runningAgents.get(model).push({
          id: agentId,
          process: agentProcess,
          startTime: Date.now(),
          urgency
        });
        
        console.log(`✅ Started agent ${agentId}`);
      } else {
        console.log(`❌ Failed to start agent ${agentId}`);
      }
    }
  }

  async scaleDown(model, count) {
    console.log(`📉 Scaling down ${model} by ${count} agents`);
    
    const agents = this.runningAgents.get(model);
    const agentsToRemove = agents.slice(-count); // Remove newest agents first
    
    for (const agent of agentsToRemove) {
      try {
        // Graceful shutdown
        agent.process.kill('SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          if (!agent.process.killed) {
            agent.process.kill('SIGKILL');
          }
        }, 30000);
        
        console.log(`🛑 Stopped agent ${agent.id}`);
      } catch (error) {
        console.error(`❌ Error stopping agent ${agent.id}:`, error);
      }
    }
    
    // Remove from tracking
    this.runningAgents.set(model, agents.slice(0, -count));
  }

  async startAgent(model, agentId, urgency) {
    const agentPath = path.join(__dirname, `../agents/${this.getAgentFolder(model)}/index.js`);
    
    const env = {
      ...process.env,
      AGENT_ID: agentId,
      AGENT_MODEL: model,
      AGENT_URGENCY: urgency,
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379'
    };
    
    try {
      const agentProcess = spawn('node', [agentPath], {
        env,
        stdio: 'pipe',
        detached: false
      });
      
      agentProcess.stdout.on('data', (data) => {
        console.log(`[${agentId}] ${data.toString().trim()}`);
      });
      
      agentProcess.stderr.on('data', (data) => {
        console.error(`[${agentId}] ERROR: ${data.toString().trim()}`);
      });
      
      agentProcess.on('exit', (code) => {
        console.log(`[${agentId}] Exited with code ${code}`);
        this.removeAgent(model, agentId);
      });
      
      // Send heartbeat to confirm startup
      setTimeout(async () => {
        await redis.set(`agent:heartbeat:${agentId}`, Date.now().toString());
      }, 5000);
      
      return agentProcess;
    } catch (error) {
      console.error(`❌ Failed to start agent ${agentId}:`, error);
      return null;
    }
  }

  getAgentFolder(model) {
    const modelMap = {
      'claude-3-opus': 'claude',
      'gpt-4o': 'gpt',
      'deepseek-coder': 'deepseek',
      'command-r-plus': 'mistral',
      'gemini-pro': 'gemini'
    };
    return modelMap[model] || 'claude';
  }

  removeAgent(model, agentId) {
    const agents = this.runningAgents.get(model);
    const updatedAgents = agents.filter(agent => agent.id !== agentId);
    this.runningAgents.set(model, updatedAgents);
  }

  async getAverageProcessingTime(model) {
    const times = await redis.lrange(`agent:processing_times:${model}`, 0, 9);
    if (times.length === 0) return 0;
    
    const avgTime = times.reduce((sum, time) => sum + parseInt(time), 0) / times.length;
    return avgTime;
  }

  async getErrorRate(model) {
    const [total, failed] = await Promise.all([
      redis.get(`agent:total_tasks:${model}`),
      redis.llen(`queue:${model}:failed`)
    ]);
    
    const totalTasks = parseInt(total) || 0;
    return totalTasks > 0 ? failed / totalTasks : 0;
  }

  recordScalingHistory(model, decision, from, to) {
    const record = {
      model,
      action: decision.action,
      from,
      to,
      reason: decision.reason,
      timestamp: new Date().toISOString()
    };
    
    this.scalingHistory.push(record);
    
    // Keep only last 100 records
    if (this.scalingHistory.length > 100) {
      this.scalingHistory.shift();
    }
    
    // Store in Redis
    redis.lpush('autoscaler:history', JSON.stringify(record));
    redis.ltrim('autoscaler:history', 0, 99);
  }

  async monitorPerformance() {
    const summary = {
      timestamp: new Date().toISOString(),
      totalAgents: 0,
      totalLoad: 0,
      models: {}
    };
    
    for (const model of this.models) {
      const metrics = await this.getModelMetrics(model);
      summary.models[model] = metrics;
      summary.totalAgents += metrics.currentAgents;
      summary.totalLoad += metrics.totalLoad;
    }
    
    // Store performance summary
    await redis.set('autoscaler:performance', JSON.stringify(summary));
    
    // Log summary
    console.log(`📊 Performance Summary: ${summary.totalAgents} agents handling ${summary.totalLoad} tasks`);
  }

  async getStatus() {
    const status = {
      config: this.config,
      models: {},
      history: this.scalingHistory.slice(-10), // Last 10 actions
      performance: JSON.parse(await redis.get('autoscaler:performance') || '{}')
    };
    
    for (const model of this.models) {
      const agents = this.runningAgents.get(model);
      status.models[model] = {
        agents: agents.length,
        agentIds: agents.map(a => a.id),
        lastScaleAction: this.lastScaleAction.get(model),
        metrics: await this.getModelMetrics(model)
      };
    }
    
    return status;
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await redis.set('autoscaler:config', JSON.stringify(this.config));
    console.log('✅ Configuration updated:', this.config);
  }

  async shutdown() {
    console.log('🛑 Shutting down Auto-Scaler...');
    
    // Stop all agents
    for (const [model, agents] of this.runningAgents) {
      for (const agent of agents) {
        try {
          agent.process.kill('SIGTERM');
        } catch (error) {
          console.error(`Error stopping agent ${agent.id}:`, error);
        }
      }
    }
    
    await redis.quit();
    console.log('✅ Auto-Scaler shutdown complete');
  }
}

// CLI Interface
if (require.main === module) {
  const scaler = new AutoScaler();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      scaler.initialize().catch(console.error);
      break;
      
    case 'status':
      scaler.getStatus().then(status => {
        console.log(JSON.stringify(status, null, 2));
        process.exit(0);
      }).catch(console.error);
      break;
      
    case 'config':
      if (process.argv[3]) {
        const newConfig = JSON.parse(process.argv[3]);
        scaler.updateConfig(newConfig).then(() => {
          console.log('Configuration updated');
          process.exit(0);
        }).catch(console.error);
      } else {
        console.log('Usage: node auto-scaler.js config \'{"maxAgents": 20}\'');
        process.exit(1);
      }
      break;
      
    default:
      console.log('Usage: node auto-scaler.js [start|status|config]');
      console.log('  start  - Start the auto-scaler');
      console.log('  status - Show current status');
      console.log('  config - Update configuration');
      process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await scaler.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await scaler.shutdown();
    process.exit(0);
  });
}

module.exports = AutoScaler;