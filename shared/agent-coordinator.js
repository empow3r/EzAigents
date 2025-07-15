const Redis = require('redis');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

/**
 * Universal Agent Coordinator
 * Handles communication, resource management, and coordination for all Ez Aigent agents
 */
class AgentCoordinator {
  constructor(config = {}) {
    this.agentId = config.agentId || `agent-${Date.now()}`;
    this.agentType = config.agentType || 'generic';
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = null;
    this.pubsub = null;
    this.isConnected = false;
    
    // Shared directories
    this.sharedDir = path.join(process.cwd(), 'shared');
    this.memoryDir = path.join(process.cwd(), '.agent-memory');
    this.locksDir = path.join(this.memoryDir, 'locks');
    this.communicationDir = path.join(this.memoryDir, 'communication');
    
    // Agent registry
    this.registeredAgents = new Map();
    this.messageHandlers = new Map();
    
    // Port management
    this.reservedPorts = new Set();
    this.portLocks = new Map();
    
    // File locks
    this.fileLocks = new Map();
    this.lockTimeouts = new Map();
    
    this.log = this.log.bind(this);
  }

  async initialize() {
    try {
      // Parallel initialization for speed
      await Promise.all([
        this.ensureDirectories(),
        this.connectRedis()
      ]);
      
      // Initialize port management
      await this.initializePortManagement();
      
      // Register this agent
      await this.registerAgent();
      
      // Start message listening
      await this.startMessageListener();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isConnected = true;
      this.log('Agent coordinator initialized successfully');
      
      return true;
    } catch (error) {
      this.log(`Failed to initialize coordinator: ${error.message}`, 'error');
      throw error;
    }
  }

  async ensureDirectories() {
    const dirs = [
      this.sharedDir,
      this.memoryDir,
      this.locksDir,
      this.communicationDir,
      path.join(this.memoryDir, this.agentType),
      path.join(this.communicationDir, 'messages'),
      path.join(this.communicationDir, 'broadcasts')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async connectRedis() {
    this.redis = Redis.createClient({ url: this.redisUrl });
    this.pubsub = this.redis.duplicate();
    
    this.redis.on('error', (err) => this.log(`Redis error: ${err}`, 'error'));
    this.pubsub.on('error', (err) => this.log(`Redis pubsub error: ${err}`, 'error'));
    
    await this.redis.connect();
    await this.pubsub.connect();
    
    this.log('Connected to Redis');
  }

  async initializePortManagement() {
    // Load existing port reservations
    try {
      const portData = await this.redis.hGetAll('agent:ports:reserved');
      for (const [port, agentId] of Object.entries(portData)) {
        this.reservedPorts.add(parseInt(port));
        this.portLocks.set(parseInt(port), agentId);
      }
    } catch (error) {
      this.log(`Failed to load port reservations: ${error.message}`, 'warn');
    }
  }

  async registerAgent() {
    const registration = {
      agentId: this.agentId,
      agentType: this.agentType,
      pid: process.pid,
      startTime: new Date().toISOString(),
      version: '1.0.0',
      capabilities: this.getCapabilities(),
      status: 'initializing',
      lastHeartbeat: new Date().toISOString()
    };
    
    // Register in Redis
    await this.redis.hSet('agents:registry', this.agentId, JSON.stringify(registration));
    
    // Register in file system
    const registryFile = path.join(this.communicationDir, 'agent-registry.json');
    let registry = {};
    
    try {
      const data = await fs.readFile(registryFile, 'utf8');
      registry = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }
    
    registry[this.agentId] = registration;
    await fs.writeFile(registryFile, JSON.stringify(registry, null, 2));
    
    // Broadcast registration
    await this.broadcastMessage('agent:registered', registration);
    
    this.log(`Agent registered: ${this.agentId} (${this.agentType})`);
  }

  getCapabilities() {
    const baseCapabilities = [
      'communication',
      'file_locking',
      'port_management',
      'health_monitoring'
    ];
    
    // Add type-specific capabilities
    switch (this.agentType) {
      case 'claude':
        return [...baseCapabilities, 'code_analysis', 'architecture', 'large_context'];
      case 'gpt':
        return [...baseCapabilities, 'api_development', 'backend_logic'];
      case 'deepseek':
        return [...baseCapabilities, 'testing', 'validation', 'code_generation'];
      case 'mistral':
        return [...baseCapabilities, 'documentation', 'summarization'];
      case 'gemini':
        return [...baseCapabilities, 'code_analysis', 'research'];
      case 'webscraper':
        return [...baseCapabilities, 'web_scraping', 'authentication', 'data_extraction'];
      default:
        return baseCapabilities;
    }
  }

  async startMessageListener() {
    // Subscribe to agent communications
    await this.pubsub.subscribe('agent:broadcast', (message) => {
      this.handleBroadcastMessage(JSON.parse(message));
    });
    
    await this.pubsub.subscribe(`agent:direct:${this.agentId}`, (message) => {
      this.handleDirectMessage(JSON.parse(message));
    });
    
    await this.pubsub.subscribe('agent:coordination', (message) => {
      this.handleCoordinationMessage(JSON.parse(message));
    });
  }

  async handleBroadcastMessage(message) {
    try {
      const { type, data, sender } = message;
      
      if (sender === this.agentId) return; // Ignore own messages
      
      switch (type) {
        case 'agent:registered':
          this.registeredAgents.set(data.agentId, data);
          this.log(`New agent registered: ${data.agentId} (${data.agentType})`);
          break;
          
        case 'agent:deregistered':
          this.registeredAgents.delete(data.agentId);
          this.log(`Agent deregistered: ${data.agentId}`);
          break;
          
        case 'port:request':
          await this.handlePortRequest(data);
          break;
          
        case 'file:lock:request':
          await this.handleFileLockRequest(data);
          break;
          
        case 'task:collaboration':
          await this.handleCollaborationRequest(data);
          break;
      }
      
      // Call custom handlers
      if (this.messageHandlers.has(type)) {
        await this.messageHandlers.get(type)(data, sender);
      }
    } catch (error) {
      this.log(`Error handling broadcast message: ${error.message}`, 'error');
    }
  }

  async handleDirectMessage(message) {
    try {
      const { type, data, sender } = message;
      
      switch (type) {
        case 'health:check':
          await this.sendDirectMessage(sender, 'health:response', {
            agentId: this.agentId,
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage()
          });
          break;
          
        case 'capability:query':
          await this.sendDirectMessage(sender, 'capability:response', {
            agentId: this.agentId,
            capabilities: this.getCapabilities()
          });
          break;
          
        case 'task:delegate':
          await this.handleTaskDelegation(data, sender);
          break;
      }
      
      // Call custom handlers
      if (this.messageHandlers.has(type)) {
        await this.messageHandlers.get(type)(data, sender);
      }
    } catch (error) {
      this.log(`Error handling direct message: ${error.message}`, 'error');
    }
  }

  async handleCoordinationMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'system:shutdown':
        this.log('System shutdown requested');
        await this.cleanup();
        process.exit(0);
        break;
        
      case 'agent:update':
        if (data.agentId === this.agentId) {
          this.log('Update requested for this agent');
          // Handle update logic
        }
        break;
    }
  }

  // Port Management Methods
  async requestPort(port, purpose = 'general') {
    try {
      // Check if port is available
      const isAvailable = await this.checkPortAvailability(port);
      if (!isAvailable) {
        throw new Error(`Port ${port} is already in use`);
      }
      
      // Try to reserve the port
      const lockKey = `port:lock:${port}`;
      const lockValue = `${this.agentId}:${Date.now()}`;
      
      const acquired = await this.redis.set(lockKey, lockValue, {
        PX: 30000, // 30 second timeout
        NX: true   // Only set if doesn't exist
      });
      
      if (!acquired) {
        throw new Error(`Port ${port} is locked by another agent`);
      }
      
      // Reserve the port
      await this.redis.hSet('agent:ports:reserved', port, this.agentId);
      await this.redis.hSet('agent:ports:purpose', port, purpose);
      
      this.reservedPorts.add(port);
      this.portLocks.set(port, this.agentId);
      
      this.log(`Port ${port} reserved for ${purpose}`);
      return true;
      
    } catch (error) {
      this.log(`Failed to request port ${port}: ${error.message}`, 'error');
      return false;
    }
  }

  async releasePort(port) {
    try {
      // Remove reservations
      await this.redis.hDel('agent:ports:reserved', port);
      await this.redis.hDel('agent:ports:purpose', port);
      await this.redis.del(`port:lock:${port}`);
      
      this.reservedPorts.delete(port);
      this.portLocks.delete(port);
      
      this.log(`Port ${port} released`);
      return true;
    } catch (error) {
      this.log(`Failed to release port ${port}: ${error.message}`, 'error');
      return false;
    }
  }

  async checkPortAvailability(port) {
    try {
      // Check if reserved by another agent
      const reservedBy = await this.redis.hGet('agent:ports:reserved', port);
      if (reservedBy && reservedBy !== this.agentId) {
        return false;
      }
      
      // Check if actually in use on system
      try {
        const { stdout } = await execAsync(`lsof -Pi :${port} -sTCP:LISTEN -t`);
        return !stdout.trim(); // If no output, port is free
      } catch (error) {
        // lsof error usually means port is free
        return true;
      }
    } catch (error) {
      this.log(`Error checking port ${port}: ${error.message}`, 'warn');
      return false;
    }
  }

  async getAllPortStatus() {
    try {
      const reserved = await this.redis.hGetAll('agent:ports:reserved');
      const purposes = await this.redis.hGetAll('agent:ports:purpose');
      
      const status = {};
      for (const [port, agentId] of Object.entries(reserved)) {
        status[port] = {
          reservedBy: agentId,
          purpose: purposes[port] || 'unknown',
          available: await this.checkPortAvailability(parseInt(port))
        };
      }
      
      return status;
    } catch (error) {
      this.log(`Failed to get port status: ${error.message}`, 'error');
      return {};
    }
  }

  // File Lock Management
  async acquireFileLock(filePath, operation = 'write', timeout = 30000) {
    try {
      const lockId = crypto.randomUUID();
      const lockKey = `file:lock:${Buffer.from(filePath).toString('base64')}`;
      const lockValue = `${this.agentId}:${lockId}:${operation}`;
      
      // Try to acquire lock
      const acquired = await this.redis.set(lockKey, lockValue, {
        PX: timeout,
        NX: true
      });
      
      if (!acquired) {
        const existingLock = await this.redis.get(lockKey);
        throw new Error(`File locked by: ${existingLock}`);
      }
      
      // Store local reference
      this.fileLocks.set(filePath, lockId);
      
      // Set local timeout to release lock
      const timeoutHandle = setTimeout(async () => {
        await this.releaseFileLock(filePath);
      }, timeout);
      
      this.lockTimeouts.set(filePath, timeoutHandle);
      
      this.log(`File lock acquired: ${filePath} (${operation})`);
      return lockId;
      
    } catch (error) {
      this.log(`Failed to acquire file lock for ${filePath}: ${error.message}`, 'error');
      throw error;
    }
  }

  async releaseFileLock(filePath) {
    try {
      const lockId = this.fileLocks.get(filePath);
      if (!lockId) {
        return false;
      }
      
      const lockKey = `file:lock:${Buffer.from(filePath).toString('base64')}`;
      
      // Use Lua script to ensure we only delete our own lock
      const luaScript = `
        local lockKey = KEYS[1]
        local expectedValue = ARGV[1]
        local currentValue = redis.call('GET', lockKey)
        
        if currentValue and string.find(currentValue, expectedValue) then
          return redis.call('DEL', lockKey)
        else
          return 0
        end
      `;
      
      await this.redis.eval(luaScript, {
        keys: [lockKey],
        arguments: [this.agentId + ':' + lockId]
      });
      
      // Clean up local references
      this.fileLocks.delete(filePath);
      
      const timeoutHandle = this.lockTimeouts.get(filePath);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        this.lockTimeouts.delete(filePath);
      }
      
      this.log(`File lock released: ${filePath}`);
      return true;
      
    } catch (error) {
      this.log(`Failed to release file lock for ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  async isFileLocked(filePath) {
    try {
      const lockKey = `file:lock:${Buffer.from(filePath).toString('base64')}`;
      const lockValue = await this.redis.get(lockKey);
      
      if (!lockValue) return false;
      
      const [agentId, lockId, operation] = lockValue.split(':');
      return {
        locked: true,
        agentId,
        lockId,
        operation,
        isOwnLock: agentId === this.agentId
      };
    } catch (error) {
      this.log(`Error checking file lock for ${filePath}: ${error.message}`, 'error');
      return false;
    }
  }

  // Communication Methods
  async broadcastMessage(type, data) {
    const message = {
      type,
      data,
      sender: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    await this.pubsub.publish('agent:broadcast', JSON.stringify(message));
  }

  async sendDirectMessage(targetAgentId, type, data) {
    const message = {
      type,
      data,
      sender: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    await this.pubsub.publish(`agent:direct:${targetAgentId}`, JSON.stringify(message));
  }

  async sendCoordinationMessage(type, data) {
    const message = {
      type,
      data,
      sender: this.agentId,
      timestamp: new Date().toISOString()
    };
    
    await this.pubsub.publish('agent:coordination', JSON.stringify(message));
  }

  // Message Handler Registration
  registerMessageHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  unregisterMessageHandler(messageType) {
    this.messageHandlers.delete(messageType);
  }

  // Agent Discovery
  async discoverAgents(agentType = null, capability = null) {
    try {
      const agentData = await this.redis.hGetAll('agents:registry');
      const agents = [];
      
      for (const [agentId, data] of Object.entries(agentData)) {
        const agent = JSON.parse(data);
        
        if (agentType && agent.agentType !== agentType) continue;
        if (capability && !agent.capabilities.includes(capability)) continue;
        
        agents.push(agent);
      }
      
      return agents;
    } catch (error) {
      this.log(`Failed to discover agents: ${error.message}`, 'error');
      return [];
    }
  }

  async findAgentForTask(requiredCapability) {
    const agents = await this.discoverAgents(null, requiredCapability);
    
    if (agents.length === 0) {
      return null;
    }
    
    // Simple load balancing - find agent with least recent activity
    agents.sort((a, b) => new Date(a.lastHeartbeat) - new Date(b.lastHeartbeat));
    
    return agents[0];
  }

  // Health Monitoring
  startHealthMonitoring() {
    // Send heartbeat every 15 seconds
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
    }, 15000);
    
    // Update agent status
    this.statusInterval = setInterval(async () => {
      await this.updateAgentStatus();
    }, 30000);
  }

  async sendHeartbeat() {
    try {
      const heartbeat = {
        agentId: this.agentId,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        status: 'active'
      };
      
      await this.redis.hSet('agents:heartbeats', this.agentId, JSON.stringify(heartbeat));
      await this.redis.expire(`agents:heartbeats:${this.agentId}`, 60); // 1 minute TTL
      
    } catch (error) {
      this.log(`Failed to send heartbeat: ${error.message}`, 'warn');
    }
  }

  async updateAgentStatus() {
    try {
      const registration = await this.redis.hGet('agents:registry', this.agentId);
      if (registration) {
        const data = JSON.parse(registration);
        data.lastHeartbeat = new Date().toISOString();
        data.status = 'active';
        data.uptime = process.uptime();
        
        await this.redis.hSet('agents:registry', this.agentId, JSON.stringify(data));
      }
    } catch (error) {
      this.log(`Failed to update agent status: ${error.message}`, 'warn');
    }
  }

  // Shared Memory/State Management
  async setSharedState(key, value, ttl = null) {
    try {
      const stateKey = `shared:state:${key}`;
      await this.redis.set(stateKey, JSON.stringify(value));
      
      if (ttl) {
        await this.redis.expire(stateKey, ttl);
      }
      
      // Also store in file system for persistence
      const stateFile = path.join(this.memoryDir, 'shared-state.json');
      let state = {};
      
      try {
        const data = await fs.readFile(stateFile, 'utf8');
        state = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
      }
      
      state[key] = {
        value,
        timestamp: new Date().toISOString(),
        agentId: this.agentId
      };
      
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      
      return true;
    } catch (error) {
      this.log(`Failed to set shared state for ${key}: ${error.message}`, 'error');
      return false;
    }
  }

  async getSharedState(key) {
    try {
      const stateKey = `shared:state:${key}`;
      const value = await this.redis.get(stateKey);
      
      if (value) {
        return JSON.parse(value);
      }
      
      // Fallback to file system
      const stateFile = path.join(this.memoryDir, 'shared-state.json');
      try {
        const data = await fs.readFile(stateFile, 'utf8');
        const state = JSON.parse(data);
        return state[key]?.value || null;
      } catch (error) {
        return null;
      }
    } catch (error) {
      this.log(`Failed to get shared state for ${key}: ${error.message}`, 'error');
      return null;
    }
  }

  async deleteSharedState(key) {
    try {
      const stateKey = `shared:state:${key}`;
      await this.redis.del(stateKey);
      
      // Also remove from file system
      const stateFile = path.join(this.memoryDir, 'shared-state.json');
      try {
        const data = await fs.readFile(stateFile, 'utf8');
        const state = JSON.parse(data);
        delete state[key];
        await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
      } catch (error) {
        // File doesn't exist, that's okay
      }
      
      return true;
    } catch (error) {
      this.log(`Failed to delete shared state for ${key}: ${error.message}`, 'error');
      return false;
    }
  }

  // Utility Methods
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.agentId}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // Also log to file
    const logFile = path.join(this.memoryDir, this.agentType, 'agent.log');
    fs.appendFile(logFile, logMessage + '\n').catch(() => {
      // Ignore file write errors
    });
  }

  // Cleanup
  async cleanup() {
    try {
      this.log('Starting agent cleanup...');
      
      // Clear intervals
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (this.statusInterval) clearInterval(this.statusInterval);
      
      // Release all file locks
      for (const filePath of this.fileLocks.keys()) {
        await this.releaseFileLock(filePath);
      }
      
      // Release all ports
      for (const port of this.reservedPorts) {
        await this.releasePort(port);
      }
      
      // Deregister agent
      await this.redis.hDel('agents:registry', this.agentId);
      await this.redis.hDel('agents:heartbeats', this.agentId);
      
      // Broadcast deregistration
      await this.broadcastMessage('agent:deregistered', { agentId: this.agentId });
      
      // Close Redis connections
      if (this.redis) await this.redis.disconnect();
      if (this.pubsub) await this.pubsub.disconnect();
      
      this.log('Agent cleanup completed');
    } catch (error) {
      this.log(`Error during cleanup: ${error.message}`, 'error');
    }
  }
}

module.exports = AgentCoordinator;