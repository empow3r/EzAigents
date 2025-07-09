const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class AgentMonitor {
  constructor() {
    this.models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    this.enhancementQueues = [
      'security-layer',
      'observability-stack',
      'distributed-queue-system',
      'intelligent-orchestration',
      'collaboration-framework',
      'self-healing-infrastructure'
    ];
  }

  async getQueueStats() {
    const stats = {
      timestamp: new Date().toISOString(),
      queues: {},
      enhancements: {},
      totalPending: 0,
      totalProcessing: 0,
      totalFailed: 0
    };

    // Check model queues
    for (const model of this.models) {
      const pending = await redis.llen(`queue:${model}`);
      const processing = await redis.llen(`processing:${model}`);
      const failed = await redis.llen(`queue:${model}:failed`);
      
      stats.queues[model] = { pending, processing, failed };
      stats.totalPending += pending;
      stats.totalProcessing += processing;
      stats.totalFailed += failed;
    }

    // Check enhancement queues
    for (const enhancement of this.enhancementQueues) {
      const count = await redis.llen(`queue:enhancement:${enhancement}`);
      stats.enhancements[enhancement] = count;
    }

    return stats;
  }

  async getAgentHealth() {
    const health = {
      agents: {},
      lastHeartbeats: {}
    };

    // Check agent heartbeats
    const agentKeys = await redis.keys('agent:heartbeat:*');
    for (const key of agentKeys) {
      const agentId = key.replace('agent:heartbeat:', '');
      const lastHeartbeat = await redis.get(key);
      const timeSinceHeartbeat = Date.now() - parseInt(lastHeartbeat || 0);
      
      health.agents[agentId] = {
        status: timeSinceHeartbeat < 60000 ? 'active' : 
                timeSinceHeartbeat < 300000 ? 'idle' : 'unresponsive',
        lastHeartbeat: new Date(parseInt(lastHeartbeat || 0)).toISOString(),
        timeSinceHeartbeat: Math.floor(timeSinceHeartbeat / 1000)
      };
    }

    return health;
  }

  async trackProgress() {
    const outputDir = path.join(__dirname, '../src/output');
    const files = await fs.readdir(outputDir).catch(() => []);
    
    const progress = {
      completedFiles: files.length,
      enhancements: {}
    };

    // Track enhancement progress
    for (const enhancement of this.enhancementQueues) {
      const progressKey = `enhancement:progress:${enhancement}`;
      const currentProgress = await redis.get(progressKey) || '0';
      progress.enhancements[enhancement] = parseInt(currentProgress);
    }

    return progress;
  }

  async generateReport() {
    const [stats, health, progress] = await Promise.all([
      this.getQueueStats(),
      this.getAgentHealth(),
      this.trackProgress()
    ]);

    const report = {
      ...stats,
      health,
      progress,
      summary: {
        activeAgents: Object.values(health.agents).filter(a => a.status === 'active').length,
        totalAgents: Object.keys(health.agents).length,
        completedTasks: progress.completedFiles,
        queueDepth: stats.totalPending + stats.totalProcessing
      }
    };

    return report;
  }

  formatReport(report) {
    let output = '\n=== Ez Aigent Agent Monitor Report ===\n';
    output += `Timestamp: ${report.timestamp}\n\n`;
    
    output += '📊 Queue Statistics:\n';
    Object.entries(report.queues).forEach(([model, stats]) => {
      output += `  ${model}: ${stats.pending} pending, ${stats.processing} processing, ${stats.failed} failed\n`;
    });
    
    output += `\n📈 Totals: ${report.totalPending} pending, ${report.totalProcessing} processing, ${report.totalFailed} failed\n`;
    
    output += '\n🚀 Enhancement Queues:\n';
    Object.entries(report.enhancements).forEach(([enhancement, count]) => {
      output += `  ${enhancement}: ${count} tasks\n`;
    });
    
    output += '\n💚 Agent Health:\n';
    Object.entries(report.health.agents).forEach(([agent, status]) => {
      const statusEmoji = status.status === 'active' ? '🟢' : 
                         status.status === 'idle' ? '🟡' : '🔴';
      output += `  ${statusEmoji} ${agent}: ${status.status} (${status.timeSinceHeartbeat}s ago)\n`;
    });
    
    output += '\n📊 Progress:\n';
    output += `  Completed Files: ${report.progress.completedFiles}\n`;
    output += '  Enhancement Progress:\n';
    Object.entries(report.progress.enhancements).forEach(([enhancement, progress]) => {
      const bar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
      output += `    ${enhancement}: [${bar}] ${progress}%\n`;
    });
    
    output += '\n📋 Summary:\n';
    output += `  Active Agents: ${report.summary.activeAgents}/${report.summary.totalAgents}\n`;
    output += `  Completed Tasks: ${report.summary.completedTasks}\n`;
    output += `  Queue Depth: ${report.summary.queueDepth}\n`;
    
    return output;
  }

  async monitor(interval = 30000) {
    console.log('🚀 Starting Ez Aigent Agent Monitor...\n');
    
    const displayReport = async () => {
      try {
        const report = await this.generateReport();
        console.clear();
        console.log(this.formatReport(report));
        
        // Save report to file
        const reportPath = path.join(__dirname, '../monitoring/latest-report.json');
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Log to Redis for dashboard
        await redis.lpush('monitoring:reports', JSON.stringify(report));
        await redis.ltrim('monitoring:reports', 0, 100); // Keep last 100 reports
        
      } catch (error) {
        console.error('❌ Error generating report:', error);
      }
    };
    
    // Initial report
    await displayReport();
    
    // Set up interval
    setInterval(displayReport, interval);
    
    console.log(`\n📊 Monitoring every ${interval / 1000} seconds. Press Ctrl+C to stop.`);
  }
}

// Run monitor if executed directly
if (require.main === module) {
  const monitor = new AgentMonitor();
  const interval = process.argv[2] ? parseInt(process.argv[2]) * 1000 : 30000;
  
  monitor.monitor(interval).catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Shutting down monitor...');
    await redis.quit();
    process.exit(0);
  });
}

module.exports = AgentMonitor;