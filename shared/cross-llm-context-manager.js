const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Cross-LLM Context Manager
 * Manages context sharing and state synchronization across different LLM providers
 * Handles context windows, memory management, and state persistence
 */
class CrossLLMContextManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxContextSize: config.maxContextSize || 100000, // tokens
      compressionThreshold: config.compressionThreshold || 50000,
      persistenceEnabled: config.persistenceEnabled !== false,
      syncInterval: config.syncInterval || 5000,
      contextRetention: config.contextRetention || 3600000, // 1 hour
      ...config
    };

    this.contexts = new Map();
    this.sharedMemory = new Map();
    this.contextTransformers = new Map();
    this.syncHandlers = new Map();
    this.contextHistory = new Map();
    
    this.initializeContextManager();
  }

  initializeContextManager() {
    // Initialize context transformers for different LLM formats
    this.initializeTransformers();
    
    // Start sync processes
    if (this.config.persistenceEnabled) {
      this.startContextSync();
    }
    
    // Initialize cleanup
    this.startCleanupProcess();
  }

  /**
   * Create a new context session
   */
  async createContext(sessionId, config = {}) {
    const context = {
      id: sessionId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      agents: new Map(),
      sharedState: {},
      messages: [],
      metadata: config.metadata || {},
      settings: {
        maxTokens: config.maxTokens || this.config.maxContextSize,
        compressionEnabled: config.compressionEnabled !== false,
        syncEnabled: config.syncEnabled !== false,
        retention: config.retention || this.config.contextRetention
      }
    };

    this.contexts.set(sessionId, context);
    
    console.log(`Context Manager: Created context ${sessionId}`);
    this.emit('contextCreated', { sessionId, context });
    
    return context;
  }

  /**
   * Add an agent to a context
   */
  async addAgentToContext(sessionId, agentId, agentConfig) {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`Context not found: ${sessionId}`);

    const agentContext = {
      id: agentId,
      type: agentConfig.type,
      provider: agentConfig.provider,
      model: agentConfig.model,
      joinedAt: Date.now(),
      privateMemory: {},
      tokenUsage: 0,
      messageCount: 0,
      contextWindow: agentConfig.contextWindow || 4096,
      capabilities: agentConfig.capabilities || []
    };

    context.agents.set(agentId, agentContext);
    
    // Initialize agent-specific transformers
    await this.initializeAgentTransformers(agentId, agentConfig);
    
    console.log(`Context Manager: Added agent ${agentId} to context ${sessionId}`);
    this.emit('agentAddedToContext', { sessionId, agentId, agentContext });
    
    return agentContext;
  }

  /**
   * Add a message to the context
   */
  async addMessage(sessionId, message) {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`Context not found: ${sessionId}`);

    const enrichedMessage = {
      id: message.id || crypto.randomUUID(),
      timestamp: Date.now(),
      agentId: message.agentId,
      role: message.role,
      content: message.content,
      metadata: message.metadata || {},
      tokenCount: this.estimateTokens(message.content)
    };

    context.messages.push(enrichedMessage);
    context.lastUpdated = Date.now();

    // Update agent stats
    const agentContext = context.agents.get(message.agentId);
    if (agentContext) {
      agentContext.messageCount++;
      agentContext.tokenUsage += enrichedMessage.tokenCount;
    }

    // Check if compression needed
    await this.checkContextCompression(sessionId);
    
    // Sync to shared memory
    if (context.settings.syncEnabled) {
      await this.syncToSharedMemory(sessionId);
    }

    this.emit('messageAdded', { sessionId, message: enrichedMessage });
    
    return enrichedMessage;
  }

  /**
   * Get context for a specific agent
   */
  async getAgentContext(sessionId, agentId, options = {}) {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`Context not found: ${sessionId}`);

    const agentContext = context.agents.get(agentId);
    if (!agentContext) throw new Error(`Agent not in context: ${agentId}`);

    // Get messages relevant to this agent
    let messages = context.messages;
    
    // Apply agent-specific filters
    if (options.filter) {
      messages = messages.filter(options.filter);
    }

    // Transform messages for agent's format
    const transformer = this.contextTransformers.get(agentContext.provider);
    if (transformer) {
      messages = await transformer.transform(messages, agentContext);
    }

    // Apply context window limits
    messages = await this.applyContextWindow(messages, agentContext);

    // Include shared state
    const agentSpecificContext = {
      messages,
      sharedState: context.sharedState,
      privateMemory: agentContext.privateMemory,
      metadata: {
        sessionId,
        agentId,
        messageCount: messages.length,
        totalTokens: messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
      }
    };

    return agentSpecificContext;
  }

  /**
   * Update shared state
   */
  async updateSharedState(sessionId, updates) {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`Context not found: ${sessionId}`);

    // Merge updates
    context.sharedState = {
      ...context.sharedState,
      ...updates,
      lastUpdated: Date.now()
    };

    context.lastUpdated = Date.now();

    // Notify all agents in context
    for (const [agentId] of context.agents) {
      this.emit('sharedStateUpdated', {
        sessionId,
        agentId,
        updates
      });
    }

    // Sync to persistence
    if (context.settings.syncEnabled) {
      await this.syncToSharedMemory(sessionId);
    }

    return context.sharedState;
  }

  /**
   * Update agent private memory
   */
  async updateAgentMemory(sessionId, agentId, updates) {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`Context not found: ${sessionId}`);

    const agentContext = context.agents.get(agentId);
    if (!agentContext) throw new Error(`Agent not in context: ${agentId}`);

    agentContext.privateMemory = {
      ...agentContext.privateMemory,
      ...updates,
      lastUpdated: Date.now()
    };

    this.emit('agentMemoryUpdated', {
      sessionId,
      agentId,
      updates
    });

    return agentContext.privateMemory;
  }

  /**
   * Initialize context transformers
   */
  initializeTransformers() {
    // OpenAI transformer
    this.contextTransformers.set('openai', {
      transform: async (messages, agentContext) => {
        return messages.map(msg => ({
          role: msg.role === 'agent' ? 'assistant' : msg.role,
          content: msg.content,
          name: msg.agentId
        }));
      }
    });

    // Anthropic transformer
    this.contextTransformers.set('anthropic', {
      transform: async (messages, agentContext) => {
        return messages.map(msg => ({
          role: msg.role === 'agent' ? 'assistant' : msg.role,
          content: msg.content
        }));
      }
    });

    // Google transformer
    this.contextTransformers.set('google', {
      transform: async (messages, agentContext) => {
        const parts = [];
        let currentRole = null;
        let currentContent = [];

        for (const msg of messages) {
          const role = msg.role === 'agent' ? 'model' : 'user';
          
          if (role !== currentRole && currentRole !== null) {
            parts.push({
              role: currentRole,
              parts: [{ text: currentContent.join('\n') }]
            });
            currentContent = [];
          }
          
          currentRole = role;
          currentContent.push(msg.content);
        }

        if (currentContent.length > 0) {
          parts.push({
            role: currentRole,
            parts: [{ text: currentContent.join('\n') }]
          });
        }

        return parts;
      }
    });

    // Custom transformer template
    this.contextTransformers.set('custom', {
      transform: async (messages, agentContext) => {
        // Allow custom transformation logic
        if (agentContext.customTransformer) {
          return agentContext.customTransformer(messages);
        }
        return messages;
      }
    });
  }

  /**
   * Initialize agent-specific transformers
   */
  async initializeAgentTransformers(agentId, agentConfig) {
    if (agentConfig.contextTransformer) {
      const transformerKey = `${agentConfig.provider}:${agentId}`;
      this.contextTransformers.set(transformerKey, {
        transform: agentConfig.contextTransformer
      });
    }
  }

  /**
   * Apply context window limits
   */
  async applyContextWindow(messages, agentContext) {
    const maxTokens = agentContext.contextWindow * 0.9; // 90% to leave room
    let totalTokens = 0;
    const includedMessages = [];

    // Start from most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = msg.tokenCount || this.estimateTokens(msg.content);
      
      if (totalTokens + msgTokens > maxTokens) {
        break;
      }
      
      includedMessages.unshift(msg);
      totalTokens += msgTokens;
    }

    // If we had to truncate, add a summary of earlier messages
    if (includedMessages.length < messages.length) {
      const truncatedCount = messages.length - includedMessages.length;
      const summaryMessage = {
        role: 'system',
        content: `[Previous ${truncatedCount} messages truncated due to context window limits]`,
        metadata: { truncated: true }
      };
      includedMessages.unshift(summaryMessage);
    }

    return includedMessages;
  }

  /**
   * Check and apply context compression
   */
  async checkContextCompression(sessionId) {
    const context = this.contexts.get(sessionId);
    if (!context || !context.settings.compressionEnabled) return;

    const totalTokens = context.messages.reduce((sum, msg) => sum + (msg.tokenCount || 0), 0);
    
    if (totalTokens > this.config.compressionThreshold) {
      await this.compressContext(sessionId);
    }
  }

  /**
   * Compress context using summarization
   */
  async compressContext(sessionId) {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    console.log(`Context Manager: Compressing context ${sessionId}`);

    // Group messages by conversation segments
    const segments = this.segmentMessages(context.messages);
    const compressedMessages = [];

    for (const segment of segments) {
      if (segment.length > 10) {
        // Summarize long segments
        const summary = await this.summarizeSegment(segment);
        compressedMessages.push({
          role: 'system',
          content: summary,
          metadata: {
            compressed: true,
            originalCount: segment.length,
            timestamp: Date.now()
          },
          tokenCount: this.estimateTokens(summary)
        });
      } else {
        // Keep short segments as-is
        compressedMessages.push(...segment);
      }
    }

    // Store original in history
    this.storeContextHistory(sessionId, context.messages);
    
    // Replace with compressed version
    context.messages = compressedMessages;
    
    this.emit('contextCompressed', {
      sessionId,
      originalCount: segments.flat().length,
      compressedCount: compressedMessages.length
    });
  }

  /**
   * Segment messages for compression
   */
  segmentMessages(messages, segmentSize = 20) {
    const segments = [];
    let currentSegment = [];
    let lastRole = null;

    for (const msg of messages) {
      if (currentSegment.length >= segmentSize || 
          (lastRole && msg.role !== lastRole && currentSegment.length > 5)) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      
      currentSegment.push(msg);
      lastRole = msg.role;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Summarize a message segment
   */
  async summarizeSegment(segment) {
    // This would integrate with an LLM for actual summarization
    // For now, create a basic summary
    const topics = this.extractTopics(segment);
    const participants = [...new Set(segment.map(m => m.agentId))];
    
    return `Summary of ${segment.length} messages between ${participants.join(', ')}. ` +
           `Topics discussed: ${topics.join(', ')}. ` +
           `Key points preserved from original conversation.`;
  }

  /**
   * Extract topics from messages
   */
  extractTopics(messages) {
    // Simple keyword extraction - would be enhanced with NLP
    const keywords = new Map();
    
    for (const msg of messages) {
      const words = msg.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 5 && !this.isCommonWord(word)) {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      }
    }

    // Return top keywords as topics
    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Check if word is common (to filter out)
   */
  isCommonWord(word) {
    const commonWords = ['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'been'];
    return commonWords.includes(word);
  }

  /**
   * Store context history
   */
  storeContextHistory(sessionId, messages) {
    const historyKey = `${sessionId}:${Date.now()}`;
    this.contextHistory.set(historyKey, {
      sessionId,
      timestamp: Date.now(),
      messages: messages,
      metadata: {
        messageCount: messages.length,
        totalTokens: messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
      }
    });

    // Clean old history
    this.cleanupOldHistory();
  }

  /**
   * Sync context to shared memory
   */
  async syncToSharedMemory(sessionId) {
    const context = this.contexts.get(sessionId);
    if (!context) return;

    const sharedData = {
      id: sessionId,
      lastUpdated: context.lastUpdated,
      sharedState: context.sharedState,
      metadata: {
        messageCount: context.messages.length,
        agentCount: context.agents.size,
        totalTokens: context.messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
      }
    };

    this.sharedMemory.set(sessionId, sharedData);
    
    // Emit sync event
    this.emit('contextSynced', { sessionId, sharedData });
  }

  /**
   * Load context from shared memory
   */
  async loadFromSharedMemory(sessionId) {
    const sharedData = this.sharedMemory.get(sessionId);
    if (!sharedData) return null;

    // Reconstruct context from shared data
    const context = await this.createContext(sessionId, {
      metadata: sharedData.metadata
    });

    context.sharedState = sharedData.sharedState;
    context.lastUpdated = sharedData.lastUpdated;

    return context;
  }

  /**
   * Start context synchronization
   */
  startContextSync() {
    this.syncInterval = setInterval(() => {
      this.syncAllContexts().catch(console.error);
    }, this.config.syncInterval);
  }

  /**
   * Sync all active contexts
   */
  async syncAllContexts() {
    for (const [sessionId, context] of this.contexts) {
      if (context.settings.syncEnabled) {
        await this.syncToSharedMemory(sessionId);
      }
    }
  }

  /**
   * Start cleanup process
   */
  startCleanupProcess() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContexts();
      this.cleanupOldHistory();
    }, 60000); // Every minute
  }

  /**
   * Clean up expired contexts
   */
  cleanupExpiredContexts() {
    const now = Date.now();
    const expiredContexts = [];

    for (const [sessionId, context] of this.contexts) {
      const age = now - context.lastUpdated;
      if (age > context.settings.retention) {
        expiredContexts.push(sessionId);
      }
    }

    for (const sessionId of expiredContexts) {
      this.contexts.delete(sessionId);
      this.sharedMemory.delete(sessionId);
      console.log(`Context Manager: Cleaned up expired context ${sessionId}`);
    }

    if (expiredContexts.length > 0) {
      this.emit('contextsCleanedUp', { count: expiredContexts.length });
    }
  }

  /**
   * Clean up old history
   */
  cleanupOldHistory() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, history] of this.contextHistory) {
      if (now - history.timestamp > maxAge) {
        this.contextHistory.delete(key);
      }
    }
  }

  /**
   * Estimate token count
   */
  estimateTokens(content) {
    if (typeof content !== 'string') {
      content = JSON.stringify(content);
    }
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Merge contexts from multiple sessions
   */
  async mergeContexts(sessionIds, newSessionId) {
    const contexts = sessionIds.map(id => this.contexts.get(id)).filter(Boolean);
    if (contexts.length === 0) throw new Error('No valid contexts to merge');

    const mergedContext = await this.createContext(newSessionId, {
      metadata: {
        mergedFrom: sessionIds,
        mergedAt: Date.now()
      }
    });

    // Merge messages chronologically
    const allMessages = contexts
      .flatMap(ctx => ctx.messages)
      .sort((a, b) => a.timestamp - b.timestamp);

    mergedContext.messages = allMessages;

    // Merge shared states
    for (const ctx of contexts) {
      mergedContext.sharedState = {
        ...mergedContext.sharedState,
        ...ctx.sharedState
      };
    }

    // Merge agents
    for (const ctx of contexts) {
      for (const [agentId, agentContext] of ctx.agents) {
        if (!mergedContext.agents.has(agentId)) {
          mergedContext.agents.set(agentId, agentContext);
        }
      }
    }

    console.log(`Context Manager: Merged ${sessionIds.length} contexts into ${newSessionId}`);
    this.emit('contextsMerged', { sessionIds, newSessionId });

    return mergedContext;
  }

  /**
   * Export context for external storage
   */
  async exportContext(sessionId) {
    const context = this.contexts.get(sessionId);
    if (!context) throw new Error(`Context not found: ${sessionId}`);

    return {
      id: sessionId,
      version: '1.0',
      exportedAt: Date.now(),
      context: {
        metadata: context.metadata,
        settings: context.settings,
        messages: context.messages,
        sharedState: context.sharedState,
        agents: Array.from(context.agents.entries()).map(([id, agent]) => ({
          id,
          ...agent
        }))
      }
    };
  }

  /**
   * Import context from external source
   */
  async importContext(exportedData) {
    if (!exportedData.context) throw new Error('Invalid export format');

    const sessionId = exportedData.id || crypto.randomUUID();
    const context = await this.createContext(sessionId, {
      metadata: exportedData.context.metadata,
      ...exportedData.context.settings
    });

    // Import messages
    context.messages = exportedData.context.messages;
    context.sharedState = exportedData.context.sharedState;

    // Import agents
    for (const agentData of exportedData.context.agents) {
      const { id, ...agentContext } = agentData;
      context.agents.set(id, agentContext);
    }

    console.log(`Context Manager: Imported context ${sessionId}`);
    this.emit('contextImported', { sessionId });

    return context;
  }

  /**
   * Get context statistics
   */
  getContextStats(sessionId) {
    const context = this.contexts.get(sessionId);
    if (!context) return null;

    const stats = {
      id: sessionId,
      createdAt: context.createdAt,
      lastUpdated: context.lastUpdated,
      messageCount: context.messages.length,
      totalTokens: context.messages.reduce((sum, m) => sum + (m.tokenCount || 0), 0),
      agentCount: context.agents.size,
      agents: Array.from(context.agents.entries()).map(([id, agent]) => ({
        id,
        type: agent.type,
        provider: agent.provider,
        messageCount: agent.messageCount,
        tokenUsage: agent.tokenUsage
      })),
      compressionApplied: context.messages.some(m => m.metadata?.compressed),
      sharedStateKeys: Object.keys(context.sharedState)
    };

    return stats;
  }

  /**
   * Get overall statistics
   */
  getOverallStats() {
    return {
      activeContexts: this.contexts.size,
      sharedMemorySize: this.sharedMemory.size,
      historySize: this.contextHistory.size,
      totalMessages: Array.from(this.contexts.values())
        .reduce((sum, ctx) => sum + ctx.messages.length, 0),
      totalAgents: Array.from(this.contexts.values())
        .reduce((sum, ctx) => sum + ctx.agents.size, 0)
    };
  }

  /**
   * Shutdown cleanup
   */
  async shutdown() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    
    // Final sync
    await this.syncAllContexts();
    
    console.log('Context Manager: Shutdown complete');
  }
}

module.exports = CrossLLMContextManager;