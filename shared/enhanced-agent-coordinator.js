/**
 * Enhanced Agent Coordinator with Advanced Features
 * - Message encryption and authentication
 * - Circuit breaker pattern
 * - Load balancing
 * - Metrics collection
 * - Dead letter queue handling
 */

const Redis = require('redis');
const crypto = require('crypto');
const EventEmitter = require('events');

class EnhancedAgentCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.agentId = config.agentId;
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.encryptionKey = config.encryptionKey || process.env.ENCRYPTION_KEY;
    
    // Redis clients
    this.redis = null;
    this.pubClient = null;
    this.subClient = null;
    
    // Connection pool
    this.connectionPool = [];
    this.maxConnections = config.maxConnections || 10;
    
    // Circuit breaker configuration
    this.circuitBreakers = new Map();
    this.circuitBreakerThreshold = config.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeout = config.circuitBreakerTimeout || 60000;
    
    // Metrics
    this.metrics = {
      messagesPublished: 0,
      messagesReceived: 0,
      tasksProcessed: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    // Agent registry with load balancing
    this.agentRegistry = new Map();
    this.agentLoadScores = new Map();
    
    // Dead letter queue
    this.dlqEnabled = config.dlqEnabled !== false;
    this.maxRetries = config.maxRetries || 3;
    
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚀 Initializing Enhanced Agent Coordinator...');
      
      // Initialize Redis connections with connection pooling
      await this.initializeRedisConnections();
      
      // Set up message handlers
      await this.setupMessageHandlers();
      
      // Initialize circuit breakers
      this.initializeCircuitBreakers();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      // Register this agent
      await this.registerAgent();
      
      this.isInitialized = true;
      console.log('✅ Enhanced Agent Coordinator initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Agent Coordinator:', error);
      throw error;
    }
  }

  async initializeRedisConnections() {
    // Main Redis client with connection pooling
    this.redis = await this.createRedisConnection();
    
    // Pub/Sub clients
    this.pubClient = await this.createRedisConnection();
    this.subClient = await this.createRedisConnection();
    
    // Test connections
    await Promise.all([
      this.redis.ping(),
      this.pubClient.ping(),
      this.subClient.ping()
    ]);
    
    console.log('✅ Redis connections established with pooling');
  }

  async createRedisConnection() {
    const client = Redis.createClient({
      url: this.redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 10000
      },
      retry_unfulfilled_commands: true
    });
    
    client.on('error', (err) => this.handleRedisError(err));
    client.on('reconnecting', () => console.log('📡 Redis reconnecting...'));
    client.on('ready', () => console.log('✅ Redis connection ready'));
    
    await client.connect();
    return client;
  }

  async getRedisConnection() {
    if (this.connectionPool.length > 0) {
      return this.connectionPool.pop();
    }
    
    if (this.connectionPool.length < this.maxConnections) {
      return await this.createRedisConnection();
    }
    
    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkPool = () => {
        if (this.connectionPool.length > 0) {
          resolve(this.connectionPool.pop());
        } else {
          setTimeout(checkPool, 10);
        }
      };
      checkPool();
    });
  }

  releaseRedisConnection(connection) {
    if (this.connectionPool.length < this.maxConnections) {
      this.connectionPool.push(connection);
    } else {
      connection.quit();
    }
  }

  async setupMessageHandlers() {
    // Agent-specific messages
    await this.subClient.subscribe(`agent:${this.agentId}:task`, (message) => {
      this.handleIncomingTask(JSON.parse(message));
    });
    
    await this.subClient.subscribe(`agent:${this.agentId}:message`, (message) => {
      this.handleDirectMessage(JSON.parse(message));
    });
    
    // Broadcast messages
    await this.subClient.subscribe('agent:broadcast', (message) => {
      this.handleBroadcastMessage(JSON.parse(message));
    });
    
    // Agent registry updates
    await this.subClient.subscribe('agent:registry:update', (message) => {
      this.updateAgentRegistry(JSON.parse(message));
    });
    
    console.log('✅ Message handlers set up');
  }

  initializeCircuitBreakers() {
    const services = ['task_execution', 'message_sending', 'api_calls'];
    
    services.forEach(service => {
      this.circuitBreakers.set(service, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        threshold: this.circuitBreakerThreshold,
        timeout: this.circuitBreakerTimeout
      });
    });
    
    console.log('✅ Circuit breakers initialized');
  }

  async executeWithCircuitBreaker(service, operation) {
    const breaker = this.circuitBreakers.get(service);
    
    if (breaker.state === 'OPEN') {
      if (Date.now() - breaker.lastFailureTime > breaker.timeout) {
        breaker.state = 'HALF_OPEN';
        console.log(`🔄 Circuit breaker for ${service} moved to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker for ${service} is OPEN`);
      }
    }
    
    try {
      const result = await operation();
      this.onCircuitBreakerSuccess(service);
      return result;
    } catch (error) {
      this.onCircuitBreakerFailure(service);
      throw error;
    }
  }

  onCircuitBreakerSuccess(service) {
    const breaker = this.circuitBreakers.get(service);
    breaker.failureCount = 0;
    breaker.state = 'CLOSED';
  }

  onCircuitBreakerFailure(service) {
    const breaker = this.circuitBreakers.get(service);
    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failureCount >= breaker.threshold) {
      breaker.state = 'OPEN';
      console.log(`⚠️ Circuit breaker for ${service} is now OPEN`);
    }
  }

  async sendSecureMessage(targetAgentId, type, data, priority = 'normal') {
    return await this.executeWithCircuitBreaker('message_sending', async () => {
      const message = {
        id: crypto.randomUUID(),
        from: this.agentId,
        to: targetAgentId,
        type: type,
        data: await this.encryptData(data),
        signature: await this.signMessage(data),
        timestamp: Date.now(),
        priority: priority
      };
      
      const channel = `agent:${targetAgentId}:message`;
      await this.pubClient.publish(channel, JSON.stringify(message));
      
      this.metrics.messagesPublished++;
      console.log(`📤 Secure message sent to ${targetAgentId}: ${type}`);
      
      return message.id;
    });
  }

  async broadcastSecureMessage(type, data, priority = 'normal') {
    return await this.executeWithCircuitBreaker('message_sending', async () => {
      const message = {
        id: crypto.randomUUID(),
        from: this.agentId,
        type: type,
        data: await this.encryptData(data),
        signature: await this.signMessage(data),
        timestamp: Date.now(),
        priority: priority
      };
      
      await this.pubClient.publish('agent:broadcast', JSON.stringify(message));
      
      this.metrics.messagesPublished++;
      console.log(`📢 Secure broadcast sent: ${type}`);
      
      return message.id;
    });
  }

  async encryptData(data) {
    if (!this.encryptionKey) return data;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'));
    cipher.setIVNoAuth(iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  async decryptData(encryptedData) {
    if (!this.encryptionKey || !encryptedData.encrypted) return encryptedData;
    
    const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'));
    decipher.setIVNoAuth(Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  async signMessage(data) {
    if (!this.encryptionKey) return null;
    
    const hash = crypto.createHmac('sha256', this.encryptionKey);
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  async verifySignature(data, signature) {
    if (!this.encryptionKey || !signature) return true;
    
    const expectedSignature = await this.signMessage(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  async selectOptimalAgent(capability, taskComplexity = 1) {
    const availableAgents = Array.from(this.agentRegistry.values())
      .filter(agent => 
        agent.capabilities.includes(capability) && 
        agent.status === 'active' && 
        agent.currentLoad < agent.maxLoad
      );
    
    if (availableAgents.length === 0) {
      throw new Error(`No available agents with capability: ${capability}`);
    }
    
    // Calculate load scores and select the best agent
    const agentScores = availableAgents.map(agent => {
      const loadScore = agent.currentLoad / agent.maxLoad;
      const performanceScore = this.agentLoadScores.get(agent.agentId) || 1.0;
      const totalScore = loadScore + (1 - performanceScore) + Math.random() * 0.1;
      
      return { agent, score: totalScore };
    });
    
    // Sort by score (lower is better)
    agentScores.sort((a, b) => a.score - b.score);
    
    const selectedAgent = agentScores[0].agent;
    console.log(`🎯 Selected agent ${selectedAgent.agentId} for capability ${capability}`);
    
    return selectedAgent;
  }

  async handleTaskWithDLQ(task, retryCount = 0) {
    try {
      const result = await this.executeWithCircuitBreaker('task_execution', async () => {
        return await this.processTask(task);
      });
      
      this.metrics.tasksProcessed++;
      return result;
      
    } catch (error) {
      this.metrics.errors++;
      
      if (retryCount < this.maxRetries && this.dlqEnabled) {
        console.log(`⚠️ Task failed, retrying (${retryCount + 1}/${this.maxRetries}): ${task.id}`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return await this.handleTaskWithDLQ(task, retryCount + 1);
      } else {
        console.error(`❌ Task failed permanently, sending to DLQ: ${task.id}`);
        await this.sendToDeadLetterQueue(task, error);
        throw error;
      }
    }
  }

  async sendToDeadLetterQueue(task, error) {
    if (!this.dlqEnabled) return;
    
    const dlqEntry = {
      task,
      error: error.message,
      errorStack: error.stack,
      failedAt: new Date().toISOString(),
      agentId: this.agentId,
      retryCount: this.maxRetries
    };
    
    await this.redis.lpush('queue:dead_letter', JSON.stringify(dlqEntry));
    console.log(`💀 Task sent to dead letter queue: ${task.id}`);
  }

  async updateAgentLoadScore(agentId, taskDuration, success) {
    const currentScore = this.agentLoadScores.get(agentId) || 1.0;
    
    // Simple performance scoring: faster = higher score, success = higher score
    const durationScore = Math.max(0.1, 1.0 - (taskDuration / 30000)); // 30s baseline
    const successScore = success ? 1.0 : 0.5;
    const newScore = (currentScore * 0.8) + ((durationScore * successScore) * 0.2);
    
    this.agentLoadScores.set(agentId, newScore);
  }

  startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Every 30 seconds
    
    console.log('📊 Metrics collection started');
  }

  async collectMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const memoryUsage = process.memoryUsage();
    
    const metricsData = {
      ...this.metrics,
      uptime,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024) // MB
      },
      connectionPoolSize: this.connectionPool.length,
      agentRegistrySize: this.agentRegistry.size,
      circuitBreakerStates: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => [
          service, breaker.state
        ])
      )
    };
    
    await this.redis.setex(
      `metrics:coordinator:${this.agentId}`,
      60, // TTL 60 seconds
      JSON.stringify(metricsData)
    );
  }

  async registerAgent() {
    const agentInfo = {
      agentId: this.agentId,
      status: 'active',
      capabilities: [],
      currentLoad: 0,
      maxLoad: 5,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: Date.now()
    };
    
    await this.redis.hset('agents:registry', this.agentId, JSON.stringify(agentInfo));
    this.agentRegistry.set(this.agentId, agentInfo);
    
    // Start heartbeat
    setInterval(async () => {
      await this.sendHeartbeat();
    }, 10000); // Every 10 seconds
  }

  async sendHeartbeat() {
    const heartbeat = {
      agentId: this.agentId,
      timestamp: Date.now(),
      status: 'active',
      metrics: this.metrics
    };
    
    await this.redis.setex(`heartbeat:${this.agentId}`, 30, JSON.stringify(heartbeat));
  }

  handleRedisError(error) {
    console.error('❌ Redis error:', error);
    this.metrics.errors++;
    this.emit('redis_error', error);
  }

  async handleIncomingTask(task) {
    this.metrics.messagesReceived++;
    console.log(`📥 Received task: ${task.id}`);
    this.emit('task_received', task);
  }

  async handleDirectMessage(message) {
    this.metrics.messagesReceived++;
    
    try {
      // Verify signature
      const isValid = await this.verifySignature(message.data, message.signature);
      if (!isValid) {
        console.warn('⚠️ Invalid message signature, ignoring');
        return;
      }
      
      // Decrypt data
      const decryptedData = await this.decryptData(message.data);
      
      console.log(`📨 Received secure message from ${message.from}: ${message.type}`);
      this.emit('direct_message', { ...message, data: decryptedData });
      
    } catch (error) {
      console.error('❌ Failed to process secure message:', error);
      this.metrics.errors++;
    }
  }

  async handleBroadcastMessage(message) {
    this.metrics.messagesReceived++;
    
    try {
      // Decrypt data
      const decryptedData = await this.decryptData(message.data);
      
      console.log(`📢 Received broadcast from ${message.from}: ${message.type}`);
      this.emit('broadcast_message', { ...message, data: decryptedData });
      
    } catch (error) {
      console.error('❌ Failed to process broadcast message:', error);
      this.metrics.errors++;
    }
  }

  updateAgentRegistry(update) {
    if (update.action === 'register' || update.action === 'update') {
      this.agentRegistry.set(update.agentId, update.agentInfo);
    } else if (update.action === 'deregister') {
      this.agentRegistry.delete(update.agentId);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down Enhanced Agent Coordinator...');
    
    // Clear intervals
    clearInterval(this.metricsInterval);
    clearInterval(this.heartbeatInterval);
    
    // Close Redis connections
    await Promise.all([
      this.redis?.quit(),
      this.pubClient?.quit(),
      this.subClient?.quit(),
      ...this.connectionPool.map(conn => conn.quit())
    ]);
    
    console.log('✅ Enhanced Agent Coordinator shutdown complete');
  }
}

module.exports = EnhancedAgentCoordinator;