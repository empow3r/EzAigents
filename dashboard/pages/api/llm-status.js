// LLM Agent Status and Configuration API
import Redis from 'ioredis';
import axios from 'axios';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// LLM Configuration with test endpoints
const LLM_CONFIGS = {
  claude: {
    name: 'Claude (Anthropic)',
    apiKey: process.env.CLAUDE_API_KEY,
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    testMethod: 'POST',
    testHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    }),
    testPayload: {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }]
    },
    capabilities: ['architecture', 'refactoring', 'code_analysis', 'large_context'],
    dockerImage: 'ezaigents-claude'
  },
  openai: {
    name: 'OpenAI GPT',
    apiKey: process.env.OPENAI_API_KEY,
    testEndpoint: 'https://api.openai.com/v1/chat/completions',
    testMethod: 'POST',
    testHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    testPayload: {
      model: 'gpt-3.5-turbo',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }]
    },
    capabilities: ['backend_development', 'api_creation', 'general_coding'],
    dockerImage: 'ezaigents-gpt'
  },
  deepseek: {
    name: 'DeepSeek',
    apiKey: process.env.DEEPSEEK_API_KEYS?.split(',')[0],
    testEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    testMethod: 'POST',
    testHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    testPayload: {
      model: 'deepseek-coder',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }]
    },
    capabilities: ['testing', 'validation', 'code_review'],
    dockerImage: 'ezaigents-deepseek'
  },
  mistral: {
    name: 'Mistral AI',
    apiKey: process.env.MISTRAL_API_KEY,
    testEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    testMethod: 'POST',
    testHeaders: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    testPayload: {
      model: 'mistral-small-latest',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }]
    },
    capabilities: ['documentation', 'content_creation'],
    dockerImage: 'ezaigents-mistral'
  },
  gemini: {
    name: 'Google Gemini',
    apiKey: process.env.GEMINI_API_KEY,
    testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    testMethod: 'POST',
    testHeaders: (apiKey) => ({
      'Content-Type': 'application/json'
    }),
    testPayload: (apiKey) => ({
      contents: [{ parts: [{ text: 'test' }] }]
    }),
    testUrl: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    capabilities: ['code_analysis', 'multi_modal', 'research'],
    dockerImage: 'ezaigents-gemini'
  }
};

export default async function handler(req, res) {
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        if (query.test === 'all') {
          return await testAllLLMConnections(req, res);
        } else if (query.test) {
          return await testSingleLLM(req, res, query.test);
        } else {
          return await getLLMStatus(req, res);
        }
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in LLM status API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function getLLMStatus(req, res) {
  const llmStatus = {};
  
  for (const [key, config] of Object.entries(LLM_CONFIGS)) {
    const hasApiKey = !!config.apiKey && config.apiKey !== 'not_set';
    const agentData = await getAgentFromRedis(key);
    
    llmStatus[key] = {
      name: config.name,
      configured: hasApiKey,
      apiKeyStatus: hasApiKey ? 'present' : 'missing',
      capabilities: config.capabilities,
      dockerImage: config.dockerImage,
      agentStatus: agentData ? {
        id: agentData.id,
        status: agentData.status,
        lastHeartbeat: agentData.last_heartbeat,
        currentTask: agentData.current_task || 'idle'
      } : null,
      errors: []
    };

    // Add configuration errors
    if (!hasApiKey) {
      llmStatus[key].errors.push({
        type: 'configuration',
        message: `${config.name} API key not configured`,
        solution: `Set ${key.toUpperCase()}_API_KEY environment variable`
      });
    }

    // Check agent connectivity
    if (!agentData) {
      llmStatus[key].errors.push({
        type: 'connectivity',
        message: `${config.name} agent not found in Redis`,
        solution: 'Start the agent container or check agent registration'
      });
    } else if (agentData.status !== 'active') {
      llmStatus[key].errors.push({
        type: 'status',
        message: `${config.name} agent status: ${agentData.status}`,
        solution: 'Check agent logs and restart if necessary'
      });
    }
  }

  res.status(200).json({
    success: true,
    llmStatus,
    summary: {
      total: Object.keys(LLM_CONFIGS).length,
      configured: Object.values(llmStatus).filter(s => s.configured).length,
      active: Object.values(llmStatus).filter(s => s.agentStatus?.status === 'active').length,
      errors: Object.values(llmStatus).reduce((acc, s) => acc + s.errors.length, 0)
    }
  });
}

async function testSingleLLM(req, res, llmType) {
  const config = LLM_CONFIGS[llmType];
  if (!config) {
    return res.status(404).json({ error: 'LLM type not found' });
  }

  const result = await testLLMConnection(llmType, config);
  res.status(200).json({
    success: true,
    llmType,
    result
  });
}

async function testAllLLMConnections(req, res) {
  const results = {};
  
  for (const [key, config] of Object.entries(LLM_CONFIGS)) {
    results[key] = await testLLMConnection(key, config);
  }

  const summary = {
    total: Object.keys(results).length,
    working: Object.values(results).filter(r => r.status === 'success').length,
    failed: Object.values(results).filter(r => r.status === 'error').length
  };

  res.status(200).json({
    success: true,
    results,
    summary
  });
}

async function testLLMConnection(llmType, config) {
  const result = {
    name: config.name,
    status: 'unknown',
    responseTime: null,
    error: null,
    timestamp: new Date().toISOString()
  };

  if (!config.apiKey || config.apiKey === 'not_set') {
    result.status = 'error';
    result.error = 'API key not configured';
    return result;
  }

  try {
    const startTime = Date.now();
    
    // Prepare request
    let url = config.testEndpoint;
    let headers = config.testHeaders(config.apiKey);
    let payload = config.testPayload;

    // Special handling for Gemini
    if (llmType === 'gemini') {
      url = config.testUrl(config.apiKey);
      payload = config.testPayload(config.apiKey);
    }

    const response = await axios({
      method: config.testMethod,
      url,
      headers,
      data: payload,
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => status < 500 // Accept 4xx as non-network errors
    });

    const endTime = Date.now();
    result.responseTime = endTime - startTime;

    if (response.status >= 200 && response.status < 300) {
      result.status = 'success';
    } else if (response.status === 401) {
      result.status = 'error';
      result.error = 'Invalid API key';
    } else if (response.status === 429) {
      result.status = 'warning';
      result.error = 'Rate limited (API key works but quota exceeded)';
    } else {
      result.status = 'error';
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }

  } catch (error) {
    result.status = 'error';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      result.error = 'Network connection failed';
    } else if (error.response) {
      result.error = `HTTP ${error.response.status}: ${error.response.statusText}`;
    } else if (error.code === 'ECONNABORTED') {
      result.error = 'Request timeout';
    } else {
      result.error = error.message;
    }
  }

  return result;
}

async function getAgentFromRedis(agentType) {
  try {
    // Try different key patterns
    const patterns = [
      `agent:${agentType}-*`,
      `agents:heartbeats`,
      `agents:registry`
    ];

    for (const pattern of patterns) {
      if (pattern === 'agents:heartbeats' || pattern === 'agents:registry') {
        const data = await redis.hgetall(pattern);
        for (const [key, value] of Object.entries(data)) {
          try {
            const agentData = JSON.parse(value);
            if (agentData.agentType === agentType || key.includes(agentType)) {
              return {
                id: key,
                status: agentData.status || 'unknown',
                last_heartbeat: agentData.timestamp || agentData.lastSeen,
                current_task: agentData.currentTask || 'idle'
              };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      } else {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          const agentData = await redis.hgetall(keys[0]);
          if (agentData.id) {
            return agentData;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting agent data for ${agentType}:`, error);
    return null;
  }
}