/**
 * API endpoint for managing enrolled AI agents
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
  const { method } = req;

  try {
    const redis = await getRedisClient();

    switch (method) {
      case 'GET':
        // Get all enrolled agents
        const agentKeys = await redis.keys('enrolled:agent:*');
        const agents = [];

        for (const key of agentKeys) {
          try {
            const agentData = await redis.hGetAll(key);
            if (agentData.id) {
              agents.push({
                id: agentData.id,
                name: agentData.name,
                platform: agentData.platform,
                model: agentData.model,
                apiKey: agentData.apiKey,
                temperature: parseFloat(agentData.temperature || 0.7),
                maxTokens: parseInt(agentData.maxTokens || 4096),
                enabled: agentData.enabled === 'true',
                createdAt: agentData.createdAt,
                lastUsed: agentData.lastUsed || null,
                totalRequests: parseInt(agentData.totalRequests || 0)
              });
            }
          } catch (error) {
            console.error(`Error parsing agent data for ${key}:`, error);
          }
        }

        // Sort by creation date (newest first)
        agents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.status(200).json({
          success: true,
          agents,
          total: agents.length,
          byPlatform: agents.reduce((acc, agent) => {
            acc[agent.platform] = (acc[agent.platform] || 0) + 1;
            return acc;
          }, {}),
          enabled: agents.filter(a => a.enabled).length
        });
        break;

      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Enrolled agents API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}