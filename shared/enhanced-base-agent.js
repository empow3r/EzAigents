const AgentCoordinator = require('./agent-coordinator');
const Redis = require('redis');
const fs = require('fs').promises;
const path = require('path');

/**
 * Enhanced Base Agent with Universal Coordination
 * All Ez Aigent agents should inherit from this class
 */
class EnhancedBaseAgent {
  constructor(config = {}) {
    this.config = {
      agentId: config.agentId || `${config.agentType || 'agent'}-${Date.now()}`,
      agentType: config.agentType || 'generic',
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      model: config.model || 'default',
      role: config.role || 'AI Assistant',
      capabilities: config.capabilities || [],
      systemPrompt: config.systemPrompt || 'You are an AI assistant.',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      queueCheckInterval: config.queueCheckInterval || 5000,
      memoryLimit: config.memoryLimit || 100, // MB
      ...config
    };
    
    // Initialize coordinator
    this.coordinator = new AgentCoordinator({
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      redisUrl: this.config.redisUrl
    });
    
    // Redis connections
    this.redis = null;
    this.isRunning = false;
    
    // Memory management
    this.memoryDir = path.join(process.cwd(), '.agent-memory', this.config.agentType);
    this.currentSession = path.join(this.memoryDir, 'current-session.md');
    this.completedTasks = path.join(this.memoryDir, 'completed-tasks.md');
    this.errors = path.join(this.memoryDir, 'errors.md');
    this.learnings = path.join(this.memoryDir, 'learnings.md');
    
    // Port management
    this.requiredPorts = [];
    this.reservedPorts = new Set();
    
    // Bind methods
    this.log = this.log.bind(this);
    this.processTask = this.processTask.bind(this);
  }

  async initialize() {
    try {
      this.log('Initializing enhanced base agent...');
      
      // Initialize coordinator first
      await this.coordinator.initialize();
      
      // Connect to Redis
      await this.connectRedis();
      
      // Ensure memory directories exist
      await this.ensureMemoryDirectories();
      
      // Check and reserve required ports
      await this.checkAndReservePorts();
      
      // Register message handlers
      this.registerMessageHandlers();
      
      // Initialize agent-specific components
      await this.initializeAgent();
      
      this.log('Enhanced base agent initialized successfully');
      return true;
      
    } catch (error) {
      this.log(`Failed to initialize agent: ${error.message}`, 'error');
      throw error;
    }
  }

  async connectRedis() {
    if (this.redis) return;
    
    this.redis = Redis.createClient({ url: this.config.redisUrl });
    this.redis.on('error', (err) => this.log(`Redis error: ${err}`, 'error'));
    
    await this.redis.connect();
    this.log('Connected to Redis');
  }

  async ensureMemoryDirectories() {
    await fs.mkdir(this.memoryDir, { recursive: true });
    
    // Initialize memory files if they don't exist
    const memoryFiles = [
      this.currentSession,
      this.completedTasks,
      this.errors,
      this.learnings
    ];
    
    for (const file of memoryFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        const fileName = path.basename(file, '.md');
        const header = `# ${this.config.agentType.toUpperCase()} Agent ${fileName.replace('-', ' ').toUpperCase()}\n\n`;
        await fs.writeFile(file, header);
      }
    }
  }

  async checkAndReservePorts() {
    for (const port of this.requiredPorts) {
      const reserved = await this.coordinator.requestPort(port, `${this.config.agentType}-service`);
      if (reserved) {
        this.reservedPorts.add(port);
        this.log(`Reserved port ${port}`);
      } else {
        throw new Error(`Failed to reserve required port ${port}`);
      }
    }
  }

  registerMessageHandlers() {
    // Handle task delegation
    this.coordinator.registerMessageHandler('task:delegate', async (data, sender) => {
      this.log(`Received task delegation from ${sender}`);
      await this.handleDelegatedTask(data);
    });
    
    // Handle collaboration requests
    this.coordinator.registerMessageHandler('task:collaboration', async (data, sender) => {
      this.log(`Received collaboration request from ${sender}`);
      await this.handleCollaborationRequest(data, sender);
    });
    
    // Handle status requests
    this.coordinator.registerMessageHandler('status:request', async (data, sender) => {
      const status = await this.getAgentStatus();
      await this.coordinator.sendDirectMessage(sender, 'status:response', status);
    });
  }

  // Port management methods
  addRequiredPort(port) {
    this.requiredPorts.push(port);
  }

  async requestDynamicPort(port, purpose = 'temporary') {
    const reserved = await this.coordinator.requestPort(port, purpose);
    if (reserved) {
      this.reservedPorts.add(port);
    }
    return reserved;
  }

  async releaseDynamicPort(port) {
    const released = await this.coordinator.releasePort(port);
    if (released) {
      this.reservedPorts.delete(port);
    }
    return released;
  }

  // File operations with automatic locking
  async safeFileOperation(filePath, operation, operationType = 'write') {
    let lockId = null;
    try {
      // Acquire file lock
      lockId = await this.coordinator.acquireFileLock(filePath, operationType);
      
      // Perform operation
      const result = await operation();
      
      return result;
    } catch (error) {
      this.log(`Safe file operation failed for ${filePath}: ${error.message}`, 'error');
      throw error;
    } finally {
      // Always release lock
      if (lockId) {
        await this.coordinator.releaseFileLock(filePath);
      }
    }
  }

  async safeReadFile(filePath) {
    return this.safeFileOperation(filePath, async () => {
      return await fs.readFile(filePath, 'utf8');
    }, 'read');
  }

  async safeWriteFile(filePath, content) {
    return this.safeFileOperation(filePath, async () => {
      await fs.writeFile(filePath, content);
      return true;
    }, 'write');
  }

  async safeAppendFile(filePath, content) {
    return this.safeFileOperation(filePath, async () => {
      await fs.appendFile(filePath, content);
      return true;
    }, 'write');
  }

  // Memory management
  async saveToMemory(data, type = 'session') {
    const timestamp = new Date().toISOString();
    const entry = `## ${timestamp}\n${JSON.stringify(data, null, 2)}\n\n`;
    
    let targetFile;
    switch (type) {
      case 'session':
        targetFile = this.currentSession;
        break;
      case 'completed':
        targetFile = this.completedTasks;
        break;
      case 'error':
        targetFile = this.errors;
        break;
      case 'learning':
        targetFile = this.learnings;
        break;
      default:
        targetFile = this.currentSession;
    }
    
    await this.safeAppendFile(targetFile, entry);
    
    // Also save to shared state for cross-agent access
    await this.coordinator.setSharedState(`agent:${this.config.agentId}:last_${type}`, data, 3600);
  }

  async getMemoryFromFile(type = 'session', limit = 10) {
    let targetFile;
    switch (type) {
      case 'session':
        targetFile = this.currentSession;
        break;
      case 'completed':
        targetFile = this.completedTasks;
        break;
      case 'error':
        targetFile = this.errors;
        break;
      case 'learning':
        targetFile = this.learnings;
        break;
      default:
        targetFile = this.currentSession;
    }
    
    try {
      const content = await this.safeReadFile(targetFile);
      const entries = content.split('## ').slice(-limit);
      return entries.join('## ');
    } catch (error) {
      this.log(`Failed to read memory from ${targetFile}: ${error.message}`, 'error');
      return '';
    }
  }

  async clearMemory(type = 'session') {
    let targetFile;
    switch (type) {
      case 'session':
        targetFile = this.currentSession;
        break;
      case 'completed':
        targetFile = this.completedTasks;
        break;
      case 'error':
        targetFile = this.errors;
        break;
      case 'learning':
        targetFile = this.learnings;
        break;
      default:
        targetFile = this.currentSession;
    }
    
    const fileName = path.basename(targetFile, '.md');
    const header = `# ${this.config.agentType.toUpperCase()} Agent ${fileName.replace('-', ' ').toUpperCase()}\n\n`;
    await this.safeWriteFile(targetFile, header);
    
    this.log(`Cleared ${type} memory`);
  }

  // Task processing with coordination
  async processTask(task) {
    this.log(`Processing task: ${task.id || 'unknown'}`);
    
    try {
      // Save task start to memory
      await this.saveToMemory({
        type: 'task_start',
        task: task,
        agentId: this.config.agentId
      });
      
      // Check if task requires collaboration
      const collaborationNeeded = await this.checkCollaborationNeeded(task);
      if (collaborationNeeded) {
        return await this.handleCollaborativeTask(task);
      }
      
      // Process task locally
      const result = await this.executeTask(task);
      
      // Save result to memory
      await this.saveToMemory({
        type: 'task_completed',
        task: task,
        result: result,
        agentId: this.config.agentId
      }, 'completed');
      
      return result;
      
    } catch (error) {
      this.log(`Task processing failed: ${error.message}`, 'error');
      
      // Save error to memory
      await this.saveToMemory({
        type: 'task_error',
        task: task,
        error: error.message,
        agentId: this.config.agentId
      }, 'error');
      
      throw error;
    }
  }

  async checkCollaborationNeeded(task) {
    // Override in subclasses to implement specific collaboration logic
    return false;
  }

  async handleCollaborativeTask(task) {
    // Find suitable agents for collaboration
    const requiredCapabilities = this.getRequiredCapabilities(task);
    const collaborators = [];
    
    for (const capability of requiredCapabilities) {
      const agent = await this.coordinator.findAgentForTask(capability);
      if (agent && agent.agentId !== this.config.agentId) {
        collaborators.push(agent);
      }
    }
    
    if (collaborators.length === 0) {
      this.log('No collaborators found, processing task locally');
      return await this.executeTask(task);
    }
    
    // Delegate parts of the task
    const results = [];
    for (const collaborator of collaborators) {
      const subtask = this.createSubtask(task, collaborator);
      await this.coordinator.sendDirectMessage(collaborator.agentId, 'task:delegate', subtask);
      results.push({ agentId: collaborator.agentId, subtask });
    }
    
    // Process own part
    const localResult = await this.executeTask(task);
    
    // Combine results (override in subclasses for specific logic)
    return this.combineResults(localResult, results);
  }

  getRequiredCapabilities(task) {
    // Override in subclasses
    return [];
  }

  createSubtask(task, collaborator) {
    // Override in subclasses
    return { ...task, delegatedTo: collaborator.agentId };
  }

  combineResults(localResult, collaboratorResults) {
    // Override in subclasses
    return {
      local: localResult,
      collaborated: collaboratorResults
    };
  }

  // Queue management
  getQueueName() {
    return `queue:${this.config.agentType}`;
  }

  async start() {
    try {
      this.isRunning = true;
      this.log('Starting agent...');
      
      // Update agent status
      await this.coordinator.setSharedState(`agent:${this.config.agentId}:status`, 'running');
      
      // Start queue processing
      await this.processQueue();
      
    } catch (error) {
      this.log(`Failed to start agent: ${error.message}`, 'error');
      throw error;
    }
  }

  async processQueue() {
    const queueName = this.getQueueName();
    this.log(`Monitoring queue: ${queueName}`);
    
    while (this.isRunning) {
      try {
        // Check for tasks
        const task = await this.redis.brPop(queueName, 5); // 5 second timeout
        
        if (task) {
          const taskData = JSON.parse(task.element);
          await this.processTask(taskData);
        }
        
        // Memory cleanup check
        await this.checkMemoryUsage();
        
      } catch (error) {
        this.log(`Queue processing error: ${error.message}`, 'error');
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
  }

  async checkMemoryUsage() {
    const usage = process.memoryUsage();
    const usageMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    if (usageMB > this.config.memoryLimit) {
      this.log(`Memory usage high (${usageMB}MB), clearing session memory`);
      await this.clearMemory('session');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  async getAgentStatus() {
    return {
      agentId: this.config.agentId,
      agentType: this.config.agentType,
      status: this.isRunning ? 'running' : 'stopped',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      queueName: this.getQueueName(),
      reservedPorts: Array.from(this.reservedPorts),
      lastActivity: new Date().toISOString()
    };
  }

  // Abstract methods to be implemented by subclasses
  async initializeAgent() {
    // Override in subclasses for agent-specific initialization
  }

  async executeTask(task) {
    // Override in subclasses for actual task execution
    throw new Error('executeTask must be implemented by subclass');
  }

  async handleDelegatedTask(task) {
    // Override in subclasses for handling delegated tasks
    return await this.executeTask(task);
  }

  async handleCollaborationRequest(data, sender) {
    // Override in subclasses for collaboration handling
    this.log(`Collaboration request from ${sender} - not implemented`);
  }

  // Cleanup
  async cleanup() {
    try {
      this.log('Starting agent cleanup...');
      this.isRunning = false;
      
      // Release all ports
      for (const port of this.reservedPorts) {
        await this.coordinator.releasePort(port);
      }
      
      // Update status
      await this.coordinator.setSharedState(`agent:${this.config.agentId}:status`, 'stopped');
      
      // Cleanup coordinator
      await this.coordinator.cleanup();
      
      // Close Redis connection
      if (this.redis) {
        await this.redis.disconnect();
      }
      
      this.log('Agent cleanup completed');
    } catch (error) {
      this.log(`Error during cleanup: ${error.message}`, 'error');
    }
  }

  // Logging
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.config.agentId}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // Log to coordinator
    this.coordinator?.log(message, level);
  }
}

module.exports = EnhancedBaseAgent;