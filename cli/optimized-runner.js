// Ultra-high performance orchestrator for 1000+ agents
const Redis = require('ioredis');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class OptimizedOrchestrator {
  constructor() {
    this.isRunning = false;
    this.redis = null;
    this.subscriber = null;
    this.performance = {
      tasksEnqueued: 0,
      tasksCompleted: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    // Configuration cache
    this.configCache = new Map();
    this.lastConfigLoad = 0;
    this.configTTL = 60000; // 1 minute TTL
  }

  // Initialize with Redis clustering support
  async initialize() {
    console.log('🚀 Initializing OptimizedOrchestrator...');
    
    // Setup Redis connections
    await this.setupRedis();
    
    // Load configurations
    await this.loadConfigurations();
    
    // Setup monitoring
    this.setupMonitoring();
    
    // Setup graceful shutdown
    this.setupShutdownHandlers();
    
    console.log('✅ OptimizedOrchestrator initialized');
  }

  // Redis cluster setup for high availability
  async setupRedis() {
    const redisConfig = {
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000
    };

    if (process.env.REDIS_CLUSTER === 'true') {
      // Redis Cluster for high availability
      this.redis = new Redis.Cluster([
        { host: process.env.REDIS_HOST1 || 'localhost', port: 6379 },
        { host: process.env.REDIS_HOST2 || 'localhost', port: 6380 },
        { host: process.env.REDIS_HOST3 || 'localhost', port: 6381 }
      ], { redisOptions: redisConfig });
      
      this.subscriber = new Redis.Cluster([
        { host: process.env.REDIS_HOST1 || 'localhost', port: 6379 },
        { host: process.env.REDIS_HOST2 || 'localhost', port: 6380 },
        { host: process.env.REDIS_HOST3 || 'localhost', port: 6381 }
      ], { redisOptions: redisConfig });
    } else {
      // Single Redis instance
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        ...redisConfig
      });
      
      this.subscriber = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        ...redisConfig
      });
    }

    // Test connections
    await Promise.all([
      this.redis.ping(),
      this.subscriber.ping()
    ]);
    
    console.log('✅ Redis connections established');
  }

  // Cached configuration loading
  async loadConfigurations() {
    const now = Date.now();
    if (now - this.lastConfigLoad < this.configTTL && this.configCache.size > 0) {
      return; // Use cached configurations
    }

    try {
      const [fileMap, tokenPool] = await Promise.all([
        fs.readFile(path.resolve(process.env.FILEMAP_PATH || './shared/filemap.json'), 'utf-8'),
        fs.readFile(path.resolve(process.env.TOKENPOOL_PATH || './shared/tokenpool.json'), 'utf-8')
      ]);

      this.configCache.set('filemap', JSON.parse(fileMap));
      this.configCache.set('tokenpool', JSON.parse(tokenPool));
      this.lastConfigLoad = now;
      
      console.log('✅ Configurations loaded and cached');
    } catch (error) {
      console.error('❌ Failed to load configurations:', error);
      throw error;
    }
  }

  // High-performance batch task enqueuing
  async enqueueTasks(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { success: false, error: 'No tasks provided' };
    }

    const startTime = performance.now();
    const fileMap = this.configCache.get('filemap');
    
    try {
      // Use Redis pipeline for batch operations
      const pipeline = this.redis.pipeline();
      const enrichedTasks = [];
      
      for (const task of tasks) {
        const enrichedTask = await this.enrichTask(task, fileMap);
        if (enrichedTask) {
          pipeline.lpush(`queue:${enrichedTask.model}`, JSON.stringify(enrichedTask));
          enrichedTasks.push(enrichedTask);
        }
      }
      
      // Execute all operations atomically
      const results = await pipeline.exec();
      
      // Update performance metrics
      this.performance.tasksEnqueued += enrichedTasks.length;
      
      const duration = performance.now() - startTime;
      console.log(`📋 Enqueued ${enrichedTasks.length} tasks in ${duration.toFixed(2)}ms`);
      
      return {
        success: true,
        tasksEnqueued: enrichedTasks.length,
        duration: duration.toFixed(2),
        tasks: enrichedTasks.map(t => ({ file: t.file, model: t.model, taskId: t.taskId }))
      };
      
    } catch (error) {
      this.performance.errors++;
      console.error('❌ Batch enqueue failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Task enrichment with caching
  async enrichTask(task, fileMap) {
    const { file, prompt } = task;
    
    // Find matching task configuration
    const taskConfig = fileMap.find(mapping => {
      if (mapping.pattern) {
        return new RegExp(mapping.pattern).test(file);
      }
      return mapping.file === file;
    });

    if (!taskConfig) {
      console.warn(`⚠️ No configuration found for file: ${file}`);
      return null;
    }

    return {
      file,
      prompt: prompt || taskConfig.prompt,
      model: taskConfig.model,
      priority: taskConfig.priority || 'normal',
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      orchestratorId: process.pid
    };
  }

  // Real-time monitoring and metrics collection
  setupMonitoring() {
    // Subscribe to task completion events
    this.subscriber.subscribe('task:completed', 'task:failed', 'agent:status');
    
    this.subscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        
        switch (channel) {
          case 'task:completed':
            this.performance.tasksCompleted++;
            break;
          case 'task:failed':
            this.performance.errors++;
            break;
          case 'agent:status':
            // Handle agent status updates
            this.handleAgentStatus(data);
            break;
        }
      } catch (error) {
        console.error('Error processing monitoring message:', error);
      }
    });

    // Performance metrics reporting
    setInterval(() => {
      this.reportMetrics();
    }, 30000); // Every 30 seconds
  }

  // Handle agent status updates
  async handleAgentStatus(statusData) {
    const { agentId, status, error } = statusData;
    
    if (status === 'error' && error) {
      console.error(`❌ Agent ${agentId} reported error: ${error}`);
      
      // Implement auto-recovery logic
      await this.handleAgentError(agentId, error);
    }
  }

  // Agent error recovery
  async handleAgentError(agentId, error) {
    // Log error for analysis
    await this.redis.lpush('errors:agent', JSON.stringify({
      agentId,
      error,
      timestamp: Date.now()
    }));
    
    // Check if agent is still responsive
    const agentData = await this.redis.hgetall(`agent:${agentId}`);
    const lastHeartbeat = parseInt(agentData.lastHeartbeat || 0);
    const now = Date.now();
    
    if (now - lastHeartbeat > 60000) { // 1 minute timeout
      console.warn(`🚨 Agent ${agentId} appears unresponsive, marking for restart`);
      await this.redis.sadd('agents:restart', agentId);
    }
  }

  // Performance metrics reporting
  reportMetrics() {
    const uptime = Date.now() - this.performance.startTime;
    const metrics = {
      orchestratorId: process.pid,
      uptime,
      tasksEnqueued: this.performance.tasksEnqueued,
      tasksCompleted: this.performance.tasksCompleted,
      errors: this.performance.errors,
      throughput: (this.performance.tasksCompleted / (uptime / 60000)).toFixed(2), // tasks per minute
      errorRate: (this.performance.errors / this.performance.tasksEnqueued * 100).toFixed(2),
      timestamp: Date.now()
    };

    // Store metrics in Redis
    this.redis.lpush('metrics:orchestrator', JSON.stringify(metrics));
    this.redis.ltrim('metrics:orchestrator', 0, 99); // Keep last 100 metrics
    
    console.log(`📊 Metrics: ${metrics.throughput} tasks/min, ${metrics.errorRate}% error rate`);
  }

  // Get queue statistics
  async getQueueStats() {
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus'];
    const pipeline = this.redis.pipeline();
    
    models.forEach(model => {
      pipeline.llen(`queue:${model}`);
      pipeline.llen(`processing:${model}`);
    });
    
    pipeline.scard('agents:active');
    pipeline.llen('queue:failures');
    
    const results = await pipeline.exec();
    let index = 0;
    
    const stats = {
      queues: {},
      totalQueued: 0,
      totalProcessing: 0,
      activeAgents: results[results.length - 2][1],
      failures: results[results.length - 1][1]
    };
    
    models.forEach(model => {
      const queued = results[index++][1];
      const processing = results[index++][1];
      
      stats.queues[model] = { queued, processing };
      stats.totalQueued += queued;
      stats.totalProcessing += processing;
    });
    
    return stats;
  }

  // Graceful shutdown
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      this.isRunning = false;
      
      try {
        // Close Redis connections
        if (this.subscriber) await this.subscriber.quit();
        if (this.redis) await this.redis.quit();
        
        console.log('✅ Orchestrator shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Start the orchestrator
  async start() {
    this.isRunning = true;
    console.log('🎯 OptimizedOrchestrator started and ready for 1000+ agents');
    
    // Keep process alive
    const healthCheck = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(healthCheck);
        return;
      }
      
      try {
        await this.redis.ping();
        // Reload configurations if needed
        await this.loadConfigurations();
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    }, 30000);
  }
}

// Multi-process orchestrator for maximum performance
if (cluster.isMaster) {
  const numWorkers = process.env.ORCHESTRATOR_WORKERS || Math.min(os.cpus().length, 4);
  
  console.log(`🚀 Starting ${numWorkers} orchestrator workers...`);
  
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
  
} else {
  // Worker process
  (async () => {
    const orchestrator = new OptimizedOrchestrator();
    
    try {
      await orchestrator.initialize();
      await orchestrator.start();
    } catch (error) {
      console.error('❌ Orchestrator startup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = OptimizedOrchestrator;