import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  const { method, query } = req;
  const { id, action } = query;

  try {
    switch (method) {
      case 'GET':
        if (id) {
          // Get specific agent
          return await getAgent(req, res, id);
        } else if (query.stats === 'true') {
          // Get agent statistics
          return await getAgentStats(req, res);
        } else {
          // Get all agents
          return await getAllAgents(req, res);
        }
        
      case 'POST':
        if (action === 'control') {
          // Agent control (start/stop/restart)
          return await controlAgent(req, res);
        }
        break;
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in agents API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function getAllAgents(req, res) {
  const agentKeys = await redis.keys('agent:*');
  const agents = [];

  for (const key of agentKeys) {
    const agentData = await redis.hgetall(key);
    
    if (agentData.id && agentData.status === 'active') {
      agents.push({
        id: agentData.id,
        type: agentData.type || 'unknown',
        status: agentData.status,
        capabilities: JSON.parse(agentData.capabilities || '[]'),
        current_task: agentData.current_task || 'idle',
        last_heartbeat: agentData.last_heartbeat,
        model: agentData.model || 'unknown',
        priority: agentData.priority || 'normal'
      });
    }
  }

  // Sort by last heartbeat (most recent first)
  agents.sort((a, b) => {
    const aTime = new Date(a.last_heartbeat || 0).getTime();
    const bTime = new Date(b.last_heartbeat || 0).getTime();
    return bTime - aTime;
  });

  res.status(200).json({
    success: true,
    agents,
    count: agents.length
  });
}

async function getAgent(req, res, agentId) {
  const agentData = await redis.hgetall(`agent:${agentId}`);
  
  if (!agentData.id) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const agent = {
    id: agentData.id,
    type: agentData.type || 'unknown',
    status: agentData.status,
    capabilities: JSON.parse(agentData.capabilities || '[]'),
    current_task: agentData.current_task || 'idle',
    last_heartbeat: agentData.last_heartbeat,
    model: agentData.model || 'unknown',
    priority: agentData.priority || 'normal',
    performance: JSON.parse(agentData.performance || '{}')
  };

  res.status(200).json({
    success: true,
    agent
  });
}

async function getAgentStats(req, res) {
  const agentKeys = await redis.keys('agent:*');
  const stats = {
    total: 0,
    active: 0,
    idle: 0,
    working: 0,
    types: {},
    totalRuns: 0,
    totalTokens: 0
  };

  for (const key of agentKeys) {
    const agentData = await redis.hgetall(key);
    
    if (agentData.id) {
      stats.total++;
      
      if (agentData.status === 'active') {
        stats.active++;
        
        if (agentData.current_task && agentData.current_task !== 'idle') {
          stats.working++;
        } else {
          stats.idle++;
        }
      }

      // Count by type
      const type = agentData.type || 'unknown';
      stats.types[type] = (stats.types[type] || 0) + 1;

      // Aggregate performance data
      try {
        const performance = JSON.parse(agentData.performance || '{}');
        stats.totalRuns += performance.total_runs || 0;
        stats.totalTokens += performance.total_tokens || 0;
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  res.status(200).json({
    success: true,
    stats
  });
}

async function controlAgent(req, res) {
  const { agentId, action } = req.body;
  
  if (!agentId || !action) {
    return res.status(400).json({ error: 'Missing agentId or action' });
  }

  const validActions = ['start', 'stop', 'restart'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  // Send control command to agent
  await redis.publish(`agent:control:${agentId}`, JSON.stringify({ action }));
  
  res.status(200).json({
    success: true,
    message: `${action} command sent to agent ${agentId}`
  });
}