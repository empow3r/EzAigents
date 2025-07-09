#!/usr/bin/env node

const readline = require('readline');
const Redis = require('ioredis');
const { EventEmitter } = require('events');

/**
 * Ez Aigent Chat CLI - Simple Version
 * 
 * A lightweight chat interface for communicating with AI agents
 */

class ChatInterface extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.currentAgent = null;
    this.userId = `cli-user-${Date.now()}`;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\x1b[36mEz Aigent> \x1b[0m'
    });
    
    this.init();
  }
  
  async init() {
    console.clear();
    console.log('\x1b[1m\x1b[36m==================================\x1b[0m');
    console.log('\x1b[1m  Ez Aigent Multi-Agent Chat CLI\x1b[0m');
    console.log('\x1b[1m\x1b[36m==================================\x1b[0m\n');
    
    console.log('Commands:');
    console.log('  \x1b[32m/help\x1b[0m - Show help');
    console.log('  \x1b[32m/agents\x1b[0m - List online agents');
    console.log('  \x1b[32m/select <agent>\x1b[0m - Select an agent');
    console.log('  \x1b[32m/broadcast <msg>\x1b[0m - Message all agents');
    console.log('  \x1b[32m/status\x1b[0m - Show system status');
    console.log('  \x1b[32m/exit\x1b[0m - Exit chat\n');
    
    // Subscribe to channels
    await this.subscriber.subscribe('agent-chat');
    await this.subscriber.subscribe('agent-registry');
    await this.subscriber.subscribe(`messages:${this.userId}`);
    
    // Handle incoming messages
    this.subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        if (data.from !== this.userId) {
          const time = new Date().toLocaleTimeString();
          console.log(`\n\x1b[90m[${time}]\x1b[0m \x1b[33m${data.from}:\x1b[0m ${data.message}`);
          this.rl.prompt();
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    // Handle input
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }
      
      if (trimmed.startsWith('/')) {
        await this.handleCommand(trimmed);
      } else {
        await this.sendMessage(trimmed);
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('\n\x1b[33mGoodbye! 👋\x1b[0m');
      process.exit(0);
    });
    
    // Show initial status
    const agents = await this.redis.keys('agent:*');
    console.log(`\x1b[90m${agents.length} agents online\x1b[0m\n`);
    
    this.rl.prompt();
  }
  
  async handleCommand(input) {
    const [command, ...args] = input.split(' ');
    const arg = args.join(' ');
    
    switch (command) {
      case '/help':
        this.showHelp();
        break;
        
      case '/agents':
        await this.listAgents();
        break;
        
      case '/select':
        await this.selectAgent(arg);
        break;
        
      case '/broadcast':
        await this.broadcastMessage(arg);
        break;
        
      case '/status':
        await this.showStatus();
        break;
        
      case '/exit':
      case '/quit':
        this.rl.close();
        break;
        
      default:
        console.log(`\x1b[31mUnknown command: ${command}\x1b[0m`);
    }
  }
  
  showHelp() {
    console.log('\n\x1b[1mAvailable Commands:\x1b[0m');
    console.log('  \x1b[32m/help\x1b[0m - Show this help');
    console.log('  \x1b[32m/agents\x1b[0m - List all online agents');
    console.log('  \x1b[32m/select <agent>\x1b[0m - Select agent for chat');
    console.log('  \x1b[32m/broadcast <msg>\x1b[0m - Send to all agents');
    console.log('  \x1b[32m/status\x1b[0m - Show system status');
    console.log('  \x1b[32m/exit\x1b[0m - Exit chat\n');
    console.log('\x1b[1mUsage:\x1b[0m');
    console.log('  1. Use /select to choose an agent');
    console.log('  2. Type messages to send to selected agent');
    console.log('  3. Use /broadcast for all agents\n');
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
          current_task: data.current_task || 'idle'
        });
      }
    }
    
    if (agents.length === 0) {
      console.log('\x1b[33mNo agents online\x1b[0m');
      return;
    }
    
    console.log('\n\x1b[1mOnline Agents:\x1b[0m');
    agents.forEach(agent => {
      console.log(`  \x1b[32m${agent.id}\x1b[0m (${agent.type}) - ${agent.current_task}`);
    });
    console.log('');
  }
  
  async selectAgent(agentId) {
    if (!agentId) {
      console.log('\x1b[31mPlease specify an agent ID\x1b[0m');
      return;
    }
    
    const exists = await this.redis.exists(`agent:${agentId}`);
    if (!exists) {
      console.log(`\x1b[31mAgent '${agentId}' not found\x1b[0m`);
      return;
    }
    
    this.currentAgent = agentId;
    console.log(`\x1b[32m✓ Selected ${agentId}\x1b[0m`);
    this.rl.setPrompt(`\x1b[36mEz Aigent [${agentId}]> \x1b[0m`);
  }
  
  async sendMessage(message) {
    if (!this.currentAgent) {
      console.log('\x1b[33mNo agent selected. Use /select <agent>\x1b[0m');
      return;
    }
    
    await this.redis.lpush(`messages:${this.currentAgent}`, JSON.stringify({
      type: 'chat',
      from: this.userId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    const time = new Date().toLocaleTimeString();
    console.log(`\x1b[90m[${time}]\x1b[0m \x1b[34mYou → ${this.currentAgent}:\x1b[0m ${message}`);
  }
  
  async broadcastMessage(message) {
    if (!message) {
      console.log('\x1b[31mPlease provide a message\x1b[0m');
      return;
    }
    
    await this.redis.publish('agent-chat', JSON.stringify({
      type: 'broadcast',
      from: this.userId,
      to: 'all',
      message,
      timestamp: new Date().toISOString()
    }));
    
    console.log('\x1b[32m✓ Broadcasted to all agents\x1b[0m');
  }
  
  async showStatus() {
    console.log('\n\x1b[1mSystem Status:\x1b[0m');
    
    // Count agents
    const agentKeys = await this.redis.keys('agent:*');
    let activeCount = 0;
    for (const key of agentKeys) {
      const status = await this.redis.hget(key, 'status');
      if (status === 'active') activeCount++;
    }
    console.log(`  Active Agents: \x1b[32m${activeCount}\x1b[0m`);
    
    // Queue depths
    const queues = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus'];
    console.log('\n  Queue Depths:');
    for (const queue of queues) {
      const depth = await this.redis.llen(`queue:${queue}`);
      console.log(`    ${queue}: ${depth}`);
    }
    
    // Locks
    const locks = await this.redis.keys('lock:*');
    console.log(`\n  Active Locks: \x1b[33m${locks.length}\x1b[0m`);
    
    // Failures
    const failures = await this.redis.llen('queue:failures');
    console.log(`  Failed Tasks: \x1b[31m${failures}\x1b[0m\n`);
  }
}

// Start the chat
if (require.main === module) {
  new ChatInterface();
}

module.exports = ChatInterface;