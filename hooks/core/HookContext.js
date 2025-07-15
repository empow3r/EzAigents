class HookContext {
  constructor(data = {}) {
    // Core context properties
    this.agent = data.agent || null;
    this.task = data.task || null;
    this.system = data.system || {};
    this.execution = data.execution || {};
    
    // Utilities
    this.redis = data.redis || null;
    this.registry = data.registry || null;
    this.emit = data.emit || (() => {});
    
    // Request/Response tracking
    this.request = data.request || {};
    this.response = data.response || {};
    
    // Metadata
    this.metadata = data.metadata || {};
    this.timestamp = Date.now();
    
    // Context modifications for chain execution
    this.modifications = {};
    
    // Shared state between hooks
    this.shared = new Map();
  }

  // Agent-related context
  setAgent(agent) {
    this.agent = {
      id: agent.id,
      type: agent.type,
      model: agent.model,
      capabilities: agent.capabilities || [],
      status: agent.status,
      load: agent.load || 0,
      memory: agent.memory || {}
    };
    return this;
  }

  // Task-related context
  setTask(task) {
    this.task = {
      id: task.id,
      type: task.type,
      prompt: task.prompt,
      complexity: task.complexity || 0,
      priority: task.priority || 'medium',
      dependencies: task.dependencies || [],
      constraints: task.constraints || {},
      metadata: task.metadata || {}
    };
    return this;
  }

  // System-wide context
  setSystem(system) {
    this.system = {
      timestamp: Date.now(),
      activeAgents: system.activeAgents || 0,
      queueDepth: system.queueDepth || 0,
      avgResponseTime: system.avgResponseTime || 0,
      memoryUsage: system.memoryUsage || 0,
      cpuUsage: system.cpuUsage || 0,
      ...system
    };
    return this;
  }

  // Execution context
  setExecution(execution) {
    this.execution = {
      id: execution.id,
      type: execution.type,
      startTime: execution.startTime,
      hookChain: execution.hookChain || [],
      ...execution
    };
    return this;
  }

  // Add modification for sequential hook chains
  addModification(key, value) {
    this.modifications[key] = value;
    return this;
  }

  // Get all modifications
  getModifications() {
    return { ...this.modifications };
  }

  // Shared state management
  setShared(key, value) {
    this.shared.set(key, value);
    return this;
  }

  getShared(key) {
    return this.shared.get(key);
  }

  hasShared(key) {
    return this.shared.has(key);
  }

  // Create a child context for nested executions
  createChild(overrides = {}) {
    return new HookContext({
      ...this.toJSON(),
      ...overrides,
      parent: this
    });
  }

  // Convert to plain object
  toJSON() {
    return {
      agent: this.agent,
      task: this.task,
      system: this.system,
      execution: this.execution,
      metadata: this.metadata,
      timestamp: this.timestamp,
      modifications: this.modifications,
      shared: Object.fromEntries(this.shared)
    };
  }

  // Create from plain object
  static fromJSON(json) {
    const context = new HookContext(json);
    if (json.shared) {
      Object.entries(json.shared).forEach(([key, value]) => {
        context.setShared(key, value);
      });
    }
    return context;
  }

  // Validation
  validate() {
    const errors = [];

    if (!this.agent?.id) {
      errors.push('Agent context missing or invalid');
    }

    if (!this.task?.id && !this.execution?.type) {
      errors.push('Either task or execution type must be specified');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Context enrichment
  async enrich() {
    // Enrich with system metrics if redis is available
    if (this.redis) {
      try {
        const [activeAgents, queueSizes] = await Promise.all([
          this.redis.sCard('agents:active'),
          this.redis.keys('queue:*').then(keys => 
            Promise.all(keys.map(key => this.redis.lLen(key)))
          )
        ]);

        this.system.activeAgents = activeAgents;
        this.system.totalQueueDepth = queueSizes.reduce((sum, size) => sum + size, 0);
      } catch (error) {
        console.error('Failed to enrich context:', error);
      }
    }

    return this;
  }

  // Logging helper
  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        agentId: this.agent?.id,
        taskId: this.task?.id,
        executionId: this.execution?.id
      },
      ...data
    };

    console.log(JSON.stringify(logEntry));
    
    // Emit log event if available
    if (this.emit) {
      this.emit('log', logEntry);
    }

    return this;
  }

  // Convenience logging methods
  debug(message, data) {
    return this.log('debug', message, data);
  }

  info(message, data) {
    return this.log('info', message, data);
  }

  warn(message, data) {
    return this.log('warn', message, data);
  }

  error(message, data) {
    return this.log('error', message, data);
  }
}

module.exports = HookContext;