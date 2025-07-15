import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  const { method } = req;
  
  try {
    switch (method) {
      case 'GET':
        return await getActiveCollaborations(req, res);
        
      case 'POST':
        return await createCollaboration(req, res);
        
      case 'PUT':
        return await updateCollaboration(req, res);
        
      case 'DELETE':
        return await endCollaboration(req, res);
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in collaborations API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function getActiveCollaborations(req, res) {
  try {
    const collaborationKeys = await redis.keys('collaboration:*');
    const sessions = [];

    for (const key of collaborationKeys) {
      const sessionData = await redis.hgetall(key);
      if (sessionData.id && sessionData.status === 'active') {
        sessions.push({
          id: sessionData.id,
          objective: sessionData.objective,
          taskType: sessionData.taskType,
          agents: JSON.parse(sessionData.agents || '[]'),
          status: sessionData.status,
          progress: parseInt(sessionData.progress || '0'),
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          metrics: JSON.parse(sessionData.metrics || '{}')
        });
      }
    }

    // Sort by start time (most recent first)
    sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    res.status(200).json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error getting collaborations:', error);
    res.status(500).json({ error: 'Failed to get collaborations' });
  }
}

async function createCollaboration(req, res) {
  try {
    const { agentIds, taskType, objective, sessionType = 'collaboration' } = req.body;
    
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 agents required for collaboration' });
    }
    
    if (!taskType || !objective) {
      return res.status(400).json({ error: 'Task type and objective are required' });
    }

    const sessionId = uuidv4();
    const sessionData = {
      id: sessionId,
      objective,
      taskType,
      sessionType,
      agents: JSON.stringify(agentIds),
      status: 'active',
      progress: '0',
      startTime: new Date().toISOString(),
      endTime: null,
      metrics: JSON.stringify({
        tasksCompleted: 0,
        messagesExchanged: 0,
        efficiency: 0,
        collaborationScore: 0
      }),
      created_by: 'dashboard',
      created_at: new Date().toISOString()
    };

    await redis.hmset(`collaboration:${sessionId}`, sessionData);
    
    // Notify agents about the collaboration
    for (const agentId of agentIds) {
      await redis.publish(`agent:collaboration:${agentId}`, JSON.stringify({
        action: 'join_collaboration',
        sessionId,
        objective,
        taskType,
        otherAgents: agentIds.filter(id => id !== agentId)
      }));
    }

    // Update agent statuses
    for (const agentId of agentIds) {
      await redis.hset(`agent:${agentId}`, 'status', 'collaborating');
      await redis.hset(`agent:${agentId}`, 'collaboration_session', sessionId);
    }

    res.status(201).json({
      success: true,
      session: sessionData,
      message: 'Collaboration session created successfully'
    });
  } catch (error) {
    console.error('Error creating collaboration:', error);
    res.status(500).json({ error: 'Failed to create collaboration' });
  }
}

async function updateCollaboration(req, res) {
  try {
    const { sessionId, progress, metrics, status } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionKey = `collaboration:${sessionId}`;
    const existingSession = await redis.hgetall(sessionKey);
    
    if (!existingSession.id) {
      return res.status(404).json({ error: 'Collaboration session not found' });
    }

    const updates = {};
    
    if (progress !== undefined) {
      updates.progress = progress.toString();
    }
    
    if (metrics) {
      const currentMetrics = JSON.parse(existingSession.metrics || '{}');
      updates.metrics = JSON.stringify({ ...currentMetrics, ...metrics });
    }
    
    if (status) {
      updates.status = status;
      if (status === 'completed' || status === 'cancelled') {
        updates.endTime = new Date().toISOString();
        
        // Update agent statuses back to idle
        const agents = JSON.parse(existingSession.agents || '[]');
        for (const agentId of agents) {
          await redis.hset(`agent:${agentId}`, 'status', 'idle');
          await redis.hdel(`agent:${agentId}`, 'collaboration_session');
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await redis.hmset(sessionKey, updates);
    }

    res.status(200).json({
      success: true,
      message: 'Collaboration session updated successfully'
    });
  } catch (error) {
    console.error('Error updating collaboration:', error);
    res.status(500).json({ error: 'Failed to update collaboration' });
  }
}

async function endCollaboration(req, res) {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const sessionKey = `collaboration:${sessionId}`;
    const sessionData = await redis.hgetall(sessionKey);
    
    if (!sessionData.id) {
      return res.status(404).json({ error: 'Collaboration session not found' });
    }

    // Update session status
    await redis.hmset(sessionKey, {
      status: 'ended',
      endTime: new Date().toISOString()
    });

    // Update agent statuses
    const agents = JSON.parse(sessionData.agents || '[]');
    for (const agentId of agents) {
      await redis.hset(`agent:${agentId}`, 'status', 'idle');
      await redis.hdel(`agent:${agentId}`, 'collaboration_session');
      
      // Notify agents
      await redis.publish(`agent:collaboration:${agentId}`, JSON.stringify({
        action: 'end_collaboration',
        sessionId
      }));
    }

    res.status(200).json({
      success: true,
      message: 'Collaboration session ended successfully'
    });
  } catch (error) {
    console.error('Error ending collaboration:', error);
    res.status(500).json({ error: 'Failed to end collaboration' });
  }
}