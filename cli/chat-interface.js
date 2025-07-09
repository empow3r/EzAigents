#!/usr/bin/env node

const readline = require('readline');
const Redis = require('ioredis');
const chalk = require('chalk');
const boxen = require('boxen');
const { EventEmitter } = require('events');

/**
 * Ez Aigent Interactive Chat CLI
 * 
 * Features:
 * - Direct communication with agents
 * - Real-time message streaming
 * - Command shortcuts
 * - Agent status monitoring
 * - Task delegation
 */

class ChatCLI extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.currentAgent = null;
    this.userId = `cli-user-${Date.now()}`;
    this.messageHistory = [];
    this.commands = this.initializeCommands();
    
    // Initialize readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('Ez Aigent> '),
      completer: this.completer.bind(this)
    });
    
    this.init();
  }
  
  async init() {
    console.clear();
    this.showWelcomeMessage();
    
    // Subscribe to agent messages
    await this.subscribeToChannels();
    
    // Set up message handling
    this.setupMessageHandling();
    
    // Set up input handling
    this.setupInputHandling();
    
    // Show initial status
    await this.showAgentStatus();
    
    // Start prompt
    this.rl.prompt();
  }
  
  showWelcomeMessage() {
    const welcome = boxen(
      chalk.bold.white('Ez Aigent Multi-Agent Chat Interface\n\n') +
      chalk.gray('Commands:\n') +
      chalk.green('  /help') + chalk.gray(' - Show all commands\n') +
      chalk.green('  /agents') + chalk.gray(' - List online agents\n') +
      chalk.green('  /select <agent>') + chalk.gray(' - Select an agent to chat with\n') +
      chalk.green('  /broadcast <msg>') + chalk.gray(' - Send message to all agents\n') +
      chalk.green('  /task <description>') + chalk.gray(' - Create a new task\n') +
      chalk.green('  /status') + chalk.gray(' - Show system status\n') +
      chalk.green('  /clear') + chalk.gray(' - Clear screen\n') +
      chalk.green('  /exit') + chalk.gray(' - Exit chat\n\n') +
      chalk.yellow('Type a message or command to begin...'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan',
        backgroundColor: '#001122'
      }
    );
    
    console.log(welcome);
  }
  
  initializeCommands() {
    return {
      '/help': this.showHelp.bind(this),
      '/agents': this.listAgents.bind(this),
      '/select': this.selectAgent.bind(this),
      '/broadcast': this.broadcastMessage.bind(this),
      '/task': this.createTask.bind(this),
      '/status': this.showStatus.bind(this),
      '/queue': this.showQueues.bind(this),
      '/locks': this.showLocks.bind(this),
      '/history': this.showHistory.bind(this),
      '/clear': this.clearScreen.bind(this),
      '/exit': this.exitChat.bind(this),
      '/quit': this.exitChat.bind(this)
    };
  }
  
  async subscribeToChannels() {
    const channels = [
      'agent-chat',
      'agent-registry',
      'task-updates',
      'agent-emergency',
      'orchestrator-updates',
      `messages:${this.userId}`
    ];
    
    for (const channel of channels) {
      await this.subscriber.subscribe(channel);
    }
    
    this.subscriber.on('message', (channel, message) => {
      this.handleIncomingMessage(channel, message);
    });
  }
  
  setupMessageHandling() {
    this.on('agent-message', (data) => {
      const timestamp = new Date().toLocaleTimeString();
      const agentColor = this.getAgentColor(data.from);
      
      console.log(
        chalk.gray(`[${timestamp}]`) + ' ' +
        chalk[agentColor](`${data.from}:`) + ' ' +
        chalk.white(data.message)
      );
      
      this.rl.prompt();
    });
    
    this.on('system-message', (data) => {
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(
        chalk.gray(`[${timestamp}]`) + ' ' +
        chalk.yellow('[SYSTEM]:') + ' ' +
        chalk.white(data.message)
      );
      
      this.rl.prompt();
    });
  }
  
  setupInputHandling() {
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        this.rl.prompt();
        return;
      }
      
      // Check if it's a command
      if (trimmed.startsWith('/')) {
        await this.handleCommand(trimmed);
      } else {
        // Regular message
        await this.sendMessage(trimmed);
      }
      
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      this.exitChat();
    });
  }
  
  async handleCommand(input) {
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');
    
    if (this.commands[command]) {
      await this.commands[command](args);
    } else {
      console.log(chalk.red(`Unknown command: ${command}. Type /help for available commands.`));
    }
  }
  
  async sendMessage(message) {
    if (!this.currentAgent) {
      console.log(chalk.yellow('No agent selected. Use /select <agent> or /broadcast <message>'));
      return;
    }
    
    // Store in history
    this.messageHistory.push({
      from: 'You',
      to: this.currentAgent,
      message,
      timestamp: new Date().toISOString()
    });
    
    // Send to selected agent
    await this.redis.lpush(`messages:${this.currentAgent}`, JSON.stringify({
      type: 'chat',
      from: this.userId,
      message,
      timestamp: new Date().toISOString()
    }));
    
    // Show sent message
    console.log(
      chalk.gray(`[${new Date().toLocaleTimeString()}]`) + ' ' +
      chalk.blue('You → ' + this.currentAgent + ':') + ' ' +
      chalk.white(message)
    );
  }
  
  async showHelp() {
    const help = boxen(
      chalk.bold('Available Commands:\n\n') +
      chalk.green('/help') + ' - Show this help message\n' +
      chalk.green('/agents') + ' - List all online agents\n' +
      chalk.green('/select <agent>') + ' - Select an agent for direct chat\n' +
      chalk.green('/broadcast <msg>') + ' - Send message to all agents\n' +
      chalk.green('/task <desc>') + ' - Create a new task\n' +
      chalk.green('/status') + ' - Show system status\n' +
      chalk.green('/queue') + ' - Show task queues\n' +
      chalk.green('/locks') + ' - Show file locks\n' +
      chalk.green('/history') + ' - Show message history\n' +
      chalk.green('/clear') + ' - Clear screen\n' +
      chalk.green('/exit') + ' - Exit chat\n\n' +
      chalk.bold('Message Format:\n') +
      '• Direct message: Just type your message after selecting an agent\n' +
      '• Mention agent: @agent-name your message\n' +
      '• Emergency: !emergency your urgent message',
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    );
    
    console.log(help);
  }
  
  async listAgents() {
    const keys = await this.redis.keys('agent:*');
    const agents = [];
    
    for (const key of keys) {
      const agentData = await this.redis.hgetall(key);
      if (agentData.status === 'active') {
        agents.push({
          id: agentData.id,
          type: agentData.type || 'unknown',
          status: agentData.status,
          capabilities: JSON.parse(agentData.capabilities || '[]'),
          current_task: agentData.current_task || 'idle'
        });
      }
    }
    
    if (agents.length === 0) {
      console.log(chalk.yellow('No agents currently online.'));
      return;
    }
    
    console.log(chalk.bold('\nOnline Agents:\n'));
    
    agents.forEach(agent => {
      const color = this.getAgentColor(agent.id);
      console.log(
        chalk[color](`• ${agent.id}`) + ' ' +
        chalk.gray(`(${agent.type})`) + ' - ' +
        chalk.white(agent.current_task) + '\n' +
        chalk.gray(`  Capabilities: ${agent.capabilities.join(', ')}`)
      );
    });
    
    console.log('');
  }
  
  async selectAgent(agentId) {
    if (!agentId) {
      console.log(chalk.red('Please specify an agent ID. Use /agents to see available agents.'));
      return;
    }
    
    // Check if agent exists
    const agentData = await this.redis.hgetall(`agent:${agentId}`);
    
    if (!agentData.id) {
      console.log(chalk.red(`Agent '${agentId}' not found.`));
      return;
    }
    
    this.currentAgent = agentId;
    console.log(chalk.green(`✓ Now chatting with ${agentId}`));
    
    // Update prompt
    this.rl.setPrompt(chalk.cyan(`Ez Aigent [${agentId}]> `));
  }
  
  async broadcastMessage(message) {
    if (!message) {
      console.log(chalk.red('Please provide a message to broadcast.'));
      return;
    }
    
    await this.redis.publish('agent-chat', JSON.stringify({
      type: 'broadcast',
      from: this.userId,
      to: 'all',
      message,
      timestamp: new Date().toISOString()
    }));
    
    console.log(chalk.green('✓ Message broadcasted to all agents'));
  }
  
  async createTask(description) {
    if (!description) {
      console.log(chalk.red('Please provide a task description.'));
      return;
    }
    
    const task = {
      id: `task-${Date.now()}`,
      description,
      created_by: this.userId,
      created_at: new Date().toISOString(),
      status: 'pending'
    };
    
    // Add to global todo list
    await this.redis.lpush('global-todos', JSON.stringify(task));
    
    // Notify orchestrator
    await this.redis.publish('task-updates', JSON.stringify({
      type: 'new_task',
      task
    }));
    
    console.log(chalk.green(`✓ Task created: ${task.id}`));
  }
  
  async showStatus() {
    console.log(chalk.bold('\nSystem Status:\n'));
    
    // Agent count
    const agentKeys = await this.redis.keys('agent:*');
    const activeAgents = [];
    
    for (const key of agentKeys) {
      const status = await this.redis.hget(key, 'status');
      if (status === 'active') activeAgents.push(key);
    }
    
    console.log(chalk.white('Active Agents: ') + chalk.green(activeAgents.length));
    
    // Queue depths
    const queues = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus'];
    console.log(chalk.white('\nQueue Depths:'));
    
    for (const queue of queues) {
      const depth = await this.redis.llen(`queue:${queue}`);
      console.log(`  ${queue}: ${depth}`);
    }
    
    // Lock count
    const locks = await this.redis.keys('lock:*');
    console.log(chalk.white('\nActive File Locks: ') + chalk.yellow(locks.length));
    
    // Recent failures
    const failures = await this.redis.llen('queue:failures');
    console.log(chalk.white('Failed Tasks: ') + chalk.red(failures));
    
    console.log('');
  }
  
  async showQueues() {
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus'];
    
    console.log(chalk.bold('\nTask Queues:\n'));
    
    for (const model of models) {
      const queueKey = `queue:${model}`;
      const processingKey = `processing:${model}`;
      
      const pending = await this.redis.llen(queueKey);
      const processing = await this.redis.llen(processingKey);
      
      console.log(
        chalk.white(`${model}:`) + '\n' +
        chalk.gray(`  Pending: ${pending}\n`) +
        chalk.gray(`  Processing: ${processing}`)
      );
      
      // Show first task if any
      if (pending > 0) {
        const firstTask = await this.redis.lindex(queueKey, 0);
        const task = JSON.parse(firstTask);
        console.log(chalk.gray(`  Next: ${task.file}`));
      }
      
      console.log('');
    }
  }
  
  async showLocks() {
    const lockKeys = await this.redis.keys('lock:*');
    
    if (lockKeys.length === 0) {
      console.log(chalk.gray('No active file locks.'));
      return;
    }
    
    console.log(chalk.bold('\nActive File Locks:\n'));
    
    for (const key of lockKeys) {
      const filePath = key.replace('lock:', '');
      const owner = await this.redis.get(key);
      const ttl = await this.redis.ttl(key);
      
      console.log(
        chalk.yellow('🔒 ') + chalk.white(filePath) + '\n' +
        chalk.gray(`   Owner: ${owner}\n`) +
        chalk.gray(`   TTL: ${ttl}s`)
      );
    }
    
    console.log('');
  }
  
  showHistory() {
    if (this.messageHistory.length === 0) {
      console.log(chalk.gray('No message history.'));
      return;
    }
    
    console.log(chalk.bold('\nMessage History:\n'));
    
    this.messageHistory.slice(-20).forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      console.log(
        chalk.gray(`[${time}]`) + ' ' +
        chalk.blue(msg.from) + ' → ' +
        chalk.green(msg.to) + ': ' +
        chalk.white(msg.message)
      );
    });
    
    console.log('');
  }
  
  clearScreen() {
    console.clear();
    this.showWelcomeMessage();
  }
  
  async exitChat() {
    console.log(chalk.yellow('\nGoodbye! 👋'));
    
    // Cleanup
    await this.redis.quit();
    await this.subscriber.quit();
    this.rl.close();
    
    process.exit(0);
  }
  
  handleIncomingMessage(channel, message) {
    try {
      const data = JSON.parse(message);
      
      switch (channel) {
        case 'agent-chat':
          if (data.from !== this.userId) {
            this.emit('agent-message', data);
          }
          break;
          
        case 'agent-registry':
          if (data.type === 'agent_registered') {
            this.emit('system-message', {
              message: `Agent ${data.agent.id} came online`
            });
          }
          break;
          
        case 'task-updates':
          this.emit('system-message', {
            message: `Task update: ${data.type}`
          });
          break;
          
        case 'agent-emergency':
          console.log(
            '\n' + chalk.red.bold('🚨 EMERGENCY: ') + chalk.white(data.message) + '\n'
          );
          this.rl.prompt();
          break;
      }
    } catch (error) {
      // Ignore parse errors
    }
  }
  
  getAgentColor(agentId) {
    const colors = ['green', 'blue', 'magenta', 'cyan', 'yellow'];
    const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
  
  completer(line) {
    const commands = Object.keys(this.commands);
    const hits = commands.filter(cmd => cmd.startsWith(line));
    return [hits.length ? hits : commands, line];
  }
  
  async showAgentStatus() {
    const agents = await this.redis.keys('agent:*');
    const activeCount = agents.length;
    
    if (activeCount > 0) {
      console.log(chalk.gray(`\n${activeCount} agents online. Use /agents to list them.\n`));
    } else {
      console.log(chalk.yellow('\nNo agents currently online. Start agents to begin chatting.\n'));
    }
  }
}

// Check if required packages are installed
try {
  require('chalk');
  require('boxen');
} catch (error) {
  console.log('Installing required packages...');
  require('child_process').execSync('npm install chalk boxen', { stdio: 'inherit' });
}

// Start the chat interface
if (require.main === module) {
  new ChatCLI();
}

module.exports = ChatCLI;