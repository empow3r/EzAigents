import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Fetch recent agent activity from Redis lists
    const logKeys = await redis.keys('agent:log:*');
    const logs = [];
    
    for (const key of logKeys) {
      const agentName = key.replace('agent:log:', '');
      const recentLogs = await redis.lrange(key, 0, limit - 1);
      
      recentLogs.forEach(log => {
        try {
          const logData = JSON.parse(log);
          logs.push({
            agent: agentName,
            action: logData.action || 'Processing',
            file: logData.file || 'Unknown',
            timestamp: logData.timestamp || new Date().toISOString(),
            status: logData.status || 'info'
          });
        } catch (e) {
          // Handle non-JSON logs
          logs.push({
            agent: agentName,
            action: log,
            file: 'System',
            timestamp: new Date().toISOString(),
            status: 'info'
          });
        }
      });
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.status(200).json({
      success: true,
      logs: logs.slice(0, limit)
    });
  } catch (error) {
    console.error('Agent logs error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agent logs' 
    });
  }
}