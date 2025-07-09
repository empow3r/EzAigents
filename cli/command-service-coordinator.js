const Redis = require('ioredis');
const { execSync } = require('child_process');

/**
 * Command and Service Coordinator
 * 
 * Prevents multiple agents from running the same commands/services simultaneously
 * and provides collaborative assistance without interfering with work.
 */
class CommandServiceCoordinator {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agentId = process.env.AGENT_ID || `agent_${Date.now()}`;
    this.lockTimeout = 300; // 5 minutes for command execution
    this.heartbeatInterval = 10000; // 10 seconds for active commands
    
    // Define critical commands that should have exclusive access
    this.exclusiveCommands = [
      'npm install', 'npm update', 'npm run build',
      'docker-compose up', 'docker-compose down', 'docker-compose restart',
      'git commit', 'git push', 'git pull', 'git merge',
      'pm2 restart', 'pm2 stop', 'pm2 start',
      'systemctl start', 'systemctl stop', 'systemctl restart',
      'redis-cli flushdb', 'redis-cli flushall',
      'chmod +x', 'chown',
      'kill', 'killall', 'pkill'
    ];
    
    // Commands that can run concurrently but should be logged
    this.monitoredCommands = [
      'npm run', 'node', 'python', 'curl', 'wget',
      'git status', 'git diff', 'git log',
      'docker ps', 'docker logs', 'docker exec',
      'redis-cli', 'psql', 'mysql',
      'ls', 'cat', 'grep', 'find'
    ];
    
    // Service patterns that need coordination
    this.servicePatterns = [
      { pattern: /port\s+(\d+)/, type: 'port' },
      { pattern: /localhost:(\d+)/, type: 'port' },
      { pattern: /(npm\s+run\s+\w+)/, type: 'npm_script' },
      { pattern: /(docker-compose\s+\w+)/, type: 'docker_compose' },
      { pattern: /(pm2\s+\w+)/, type: 'pm2' },
      { pattern: /(systemctl\s+\w+\s+\w+)/, type: 'systemctl' }
    ];
    
    this.setupEventHandlers();
  }

  /**
   * Request permission to execute a command
   */
  async requestCommandExecution(command, context = {}) {
    const commandHash = this.hashCommand(command);
    const lockKey = `command_lock:${commandHash}`;
    const metaKey = `command_meta:${commandHash}`;
    
    // Check if this is an exclusive command
    const isExclusive = this.exclusiveCommands.some(cmd => 
      command.toLowerCase().includes(cmd.toLowerCase())
    );
    
    if (isExclusive) {
      // Try to acquire exclusive lock
      const result = await this.redis.set(lockKey, this.agentId, 'EX', this.lockTimeout, 'NX');
      
      if (result === 'OK') {
        // Store command metadata
        await this.redis.hset(metaKey, {
          agent: this.agentId,
          command: command,
          started_at: new Date().toISOString(),
          context: JSON.stringify(context),
          status: 'running'
        });
        
        // Notify other agents
        await this.redis.publish('command_execution', JSON.stringify({
          type: 'exclusive_command_started',
          agent: this.agentId,
          command: command,
          command_hash: commandHash,
          timestamp: new Date().toISOString()
        }));
        
        // Start heartbeat for this command
        this.startCommandHeartbeat(commandHash);
        
        return { 
          success: true, 
          exclusive: true,
          message: `Exclusive command access granted: ${command}`,
          command_hash: commandHash
        };
      } else {
        // Command is already running by another agent
        const currentOwner = await this.redis.get(lockKey);
        const meta = await this.redis.hgetall(metaKey);
        
        return {
          success: false,
          exclusive: true,
          message: `Command already running by ${currentOwner}`,
          current_owner: currentOwner,
          command_details: meta,
          suggestion: await this.generateAlternativeSuggestion(command)
        };
      }
    } else {
      // Non-exclusive command - just log it
      await this.logCommandExecution(command, context);
      
      return {
        success: true,
        exclusive: false,
        message: `Command logged: ${command}`,
        command_hash: commandHash
      };
    }
  }

  /**
   * Log command execution for monitoring
   */
  async logCommandExecution(command, context = {}) {
    const commandHash = this.hashCommand(command);
    const logKey = `command_log:${commandHash}`;
    
    // Store in command execution log
    await this.redis.lpush('command_execution_log', JSON.stringify({
      agent: this.agentId,
      command: command,
      command_hash: commandHash,
      context: context,
      timestamp: new Date().toISOString()
    }));
    
    // Keep only last 1000 log entries
    await this.redis.ltrim('command_execution_log', 0, 999);
    
    // Notify monitoring channel
    await this.redis.publish('command_monitoring', JSON.stringify({
      type: 'command_logged',
      agent: this.agentId,
      command: command,
      command_hash: commandHash,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Release command execution lock
   */
  async releaseCommandExecution(commandHash, result = {}) {
    const lockKey = `command_lock:${commandHash}`;
    const metaKey = `command_meta:${commandHash}`;
    
    // Verify ownership
    const currentOwner = await this.redis.get(lockKey);
    if (currentOwner !== this.agentId) {
      return {
        success: false,
        message: `Cannot release command - owned by ${currentOwner}`
      };
    }
    
    // Update metadata with completion
    await this.redis.hset(metaKey, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      result: JSON.stringify(result)
    });
    
    // Set expiration for metadata (keep for 1 hour)
    await this.redis.expire(metaKey, 3600);
    
    // Release lock
    await this.redis.del(lockKey);
    
    // Stop heartbeat
    this.stopCommandHeartbeat(commandHash);
    
    // Notify completion
    await this.redis.publish('command_execution', JSON.stringify({
      type: 'exclusive_command_completed',
      agent: this.agentId,
      command_hash: commandHash,
      result: result,
      timestamp: new Date().toISOString()
    }));
    
    return {
      success: true,
      message: `Command execution released: ${commandHash}`
    };
  }

  /**
   * Check what other agents are currently doing
   */
  async getAgentActivities() {
    const activities = {
      exclusive_commands: {},
      recent_commands: [],
      agent_status: {}
    };
    
    // Get all active exclusive commands
    const commandLocks = await this.redis.keys('command_lock:*');
    for (const lockKey of commandLocks) {
      const commandHash = lockKey.replace('command_lock:', '');
      const agent = await this.redis.get(lockKey);
      const meta = await this.redis.hgetall(`command_meta:${commandHash}`);
      
      activities.exclusive_commands[commandHash] = {
        agent: agent,
        command: meta.command,
        started_at: meta.started_at,
        status: meta.status
      };
    }
    
    // Get recent command executions
    const recentLogs = await this.redis.lrange('command_execution_log', 0, 20);
    activities.recent_commands = recentLogs.map(log => JSON.parse(log));
    
    // Get agent status from coordination system
    const agents = await this.redis.hgetall('agents');
    for (const [agentId, data] of Object.entries(agents)) {
      activities.agent_status[agentId] = JSON.parse(data);
    }
    
    return activities;
  }

  /**
   * Provide assistance to another agent
   */
  async offerAssistance(targetAgent, assistanceType, details = {}) {
    const assistanceId = `assist_${Date.now()}`;
    
    // Store assistance offer
    await this.redis.hset(`assistance:${assistanceId}`, {
      offering_agent: this.agentId,
      target_agent: targetAgent,
      assistance_type: assistanceType,
      details: JSON.stringify(details),
      status: 'offered',
      offered_at: new Date().toISOString()
    });
    
    // Send message to target agent
    await this.redis.lpush(`messages:${targetAgent}`, JSON.stringify({
      type: 'assistance_offer',
      from: this.agentId,
      assistance_id: assistanceId,
      assistance_type: assistanceType,
      details: details,
      timestamp: new Date().toISOString()
    }));
    
    // Notify assistance channel
    await this.redis.publish('agent_assistance', JSON.stringify({
      type: 'assistance_offered',
      offering_agent: this.agentId,
      target_agent: targetAgent,
      assistance_type: assistanceType,
      assistance_id: assistanceId,
      timestamp: new Date().toISOString()
    }));
    
    return {
      success: true,
      assistance_id: assistanceId,
      message: `Assistance offered to ${targetAgent}`
    };
  }

  /**
   * Accept assistance from another agent
   */
  async acceptAssistance(assistanceId, acceptanceMessage = '') {
    const assistanceKey = `assistance:${assistanceId}`;
    const assistance = await this.redis.hgetall(assistanceKey);
    
    if (!assistance.offering_agent) {
      return {
        success: false,
        message: 'Assistance offer not found'
      };
    }
    
    // Update assistance status
    await this.redis.hset(assistanceKey, {
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      acceptance_message: acceptanceMessage
    });
    
    // Notify offering agent
    await this.redis.lpush(`messages:${assistance.offering_agent}`, JSON.stringify({
      type: 'assistance_accepted',
      from: this.agentId,
      assistance_id: assistanceId,
      acceptance_message: acceptanceMessage,
      timestamp: new Date().toISOString()
    }));
    
    // Create collaboration session
    const collaborationId = `collab_${Date.now()}`;
    await this.redis.hset(`collaboration:${collaborationId}`, {
      primary_agent: this.agentId,
      assisting_agent: assistance.offering_agent,
      assistance_type: assistance.assistance_type,
      started_at: new Date().toISOString(),
      status: 'active'
    });
    
    return {
      success: true,
      collaboration_id: collaborationId,
      message: `Assistance accepted from ${assistance.offering_agent}`
    };
  }

  /**
   * Generate alternative suggestions when command is blocked
   */
  async generateAlternativeSuggestion(blockedCommand) {
    const suggestions = [];
    
    // Analyze the blocked command
    if (blockedCommand.includes('npm install')) {
      suggestions.push('Try using npm cache to speed up installation');
      suggestions.push('Check if dependencies are already installed');
      suggestions.push('Consider using npm ci for faster CI installs');
    } else if (blockedCommand.includes('docker-compose')) {
      suggestions.push('Check current container status with docker ps');
      suggestions.push('View logs with docker-compose logs');
      suggestions.push('Try docker-compose ps to see service status');
    } else if (blockedCommand.includes('git')) {
      suggestions.push('Check git status first');
      suggestions.push('Review changes with git diff');
      suggestions.push('Consider git stash if you have uncommitted changes');
    }
    
    return suggestions;
  }

  /**
   * Start heartbeat for active command
   */
  startCommandHeartbeat(commandHash) {
    if (this.commandHeartbeats) {
      this.commandHeartbeats = {};
    }
    
    this.commandHeartbeats[commandHash] = setInterval(async () => {
      try {
        const metaKey = `command_meta:${commandHash}`;
        const exists = await this.redis.exists(metaKey);
        
        if (exists) {
          await this.redis.hset(metaKey, {
            last_heartbeat: new Date().toISOString()
          });
        } else {
          this.stopCommandHeartbeat(commandHash);
        }
      } catch (error) {
        console.error(`Command heartbeat error for ${commandHash}:`, error);
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat for completed command
   */
  stopCommandHeartbeat(commandHash) {
    if (this.commandHeartbeats && this.commandHeartbeats[commandHash]) {
      clearInterval(this.commandHeartbeats[commandHash]);
      delete this.commandHeartbeats[commandHash];
    }
  }

  /**
   * Hash command for consistent identification
   */
  hashCommand(command) {
    // Normalize command for consistent hashing
    const normalized = command.toLowerCase().trim().replace(/\s+/g, ' ');
    return require('crypto').createHash('md5').update(normalized).digest('hex').substring(0, 12);
  }

  /**
   * Setup event handlers for monitoring
   */
  setupEventHandlers() {
    // Listen for command execution events
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    subscriber.subscribe(
      'command_execution',
      'command_monitoring',
      'agent_assistance'
    );
    
    subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleCommandEvent(channel, data);
      } catch (error) {
        console.error('Error handling command event:', error);
      }
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Handle command execution events
   */
  async handleCommandEvent(channel, data) {
    switch (channel) {
      case 'command_execution':
        if (data.type === 'exclusive_command_started' && data.agent !== this.agentId) {
          console.log(`🔒 ${data.agent} started exclusive command: ${data.command}`);
        } else if (data.type === 'exclusive_command_completed' && data.agent !== this.agentId) {
          console.log(`✅ ${data.agent} completed exclusive command`);
        }
        break;
        
      case 'command_monitoring':
        if (data.type === 'command_logged' && data.agent !== this.agentId) {
          console.log(`📊 ${data.agent} executed: ${data.command}`);
        }
        break;
        
      case 'agent_assistance':
        if (data.type === 'assistance_offered' && data.target_agent === this.agentId) {
          console.log(`🤝 ${data.offering_agent} offered assistance: ${data.assistance_type}`);
        }
        break;
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    console.log(`🛑 Shutting down Command Service Coordinator for ${this.agentId}`);
    
    // Stop all heartbeats
    if (this.commandHeartbeats) {
      for (const commandHash of Object.keys(this.commandHeartbeats)) {
        this.stopCommandHeartbeat(commandHash);
      }
    }
    
    // Release all command locks owned by this agent
    const commandLocks = await this.redis.keys('command_lock:*');
    for (const lockKey of commandLocks) {
      const owner = await this.redis.get(lockKey);
      if (owner === this.agentId) {
        const commandHash = lockKey.replace('command_lock:', '');
        await this.releaseCommandExecution(commandHash, { status: 'interrupted' });
      }
    }
    
    console.log(`✅ Command Service Coordinator shutdown complete`);
  }
}

module.exports = CommandServiceCoordinator;