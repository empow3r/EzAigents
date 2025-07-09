#!/usr/bin/env node

const Redis = require('ioredis');
const chalk = require('chalk');
const Table = require('cli-table3');
const blessed = require('blessed');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const sub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Dashboard Enhancement Project Monitor'
});

// Create layout boxes
const headerBox = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}🚀 Dashboard Enhancement Project v2.0 Monitor{/center}',
  tags: true,
  style: {
    fg: 'white',
    bg: 'blue'
  }
});

const taskBox = blessed.box({
  label: ' Task Progress ',
  top: 3,
  left: 0,
  width: '60%',
  height: '40%',
  border: {
    type: 'line'
  },
  scrollable: true,
  mouse: true,
  tags: true
});

const activityBox = blessed.box({
  label: ' Live Activity ',
  top: 3,
  left: '60%',
  width: '40%',
  height: '40%',
  border: {
    type: 'line'
  },
  scrollable: true,
  mouse: true,
  tags: true
});

const chatBox = blessed.box({
  label: ' Agent Communication ',
  top: '43%',
  left: 0,
  width: '100%',
  height: '40%',
  border: {
    type: 'line'
  },
  scrollable: true,
  mouse: true,
  tags: true
});

const statsBox = blessed.box({
  label: ' Project Stats ',
  top: '83%',
  left: 0,
  width: '100%',
  height: '17%',
  border: {
    type: 'line'
  },
  tags: true
});

// Add boxes to screen
screen.append(headerBox);
screen.append(taskBox);
screen.append(activityBox);
screen.append(chatBox);
screen.append(statsBox);

// Task tracking
let tasks = {};
let activities = [];
let chatMessages = [];

async function loadTasks() {
  const taskData = await redis.hgetall('dashboard:tasks');
  tasks = {};
  
  for (const [id, data] of Object.entries(taskData)) {
    tasks[id] = JSON.parse(data);
  }
  
  updateTaskDisplay();
}

function updateTaskDisplay() {
  const table = new Table({
    head: ['Agent', 'Task', 'Status', 'Progress', 'Priority'],
    colWidths: [10, 25, 12, 10, 10],
    style: {
      head: ['cyan']
    }
  });

  Object.values(tasks).forEach(task => {
    const progress = task.progress || 0;
    const progressBar = createProgressBar(progress);
    
    table.push([
      task.agent.toUpperCase(),
      task.title.substring(0, 23),
      getStatusColor(task.status),
      progressBar,
      getPriorityColor(task.priority)
    ]);
  });

  taskBox.setContent(table.toString());
  screen.render();
}

function createProgressBar(progress) {
  const width = 8;
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty)) + ` ${progress}%`;
}

function getStatusColor(status) {
  const colors = {
    'pending': chalk.gray,
    'queued': chalk.yellow,
    'in-progress': chalk.blue,
    'completed': chalk.green,
    'failed': chalk.red
  };
  return (colors[status] || chalk.white)(status);
}

function getPriorityColor(priority) {
  const colors = {
    'high': chalk.red,
    'medium': chalk.yellow,
    'low': chalk.green
  };
  return (colors[priority] || chalk.white)(priority.toUpperCase());
}

function addActivity(message) {
  const timestamp = new Date().toLocaleTimeString();
  activities.unshift(`{cyan-fg}[${timestamp}]{/cyan-fg} ${message}`);
  activities = activities.slice(0, 20); // Keep last 20
  
  activityBox.setContent(activities.join('\n'));
  screen.render();
}

function addChatMessage(from, message) {
  const timestamp = new Date().toLocaleTimeString();
  const color = getAgentColor(from);
  chatMessages.push(`{${color}-fg}[${timestamp}] ${from}:{/${color}-fg} ${message}`);
  
  if (chatMessages.length > 50) {
    chatMessages = chatMessages.slice(-50);
  }
  
  chatBox.setContent(chatMessages.join('\n'));
  chatBox.setScrollPerc(100);
  screen.render();
}

function getAgentColor(agent) {
  const colors = {
    'claude': 'magenta',
    'gpt': 'green',
    'deepseek': 'yellow',
    'mistral': 'blue',
    'gemini': 'red',
    'orchestrator': 'cyan'
  };
  return colors[agent] || 'white';
}

async function updateStats() {
  const projectStatus = await redis.hget('project:status', 'dashboard-enhancement');
  if (!projectStatus) return;

  const status = JSON.parse(projectStatus);
  const completedTasks = Object.values(tasks).filter(t => t.status === 'completed').length;
  const inProgressTasks = Object.values(tasks).filter(t => t.status === 'in-progress').length;
  
  const stats = [
    `{green-fg}Completed:{/green-fg} ${completedTasks}/${status.total_tasks}`,
    `{blue-fg}In Progress:{/blue-fg} ${inProgressTasks}`,
    `{yellow-fg}Queued:{/yellow-fg} ${status.total_tasks - completedTasks - inProgressTasks}`,
    `{cyan-fg}Deadline:{/cyan-fg} ${new Date(status.deadline).toLocaleDateString()}`
  ].join('  |  ');

  statsBox.setContent(`{center}${stats}{/center}`);
  screen.render();
}

// Subscribe to updates
async function subscribeToUpdates() {
  await sub.psubscribe('agent:*', 'dashboard-enhancement', 'task:progress:*');
  
  sub.on('pmessage', (pattern, channel, message) => {
    try {
      if (channel.startsWith('agent:')) {
        const agent = channel.split(':')[1];
        const data = JSON.parse(message);
        
        if (data.type === 'task-assigned') {
          addActivity(`📋 ${agent.toUpperCase()} assigned: ${data.title}`);
        } else if (data.type === 'status') {
          addActivity(`🔄 ${agent.toUpperCase()}: ${data.message}`);
        }
      } else if (channel === 'dashboard-enhancement') {
        const data = typeof message === 'string' ? { message } : JSON.parse(message);
        addChatMessage(data.from || 'unknown', data.message);
      } else if (channel.startsWith('task:progress:')) {
        const taskId = channel.split(':')[2];
        const progress = parseInt(message);
        
        if (tasks[taskId]) {
          tasks[taskId].progress = progress;
          updateTaskDisplay();
          addActivity(`📊 ${tasks[taskId].agent.toUpperCase()} progress: ${progress}%`);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
}

// Keyboard shortcuts
screen.key(['escape', 'q', 'C-c'], () => {
  redis.disconnect();
  sub.disconnect();
  process.exit(0);
});

screen.key(['r'], () => {
  loadTasks();
  addActivity('🔄 Refreshed task list');
});

// Auto-refresh
setInterval(() => {
  loadTasks();
  updateStats();
}, 5000);

// Initialize
async function init() {
  console.clear();
  
  addActivity('🚀 Monitor started');
  addActivity('📡 Connecting to Redis...');
  
  await loadTasks();
  await updateStats();
  await subscribeToUpdates();
  
  addActivity('✅ Connected and monitoring');
  addChatMessage('orchestrator', 'Dashboard Enhancement Project Monitor Online');
  
  screen.render();
}

// Help text
const helpText = 'Press [r] to refresh, [q] to quit';
screen.key(['h'], () => {
  addActivity(helpText);
});

init().catch(console.error);