// High-performance base class for scalable agent architecture
const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

class AgentBase {
  constructor(agentId, model, role, capabilities = []) {
    this.agentId = agentId;
    this.model = model;
    this.role = role;
    this.capabilities = capabilities;
    this.isRunning = false;
    this.redis = null;
    this.configCache = new Map();
    this.performance = {
      tasksProcessed: 0,
      errors: 0,
      averageResponseTime: 0,
      startTime: Date.now()
    };
  }

  // Singleton Redis connection pool
  static getRedisConnection() {
    if (!AgentBase.redisPool) {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000
      };

      if (process.env.REDIS_CLUSTER === 'true') {
        AgentBase.redisPool = new Redis.Cluster([
          { host: process.env.REDIS_HOST1 || 'localhost', port: 6379 },
          { host: process.env.REDIS_HOST2 || 'localhost', port: 6380 },
          { host: process.env.REDIS_HOST3 || 'localhost', port: 6381 }
        ], { redisOptions: redisConfig });
      } else {
        AgentBase.redisPool = new Redis(redisConfig);
      }
    }
    return AgentBase.redisPool;
  }

  // Cached configuration loading
  static async loadConfig(configPath, ttl = 300000) { // 5 min TTL
    const cacheKey = `config:${configPath}`;
    
    if (AgentBase.configCache && AgentBase.configCache.has(cacheKey)) {
      const cached = AgentBase.configCache.get(cacheKey);
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
    }

    try {
      const data = JSON.parse(await fs.readFile(path.resolve(configPath), 'utf-8'));
      if (!AgentBase.configCache) AgentBase.configCache = new Map();
      AgentBase.configCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Failed to load config ${configPath}:`, error);
      throw error;
    }
  }

  // Initialize agent with performance optimizations
  async initialize() {
    this.redis = AgentBase.getRedisConnection();
    
    // Load configurations in parallel
    const [fileMap, tokenPool] = await Promise.all([
      AgentBase.loadConfig(process.env.FILEMAP_PATH || './shared/filemap.json'),
      AgentBase.loadConfig(process.env.TOKENPOOL_PATH || './shared/tokenpool.json')
    ]);

    this.fileMap = fileMap;
    this.tokenPool = tokenPool;

    // Register agent with heartbeat
    await this.registerAgent();
    this.startHeartbeat();

    console.log(`🚀 Agent ${this.agentId} [${this.role}] initialized with ${this.capabilities.length} capabilities`);
  }

  // High-performance queue processing with BLPOP
  async processQueue() {
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        // Use blocking pop for efficiency (waits up to 5 seconds)
        const result = await this.redis.blpop(`queue:${this.model}`, 5);
        
        if (!result) continue; // Timeout, continue loop
        
        const [, jobData] = result;
        const job = JSON.parse(jobData);
        
        await this.processJob(job);
        
      } catch (error) {
        await this.handleError(error);
        // Back-off strategy for errors
        await new Promise(r => setTimeout(r, Math.min(1000 * this.performance.errors, 10000)));
      }
    }
  }

  // Optimized job processing with performance tracking
  async processJob(job) {
    const startTime = performance.now();
    const { file, prompt, taskId = `task_${Date.now()}` } = job;
    
    try {
      console.log(`📋 Processing ${taskId}: ${file}`);
      
      // Update status atomically
      await this.redis.hset(`agent:${this.agentId}`, {
        status: 'working',
        currentTask: taskId,
        lastUpdate: Date.now()
      });

      // Process with role-specific implementation
      const result = await this.processTask(file, prompt, taskId);
      
      // Update performance metrics
      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics(duration, true);
      
      console.log(`✅ Completed ${taskId} in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      this.updatePerformanceMetrics(performance.now() - startTime, false);
      throw error;
    } finally {
      // Reset status
      await this.redis.hset(`agent:${this.agentId}`, {
        status: 'idle',
        currentTask: null,
        lastUpdate: Date.now()
      });
    }
  }

  // Abstract method - implemented by specific agent types
  async processTask(file, prompt, taskId) {
    throw new Error('processTask must be implemented by subclass');
  }

  // Unified error handling
  async handleError(error, context = {}) {
    this.performance.errors++;
    
    const errorData = {
      agentId: this.agentId,
      model: this.model,
      role: this.role,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    // Log to Redis for monitoring
    await this.redis.lpush('queue:errors', JSON.stringify(errorData));
    
    console.error(`❌ Agent ${this.agentId} error:`, error.message);
  }

  // Performance metrics tracking
  updatePerformanceMetrics(duration, success) {
    this.performance.tasksProcessed++;
    
    if (success) {
      // Calculate running average
      const totalTasks = this.performance.tasksProcessed - this.performance.errors;
      this.performance.averageResponseTime = 
        (this.performance.averageResponseTime * (totalTasks - 1) + duration) / totalTasks;
    }
  }

  // Efficient agent registration
  async registerAgent() {
    const agentData = {
      id: this.agentId,
      model: this.model,
      role: this.role,
      capabilities: JSON.stringify(this.capabilities),
      status: 'idle',
      startTime: Date.now(),
      pid: process.pid,
      memory: process.memoryUsage().heapUsed
    };

    await this.redis.hset(`agent:${this.agentId}`, agentData);
    await this.redis.sadd('agents:active', this.agentId);
  }

  // Lightweight heartbeat with performance data
  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const memUsage = process.memoryUsage();
        await this.redis.hset(`agent:${this.agentId}`, {
          lastHeartbeat: Date.now(),
          memory: memUsage.heapUsed,
          uptime: Date.now() - this.performance.startTime,
          tasksProcessed: this.performance.tasksProcessed,
          errors: this.performance.errors,
          averageResponseTime: this.performance.averageResponseTime.toFixed(2)
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    }, 10000); // 10 second intervals
  }

  // Graceful shutdown
  async shutdown() {
    this.isRunning = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Cleanup Redis entries
    await this.redis.srem('agents:active', this.agentId);
    await this.redis.del(`agent:${this.agentId}`);
    
    console.log(`🛑 Agent ${this.agentId} shutdown complete`);
  }

  // Get performance statistics
  getPerformanceStats() {
    const uptime = Date.now() - this.performance.startTime;
    return {
      agentId: this.agentId,
      model: this.model,
      role: this.role,
      uptime,
      tasksProcessed: this.performance.tasksProcessed,
      errors: this.performance.errors,
      successRate: ((this.performance.tasksProcessed - this.performance.errors) / this.performance.tasksProcessed * 100).toFixed(2),
      averageResponseTime: this.performance.averageResponseTime.toFixed(2),
      tasksPerMinute: (this.performance.tasksProcessed / (uptime / 60000)).toFixed(2),
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (AgentBase.redisPool) {
    await AgentBase.redisPool.quit();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (AgentBase.redisPool) {
    await AgentBase.redisPool.quit();
  }
  process.exit(0);
});

module.exports = AgentBase;