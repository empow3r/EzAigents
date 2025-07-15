import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  const { method, query } = req;
  
  try {
    switch (method) {
      case 'GET':
        if (query.type === 'prompts') {
          return await getPrompts(req, res);
        } else if (query.type === 'contexts') {
          return await getContexts(req, res);
        } else if (query.type === 'agents') {
          return await getAgentTemplates(req, res);
        }
        break;
        
      case 'POST':
        if (query.type === 'prompts') {
          return await createPrompt(req, res);
        } else if (query.type === 'contexts') {
          return await createContext(req, res);
        } else if (query.type === 'agents') {
          return await createAgent(req, res);
        }
        break;
        
      case 'PUT':
        if (query.type === 'prompts') {
          return await updatePrompt(req, res);
        } else if (query.type === 'contexts') {
          return await updateContext(req, res);
        } else if (query.type === 'agents') {
          return await updateAgent(req, res);
        }
        break;
        
      case 'DELETE':
        if (query.type === 'prompts') {
          return await deletePrompt(req, res);
        } else if (query.type === 'contexts') {
          return await deleteContext(req, res);
        } else if (query.type === 'agents') {
          return await deleteAgent(req, res);
        }
        break;
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in agent management API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Prompt Management
async function getPrompts(req, res) {
  const promptKeys = await redis.keys('prompt:*');
  const prompts = [];

  for (const key of promptKeys) {
    const promptData = await redis.hgetall(key);
    if (promptData.id) {
      prompts.push({
        id: promptData.id,
        name: promptData.name,
        description: promptData.description,
        content: promptData.content,
        category: promptData.category || 'general',
        tags: JSON.parse(promptData.tags || '[]'),
        created_at: promptData.created_at,
        updated_at: promptData.updated_at
      });
    }
  }

  res.status(200).json({ success: true, prompts });
}

async function createPrompt(req, res) {
  const { name, description, content, category, tags } = req.body;
  
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  const promptId = uuidv4();
  const promptData = {
    id: promptId,
    name,
    description: description || '',
    content,
    category: category || 'general',
    tags: JSON.stringify(tags || []),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await redis.hmset(`prompt:${promptId}`, promptData);
  
  res.status(201).json({ 
    success: true, 
    prompt: promptData,
    message: 'Prompt created successfully' 
  });
}

async function updatePrompt(req, res) {
  const { id } = req.query;
  const { name, description, content, category, tags } = req.body;
  
  const existingPrompt = await redis.hgetall(`prompt:${id}`);
  if (!existingPrompt.id) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  const updatedData = {
    ...existingPrompt,
    name: name || existingPrompt.name,
    description: description || existingPrompt.description,
    content: content || existingPrompt.content,
    category: category || existingPrompt.category,
    tags: JSON.stringify(tags || JSON.parse(existingPrompt.tags || '[]')),
    updated_at: new Date().toISOString()
  };

  await redis.hmset(`prompt:${id}`, updatedData);
  
  res.status(200).json({ 
    success: true, 
    prompt: updatedData,
    message: 'Prompt updated successfully' 
  });
}

async function deletePrompt(req, res) {
  const { id } = req.query;
  
  const exists = await redis.exists(`prompt:${id}`);
  if (!exists) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  await redis.del(`prompt:${id}`);
  
  res.status(200).json({ 
    success: true, 
    message: 'Prompt deleted successfully' 
  });
}

// Context Management
async function getContexts(req, res) {
  const contextKeys = await redis.keys('context:*');
  const contexts = [];

  for (const key of contextKeys) {
    const contextData = await redis.hgetall(key);
    if (contextData.id) {
      contexts.push({
        id: contextData.id,
        name: contextData.name,
        description: contextData.description,
        system_prompt: contextData.system_prompt,
        variables: JSON.parse(contextData.variables || '{}'),
        settings: JSON.parse(contextData.settings || '{}'),
        created_at: contextData.created_at,
        updated_at: contextData.updated_at
      });
    }
  }

  res.status(200).json({ success: true, contexts });
}

async function createContext(req, res) {
  const { name, description, system_prompt, variables, settings } = req.body;
  
  if (!name || !system_prompt) {
    return res.status(400).json({ error: 'Name and system prompt are required' });
  }

  const contextId = uuidv4();
  const contextData = {
    id: contextId,
    name,
    description: description || '',
    system_prompt,
    variables: JSON.stringify(variables || {}),
    settings: JSON.stringify(settings || {}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await redis.hmset(`context:${contextId}`, contextData);
  
  res.status(201).json({ 
    success: true, 
    context: contextData,
    message: 'Context created successfully' 
  });
}

async function updateContext(req, res) {
  const { id } = req.query;
  const { name, description, system_prompt, variables, settings } = req.body;
  
  const existingContext = await redis.hgetall(`context:${id}`);
  if (!existingContext.id) {
    return res.status(404).json({ error: 'Context not found' });
  }

  const updatedData = {
    ...existingContext,
    name: name || existingContext.name,
    description: description || existingContext.description,
    system_prompt: system_prompt || existingContext.system_prompt,
    variables: JSON.stringify(variables || JSON.parse(existingContext.variables || '{}')),
    settings: JSON.stringify(settings || JSON.parse(existingContext.settings || '{}')),
    updated_at: new Date().toISOString()
  };

  await redis.hmset(`context:${id}`, updatedData);
  
  res.status(200).json({ 
    success: true, 
    context: updatedData,
    message: 'Context updated successfully' 
  });
}

async function deleteContext(req, res) {
  const { id } = req.query;
  
  const exists = await redis.exists(`context:${id}`);
  if (!exists) {
    return res.status(404).json({ error: 'Context not found' });
  }

  await redis.del(`context:${id}`);
  
  res.status(200).json({ 
    success: true, 
    message: 'Context deleted successfully' 
  });
}

// Agent Template Management
async function getAgentTemplates(req, res) {
  const agentKeys = await redis.keys('agent-template:*');
  const agents = [];

  for (const key of agentKeys) {
    const agentData = await redis.hgetall(key);
    if (agentData.id) {
      agents.push({
        id: agentData.id,
        name: agentData.name,
        type: agentData.type,
        description: agentData.description,
        capabilities: JSON.parse(agentData.capabilities || '[]'),
        model: agentData.model,
        api_config: JSON.parse(agentData.api_config || '{}'),
        settings: JSON.parse(agentData.settings || '{}'),
        created_at: agentData.created_at,
        updated_at: agentData.updated_at
      });
    }
  }

  res.status(200).json({ success: true, agents });
}

async function createAgent(req, res) {
  const { name, type, description, capabilities, model, api_config, settings } = req.body;
  
  if (!name || !type || !model) {
    return res.status(400).json({ error: 'Name, type, and model are required' });
  }

  const agentId = uuidv4();
  const agentData = {
    id: agentId,
    name,
    type,
    description: description || '',
    capabilities: JSON.stringify(capabilities || []),
    model,
    api_config: JSON.stringify(api_config || {}),
    settings: JSON.stringify(settings || {}),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await redis.hmset(`agent-template:${agentId}`, agentData);
  
  res.status(201).json({ 
    success: true, 
    agent: agentData,
    message: 'Agent template created successfully' 
  });
}

async function updateAgent(req, res) {
  const { id } = req.query;
  const { name, type, description, capabilities, model, api_config, settings } = req.body;
  
  const existingAgent = await redis.hgetall(`agent-template:${id}`);
  if (!existingAgent.id) {
    return res.status(404).json({ error: 'Agent template not found' });
  }

  const updatedData = {
    ...existingAgent,
    name: name || existingAgent.name,
    type: type || existingAgent.type,
    description: description || existingAgent.description,
    capabilities: JSON.stringify(capabilities || JSON.parse(existingAgent.capabilities || '[]')),
    model: model || existingAgent.model,
    api_config: JSON.stringify(api_config || JSON.parse(existingAgent.api_config || '{}')),
    settings: JSON.stringify(settings || JSON.parse(existingAgent.settings || '{}')),
    updated_at: new Date().toISOString()
  };

  await redis.hmset(`agent-template:${id}`, updatedData);
  
  res.status(200).json({ 
    success: true, 
    agent: updatedData,
    message: 'Agent template updated successfully' 
  });
}

async function deleteAgent(req, res) {
  const { id } = req.query;
  
  const exists = await redis.exists(`agent-template:${id}`);
  if (!exists) {
    return res.status(404).json({ error: 'Agent template not found' });
  }

  await redis.del(`agent-template:${id}`);
  
  res.status(200).json({ 
    success: true, 
    message: 'Agent template deleted successfully' 
  });
}