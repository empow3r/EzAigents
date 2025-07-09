#!/usr/bin/env node

/**
 * 🚀 Token Efficiency Tracker
 * Tracks token usage, task completion, and efficiency metrics for AI agents
 */

const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

class TokenEfficiencyTracker {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.metricsFile = path.join(__dirname, '../logs/efficiency-metrics.json');
    this.startTime = Date.now();
    this.sessionId = `session_${Date.now()}`;
  }

  /**
   * Track tool usage and estimated token consumption
   */
  async trackToolUsage(toolName, input, output, estimatedTokens) {
    const usage = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      toolName,
      inputSize: typeof input === 'string' ? input.length : JSON.stringify(input).length,
      outputSize: typeof output === 'string' ? output.length : JSON.stringify(output).length,
      estimatedTokens: estimatedTokens || this.estimateTokens(input, output),
      efficiency: this.calculateEfficiency(toolName, estimatedTokens)
    };

    // Store in Redis for real-time tracking
    await this.redis.zadd('tool_usage', Date.now(), JSON.stringify(usage));
    
    // Store in local file for persistence
    await this.appendToMetricsFile(usage);
    
    return usage;
  }

  /**
   * Track task completion with ROI analysis
   */
  async trackTaskCompletion(taskName, filesModified, linesChanged, businessValue) {
    const task = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      taskName,
      filesModified: filesModified.length,
      fileList: filesModified,
      linesChanged,
      businessValue, // ROI multiplier (e.g., 3, 5, 10)
      efficiency: this.calculateTaskEfficiency(linesChanged, businessValue),
      timeSpent: Date.now() - this.startTime
    };

    await this.redis.zadd('task_completions', Date.now(), JSON.stringify(task));
    await this.appendToMetricsFile(task, 'tasks');
    
    return task;
  }

  /**
   * Estimate token usage based on input/output size
   */
  estimateTokens(input, output) {
    const inputTokens = Math.ceil((input?.length || 0) / 4); // ~4 chars per token
    const outputTokens = Math.ceil((output?.length || 0) / 4);
    return inputTokens + outputTokens;
  }

  /**
   * Calculate efficiency score for tool usage
   */
  calculateEfficiency(toolName, tokens) {
    const efficiencyBenchmarks = {
      'Read': 500,      // Efficient if < 500 tokens
      'Edit': 300,      // Efficient if < 300 tokens
      'MultiEdit': 800, // Efficient if < 800 tokens for multiple files
      'Write': 400,     // Efficient if < 400 tokens
      'Bash': 200,      // Efficient if < 200 tokens
      'Grep': 150,      // Efficient if < 150 tokens
      'Glob': 100       // Efficient if < 100 tokens
    };

    const benchmark = efficiencyBenchmarks[toolName] || 300;
    const efficiency = Math.max(0, Math.min(100, (benchmark / tokens) * 100));
    return Math.round(efficiency);
  }

  /**
   * Calculate task efficiency based on impact vs effort
   */
  calculateTaskEfficiency(linesChanged, businessValue) {
    // Higher business value with fewer lines = higher efficiency
    if (linesChanged === 0) return 0;
    const efficiency = (businessValue * 20) / Math.log(linesChanged + 1);
    return Math.min(100, Math.round(efficiency));
  }

  /**
   * Get session efficiency summary
   */
  async getSessionSummary() {
    const toolUsages = await this.redis.zrange('tool_usage', 0, -1);
    const taskCompletions = await this.redis.zrange('task_completions', 0, -1);

    const tools = toolUsages.map(item => JSON.parse(item))
      .filter(item => item.sessionId === this.sessionId);
    
    const tasks = taskCompletions.map(item => JSON.parse(item))
      .filter(item => item.sessionId === this.sessionId);

    const summary = {
      sessionId: this.sessionId,
      startTime: new Date(this.startTime).toISOString(),
      duration: Date.now() - this.startTime,
      toolUsages: tools.length,
      tasksCompleted: tasks.length,
      totalTokens: tools.reduce((sum, tool) => sum + tool.estimatedTokens, 0),
      averageEfficiency: this.calculateAverageEfficiency(tools),
      mostEfficientTool: this.getMostEfficientTool(tools),
      leastEfficientTool: this.getLeastEfficientTool(tools),
      totalBusinessValue: tasks.reduce((sum, task) => sum + task.businessValue, 0),
      filesModified: [...new Set(tasks.flatMap(task => task.fileList))],
      totalLinesChanged: tasks.reduce((sum, task) => sum + task.linesChanged, 0),
      recommendations: this.generateRecommendations(tools, tasks)
    };

    return summary;
  }

  /**
   * Generate efficiency recommendations
   */
  generateRecommendations(tools, tasks) {
    const recommendations = [];

    // Token usage recommendations
    const highTokenTools = tools.filter(tool => tool.estimatedTokens > 1000);
    if (highTokenTools.length > 0) {
      recommendations.push({
        type: 'token_optimization',
        priority: 'high',
        message: `${highTokenTools.length} tool(s) used >1000 tokens. Consider using Grep/Glob for targeted searches.`,
        tools: highTokenTools.map(t => t.toolName)
      });
    }

    // Efficiency recommendations
    const lowEfficiencyTools = tools.filter(tool => tool.efficiency < 60);
    if (lowEfficiencyTools.length > 0) {
      recommendations.push({
        type: 'efficiency_improvement',
        priority: 'medium',
        message: `${lowEfficiencyTools.length} tool(s) had <60% efficiency. Review usage patterns.`,
        tools: lowEfficiencyTools.map(t => t.toolName)
      });
    }

    // Task optimization recommendations
    const lowROITasks = tasks.filter(task => task.businessValue < 3);
    if (lowROITasks.length > 0) {
      recommendations.push({
        type: 'roi_optimization',
        priority: 'medium',
        message: `${lowROITasks.length} task(s) had <3x ROI. Focus on higher-value enhancements.`,
        tasks: lowROITasks.map(t => t.taskName)
      });
    }

    // Pattern reuse recommendations
    const filesPerTask = tasks.length > 0 ? 
      tasks.reduce((sum, task) => sum + task.filesModified, 0) / tasks.length : 0;
    
    if (filesPerTask > 5) {
      recommendations.push({
        type: 'batch_optimization',
        priority: 'high',
        message: 'Consider using MultiEdit for batch operations to reduce tool calls.',
        suggestion: 'Use MultiEdit for multiple file changes in single operation'
      });
    }

    return recommendations;
  }

  calculateAverageEfficiency(tools) {
    if (tools.length === 0) return 0;
    return Math.round(tools.reduce((sum, tool) => sum + tool.efficiency, 0) / tools.length);
  }

  getMostEfficientTool(tools) {
    if (tools.length === 0) return null;
    return tools.reduce((best, tool) => 
      tool.efficiency > best.efficiency ? tool : best, tools[0]);
  }

  getLeastEfficientTool(tools) {
    if (tools.length === 0) return null;
    return tools.reduce((worst, tool) => 
      tool.efficiency < worst.efficiency ? tool : worst, tools[0]);
  }

  /**
   * Append metrics to local file for persistence
   */
  async appendToMetricsFile(data, type = 'tools') {
    try {
      let existingData = { tools: [], tasks: [] };
      
      try {
        const fileContent = await fs.readFile(this.metricsFile, 'utf8');
        existingData = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist yet, start fresh
      }

      existingData[type].push(data);
      
      await fs.writeFile(this.metricsFile, JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error('Error writing metrics file:', error);
    }
  }

  /**
   * Generate efficiency report
   */
  async generateEfficiencyReport() {
    const summary = await this.getSessionSummary();
    
    const report = `
# 🚀 Agent Efficiency Report

## Session Summary
- **Session ID:** ${summary.sessionId}
- **Duration:** ${Math.round(summary.duration / 1000 / 60)} minutes
- **Tools Used:** ${summary.toolUsages}
- **Tasks Completed:** ${summary.tasksCompleted}
- **Total Tokens:** ${summary.totalTokens.toLocaleString()}
- **Average Efficiency:** ${summary.averageEfficiency}%
- **Total Business Value:** ${summary.totalBusinessValue}x ROI
- **Files Modified:** ${summary.filesModified.length}
- **Lines Changed:** ${summary.totalLinesChanged}

## Most Efficient Tool
- **Tool:** ${summary.mostEfficientTool?.toolName || 'N/A'}
- **Efficiency:** ${summary.mostEfficientTool?.efficiency || 0}%
- **Tokens:** ${summary.mostEfficientTool?.estimatedTokens || 0}

## Optimization Opportunities
${summary.recommendations.map(rec => 
  `- **${rec.type.toUpperCase()}:** ${rec.message}`
).join('\n')}

## Efficiency Score: ${this.calculateOverallScore(summary)}/100

${this.getEfficiencyGrade(this.calculateOverallScore(summary))}
`;

    return report;
  }

  calculateOverallScore(summary) {
    const efficiencyWeight = 0.4;
    const tokenWeight = 0.3;
    const roiWeight = 0.3;

    const efficiencyScore = summary.averageEfficiency;
    const tokenScore = Math.max(0, 100 - (summary.totalTokens / 100)); // Penalize high token usage
    const roiScore = Math.min(100, summary.totalBusinessValue * 10); // Reward high ROI

    return Math.round(
      efficiencyScore * efficiencyWeight +
      tokenScore * tokenWeight +
      roiScore * roiWeight
    );
  }

  getEfficiencyGrade(score) {
    if (score >= 95) return '🏆 EXCELLENT - Optimal efficiency achieved!';
    if (score >= 85) return '⭐ GREAT - Very efficient performance!';
    if (score >= 75) return '✅ GOOD - Solid efficiency with room for improvement!';
    if (score >= 65) return '⚠️ FAIR - Needs optimization!';
    return '🚨 POOR - Significant optimization required!';
  }
}

// CLI Interface
if (require.main === module) {
  const tracker = new TokenEfficiencyTracker();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'summary':
      tracker.getSessionSummary().then(summary => {
        console.log(JSON.stringify(summary, null, 2));
      });
      break;
      
    case 'report':
      tracker.generateEfficiencyReport().then(report => {
        console.log(report);
      });
      break;
      
    case 'track':
      const [toolName, tokens] = process.argv.slice(3);
      tracker.trackToolUsage(toolName, '', '', parseInt(tokens)).then(usage => {
        console.log(`Tracked: ${toolName} - ${tokens} tokens - ${usage.efficiency}% efficient`);
      });
      break;
      
    default:
      console.log(`
Usage: node token-efficiency-tracker.js <command>

Commands:
  summary  - Get current session summary
  report   - Generate full efficiency report
  track <tool> <tokens> - Track tool usage manually

Examples:
  node token-efficiency-tracker.js summary
  node token-efficiency-tracker.js report
  node token-efficiency-tracker.js track Read 500
`);
  }
}

module.exports = TokenEfficiencyTracker;