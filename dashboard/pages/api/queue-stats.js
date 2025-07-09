import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    const queues = [];
    
    for (const model of models) {
      // Get pending tasks
      const pendingTasks = await redis.lrange(`queue:${model}`, 0, -1);
      const pending = pendingTasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (e) {
          return { file: 'Unknown', prompt: task };
        }
      });
      
      // Get processing tasks
      const processingTasks = await redis.lrange(`processing:${model}`, 0, -1);
      const processing = processingTasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (e) {
          return { file: 'Unknown', prompt: task };
        }
      });
      
      // Get failed tasks count
      const failedCount = await redis.llen(`queue:${model}:failed`);
      
      queues.push({
        model,
        pending,
        processing,
        pendingCount: pending.length,
        processingCount: processing.length,
        failedCount
      });
    }
    
    // Get enhancement queue stats
    const enhancementQueues = [
      'security-layer',
      'observability-stack',
      'distributed-queue-system',
      'intelligent-orchestration',
      'collaboration-framework',
      'self-healing-infrastructure'
    ];
    
    const enhancementStats = {};
    for (const enhancement of enhancementQueues) {
      const queueKey = `queue:enhancement:${enhancement}`;
      const count = await redis.llen(queueKey);
      enhancementStats[enhancement] = count;
    }
    
    res.status(200).json({
      success: true,
      queues,
      enhancementStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch queue statistics' 
    });
  }
}