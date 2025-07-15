/**
 * API endpoint for enrolling new AI agents
 */

import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

let redisClient;

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
  }
  return redisClient;
}

const SUPPORTED_PLATFORMS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    keyFormat: /^sk-[a-zA-Z0-9]{20,}$/,
    testEndpoint: 'https://api.openai.com/v1/models'
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    keyFormat: /^sk-ant-[a-zA-Z0-9_-]+$/,
    testEndpoint: 'https://api.anthropic.com/v1/messages'
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-coder', 'deepseek-chat'],
    keyFormat: /^sk-[a-zA-Z0-9]{20,}$/,
    testEndpoint: 'https://api.deepseek.com/v1/models'
  },
  google: {
    name: 'Google',
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
    keyFormat: /^AIza[a-zA-Z0-9_-]{35,}$/,
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models'
  },
  mistral: {
    name: 'Mistral',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
    keyFormat: /^[a-zA-Z0-9]{32,}$/,
    testEndpoint: 'https://api.mistral.ai/v1/models'
  },
  perplexity: {
    name: 'Perplexity',
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
    keyFormat: /^pplx-[a-zA-Z0-9]{20,}$/,
    testEndpoint: 'https://api.perplexity.ai/models'
  },
  cohere: {
    name: 'Cohere',
    models: ['command-r-plus', 'command-r', 'command'],
    keyFormat: /^co-[a-zA-Z0-9]{20,}$/,
    testEndpoint: 'https://api.cohere.ai/v1/models'
  },
  together: {
    name: 'Together AI',
    models: ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    keyFormat: /^[a-zA-Z0-9]{40,}$/,
    testEndpoint: 'https://api.together.xyz/models'
  }
};

function validateAgentData(data) {
  const errors = [];

  // Required fields
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Agent name is required');
  }

  if (!data.platform || !SUPPORTED_PLATFORMS[data.platform]) {
    errors.push('Valid platform is required');
  }

  if (!data.model || typeof data.model !== 'string') {
    errors.push('Model is required');
  }

  if (!data.apiKey || typeof data.apiKey !== 'string') {
    errors.push('API key is required');
  }

  // Platform-specific validation
  if (data.platform && SUPPORTED_PLATFORMS[data.platform]) {
    const platform = SUPPORTED_PLATFORMS[data.platform];
    
    // Validate model
    if (data.model && !platform.models.includes(data.model)) {
      errors.push(`Model ${data.model} is not supported for ${platform.name}`);
    }

    // Validate API key format
    if (data.apiKey && !platform.keyFormat.test(data.apiKey)) {
      errors.push(`Invalid API key format for ${platform.name}`);
    }
  }

  // Validate optional parameters
  if (data.temperature !== undefined) {
    const temp = parseFloat(data.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      errors.push('Temperature must be between 0 and 2');
    }
  }

  if (data.maxTokens !== undefined) {
    const tokens = parseInt(data.maxTokens);
    if (isNaN(tokens) || tokens < 1 || tokens > 100000) {
      errors.push('Max tokens must be between 1 and 100,000');
    }
  }

  return errors;
}

async function testApiKey(platform, apiKey, model) {
  const platformConfig = SUPPORTED_PLATFORMS[platform];
  if (!platformConfig) {
    throw new Error('Unsupported platform');
  }

  try {
    let response;
    const headers = {};

    // Set up platform-specific headers and test requests
    switch (platform) {
      case 'openai':
      case 'deepseek':
        headers['Authorization'] = `Bearer ${apiKey}`;
        response = await fetch(platformConfig.testEndpoint, { headers });
        break;

      case 'anthropic':
        headers['x-api-key'] = apiKey;
        headers['Content-Type'] = 'application/json';
        headers['anthropic-version'] = '2023-06-01';
        
        // Test with a simple message
        response = await fetch(platformConfig.testEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        });
        break;

      case 'google':
        response = await fetch(`${platformConfig.testEndpoint}?key=${apiKey}`);
        break;

      case 'mistral':
      case 'perplexity':
      case 'cohere':
      case 'together':
        headers['Authorization'] = `Bearer ${apiKey}`;
        response = await fetch(platformConfig.testEndpoint, { headers });
        break;

      default:
        throw new Error('Platform test not implemented');
    }

    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'API key is valid' : `API test failed with status ${response.status}`
    };
  } catch (error) {
    return {
      success: false,
      message: `API test failed: ${error.message}`
    };
  }
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    const redis = await getRedisClient();

    switch (method) {
      case 'POST':
        const {
          name,
          platform,
          model,
          apiKey,
          temperature = 0.7,
          maxTokens = 4096,
          enabled = true,
          testKey = false
        } = req.body;

        // Validate input
        const validationErrors = validateAgentData(req.body);
        if (validationErrors.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validationErrors
          });
        }

        // Check for duplicate agent names
        const existingKeys = await redis.keys('enrolled:agent:*');
        for (const key of existingKeys) {
          const existingAgent = await redis.hGet(key, 'name');
          if (existingAgent === name.trim()) {
            return res.status(409).json({
              success: false,
              error: 'Agent name already exists',
              details: 'Please choose a different name for your agent'
            });
          }
        }

        // Test API key if requested
        let testResult = null;
        if (testKey) {
          testResult = await testApiKey(platform, apiKey, model);
          if (!testResult.success) {
            return res.status(400).json({
              success: false,
              error: 'API key test failed',
              details: testResult.message,
              testResult
            });
          }
        }

        // Generate unique agent ID
        const agentId = uuidv4();
        const agentKey = `enrolled:agent:${agentId}`;

        // Store agent data
        const agentData = {
          id: agentId,
          name: name.trim(),
          platform,
          model,
          apiKey,
          temperature: temperature.toString(),
          maxTokens: maxTokens.toString(),
          enabled: enabled.toString(),
          createdAt: new Date().toISOString(),
          totalRequests: '0'
        };

        await redis.hSet(agentKey, agentData);

        // Add to platform index
        await redis.sAdd(`platform:${platform}:agents`, agentId);

        // Add to enabled agents index if enabled
        if (enabled) {
          await redis.sAdd('agents:enabled', agentId);
        }

        res.status(201).json({
          success: true,
          message: 'Agent enrolled successfully',
          agent: {
            ...agentData,
            temperature: parseFloat(agentData.temperature),
            maxTokens: parseInt(agentData.maxTokens),
            enabled: agentData.enabled === 'true',
            totalRequests: parseInt(agentData.totalRequests)
          },
          testResult
        });
        break;

      default:
        res.setHeader('Allow', ['POST']);
        res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Agent enrollment API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}