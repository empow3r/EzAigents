const EventEmitter = require('events');

class BaseHook extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    
    // Default metadata - should be overridden by subclasses
    this.metadata = {
      name: 'base-hook',
      version: '1.0.0',
      type: 'unknown',
      description: 'Base hook implementation',
      priority: 50,
      enabled: true,
      timeout: 30000,
      ...config.metadata
    };

    this.metrics = {
      executions: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0
    };
  }

  // Main execution method - must be implemented by subclasses
  async execute(context) {
    throw new Error('Hook execute method must be implemented');
  }

  // Pre-execution validation
  async validate(context) {
    return { valid: true };
  }

  // Wrapper for execution with metrics
  async run(context) {
    const startTime = Date.now();
    this.metrics.executions++;

    try {
      // Validate first
      const validation = await this.validate(context);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.reason || 'Unknown reason'}`);
      }

      // Execute hook logic
      const result = await this.execute(context);
      
      // Update metrics
      this.metrics.successes++;
      this.metrics.totalDuration += (Date.now() - startTime);
      
      // Log success
      context.debug(`Hook ${this.metadata.name} executed successfully`, {
        duration: Date.now() - startTime,
        result
      });

      return result;
    } catch (error) {
      // Update metrics
      this.metrics.failures++;
      this.metrics.totalDuration += (Date.now() - startTime);
      
      // Log error
      context.error(`Hook ${this.metadata.name} failed`, {
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      avgDuration: this.metrics.executions > 0 
        ? this.metrics.totalDuration / this.metrics.executions 
        : 0,
      successRate: this.metrics.executions > 0 
        ? this.metrics.successes / this.metrics.executions 
        : 0
    };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      executions: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0
    };
  }

  // Enable/disable hook
  enable() {
    this.metadata.enabled = true;
    this.emit('enabled');
  }

  disable() {
    this.metadata.enabled = false;
    this.emit('disabled');
  }

  // Check if hook should run
  shouldRun(context) {
    return this.metadata.enabled;
  }

  // Utility method for async delays
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method for retries
  async retry(fn, options = {}) {
    const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await this.delay(delay * Math.pow(backoff, attempt - 1));
        }
      }
    }

    throw lastError;
  }
}

module.exports = BaseHook;