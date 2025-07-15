/**
 * API endpoint for toggling agent enabled/disabled status
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
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled field must be a boolean'
      });
    }

    // Get agent data
    const agentKey = `enrolled:agent:${id}`;
    const agentData = await redis.hGetAll(agentKey);

    if (!agentData.id) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    // Update enabled status
    await redis.hSet(agentKey, 'enabled', enabled.toString());
    await redis.hSet(agentKey, 'lastModified', new Date().toISOString());

    // Update enabled agents index
    if (enabled) {
      await redis.sAdd('agents:enabled', id);
    } else {
      await redis.sRem('agents:enabled', id);
    }

    // Log the status change
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: enabled ? 'enabled' : 'disabled',
      agentId: id,
      agentName: agentData.name,
      platform: agentData.platform
    };

    await redis.lPush('agent:status:log', JSON.stringify(logEntry));
    await redis.lTrim('agent:status:log', 0, 99); // Keep last 100 status changes

    res.status(200).json({
      success: true,
      message: `Agent ${enabled ? 'enabled' : 'disabled'} successfully`,
      agent: {
        id,
        name: agentData.name,
        platform: agentData.platform,
        enabled
      }
    });

  } catch (error) {
    console.error('Agent toggle API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}