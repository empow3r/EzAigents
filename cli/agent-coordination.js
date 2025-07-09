const Redis = require('ioredis');
const FileLockManager = require('./file-lock-manager');

class AgentCoordination {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.lockManager = new FileLockManager();
    this.agentId = process.env.AGENT_ID || `agent_${Date.now()}`;
    this.sessionId = `session_${Date.now()}`;
    this.heartbeatInterval = 30000; // 30 seconds
    this.isActive = false;
    
    // Register agent capabilities
    this.capabilities = {
      claude: ['architecture', 'refactoring', 'documentation', 'security'],
      gpt: ['backend-logic', 'api-design', 'frontend', 'implementation'],
      deepseek: ['testing', 'validation', 'devops', 'optimization'],
      mistral: ['documentation', 'analysis', 'comments'],
      gemini: ['analysis', 'optimization', 'performance']
    };
    
    this.setupEventHandlers();
  }
  
  /**
   * Register agent and start coordination
   */
  async registerAgent(agentType, capabilities = []) {
    try {
      // Register agent in Redis
      await this.redis.hset('agents', this.agentId, JSON.stringify({
        type: agentType,
        capabilities: capabilities.length > 0 ? capabilities : this.capabilities[agentType] || [],
        status: 'active',
        session_id: this.sessionId,
        registered_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString()
      }));
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Subscribe to coordination channels
      await this.subscribeToChannels();
      
      // Announce agent registration
      await this.redis.publish('agent:announcements', JSON.stringify({
        type: 'agent_registered',
        agent_id: this.agentId,
        agent_type: agentType,
        capabilities,
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      }));
      
      this.isActive = true;
      console.log(`✅ Agent ${this.agentId} registered as ${agentType}`);
      
      return { success: true, agent_id: this.agentId, session_id: this.sessionId };
    } catch (error) {
      console.error(`❌ Failed to register agent: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Request exclusive access to work on a file
   */
  async requestFileAccess(filePath, taskDescription, priority = 'normal') {
    try {
      // First, try to claim the file
      const claimResult = await this.lockManager.claimFile(filePath, this.agentId);
      
      if (claimResult.success) {
        console.log(`🔒 ${this.agentId} claimed ${filePath}`);
        
        // Announce work start
        await this.redis.publish('agent:work', JSON.stringify({
          type: 'work_started',
          agent_id: this.agentId,
          file: filePath,
          task: taskDescription,
          priority,
          timestamp: new Date().toISOString()
        }));
        
        return { success: true, message: `File access granted: ${filePath}` };
      } else {
        // File is locked by another agent
        console.log(`⚠️  ${filePath} is locked by ${claimResult.owner}`);
        
        // Check if we should wait or coordinate
        const coordination = await this.handleConflict(filePath, claimResult.owner, taskDescription);
        return coordination;
      }
    } catch (error) {
      console.error(`❌ Error requesting file access: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Release file access after work completion
   */
  async releaseFileAccess(filePath, workSummary = '') {
    try {
      const releaseResult = await this.lockManager.releaseFile(filePath, this.agentId);
      
      if (releaseResult.success) {
        // Announce work completion
        await this.redis.publish('agent:work', JSON.stringify({
          type: 'work_completed',
          agent_id: this.agentId,
          file: filePath,
          summary: workSummary,
          timestamp: new Date().toISOString()
        }));
        
        console.log(`🔓 ${this.agentId} released ${filePath}`);
        return { success: true, message: `File access released: ${filePath}` };
      } else {
        return releaseResult;
      }
    } catch (error) {
      console.error(`❌ Error releasing file access: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Handle file access conflicts
   */
  async handleConflict(filePath, currentOwner, taskDescription) {
    // Get current owner's info
    const ownerInfo = await this.getAgentInfo(currentOwner);
    
    if (!ownerInfo) {
      // Owner is not registered, try to force lock
      return await this.lockManager.forceLock(filePath, this.agentId, 'Owner not registered');
    }
    
    // Determine conflict resolution strategy
    const strategy = await this.determineConflictStrategy(filePath, currentOwner, taskDescription);
    
    switch (strategy) {
      case 'wait':
        console.log(`⏳ Waiting for ${filePath} to be released by ${currentOwner}`);
        return await this.lockManager.waitForFile(filePath, this.agentId, 300000); // 5 min timeout
        
      case 'coordinate':
        console.log(`🤝 Requesting coordination with ${currentOwner} for ${filePath}`);
        return await this.requestCoordination(filePath, currentOwner, taskDescription);
        
      case 'queue':
        console.log(`📋 Queueing work for ${filePath} after ${currentOwner}`);
        return await this.queueWork(filePath, currentOwner, taskDescription);
        
      case 'priority_override':
        console.log(`⚡ Priority override for ${filePath} from ${currentOwner}`);
        return await this.lockManager.forceLock(filePath, this.agentId, 'Priority override');
        
      default:
        return { success: false, message: 'Unknown conflict resolution strategy' };
    }
  }
  
  /**
   * Determine conflict resolution strategy
   */
  async determineConflictStrategy(filePath, currentOwner, taskDescription) {
    // Check if file is critical
    const criticalFiles = ['package.json', 'docker-compose.yml', 'CLAUDE.md'];
    const isCritical = criticalFiles.some(file => filePath.includes(file));
    
    // Check task priority
    const isHighPriority = taskDescription.toLowerCase().includes('urgent') || 
                          taskDescription.toLowerCase().includes('critical') ||
                          taskDescription.toLowerCase().includes('security');
    
    // Check if same type of work (avoid conflicts)
    const ownerInfo = await this.getAgentInfo(currentOwner);
    const myCapabilities = this.capabilities[this.agentId.split('_')[0]] || [];
    const ownerCapabilities = ownerInfo?.capabilities || [];
    
    const hasOverlap = myCapabilities.some(cap => ownerCapabilities.includes(cap));
    
    if (isCritical && isHighPriority) {
      return 'priority_override';
    } else if (hasOverlap) {
      return 'coordinate';
    } else {
      return 'wait';
    }
  }
  
  /**
   * Request coordination with another agent
   */
  async requestCoordination(filePath, targetAgent, taskDescription) {
    const coordinationId = `coord_${Date.now()}`;
    
    // Store coordination request
    await this.redis.hset(`coordination:${coordinationId}`, {
      requesting_agent: this.agentId,
      target_agent: targetAgent,
      file_path: filePath,
      task_description: taskDescription,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    
    // Send message to target agent
    await this.redis.lpush(`messages:${targetAgent}`, JSON.stringify({
      type: 'coordination_request',
      from: this.agentId,
      coordination_id: coordinationId,
      file_path: filePath,
      task_description: taskDescription,
      timestamp: new Date().toISOString()
    }));
    
    // Notify coordination channel
    await this.redis.publish('coordination:requests', JSON.stringify({
      coordination_id: coordinationId,
      requesting_agent: this.agentId,
      target_agent: targetAgent,
      file_path: filePath,
      task_description: taskDescription
    }));
    
    return { 
      success: true, 
      message: `Coordination requested with ${targetAgent}`,
      coordination_id: coordinationId 
    };
  }
  
  /**
   * Queue work for later execution
   */
  async queueWork(filePath, currentOwner, taskDescription) {
    const queueKey = `work_queue:${filePath}`;
    
    const workItem = {
      agent_id: this.agentId,
      task_description: taskDescription,
      priority: 'normal',
      queued_at: new Date().toISOString()
    };
    
    await this.redis.lpush(queueKey, JSON.stringify(workItem));
    
    // Notify about queued work
    await this.redis.publish('work:queued', JSON.stringify({
      file_path: filePath,
      agent_id: this.agentId,
      current_owner: currentOwner,
      queue_length: await this.redis.llen(queueKey)
    }));
    
    return { 
      success: true, 
      message: `Work queued for ${filePath}`,
      queue_position: await this.redis.llen(queueKey)
    };
  }
  
  /**
   * Get agent information
   */
  async getAgentInfo(agentId) {
    try {
      const agentData = await this.redis.hget('agents', agentId);
      return agentData ? JSON.parse(agentData) : null;
    } catch (error) {
      console.error(`Error getting agent info: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get all active agents
   */
  async getActiveAgents() {
    try {
      const agents = await this.redis.hgetall('agents');
      const activeAgents = {};
      
      for (const [agentId, data] of Object.entries(agents)) {
        const agentInfo = JSON.parse(data);
        if (agentInfo.status === 'active') {
          activeAgents[agentId] = agentInfo;
        }
      }
      
      return activeAgents;
    } catch (error) {
      console.error(`Error getting active agents: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Start heartbeat to maintain agent registration
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.redis.hset('agents', this.agentId, JSON.stringify({
          ...JSON.parse(await this.redis.hget('agents', this.agentId) || '{}'),
          last_heartbeat: new Date().toISOString()
        }));
      } catch (error) {
        console.error(`Heartbeat error: ${error.message}`);
      }
    }, this.heartbeatInterval);
  }
  
  /**
   * Subscribe to coordination channels
   */
  async subscribeToChannels() {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    await subscriber.subscribe(
      'coordination:requests',
      'agent:announcements',
      'agent:work',
      'work:queued',
      `messages:${this.agentId}`
    );
    
    subscriber.on('message', async (channel, message) => {
      await this.handleMessage(channel, JSON.parse(message));
    });
  }
  
  /**
   * Handle incoming messages
   */
  async handleMessage(channel, message) {
    try {
      switch (channel) {
        case 'coordination:requests':
          if (message.target_agent === this.agentId) {
            console.log(`📨 Coordination request from ${message.requesting_agent} for ${message.file_path}`);
            // Auto-respond to coordination requests
            await this.respondToCoordination(message.coordination_id, 'accepted');
          }
          break;
          
        case 'agent:announcements':
          if (message.type === 'agent_registered' && message.agent_id !== this.agentId) {
            console.log(`👋 New agent registered: ${message.agent_id} (${message.agent_type})`);
          }
          break;
          
        case 'agent:work':
          if (message.agent_id !== this.agentId) {
            console.log(`📊 ${message.agent_id} ${message.type.replace('_', ' ')}: ${message.file || 'system'}`);
          }
          break;
          
        case `messages:${this.agentId}`:
          console.log(`📬 Direct message: ${message.type} from ${message.from}`);
          break;
      }
    } catch (error) {
      console.error(`Error handling message: ${error.message}`);
    }
  }
  
  /**
   * Respond to coordination request
   */
  async respondToCoordination(coordinationId, response) {
    await this.redis.hset(`coordination:${coordinationId}`, {
      response: response,
      responded_at: new Date().toISOString()
    });
    
    // Notify requesting agent
    const coordData = await this.redis.hgetall(`coordination:${coordinationId}`);
    await this.redis.lpush(`messages:${coordData.requesting_agent}`, JSON.stringify({
      type: 'coordination_response',
      from: this.agentId,
      coordination_id: coordinationId,
      response: response,
      timestamp: new Date().toISOString()
    }));
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.isActive = false;
    
    // Clear heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Release all locks
    await this.lockManager.emergencyReleaseAll(this.agentId);
    
    // Unregister agent
    await this.redis.hdel('agents', this.agentId);
    
    // Announce shutdown
    await this.redis.publish('agent:announcements', JSON.stringify({
      type: 'agent_shutdown',
      agent_id: this.agentId,
      timestamp: new Date().toISOString()
    }));
    
    console.log(`👋 Agent ${this.agentId} shutdown gracefully`);
  }
  
  /**
   * Setup event handlers for process cleanup
   */
  setupEventHandlers() {
    // Graceful shutdown on process termination
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught exception:', error);
      await this.shutdown();
      process.exit(1);
    });
  }
}

module.exports = AgentCoordination;