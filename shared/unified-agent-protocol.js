const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Unified Agent Communication Protocol
 * Provides a standardized way for agents from different platforms
 * and LLM providers to communicate and collaborate
 */
class UnifiedAgentProtocol extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      protocolVersion: '1.0.0',
      messageTimeout: config.messageTimeout || 60000,
      maxMessageSize: config.maxMessageSize || 1048576, // 1MB
      encryptionEnabled: config.encryptionEnabled || false,
      compressionEnabled: config.compressionEnabled || true,
      ...config
    };

    this.agents = new Map();
    this.messageQueue = new Map();
    this.conversations = new Map();
    this.capabilities = new Map();
    this.messageHandlers = new Map();
    this.protocolAdapters = new Map();
    
    this.initializeProtocol();
  }

  initializeProtocol() {
    // Standard message types
    this.messageTypes = {
      // Core communication
      HELLO: 'hello',
      GOODBYE: 'goodbye',
      PING: 'ping',
      PONG: 'pong',
      
      // Agent discovery
      DISCOVER: 'discover',
      ANNOUNCE: 'announce',
      CAPABILITIES: 'capabilities',
      
      // Task coordination
      TASK_REQUEST: 'task_request',
      TASK_ACCEPT: 'task_accept',
      TASK_REJECT: 'task_reject',
      TASK_STATUS: 'task_status',
      TASK_RESULT: 'task_result',
      
      // Collaboration
      COLLABORATE: 'collaborate',
      DELEGATE: 'delegate',
      ASSIST: 'assist',
      REVIEW: 'review',
      
      // Context sharing
      CONTEXT_SHARE: 'context_share',
      CONTEXT_REQUEST: 'context_request',
      CONTEXT_UPDATE: 'context_update',
      
      // State management
      STATE_SYNC: 'state_sync',
      STATE_UPDATE: 'state_update',
      STATE_QUERY: 'state_query',
      
      // Error handling
      ERROR: 'error',
      RETRY: 'retry',
      FALLBACK: 'fallback'
    };

    // Initialize standard message handlers
    this.initializeMessageHandlers();
    
    // Initialize protocol adapters for different platforms
    this.initializeProtocolAdapters();
  }

  /**
   * Register an agent with the protocol
   */
  async registerAgent(agentId, config) {
    const agent = {
      id: agentId,
      type: config.type,
      provider: config.provider,
      capabilities: config.capabilities || [],
      metadata: config.metadata || {},
      status: 'active',
      lastSeen: Date.now(),
      communicationPreferences: {
        preferredProtocol: config.preferredProtocol || 'uap',
        supportedProtocols: config.supportedProtocols || ['uap'],
        messageFormat: config.messageFormat || 'json',
        encryptionRequired: config.encryptionRequired || false
      }
    };

    this.agents.set(agentId, agent);
    
    // Register capabilities
    agent.capabilities.forEach(capability => {
      if (!this.capabilities.has(capability)) {
        this.capabilities.set(capability, new Set());
      }
      this.capabilities.get(capability).add(agentId);
    });

    // Send announcement to other agents
    await this.broadcastMessage({
      type: this.messageTypes.ANNOUNCE,
      from: agentId,
      data: {
        agent: {
          id: agentId,
          type: agent.type,
          capabilities: agent.capabilities
        }
      }
    });

    console.log(`UAP: Registered agent ${agentId} (${agent.type})`);
    this.emit('agentRegistered', { agentId, agent });
    
    return agent;
  }

  /**
   * Send a message between agents
   */
  async sendMessage(message) {
    const {
      from,
      to,
      type,
      data,
      conversationId = crypto.randomUUID(),
      priority = 'normal',
      requiresResponse = false,
      timeout = this.config.messageTimeout
    } = message;

    // Validate agents
    const fromAgent = this.agents.get(from);
    const toAgent = this.agents.get(to);
    
    if (!fromAgent) throw new Error(`Sender agent not found: ${from}`);
    if (!toAgent) throw new Error(`Recipient agent not found: ${to}`);

    // Create standardized message
    const standardMessage = {
      id: crypto.randomUUID(),
      version: this.config.protocolVersion,
      timestamp: Date.now(),
      conversationId,
      from,
      to,
      type,
      priority,
      requiresResponse,
      data,
      metadata: {
        fromType: fromAgent.type,
        toType: toAgent.type,
        fromProvider: fromAgent.provider,
        toProvider: toAgent.provider
      }
    };

    // Apply protocol transformations
    const transformedMessage = await this.transformMessage(standardMessage, fromAgent, toAgent);
    
    // Route message through appropriate channel
    const result = await this.routeMessage(transformedMessage);
    
    // Track conversation
    this.trackConversation(conversationId, standardMessage);
    
    // Handle response if required
    if (requiresResponse) {
      return this.waitForResponse(standardMessage.id, timeout);
    }
    
    return result;
  }

  /**
   * Transform message based on agent protocols
   */
  async transformMessage(message, fromAgent, toAgent) {
    let transformed = { ...message };
    
    // Apply sender transformations
    if (fromAgent.communicationPreferences.preferredProtocol !== 'uap') {
      const adapter = this.protocolAdapters.get(fromAgent.communicationPreferences.preferredProtocol);
      if (adapter) {
        transformed = await adapter.transformOutgoing(transformed, fromAgent);
      }
    }
    
    // Apply recipient transformations
    if (toAgent.communicationPreferences.preferredProtocol !== 'uap') {
      const adapter = this.protocolAdapters.get(toAgent.communicationPreferences.preferredProtocol);
      if (adapter) {
        transformed = await adapter.transformIncoming(transformed, toAgent);
      }
    }
    
    // Apply compression if enabled
    if (this.config.compressionEnabled && transformed.data) {
      transformed.data = await this.compressData(transformed.data);
      transformed.compressed = true;
    }
    
    // Apply encryption if required
    if (fromAgent.communicationPreferences.encryptionRequired || 
        toAgent.communicationPreferences.encryptionRequired ||
        this.config.encryptionEnabled) {
      transformed = await this.encryptMessage(transformed);
      transformed.encrypted = true;
    }
    
    return transformed;
  }

  /**
   * Route message to appropriate handler
   */
  async routeMessage(message) {
    const toAgent = this.agents.get(message.to);
    if (!toAgent) throw new Error(`Recipient agent not found: ${message.to}`);
    
    // Check if agent has custom handler
    const customHandler = this.messageHandlers.get(`${message.to}:${message.type}`);
    if (customHandler) {
      return customHandler(message);
    }
    
    // Use default handler for message type
    const defaultHandler = this.messageHandlers.get(message.type);
    if (defaultHandler) {
      return defaultHandler(message);
    }
    
    // Queue message for agent
    this.queueMessage(message);
    
    // Emit event for external handling
    this.emit('messageRouted', message);
    
    return { status: 'queued', messageId: message.id };
  }

  /**
   * Initialize standard message handlers
   */
  initializeMessageHandlers() {
    // Hello/Goodbye handlers
    this.setMessageHandler(this.messageTypes.HELLO, async (message) => {
      const agent = this.agents.get(message.from);
      if (agent) {
        agent.lastSeen = Date.now();
        agent.status = 'active';
      }
      return { status: 'acknowledged' };
    });

    this.setMessageHandler(this.messageTypes.GOODBYE, async (message) => {
      const agent = this.agents.get(message.from);
      if (agent) {
        agent.status = 'offline';
      }
      return { status: 'acknowledged' };
    });

    // Ping/Pong handlers
    this.setMessageHandler(this.messageTypes.PING, async (message) => {
      return {
        type: this.messageTypes.PONG,
        timestamp: Date.now()
      };
    });

    // Discovery handlers
    this.setMessageHandler(this.messageTypes.DISCOVER, async (message) => {
      const { capability, type, provider } = message.data;
      
      let matchingAgents = Array.from(this.agents.values());
      
      if (capability) {
        const agentIds = this.capabilities.get(capability) || new Set();
        matchingAgents = matchingAgents.filter(a => agentIds.has(a.id));
      }
      
      if (type) {
        matchingAgents = matchingAgents.filter(a => a.type === type);
      }
      
      if (provider) {
        matchingAgents = matchingAgents.filter(a => a.provider === provider);
      }
      
      return {
        agents: matchingAgents.map(a => ({
          id: a.id,
          type: a.type,
          provider: a.provider,
          capabilities: a.capabilities,
          status: a.status
        }))
      };
    });

    // Task coordination handlers
    this.setMessageHandler(this.messageTypes.TASK_REQUEST, async (message) => {
      this.emit('taskRequested', message);
      return { status: 'received', messageId: message.id };
    });

    this.setMessageHandler(this.messageTypes.TASK_STATUS, async (message) => {
      this.emit('taskStatusUpdate', message);
      return { status: 'acknowledged' };
    });

    // Context sharing handlers
    this.setMessageHandler(this.messageTypes.CONTEXT_SHARE, async (message) => {
      this.emit('contextShared', message);
      return { status: 'received' };
    });
  }

  /**
   * Set custom message handler
   */
  setMessageHandler(type, handler, agentId = null) {
    const key = agentId ? `${agentId}:${type}` : type;
    this.messageHandlers.set(key, handler);
  }

  /**
   * Initialize protocol adapters
   */
  initializeProtocolAdapters() {
    // OpenAI Function Calling adapter
    this.protocolAdapters.set('openai-functions', {
      transformOutgoing: async (message, agent) => {
        if (message.type === this.messageTypes.TASK_REQUEST) {
          return {
            ...message,
            openai_function: {
              name: 'process_task',
              parameters: message.data
            }
          };
        }
        return message;
      },
      transformIncoming: async (message, agent) => {
        if (message.openai_function) {
          return {
            ...message,
            type: this.messageTypes.TASK_REQUEST,
            data: message.openai_function.parameters
          };
        }
        return message;
      }
    });

    // Anthropic XML adapter
    this.protocolAdapters.set('anthropic-xml', {
      transformOutgoing: async (message, agent) => {
        if (message.data && typeof message.data === 'object') {
          return {
            ...message,
            data_xml: this.objectToXML(message.data)
          };
        }
        return message;
      },
      transformIncoming: async (message, agent) => {
        if (message.data_xml) {
          return {
            ...message,
            data: this.xmlToObject(message.data_xml)
          };
        }
        return message;
      }
    });

    // LangChain adapter
    this.protocolAdapters.set('langchain', {
      transformOutgoing: async (message, agent) => {
        return {
          ...message,
          langchain_message: {
            content: JSON.stringify(message.data),
            type: message.type,
            additional_kwargs: {
              conversationId: message.conversationId,
              priority: message.priority
            }
          }
        };
      },
      transformIncoming: async (message, agent) => {
        if (message.langchain_message) {
          return {
            ...message,
            data: JSON.parse(message.langchain_message.content),
            type: message.langchain_message.type
          };
        }
        return message;
      }
    });
  }

  /**
   * Discover agents by capability
   */
  async discoverAgents(criteria = {}) {
    const { capability, type, provider, status = 'active' } = criteria;
    
    let matchingAgents = Array.from(this.agents.values());
    
    if (capability) {
      const agentIds = this.capabilities.get(capability) || new Set();
      matchingAgents = matchingAgents.filter(a => agentIds.has(a.id));
    }
    
    if (type) {
      matchingAgents = matchingAgents.filter(a => a.type === type);
    }
    
    if (provider) {
      matchingAgents = matchingAgents.filter(a => a.provider === provider);
    }
    
    if (status) {
      matchingAgents = matchingAgents.filter(a => a.status === status);
    }
    
    return matchingAgents;
  }

  /**
   * Create a conversation between multiple agents
   */
  async createConversation(config) {
    const {
      participants,
      topic,
      objective,
      maxTurns = 10,
      turnTimeout = 30000
    } = config;

    const conversationId = crypto.randomUUID();
    const conversation = {
      id: conversationId,
      participants: new Set(participants),
      topic,
      objective,
      maxTurns,
      turnTimeout,
      turns: [],
      status: 'active',
      createdAt: Date.now()
    };

    this.conversations.set(conversationId, conversation);

    // Notify participants
    for (const participantId of participants) {
      await this.sendMessage({
        from: 'system',
        to: participantId,
        type: 'conversation_invite',
        conversationId,
        data: {
          topic,
          objective,
          participants: Array.from(participants)
        }
      });
    }

    this.emit('conversationCreated', conversation);
    
    return conversation;
  }

  /**
   * Add a turn to conversation
   */
  async addConversationTurn(conversationId, agentId, content) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);
    
    if (!conversation.participants.has(agentId)) {
      throw new Error(`Agent ${agentId} is not a participant in conversation ${conversationId}`);
    }

    const turn = {
      agentId,
      content,
      timestamp: Date.now(),
      turnNumber: conversation.turns.length + 1
    };

    conversation.turns.push(turn);

    // Broadcast to other participants
    for (const participantId of conversation.participants) {
      if (participantId !== agentId) {
        await this.sendMessage({
          from: agentId,
          to: participantId,
          type: 'conversation_turn',
          conversationId,
          data: turn
        });
      }
    }

    // Check if conversation should end
    if (conversation.turns.length >= conversation.maxTurns) {
      conversation.status = 'completed';
      this.emit('conversationCompleted', conversation);
    }

    return turn;
  }

  /**
   * Queue message for offline agent
   */
  queueMessage(message) {
    const agentQueue = this.messageQueue.get(message.to) || [];
    agentQueue.push(message);
    this.messageQueue.set(message.to, agentQueue);
    
    console.log(`UAP: Queued message for ${message.to} (${agentQueue.length} in queue)`);
  }

  /**
   * Deliver queued messages
   */
  async deliverQueuedMessages(agentId) {
    const queue = this.messageQueue.get(agentId) || [];
    if (queue.length === 0) return;
    
    console.log(`UAP: Delivering ${queue.length} queued messages to ${agentId}`);
    
    for (const message of queue) {
      try {
        await this.routeMessage(message);
      } catch (error) {
        console.error(`Error delivering queued message:`, error);
      }
    }
    
    this.messageQueue.delete(agentId);
  }

  /**
   * Track conversation history
   */
  trackConversation(conversationId, message) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        participants: new Set(),
        createdAt: Date.now()
      });
    }
    
    const conversation = this.conversations.get(conversationId);
    conversation.messages.push(message);
    conversation.participants.add(message.from);
    conversation.participants.add(message.to);
    conversation.lastActivity = Date.now();
  }

  /**
   * Wait for response to a message
   */
  async waitForResponse(messageId, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(`response:${messageId}`, responseHandler);
        reject(new Error(`Response timeout for message ${messageId}`));
      }, timeout);

      const responseHandler = (response) => {
        clearTimeout(timer);
        resolve(response);
      };

      this.once(`response:${messageId}`, responseHandler);
    });
  }

  /**
   * Send response to a message
   */
  async sendResponse(originalMessageId, responseData) {
    this.emit(`response:${originalMessageId}`, responseData);
  }

  /**
   * Broadcast message to multiple agents
   */
  async broadcastMessage(message) {
    const {
      from,
      type,
      data,
      criteria = {},
      excludeAgents = []
    } = message;

    const recipients = await this.discoverAgents(criteria);
    const results = [];

    for (const recipient of recipients) {
      if (recipient.id !== from && !excludeAgents.includes(recipient.id)) {
        try {
          const result = await this.sendMessage({
            from,
            to: recipient.id,
            type,
            data
          });
          results.push({ agentId: recipient.id, result });
        } catch (error) {
          results.push({ agentId: recipient.id, error: error.message });
        }
      }
    }

    return results;
  }

  /**
   * Helper: Compress data
   */
  async compressData(data) {
    // Simple JSON compression for now
    return {
      compressed: true,
      data: JSON.stringify(data)
    };
  }

  /**
   * Helper: Decompress data
   */
  async decompressData(compressedData) {
    if (compressedData.compressed) {
      return JSON.parse(compressedData.data);
    }
    return compressedData;
  }

  /**
   * Helper: Encrypt message
   */
  async encryptMessage(message) {
    // Placeholder for encryption
    return {
      ...message,
      encrypted: true,
      encryptedData: Buffer.from(JSON.stringify(message.data)).toString('base64')
    };
  }

  /**
   * Helper: Decrypt message
   */
  async decryptMessage(encryptedMessage) {
    if (encryptedMessage.encrypted) {
      return {
        ...encryptedMessage,
        data: JSON.parse(Buffer.from(encryptedMessage.encryptedData, 'base64').toString())
      };
    }
    return encryptedMessage;
  }

  /**
   * Helper: Convert object to XML
   */
  objectToXML(obj, rootName = 'data') {
    let xml = `<${rootName}>`;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        xml += this.objectToXML(value, key);
      } else {
        xml += `<${key}>${value}</${key}>`;
      }
    }
    xml += `</${rootName}>`;
    return xml;
  }

  /**
   * Helper: Convert XML to object (simplified)
   */
  xmlToObject(xml) {
    // Simplified XML parsing - in production use a proper XML parser
    const obj = {};
    const matches = xml.match(/<(\w+)>([^<]+)<\/\1>/g);
    if (matches) {
      matches.forEach(match => {
        const [, key, value] = match.match(/<(\w+)>([^<]+)<\/\1>/);
        obj[key] = value;
      });
    }
    return obj;
  }

  /**
   * Get protocol statistics
   */
  getProtocolStats() {
    return {
      registeredAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.status === 'active').length,
      conversations: this.conversations.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      capabilities: Array.from(this.capabilities.keys()),
      protocolAdapters: Array.from(this.protocolAdapters.keys())
    };
  }

  /**
   * Get agent statistics
   */
  getAgentStats(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const conversationCount = Array.from(this.conversations.values())
      .filter(c => c.participants.has(agentId)).length;

    const queuedMessages = (this.messageQueue.get(agentId) || []).length;

    return {
      ...agent,
      conversationCount,
      queuedMessages,
      lastSeenAgo: Date.now() - agent.lastSeen
    };
  }

  /**
   * Clean up inactive agents
   */
  async cleanupInactiveAgents(inactivityThreshold = 300000) { // 5 minutes
    const now = Date.now();
    const inactiveAgents = [];

    for (const [agentId, agent] of this.agents) {
      if (now - agent.lastSeen > inactivityThreshold && agent.status === 'active') {
        agent.status = 'inactive';
        inactiveAgents.push(agentId);
      }
    }

    if (inactiveAgents.length > 0) {
      console.log(`UAP: Marked ${inactiveAgents.length} agents as inactive`);
      this.emit('agentsInactive', inactiveAgents);
    }

    return inactiveAgents;
  }
}

module.exports = UnifiedAgentProtocol;