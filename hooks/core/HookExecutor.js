const EventEmitter = require('events');
const { performance } = require('perf_hooks');
const Redis = require('redis');

class HookExecutor extends EventEmitter {
  constructor(registry, config = {}) {
    super();
    this.registry = registry;
    this.config = {
      timeout: 30000, // 30 seconds default timeout
      parallel: true,
      continueOnError: true,
      ...config
    };
    this.metrics = new Map();
    this.executionHistory = [];
    this.redisClient = null;
  }

  async initialize() {
    this.redisClient = Redis.createClient({ 
      url: this.config.redisUrl || process.env.REDIS_URL 
    });
    await this.redisClient.connect();
  }

  async execute(hookType, context = {}) {
    const hooks = this.registry.getHooksByType(hookType);
    
    if (hooks.length === 0) {
      return { executed: false, reason: 'no_hooks_found' };
    }

    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: hookType,
      startTime: performance.now(),
      context,
      hooks: hooks.map(h => h.id),
      results: []
    };

    try {
      // Execute hooks based on configuration
      if (this.config.parallel) {
        execution.results = await this.executeParallel(hooks, context, execution);
      } else {
        execution.results = await this.executeSequential(hooks, context, execution);
      }

      execution.endTime = performance.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.success = execution.results.every(r => r.success);

      // Store execution history
      await this.storeExecution(execution);

      // Update metrics
      this.updateMetrics(hookType, execution);

      // Emit execution event
      this.emit('execution:complete', execution);

      // Publish to Redis for distributed monitoring
      await this.publishExecutionEvent(execution);

      return execution;
    } catch (error) {
      execution.error = error.message;
      execution.success = false;
      this.emit('execution:error', { execution, error });
      throw error;
    }
  }

  async executeParallel(hooks, context, execution) {
    const promises = hooks.map(hook => 
      this.executeHook(hook, context, execution.id)
    );

    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const error = result.reason;
        console.error(`Hook ${hooks[index].id} failed:`, error);
        
        if (!this.config.continueOnError) {
          throw error;
        }

        return {
          hookId: hooks[index].id,
          success: false,
          error: error.message,
          duration: 0
        };
      }
    });
  }

  async executeSequential(hooks, context, execution) {
    const results = [];
    let modifiedContext = { ...context };

    for (const hook of hooks) {
      try {
        const result = await this.executeHook(hook, modifiedContext, execution.id);
        results.push(result);

        // Allow hooks to modify context for subsequent hooks
        if (result.contextModifications) {
          modifiedContext = { ...modifiedContext, ...result.contextModifications };
        }

        // Check if hook wants to stop the chain
        if (result.stopChain) {
          break;
        }
      } catch (error) {
        console.error(`Hook ${hook.id} failed:`, error);
        
        if (!this.config.continueOnError) {
          throw error;
        }

        results.push({
          hookId: hook.id,
          success: false,
          error: error.message,
          duration: 0
        });
      }
    }

    return results;
  }

  async executeHook(hook, context, executionId) {
    const startTime = performance.now();
    const timeout = hook.metadata?.timeout || this.config.timeout;

    try {
      // Create hook context with utilities
      const hookContext = {
        ...context,
        executionId,
        registry: this.registry,
        redis: this.redisClient,
        emit: (event, data) => this.emit(`hook:${hook.id}:${event}`, data)
      };

      // Execute with timeout
      const result = await this.withTimeout(
        hook.instance.execute(hookContext),
        timeout
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        hookId: hook.id,
        success: true,
        duration,
        result,
        contextModifications: result?.contextModifications,
        stopChain: result?.stopChain || false
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      return {
        hookId: hook.id,
        success: false,
        duration,
        error: error.message,
        stack: error.stack
      };
    }
  }

  async withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Hook execution timeout (${timeout}ms)`)), timeout)
      )
    ]);
  }

  async storeExecution(execution) {
    // Store in Redis with TTL
    const key = `hook:execution:${execution.id}`;
    await this.redisClient.setEx(
      key,
      86400, // 24 hour TTL
      JSON.stringify(execution)
    );

    // Add to sorted set for time-based queries
    await this.redisClient.zAdd('hook:executions', {
      score: execution.startTime,
      value: execution.id
    });

    // Keep in-memory history (limited)
    this.executionHistory.push(execution);
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }

  updateMetrics(hookType, execution) {
    if (!this.metrics.has(hookType)) {
      this.metrics.set(hookType, {
        count: 0,
        totalDuration: 0,
        successCount: 0,
        errorCount: 0,
        avgDuration: 0
      });
    }

    const metrics = this.metrics.get(hookType);
    metrics.count++;
    metrics.totalDuration += execution.duration;
    
    if (execution.success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }
    
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    metrics.successRate = metrics.successCount / metrics.count;
  }

  async publishExecutionEvent(execution) {
    const event = {
      type: 'hook:execution',
      execution: {
        id: execution.id,
        type: execution.type,
        success: execution.success,
        duration: execution.duration,
        hookCount: execution.hooks.length
      },
      timestamp: Date.now()
    };

    await this.redisClient.publish('hooks:events', JSON.stringify(event));
  }

  getMetrics(hookType) {
    if (hookType) {
      return this.metrics.get(hookType);
    }
    return Object.fromEntries(this.metrics);
  }

  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(-limit);
  }

  async getExecutionById(executionId) {
    const key = `hook:execution:${executionId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async shutdown() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.emit('shutdown');
  }
}

module.exports = HookExecutor;