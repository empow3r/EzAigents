#!/usr/bin/env node

/**
 * Agent Workload Balancer
 * Intelligently distributes tasks across agents based on capabilities, load, and performance
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Agent capabilities and specializations
const AGENT_CAPABILITIES = {
  'claude': {
    specializations: ['architecture', 'refactoring', 'complex-logic', 'security', 'documentation'],
    maxConcurrency: 3,
    avgExecutionTime: 180, // seconds
    costPerToken: 0.015,
    qualityScore: 0.95,
    models: ['claude-3-opus', 'claude-3-sonnet']
  },
  'gpt': {
    specializations: ['backend-logic', 'api-development', 'integration', 'data-processing'],
    maxConcurrency: 5,
    avgExecutionTime: 120,
    costPerToken: 0.01,
    qualityScore: 0.90,
    models: ['gpt-4o', 'gpt-4-turbo']
  },
  'deepseek': {
    specializations: ['testing', 'validation', 'infrastructure', 'deployment'],
    maxConcurrency: 4,
    avgExecutionTime: 90,
    costPerToken: 0.005,
    qualityScore: 0.85,
    models: ['deepseek-coder', 'deepseek-chat']
  },
  'mistral': {
    specializations: ['documentation', 'configuration', 'monitoring', 'devops'],
    maxConcurrency: 3,
    avgExecutionTime: 100,
    costPerToken: 0.007,
    qualityScore: 0.88,
    models: ['command-r-plus', 'mistral-large']
  },
  'gemini': {
    specializations: ['analysis', 'optimization', 'mobile', 'performance'],
    maxConcurrency: 4,
    avgExecutionTime: 110,
    costPerToken: 0.008,
    qualityScore: 0.87,
    models: ['gemini-pro', 'gemini-pro-vision']
  }
};

// Task classification patterns
const TASK_PATTERNS = {
  'security': ['auth', 'vault', 'encrypt', 'rbac', 'oauth', 'jwt', 'security'],
  'backend-logic': ['api', 'service', 'controller', 'middleware', 'route'],
  'testing': ['test', 'spec', 'mock', 'validate', 'assert'],
  'infrastructure': ['docker', 'k8s', 'kubernetes', 'deploy', 'infrastructure'],
  'documentation': ['readme', 'doc', 'guide', 'comment', 'jsdoc'],
  'monitoring': ['metric', 'log', 'trace', 'monitor', 'observability'],
  'architecture': ['design', 'pattern', 'architecture', 'structure'],
  'performance': ['optimize', 'performance', 'cache', 'speed', 'memory']
};

class AgentWorkloadBalancer {
  constructor() {
    this.agentMetrics = new Map();
    this.taskHistory = new Map();
    this.loadingStartTime = performance.now();
  }

  /**
   * Initialize the workload balancer
   */
  async initialize() {
    console.log('🔄 Initializing Agent Workload Balancer...');
    
    // Load historical performance data
    await this.loadAgentMetrics();
    
    // Subscribe to agent status updates
    await this.subscribeToAgentEvents();
    
    // Start load monitoring
    this.startLoadMonitoring();
    
    console.log('✅ Workload Balancer initialized successfully');
  }

  /**
   * Load agent metrics from Redis
   */
  async loadAgentMetrics() {
    for (const agentId of Object.keys(AGENT_CAPABILITIES)) {
      const metrics = await redis.hgetall(`agent:metrics:${agentId}`);
      
      this.agentMetrics.set(agentId, {
        tasksCompleted: parseInt(metrics.tasksCompleted) || 0,
        tasksFailedkz: parseInt(metrics.tasksFailed) || 0,
        avgExecutionTime: parseFloat(metrics.avgExecutionTime) || AGENT_CAPABILITIES[agentId].avgExecutionTime,
        totalTokensUsed: parseInt(metrics.totalTokensUsed) || 0,
        successRate: parseFloat(metrics.successRate) || 1.0,
        currentLoad: 0,
        lastActivity: metrics.lastActivity || new Date().toISOString()
      });
    }
  }

  /**
   * Subscribe to agent events for real-time metrics
   */
  async subscribeToAgentEvents() {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    await subscriber.subscribe('agent:status', 'agent:task:complete', 'agent:task:failed');
    
    subscriber.on('message', (channel, message) => {
      this.handleAgentEvent(channel, message);
    });
  }

  /**
   * Handle agent events
   */
  handleAgentEvent(channel, message) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'agent:task:complete':
          this.updateAgentMetrics(data.agentId, 'success', data.executionTime, data.tokensUsed);
          break;
        case 'agent:task:failed':
          this.updateAgentMetrics(data.agentId, 'failure');
          break;
        case 'agent:status':
          this.updateAgentStatus(data.agentId, data.status);
          break;
      }
    } catch (error) {
      console.error('Error handling agent event:', error);
    }
  }

  /**
   * Update agent metrics based on task completion
   */
  updateAgentMetrics(agentId, result, executionTime = null, tokensUsed = 0) {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) return;

    if (result === 'success') {
      metrics.tasksCompleted++;
      if (executionTime) {
        // Update moving average of execution time
        metrics.avgExecutionTime = (metrics.avgExecutionTime * 0.8) + (executionTime * 0.2);
      }
      metrics.totalTokensUsed += tokensUsed;
    } else {
      metrics.tasksFailed++;
    }

    // Update success rate
    const totalTasks = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.successRate = totalTasks > 0 ? metrics.tasksCompleted / totalTasks : 1.0;
    metrics.lastActivity = new Date().toISOString();

    // Persist to Redis
    this.persistAgentMetrics(agentId, metrics);
  }

  /**
   * Persist agent metrics to Redis
   */
  async persistAgentMetrics(agentId, metrics) {
    await redis.hset(`agent:metrics:${agentId}`, {
      tasksCompleted: metrics.tasksCompleted,
      tasksFailed: metrics.tasksFailed,
      avgExecutionTime: metrics.avgExecutionTime.toFixed(2),
      totalTokensUsed: metrics.totalTokensUsed,
      successRate: metrics.successRate.toFixed(3),
      lastActivity: metrics.lastActivity
    });
  }

  /**
   * Classify task based on file path and prompt
   */
  classifyTask(filePath, prompt) {
    const text = (filePath + ' ' + prompt).toLowerCase();
    const classifications = [];

    for (const [category, patterns] of Object.entries(TASK_PATTERNS)) {
      const matches = patterns.filter(pattern => text.includes(pattern)).length;
      if (matches > 0) {
        classifications.push({ category, score: matches });
      }
    }

    // Sort by score and return top classification
    classifications.sort((a, b) => b.score - a.score);
    return classifications.length > 0 ? classifications[0].category : 'general';
  }

  /**
   * Calculate agent score for a specific task
   */
  calculateAgentScore(agentId, taskCategory, priority = 'medium') {
    const capabilities = AGENT_CAPABILITIES[agentId];
    const metrics = this.agentMetrics.get(agentId);
    
    if (!capabilities || !metrics) return 0;

    let score = 0;

    // Specialization match (40% weight)
    const specializationMatch = capabilities.specializations.includes(taskCategory);
    score += specializationMatch ? 40 : 0;

    // Current load (25% weight)
    const loadFactor = Math.max(0, 25 - (metrics.currentLoad / capabilities.maxConcurrency) * 25);
    score += loadFactor;

    // Success rate (20% weight)
    score += metrics.successRate * 20;

    // Performance (10% weight) - inverse of execution time
    const avgTime = metrics.avgExecutionTime;
    const performanceScore = Math.max(0, 10 - (avgTime / 300) * 10); // Normalize to 5min max
    score += performanceScore;

    // Cost efficiency (5% weight)
    const costScore = Math.max(0, 5 - capabilities.costPerToken * 100);
    score += costScore;

    // Priority adjustment
    const priorityMultiplier = {
      'critical': 1.3,
      'high': 1.2,
      'medium': 1.0,
      'low': 0.8
    };
    score *= priorityMultiplier[priority] || 1.0;

    return Math.round(score * 100) / 100;
  }

  /**
   * Find the best agent for a task
   */
  async findBestAgent(task) {
    const taskCategory = this.classifyTask(task.file, task.prompt);
    const priority = task.priority || 'medium';
    
    const agentScores = [];

    for (const agentId of Object.keys(AGENT_CAPABILITIES)) {
      // Check if agent is online
      const agentStatus = await redis.hget(`agent:${agentId}`, 'status');
      if (agentStatus !== 'active') continue;

      // Check current load
      const metrics = this.agentMetrics.get(agentId);
      const capabilities = AGENT_CAPABILITIES[agentId];
      
      if (metrics.currentLoad >= capabilities.maxConcurrency) continue;

      const score = this.calculateAgentScore(agentId, taskCategory, priority);
      
      agentScores.push({
        agentId,
        score,
        category: taskCategory,
        currentLoad: metrics.currentLoad,
        maxLoad: capabilities.maxConcurrency,
        models: capabilities.models
      });
    }

    // Sort by score (descending)
    agentScores.sort((a, b) => b.score - a.score);
    
    return agentScores.length > 0 ? agentScores[0] : null;
  }

  /**
   * Balance workload across all agents
   */
  async balanceWorkload() {
    console.log('⚖️ Starting workload balancing...');
    
    const rebalanceActions = [];

    // Get current queue status
    const queueStats = await this.getQueueStatistics();
    
    // Check for overloaded agents
    for (const agentId of Object.keys(AGENT_CAPABILITIES)) {
      const metrics = this.agentMetrics.get(agentId);
      const capabilities = AGENT_CAPABILITIES[agentId];
      
      if (metrics.currentLoad > capabilities.maxConcurrency * 0.8) {
        // Agent is overloaded, try to redistribute tasks
        const redistributed = await this.redistributeTasks(agentId, queueStats);
        if (redistributed > 0) {
          rebalanceActions.push(`Redistributed ${redistributed} tasks from ${agentId}`);
        }
      }
    }

    // Report rebalancing actions
    if (rebalanceActions.length > 0) {
      console.log('📊 Workload rebalancing completed:');
      rebalanceActions.forEach(action => console.log(`  - ${action}`));
    } else {
      console.log('✅ Workload is well balanced');
    }

    return rebalanceActions;
  }

  /**
   * Redistribute tasks from overloaded agent
   */
  async redistributeTasks(overloadedAgentId, queueStats) {
    const capabilities = AGENT_CAPABILITIES[overloadedAgentId];
    const queueName = `queue:${capabilities.models[0]}`;
    
    const tasks = await redis.lrange(queueName, 0, -1);
    let redistributed = 0;

    for (const taskJson of tasks.slice(0, 3)) { // Only redistribute first 3 tasks
      try {
        const task = JSON.parse(taskJson);
        const bestAgent = await this.findBestAgent(task);
        
        if (bestAgent && bestAgent.agentId !== overloadedAgentId) {
          // Move task to better agent's queue
          const newQueueName = `queue:${bestAgent.models[0]}`;
          
          await redis.lrem(queueName, 1, taskJson);
          await redis.lpush(newQueueName, taskJson);
          
          redistributed++;
          
          console.log(`🔄 Moved task ${task.file} from ${overloadedAgentId} to ${bestAgent.agentId}`);
        }
      } catch (error) {
        console.error('Error redistributing task:', error);
      }
    }

    return redistributed;
  }

  /**
   * Get current queue statistics
   */
  async getQueueStatistics() {
    const stats = {};
    
    for (const agentId of Object.keys(AGENT_CAPABILITIES)) {
      const capabilities = AGENT_CAPABILITIES[agentId];
      
      for (const model of capabilities.models) {
        const queueLength = await redis.llen(`queue:${model}`);
        const processingLength = await redis.llen(`processing:${model}`);
        
        stats[agentId] = {
          model,
          queued: queueLength,
          processing: processingLength,
          total: queueLength + processingLength
        };
      }
    }
    
    return stats;
  }

  /**
   * Start load monitoring
   */
  startLoadMonitoring() {
    setInterval(async () => {
      await this.updateCurrentLoads();
      await this.balanceWorkload();
    }, 30000); // Every 30 seconds
  }

  /**
   * Update current load for all agents
   */
  async updateCurrentLoads() {
    for (const agentId of Object.keys(AGENT_CAPABILITIES)) {
      const capabilities = AGENT_CAPABILITIES[agentId];
      let currentLoad = 0;

      for (const model of capabilities.models) {
        const processingLength = await redis.llen(`processing:${model}`);
        currentLoad += processingLength;
      }

      const metrics = this.agentMetrics.get(agentId);
      if (metrics) {
        metrics.currentLoad = currentLoad;
      }
    }
  }

  /**
   * Generate workload report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      agents: {},
      recommendations: [],
      overallHealth: 'good'
    };

    let totalLoad = 0;
    let totalCapacity = 0;
    let underutilizedAgents = 0;
    let overloadedAgents = 0;

    for (const [agentId, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
      const metrics = this.agentMetrics.get(agentId);
      const utilizationRate = metrics.currentLoad / capabilities.maxConcurrency;
      
      totalLoad += metrics.currentLoad;
      totalCapacity += capabilities.maxConcurrency;

      if (utilizationRate < 0.3) underutilizedAgents++;
      if (utilizationRate > 0.8) overloadedAgents++;

      report.agents[agentId] = {
        currentLoad: metrics.currentLoad,
        maxConcurrency: capabilities.maxConcurrency,
        utilizationRate: Math.round(utilizationRate * 100),
        successRate: Math.round(metrics.successRate * 100),
        tasksCompleted: metrics.tasksCompleted,
        avgExecutionTime: Math.round(metrics.avgExecutionTime),
        specializations: capabilities.specializations
      };
    }

    // Generate recommendations
    if (overloadedAgents > 0) {
      report.recommendations.push('Consider scaling up overloaded agents or redistributing tasks');
      report.overallHealth = 'warning';
    }

    if (underutilizedAgents > 2) {
      report.recommendations.push('Some agents are underutilized - consider task redistribution');
    }

    const systemUtilization = totalLoad / totalCapacity;
    if (systemUtilization > 0.9) {
      report.recommendations.push('System utilization is high - consider adding more agent capacity');
      report.overallHealth = 'critical';
    }

    report.systemUtilization = Math.round(systemUtilization * 100);

    return report;
  }

  /**
   * CLI interface
   */
  async handleCLI() {
    const command = process.argv[2];
    const arg = process.argv[3];

    switch (command) {
      case 'balance':
        await this.balanceWorkload();
        break;

      case 'report':
        const report = await this.generateReport();
        console.log('📊 Workload Balancer Report:');
        console.log(JSON.stringify(report, null, 2));
        break;

      case 'status':
        const stats = await this.getQueueStatistics();
        console.log('📈 Current Agent Status:');
        for (const [agent, stat] of Object.entries(stats)) {
          console.log(`${agent}: ${stat.processing} processing, ${stat.queued} queued`);
        }
        break;

      case 'recommend':
        if (!arg) {
          console.log('Usage: agent-workload-balancer.js recommend <file-path> [prompt]');
          break;
        }
        const task = { file: arg, prompt: process.argv[4] || '' };
        const recommendation = await this.findBestAgent(task);
        if (recommendation) {
          console.log(`🎯 Recommended agent: ${recommendation.agentId} (score: ${recommendation.score})`);
          console.log(`   Category: ${recommendation.category}`);
          console.log(`   Load: ${recommendation.currentLoad}/${recommendation.maxLoad}`);
        } else {
          console.log('❌ No available agents found');
        }
        break;

      case 'monitor':
        console.log('🔄 Starting workload monitoring...');
        await this.initialize();
        // Keep the process running for monitoring
        process.on('SIGINT', () => {
          console.log('\n👋 Stopping workload balancer...');
          process.exit(0);
        });
        break;

      default:
        console.log('EzAigents Agent Workload Balancer');
        console.log('\nCommands:');
        console.log('  balance                      - Balance workload across agents');
        console.log('  report                       - Generate workload report');
        console.log('  status                       - Show current agent status');
        console.log('  recommend <file> [prompt]    - Get agent recommendation for task');
        console.log('  monitor                      - Start continuous monitoring');
        console.log('\nExamples:');
        console.log('  node agent-workload-balancer.js balance');
        console.log('  node agent-workload-balancer.js recommend "cli/auth-service.js" "Implement OAuth2"');
    }
  }
}

// Main execution
async function main() {
  const balancer = new AgentWorkloadBalancer();
  
  try {
    await balancer.loadAgentMetrics();
    await balancer.handleCLI();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AgentWorkloadBalancer;