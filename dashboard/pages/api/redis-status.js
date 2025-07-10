// API route for Redis connection status
import Redis from 'ioredis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Test Redis connection
    const pingResult = await redis.ping();
    
    // Get Redis info
    const info = await redis.info();
    const infoObj = {};
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        infoObj[key] = value;
      }
    });
    
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
      ping: pingResult,
      info: {
        redis_version: infoObj.redis_version,
        used_memory_human: infoObj.used_memory_human,
        connected_clients: infoObj.connected_clients,
        total_commands_processed: infoObj.total_commands_processed,
        keyspace_hits: infoObj.keyspace_hits,
        keyspace_misses: infoObj.keyspace_misses,
        uptime_in_seconds: infoObj.uptime_in_seconds
      },
      queues: queueStatus,
      agents: agentStatus,
      locks: lockStatus,
      totalKeys: Object.keys(queueStatus).length + Object.keys(agentStatus).length + Object.keys(lockStatus).length,
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