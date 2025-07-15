const EventEmitter = require('events');

class HookChain extends EventEmitter {
  constructor(registry, executor) {
    super();
    this.registry = registry;
    this.executor = executor;
    this.chains = new Map();
  }

  // Define a named chain of hooks
  define(name, config) {
    const chain = {
      name,
      description: config.description || '',
      steps: config.steps || [],
      conditions: config.conditions || {},
      parallel: config.parallel || false,
      continueOnError: config.continueOnError !== false,
      timeout: config.timeout || 60000,
      enabled: config.enabled !== false
    };

    this.chains.set(name, chain);
    this.emit('chain:defined', { name, chain });
    return this;
  }

  // Execute a named chain
  async execute(chainName, context) {
    const chain = this.chains.get(chainName);
    if (!chain) {
      throw new Error(`Chain '${chainName}' not found`);
    }

    if (!chain.enabled) {
      return { executed: false, reason: 'chain_disabled' };
    }

    // Check conditions
    if (!this.checkConditions(chain.conditions, context)) {
      return { executed: false, reason: 'conditions_not_met' };
    }

    const execution = {
      id: `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chain: chainName,
      startTime: Date.now(),
      steps: [],
      context
    };

    try {
      if (chain.parallel) {
        execution.steps = await this.executeParallel(chain, context);
      } else {
        execution.steps = await this.executeSequential(chain, context);
      }

      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.success = execution.steps.every(s => s.success);

      this.emit('chain:executed', execution);
      return execution;
    } catch (error) {
      execution.error = error.message;
      execution.success = false;
      this.emit('chain:error', { execution, error });
      throw error;
    }
  }

  // Execute chain steps in parallel
  async executeParallel(chain, context) {
    const promises = chain.steps.map(step => 
      this.executeStep(step, context, chain)
    );

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      const step = chain.steps[index];
      if (result.status === 'fulfilled') {
        return { ...result.value, step: step.name || step.type };
      } else {
        return {
          step: step.name || step.type,
          success: false,
          error: result.reason.message
        };
      }
    });
  }

  // Execute chain steps sequentially
  async executeSequential(chain, context) {
    const results = [];
    let currentContext = context;

    for (const step of chain.steps) {
      try {
        const result = await this.executeStep(step, currentContext, chain);
        results.push({ ...result, step: step.name || step.type });

        // Update context for next step
        if (result.contextModifications) {
          currentContext = {
            ...currentContext,
            ...result.contextModifications
          };
        }

        // Check if we should stop
        if (result.stopChain) {
          break;
        }
      } catch (error) {
        const errorResult = {
          step: step.name || step.type,
          success: false,
          error: error.message
        };
        results.push(errorResult);

        if (!chain.continueOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  // Execute a single step
  async executeStep(step, context, chain) {
    // Check step conditions
    if (step.conditions && !this.checkConditions(step.conditions, context)) {
      return { success: true, skipped: true, reason: 'conditions_not_met' };
    }

    switch (step.type) {
      case 'hook':
        return await this.executeHookStep(step, context);
      
      case 'chain':
        return await this.executeChainStep(step, context);
      
      case 'conditional':
        return await this.executeConditionalStep(step, context);
      
      case 'loop':
        return await this.executeLoopStep(step, context);
      
      case 'transform':
        return await this.executeTransformStep(step, context);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  // Execute a hook step
  async executeHookStep(step, context) {
    const hookType = step.hookType || step.hook;
    const execution = await this.executor.execute(hookType, context);
    
    return {
      success: execution.success,
      execution,
      contextModifications: execution.results
        .filter(r => r.contextModifications)
        .reduce((acc, r) => ({ ...acc, ...r.contextModifications }), {})
    };
  }

  // Execute a nested chain step
  async executeChainStep(step, context) {
    const nestedExecution = await this.execute(step.chain, context);
    return {
      success: nestedExecution.success,
      nestedExecution
    };
  }

  // Execute conditional logic
  async executeConditionalStep(step, context) {
    const condition = this.evaluateExpression(step.condition, context);
    
    if (condition) {
      if (step.then) {
        return await this.executeStep(step.then, context);
      }
    } else {
      if (step.else) {
        return await this.executeStep(step.else, context);
      }
    }

    return { success: true, skipped: true };
  }

  // Execute loop logic
  async executeLoopStep(step, context) {
    const items = this.evaluateExpression(step.items, context) || [];
    const results = [];

    for (const item of items) {
      const loopContext = {
        ...context,
        loop: { item, index: results.length, total: items.length }
      };

      const result = await this.executeStep(step.body, loopContext);
      results.push(result);

      if (result.stopChain) {
        break;
      }
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }

  // Execute data transformation
  async executeTransformStep(step, context) {
    try {
      const transformed = await this.evaluateExpression(step.transform, context);
      return {
        success: true,
        contextModifications: {
          [step.output || 'transformed']: transformed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check conditions
  checkConditions(conditions, context) {
    if (!conditions) return true;

    for (const [key, condition] of Object.entries(conditions)) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  // Evaluate a condition
  evaluateCondition(condition, context) {
    if (typeof condition === 'function') {
      return condition(context);
    }

    if (typeof condition === 'object' && condition.expression) {
      return this.evaluateExpression(condition.expression, context);
    }

    return !!condition;
  }

  // Simple expression evaluator (can be enhanced)
  evaluateExpression(expression, context) {
    if (typeof expression === 'function') {
      return expression(context);
    }

    // Simple property access
    if (typeof expression === 'string' && expression.startsWith('$.')) {
      const path = expression.slice(2).split('.');
      let value = context;
      
      for (const key of path) {
        value = value?.[key];
      }
      
      return value;
    }

    return expression;
  }

  // Get all defined chains
  getChains() {
    return Array.from(this.chains.values());
  }

  // Get a specific chain
  getChain(name) {
    return this.chains.get(name);
  }

  // Enable/disable a chain
  enableChain(name) {
    const chain = this.chains.get(name);
    if (chain) {
      chain.enabled = true;
      this.emit('chain:enabled', { name });
    }
  }

  disableChain(name) {
    const chain = this.chains.get(name);
    if (chain) {
      chain.enabled = false;
      this.emit('chain:disabled', { name });
    }
  }

  // Remove a chain
  removeChain(name) {
    if (this.chains.delete(name)) {
      this.emit('chain:removed', { name });
    }
  }
}

module.exports = HookChain;