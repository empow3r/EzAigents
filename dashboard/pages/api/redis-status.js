// API route for Redis connection status
import Redis from 'ioredis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Test Redis connection
    await redis.ping();
    
    // Get queue lengths
    const queueKeys = await redis.keys('queue:*');
    const queueStatus = {};
    
    for (const key of queueKeys) {
      const queueName = key.replace('queue:', '');
      const length = await redis.llen(key);
      queueStatus[queueName] = length;
    }
    
    // Get agent status
    const agentKeys = await redis.keys('agent:*');
    const agentStatus = {};
    
    for (const key of agentKeys) {
      const agentData = await redis.hgetall(key);
      const agentId = key.replace('agent:', '');
      agentStatus[agentId] = {
        status: agentData.status,
        lastHeartbeat: agentData.last_heartbeat,
        currentTask: agentData.current_task
      };
    }
    
    // Get file locks
    const lockKeys = await redis.keys('lock:*');
    const lockStatus = {};
    
    for (const key of lockKeys) {
      const filePath = key.replace('lock:', '');
      const owner = await redis.get(key);
      const ttl = await redis.ttl(key);
      lockStatus[filePath] = { owner, ttl };
    }
    
    await redis.quit();
    
    res.status(200).json({
      connected: true,
      queues: queueStatus,
      agents: agentStatus,
      locks: lockStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Redis status error:', error);
    res.status(500).json({ 
      connected: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}