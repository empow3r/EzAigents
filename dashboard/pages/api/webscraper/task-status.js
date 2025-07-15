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

    const { taskId } = req.query;

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Get task status
    const taskData = await redis.get(`task:${taskId}`);
    
    if (!taskData) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = JSON.parse(taskData);

    // Check if result is available
    const resultKey = `task:${taskId}:result`;
    const resultData = await redis.get(resultKey);
    
    if (resultData) {
      const result = JSON.parse(resultData);
      task.status = 'completed';
      task.result = result;
      task.completedAt = result.timestamp;
    } else {
      // Check if task is in processing queue
      const processingTask = await redis.get(`processing:webscraper:${taskId}`);
      if (processingTask) {
        task.status = 'processing';
      }
    }

    // Check for errors
    const errorKey = `task:${taskId}:error`;
    const errorData = await redis.get(errorKey);
    
    if (errorData) {
      const error = JSON.parse(errorData);
      task.status = 'failed';
      task.error = error;
    }

    res.status(200).json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Task status API error:', error);
    res.status(500).json({ 
      error: 'Failed to get task status',
      details: error.message 
    });
  } finally {
    if (redis.isOpen) {
      await redis.disconnect();
    }
  }
}