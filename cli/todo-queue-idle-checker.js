const Redis = require('ioredis');
const EventEmitter = require('events');

/**
 * Todo Queue Idle Checker
 * 
 * Monitors agents for idle state and automatically assigns tasks from a todo queue.
 * Runs every 10 seconds to check for available tasks and idle agents.
 */
class TodoQueueIdleChecker extends EventEmitter {
  constructor(agentId, agentType, options = {}) {
    super();
    
    this.agentId = agentId;
    this.agentType = agentType;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Configuration
    this.checkInterval = options.checkInterval || 10000; // 10 seconds default
    this.todoQueueName = options.todoQueueName || 'queue:todos';
    this.agentStatusKey = `agent:${agentId}:status`;
    this.agentTaskKey = `agent:${agentId}:current_task`;
    
    // State
    this.isRunning = false;
    this.intervalHandle = null;
    this.lastCheckTime = null;
    this.currentTask = null;
    
    console.log(`📋 Todo Queue Idle Checker initialized for ${agentType} agent: ${agentId}`);
  }

  /**
   * Start the idle checker
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Todo Queue Idle Checker is already running');
      return;
    }
    
    this.isRunning = true;
    console.log(`🚀 Starting Todo Queue Idle Checker (interval: ${this.checkInterval}ms)`);
    
    // Perform initial check
    await this.checkAndAssignTask();
    
    // Set up interval for periodic checks
    this.intervalHandle = setInterval(async () => {
      await this.checkAndAssignTask();
    }, this.checkInterval);
    
    this.emit('started');
  }

  /**
   * Stop the idle checker
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️  Todo Queue Idle Checker is not running');
      return;
    }
    
    this.isRunning = false;
    
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    
    // Clear agent status
    await this.updateAgentStatus('stopped');
    
    console.log('🛑 Todo Queue Idle Checker stopped');
    this.emit('stopped');
  }

  /**
   * Main check and assign logic
   */
  async checkAndAssignTask() {
    try {
      this.lastCheckTime = new Date();
      
      // Check if agent is idle
      const isIdle = await this.isAgentIdle();
      
      if (!isIdle) {
        // Agent is busy, skip this check
        return;
      }
      
      console.log(`🔍 Agent ${this.agentId} is idle, checking todo queue...`);
      
      // Get next available task from todo queue
      const task = await this.getNextTodoTask();
      
      if (!task) {
        // No tasks available
        await this.updateAgentStatus('idle', 'No tasks in todo queue');
        return;
      }
      
      // Try to assign the task to this agent
      const assigned = await this.assignTaskToAgent(task);
      
      if (assigned) {
        console.log(`✅ Assigned task ${task.id} to agent ${this.agentId}`);
        this.emit('taskAssigned', { task, agentId: this.agentId });
      } else {
        // Failed to assign, put task back in queue
        await this.returnTaskToQueue(task);
      }
      
    } catch (error) {
      console.error(`❌ Error in todo queue idle check: ${error.message}`);
      this.emit('error', error);
    }
  }

  /**
   * Check if agent is idle
   */
  async isAgentIdle() {
    try {
      // Check agent status
      const status = await this.redis.get(this.agentStatusKey);
      
      if (!status || status === 'idle' || status === 'waiting') {
        // Check if agent has a current task
        const currentTask = await this.redis.get(this.agentTaskKey);
        return !currentTask;
      }
      
      return false;
      
    } catch (error) {
      console.error(`Error checking agent idle status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get next available task from todo queue
   */
  async getNextTodoTask() {
    try {
      // Use RPOPLPUSH for atomic operation (move from todo queue to processing)
      const taskStr = await this.redis.rpoplpush(
        this.todoQueueName,
        `${this.todoQueueName}:processing`
      );
      
      if (!taskStr) {
        return null;
      }
      
      // Parse task
      const task = JSON.parse(taskStr);
      
      // Add metadata
      task.assigned_at = new Date().toISOString();
      task.assigned_to = this.agentId;
      task.agent_type = this.agentType;
      
      return task;
      
    } catch (error) {
      console.error(`Error getting next todo task: ${error.message}`);
      return null;
    }
  }

  /**
   * Assign task to this agent
   */
  async assignTaskToAgent(task) {
    const multi = this.redis.multi();
    
    try {
      // Update agent status
      multi.set(this.agentStatusKey, 'working', 'EX', 3600); // 1 hour expiry
      multi.set(this.agentTaskKey, JSON.stringify(task), 'EX', 3600);
      
      // Add to agent's assigned tasks list
      multi.lpush(`agent:${this.agentId}:assigned_tasks`, JSON.stringify(task));
      
      // Record assignment in global task registry
      multi.hset('todo:assignments', task.id, JSON.stringify({
        task_id: task.id,
        agent_id: this.agentId,
        agent_type: this.agentType,
        assigned_at: task.assigned_at,
        status: 'assigned'
      }));
      
      // Update metrics
      multi.hincrby('todo:metrics', 'total_assigned', 1);
      multi.hincrby(`todo:metrics:${this.agentType}`, 'tasks_assigned', 1);
      
      const results = await multi.exec();
      
      // Check if all operations succeeded
      const success = results.every(([err, result]) => !err);
      
      if (success) {
        this.currentTask = task;
        await this.updateAgentStatus('working', `Working on task: ${task.id}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`Error assigning task to agent: ${error.message}`);
      return false;
    }
  }

  /**
   * Return task to queue if assignment failed
   */
  async returnTaskToQueue(task) {
    try {
      // Remove from processing queue
      await this.redis.lrem(`${this.todoQueueName}:processing`, 1, JSON.stringify(task));
      
      // Add back to main queue
      await this.redis.lpush(this.todoQueueName, JSON.stringify(task));
      
      console.log(`↩️  Returned task ${task.id} to todo queue`);
      
    } catch (error) {
      console.error(`Error returning task to queue: ${error.message}`);
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(status, details = '') {
    try {
      const statusData = {
        status,
        details,
        last_update: new Date().toISOString(),
        agent_id: this.agentId,
        agent_type: this.agentType
      };
      
      await this.redis.set(
        this.agentStatusKey,
        status,
        'EX',
        300 // 5 minute expiry
      );
      
      // Publish status update
      await this.redis.publish('agent:status:updates', JSON.stringify(statusData));
      
    } catch (error) {
      console.error(`Error updating agent status: ${error.message}`);
    }
  }

  /**
   * Complete current task
   */
  async completeCurrentTask(result = {}) {
    if (!this.currentTask) {
      console.log('⚠️  No current task to complete');
      return false;
    }
    
    const multi = this.redis.multi();
    
    try {
      const taskId = this.currentTask.id;
      
      // Update task in registry
      multi.hset('todo:assignments', taskId, JSON.stringify({
        task_id: taskId,
        agent_id: this.agentId,
        agent_type: this.agentType,
        assigned_at: this.currentTask.assigned_at,
        completed_at: new Date().toISOString(),
        status: 'completed',
        result: result
      }));
      
      // Remove from processing queue
      multi.lrem(`${this.todoQueueName}:processing`, 1, JSON.stringify(this.currentTask));
      
      // Add to completed tasks
      multi.lpush('queue:todos:completed', JSON.stringify({
        ...this.currentTask,
        completed_at: new Date().toISOString(),
        completed_by: this.agentId,
        result: result
      }));
      
      // Clear agent task
      multi.del(this.agentTaskKey);
      
      // Update metrics
      multi.hincrby('todo:metrics', 'total_completed', 1);
      multi.hincrby(`todo:metrics:${this.agentType}`, 'tasks_completed', 1);
      
      await multi.exec();
      
      // Update agent status
      await this.updateAgentStatus('idle', 'Task completed');
      
      console.log(`✅ Completed task ${taskId}`);
      this.emit('taskCompleted', { task: this.currentTask, result });
      
      this.currentTask = null;
      return true;
      
    } catch (error) {
      console.error(`Error completing task: ${error.message}`);
      return false;
    }
  }

  /**
   * Get todo queue statistics
   */
  async getQueueStats() {
    try {
      const multi = this.redis.multi();
      
      multi.llen(this.todoQueueName);
      multi.llen(`${this.todoQueueName}:processing`);
      multi.llen('queue:todos:completed');
      multi.hgetall('todo:metrics');
      
      const results = await multi.exec();
      
      return {
        pending: results[0][1] || 0,
        processing: results[1][1] || 0,
        completed: results[2][1] || 0,
        metrics: results[3][1] || {}
      };
      
    } catch (error) {
      console.error(`Error getting queue stats: ${error.message}`);
      return null;
    }
  }

  /**
   * Add task to todo queue
   */
  static async addTodoTask(task) {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    try {
      const todoTask = {
        id: task.id || `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: task.description,
        type: task.type || 'general',
        priority: task.priority || 'normal',
        created_at: new Date().toISOString(),
        status: 'pending',
        ...task
      };
      
      await redis.lpush('queue:todos', JSON.stringify(todoTask));
      
      console.log(`📝 Added todo task: ${todoTask.id}`);
      return todoTask;
      
    } catch (error) {
      console.error(`Error adding todo task: ${error.message}`);
      throw error;
    } finally {
      redis.disconnect();
    }
  }
}

module.exports = TodoQueueIdleChecker;