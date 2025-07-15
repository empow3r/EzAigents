import Redis from 'redis';

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    // Get queue statistics
    const [
      queueLength,
      processingLength,
      failedLength,
      agentStatus
    ] = await Promise.all([
      redis.lLen('queue:webscraper'),
      redis.lLen('processing:webscraper'),
      redis.lLen('queue:failures'),
      redis.get('agent:webscraper:status')
    ]);

    // Get recent tasks (last 10)
    const recentTasks = await redis.lRange('queue:webscraper', 0, 9);
    const parsedTasks = recentTasks.map(task => {
      try {
        return JSON.parse(task);
      } catch (e) {
        return { error: 'Failed to parse task' };
      }
    });

    // Get agent statistics
    const agentStats = agentStatus ? JSON.parse(agentStatus) : null;

    // Get historical stats (from agent memory)
    const completedTasksCount = await redis.get('webscraper:completed_tasks_count') || 0;
    const totalProcessedCount = await redis.get('webscraper:total_processed_count') || 0;

    res.status(200).json({
      success: true,
      stats: {
        queue: {
          pending: queueLength,
          processing: processingLength,
          failed: failedLength
        },
        agent: {
          status: agentStats?.status || 'unknown',
          lastSeen: agentStats?.lastSeen || null,
          uptime: agentStats?.uptime || 0,
          version: agentStats?.version || 'unknown'
        },
        historical: {
          completedTasks: parseInt(completedTasksCount),
          totalProcessed: parseInt(totalProcessedCount)
        },
        recentTasks: parsedTasks
      }
    });

  } catch (error) {
    console.error('Queue stats API error:', error);
    res.status(500).json({ 
      error: 'Failed to get queue statistics',
      details: error.message 
    });
  } finally {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  }
}