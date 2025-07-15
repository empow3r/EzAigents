const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const Redis = require('redis');

class HookRegistry extends EventEmitter {
  constructor(config = {}) {
    super();
    this.hooks = new Map();
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      enabled: process.env.HOOKS_ENABLED !== 'false',
      logLevel: process.env.HOOK_LOG_LEVEL || 'info',
      ...config
    };
    this.redisClient = null;
    this.pubClient = null;
    this.subClient = null;
  }

  async initialize() {
    if (!this.config.enabled) {
      console.log('Hooks system disabled');
      return;
    }

    // Initialize Redis connections
    this.redisClient = Redis.createClient({ url: this.config.redisUrl });
    this.pubClient = this.redisClient.duplicate();
    this.subClient = this.redisClient.duplicate();

    await Promise.all([
      this.redisClient.connect(),
      this.pubClient.connect(),
      this.subClient.connect()
    ]);

    // Subscribe to hook events
    await this.subClient.subscribe('hooks:register', (message) => {
      const hookData = JSON.parse(message);
      this.registerRemoteHook(hookData);
    });

    // Load configuration
    await this.loadConfiguration();
    
    // Auto-discover hooks
    await this.discoverHooks();

    this.emit('initialized');
  }

  async loadConfiguration() {
    try {
      const configPath = path.join(__dirname, '../config/hooks.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = { ...this.config, ...JSON.parse(configData) };
    } catch (error) {
      // Use default config if file doesn't exist
      console.log('No hooks configuration found, using defaults');
    }
  }

  async discoverHooks() {
    const handlersDir = path.join(__dirname, '../handlers');
    const categories = await fs.readdir(handlersDir);

    for (const category of categories) {
      const categoryPath = path.join(handlersDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(categoryPath);
        
        for (const file of files) {
          if (file.endsWith('.js')) {
            const hookPath = path.join(categoryPath, file);
            await this.loadHook(hookPath, category);
          }
        }
      }
    }
  }

  async loadHook(hookPath, category) {
    try {
      const HookClass = require(hookPath);
      const hookInstance = new HookClass(this.config);
      
      if (hookInstance.metadata) {
        const hookId = `${category}:${hookInstance.metadata.name}`;
        
        this.hooks.set(hookId, {
          id: hookId,
          category,
          instance: hookInstance,
          metadata: hookInstance.metadata,
          enabled: hookInstance.metadata.enabled !== false
        });

        console.log(`Loaded hook: ${hookId}`);
        this.emit('hook:loaded', { hookId, metadata: hookInstance.metadata });
      }
    } catch (error) {
      console.error(`Failed to load hook from ${hookPath}:`, error);
    }
  }

  async register(hookId, hookData) {
    this.hooks.set(hookId, {
      id: hookId,
      ...hookData,
      enabled: hookData.enabled !== false
    });

    // Notify other instances via Redis
    await this.pubClient.publish('hooks:register', JSON.stringify({
      hookId,
      ...hookData,
      metadata: hookData.metadata || {}
    }));

    this.emit('hook:registered', { hookId });
  }

  registerRemoteHook(hookData) {
    const { hookId, ...data } = hookData;
    if (!this.hooks.has(hookId)) {
      this.hooks.set(hookId, {
        id: hookId,
        ...data,
        remote: true
      });
      this.emit('hook:registered:remote', { hookId });
    }
  }

  async unregister(hookId) {
    if (this.hooks.has(hookId)) {
      this.hooks.delete(hookId);
      this.emit('hook:unregistered', { hookId });
    }
  }

  getHook(hookId) {
    return this.hooks.get(hookId);
  }

  getHooksByType(type) {
    const results = [];
    for (const [id, hook] of this.hooks) {
      if (hook.metadata && hook.metadata.type === type && hook.enabled) {
        results.push(hook);
      }
    }
    return results.sort((a, b) => (b.metadata.priority || 0) - (a.metadata.priority || 0));
  }

  getHooksByCategory(category) {
    const results = [];
    for (const [id, hook] of this.hooks) {
      if (hook.category === category && hook.enabled) {
        results.push(hook);
      }
    }
    return results;
  }

  getAllHooks() {
    return Array.from(this.hooks.values());
  }

  async enableHook(hookId) {
    const hook = this.hooks.get(hookId);
    if (hook) {
      hook.enabled = true;
      await this.saveConfiguration();
      this.emit('hook:enabled', { hookId });
    }
  }

  async disableHook(hookId) {
    const hook = this.hooks.get(hookId);
    if (hook) {
      hook.enabled = false;
      await this.saveConfiguration();
      this.emit('hook:disabled', { hookId });
    }
  }

  async saveConfiguration() {
    const config = {
      ...this.config,
      hooks: {}
    };

    for (const [id, hook] of this.hooks) {
      config.hooks[id] = {
        enabled: hook.enabled,
        metadata: hook.metadata
      };
    }

    const configPath = path.join(__dirname, '../config/hooks.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  async shutdown() {
    if (this.redisClient) await this.redisClient.quit();
    if (this.pubClient) await this.pubClient.quit();
    if (this.subClient) await this.subClient.quit();
    this.emit('shutdown');
  }
}

module.exports = HookRegistry;