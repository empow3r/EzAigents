#!/usr/bin/env node

/**
 * Enhancement Reporter
 * Generates comprehensive reports on enhancement implementation progress
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Load enhancement data
function loadEnhancementData() {
  try {
    const enhancementPath = path.join(__dirname, '../shared/enhancement-tasks.json');
    const data = fs.readFileSync(enhancementPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load enhancement data:', error);
    process.exit(1);
  }
}

// Generate markdown report
async function generateReport() {
  const enhancementData = loadEnhancementData();
  const timestamp = new Date().toISOString();
  const reportDate = new Date().toISOString().split('T')[0];
  
  let report = `# EzAigents Enhancement Implementation Report

**Generated:** ${timestamp}

## Executive Summary

This report provides a comprehensive overview of the enhancement implementation progress for the EzAigents multi-agent orchestration platform.

---

## Enhancement Progress

`;

  // Collect data for each enhancement
  for (const [enhancementId, enhancement] of Object.entries(enhancementData.enhancements)) {
    const status = await redis.hgetall(`enhancement:${enhancementId}`);
    const progress = await redis.hget('enhancement:progress', enhancementId) || '0';
    
    // Count completed files
    let completedFiles = 0;
    let totalFiles = enhancement.tasks.length;
    
    for (const task of enhancement.tasks) {
      const filePath = path.join(__dirname, '..', task.file);
      if (fs.existsSync(filePath)) {
        completedFiles++;
      }
    }
    
    const completionPercent = Math.round((completedFiles / totalFiles) * 100);
    
    report += `### ${enhancement.title}

- **ID:** ${enhancement.id}
- **Priority:** ${enhancement.priority}
- **Status:** ${status.status || 'Not Started'}
- **Progress:** ${completionPercent}% (${completedFiles}/${totalFiles} files)
- **Assigned Agents:** ${enhancement.assigned_agents.join(', ')}

#### File Status:
`;

    // List file status
    for (const task of enhancement.tasks) {
      const filePath = path.join(__dirname, '..', task.file);
      const exists = fs.existsSync(filePath);
      const icon = exists ? '✅' : '⬜';
      report += `- ${icon} \`${task.file}\` (${task.agent})\n`;
    }

    report += '\n---\n\n';
  }

  // Queue statistics
  const queueStats = await getQueueStatistics();
  report += `## Queue Statistics

| Model | Queued Tasks | Processing |
|-------|--------------|------------|
`;

  for (const [model, stats] of Object.entries(queueStats)) {
    report += `| ${model} | ${stats.queued} | ${stats.processing} |\n`;
  }

  // Agent activity
  report += `\n## Agent Activity

`;

  const agentActivity = await getAgentActivity();
  for (const [agent, activity] of Object.entries(agentActivity)) {
    report += `### ${agent}
- **Status:** ${activity.status}
- **Last Active:** ${activity.lastActive}
- **Tasks Completed:** ${activity.tasksCompleted}

`;
  }

  // Timeline
  report += `## Implementation Timeline

Based on the configured order:
`;

  const order = enhancementData.implementation_order;
  for (let i = 0; i < order.length; i++) {
    const enhancementId = order[i];
    const enhancement = enhancementData.enhancements[enhancementId];
    const status = await redis.hget('enhancement:status', enhancementId) || 'pending';
    const icon = status === 'completed' ? '✅' : status === 'in-progress' ? '🔄' : '⏳';
    report += `${i + 1}. ${icon} ${enhancement.title}\n`;
  }

  // Recommendations
  report += `\n## Recommendations

`;

  const recommendations = await generateRecommendations(enhancementData);
  for (const rec of recommendations) {
    report += `- ${rec}\n`;
  }

  // Save report
  const reportPath = path.join(__dirname, '..', `reports/enhancement-report-${reportDate}.md`);
  
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, report);
  
  console.log(`✅ Report generated: ${reportPath}`);
  console.log('\nReport Preview:');
  console.log('================');
  console.log(report.substring(0, 500) + '...\n');
  
  return reportPath;
}

// Get queue statistics
async function getQueueStatistics() {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  const stats = {};
  
  for (const model of models) {
    const queued = await redis.llen(`queue:${model}`);
    const processing = await redis.llen(`processing:${model}`);
    stats[model] = { queued, processing };
  }
  
  return stats;
}

// Get agent activity
async function getAgentActivity() {
  const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
  const activity = {};
  
  for (const agent of agents) {
    const agentData = await redis.hgetall(`agent:${agent}`);
    activity[agent] = {
      status: agentData.status || 'unknown',
      lastActive: agentData.last_heartbeat || 'never',
      tasksCompleted: agentData.tasks_completed || '0'
    };
  }
  
  return activity;
}

// Generate recommendations based on current state
async function generateRecommendations(enhancementData) {
  const recommendations = [];
  
  // Check for critical enhancements not started
  for (const [id, enhancement] of Object.entries(enhancementData.enhancements)) {
    if (enhancement.priority === 'critical') {
      const status = await redis.hget('enhancement:status', id);
      if (!status || status === 'pending') {
        recommendations.push(`🚨 Start critical enhancement: ${enhancement.title}`);
      }
    }
  }
  
  // Check queue health
  const queueStats = await getQueueStatistics();
  for (const [model, stats] of Object.entries(queueStats)) {
    if (stats.queued > 50) {
      recommendations.push(`⚠️ High queue depth for ${model}: ${stats.queued} tasks`);
    }
  }
  
  // Check agent health
  const agentActivity = await getAgentActivity();
  for (const [agent, activity] of Object.entries(agentActivity)) {
    if (activity.status === 'unknown' || activity.lastActive === 'never') {
      recommendations.push(`❌ Agent ${agent} appears to be offline`);
    }
  }
  
  // General recommendations
  recommendations.push('📊 Monitor enhancement progress using: npm run enhance:monitor');
  recommendations.push('✅ Run validation after each enhancement: npm run enhance:validate');
  recommendations.push('📝 Update documentation after major changes');
  
  return recommendations;
}

// Main execution
async function main() {
  console.log('🚀 EzAigents Enhancement Reporter\n');
  
  try {
    await generateReport();
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

main();