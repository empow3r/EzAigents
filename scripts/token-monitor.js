#!/usr/bin/env node

/**
 * Token Usage Monitor for Ez Aigents
 * Real-time monitoring and alerting for token usage
 */

const Redis = require('redis');
const chalk = require('chalk');
const Table = require('cli-table3');
const TokenManager = require('../shared/token-manager');

class TokenMonitor {
  constructor() {
    this.redis = null;
    this.tokenManager = null;
    this.refreshInterval = 5000; // 5 seconds
    this.alertThresholds = {
      dailyCost: 50,        // Alert if daily cost exceeds $50
      hourlyCost: 10,       // Alert if hourly cost exceeds $10
      taskCost: 5,          // Alert if single task exceeds $5
      monthlyBudget: 0.9    // Alert at 90% of monthly budget
    };
  }

  async initialize() {
    // Connect to Redis
    this.redis = Redis.createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379' 
    });
    
    this.redis.on('error', (err) => console.error('Redis error:', err));
    await this.redis.connect();
    
    // Initialize token manager
    this.tokenManager = new TokenManager(this.redis);
    
    console.log(chalk.green('✓ Token Monitor initialized'));
    console.log(chalk.gray(`Monitoring interval: ${this.refreshInterval}ms`));
    console.log();
  }

  async startMonitoring() {
    // Initial display
    await this.displayMetrics();
    
    // Set up continuous monitoring
    setInterval(async () => {
      await this.displayMetrics();
      await this.checkAlerts();
    }, this.refreshInterval);
    
    // Monitor real-time task completions
    this.monitorTaskCompletions();
  }

  async displayMetrics() {
    console.clear();
    console.log(chalk.bold.cyan('Ez Aigents Token Usage Monitor'));
    console.log(chalk.gray('=' .repeat(80)));
    console.log();
    
    // Get active agents
    const agents = await this.redis.smembers('agents:active') || [];
    
    if (agents.length === 0) {
      console.log(chalk.yellow('No active agents found'));
      return;
    }
    
    // Create summary table
    const summaryTable = new Table({
      head: [
        chalk.cyan('Agent ID'),
        chalk.cyan('Daily Input'),
        chalk.cyan('Daily Output'),
        chalk.cyan('Daily Cost'),
        chalk.cyan('Monthly Cost'),
        chalk.cyan('Efficiency')
      ],
      style: { head: [], border: [] }
    });
    
    let totalDailyCost = 0;
    let totalMonthlyCost = 0;
    let totalDailyTokens = { input: 0, output: 0 };
    
    // Collect metrics for each agent
    for (const agentId of agents) {
      const daily = await this.tokenManager.getUsageAnalytics(agentId, 'daily');
      const monthly = await this.tokenManager.getUsageAnalytics(agentId, 'monthly');
      
      totalDailyCost += daily.cost;
      totalMonthlyCost += monthly.cost;
      totalDailyTokens.input += daily.tokens.input;
      totalDailyTokens.output += daily.tokens.output;
      
      summaryTable.push([
        this.truncateId(agentId),
        this.formatNumber(daily.tokens.input),
        this.formatNumber(daily.tokens.output),
        this.formatCost(daily.cost),
        this.formatCost(monthly.cost),
        `${daily.efficiency} tok/$`
      ]);
    }
    
    // Add totals row
    summaryTable.push([
      chalk.bold('TOTAL'),
      chalk.bold(this.formatNumber(totalDailyTokens.input)),
      chalk.bold(this.formatNumber(totalDailyTokens.output)),
      chalk.bold(this.formatCost(totalDailyCost)),
      chalk.bold(this.formatCost(totalMonthlyCost)),
      chalk.bold(this.calculateEfficiency(totalDailyTokens, totalDailyCost))
    ]);
    
    console.log(summaryTable.toString());
    console.log();
    
    // Display cost breakdown by model
    await this.displayModelBreakdown();
    
    // Display recent high-cost tasks
    await this.displayHighCostTasks();
    
    // Display savings estimate
    await this.displaySavingsEstimate(totalDailyCost);
  }

  async displayModelBreakdown() {
    console.log(chalk.bold.cyan('Cost Breakdown by Model'));
    console.log(chalk.gray('-' .repeat(50)));
    
    const modelCosts = await this.getModelCosts();
    const modelTable = new Table({
      head: [chalk.cyan('Model'), chalk.cyan('Tasks'), chalk.cyan('Total Cost'), chalk.cyan('Avg Cost/Task')],
      style: { head: [], border: [] }
    });
    
    for (const [model, data] of Object.entries(modelCosts)) {
      modelTable.push([
        model,
        data.count,
        this.formatCost(data.totalCost),
        this.formatCost(data.totalCost / data.count)
      ]);
    }
    
    console.log(modelTable.toString());
    console.log();
  }

  async displayHighCostTasks() {
    console.log(chalk.bold.cyan('Recent High-Cost Tasks'));
    console.log(chalk.gray('-' .repeat(50)));
    
    const recentTasks = await this.getRecentHighCostTasks(5);
    
    if (recentTasks.length === 0) {
      console.log(chalk.gray('No high-cost tasks found'));
      return;
    }
    
    const taskTable = new Table({
      head: [chalk.cyan('Task ID'), chalk.cyan('Model'), chalk.cyan('Tokens'), chalk.cyan('Cost')],
      style: { head: [], border: [] }
    });
    
    for (const task of recentTasks) {
      taskTable.push([
        this.truncateId(task.id),
        task.model,
        `${task.input}/${task.output}`,
        this.formatCost(task.cost, true)
      ]);
    }
    
    console.log(taskTable.toString());
    console.log();
  }

  async displaySavingsEstimate(currentDailyCost) {
    console.log(chalk.bold.cyan('Optimization Savings Estimate'));
    console.log(chalk.gray('-' .repeat(50)));
    
    // Estimate baseline (before optimization)
    const baselineCostPerTask = 0.10935; // From optimization plan
    const tasksToday = await this.redis.get('tasks:completed:today') || 100;
    const baselineDailyCost = tasksToday * baselineCostPerTask;
    
    const savings = baselineDailyCost - currentDailyCost;
    const savingsPercent = (savings / baselineDailyCost) * 100;
    
    console.log(`Baseline cost (unoptimized): ${chalk.red(this.formatCost(baselineDailyCost))}`);
    console.log(`Current cost (optimized):    ${chalk.green(this.formatCost(currentDailyCost))}`);
    console.log(`Daily savings:               ${chalk.bold.green(this.formatCost(savings))} (${savingsPercent.toFixed(1)}%)`);
    console.log(`Monthly savings projection:  ${chalk.bold.green(this.formatCost(savings * 30))}`);
    console.log();
  }

  async checkAlerts() {
    const alerts = [];
    
    // Check daily cost threshold
    const agents = await this.redis.smembers('agents:active') || [];
    
    for (const agentId of agents) {
      const daily = await this.tokenManager.getUsageAnalytics(agentId, 'daily');
      
      if (daily.cost > this.alertThresholds.dailyCost) {
        alerts.push({
          type: 'daily_cost',
          severity: 'warning',
          message: `Agent ${this.truncateId(agentId)} daily cost: $${daily.cost.toFixed(2)}`
        });
      }
      
      // Check monthly budget
      const budget = await this.tokenManager.checkMonthlyBudget(agentId);
      if (budget.spent / budget.budget > this.alertThresholds.monthlyBudget) {
        alerts.push({
          type: 'monthly_budget',
          severity: 'critical',
          message: `Agent ${this.truncateId(agentId)} at ${(budget.spent / budget.budget * 100).toFixed(1)}% of monthly budget`
        });
      }
    }
    
    // Display alerts
    if (alerts.length > 0) {
      console.log(chalk.bold.red('\n⚠️  ALERTS:'));
      for (const alert of alerts) {
        const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
        const color = alert.severity === 'critical' ? chalk.red : chalk.yellow;
        console.log(`${icon} ${color(alert.message)}`);
      }
      console.log();
    }
  }

  async monitorTaskCompletions() {
    // Subscribe to task completion events
    const subscriber = this.redis.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe('task:complete', async (message) => {
      try {
        const data = JSON.parse(message);
        
        // Check if task exceeded cost threshold
        if (data.cost && data.cost > this.alertThresholds.taskCost) {
          console.log(
            chalk.red(`\n🚨 High-cost task completed: ${data.taskId} - $${data.cost.toFixed(2)}`)
          );
        }
      } catch (error) {
        // Ignore parse errors
      }
    });
  }

  async getModelCosts() {
    const models = [
      'claude-3-opus', 'gpt-4', 'gpt-4o', 
      'gemini-pro', 'deepseek', 'mistral'
    ];
    
    const costs = {};
    
    for (const model of models) {
      const count = await this.redis.get(`model:${model}:tasks:today`) || 0;
      const cost = await this.redis.get(`model:${model}:cost:today`) || 0;
      
      if (count > 0) {
        costs[model] = {
          count: parseInt(count),
          totalCost: parseFloat(cost)
        };
      }
    }
    
    return costs;
  }

  async getRecentHighCostTasks(limit = 5) {
    // Get recent task IDs
    const taskIds = await this.redis.lrange('tasks:recent', 0, 100);
    const tasks = [];
    
    for (const taskId of taskIds) {
      const taskData = await this.redis.hgetall(`task:${taskId}:tokens`);
      
      if (taskData && taskData.cost) {
        tasks.push({
          id: taskId,
          model: taskData.model,
          input: parseInt(taskData.input || 0),
          output: parseInt(taskData.output || 0),
          cost: parseFloat(taskData.cost)
        });
      }
    }
    
    // Sort by cost and return top N
    return tasks
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  // Utility methods
  truncateId(id) {
    if (id.length <= 20) return id;
    return id.substring(0, 8) + '...' + id.substring(id.length - 8);
  }

  formatNumber(num) {
    return num.toLocaleString();
  }

  formatCost(cost, highlight = false) {
    const formatted = `$${cost.toFixed(4)}`;
    
    if (!highlight) return formatted;
    
    if (cost > this.alertThresholds.taskCost) return chalk.red(formatted);
    if (cost > 1) return chalk.yellow(formatted);
    return chalk.green(formatted);
  }

  calculateEfficiency(tokens, cost) {
    if (cost === 0) return '∞';
    const total = tokens.input + tokens.output;
    return (total / cost).toFixed(0);
  }
}

// Main execution
async function main() {
  const monitor = new TokenMonitor();
  
  try {
    await monitor.initialize();
    await monitor.startMonitoring();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\nShutting down monitor...'));
      await monitor.redis.quit();
      process.exit(0);
    });
    
  } catch (error) {
    console.error(chalk.red('Failed to start monitor:'), error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = TokenMonitor;