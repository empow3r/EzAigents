#!/usr/bin/env node

/**
 * Enhancement Progress Monitor
 * Real-time monitoring of enhancement task progress across all agents
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ENHANCEMENT_TASKS_PATH = path.join(__dirname, '../shared/enhancement-tasks.json');

// Terminal color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class EnhancementMonitor {
  constructor() {
    this.enhancementData = this.loadEnhancementTasks();
    this.taskProgress = new Map();
    this.startTime = performance.now();
  }

  loadEnhancementTasks() {
    try {
      const data = fs.readFileSync(ENHANCEMENT_TASKS_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load enhancement tasks:', error);
      process.exit(1);
    }
  }

  async initialize() {
    // Subscribe to relevant channels
    await subscriber.subscribe('agent:status');
    await subscriber.subscribe('agent:errors');
    await subscriber.subscribe('agent-chat');
    await subscriber.subscribe('file-updates');
    
    // Set up message handlers
    subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    // Initial status check
    await this.checkAllEnhancementStatus();
    
    // Periodic status updates
    setInterval(() => this.displayDashboard(), 5000);
  }

  handleMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'agent:status':
          this.handleAgentStatus(data);
          break;
        case 'agent:errors':
          this.handleAgentError(data);
          break;
        case 'agent-chat':
          if (data.type === 'enhancement_progress') {
            this.handleEnhancementProgress(data);
          }
          break;
        case 'file-updates':
          this.handleFileUpdate(data);
          break;
      }
    } catch (error) {
      console.error(`Error handling message on ${channel}:`, error);
    }
  }

  handleAgentStatus(data) {
    if (data.enhancement_id && data.task_file) {
      const key = `${data.enhancement_id}:${data.task_file}`;
      this.taskProgress.set(key, {
        status: data.status,
        agent: data.agent_id,
        updated_at: new Date().toISOString()
      });
    }
  }

  handleAgentError(data) {
    console.error(`${colors.red}❌ Error from ${data.agent_id}: ${data.error}${colors.reset}`);
    if (data.enhancement_id && data.task_file) {
      const key = `${data.enhancement_id}:${data.task_file}`;
      this.taskProgress.set(key, {
        status: 'error',
        agent: data.agent_id,
        error: data.error,
        updated_at: new Date().toISOString()
      });
    }
  }

  handleEnhancementProgress(data) {
    console.log(`${colors.cyan}📢 ${data.from}: ${data.message}${colors.reset}`);
  }

  handleFileUpdate(data) {
    console.log(`${colors.green}✅ File created/updated: ${data.file} by ${data.agent}${colors.reset}`);
  }

  async checkAllEnhancementStatus() {
    for (const [enhancementId, enhancement] of Object.entries(this.enhancementData.enhancements)) {
      const status = await redis.hgetall(`enhancement:${enhancementId}`);
      
      // Check individual task progress
      for (const task of enhancement.tasks) {
        const key = `${enhancementId}:${task.file}`;
        const queueStatus = await this.checkTaskInQueues(task);
        
        if (queueStatus) {
          this.taskProgress.set(key, queueStatus);
        }
      }
    }
  }

  async checkTaskInQueues(task) {
    const model = this.getModelForAgent(task.agent);
    
    // Check if task is in queue
    const queueItems = await redis.lrange(`queue:${model}`, 0, -1);
    for (const item of queueItems) {
      const job = JSON.parse(item);
      if (job.file === task.file) {
        return { status: 'queued', agent: task.agent };
      }
    }
    
    // Check if task is being processed
    const processingItems = await redis.lrange(`processing:${model}`, 0, -1);
    for (const item of processingItems) {
      const job = JSON.parse(item);
      if (job.file === task.file) {
        return { status: 'processing', agent: task.agent };
      }
    }
    
    // Check if file exists (task completed)
    const filePath = path.join(__dirname, '..', task.file);
    if (fs.existsSync(filePath)) {
      return { status: 'completed', agent: task.agent };
    }
    
    return null;
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

  displayDashboard() {
    console.clear();
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}            Ez Aigent Enhancement Progress Monitor              ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`Runtime: ${this.formatDuration(performance.now() - this.startTime)}\n`);

    for (const [enhancementId, enhancement] of Object.entries(this.enhancementData.enhancements)) {
      this.displayEnhancementStatus(enhancementId, enhancement);
    }

    this.displayQueueStatus();
    this.displayAgentActivity();
  }

  displayEnhancementStatus(enhancementId, enhancement) {
    console.log(`${colors.bright}${enhancement.title}${colors.reset}`);
    console.log(`ID: ${enhancementId} | Priority: ${this.getPriorityColor(enhancement.priority)}${enhancement.priority}${colors.reset}`);
    
    let completed = 0;
    let processing = 0;
    let queued = 0;
    let errors = 0;
    
    for (const task of enhancement.tasks) {
      const key = `${enhancementId}:${task.file}`;
      const progress = this.taskProgress.get(key);
      
      if (progress) {
        switch (progress.status) {
          case 'completed':
            completed++;
            break;
          case 'processing':
            processing++;
            break;
          case 'queued':
            queued++;
            break;
          case 'error':
            errors++;
            break;
        }
      }
    }
    
    const total = enhancement.tasks.length;
    const progressBar = this.createProgressBar(completed, total);
    
    console.log(`Progress: ${progressBar} ${completed}/${total} tasks`);
    console.log(`Status: ${colors.green}✓ ${completed}${colors.reset} | ${colors.yellow}⚡ ${processing}${colors.reset} | ${colors.blue}⏳ ${queued}${colors.reset} | ${colors.red}✗ ${errors}${colors.reset}`);
    
    // Show individual task status
    if (processing > 0 || errors > 0) {
      for (const task of enhancement.tasks) {
        const key = `${enhancementId}:${task.file}`;
        const progress = this.taskProgress.get(key);
        
        if (progress && (progress.status === 'processing' || progress.status === 'error')) {
          const statusIcon = progress.status === 'processing' ? '⚡' : '✗';
          const statusColor = progress.status === 'processing' ? colors.yellow : colors.red;
          console.log(`  ${statusColor}${statusIcon} ${task.file} (${progress.agent})${colors.reset}`);
          if (progress.error) {
            console.log(`     ${colors.red}Error: ${progress.error}${colors.reset}`);
          }
        }
      }
    }
    
    console.log('');
  }

  async displayQueueStatus() {
    console.log(`${colors.bright}Queue Status:${colors.reset}`);
    
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    for (const model of models) {
      const queueLength = await redis.llen(`queue:${model}`);
      const processingLength = await redis.llen(`processing:${model}`);
      
      if (queueLength > 0 || processingLength > 0) {
        console.log(`${model}: ${colors.blue}${queueLength} queued${colors.reset}, ${colors.yellow}${processingLength} processing${colors.reset}`);
      }
    }
    console.log('');
  }

  async displayAgentActivity() {
    console.log(`${colors.bright}Active Agents:${colors.reset}`);
    
    const agentKeys = await redis.keys('agent:*');
    for (const key of agentKeys) {
      const agentData = await redis.hgetall(key);
      if (agentData.status === 'active') {
        const lastHeartbeat = new Date(agentData.last_heartbeat);
        const timeSinceHeartbeat = Date.now() - lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat < 120000) { // Active in last 2 minutes
          const agentId = key.replace('agent:', '');
          const status = agentData.current_status || 'idle';
          const statusColor = status === 'working' ? colors.green : colors.yellow;
          
          console.log(`${statusColor}● ${agentId}${colors.reset} - ${status}`);
        }
      }
    }
  }

  createProgressBar(completed, total) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const barLength = 20;
    const filled = Math.round((percentage / 100) * barLength);
    const empty = barLength - filled;
    
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    
    return `[${colors.green}${filledBar}${colors.reset}${emptyBar}] ${percentage.toFixed(1)}%`;
  }

  getPriorityColor(priority) {
    switch (priority) {
      case 'critical':
        return colors.red;
      case 'high':
        return colors.yellow;
      case 'medium':
        return colors.blue;
      default:
        return colors.reset;
    }
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Main execution
async function main() {
  const monitor = new EnhancementMonitor();
  
  console.log('Starting Enhancement Progress Monitor...');
  console.log('Press Ctrl+C to exit\n');
  
  await monitor.initialize();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down monitor...');
    redis.disconnect();
    subscriber.disconnect();
    process.exit(0);
  });
}

main().catch(console.error);