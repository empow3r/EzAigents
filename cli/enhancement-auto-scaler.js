#!/usr/bin/env node

/**
 * Enhancement Auto-Scaler
 * Automatically scales agent instances based on queue depth and performance metrics
 */

const Redis = require('ioredis');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class EnhancementAutoScaler {
  constructor() {
    this.scalingConfig = {
      scaleUpThreshold: 50,     // Scale up when queue > 50 tasks
      scaleDownThreshold: 5,    // Scale down when queue < 5 tasks
      maxInstances: 10,         // Maximum instances per agent type
      minInstances: 1,          // Minimum instances per agent type
      cooldownPeriod: 300000,   // 5 minutes between scaling actions
      targetUtilization: 70     // Target CPU utilization percentage
    };
    
    this.lastScalingAction = {};
    this.currentInstances = {};
    this.performanceHistory = {};
  }

  async startAutoScaling() {
    console.log('🔄 Starting auto-scaling service...');
    
    // Initialize current instance counts
    await this.initializeInstanceCounts();
    
    // Start monitoring loop
    setInterval(async () => {
      try {
        await this.evaluateScaling();
      } catch (error) {
        console.error('Auto-scaling error:', error);
      }
    }, 30000); // Check every 30 seconds

    // Start performance monitoring
    setInterval(async () => {
      await this.collectPerformanceMetrics();
    }, 60000); // Collect metrics every minute

    console.log('✅ Auto-scaling service started');
  }

  async initializeInstanceCounts() {
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    
    for (const agent of agents) {
      this.currentInstances[agent] = await this.getCurrentInstanceCount(agent);
      this.lastScalingAction[agent] = 0;
      this.performanceHistory[agent] = [];
    }
  }

  async getCurrentInstanceCount(agentType) {
    try {
      // Check Docker containers
      const { stdout } = await this.execAsync(`docker ps --filter "name=ai_${agentType}" --format "{{.Names}}"`);
      const containers = stdout.trim().split('\n').filter(line => line.length > 0);
      return containers.length;
    } catch (error) {
      console.error(`Error checking instances for ${agentType}:`, error);
      return this.scalingConfig.minInstances;
    }
  }

  async evaluateScaling() {
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    const models = {
      claude: 'claude-3-opus',
      gpt: 'gpt-4o',
      deepseek: 'deepseek-coder',
      mistral: 'command-r-plus',
      gemini: 'gemini-pro'
    };

    for (const agent of agents) {
      const model = models[agent];
      
      // Get queue metrics
      const queueDepth = await redis.llen(`queue:${model}`) || 0;
      const processingCount = await redis.llen(`processing:${model}`) || 0;
      const totalLoad = queueDepth + processingCount;
      
      // Get performance metrics
      const avgTaskTime = await this.getAverageTaskTime(agent);
      const successRate = await this.getSuccessRate(agent);
      const cpuUtilization = await this.getCpuUtilization(agent);
      
      // Determine scaling action
      const scalingDecision = this.makeScalingDecision(agent, {
        queueDepth,
        processingCount,
        totalLoad,
        avgTaskTime,
        successRate,
        cpuUtilization
      });
      
      if (scalingDecision.action !== 'none') {
        await this.executeScalingAction(agent, scalingDecision);
      }
      
      // Update metrics
      await this.updateScalingMetrics(agent, {
        queueDepth,
        totalLoad,
        instances: this.currentInstances[agent],
        cpuUtilization,
        timestamp: Date.now()
      });
    }
  }

  makeScalingDecision(agent, metrics) {
    const { queueDepth, totalLoad, avgTaskTime, successRate, cpuUtilization } = metrics;
    const currentInstances = this.currentInstances[agent];
    const cooldownExpired = Date.now() - this.lastScalingAction[agent] > this.scalingConfig.cooldownPeriod;
    
    if (!cooldownExpired) {
      return { action: 'none', reason: 'cooldown_period' };
    }

    // Scale up conditions
    if (queueDepth > this.scalingConfig.scaleUpThreshold && 
        currentInstances < this.scalingConfig.maxInstances) {
      return {
        action: 'scale_up',
        reason: 'high_queue_depth',
        targetInstances: Math.min(currentInstances + 1, this.scalingConfig.maxInstances),
        priority: queueDepth > 100 ? 'critical' : 'high'
      };
    }

    if (cpuUtilization > 90 && 
        currentInstances < this.scalingConfig.maxInstances) {
      return {
        action: 'scale_up',
        reason: 'high_cpu_utilization',
        targetInstances: Math.min(currentInstances + 1, this.scalingConfig.maxInstances),
        priority: 'high'
      };
    }

    if (avgTaskTime > 300 && totalLoad > 20 &&
        currentInstances < this.scalingConfig.maxInstances) {
      return {
        action: 'scale_up',
        reason: 'high_latency',
        targetInstances: Math.min(currentInstances + 1, this.scalingConfig.maxInstances),
        priority: 'medium'
      };
    }

    // Scale down conditions
    if (queueDepth < this.scalingConfig.scaleDownThreshold && 
        cpuUtilization < 30 && 
        currentInstances > this.scalingConfig.minInstances) {
      return {
        action: 'scale_down',
        reason: 'low_utilization',
        targetInstances: Math.max(currentInstances - 1, this.scalingConfig.minInstances),
        priority: 'low'
      };
    }

    return { action: 'none', reason: 'within_thresholds' };
  }

  async executeScalingAction(agent, decision) {
    console.log(`🔄 Scaling ${agent}: ${decision.action} (${decision.reason})`);
    
    try {
      if (decision.action === 'scale_up') {
        await this.scaleUp(agent, decision.targetInstances);
      } else if (decision.action === 'scale_down') {
        await this.scaleDown(agent, decision.targetInstances);
      }
      
      this.lastScalingAction[agent] = Date.now();
      this.currentInstances[agent] = decision.targetInstances;
      
      // Record scaling event
      await redis.lpush('scaling:events', JSON.stringify({
        agent,
        action: decision.action,
        reason: decision.reason,
        fromInstances: this.currentInstances[agent],
        toInstances: decision.targetInstances,
        timestamp: new Date().toISOString()
      }));
      
      console.log(`✅ Scaled ${agent} to ${decision.targetInstances} instances`);
      
    } catch (error) {
      console.error(`❌ Failed to scale ${agent}:`, error);
      
      await redis.lpush('scaling:errors', JSON.stringify({
        agent,
        action: decision.action,
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  }

  async scaleUp(agent, targetInstances) {
    const currentInstances = this.currentInstances[agent];
    const instancesToAdd = targetInstances - currentInstances;
    
    for (let i = 0; i < instancesToAdd; i++) {
      const instanceName = `ai_${agent}_${Date.now()}_${i}`;
      
      // Start new container instance
      const dockerCommand = `docker run -d --name ${instanceName} \
        --env-file .env \
        --network ai-mesh \
        -v $(pwd)/shared:/shared \
        -v $(pwd)/src:/src \
        ez-aigent/agent-${agent}:latest`;
      
      await this.execAsync(dockerCommand);
      
      // Wait a moment between starts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async scaleDown(agent, targetInstances) {
    const currentInstances = this.currentInstances[agent];
    const instancesToRemove = currentInstances - targetInstances;
    
    // Get container names
    const { stdout } = await this.execAsync(`docker ps --filter "name=ai_${agent}" --format "{{.Names}}"`);
    const containers = stdout.trim().split('\n').filter(line => line.length > 0);
    
    // Remove oldest instances first
    for (let i = 0; i < Math.min(instancesToRemove, containers.length); i++) {
      const containerName = containers[i];
      
      // Gracefully stop container
      await this.execAsync(`docker stop ${containerName}`);
      await this.execAsync(`docker rm ${containerName}`);
      
      console.log(`🗑️ Removed container: ${containerName}`);
    }
  }

  async getAverageTaskTime(agent) {
    try {
      const taskTimes = await redis.hgetall(`analytics:${agent}:task-times`);
      const times = Object.values(taskTimes).map(t => parseInt(t)).filter(t => t > 0);
      
      if (times.length === 0) return 0;
      return Math.round(times.reduce((a, b) => a + b) / times.length);
    } catch (error) {
      return 0;
    }
  }

  async getSuccessRate(agent) {
    try {
      const completed = parseInt(await redis.get(`analytics:${agent}:completed`) || 0);
      const failed = parseInt(await redis.get(`analytics:${agent}:failed`) || 0);
      const total = completed + failed;
      
      if (total === 0) return 100;
      return Math.round((completed / total) * 100);
    } catch (error) {
      return 100;
    }
  }

  async getCpuUtilization(agent) {
    try {
      // Get CPU usage from Docker stats
      const { stdout } = await this.execAsync(`docker stats --no-stream --format "{{.CPUPerc}}" $(docker ps --filter "name=ai_${agent}" --format "{{.Names}}")`);
      const cpuValues = stdout.trim().split('\n')
        .map(line => parseFloat(line.replace('%', '')))
        .filter(val => !isNaN(val));
      
      if (cpuValues.length === 0) return 0;
      return Math.round(cpuValues.reduce((a, b) => a + b) / cpuValues.length);
    } catch (error) {
      return 0;
    }
  }

  async updateScalingMetrics(agent, metrics) {
    const key = `scaling:metrics:${agent}`;
    
    await redis.hset(key,
      'queue_depth', metrics.queueDepth,
      'total_load', metrics.totalLoad,
      'instances', metrics.instances,
      'cpu_utilization', metrics.cpuUtilization,
      'last_updated', metrics.timestamp
    );
    
    // Keep performance history (last 24 hours)
    await redis.lpush(`scaling:history:${agent}`, JSON.stringify(metrics));
    await redis.ltrim(`scaling:history:${agent}`, 0, 1440); // 1440 minutes = 24 hours
  }

  async collectPerformanceMetrics() {
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    
    for (const agent of agents) {
      const metrics = {
        timestamp: Date.now(),
        instances: this.currentInstances[agent],
        avgTaskTime: await this.getAverageTaskTime(agent),
        successRate: await this.getSuccessRate(agent),
        cpuUtilization: await this.getCpuUtilization(agent),
        queueDepth: await redis.llen(`queue:${this.getModelForAgent(agent)}`) || 0
      };
      
      this.performanceHistory[agent].push(metrics);
      
      // Keep only last 100 measurements
      if (this.performanceHistory[agent].length > 100) {
        this.performanceHistory[agent].shift();
      }
    }
  }

  getModelForAgent(agent) {
    const modelMap = {
      claude: 'claude-3-opus',
      gpt: 'gpt-4o',
      deepseek: 'deepseek-coder',
      mistral: 'command-r-plus',
      gemini: 'gemini-pro'
    };
    return modelMap[agent] || 'gpt-4o';
  }

  async generateScalingReport() {
    const report = {
      timestamp: new Date().toISOString(),
      scaling_config: this.scalingConfig,
      current_instances: this.currentInstances,
      performance_history: this.performanceHistory,
      scaling_events: [],
      recommendations: []
    };
    
    // Get recent scaling events
    const events = await redis.lrange('scaling:events', 0, 49);
    report.scaling_events = events.map(event => JSON.parse(event));
    
    // Generate recommendations
    for (const [agent, instances] of Object.entries(this.currentInstances)) {
      const queueDepth = await redis.llen(`queue:${this.getModelForAgent(agent)}`) || 0;
      const cpuUtil = await this.getCpuUtilization(agent);
      
      if (queueDepth > 75 && instances < this.scalingConfig.maxInstances) {
        report.recommendations.push({
          agent,
          action: 'consider_scaling_up',
          reason: `High queue depth: ${queueDepth}`,
          priority: 'high'
        });
      }
      
      if (cpuUtil < 20 && instances > this.scalingConfig.minInstances && queueDepth < 10) {
        report.recommendations.push({
          agent,
          action: 'consider_scaling_down',
          reason: `Low utilization: ${cpuUtil}% CPU, ${queueDepth} queue`,
          priority: 'low'
        });
      }
    }
    
    return report;
  }

  async execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }
}

// CLI interface
async function main() {
  const scaler = new EnhancementAutoScaler();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'start':
        await scaler.startAutoScaling();
        break;
        
      case 'report':
        const report = await scaler.generateScalingReport();
        console.log(JSON.stringify(report, null, 2));
        break;
        
      case 'status':
        await scaler.initializeInstanceCounts();
        console.log('Current Instances:', scaler.currentInstances);
        break;
        
      default:
        console.log('Enhancement Auto-Scaler');
        console.log('\nCommands:');
        console.log('  start   - Start auto-scaling service');
        console.log('  report  - Generate scaling report');
        console.log('  status  - Show current instance counts');
        console.log('\nExamples:');
        console.log('  node enhancement-auto-scaler.js start');
        console.log('  node enhancement-auto-scaler.js report');
    }
  } catch (error) {
    console.error('Auto-scaler error:', error);
  } finally {
    if (command !== 'start') {
      redis.disconnect();
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancementAutoScaler;