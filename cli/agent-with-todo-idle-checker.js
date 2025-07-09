const TodoQueueIdleChecker = require('./todo-queue-idle-checker');
const EventEmitter = require('events');

/**
 * Agent With Todo Idle Checker
 * 
 * Enhances agents with automatic todo task assignment during idle periods.
 * Can be used as a mixin or base class for existing agents.
 */
class AgentWithTodoIdleChecker extends EventEmitter {
  constructor(agentId, agentType, options = {}) {
    super();
    
    this.agentId = agentId;
    this.agentType = agentType;
    
    // Initialize todo idle checker
    this.todoChecker = new TodoQueueIdleChecker(agentId, agentType, {
      checkInterval: options.idleCheckInterval || 10000, // 10 seconds default
      todoQueueName: options.todoQueueName || 'queue:todos'
    });
    
    // Setup event handlers
    this.setupTodoCheckerEvents();
    
    // State tracking
    this.isProcessingTodoTask = false;
    this.todoTaskHandler = options.todoTaskHandler || this.defaultTodoTaskHandler.bind(this);
    
    console.log(`🤖 Agent enhanced with Todo Idle Checker: ${agentType} (${agentId})`);
  }

  /**
   * Setup event handlers for todo checker
   */
  setupTodoCheckerEvents() {
    // Handle task assignment
    this.todoChecker.on('taskAssigned', async ({ task, agentId }) => {
      console.log(`📋 Todo task assigned to ${agentId}: ${task.description || task.id}`);
      this.isProcessingTodoTask = true;
      
      try {
        // Execute the task
        const result = await this.todoTaskHandler(task);
        
        // Mark task as completed
        await this.todoChecker.completeCurrentTask(result);
        
        this.emit('todoTaskCompleted', { task, result });
        
      } catch (error) {
        console.error(`❌ Error processing todo task: ${error.message}`);
        
        // Return task to queue for retry
        await this.todoChecker.returnTaskToQueue(task);
        
        this.emit('todoTaskFailed', { task, error });
        
      } finally {
        this.isProcessingTodoTask = false;
      }
    });
    
    // Handle errors
    this.todoChecker.on('error', (error) => {
      console.error(`❌ Todo checker error: ${error.message}`);
      this.emit('todoCheckerError', error);
    });
    
    // Handle status changes
    this.todoChecker.on('started', () => {
      console.log('✅ Todo idle checker started');
      this.emit('todoCheckerStarted');
    });
    
    this.todoChecker.on('stopped', () => {
      console.log('🛑 Todo idle checker stopped');
      this.emit('todoCheckerStopped');
    });
  }

  /**
   * Start the todo idle checker
   */
  async startTodoChecker() {
    await this.todoChecker.start();
  }

  /**
   * Stop the todo idle checker
   */
  async stopTodoChecker() {
    await this.todoChecker.stop();
  }

  /**
   * Default todo task handler (can be overridden)
   */
  async defaultTodoTaskHandler(task) {
    console.log(`🔄 Processing todo task: ${task.description || task.id}`);
    
    // Simulate task processing based on type
    const processingTime = Math.random() * 5000 + 2000; // 2-7 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Return a result
    return {
      success: true,
      processed_by: this.agentId,
      processing_time: processingTime,
      timestamp: new Date().toISOString(),
      message: `Task ${task.id} processed successfully by ${this.agentType} agent`
    };
  }

  /**
   * Check if agent should be considered idle
   * Override this method in your agent implementation
   */
  async isIdle() {
    return !this.isProcessingTodoTask;
  }

  /**
   * Get todo queue statistics
   */
  async getTodoQueueStats() {
    return await this.todoChecker.getQueueStats();
  }

  /**
   * Manually check and assign todo task (bypass interval)
   */
  async manualTodoCheck() {
    await this.todoChecker.checkAndAssignTask();
  }
}

/**
 * Mixin function to add todo idle checking to existing agent classes
 */
function withTodoIdleChecker(AgentClass) {
  return class extends AgentClass {
    constructor(...args) {
      super(...args);
      
      // Extract agent ID and type from the agent instance
      const agentId = this.agentId || this.id || `agent_${Date.now()}`;
      const agentType = this.agentType || this.type || this.constructor.name;
      
      // Initialize todo checker
      this._todoChecker = new TodoQueueIdleChecker(agentId, agentType);
      
      // Setup event forwarding
      this._todoChecker.on('taskAssigned', this._handleTodoTaskAssigned.bind(this));
      this._todoChecker.on('error', (error) => {
        console.error(`Todo checker error: ${error.message}`);
        if (this.emit) this.emit('todoCheckerError', error);
      });
    }

    async _handleTodoTaskAssigned({ task, agentId }) {
      console.log(`📋 Todo task assigned: ${task.description || task.id}`);
      
      try {
        // Check if agent has a processTodoTask method
        let result;
        if (typeof this.processTodoTask === 'function') {
          result = await this.processTodoTask(task);
        } else {
          // Fallback to generic processing
          result = await this._defaultProcessTodoTask(task);
        }
        
        // Complete the task
        await this._todoChecker.completeCurrentTask(result);
        
        if (this.emit) this.emit('todoTaskCompleted', { task, result });
        
      } catch (error) {
        console.error(`Error processing todo task: ${error.message}`);
        await this._todoChecker.returnTaskToQueue(task);
        if (this.emit) this.emit('todoTaskFailed', { task, error });
      }
    }

    async _defaultProcessTodoTask(task) {
      console.log(`Processing todo task with default handler: ${task.id}`);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        message: 'Task processed with default handler',
        timestamp: new Date().toISOString()
      };
    }

    async startTodoIdleChecker() {
      await this._todoChecker.start();
    }

    async stopTodoIdleChecker() {
      await this._todoChecker.stop();
    }

    async getTodoQueueStats() {
      return await this._todoChecker.getQueueStats();
    }
  };
}

// Export both the class and the mixin
module.exports = {
  AgentWithTodoIdleChecker,
  withTodoIdleChecker
};