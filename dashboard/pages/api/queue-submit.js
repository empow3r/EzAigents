import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue submission API for content generation and other tasks
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await submitToQueue(req, res);
      case 'GET':
        return await getQueueStatus(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Queue submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function submitToQueue(req, res) {
  const { queue, task, priority = 'normal' } = req.body;

  if (!queue || !task) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: queue, task'
    });
  }

  try {
    const taskId = uuidv4();
    const enhancedTask = {
      id: taskId,
      ...task,
      priority,
      submittedAt: Date.now(),
      status: 'queued'
    };

    // Submit to the specified queue
    const queueLength = await redis.lpush(queue, JSON.stringify(enhancedTask));
    
    // Track submission in analytics
    await redis.hincrby('queue:analytics', `${queue}:submissions`, 1);
    await redis.hincrby('queue:analytics', `${queue}:${priority}`, 1);
    
    // Store task metadata for tracking
    await redis.hset('queue:tasks', taskId, JSON.stringify({
      queue,
      task: enhancedTask,
      submittedAt: Date.now()
    }));

    // Set expiry for task metadata (7 days)
    await redis.expire('queue:tasks', 7 * 24 * 60 * 60);

    return res.json({
      success: true,
      taskId,
      queue,
      queueLength,
      message: 'Task submitted successfully',
      estimatedProcessingTime: getEstimatedProcessingTime(queue, queueLength)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to submit task to queue',
      details: error.message
    });
  }
}

async function getQueueStatus(req, res) {
  const { queue, taskId } = req.query;

  try {
    if (taskId) {
      // Get specific task status
      const taskData = await redis.hget('queue:tasks', taskId);
      if (!taskData) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      return res.json({
        success: true,
        task: JSON.parse(taskData)
      });
    }

    if (queue) {
      // Get queue statistics
      const queueLength = await redis.llen(queue);
      const analytics = await redis.hgetall('queue:analytics');
      
      return res.json({
        success: true,
        queue,
        length: queueLength,
        analytics: {
          submissions: parseInt(analytics[`${queue}:submissions`] || 0),
          highPriority: parseInt(analytics[`${queue}:high`] || 0),
          normalPriority: parseInt(analytics[`${queue}:normal`] || 0),
          lowPriority: parseInt(analytics[`${queue}:low`] || 0)
        },
        estimatedProcessingTime: getEstimatedProcessingTime(queue, queueLength)
      });
    }

    // Get all queue statuses
    const queues = [
      'queue:claude-3-opus',
      'queue:gpt-4',
      'queue:deepseek',
      'queue:mistral',
      'queue:gemini',
      'queue:webscraper'
    ];

    const queueStatuses = {};
    for (const queueName of queues) {
      const length = await redis.llen(queueName);
      queueStatuses[queueName] = {
        length,
        estimatedProcessingTime: getEstimatedProcessingTime(queueName, length)
      };
    }

    return res.json({
      success: true,
      queues: queueStatuses,
      totalTasks: Object.values(queueStatuses).reduce((sum, q) => sum + q.length, 0)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get queue status',
      details: error.message
    });
  }
}

function getEstimatedProcessingTime(queue, queueLength) {
  // Estimated processing times per task in seconds
  const processingTimes = {
    'queue:claude-3-opus': 45, // Claude is slower but more thorough
    'queue:gpt-4': 30,
    'queue:deepseek': 25,
    'queue:mistral': 20,
    'queue:gemini': 25,
    'queue:webscraper': 60 // Web scraping takes longer
  };

  const baseTime = processingTimes[queue] || 30;
  const totalTime = queueLength * baseTime;

  if (totalTime < 60) {
    return `${totalTime} seconds`;
  } else if (totalTime < 3600) {
    return `${Math.ceil(totalTime / 60)} minutes`;
  } else {
    return `${Math.ceil(totalTime / 3600)} hours`;
  }
}