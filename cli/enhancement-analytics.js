#!/usr/bin/env node

/**
 * Enhancement Analytics Engine
 * Provides deep analytics and insights for enhancement implementations
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class EnhancementAnalytics {
  constructor() {
    this.enhancementTasks = this.loadEnhancementTasks();
    this.analyticsStartTime = Date.now();
  }

  loadEnhancementTasks() {
    try {
      const data = fs.readFileSync(path.join(__dirname, '../shared/enhancement-tasks.json'), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load enhancement tasks:', error);
      process.exit(1);
    }
  }

  async generateComprehensiveReport() {
    console.log('📊 Generating comprehensive enhancement analytics...');
    
    const report = {
      timestamp: new Date().toISOString(),
      overview: await this.getOverviewAnalytics(),
      performance: await this.getPerformanceAnalytics(),
      agents: await this.getAgentAnalytics(),
      costs: await this.getCostAnalytics(),
      quality: await this.getQualityAnalytics(),
      timeline: await this.getTimelineAnalytics(),
      predictions: await this.getPredictiveAnalytics(),
      recommendations: await this.getRecommendations()
    };

    // Save comprehensive report
    const reportPath = path.join(__dirname, '..', `analytics-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📈 Analytics report saved: ${reportPath}`);
    return report;
  }

  async getOverviewAnalytics() {
    const overview = {
      totalEnhancements: Object.keys(this.enhancementTasks.enhancements).length,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      inProgressTasks: 0,
      overallProgress: 0
    };

    for (const [enhancementId, enhancement] of Object.entries(this.enhancementTasks.enhancements)) {
      overview.totalTasks += enhancement.tasks.length;
      
      for (const task of enhancement.tasks) {
        const filePath = path.join(__dirname, '..', task.file);
        if (fs.existsSync(filePath)) {
          overview.completedTasks++;
        } else {
          // Check if task is in progress
          const model = this.getModelForAgent(task.agent);
          const processingItems = await redis.lrange(`processing:${model}`, 0, -1);
          const inProgress = processingItems.some(item => {
            try {
              const job = JSON.parse(item);
              return job.file === task.file;
            } catch (e) {
              return false;
            }
          });
          
          if (inProgress) {
            overview.inProgressTasks++;
          }
        }
      }
    }

    overview.overallProgress = Math.round((overview.completedTasks / overview.totalTasks) * 100);
    overview.failedTasks = overview.totalTasks - overview.completedTasks - overview.inProgressTasks;

    return overview;
  }

  async getPerformanceAnalytics() {
    const performance = {
      averageTaskTime: 0,
      tasksPerHour: 0,
      peakPerformanceHour: null,
      slowestTasks: [],
      fastestTasks: [],
      bottlenecks: []
    };

    // Get task timing data from Redis
    const taskTimes = await redis.hgetall('analytics:task-times');
    const times = Object.values(taskTimes).map(t => parseInt(t)).filter(t => t > 0);
    
    if (times.length > 0) {
      performance.averageTaskTime = Math.round(times.reduce((a, b) => a + b) / times.length);
      
      // Calculate tasks per hour
      const totalHours = (Date.now() - this.analyticsStartTime) / (1000 * 60 * 60);
      performance.tasksPerHour = Math.round(times.length / totalHours);
      
      // Find slowest and fastest tasks
      const taskEntries = Object.entries(taskTimes);
      performance.slowestTasks = taskEntries
        .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
        .slice(0, 5)
        .map(([file, time]) => ({ file, time: parseInt(time) }));
      
      performance.fastestTasks = taskEntries
        .sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
        .slice(0, 5)
        .map(([file, time]) => ({ file, time: parseInt(time) }));
    }

    // Identify bottlenecks
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    for (const model of models) {
      const queueDepth = await redis.llen(`queue:${model}`);
      const processingCount = await redis.llen(`processing:${model}`);
      
      if (queueDepth > 50 || processingCount > 10) {
        performance.bottlenecks.push({
          model,
          queueDepth,
          processingCount,
          severity: queueDepth > 100 ? 'high' : 'medium'
        });
      }
    }

    return performance;
  }

  async getAgentAnalytics() {
    const agents = {};
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    
    for (const model of models) {
      const agentName = this.getAgentNameFromModel(model);
      
      agents[agentName] = {
        model,
        tasksCompleted: 0,
        tasksInProgress: await redis.llen(`processing:${model}`),
        tasksQueued: await redis.llen(`queue:${model}`),
        averageTaskTime: 0,
        successRate: 0,
        specializations: [],
        status: 'unknown'
      };

      // Get agent specializations from enhancement tasks
      for (const [enhancementId, enhancement] of Object.entries(this.enhancementTasks.enhancements)) {
        const agentTasks = enhancement.tasks.filter(task => task.agent === agentName);
        if (agentTasks.length > 0) {
          agents[agentName].specializations.push(enhancementId);
        }
      }

      // Calculate success rate
      const completedTasks = await redis.get(`analytics:${agentName}:completed`) || 0;
      const failedTasks = await redis.get(`analytics:${agentName}:failed`) || 0;
      const totalTasks = parseInt(completedTasks) + parseInt(failedTasks);
      
      if (totalTasks > 0) {
        agents[agentName].successRate = Math.round((parseInt(completedTasks) / totalTasks) * 100);
        agents[agentName].tasksCompleted = parseInt(completedTasks);
      }

      // Check agent status
      const agentKeys = await redis.keys(`agent:*${agentName}*`);
      if (agentKeys.length > 0) {
        const agentData = await redis.hgetall(agentKeys[0]);
        agents[agentName].status = agentData.status || 'unknown';
      }
    }

    return agents;
  }

  async getCostAnalytics() {
    const costs = {
      totalCost: 0,
      costByAgent: {},
      costByEnhancement: {},
      averageCostPerTask: 0,
      projectedTotalCost: 0,
      costEfficiency: {}
    };

    // Get cost data from Redis
    const costData = await redis.hgetall('analytics:costs');
    
    for (const [key, value] of Object.entries(costData)) {
      const cost = parseFloat(value) || 0;
      costs.totalCost += cost;
      
      if (key.startsWith('agent:')) {
        const agentName = key.replace('agent:', '');
        costs.costByAgent[agentName] = cost;
      } else if (key.startsWith('enhancement:')) {
        const enhancementId = key.replace('enhancement:', '');
        costs.costByEnhancement[enhancementId] = cost;
      }
    }

    // Calculate average cost per task
    const overview = await this.getOverviewAnalytics();
    if (overview.completedTasks > 0) {
      costs.averageCostPerTask = costs.totalCost / overview.completedTasks;
    }

    // Project total cost
    const remainingTasks = overview.totalTasks - overview.completedTasks;
    costs.projectedTotalCost = costs.totalCost + (remainingTasks * costs.averageCostPerTask);

    // Calculate cost efficiency (tasks per dollar)
    for (const [agent, cost] of Object.entries(costs.costByAgent)) {
      const tasksCompleted = await redis.get(`analytics:${agent}:completed`) || 0;
      if (cost > 0) {
        costs.costEfficiency[agent] = Math.round(parseInt(tasksCompleted) / cost);
      }
    }

    return costs;
  }

  async getQualityAnalytics() {
    const quality = {
      overallQualityScore: 0,
      qualityByAgent: {},
      qualityByEnhancement: {},
      commonIssues: [],
      codeMetrics: {}
    };

    // Get quality scores from validation results
    const qualityData = await redis.hgetall('analytics:quality');
    
    let totalScore = 0;
    let scoreCount = 0;
    
    for (const [key, value] of Object.entries(qualityData)) {
      const score = parseInt(value) || 0;
      totalScore += score;
      scoreCount++;
      
      if (key.startsWith('agent:')) {
        const agentName = key.replace('agent:', '');
        quality.qualityByAgent[agentName] = score;
      } else if (key.startsWith('enhancement:')) {
        const enhancementId = key.replace('enhancement:', '');
        quality.qualityByEnhancement[enhancementId] = score;
      }
    }

    if (scoreCount > 0) {
      quality.overallQualityScore = Math.round(totalScore / scoreCount);
    }

    // Get common issues from validation reports
    const issues = await redis.lrange('analytics:issues', 0, -1);
    const issueCounts = {};
    
    for (const issue of issues) {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    }
    
    quality.commonIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));

    return quality;
  }

  async getTimelineAnalytics() {
    const timeline = {
      startTime: this.analyticsStartTime,
      currentTime: Date.now(),
      totalDuration: Date.now() - this.analyticsStartTime,
      enhancementTimeline: [],
      milestones: [],
      projectedCompletion: null
    };

    // Get enhancement timeline
    for (const enhancementId of this.enhancementTasks.implementation_order) {
      const startTime = await redis.get(`analytics:${enhancementId}:start-time`);
      const endTime = await redis.get(`analytics:${enhancementId}:end-time`);
      
      timeline.enhancementTimeline.push({
        enhancement: enhancementId,
        startTime: startTime ? parseInt(startTime) : null,
        endTime: endTime ? parseInt(endTime) : null,
        duration: startTime && endTime ? parseInt(endTime) - parseInt(startTime) : null
      });
    }

    // Get milestones
    const milestoneKeys = await redis.keys('milestone:*');
    for (const key of milestoneKeys) {
      const timestamp = await redis.get(key);
      timeline.milestones.push({
        name: key.replace('milestone:', ''),
        timestamp: new Date(timestamp).getTime()
      });
    }

    // Project completion time
    const overview = await this.getOverviewAnalytics();
    if (overview.completedTasks > 0) {
      const tasksPerMs = overview.completedTasks / timeline.totalDuration;
      const remainingTasks = overview.totalTasks - overview.completedTasks;
      const estimatedRemainingTime = remainingTasks / tasksPerMs;
      timeline.projectedCompletion = Date.now() + estimatedRemainingTime;
    }

    return timeline;
  }

  async getPredictiveAnalytics() {
    const predictions = {
      completionProbability: {},
      riskAssessment: {},
      resourceRequirements: {},
      successFactors: {}
    };

    // Predict completion probability for each enhancement
    for (const [enhancementId, enhancement] of Object.entries(this.enhancementTasks.enhancements)) {
      const completedTasks = enhancement.tasks.filter(task => {
        const filePath = path.join(__dirname, '..', task.file);
        return fs.existsSync(filePath);
      }).length;
      
      const progress = (completedTasks / enhancement.tasks.length) * 100;
      
      // Simple prediction based on current progress and agent availability
      const assignedAgents = enhancement.assigned_agents || [];
      const activeAgents = await this.getActiveAgentCount(assignedAgents);
      
      let probability = Math.min(95, progress + (activeAgents * 10));
      if (progress > 80) probability = Math.min(95, probability + 20);
      if (progress > 50) probability = Math.min(95, probability + 10);
      
      predictions.completionProbability[enhancementId] = Math.round(probability);
    }

    // Risk assessment
    const performance = await this.getPerformanceAnalytics();
    for (const bottleneck of performance.bottlenecks) {
      predictions.riskAssessment[bottleneck.model] = {
        risk: bottleneck.severity,
        factors: [`Queue depth: ${bottleneck.queueDepth}`, `Processing: ${bottleneck.processingCount}`],
        mitigation: bottleneck.severity === 'high' ? 'Scale up immediately' : 'Monitor closely'
      };
    }

    return predictions;
  }

  async getRecommendations() {
    const recommendations = [];
    
    // Get current analytics
    const overview = await this.getOverviewAnalytics();
    const performance = await this.getPerformanceAnalytics();
    const agents = await this.getAgentAnalytics();
    const costs = await this.getCostAnalytics();
    
    // Performance recommendations
    if (performance.averageTaskTime > 300) { // 5 minutes
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize Task Performance',
        description: `Average task time is ${performance.averageTaskTime}s. Consider agent optimization.`,
        action: 'Review slow tasks and optimize agent prompts'
      });
    }
    
    // Cost recommendations
    if (costs.averageCostPerTask > 1.0) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        title: 'Cost Optimization',
        description: `Average cost per task is $${costs.averageCostPerTask.toFixed(2)}. Consider using more efficient models.`,
        action: 'Route simple tasks to cheaper models'
      });
    }
    
    // Bottleneck recommendations
    if (performance.bottlenecks.length > 0) {
      recommendations.push({
        type: 'scalability',
        priority: 'high',
        title: 'Resolve Bottlenecks',
        description: `${performance.bottlenecks.length} bottlenecks detected.`,
        action: 'Scale up affected agents or redistribute tasks'
      });
    }
    
    // Agent utilization recommendations
    const underutilizedAgents = Object.entries(agents).filter(([_, agent]) => 
      agent.tasksQueued === 0 && agent.tasksInProgress === 0 && agent.status === 'active'
    );
    
    if (underutilizedAgents.length > 0) {
      recommendations.push({
        type: 'utilization',
        priority: 'medium',
        title: 'Improve Agent Utilization',
        description: `${underutilizedAgents.length} agents are underutilized.`,
        action: 'Redistribute tasks to balance workload'
      });
    }
    
    // Progress recommendations
    if (overview.overallProgress < 20) {
      recommendations.push({
        type: 'progress',
        priority: 'critical',
        title: 'Accelerate Implementation',
        description: `Overall progress is only ${overview.overallProgress}%.`,
        action: 'Focus on critical path enhancements and remove blockers'
      });
    }
    
    return recommendations;
  }

  async getActiveAgentCount(agentNames) {
    let activeCount = 0;
    
    for (const agentName of agentNames) {
      const agentKeys = await redis.keys(`agent:*${agentName}*`);
      for (const key of agentKeys) {
        const agentData = await redis.hgetall(key);
        if (agentData.status === 'active') {
          const lastHeartbeat = new Date(agentData.last_heartbeat);
          const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
          
          if (timeSinceHeartbeat < 120000) { // Active in last 2 minutes
            activeCount++;
          }
        }
      }
    }
    
    return activeCount;
  }

  getModelForAgent(agentType) {
    const agentModelMap = {
      'claude': 'claude-3-opus',
      'gpt': 'gpt-4o',
      'deepseek': 'deepseek-coder',
      'mistral': 'command-r-plus',
      'gemini': 'gemini-pro'
    };
    return agentModelMap[agentType] || 'gpt-4o';
  }

  getAgentNameFromModel(model) {
    const modelAgentMap = {
      'claude-3-opus': 'claude',
      'gpt-4o': 'gpt',
      'deepseek-coder': 'deepseek',
      'command-r-plus': 'mistral',
      'gemini-pro': 'gemini'
    };
    return modelAgentMap[model] || 'unknown';
  }

  async displayReport(report) {
    console.log('\n📊 ENHANCEMENT ANALYTICS REPORT');
    console.log('='.repeat(60));
    
    // Overview
    console.log('\n📈 OVERVIEW');
    console.log(`Total Enhancements: ${report.overview.totalEnhancements}`);
    console.log(`Overall Progress: ${report.overview.overallProgress}%`);
    console.log(`Completed Tasks: ${report.overview.completedTasks}/${report.overview.totalTasks}`);
    console.log(`In Progress: ${report.overview.inProgressTasks}`);
    console.log(`Failed: ${report.overview.failedTasks}`);
    
    // Performance
    console.log('\n⚡ PERFORMANCE');
    console.log(`Average Task Time: ${report.performance.averageTaskTime}s`);
    console.log(`Tasks Per Hour: ${report.performance.tasksPerHour}`);
    console.log(`Bottlenecks: ${report.performance.bottlenecks.length}`);
    
    // Costs
    console.log('\n💰 COSTS');
    console.log(`Total Cost: $${report.costs.totalCost.toFixed(2)}`);
    console.log(`Average Cost Per Task: $${report.costs.averageCostPerTask.toFixed(2)}`);
    console.log(`Projected Total Cost: $${report.costs.projectedTotalCost.toFixed(2)}`);
    
    // Quality
    console.log('\n🏆 QUALITY');
    console.log(`Overall Quality Score: ${report.quality.overallQualityScore}%`);
    console.log(`Common Issues: ${report.quality.commonIssues.length}`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   Action: ${rec.action}`);
    });
    
    console.log('\n' + '='.repeat(60));
  }
}

// CLI interface
async function main() {
  const analytics = new EnhancementAnalytics();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'report':
        const report = await analytics.generateComprehensiveReport();
        await analytics.displayReport(report);
        break;
        
      case 'overview':
        const overview = await analytics.getOverviewAnalytics();
        console.log(JSON.stringify(overview, null, 2));
        break;
        
      case 'performance':
        const performance = await analytics.getPerformanceAnalytics();
        console.log(JSON.stringify(performance, null, 2));
        break;
        
      case 'costs':
        const costs = await analytics.getCostAnalytics();
        console.log(JSON.stringify(costs, null, 2));
        break;
        
      case 'recommendations':
        const recommendations = await analytics.getRecommendations();
        console.log(JSON.stringify(recommendations, null, 2));
        break;
        
      default:
        console.log('Enhancement Analytics Engine');
        console.log('\nCommands:');
        console.log('  report          - Generate comprehensive analytics report');
        console.log('  overview        - Get overview analytics');
        console.log('  performance     - Get performance analytics');
        console.log('  costs           - Get cost analytics');
        console.log('  recommendations - Get recommendations');
        console.log('\nExamples:');
        console.log('  node enhancement-analytics.js report');
        console.log('  node enhancement-analytics.js overview');
    }
  } catch (error) {
    console.error('Analytics error:', error);
  } finally {
    redis.disconnect();
  }
}

main();