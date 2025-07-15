/**
 * API endpoint for individual agent management (GET, PUT, DELETE)
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

  try {
    const redis = await getRedisClient();

    switch (method) {
      case 'GET':
        // Get single agent details
        const agentKey = `enrolled:agent:${id}`;
        const agentData = await redis.hGetAll(agentKey);

        if (!agentData.id) {
          return res.status(404).json({
            success: false,
            error: 'Agent not found'
          });
        }

        // Get test history
        const testHistoryKey = `agent:${id}:tests`;
        const testHistory = await redis.lRange(testHistoryKey, 0, 4); // Last 5 tests
        const parsedTestHistory = testHistory.map(test => {
          try {
            return JSON.parse(test);
          } catch (e) {
            return null;
          }
        }).filter(Boolean);

        res.status(200).json({
          success: true,
          agent: {
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
            lastTested: agentData.lastTested || null,
            lastModified: agentData.lastModified || null,
            totalRequests: parseInt(agentData.totalRequests || 0)
          },
          testHistory: parsedTestHistory
        });
        break;

      case 'PUT':
        // Update agent configuration
        const updateKey = `enrolled:agent:${id}`;
        const existingData = await redis.hGetAll(updateKey);

        if (!existingData.id) {
          return res.status(404).json({
            success: false,
            error: 'Agent not found'
          });
        }

        const {
          name,
          model,
          apiKey,
          temperature,
          maxTokens
        } = req.body;

        const updates = {};
        
        if (name !== undefined) {
          if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Invalid name provided'
            });
          }
          
          // Check for duplicate names (excluding current agent)
          const allAgentKeys = await redis.keys('enrolled:agent:*');
          for (const key of allAgentKeys) {
            if (key !== updateKey) {
              const otherAgent = await redis.hGet(key, 'name');
              if (otherAgent === name.trim()) {
                return res.status(409).json({
                  success: false,
                  error: 'Agent name already exists'
                });
              }
            }
          }
          
          updates.name = name.trim();
        }

        if (model !== undefined) {
          if (!model || typeof model !== 'string') {
            return res.status(400).json({
              success: false,
              error: 'Invalid model provided'
            });
          }
          updates.model = model;
        }

        if (apiKey !== undefined) {
          if (!apiKey || typeof apiKey !== 'string') {
            return res.status(400).json({
              success: false,
              error: 'Invalid API key provided'
            });
          }
          updates.apiKey = apiKey;
        }

        if (temperature !== undefined) {
          const temp = parseFloat(temperature);
          if (isNaN(temp) || temp < 0 || temp > 2) {
            return res.status(400).json({
              success: false,
              error: 'Temperature must be between 0 and 2'
            });
          }
          updates.temperature = temp.toString();
        }

        if (maxTokens !== undefined) {
          const tokens = parseInt(maxTokens);
          if (isNaN(tokens) || tokens < 1 || tokens > 100000) {
            return res.status(400).json({
              success: false,
              error: 'Max tokens must be between 1 and 100,000'
            });
          }
          updates.maxTokens = tokens.toString();
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No valid updates provided'
          });
        }

        // Add timestamp
        updates.lastModified = new Date().toISOString();

        // Update the agent
        await redis.hSet(updateKey, updates);

        // Return updated agent data
        const updatedData = await redis.hGetAll(updateKey);
        res.status(200).json({
          success: true,
          message: 'Agent updated successfully',
          agent: {
            id: updatedData.id,
            name: updatedData.name,
            platform: updatedData.platform,
            model: updatedData.model,
            apiKey: updatedData.apiKey,
            temperature: parseFloat(updatedData.temperature || 0.7),
            maxTokens: parseInt(updatedData.maxTokens || 4096),
            enabled: updatedData.enabled === 'true',
            createdAt: updatedData.createdAt,
            lastModified: updatedData.lastModified,
            totalRequests: parseInt(updatedData.totalRequests || 0)
          }
        });
        break;

      case 'DELETE':
        // Delete agent
        const deleteKey = `enrolled:agent:${id}`;
        const agentToDelete = await redis.hGetAll(deleteKey);

        if (!agentToDelete.id) {
          return res.status(404).json({
            success: false,
            error: 'Agent not found'
          });
        }

        // Remove from all indexes
        await redis.del(deleteKey);
        await redis.sRem(`platform:${agentToDelete.platform}:agents`, id);
        await redis.sRem('agents:enabled', id);

        // Clean up related data
        await redis.del(`agent:${id}:tests`);

        // Log deletion
        const deleteLogEntry = {
          timestamp: new Date().toISOString(),
          action: 'deleted',
          agentId: id,
          agentName: agentToDelete.name,
          platform: agentToDelete.platform
        };

        await redis.lPush('agent:deletion:log', JSON.stringify(deleteLogEntry));
        await redis.lTrim('agent:deletion:log', 0, 49); // Keep last 50 deletions

        res.status(200).json({
          success: true,
          message: 'Agent deleted successfully',
          deletedAgent: {
            id,
            name: agentToDelete.name,
            platform: agentToDelete.platform
          }
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({
          success: false,
          error: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Agent management API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}