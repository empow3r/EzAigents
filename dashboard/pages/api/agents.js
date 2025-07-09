import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all agent keys
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

  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch agents',
      details: error.message 
    });
  }
}