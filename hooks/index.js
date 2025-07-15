const HookRegistry = require('./core/HookRegistry');
const HookExecutor = require('./core/HookExecutor');
const HookContext = require('./core/HookContext');
const HookChain = require('./core/HookChain');
const HookAnalytics = require('./core/HookAnalytics');
const BaseHook = require('./core/BaseHook');

class HooksSystem {
  constructor(config = {}) {
    this.config = {
      enabled: process.env.HOOKS_ENABLED !== 'false',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      ...config
    };

    this.registry = null;
    this.executor = null;
    this.chains = null;
    this.analytics = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.config.enabled) {
      console.log('Hooks system is disabled');
      return;
    }

    try {
      // Initialize registry
      this.registry = new HookRegistry(this.config);
      await this.registry.initialize();

      // Initialize executor
      this.executor = new HookExecutor(this.registry, this.config);
      await this.executor.initialize();

      // Initialize chains
      this.chains = new HookChain(this.registry, this.executor);

      // Initialize analytics
      this.analytics = new HookAnalytics(this.config);
      await this.analytics.initialize();

      // Load default chains
      await this.loadDefaultChains();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      console.log('Hooks system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize hooks system:', error);
      throw error;
    }
  }

  async loadDefaultChains() {
    // Standard task processing chain
    this.chains.define('task-processing', {
      description: 'Standard task processing with safety and logging',
      steps: [
        { type: 'hook', hookType: 'pre-task', name: 'Safety checks' },
        { type: 'hook', hookType: 'post-task', name: 'Logging and metrics' }
      ]
    });

    // Security validation chain
    this.chains.define('security-validation', {
      description: 'Comprehensive security validation',
      steps: [
        { type: 'hook', hookType: 'pre-execution-safety', name: 'Pattern matching' },
        { type: 'hook', hookType: 'security-analysis', name: 'Deep analysis' }
      ],
      continueOnError: false
    });

    // Performance optimization chain
    this.chains.define('performance-optimization', {
      description: 'Performance analysis and optimization',
      parallel: true,
      steps: [
        { type: 'hook', hookType: 'performance-analysis', name: 'Analyze metrics' },
        { type: 'hook', hookType: 'optimization-suggestions', name: 'Generate suggestions' }
      ]
    });
  }

  setupEventListeners() {
    // Forward hook execution events
    this.executor.on('execution:complete', (execution) => {
      // Publish to Redis for monitoring
      this.publishEvent('hook:execution:complete', execution);
    });

    this.executor.on('execution:error', ({ execution, error }) => {
      // Publish error events
      this.publishEvent('hook:execution:error', { execution, error: error.message });
    });

    // Registry events
    this.registry.on('hook:registered', ({ hookId }) => {
      console.log(`Hook registered: ${hookId}`);
    });

    this.registry.on('hook:enabled', ({ hookId }) => {
      this.publishEvent('hook:config:changed', { hookId, enabled: true });
    });

    this.registry.on('hook:disabled', ({ hookId }) => {
      this.publishEvent('hook:config:changed', { hookId, enabled: false });
    });
  }

  async publishEvent(channel, data) {
    if (this.registry && this.registry.pubClient) {
      await this.registry.pubClient.publish(channel, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
    }
  }

  // Create a hook context
  createContext(data = {}) {
    return new HookContext(data);
  }

  // Execute hooks of a specific type
  async execute(hookType, context) {
    if (!this.initialized) {
      throw new Error('Hooks system not initialized');
    }

    return await this.executor.execute(hookType, context);
  }

  // Execute a hook chain
  async executeChain(chainName, context) {
    if (!this.initialized) {
      throw new Error('Hooks system not initialized');
    }

    return await this.chains.execute(chainName, context);
  }

  // Register a new hook
  async registerHook(hookId, hook) {
    if (!this.initialized) {
      throw new Error('Hooks system not initialized');
    }

    await this.registry.register(hookId, hook);
  }

  // Get hook metrics
  async getMetrics(hookType) {
    if (!this.analytics) {
      return null;
    }

    return await this.analytics.getMetrics(hookType);
  }

  // Get analytics report
  async getAnalyticsReport(options) {
    if (!this.analytics) {
      return null;
    }

    return await this.analytics.generateReport(options);
  }

  // Enable/disable hooks
  async enableHook(hookId) {
    await this.registry.enableHook(hookId);
  }

  async disableHook(hookId) {
    await this.registry.disableHook(hookId);
  }

  // Get all hooks
  getHooks() {
    return this.registry.getAllHooks();
  }

  // Get hooks by type
  getHooksByType(type) {
    return this.registry.getHooksByType(type);
  }

  // Get chains
  getChains() {
    return this.chains.getChains();
  }

  // Shutdown
  async shutdown() {
    console.log('Shutting down hooks system...');

    if (this.analytics) {
      await this.analytics.shutdown();
    }

    if (this.executor) {
      await this.executor.shutdown();
    }

    if (this.registry) {
      await this.registry.shutdown();
    }

    this.initialized = false;
  }

  // Factory method to create a hook
  static createHook(config) {
    return new BaseHook(config);
  }

  // Check if system is ready
  isReady() {
    return this.initialized && this.config.enabled;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  // Main hooks system
  HooksSystem,

  // Core components
  HookRegistry,
  HookExecutor,
  HookContext,
  HookChain,
  HookAnalytics,
  BaseHook,

  // Get singleton instance
  getInstance: async (config) => {
    if (!instance) {
      instance = new HooksSystem(config);
      await instance.initialize();
    }
    return instance;
  },

  // Helper to create hook context
  createContext: (data) => new HookContext(data),

  // Helper to create a hook
  createHook: (config) => new BaseHook(config)
};