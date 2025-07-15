const BaseAgent = require('./base-agent');
const HookRegistry = require('../hooks/core/HookRegistry');
const HookExecutor = require('../hooks/core/HookExecutor');
const HookContext = require('../hooks/core/HookContext');

class BaseAgentWithHooks extends BaseAgent {
  constructor(config = {}) {
    super(config);
    
    // Hook system configuration
    this.hooksEnabled = config.hooksEnabled !== false && process.env.HOOKS_ENABLED !== 'false';
    this.hookRegistry = null;
    this.hookExecutor = null;
    
    if (this.hooksEnabled) {
      this.initializeHooks();
    }
  }

  async initializeHooks() {
    try {
      // Initialize hook registry
      this.hookRegistry = new HookRegistry({
        redisUrl: this.config.redisUrl,
        agentId: this.agentId,
        agentType: this.agentType
      });
      
      await this.hookRegistry.initialize();
      
      // Initialize hook executor
      this.hookExecutor = new HookExecutor(this.hookRegistry, {
        redisUrl: this.config.redisUrl,
        parallel: true,
        continueOnError: true
      });
      
      await this.hookExecutor.initialize();
      
      console.log(`[${this.agentId}] Hook system initialized`);
      
      // Subscribe to hook configuration changes
      this.hookRegistry.on('hook:enabled', ({ hookId }) => {
        console.log(`[${this.agentId}] Hook enabled: ${hookId}`);
      });
      
      this.hookRegistry.on('hook:disabled', ({ hookId }) => {
        console.log(`[${this.agentId}] Hook disabled: ${hookId}`);
      });
    } catch (error) {
      console.error(`[${this.agentId}] Failed to initialize hooks:`, error);
      this.hooksEnabled = false;
    }
  }

  // Override handleTaskAssignment to add hook support
  async handleTaskAssignment(task) {
    if (!this.hooksEnabled) {
      return super.handleTaskAssignment(task);
    }

    // Create hook context
    const context = new HookContext({
      agent: {
        id: this.agentId,
        type: this.agentType,
        model: this.model,
        capabilities: this.capabilities,
        status: this.status,
        load: this.currentLoad
      },
      task: {
        id: task.id,
        type: task.type,
        prompt: task.prompt,
        priority: task.priority,
        complexity: task.complexity,
        metadata: task.metadata
      },
      system: {
        activeAgents: await this.getActiveAgentCount(),
        queueDepth: await this.getQueueDepth()
      },
      redis: this.pubClient,
      registry: this.hookRegistry,
      emit: (event, data) => this.emit(`hook:${event}`, data)
    });

    // Execute pre-task hooks
    const preTaskResult = await this.executeHooks('pre-task', context);
    
    if (preTaskResult && preTaskResult.results) {
      // Check if any hook blocked the task
      const blocked = preTaskResult.results.find(r => 
        r.result && r.result.action === 'block'
      );
      
      if (blocked) {
        console.log(`[${this.agentId}] Task blocked by hook: ${blocked.hookId}`);
        await this.reportTaskFailed(task, {
          error: 'Task blocked by security policy',
          details: blocked.result
        });
        return;
      }
      
      // Apply any context modifications from hooks
      if (preTaskResult.results.some(r => r.contextModifications)) {
        task = this.applyContextModifications(task, preTaskResult.results);
      }
    }

    // Store execution start time
    const executionStartTime = Date.now();

    try {
      // Execute the task
      const result = await this.processTask(task);
      
      // Update context with execution results
      context.execution = {
        id: `exec_${this.agentId}_${Date.now()}`,
        type: 'task_completion',
        startTime: executionStartTime,
        duration: Date.now() - executionStartTime,
        success: true
      };
      context.result = result;

      // Execute post-task hooks
      await this.executeHooks('post-task', context);

      // Report task completion
      await this.reportTaskComplete(task, result);
    } catch (error) {
      // Update context with error
      context.execution = {
        id: `exec_${this.agentId}_${Date.now()}`,
        type: 'task_failure',
        startTime: executionStartTime,
        duration: Date.now() - executionStartTime,
        success: false,
        error: error.message
      };

      // Execute error hooks
      await this.executeHooks('task-error', context);

      // Report task failure
      await this.reportTaskFailed(task, error);
    }
  }

  // Execute hooks of a specific type
  async executeHooks(hookType, context) {
    if (!this.hooksEnabled || !this.hookExecutor) {
      return null;
    }

    try {
      const result = await this.hookExecutor.execute(hookType, context);
      
      // Log hook execution metrics
      if (result.executed !== false) {
        console.log(`[${this.agentId}] Executed ${result.hooks.length} ${hookType} hooks in ${result.duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error(`[${this.agentId}] Hook execution error:`, error);
      return null;
    }
  }

  // Apply context modifications from hooks to task
  applyContextModifications(task, hookResults) {
    const modifiedTask = { ...task };
    
    for (const result of hookResults) {
      if (result.contextModifications) {
        // Apply modifications
        if (result.contextModifications.preferredAgent) {
          modifiedTask.preferredAgent = result.contextModifications.preferredAgent;
        }
        
        if (result.contextModifications.priority) {
          modifiedTask.priority = result.contextModifications.priority;
        }
        
        if (result.contextModifications.metadata) {
          modifiedTask.metadata = {
            ...modifiedTask.metadata,
            ...result.contextModifications.metadata
          };
        }
      }
    }
    
    return modifiedTask;
  }

  // Override message handling to support hook-based routing
  async handleDirectMessage(message) {
    if (!this.hooksEnabled) {
      return super.handleDirectMessage(message);
    }

    // Create context for message hooks
    const context = new HookContext({
      agent: {
        id: this.agentId,
        type: this.agentType
      },
      message: message,
      redis: this.pubClient,
      registry: this.hookRegistry
    });

    // Execute message routing hooks
    const routingResult = await this.executeHooks('message-routing', context);
    
    if (routingResult && routingResult.results) {
      // Check if message should be rerouted
      const reroute = routingResult.results.find(r => 
        r.result && r.result.action === 'reroute'
      );
      
      if (reroute) {
        console.log(`[${this.agentId}] Message rerouted by hook`);
        await this.routeMessage(message, reroute.result.target);
        return;
      }
    }

    // Process message normally
    return super.handleDirectMessage(message);
  }

  // Helper to get active agent count
  async getActiveAgentCount() {
    try {
      return await this.pubClient.sCard('agents:active');
    } catch (error) {
      return 0;
    }
  }

  // Helper to get queue depth
  async getQueueDepth() {
    try {
      const queues = await this.pubClient.keys('queue:*');
      let totalDepth = 0;
      
      for (const queue of queues) {
        const depth = await this.pubClient.lLen(queue);
        totalDepth += depth;
      }
      
      return totalDepth;
    } catch (error) {
      return 0;
    }
  }

  // Route message to another agent
  async routeMessage(message, targetAgentId) {
    const routedMessage = {
      ...message,
      routedFrom: this.agentId,
      routedAt: Date.now()
    };
    
    await this.pubClient.publish(
      `agent:${targetAgentId}:direct`,
      JSON.stringify(routedMessage)
    );
  }

  // Override shutdown to clean up hooks
  async shutdown() {
    if (this.hookExecutor) {
      await this.hookExecutor.shutdown();
    }
    
    if (this.hookRegistry) {
      await this.hookRegistry.shutdown();
    }
    
    await super.shutdown();
  }

  // Get hook metrics
  getHookMetrics() {
    if (!this.hookExecutor) {
      return null;
    }
    
    return this.hookExecutor.getMetrics();
  }

  // Enable/disable specific hooks
  async enableHook(hookId) {
    if (this.hookRegistry) {
      await this.hookRegistry.enableHook(hookId);
    }
  }

  async disableHook(hookId) {
    if (this.hookRegistry) {
      await this.hookRegistry.disableHook(hookId);
    }
  }

  // Get hook configuration
  getHookConfiguration() {
    if (!this.hookRegistry) {
      return null;
    }
    
    return {
      enabled: this.hooksEnabled,
      hooks: this.hookRegistry.getAllHooks(),
      metrics: this.getHookMetrics()
    };
  }
}

module.exports = BaseAgentWithHooks;