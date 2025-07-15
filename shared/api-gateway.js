const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EventEmitter = require('events');

/**
 * API Gateway for External Integrations
 * Provides secure, scalable API access to EzAigents platform
 * Supports REST, GraphQL, WebSocket, and webhook integrations
 */
class APIGateway extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      port: config.port || 3001,
      jwtSecret: config.jwtSecret || crypto.randomBytes(32).toString('hex'),
      rateLimitWindow: config.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: config.rateLimitMax || 100,
      corsOrigins: config.corsOrigins || ['*'],
      webhookTimeout: config.webhookTimeout || 30000,
      enableAuth: config.enableAuth !== false,
      enableMetrics: config.enableMetrics !== false,
      ...config
    };

    this.app = express();
    this.server = null;
    this.integrations = new Map();
    this.webhooks = new Map();
    this.apiKeys = new Map();
    this.metrics = {
      requests: 0,
      errors: 0,
      latency: []
    };

    this.initializeGateway();
  }

  initializeGateway() {
    // Initialize middleware
    this.setupMiddleware();
    
    // Initialize routes
    this.setupRoutes();
    
    // Initialize WebSocket support
    this.setupWebSocket();
    
    // Initialize integrations
    this.setupIntegrations();
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindow,
      max: this.config.rateLimitMax,
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);
    
    // Request logging and metrics
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.metrics.requests++;
        this.metrics.latency.push(duration);
        
        if (this.metrics.latency.length > 1000) {
          this.metrics.latency = this.metrics.latency.slice(-1000);
        }
        
        this.emit('request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration
        });
      });
      
      next();
    });
    
    // Authentication middleware
    if (this.config.enableAuth) {
      this.app.use('/api/protected', this.authenticateRequest.bind(this));
    }
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    const router = express.Router();
    
    // Health check
    router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        metrics: this.getMetrics()
      });
    });
    
    // Authentication endpoints
    router.post('/auth/register', [
      body('email').isEmail(),
      body('password').isLength({ min: 8 }),
      body('organization').optional()
    ], this.handleRegister.bind(this));
    
    router.post('/auth/login', [
      body('email').isEmail(),
      body('password').notEmpty()
    ], this.handleLogin.bind(this));
    
    router.post('/auth/api-key', this.authenticateRequest.bind(this), this.handleCreateApiKey.bind(this));
    
    // Agent endpoints
    router.get('/agents', this.handleListAgents.bind(this));
    router.get('/agents/:agentId', this.handleGetAgent.bind(this));
    router.post('/agents/:agentId/message', [
      param('agentId').notEmpty(),
      body('message').notEmpty()
    ], this.authenticateRequest.bind(this), this.handleSendMessage.bind(this));
    
    // Task endpoints
    router.post('/tasks', [
      body('type').notEmpty(),
      body('content').notEmpty(),
      body('priority').optional().isIn(['critical', 'high', 'normal', 'low'])
    ], this.authenticateRequest.bind(this), this.handleCreateTask.bind(this));
    
    router.get('/tasks/:taskId', this.authenticateRequest.bind(this), this.handleGetTask.bind(this));
    router.get('/tasks', this.authenticateRequest.bind(this), this.handleListTasks.bind(this));
    
    // Capability endpoints
    router.get('/capabilities', this.handleListCapabilities.bind(this));
    router.get('/capabilities/match', [
      query('task').optional(),
      query('capabilities').optional()
    ], this.handleMatchCapabilities.bind(this));
    
    // Integration endpoints
    router.post('/integrations/webhook', [
      body('url').isURL(),
      body('events').isArray(),
      body('secret').optional()
    ], this.authenticateRequest.bind(this), this.handleCreateWebhook.bind(this));
    
    router.get('/integrations/webhooks', this.authenticateRequest.bind(this), this.handleListWebhooks.bind(this));
    router.delete('/integrations/webhook/:webhookId', this.authenticateRequest.bind(this), this.handleDeleteWebhook.bind(this));
    
    // Metrics endpoints
    router.get('/metrics', this.authenticateRequest.bind(this), this.handleGetMetrics.bind(this));
    router.get('/metrics/agents', this.authenticateRequest.bind(this), this.handleGetAgentMetrics.bind(this));
    
    // Mount router
    this.app.use('/api/v1', router);
    
    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Setup WebSocket support
   */
  setupWebSocket() {
    // WebSocket will be initialized when server starts
    this.wsClients = new Map();
    this.wsRooms = new Map();
  }

  /**
   * Setup integrations
   */
  setupIntegrations() {
    // Register LLM integration
    this.registerIntegration('llm', {
      name: 'Universal LLM',
      description: 'Access to multiple LLM providers',
      handler: this.handleLLMRequest.bind(this)
    });
    
    // Register MCP integration
    this.registerIntegration('mcp', {
      name: 'Model Context Protocol',
      description: 'MCP-compatible tool access',
      handler: this.handleMCPRequest.bind(this)
    });
    
    // Register task scheduling integration
    this.registerIntegration('scheduler', {
      name: 'Task Scheduler',
      description: 'Advanced task scheduling',
      handler: this.handleSchedulerRequest.bind(this)
    });
  }

  /**
   * Authentication middleware
   */
  async authenticateRequest(req, res, next) {
    try {
      // Check for API key
      const apiKey = req.headers['x-api-key'];
      if (apiKey) {
        const keyData = this.apiKeys.get(apiKey);
        if (keyData && keyData.active) {
          req.auth = keyData;
          return next();
        }
      }
      
      // Check for JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, this.config.jwtSecret);
      
      req.auth = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid authentication' });
    }
  }

  /**
   * Error handler middleware
   */
  errorHandler(err, req, res, next) {
    this.metrics.errors++;
    
    console.error('API Error:', err);
    
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    
    res.status(status).json({
      error: message,
      ...(this.config.debug ? { stack: err.stack } : {})
    });
    
    this.emit('error', {
      path: req.path,
      method: req.method,
      error: err
    });
  }

  /**
   * Route handlers
   */
  
  async handleRegister(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, organization } = req.body;
    
    // In production, this would create a user account
    const userId = crypto.randomUUID();
    const token = jwt.sign(
      { userId, email, organization },
      this.config.jwtSecret,
      { expiresIn: '24h' }
    );
    
    res.json({
      userId,
      token,
      expiresIn: 86400
    });
  }

  async handleLogin(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    // In production, this would verify credentials
    const userId = crypto.randomUUID();
    const token = jwt.sign(
      { userId, email },
      this.config.jwtSecret,
      { expiresIn: '24h' }
    );
    
    res.json({
      userId,
      token,
      expiresIn: 86400
    });
  }

  async handleCreateApiKey(req, res) {
    const { name, permissions } = req.body;
    
    const apiKey = `ezai_${crypto.randomBytes(32).toString('hex')}`;
    const keyData = {
      id: crypto.randomUUID(),
      key: apiKey,
      name,
      userId: req.auth.userId,
      permissions: permissions || ['read', 'write'],
      createdAt: Date.now(),
      active: true
    };
    
    this.apiKeys.set(apiKey, keyData);
    
    res.json({
      id: keyData.id,
      key: apiKey,
      name,
      permissions: keyData.permissions
    });
  }

  async handleListAgents(req, res) {
    // This would integrate with your agent system
    const agents = [
      {
        id: 'claude-001',
        type: 'claude',
        status: 'active',
        capabilities: ['architecture', 'refactoring', 'analysis']
      },
      {
        id: 'gpt-001',
        type: 'gpt',
        status: 'active',
        capabilities: ['implementation', 'backend', 'api']
      }
    ];
    
    res.json({ agents });
  }

  async handleGetAgent(req, res) {
    const { agentId } = req.params;
    
    // This would fetch real agent data
    const agent = {
      id: agentId,
      type: 'claude',
      status: 'active',
      capabilities: ['architecture', 'refactoring', 'analysis'],
      metrics: {
        tasksCompleted: 42,
        avgResponseTime: 3500,
        successRate: 0.95
      }
    };
    
    res.json(agent);
  }

  async handleSendMessage(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { agentId } = req.params;
    const { message, conversationId } = req.body;
    
    // This would send message through unified protocol
    const response = {
      messageId: crypto.randomUUID(),
      agentId,
      conversationId: conversationId || crypto.randomUUID(),
      response: 'Message received and processing',
      timestamp: Date.now()
    };
    
    res.json(response);
    
    // Emit event for WebSocket clients
    this.broadcastToRoom(`agent:${agentId}`, {
      type: 'message',
      data: response
    });
  }

  async handleCreateTask(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { type, content, priority, metadata } = req.body;
    
    // This would integrate with task scheduler
    const task = {
      id: crypto.randomUUID(),
      type,
      content,
      priority: priority || 'normal',
      metadata,
      status: 'queued',
      createdAt: Date.now(),
      userId: req.auth.userId
    };
    
    res.json(task);
    
    // Trigger webhooks
    this.triggerWebhooks('task.created', task);
  }

  async handleGetTask(req, res) {
    const { taskId } = req.params;
    
    // This would fetch real task data
    const task = {
      id: taskId,
      type: 'refactoring',
      content: 'Refactor authentication module',
      priority: 'high',
      status: 'processing',
      assignedAgent: 'claude-001',
      progress: 45,
      createdAt: Date.now() - 300000,
      updatedAt: Date.now() - 60000
    };
    
    res.json(task);
  }

  async handleListTasks(req, res) {
    const { status, priority, limit = 20, offset = 0 } = req.query;
    
    // This would fetch real tasks
    const tasks = [
      {
        id: 'task-001',
        type: 'implementation',
        priority: 'high',
        status: 'completed'
      },
      {
        id: 'task-002',
        type: 'analysis',
        priority: 'normal',
        status: 'processing'
      }
    ];
    
    res.json({
      tasks,
      total: 2,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  }

  async handleListCapabilities(req, res) {
    // This would integrate with capability system
    const capabilities = [
      {
        id: 'code.generation',
        name: 'Code Generation',
        category: 'coding',
        providers: ['claude-001', 'gpt-001']
      },
      {
        id: 'code.review',
        name: 'Code Review',
        category: 'coding',
        providers: ['claude-001']
      }
    ];
    
    res.json({ capabilities });
  }

  async handleMatchCapabilities(req, res) {
    const { task, capabilities } = req.query;
    
    // This would use capability matching system
    const matches = [
      {
        agentId: 'claude-001',
        matchScore: 0.95,
        capabilities: ['code.review', 'architecture']
      },
      {
        agentId: 'gpt-001',
        matchScore: 0.80,
        capabilities: ['code.generation']
      }
    ];
    
    res.json({ matches });
  }

  async handleCreateWebhook(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { url, events, secret } = req.body;
    
    const webhook = {
      id: crypto.randomUUID(),
      url,
      events,
      secret: secret || crypto.randomBytes(32).toString('hex'),
      userId: req.auth.userId,
      createdAt: Date.now(),
      active: true
    };
    
    this.webhooks.set(webhook.id, webhook);
    
    res.json({
      id: webhook.id,
      url,
      events,
      secret: webhook.secret
    });
  }

  async handleListWebhooks(req, res) {
    const userWebhooks = Array.from(this.webhooks.values())
      .filter(w => w.userId === req.auth.userId)
      .map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        createdAt: w.createdAt
      }));
    
    res.json({ webhooks: userWebhooks });
  }

  async handleDeleteWebhook(req, res) {
    const { webhookId } = req.params;
    const webhook = this.webhooks.get(webhookId);
    
    if (!webhook || webhook.userId !== req.auth.userId) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    this.webhooks.delete(webhookId);
    res.json({ success: true });
  }

  async handleGetMetrics(req, res) {
    const metrics = this.getMetrics();
    res.json(metrics);
  }

  async handleGetAgentMetrics(req, res) {
    // This would fetch real agent metrics
    const metrics = {
      agents: [
        {
          id: 'claude-001',
          utilization: 0.65,
          tasksCompleted: 156,
          avgResponseTime: 3200,
          errorRate: 0.02
        },
        {
          id: 'gpt-001',
          utilization: 0.80,
          tasksCompleted: 243,
          avgResponseTime: 2800,
          errorRate: 0.03
        }
      ],
      summary: {
        totalTasks: 399,
        avgUtilization: 0.725,
        systemHealth: 'good'
      }
    };
    
    res.json(metrics);
  }

  /**
   * Integration handlers
   */
  
  async handleLLMRequest(req, res) {
    const { provider, model, messages, stream } = req.body;
    
    // This would integrate with UniversalLLMAdapter
    const response = {
      id: crypto.randomUUID(),
      provider,
      model,
      choices: [{
        message: {
          role: 'assistant',
          content: 'This is a response from the LLM integration'
        }
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25
      }
    };
    
    res.json(response);
  }

  async handleMCPRequest(req, res) {
    const { method, params } = req.body;
    
    // This would integrate with MCPIntegrationLayer
    const response = {
      id: crypto.randomUUID(),
      method,
      result: {
        status: 'success',
        data: 'MCP request processed'
      }
    };
    
    res.json(response);
  }

  async handleSchedulerRequest(req, res) {
    const { action, task } = req.body;
    
    // This would integrate with AdvancedTaskScheduler
    const response = {
      id: crypto.randomUUID(),
      action,
      result: {
        taskId: task?.id || crypto.randomUUID(),
        status: 'scheduled',
        assignedAgent: 'claude-001',
        predictedCompletionTime: 5000
      }
    };
    
    res.json(response);
  }

  /**
   * WebSocket handling
   */
  
  setupWebSocketServer(server) {
    const WebSocket = require('ws');
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = crypto.randomUUID();
      const client = {
        id: clientId,
        ws,
        authenticated: false,
        rooms: new Set()
      };
      
      this.wsClients.set(clientId, client);
      
      ws.on('message', (data) => this.handleWebSocketMessage(clientId, data));
      ws.on('close', () => this.handleWebSocketClose(clientId));
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId,
        requiresAuth: this.config.enableAuth
      }));
    });
  }

  handleWebSocketMessage(clientId, data) {
    const client = this.wsClients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'auth':
          this.handleWebSocketAuth(client, message);
          break;
        
        case 'subscribe':
          this.handleWebSocketSubscribe(client, message);
          break;
        
        case 'unsubscribe':
          this.handleWebSocketUnsubscribe(client, message);
          break;
        
        case 'message':
          this.handleWebSocketClientMessage(client, message);
          break;
      }
    } catch (error) {
      client.ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format'
      }));
    }
  }

  handleWebSocketAuth(client, message) {
    try {
      const decoded = jwt.verify(message.token, this.config.jwtSecret);
      client.authenticated = true;
      client.userId = decoded.userId;
      
      client.ws.send(JSON.stringify({
        type: 'auth_success',
        userId: decoded.userId
      }));
    } catch (error) {
      client.ws.send(JSON.stringify({
        type: 'auth_error',
        error: 'Invalid token'
      }));
    }
  }

  handleWebSocketSubscribe(client, message) {
    if (this.config.enableAuth && !client.authenticated) {
      return client.ws.send(JSON.stringify({
        type: 'error',
        error: 'Authentication required'
      }));
    }
    
    const { room } = message;
    client.rooms.add(room);
    
    if (!this.wsRooms.has(room)) {
      this.wsRooms.set(room, new Set());
    }
    this.wsRooms.get(room).add(client.id);
    
    client.ws.send(JSON.stringify({
      type: 'subscribed',
      room
    }));
  }

  handleWebSocketUnsubscribe(client, message) {
    const { room } = message;
    client.rooms.delete(room);
    
    const roomClients = this.wsRooms.get(room);
    if (roomClients) {
      roomClients.delete(client.id);
      if (roomClients.size === 0) {
        this.wsRooms.delete(room);
      }
    }
    
    client.ws.send(JSON.stringify({
      type: 'unsubscribed',
      room
    }));
  }

  handleWebSocketClientMessage(client, message) {
    if (this.config.enableAuth && !client.authenticated) {
      return client.ws.send(JSON.stringify({
        type: 'error',
        error: 'Authentication required'
      }));
    }
    
    // Broadcast to room if specified
    if (message.room) {
      this.broadcastToRoom(message.room, {
        type: 'room_message',
        from: client.id,
        data: message.data
      });
    }
  }

  handleWebSocketClose(clientId) {
    const client = this.wsClients.get(clientId);
    if (!client) return;
    
    // Remove from all rooms
    for (const room of client.rooms) {
      const roomClients = this.wsRooms.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.wsRooms.delete(room);
        }
      }
    }
    
    this.wsClients.delete(clientId);
  }

  broadcastToRoom(room, message) {
    const roomClients = this.wsRooms.get(room);
    if (!roomClients) return;
    
    const messageStr = JSON.stringify(message);
    
    for (const clientId of roomClients) {
      const client = this.wsClients.get(clientId);
      if (client && client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(messageStr);
      }
    }
  }

  /**
   * Webhook handling
   */
  
  async triggerWebhooks(event, data) {
    const webhooks = Array.from(this.webhooks.values())
      .filter(w => w.active && w.events.includes(event));
    
    for (const webhook of webhooks) {
      this.sendWebhook(webhook, event, data).catch(error => {
        console.error(`Webhook ${webhook.id} failed:`, error);
      });
    }
  }

  async sendWebhook(webhook, event, data) {
    const payload = {
      id: crypto.randomUUID(),
      event,
      data,
      timestamp: Date.now()
    };
    
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EzAigents-Signature': signature,
        'X-EzAigents-Event': event
      },
      body: JSON.stringify(payload),
      timeout: this.config.webhookTimeout
    });
    
    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  }

  /**
   * Register custom integration
   */
  registerIntegration(id, config) {
    this.integrations.set(id, {
      id,
      ...config,
      registeredAt: Date.now()
    });
    
    // Add route for integration
    this.app.post(`/api/v1/integration/${id}`, 
      this.authenticateRequest.bind(this),
      async (req, res) => {
        try {
          const result = await config.handler(req, res);
          if (!res.headersSent) {
            res.json(result);
          }
        } catch (error) {
          this.errorHandler(error, req, res);
        }
      }
    );
    
    console.log(`API Gateway: Registered integration ${id}`);
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((sum, l) => sum + l, 0) / this.metrics.latency.length
      : 0;
    
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0,
      avgLatency,
      p95Latency: this.calculatePercentile(this.metrics.latency, 0.95),
      p99Latency: this.calculatePercentile(this.metrics.latency, 0.99),
      uptime: process.uptime()
    };
  }

  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }

  /**
   * Start server
   */
  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`API Gateway listening on port ${this.config.port}`);
        
        // Setup WebSocket server
        this.setupWebSocketServer(this.server);
        
        this.emit('started', { port: this.config.port });
        resolve();
      });
    });
  }

  /**
   * Stop server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.wss) {
        // Close all WebSocket connections
        for (const client of this.wsClients.values()) {
          client.ws.close();
        }
        this.wss.close();
      }
      
      if (this.server) {
        this.server.close(() => {
          console.log('API Gateway stopped');
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = APIGateway;