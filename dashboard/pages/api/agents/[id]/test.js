/**
 * API endpoint for testing enrolled agent API keys
 */

import { createClient } from 'redis';

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

const PLATFORM_TEST_CONFIG = {
  openai: {
    testEndpoint: 'https://api.openai.com/v1/models',
    method: 'GET',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  },
  anthropic: {
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }),
    body: (model) => JSON.stringify({
      model: model,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    })
  },
  deepseek: {
    testEndpoint: 'https://api.deepseek.com/v1/models',
    method: 'GET',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  },
  google: {
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models',
    method: 'GET',
    headers: () => ({}),
    urlParams: (apiKey) => `?key=${apiKey}`
  },
  mistral: {
    testEndpoint: 'https://api.mistral.ai/v1/models',
    method: 'GET',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  },
  perplexity: {
    testEndpoint: 'https://api.perplexity.ai/models',
    method: 'GET',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  },
  cohere: {
    testEndpoint: 'https://api.cohere.ai/v1/models',
    method: 'GET',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  },
  together: {
    testEndpoint: 'https://api.together.xyz/models',
    method: 'GET',
    headers: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  }
};

async function testAgentApiKey(platform, apiKey, model) {
  const config = PLATFORM_TEST_CONFIG[platform];
  if (!config) {
    throw new Error(`Testing not supported for platform: ${platform}`);
  }

  try {
    const url = config.testEndpoint + (config.urlParams ? config.urlParams(apiKey) : '');
    const headers = config.headers(apiKey);
    
    const requestOptions = {
      method: config.method,
      headers
    };

    if (config.body && config.method === 'POST') {
      requestOptions.body = config.body(model);
    }

    const response = await fetch(url, requestOptions);
    
    let responseData = null;
    try {
      responseData = await response.json();
    } catch (e) {
      // Some APIs might not return JSON
    }

    const success = response.ok;
    let message = '';

    if (success) {
      message = 'API key is valid and working';
      
      // Platform-specific success messages
      switch (platform) {
        case 'openai':
        case 'deepseek':
        case 'mistral':
        case 'together':
          if (responseData?.data?.length) {
            message += ` (${responseData.data.length} models available)`;
          }
          break;
        case 'google':
          if (responseData?.models?.length) {
            message += ` (${responseData.models.length} models available)`;
          }
          break;
        case 'anthropic':
          if (response.status === 200) {
            message += ' (test message sent successfully)';
          }
          break;
      }
    } else {
      // Handle specific error cases
      switch (response.status) {
        case 401:
          message = 'Invalid API key or unauthorized access';
          break;
        case 403:
          message = 'API key does not have required permissions';
          break;
        case 429:
          message = 'Rate limit exceeded - API key is valid but throttled';
          break;
        case 404:
          message = 'API endpoint not found - check platform configuration';
          break;
        default:
          message = `API test failed with status ${response.status}`;
          if (responseData?.error?.message) {
            message += `: ${responseData.error.message}`;
          }
      }
    }

    return {
      success,
      status: response.status,
      message,
      responseData: success ? responseData : null,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      message: `Network error: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: `Method ${method} not allowed`
    });
  }

  try {
    const redis = await getRedisClient();
    
    // Get agent data
    const agentKey = `enrolled:agent:${id}`;
    const agentData = await redis.hGetAll(agentKey);

    if (!agentData.id) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Test the API key
    const testResult = await testAgentApiKey(
      agentData.platform,
      agentData.apiKey,
      agentData.model
    );

    // Store test result for history
    const testHistoryKey = `agent:${id}:tests`;
    await redis.lPush(testHistoryKey, JSON.stringify(testResult));
    await redis.lTrim(testHistoryKey, 0, 9); // Keep last 10 test results
    await redis.expire(testHistoryKey, 86400 * 7); // Expire after 1 week

    // Update agent last tested timestamp
    await redis.hSet(agentKey, 'lastTested', testResult.timestamp);

    res.status(200).json({
      success: testResult.success,
      message: testResult.message,
      testResult,
      agent: {
        id: agentData.id,
        name: agentData.name,
        platform: agentData.platform,
        model: agentData.model
      }
    });

  } catch (error) {
    console.error('Agent test API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}