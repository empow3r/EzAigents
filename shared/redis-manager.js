// Centralized Redis Connection Manager
// Eliminates duplicate Redis connection code across 53+ files

const Redis = require('ioredis');
const EventEmitter = require('events');

class RedisManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.config = this._loadConfig();
    this.isShuttingDown = false;
  }

  _loadConfig() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        if (this.isShuttingDown) return null;
        const delay = Math.min(times * 100, 3000);
        console.log(`🔄 Redis reconnecting in ${delay}ms...`);
        return delay;
      },
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    };
  }

  // Get or create a Redis connection
  getConnection(name = 'default') {
    if (!this.connections.has(name)) {
      const redis = this._createConnection(name);
      this.connections.set(name, redis);
    }
    return this.connections.get(name);
  }

  // Create a new Redis connection with event handling
  _createConnection(name) {
    let redis;

    if (process.env.REDIS_CLUSTER === 'true') {
      // Cluster mode
      const nodes = [
        { host: process.env.REDIS_HOST1 || 'localhost', port: 6379 },
        { host: process.env.REDIS_HOST2 || 'localhost', port: 6380 },
        { host: process.env.REDIS_HOST3 || 'localhost', port: 6381 }
      ];
      redis = new Redis.Cluster(nodes, {
        redisOptions: this.config,
        clusterRetryStrategy: this.config.retryStrategy
      });
    } else if (process.env.REDIS_SENTINEL === 'true') {
      // Sentinel mode
      redis = new Redis({
        sentinels: [
          { host: process.env.SENTINEL_HOST1 || 'localhost', port: 26379 },
          { host: process.env.SENTINEL_HOST2 || 'localhost', port: 26380 }
        ],
        name: process.env.SENTINEL_MASTER || 'mymaster',
        ...this.config
      });
    } else {
      // Standalone mode
      redis = new Redis(process.env.REDIS_URL || this.config);
    }

    // Event handling
    redis.on('connect', () => {
      console.log(`✅ Redis[${name}] connected`);
      this.emit('connected', name);
    });

    redis.on('ready', () => {
      console.log(`🚀 Redis[${name}] ready`);
      this.emit('ready', name);
    });

    redis.on('error', (error) => {
      console.error(`❌ Redis[${name}] error:`, error.message);
      this.emit('error', { name, error });
    });

    redis.on('close', () => {
      console.log(`🔌 Redis[${name}] disconnected`);
      this.emit('disconnected', name);
    });

    redis.on('reconnecting', (delay) => {
      console.log(`🔄 Redis[${name}] reconnecting in ${delay}ms`);
      this.emit('reconnecting', { name, delay });
    });

    return redis;
  }

  // Create a subscriber connection (for pub/sub)
  createSubscriber(name = 'subscriber') {
    const subscriber = this._createConnection(name);
    // Subscribers need special handling
    subscriber.setMaxListeners(0); // Remove warning for many subscriptions
    return subscriber;
  }

  // Create a publisher connection
  createPublisher(name = 'publisher') {
    return this._createConnection(name);
  }

  // Health check for all connections
  async healthCheck() {
    const results = {};
    
    for (const [name, redis] of this.connections) {
      try {
        const start = Date.now();
        await redis.ping();
        results[name] = {
          status: 'healthy',
          latency: Date.now() - start,
          connected: redis.status === 'ready'
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          connected: false
        };
      }
    }
    
    return results;
  }

  // Get connection statistics
  async getStats() {
    const stats = {};
    
    for (const [name, redis] of this.connections) {
      if (redis.status === 'ready') {
        try {
          const info = await redis.info();
          const lines = info.split('\r\n');
          const parsed = {};
          
          lines.forEach(line => {
            if (line && !line.startsWith('#')) {
              const [key, value] = line.split(':');
              if (key && value) parsed[key] = value;
            }
          });
          
          stats[name] = {
            connected_clients: parseInt(parsed.connected_clients) || 0,
            used_memory_human: parsed.used_memory_human || 'N/A',
            total_commands_processed: parseInt(parsed.total_commands_processed) || 0,
            instantaneous_ops_per_sec: parseInt(parsed.instantaneous_ops_per_sec) || 0,
            keyspace_hits: parseInt(parsed.keyspace_hits) || 0,
            keyspace_misses: parseInt(parsed.keyspace_misses) || 0,
            status: redis.status
          };
        } catch (error) {
          stats[name] = { error: error.message, status: redis.status };
        }
      } else {
        stats[name] = { status: redis.status };
      }
    }
    
    return stats;
  }

  // Gracefully close all connections
  async shutdown() {
    this.isShuttingDown = true;
    console.log('🛑 Shutting down Redis connections...');
    
    const promises = [];
    
    for (const [name, redis] of this.connections) {
      console.log(`Closing Redis[${name}]...`);
      promises.push(redis.quit());
    }
    
    await Promise.all(promises);
    this.connections.clear();
    console.log('✅ All Redis connections closed');
  }

  // Execute command on specific connection
  async execute(command, args = [], connectionName = 'default') {
    const redis = this.getConnection(connectionName);
    return redis[command](...args);
  }

  // Pipeline commands for better performance
  pipeline(commands = [], connectionName = 'default') {
    const redis = this.getConnection(connectionName);
    const pipeline = redis.pipeline();
    
    commands.forEach(([command, ...args]) => {
      pipeline[command](...args);
    });
    
    return pipeline.exec();
  }

  // Multi/Transaction support
  multi(commands = [], connectionName = 'default') {
    const redis = this.getConnection(connectionName);
    const multi = redis.multi();
    
    commands.forEach(([command, ...args]) => {
      multi[command](...args);
    });
    
    return multi.exec();
  }
}

// Singleton instance
let instance = null;

class RedisManagerSingleton {
  constructor() {
    if (!instance) {
      instance = new RedisManager();
      
      // Handle process termination
      process.on('SIGTERM', async () => {
        await instance.shutdown();
        process.exit(0);
      });
      
      process.on('SIGINT', async () => {
        await instance.shutdown();
        process.exit(0);
      });
    }
    
    return instance;
  }
}

// Export singleton instance
module.exports = new RedisManagerSingleton();

// Also export the class for testing
module.exports.RedisManager = RedisManager;