const EventEmitter = require('events');
const WebSocket = require('ws');
const crypto = require('crypto');

/**
 * Model Context Protocol (MCP) Integration Layer
 * Implements the MCP specification for seamless integration with
 * Claude Desktop, VS Code, and other MCP-compatible applications
 */
class MCPIntegrationLayer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      serverPort: config.serverPort || 3333,
      clientMode: config.clientMode || false,
      serverUrl: config.serverUrl || 'ws://localhost:3333',
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        sampling: true,
        logging: true,
        ...config.capabilities
      },
      ...config
    };

    this.servers = new Map();
    this.clients = new Map();
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.activeSessions = new Map();
    
    this.initializeMCP();
  }

  initializeMCP() {
    // Initialize protocol handlers
    this.protocolHandlers = {
      'initialize': this.handleInitialize.bind(this),
      'initialized': this.handleInitialized.bind(this),
      'tools/list': this.handleToolsList.bind(this),
      'tools/call': this.handleToolCall.bind(this),
      'resources/list': this.handleResourcesList.bind(this),
      'resources/read': this.handleResourceRead.bind(this),
      'resources/subscribe': this.handleResourceSubscribe.bind(this),
      'prompts/list': this.handlePromptsList.bind(this),
      'prompts/get': this.handlePromptGet.bind(this),
      'sampling/createMessage': this.handleSamplingCreate.bind(this),
      'logging/setLevel': this.handleLoggingSetLevel.bind(this),
      'shutdown': this.handleShutdown.bind(this)
    };

    // Initialize built-in tools
    this.registerBuiltInTools();
    
    // Initialize built-in resources
    this.registerBuiltInResources();
    
    // Initialize built-in prompts
    this.registerBuiltInPrompts();
  }

  /**
   * Start MCP server
   */
  async startServer() {
    if (this.config.clientMode) {
      throw new Error('Cannot start server in client mode');
    }

    this.wss = new WebSocket.Server({ 
      port: this.config.serverPort,
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      const sessionId = crypto.randomUUID();
      const session = {
        id: sessionId,
        ws,
        clientInfo: null,
        capabilities: {},
        subscriptions: new Set(),
        initialized: false
      };

      this.activeSessions.set(sessionId, session);
      
      ws.on('message', (data) => this.handleMessage(sessionId, data));
      ws.on('close', () => this.handleDisconnect(sessionId));
      ws.on('error', (error) => this.handleError(sessionId, error));
      
      console.log(`MCP client connected: ${sessionId}`);
      this.emit('clientConnected', { sessionId });
    });

    console.log(`MCP server listening on port ${this.config.serverPort}`);
    this.emit('serverStarted', { port: this.config.serverPort });
  }

  /**
   * Connect as MCP client
   */
  async connectClient(serverUrl = this.config.serverUrl) {
    const ws = new WebSocket(serverUrl);
    const clientId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      ws.on('open', async () => {
        const client = {
          id: clientId,
          ws,
          serverUrl,
          serverInfo: null,
          capabilities: {}
        };
        
        this.clients.set(clientId, client);
        
        ws.on('message', (data) => this.handleClientMessage(clientId, data));
        ws.on('close', () => this.handleClientDisconnect(clientId));
        ws.on('error', (error) => this.handleClientError(clientId, error));
        
        // Send initialization
        await this.sendInitialization(clientId);
        
        console.log(`Connected to MCP server: ${serverUrl}`);
        this.emit('connectedToServer', { clientId, serverUrl });
        
        resolve(clientId);
      });
      
      ws.on('error', reject);
    });
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(sessionId, data) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      const message = JSON.parse(data.toString());
      console.log(`MCP message from ${sessionId}:`, message.method || message.id);
      
      if (message.method) {
        // Handle request
        await this.handleRequest(sessionId, message);
      } else if (message.id !== undefined) {
        // Handle response
        this.handleResponse(sessionId, message);
      } else if (message.method === undefined && message.params) {
        // Handle notification
        this.handleNotification(sessionId, message);
      }
    } catch (error) {
      console.error('Error handling MCP message:', error);
      this.sendError(sessionId, null, -32700, 'Parse error');
    }
  }

  /**
   * Handle MCP request
   */
  async handleRequest(sessionId, request) {
    const { id, method, params } = request;
    const handler = this.protocolHandlers[method];
    
    if (!handler) {
      this.sendError(sessionId, id, -32601, `Method not found: ${method}`);
      return;
    }

    try {
      const result = await handler(sessionId, params);
      this.sendResponse(sessionId, id, result);
    } catch (error) {
      console.error(`Error handling ${method}:`, error);
      this.sendError(sessionId, id, -32603, error.message);
    }
  }

  /**
   * Protocol Handlers
   */
  
  async handleInitialize(sessionId, params) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.clientInfo = params.clientInfo;
    session.capabilities = params.capabilities || {};
    
    const serverCapabilities = {};
    
    if (this.config.capabilities.tools) {
      serverCapabilities.tools = {};
    }
    
    if (this.config.capabilities.resources) {
      serverCapabilities.resources = {
        subscribe: true,
        listChanged: true
      };
    }
    
    if (this.config.capabilities.prompts) {
      serverCapabilities.prompts = {
        listChanged: true
      };
    }
    
    if (this.config.capabilities.sampling) {
      serverCapabilities.sampling = {};
    }
    
    if (this.config.capabilities.logging) {
      serverCapabilities.logging = {};
    }
    
    return {
      protocolVersion: '2024-11-05',
      capabilities: serverCapabilities,
      serverInfo: {
        name: 'EzAigents MCP Server',
        version: '1.0.0'
      }
    };
  }

  async handleInitialized(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    
    session.initialized = true;
    console.log(`MCP session initialized: ${sessionId}`);
    this.emit('sessionInitialized', { sessionId });
  }

  async handleToolsList(sessionId) {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
    
    return { tools };
  }

  async handleToolCall(sessionId, params) {
    const { name, arguments: args } = params;
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    
    try {
      const result = await tool.handler(args, { sessionId });
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result)
          }
        ],
        isError: false
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async handleResourcesList(sessionId) {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));
    
    return { resources };
  }

  async handleResourceRead(sessionId, params) {
    const { uri } = params;
    const resource = this.resources.get(uri);
    
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    const contents = await resource.handler({ sessionId });
    
    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: typeof contents === 'string' ? contents : JSON.stringify(contents)
        }
      ]
    };
  }

  async handleResourceSubscribe(sessionId, params) {
    const { uri } = params;
    const session = this.activeSessions.get(sessionId);
    
    if (!session) throw new Error('Session not found');
    
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    session.subscriptions.add(uri);
    
    // Set up resource monitoring
    if (resource.monitor) {
      resource.monitor(uri, (update) => {
        this.sendResourceUpdate(sessionId, uri, update);
      });
    }
    
    return {};
  }

  async handlePromptsList(sessionId) {
    const prompts = Array.from(this.prompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments
    }));
    
    return { prompts };
  }

  async handlePromptGet(sessionId, params) {
    const { name, arguments: args } = params;
    const prompt = this.prompts.get(name);
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    
    const messages = await prompt.handler(args, { sessionId });
    
    return {
      description: prompt.description,
      messages
    };
  }

  async handleSamplingCreate(sessionId, params) {
    const { messages, modelPreferences } = params;
    
    // This would integrate with your LLM adapter
    const response = await this.createSamplingResponse(messages, modelPreferences);
    
    return {
      role: 'assistant',
      content: {
        type: 'text',
        text: response
      }
    };
  }

  async handleLoggingSetLevel(sessionId, params) {
    const { level } = params;
    
    // Set logging level
    this.config.loggingLevel = level;
    console.log(`Logging level set to: ${level}`);
    
    return {};
  }

  async handleShutdown(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.ws.close();
      this.activeSessions.delete(sessionId);
    }
    
    return {};
  }

  /**
   * Register a tool
   */
  registerTool(name, config) {
    const tool = {
      name,
      description: config.description,
      inputSchema: config.inputSchema || {
        type: 'object',
        properties: {},
        required: []
      },
      handler: config.handler
    };
    
    this.tools.set(name, tool);
    
    // Notify connected clients
    this.notifyToolsChanged();
    
    console.log(`Registered MCP tool: ${name}`);
    this.emit('toolRegistered', { name });
  }

  /**
   * Register a resource
   */
  registerResource(uri, config) {
    const resource = {
      uri,
      name: config.name || uri,
      description: config.description,
      mimeType: config.mimeType || 'text/plain',
      handler: config.handler,
      monitor: config.monitor
    };
    
    this.resources.set(uri, resource);
    
    // Notify connected clients
    this.notifyResourcesChanged();
    
    console.log(`Registered MCP resource: ${uri}`);
    this.emit('resourceRegistered', { uri });
  }

  /**
   * Register a prompt
   */
  registerPrompt(name, config) {
    const prompt = {
      name,
      description: config.description,
      arguments: config.arguments || [],
      handler: config.handler
    };
    
    this.prompts.set(name, prompt);
    
    // Notify connected clients
    this.notifyPromptsChanged();
    
    console.log(`Registered MCP prompt: ${name}`);
    this.emit('promptRegistered', { name });
  }

  /**
   * Register built-in tools
   */
  registerBuiltInTools() {
    // File system tool
    this.registerTool('read_file', {
      description: 'Read a file from the file system',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' }
        },
        required: ['path']
      },
      handler: async ({ path }) => {
        const fs = require('fs').promises;
        return await fs.readFile(path, 'utf8');
      }
    });

    // Agent communication tool
    this.registerTool('send_to_agent', {
      description: 'Send a message to another agent',
      inputSchema: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Target agent ID' },
          message: { type: 'string', description: 'Message to send' }
        },
        required: ['agentId', 'message']
      },
      handler: async ({ agentId, message }) => {
        // This would integrate with your agent coordinator
        return `Message sent to ${agentId}`;
      }
    });

    // Task scheduling tool
    this.registerTool('schedule_task', {
      description: 'Schedule a task for processing',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'object', description: 'Task details' },
          priority: { type: 'string', enum: ['critical', 'high', 'normal', 'low'] }
        },
        required: ['task']
      },
      handler: async ({ task, priority }) => {
        // This would integrate with your task scheduler
        return `Task scheduled with priority: ${priority || 'normal'}`;
      }
    });
  }

  /**
   * Register built-in resources
   */
  registerBuiltInResources() {
    // Agent status resource
    this.registerResource('agents://status', {
      name: 'Agent Status',
      description: 'Current status of all agents',
      mimeType: 'application/json',
      handler: async () => {
        // This would fetch real agent status
        return {
          agents: [
            { id: 'claude-001', status: 'active', load: 0.3 },
            { id: 'gpt-001', status: 'active', load: 0.7 }
          ]
        };
      },
      monitor: (uri, callback) => {
        // Set up monitoring
        setInterval(() => {
          callback({ agents: [] }); // Updated status
        }, 30000);
      }
    });

    // Queue status resource
    this.registerResource('queues://status', {
      name: 'Queue Status',
      description: 'Current queue statistics',
      mimeType: 'application/json',
      handler: async () => {
        return {
          queues: {
            high: 5,
            normal: 23,
            low: 8
          }
        };
      }
    });
  }

  /**
   * Register built-in prompts
   */
  registerBuiltInPrompts() {
    // Code review prompt
    this.registerPrompt('code_review', {
      description: 'Generate a code review prompt',
      arguments: [
        {
          name: 'code',
          description: 'Code to review',
          required: true
        },
        {
          name: 'language',
          description: 'Programming language',
          required: false
        }
      ],
      handler: async ({ code, language }) => {
        return [
          {
            role: 'system',
            content: `You are an expert code reviewer. Review the following ${language || ''} code for best practices, potential bugs, and improvements.`
          },
          {
            role: 'user',
            content: code
          }
        ];
      }
    });

    // Task planning prompt
    this.registerPrompt('task_planning', {
      description: 'Generate a task planning prompt',
      arguments: [
        {
          name: 'goal',
          description: 'Goal to achieve',
          required: true
        },
        {
          name: 'constraints',
          description: 'Constraints or requirements',
          required: false
        }
      ],
      handler: async ({ goal, constraints }) => {
        return [
          {
            role: 'system',
            content: 'You are an expert project planner. Create a detailed task breakdown.'
          },
          {
            role: 'user',
            content: `Goal: ${goal}\n${constraints ? `Constraints: ${constraints}` : ''}`
          }
        ];
      }
    });
  }

  /**
   * Send response to client
   */
  sendResponse(sessionId, id, result) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    
    session.ws.send(JSON.stringify(response));
  }

  /**
   * Send error to client
   */
  sendError(sessionId, id, code, message, data = null) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    const error = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
    
    session.ws.send(JSON.stringify(error));
  }

  /**
   * Send notification to client
   */
  sendNotification(sessionId, method, params) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };
    
    session.ws.send(JSON.stringify(notification));
  }

  /**
   * Notify all clients of tools change
   */
  notifyToolsChanged() {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.initialized && session.capabilities.tools) {
        this.sendNotification(sessionId, 'notifications/tools/list_changed', {});
      }
    }
  }

  /**
   * Notify all clients of resources change
   */
  notifyResourcesChanged() {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.initialized && session.capabilities.resources) {
        this.sendNotification(sessionId, 'notifications/resources/list_changed', {});
      }
    }
  }

  /**
   * Notify all clients of prompts change
   */
  notifyPromptsChanged() {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.initialized && session.capabilities.prompts) {
        this.sendNotification(sessionId, 'notifications/prompts/list_changed', {});
      }
    }
  }

  /**
   * Send resource update to subscribed clients
   */
  sendResourceUpdate(sessionId, uri, update) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.subscriptions.has(uri)) return;
    
    this.sendNotification(sessionId, 'notifications/resources/updated', {
      uri,
      updates: update
    });
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    this.activeSessions.delete(sessionId);
    console.log(`MCP client disconnected: ${sessionId}`);
    this.emit('clientDisconnected', { sessionId });
  }

  /**
   * Handle client error
   */
  handleError(sessionId, error) {
    console.error(`MCP session error ${sessionId}:`, error);
    this.emit('sessionError', { sessionId, error });
  }

  /**
   * Create sampling response (integrate with LLM)
   */
  async createSamplingResponse(messages, modelPreferences) {
    // This would integrate with your UniversalLLMAdapter
    // For now, return a placeholder
    return 'This is a sampling response from the MCP server.';
  }

  /**
   * Client mode: Send initialization
   */
  async sendInitialization(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: this.config.capabilities,
        clientInfo: {
          name: 'EzAigents MCP Client',
          version: '1.0.0'
        }
      }
    };
    
    client.ws.send(JSON.stringify(request));
  }

  /**
   * Client mode: Handle server message
   */
  handleClientMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data.toString());
      
      if (message.result && message.id === 1) {
        // Handle initialization response
        client.serverInfo = message.result.serverInfo;
        client.capabilities = message.result.capabilities;
        
        // Send initialized notification
        const initialized = {
          jsonrpc: '2.0',
          method: 'notifications/initialized'
        };
        client.ws.send(JSON.stringify(initialized));
        
        this.emit('serverInitialized', { clientId, serverInfo: client.serverInfo });
      }
      
      // Handle other messages...
      
    } catch (error) {
      console.error('Error handling server message:', error);
    }
  }

  /**
   * Client mode: Call server tool
   */
  async callServerTool(clientId, toolName, args) {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found');
    
    const requestId = crypto.randomInt(1000, 9999);
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };
    
    return new Promise((resolve, reject) => {
      // Set up response handler
      const responseHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.id === requestId) {
            client.ws.off('message', responseHandler);
            
            if (message.error) {
              reject(new Error(message.error.message));
            } else {
              resolve(message.result);
            }
          }
        } catch (error) {
          // Ignore parse errors
        }
      };
      
      client.ws.on('message', responseHandler);
      client.ws.send(JSON.stringify(request));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        client.ws.off('message', responseHandler);
        reject(new Error('Tool call timeout'));
      }, 30000);
    });
  }

  /**
   * Client mode: Handle disconnect
   */
  handleClientDisconnect(clientId) {
    this.clients.delete(clientId);
    console.log(`Disconnected from MCP server: ${clientId}`);
    this.emit('disconnectedFromServer', { clientId });
  }

  /**
   * Client mode: Handle error
   */
  handleClientError(clientId, error) {
    console.error(`MCP client error ${clientId}:`, error);
    this.emit('clientError', { clientId, error });
  }

  /**
   * Stop MCP server
   */
  async stopServer() {
    if (this.wss) {
      // Close all connections
      for (const [sessionId, session] of this.activeSessions) {
        session.ws.close();
      }
      
      this.activeSessions.clear();
      
      // Close server
      await new Promise((resolve) => {
        this.wss.close(resolve);
      });
      
      console.log('MCP server stopped');
      this.emit('serverStopped');
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnectClients() {
    for (const [clientId, client] of this.clients) {
      client.ws.close();
    }
    
    this.clients.clear();
  }

  /**
   * Get server statistics
   */
  getServerStats() {
    return {
      activeSessions: this.activeSessions.size,
      registeredTools: this.tools.size,
      registeredResources: this.resources.size,
      registeredPrompts: this.prompts.size,
      clients: Array.from(this.activeSessions.values()).map(session => ({
        id: session.id,
        clientInfo: session.clientInfo,
        initialized: session.initialized,
        subscriptions: session.subscriptions.size
      }))
    };
  }

  /**
   * Get client statistics
   */
  getClientStats() {
    return {
      connectedServers: this.clients.size,
      servers: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        serverUrl: client.serverUrl,
        serverInfo: client.serverInfo,
        capabilities: client.capabilities
      }))
    };
  }
}

module.exports = MCPIntegrationLayer;