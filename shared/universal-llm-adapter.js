const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Universal LLM Adapter Interface
 * Provides a unified interface for interacting with multiple LLM providers
 * and protocols including OpenAI, Anthropic, Google, Cohere, HuggingFace, and more
 */
class UniversalLLMAdapter extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      timeout: config.timeout || 120000, // 2 minutes
      maxRetries: config.maxRetries || 3,
      streamingEnabled: config.streamingEnabled !== false,
      contextWindowManagement: config.contextWindowManagement !== false,
      ...config
    };

    this.providers = new Map();
    this.activeConnections = new Map();
    this.contextManagers = new Map();
    this.capabilityRegistry = new Map();
    
    this.initializeProviders();
  }

  initializeProviders() {
    // Provider configurations with their specific requirements
    this.providerConfigs = {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4-vision'],
        endpoint: 'https://api.openai.com/v1',
        authType: 'bearer',
        capabilities: ['chat', 'completion', 'embedding', 'vision', 'function_calling'],
        contextWindow: { 'gpt-4': 8192, 'gpt-4-turbo': 128000, 'gpt-3.5-turbo': 16384 }
      },
      anthropic: {
        name: 'Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-2.1'],
        endpoint: 'https://api.anthropic.com/v1',
        authType: 'x-api-key',
        capabilities: ['chat', 'completion', 'vision', 'xml_mode', 'long_context'],
        contextWindow: { 'claude-3-opus': 200000, 'claude-3-sonnet': 200000, 'claude-2.1': 100000 }
      },
      google: {
        name: 'Google',
        models: ['gemini-pro', 'gemini-pro-vision', 'palm-2'],
        endpoint: 'https://generativelanguage.googleapis.com/v1',
        authType: 'api-key',
        capabilities: ['chat', 'completion', 'embedding', 'vision', 'multimodal'],
        contextWindow: { 'gemini-pro': 32760, 'palm-2': 8192 }
      },
      cohere: {
        name: 'Cohere',
        models: ['command', 'command-nightly', 'command-light'],
        endpoint: 'https://api.cohere.ai/v1',
        authType: 'bearer',
        capabilities: ['chat', 'completion', 'embedding', 'classification', 'summarization'],
        contextWindow: { 'command': 4096, 'command-nightly': 4096 }
      },
      huggingface: {
        name: 'HuggingFace',
        models: ['various'], // Dynamic model loading
        endpoint: 'https://api-inference.huggingface.co/models',
        authType: 'bearer',
        capabilities: ['inference', 'embedding', 'classification', 'generation'],
        contextWindow: {} // Model-specific
      },
      ollama: {
        name: 'Ollama',
        models: ['llama2', 'mistral', 'codellama', 'vicuna'],
        endpoint: 'http://localhost:11434/api',
        authType: 'none',
        capabilities: ['chat', 'completion', 'embedding', 'local'],
        contextWindow: { 'llama2': 4096, 'mistral': 8192 }
      },
      custom: {
        name: 'Custom',
        models: ['custom'],
        endpoint: null, // User-defined
        authType: 'custom',
        capabilities: ['custom'],
        contextWindow: {}
      }
    };
  }

  /**
   * Register a new LLM provider
   */
  async registerProvider(providerId, config) {
    const provider = {
      id: providerId,
      type: config.type || 'custom',
      config: {
        ...this.providerConfigs[config.type] || this.providerConfigs.custom,
        ...config
      },
      status: 'inactive',
      lastHealthCheck: null,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        totalTokensUsed: 0
      }
    };

    // Create provider-specific adapter
    provider.adapter = await this.createProviderAdapter(provider);
    
    // Test connection
    const isHealthy = await this.testProviderConnection(provider);
    provider.status = isHealthy ? 'active' : 'error';
    
    this.providers.set(providerId, provider);
    
    // Register capabilities
    this.registerCapabilities(providerId, provider.config.capabilities);
    
    console.log(`Registered LLM provider: ${providerId} (${provider.config.name})`);
    this.emit('providerRegistered', { providerId, provider });
    
    return provider;
  }

  /**
   * Create provider-specific adapter based on type
   */
  async createProviderAdapter(provider) {
    const adapterFactories = {
      openai: () => new OpenAIAdapter(provider.config),
      anthropic: () => new AnthropicAdapter(provider.config),
      google: () => new GoogleAdapter(provider.config),
      cohere: () => new CohereAdapter(provider.config),
      huggingface: () => new HuggingFaceAdapter(provider.config),
      ollama: () => new OllamaAdapter(provider.config),
      custom: () => new CustomAdapter(provider.config)
    };

    const factory = adapterFactories[provider.type] || adapterFactories.custom;
    return factory();
  }

  /**
   * Send a unified request to any LLM provider
   */
  async sendRequest(request) {
    const {
      provider: providerId,
      model,
      messages,
      stream = false,
      temperature = 0.7,
      maxTokens = 1000,
      tools = [],
      responseFormat,
      ...additionalParams
    } = request;

    // Select provider
    const provider = await this.selectProvider(providerId, model, request);
    if (!provider) {
      throw new Error(`No available provider for model: ${model}`);
    }

    // Prepare request based on provider type
    const preparedRequest = await this.prepareRequest(provider, {
      model,
      messages,
      stream,
      temperature,
      maxTokens,
      tools,
      responseFormat,
      ...additionalParams
    });

    // Handle context window limits
    if (this.config.contextWindowManagement) {
      preparedRequest.messages = await this.manageContextWindow(
        provider,
        model,
        preparedRequest.messages
      );
    }

    // Send request through provider adapter
    const startTime = Date.now();
    
    try {
      const response = stream 
        ? await this.streamRequest(provider, preparedRequest)
        : await this.standardRequest(provider, preparedRequest);
      
      // Update metrics
      this.updateProviderMetrics(provider.id, {
        success: true,
        responseTime: Date.now() - startTime,
        tokensUsed: response.usage?.total_tokens || 0
      });
      
      // Normalize response
      return this.normalizeResponse(provider, response);
      
    } catch (error) {
      // Update metrics
      this.updateProviderMetrics(provider.id, {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      });
      
      // Handle provider-specific errors
      throw this.normalizeError(provider, error);
    }
  }

  /**
   * Select the best provider for a request
   */
  async selectProvider(preferredProviderId, model, request) {
    // If specific provider requested, use it if available
    if (preferredProviderId) {
      const provider = this.providers.get(preferredProviderId);
      if (provider && provider.status === 'active') {
        return provider;
      }
    }

    // Find providers that support the model
    const compatibleProviders = Array.from(this.providers.values())
      .filter(p => 
        p.status === 'active' &&
        (p.config.models.includes(model) || p.config.models.includes('various'))
      );

    if (compatibleProviders.length === 0) {
      return null;
    }

    // Select based on capabilities and performance
    return this.selectOptimalProvider(compatibleProviders, request);
  }

  /**
   * Select optimal provider based on requirements and performance
   */
  selectOptimalProvider(providers, request) {
    const scores = providers.map(provider => {
      let score = 0;
      
      // Capability matching
      const requiredCapabilities = this.extractRequiredCapabilities(request);
      const capabilityScore = this.calculateCapabilityScore(
        provider.config.capabilities,
        requiredCapabilities
      );
      score += capabilityScore * 40;
      
      // Performance score
      const metrics = provider.metrics;
      const successRate = metrics.totalRequests > 0
        ? metrics.successfulRequests / metrics.totalRequests
        : 0.5;
      score += successRate * 30;
      
      // Response time score
      const avgResponseTime = metrics.avgResponseTime || 5000;
      const responseScore = Math.max(0, 1 - (avgResponseTime / 10000));
      score += responseScore * 20;
      
      // Cost efficiency (if available)
      const costScore = this.calculateCostScore(provider, request);
      score += costScore * 10;
      
      return { provider, score };
    });

    // Sort by score and return best provider
    scores.sort((a, b) => b.score - a.score);
    return scores[0].provider;
  }

  /**
   * Prepare request for specific provider format
   */
  async prepareRequest(provider, request) {
    const adapter = provider.adapter;
    return adapter.prepareRequest(request);
  }

  /**
   * Send standard (non-streaming) request
   */
  async standardRequest(provider, request) {
    const adapter = provider.adapter;
    return adapter.sendRequest(request);
  }

  /**
   * Send streaming request
   */
  async streamRequest(provider, request) {
    const adapter = provider.adapter;
    const stream = adapter.streamRequest(request);
    
    // Wrap stream to emit events
    const wrappedStream = new EventEmitter();
    
    (async () => {
      try {
        for await (const chunk of stream) {
          wrappedStream.emit('data', chunk);
        }
        wrappedStream.emit('end');
      } catch (error) {
        wrappedStream.emit('error', error);
      }
    })();
    
    return wrappedStream;
  }

  /**
   * Normalize response to unified format
   */
  normalizeResponse(provider, response) {
    const adapter = provider.adapter;
    const normalized = adapter.normalizeResponse(response);
    
    return {
      id: normalized.id || crypto.randomUUID(),
      provider: provider.id,
      model: normalized.model,
      choices: normalized.choices || [],
      usage: normalized.usage || {},
      metadata: {
        provider: provider.config.name,
        latency: normalized.latency,
        ...normalized.metadata
      }
    };
  }

  /**
   * Normalize error to unified format
   */
  normalizeError(provider, error) {
    const adapter = provider.adapter;
    const normalized = adapter.normalizeError(error);
    
    return {
      provider: provider.id,
      type: normalized.type || 'unknown',
      message: normalized.message || error.message,
      code: normalized.code,
      retryable: normalized.retryable !== false,
      details: normalized.details || {}
    };
  }

  /**
   * Manage context window for large conversations
   */
  async manageContextWindow(provider, model, messages) {
    const maxTokens = provider.config.contextWindow[model] || 4096;
    const estimatedTokens = this.estimateTokenCount(messages);
    
    if (estimatedTokens <= maxTokens * 0.9) {
      return messages;
    }

    // Implement sliding window or summarization
    return this.truncateMessages(messages, maxTokens);
  }

  /**
   * Estimate token count for messages
   */
  estimateTokenCount(messages) {
    // Simple estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);
    
    return Math.ceil(totalChars / 4);
  }

  /**
   * Truncate messages to fit context window
   */
  truncateMessages(messages, maxTokens) {
    const keepSystemMessage = messages[0]?.role === 'system';
    const systemMessage = keepSystemMessage ? messages[0] : null;
    const conversationMessages = keepSystemMessage ? messages.slice(1) : messages;
    
    // Keep most recent messages
    const truncated = [];
    let tokenCount = systemMessage ? this.estimateTokenCount([systemMessage]) : 0;
    
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokenCount([conversationMessages[i]]);
      if (tokenCount + msgTokens > maxTokens * 0.9) break;
      
      truncated.unshift(conversationMessages[i]);
      tokenCount += msgTokens;
    }
    
    if (systemMessage) {
      truncated.unshift(systemMessage);
    }
    
    return truncated;
  }

  /**
   * Register capabilities for a provider
   */
  registerCapabilities(providerId, capabilities) {
    capabilities.forEach(capability => {
      if (!this.capabilityRegistry.has(capability)) {
        this.capabilityRegistry.set(capability, new Set());
      }
      this.capabilityRegistry.get(capability).add(providerId);
    });
  }

  /**
   * Find providers by capability
   */
  findProvidersByCapability(capability) {
    return Array.from(this.capabilityRegistry.get(capability) || [])
      .map(id => this.providers.get(id))
      .filter(p => p && p.status === 'active');
  }

  /**
   * Extract required capabilities from request
   */
  extractRequiredCapabilities(request) {
    const capabilities = [];
    
    if (request.messages) capabilities.push('chat');
    if (request.tools && request.tools.length > 0) capabilities.push('function_calling');
    if (request.responseFormat === 'json') capabilities.push('json_mode');
    if (request.images || request.vision) capabilities.push('vision');
    if (request.embeddings) capabilities.push('embedding');
    
    return capabilities;
  }

  /**
   * Calculate capability matching score
   */
  calculateCapabilityScore(providerCaps, requiredCaps) {
    if (requiredCaps.length === 0) return 1;
    
    const matches = requiredCaps.filter(cap => providerCaps.includes(cap)).length;
    return matches / requiredCaps.length;
  }

  /**
   * Calculate cost efficiency score
   */
  calculateCostScore(provider, request) {
    // This would integrate with pricing data
    // For now, return a default score
    const costFactors = {
      openai: 0.5,
      anthropic: 0.6,
      google: 0.7,
      cohere: 0.8,
      huggingface: 0.9,
      ollama: 1.0, // Local is free
      custom: 0.5
    };
    
    return costFactors[provider.type] || 0.5;
  }

  /**
   * Test provider connection
   */
  async testProviderConnection(provider) {
    try {
      const adapter = provider.adapter;
      const result = await adapter.testConnection();
      provider.lastHealthCheck = Date.now();
      return result;
    } catch (error) {
      console.error(`Provider ${provider.id} health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Update provider metrics
   */
  updateProviderMetrics(providerId, result) {
    const provider = this.providers.get(providerId);
    if (!provider) return;
    
    const metrics = provider.metrics;
    metrics.totalRequests++;
    
    if (result.success) {
      metrics.successfulRequests++;
      
      // Update average response time
      const alpha = 0.1; // Smoothing factor
      metrics.avgResponseTime = metrics.avgResponseTime * (1 - alpha) + result.responseTime * alpha;
      
      if (result.tokensUsed) {
        metrics.totalTokensUsed += result.tokensUsed;
      }
    } else {
      metrics.failedRequests++;
    }
    
    this.emit('metricsUpdated', { providerId, metrics });
  }

  /**
   * Get provider statistics
   */
  getProviderStats() {
    const stats = {};
    
    for (const [id, provider] of this.providers) {
      stats[id] = {
        name: provider.config.name,
        type: provider.type,
        status: provider.status,
        metrics: provider.metrics,
        capabilities: provider.config.capabilities,
        models: provider.config.models
      };
    }
    
    return stats;
  }

  /**
   * Handle provider failover
   */
  async handleFailover(failedProviderId, request) {
    console.log(`Handling failover for provider ${failedProviderId}`);
    
    // Mark provider as unhealthy
    const failedProvider = this.providers.get(failedProviderId);
    if (failedProvider) {
      failedProvider.status = 'error';
    }
    
    // Find alternative provider
    const alternativeProvider = await this.selectProvider(null, request.model, request);
    
    if (!alternativeProvider) {
      throw new Error('No alternative providers available for failover');
    }
    
    console.log(`Failing over to provider ${alternativeProvider.id}`);
    
    // Retry request with alternative provider
    return this.sendRequest({
      ...request,
      provider: alternativeProvider.id
    });
  }

  /**
   * Start health monitoring for all providers
   */
  startHealthMonitoring(interval = 60000) {
    this.healthCheckInterval = setInterval(async () => {
      for (const [id, provider] of this.providers) {
        const wasHealthy = provider.status === 'active';
        const isHealthy = await this.testProviderConnection(provider);
        
        provider.status = isHealthy ? 'active' : 'error';
        
        if (wasHealthy && !isHealthy) {
          this.emit('providerDown', { providerId: id });
        } else if (!wasHealthy && isHealthy) {
          this.emit('providerRecovered', { providerId: id });
        }
      }
    }, interval);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

/**
 * Base adapter class for LLM providers
 */
class BaseLLMAdapter {
  constructor(config) {
    this.config = config;
  }

  async testConnection() {
    throw new Error('testConnection must be implemented by provider adapter');
  }

  prepareRequest(request) {
    throw new Error('prepareRequest must be implemented by provider adapter');
  }

  async sendRequest(request) {
    throw new Error('sendRequest must be implemented by provider adapter');
  }

  async* streamRequest(request) {
    throw new Error('streamRequest must be implemented by provider adapter');
  }

  normalizeResponse(response) {
    throw new Error('normalizeResponse must be implemented by provider adapter');
  }

  normalizeError(error) {
    throw new Error('normalizeError must be implemented by provider adapter');
  }
}

/**
 * OpenAI Adapter
 */
class OpenAIAdapter extends BaseLLMAdapter {
  async testConnection() {
    // Test connection to OpenAI
    try {
      const response = await fetch(`${this.config.endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  prepareRequest(request) {
    return {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: request.stream,
      tools: request.tools,
      response_format: request.responseFormat
    };
  }

  async sendRequest(request) {
    const response = await fetch(`${this.config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return response.json();
  }

  async* streamRequest(request) {
    const response = await fetch(`${this.config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...request, stream: true })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  normalizeResponse(response) {
    return {
      id: response.id,
      model: response.model,
      choices: response.choices,
      usage: response.usage
    };
  }

  normalizeError(error) {
    return {
      type: 'api_error',
      message: error.message,
      code: error.code,
      retryable: error.code !== 'invalid_api_key'
    };
  }
}

/**
 * Anthropic Adapter
 */
class AnthropicAdapter extends BaseLLMAdapter {
  async testConnection() {
    try {
      const response = await fetch(`${this.config.endpoint}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      });
      return response.ok || response.status === 400; // 400 might be quota issue
    } catch (error) {
      return false;
    }
  }

  prepareRequest(request) {
    return {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: request.stream
    };
  }

  async sendRequest(request) {
    const response = await fetch(`${this.config.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    return response.json();
  }

  async* streamRequest(request) {
    const response = await fetch(`${this.config.endpoint}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...request, stream: true })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  normalizeResponse(response) {
    return {
      id: response.id,
      model: response.model,
      choices: [{
        message: {
          role: 'assistant',
          content: response.content[0].text
        },
        finish_reason: response.stop_reason
      }],
      usage: response.usage
    };
  }

  normalizeError(error) {
    return {
      type: 'api_error',
      message: error.message,
      retryable: true
    };
  }
}

/**
 * Google Adapter
 */
class GoogleAdapter extends BaseLLMAdapter {
  async testConnection() {
    try {
      const response = await fetch(
        `${this.config.endpoint}/models?key=${this.config.apiKey}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  prepareRequest(request) {
    return {
      contents: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens
      }
    };
  }

  async sendRequest(request) {
    const model = request.model || 'gemini-pro';
    const response = await fetch(
      `${this.config.endpoint}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    return response.json();
  }

  async* streamRequest(request) {
    const model = request.model || 'gemini-pro';
    const response = await fetch(
      `${this.config.endpoint}/models/${model}:streamGenerateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      try {
        yield JSON.parse(chunk);
      } catch (e) {
        // Handle partial chunks
      }
    }
  }

  normalizeResponse(response) {
    const candidate = response.candidates[0];
    return {
      id: crypto.randomUUID(),
      model: 'gemini-pro',
      choices: [{
        message: {
          role: 'assistant',
          content: candidate.content.parts[0].text
        },
        finish_reason: candidate.finishReason
      }],
      usage: response.usageMetadata
    };
  }

  normalizeError(error) {
    return {
      type: 'api_error',
      message: error.message,
      retryable: true
    };
  }
}

/**
 * Ollama Adapter (for local models)
 */
class OllamaAdapter extends BaseLLMAdapter {
  async testConnection() {
    try {
      const response = await fetch(`${this.config.endpoint}/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  prepareRequest(request) {
    return {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      stream: request.stream
    };
  }

  async sendRequest(request) {
    const response = await fetch(`${this.config.endpoint}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    return response.json();
  }

  async* streamRequest(request) {
    const response = await fetch(`${this.config.endpoint}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          yield JSON.parse(line);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  normalizeResponse(response) {
    return {
      id: crypto.randomUUID(),
      model: response.model,
      choices: [{
        message: response.message,
        finish_reason: response.done ? 'stop' : 'length'
      }],
      usage: {
        prompt_tokens: response.prompt_eval_count,
        completion_tokens: response.eval_count,
        total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
      }
    };
  }

  normalizeError(error) {
    return {
      type: 'api_error',
      message: error.message,
      retryable: true
    };
  }
}

/**
 * Custom Adapter for proprietary or custom LLM endpoints
 */
class CustomAdapter extends BaseLLMAdapter {
  async testConnection() {
    if (!this.config.testEndpoint) return true;
    
    try {
      const response = await fetch(this.config.testEndpoint, {
        method: this.config.testMethod || 'GET',
        headers: this.config.headers || {}
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  prepareRequest(request) {
    // Apply custom transformation if provided
    if (this.config.transformRequest) {
      return this.config.transformRequest(request);
    }
    return request;
  }

  async sendRequest(request) {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: this.config.headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Custom API error: ${response.statusText}`);
    }

    return response.json();
  }

  async* streamRequest(request) {
    throw new Error('Streaming not implemented for custom adapter');
  }

  normalizeResponse(response) {
    // Apply custom transformation if provided
    if (this.config.transformResponse) {
      return this.config.transformResponse(response);
    }
    return response;
  }

  normalizeError(error) {
    return {
      type: 'api_error',
      message: error.message,
      retryable: true
    };
  }
}

// Placeholder implementations for other adapters
class CohereAdapter extends BaseLLMAdapter {
  // Implementation similar to other adapters
}

class HuggingFaceAdapter extends BaseLLMAdapter {
  // Implementation similar to other adapters
}

module.exports = UniversalLLMAdapter;