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
        return res.status(400).json({ error: 'Invalid POST request' });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in agents API:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function getAllAgents(req, res) {
  try {
    // Get agents from the registry
    const registryData = await redis.hgetall('agents:registry');
    const agents = [];

    for (const [agentId, agentDataStr] of Object.entries(registryData)) {
      try {
        const agentData = JSON.parse(agentDataStr);
        
        if (agentData.agentId) {
          agents.push({
            id: agentData.agentId,
            type: agentData.agentType || 'unknown',
            status: agentData.status || 'unknown',
            capabilities: agentData.capabilities || [],
            current_task: agentData.currentTask || 'idle',
            last_heartbeat: agentData.lastHeartbeat,
            model: agentData.model || agentData.agentType || 'unknown',
            priority: agentData.priority || 'normal',
            uptime: agentData.uptime || 0,
            startTime: agentData.startTime,
            version: agentData.version
          });
        }
      } catch (e) {
        console.warn('Failed to parse agent data for', agentId, e.message);
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
  } catch (error) {
    console.error('Error in getAllAgents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      details: error.message
    });
  }
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
  try {
    const registryData = await redis.hgetall('agents:registry');
    const stats = {
      total: 0,
      active: 0,
      idle: 0,
      working: 0,
      types: {},
      totalRuns: 0,
      totalTokens: 0
    };

    for (const [agentId, agentDataStr] of Object.entries(registryData)) {
      try {
        const agentData = JSON.parse(agentDataStr);
        
        if (agentData.agentId) {
          stats.total++;
          
          if (agentData.status === 'active') {
            stats.active++;
            
            if (agentData.currentTask && agentData.currentTask !== 'idle') {
              stats.working++;
            } else {
              stats.idle++;
            }
          }

          // Count by type
          const type = agentData.agentType || 'unknown';
          stats.types[type] = (stats.types[type] || 0) + 1;

          // Aggregate performance data
          try {
            const performance = agentData.performance || {};
            stats.totalRuns += performance.total_runs || 0;
            stats.totalTokens += performance.total_tokens || 0;
          } catch (e) {
            // Ignore parsing errors
          }
        }
      } catch (e) {
        console.warn('Failed to parse agent data for stats', agentId, e.message);
      }
    }

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error in getAgentStats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent stats',
      details: error.message
    });
  }
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