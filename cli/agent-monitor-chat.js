#!/usr/bin/env node

const readline = require('readline');
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * Ez Aigent Agent Monitor & Chat CLI
 * 
 * Monitor real-time agent communications, file operations, and interact with agents
 */

class AgentMonitorChat extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.userId = `monitor-${Date.now()}`;
    this.monitorMode = 'all'; // all, chat, files, tasks
    this.selectedAgent = null;
    this.fileWatcher = new Map();
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\x1b[36m[Monitor]> \x1b[0m'
    });
    
    this.init();
  }
  
  async init() {
    console.clear();
    this.showHeader();
    
    // Subscribe to ALL agent channels
    await this.subscribeToAllChannels();
    
    // Set up file monitoring
    this.setupFileMonitoring();
    
    // Handle input
    this.setupInputHandling();
    
    // Start monitoring
    console.log('\x1b[32m✓ Monitoring all agent communications...\x1b[0m\n');
    
    this.rl.prompt();
  }
  
  showHeader() {
    console.log('\x1b[1m\x1b[35m╔══════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[1m\x1b[35m║     Ez Aigent Agent Communication Monitor & Chat      ║\x1b[0m');
    console.log('\x1b[1m\x1b[35m╚══════════════════════════════════════════════════════╝\x1b[0m\n');
    
    console.log('\x1b[33mMonitor Modes:\x1b[0m');
    console.log('  \x1b[32m/mode all\x1b[0m - Show all communications');
    console.log('  \x1b[32m/mode chat\x1b[0m - Show only chat messages');
    console.log('  \x1b[32m/mode files\x1b[0m - Show file operations');
    console.log('  \x1b[32m/mode tasks\x1b[0m - Show task processing\n');
    
    console.log('\x1b[33mCommands:\x1b[0m');
    console.log('  \x1b[32m/agents\x1b[0m - List active agents');
    console.log('  \x1b[32m/join <agent>\x1b[0m - Join agent conversation');
    console.log('  \x1b[32m/watch <file>\x1b[0m - Watch file changes');
    console.log('  \x1b[32m/files\x1b[0m - Show recent file operations');
    console.log('  \x1b[32m/clear\x1b[0m - Clear screen');
    console.log('  \x1b[32m/exit\x1b[0m - Exit monitor\n');
  }
  
  async subscribeToAllChannels() {
    const channels = [
      // Communication channels
      'agent-chat',
      'agent-registry',
      'agent-emergency',
      'coordination-required',
      'file-locks',
      'code-review-requests',
      'approval-required',
      'conflict-resolution',
      
      // Task channels
      'task-updates',
      'orchestrator-updates',
      'queue:failures',
      
      // Pattern subscriptions for agent messages
      'messages:*',
      'agent:*',
      'lock:*',
      'processing:*'
    ];
    
    // Subscribe to specific channels
    for (const channel of channels) {
      if (!channel.includes('*')) {
        await this.subscriber.subscribe(channel);
      }
    }
    
    // Pattern subscribe for wildcards
    await this.subscriber.psubscribe('messages:*');
    await this.subscriber.psubscribe('agent:*');
    await this.subscriber.psubscribe('lock:*');
    await this.subscriber.psubscribe('queue:*');
    
    // Handle all messages
    this.subscriber.on('message', (channel, message) => {
      this.handleChannelMessage(channel, message);
    });
    
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleChannelMessage(channel, message);
    });
  }
  
  handleChannelMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      const timestamp = new Date().toLocaleTimeString();
      
      // Filter based on monitor mode
      if (this.monitorMode === 'chat' && !this.isChatChannel(channel)) return;
      if (this.monitorMode === 'files' && !this.isFileChannel(channel)) return;
      if (this.monitorMode === 'tasks' && !this.isTaskChannel(channel)) return;
      
      // Format and display based on channel type
      if (channel.startsWith('messages:')) {
        this.displayDirectMessage(channel, data, timestamp);
      } else if (channel === 'agent-chat') {
        this.displayBroadcast(data, timestamp);
      } else if (channel === 'file-locks') {
        this.displayFileLock(data, timestamp);
      } else if (channel === 'coordination-required') {
        this.displayCoordination(data, timestamp);
      } else if (channel.includes('queue:')) {
        this.displayQueueOperation(channel, data, timestamp);
      } else if (channel === 'agent-registry') {
        this.displayAgentStatus(data, timestamp);
      } else {
        this.displayGenericMessage(channel, data, timestamp);
      }
      
      this.rl.prompt();
    } catch (e) {
      // Not JSON, might be raw message
      if (this.monitorMode === 'all') {
        console.log(`\x1b[90m[${new Date().toLocaleTimeString()}] ${channel}: ${message}\x1b[0m`);
        this.rl.prompt();
      }
    }
  }
  
  displayDirectMessage(channel, data, timestamp) {
    const target = channel.split(':')[1];
    const from = data.from || 'unknown';
    const message = data.message || JSON.stringify(data);
    
    console.log(
      `\x1b[90m[${timestamp}]\x1b[0m ` +
      `\x1b[33m${from}\x1b[0m → \x1b[32m${target}\x1b[0m: ` +
      `\x1b[37m${message}\x1b[0m`
    );
  }
  
  displayBroadcast(data, timestamp) {
    console.log(
      `\x1b[90m[${timestamp}]\x1b[0m ` +
      `\x1b[35m[BROADCAST]\x1b[0m ` +
      `\x1b[33m${data.from}\x1b[0m: ` +
      `\x1b[37m${data.message}\x1b[0m`
    );
  }
  
  displayFileLock(data, timestamp) {
    const icons = {
      'file_claimed': '🔒',
      'file_released': '🔓',
      'file_force_locked': '⚡'
    };
    
    console.log(
      `\x1b[90m[${timestamp}]\x1b[0m ` +
      `${icons[data.type] || '📁'} ` +
      `\x1b[36m[FILE]\x1b[0m ` +
      `\x1b[33m${data.agent}\x1b[0m ` +
      `${data.type.replace(/_/g, ' ')} ` +
      `\x1b[32m${data.file}\x1b[0m`
    );
  }
  
  displayCoordination(data, timestamp) {
    console.log(
      `\x1b[90m[${timestamp}]\x1b[0m ` +
      `🤝 \x1b[93m[COORDINATION]\x1b[0m ` +
      `\x1b[33m${data.requesting_agent}\x1b[0m ↔ ` +
      `\x1b[33m${data.owning_agent}\x1b[0m for ` +
      `\x1b[32m${data.file}\x1b[0m`
    );
  }
  
  displayQueueOperation(channel, data, timestamp) {
    const queueName = channel.split(':')[1];
    console.log(
      `\x1b[90m[${timestamp}]\x1b[0m ` +
      `📋 \x1b[94m[${queueName.toUpperCase()}]\x1b[0m ` +
      `Task: \x1b[32m${data.file || 'unknown'}\x1b[0m ` +
      `Model: \x1b[33m${data.model || 'unknown'}\x1b[0m`
    );
  }
  
  displayAgentStatus(data, timestamp) {
    if (data.type === 'agent_registered') {
      console.log(
        `\x1b[90m[${timestamp}]\x1b[0m ` +
        `✅ \x1b[92m[ONLINE]\x1b[0m ` +
        `Agent \x1b[33m${data.agent.id}\x1b[0m joined`
      );
    } else if (data.type === 'agent_status_updated') {
      console.log(
        `\x1b[90m[${timestamp}]\x1b[0m ` +
        `📊 \x1b[94m[STATUS]\x1b[0m ` +
        `\x1b[33m${data.agent}\x1b[0m: ${data.status}`
      );
    }
  }
  
  displayGenericMessage(channel, data, timestamp) {
    console.log(
      `\x1b[90m[${timestamp}] [${channel}]\x1b[0m ` +
      `\x1b[37m${JSON.stringify(data, null, 2)}\x1b[0m`
    );
  }
  
  setupFileMonitoring() {
    // Monitor file changes in shared directory
    const sharedDir = path.join(__dirname, '../shared');
    const outputDir = path.join(__dirname, '../src/output');
    
    // Watch filemap.json
    this.watchFile(path.join(sharedDir, 'filemap.json'), 'filemap');
    
    // Watch output directory for agent outputs
    if (fs.existsSync(outputDir)) {
      fs.watch(outputDir, { recursive: true }, (eventType, filename) => {
        if (filename && this.monitorMode !== 'chat') {
          console.log(
            `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ` +
            `📝 \x1b[95m[OUTPUT]\x1b[0m ` +
            `File ${eventType}: \x1b[32m${filename}\x1b[0m`
          );
          this.rl.prompt();
        }
      });
    }
  }
  
  watchFile(filepath, name) {
    if (fs.existsSync(filepath)) {
      const watcher = fs.watch(filepath, (eventType) => {
        if (this.monitorMode !== 'chat') {
          console.log(
            `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ` +
            `📝 \x1b[95m[${name.toUpperCase()}]\x1b[0m ` +
            `File ${eventType}`
          );
          
          // Show file content if it's JSON
          if (filepath.endsWith('.json')) {
            try {
              const content = fs.readFileSync(filepath, 'utf8');
              const data = JSON.parse(content);
              console.log(`\x1b[90m${JSON.stringify(data, null, 2).substring(0, 200)}...\x1b[0m`);
            } catch (e) {
              // Ignore parse errors
            }
          }
          
          this.rl.prompt();
        }
      });
      
      this.fileWatcher.set(name, watcher);
    }
  }
  
  setupInputHandling() {
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }
      
      if (trimmed.startsWith('/')) {
        await this.handleCommand(trimmed);
      } else if (this.selectedAgent) {
        // Send message to selected agent
        await this.sendToAgent(trimmed);
      } else {
        console.log('\x1b[33mNo agent selected. Use /join <agent> to join a conversation.\x1b[0m');
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('\n\x1b[33mExiting monitor...\x1b[0m');
      process.exit(0);
    });
  }
  
  async handleCommand(input) {
    const [command, ...args] = input.split(' ');
    const arg = args.join(' ');
    
    switch (command) {
      case '/mode':
        this.setMode(arg);
        break;
        
      case '/agents':
        await this.listAgents();
        break;
        
      case '/join':
        await this.joinAgent(arg);
        break;
        
      case '/leave':
        this.leaveAgent();
        break;
        
      case '/watch':
        this.addFileWatch(arg);
        break;
        
      case '/files':
        await this.showRecentFiles();
        break;
        
      case '/clear':
        console.clear();
        this.showHeader();
        break;
        
      case '/help':
        this.showHeader();
        break;
        
      case '/exit':
        this.rl.close();
        break;
        
      default:
        console.log(`\x1b[31mUnknown command: ${command}\x1b[0m`);
    }
  }
  
  setMode(mode) {
    const validModes = ['all', 'chat', 'files', 'tasks'];
    if (validModes.includes(mode)) {
      this.monitorMode = mode;
      console.log(`\x1b[32m✓ Monitor mode set to: ${mode}\x1b[0m`);
    } else {
      console.log(`\x1b[31mInvalid mode. Use: all, chat, files, or tasks\x1b[0m`);
    }
  }
  
  async listAgents() {
    const keys = await this.redis.keys('agent:*');
    const agents = [];
    
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      if (data.status === 'active') {
        agents.push({
          id: data.id,
          type: data.type || 'unknown',
          status: data.current_task || 'idle',
          model: data.model || 'unknown'
        });
      }
    }
    
    if (agents.length === 0) {
      console.log('\x1b[33mNo active agents\x1b[0m');
      return;
    }
    
    console.log('\n\x1b[1mActive Agents:\x1b[0m');
    agents.forEach(agent => {
      console.log(
        `  \x1b[32m${agent.id}\x1b[0m ` +
        `\x1b[90m(${agent.type}/${agent.model})\x1b[0m - ` +
        `${agent.status}`
      );
    });
    console.log('');
  }
  
  async joinAgent(agentId) {
    if (!agentId) {
      console.log('\x1b[31mPlease specify an agent ID\x1b[0m');
      return;
    }
    
    this.selectedAgent = agentId;
    console.log(`\x1b[32m✓ Joined ${agentId} conversation\x1b[0m`);
    this.rl.setPrompt(`\x1b[36m[Monitor → ${agentId}]> \x1b[0m`);
  }
  
  leaveAgent() {
    if (this.selectedAgent) {
      console.log(`\x1b[33mLeft ${this.selectedAgent} conversation\x1b[0m`);
      this.selectedAgent = null;
      this.rl.setPrompt('\x1b[36m[Monitor]> \x1b[0m');
    }
  }
  
  async sendToAgent(message) {
    await this.redis.lpush(`messages:${this.selectedAgent}`, JSON.stringify({
      type: 'monitor_message',
      from: this.userId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    console.log(
      `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ` +
      `\x1b[34mYou → ${this.selectedAgent}:\x1b[0m ${message}`
    );
  }
  
  addFileWatch(filepath) {
    if (!filepath) {
      console.log('\x1b[31mPlease specify a file path\x1b[0m');
      return;
    }
    
    const fullPath = path.resolve(filepath);
    if (fs.existsSync(fullPath)) {
      this.watchFile(fullPath, path.basename(fullPath));
      console.log(`\x1b[32m✓ Watching: ${fullPath}\x1b[0m`);
    } else {
      console.log(`\x1b[31mFile not found: ${fullPath}\x1b[0m`);
    }
  }
  
  async showRecentFiles() {
    const outputDir = path.join(__dirname, '../src/output');
    
    if (!fs.existsSync(outputDir)) {
      console.log('\x1b[33mNo output directory found\x1b[0m');
      return;
    }
    
    const files = fs.readdirSync(outputDir);
    const fileStats = files.map(file => ({
      name: file,
      path: path.join(outputDir, file),
      mtime: fs.statSync(path.join(outputDir, file)).mtime
    }));
    
    // Sort by modification time
    fileStats.sort((a, b) => b.mtime - a.mtime);
    
    console.log('\n\x1b[1mRecent Output Files:\x1b[0m');
    fileStats.slice(0, 10).forEach(file => {
      const time = file.mtime.toLocaleTimeString();
      console.log(`  \x1b[32m${file.name}\x1b[0m \x1b[90m(${time})\x1b[0m`);
    });
    console.log('');
  }
  
  isChatChannel(channel) {
    return channel.includes('message') || channel === 'agent-chat';
  }
  
  isFileChannel(channel) {
    return channel.includes('lock') || channel.includes('file') || channel.includes('output');
  }
  
  isTaskChannel(channel) {
    return channel.includes('queue') || channel.includes('task') || channel.includes('processing');
  }
}

// Start the monitor
if (require.main === module) {
  new AgentMonitorChat();
}

module.exports = AgentMonitorChat;