import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue enhancer for control operations
let QueueEnhancer;
let queueEnhancer;

try {
  QueueEnhancer = require('../../../../cli/queue-enhancer');
  queueEnhancer = new QueueEnhancer(redis, {
    enableFeatures: {
      priorities: true,
      analytics: true
    }
  });
} catch (e) {
  console.log('Queue enhancer not available for control operations');
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await handleControlAction(req, res);
      case 'GET':
        return await getControlStatus(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Queue control error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function handleControlAction(req, res) {
  const { action, queue, taskId, priority, additionalContext } = req.body;

  switch (action) {
    case 'pause':
      return await pauseQueue(req, res);
    
    case 'resume':
      return await resumeQueue(req, res);
    
    case 'reprioritize':
      return await reprioritizeTask(req, res);
    
    case 'add_context':
      return await addAdditionalContext(req, res);
    
    case 'emergency_stop':
      return await emergencyStop(req, res);
    
    case 'requeue_failed':
      return await requeueFailedTasks(req, res);
    
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function pauseQueue(req, res) {
  const { queue } = req.body;
  
  try {
    // Set pause flag in Redis
    await redis.set(`queue:${queue}:paused`, 'true');
    await redis.set(`queue:${queue}:paused_at`, Date.now());
    
    // Broadcast pause message to agents
    await redis.publish('queue:control', JSON.stringify({
      action: 'pause',
      queue,
      timestamp: Date.now()
    }));
    
    return res.json({
      success: true,
      message: `Queue ${queue} paused successfully`,
      action: 'pause',
      queue
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
      details: error.message
    });
  }
}

async function resumeQueue(req, res) {
  const { queue } = req.body;
  
  try {
    // Remove pause flag
    await redis.del(`queue:${queue}:paused`);
    await redis.del(`queue:${queue}:paused_at`);
    
    // Broadcast resume message
    await redis.publish('queue:control', JSON.stringify({
      action: 'resume',
      queue,
      timestamp: Date.now()
    }));
    
    return res.json({
      success: true,
      message: `Queue ${queue} resumed successfully`,
      action: 'resume',
      queue
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
      details: error.message
    });
  }
}

async function reprioritizeTask(req, res) {
  const { queue, taskId, newPriority, reason } = req.body;
  
  try {
    // Find and remove task from current priority queue
    const priorities = ['critical', 'high', 'normal', 'low', 'deferred'];
    let task = null;
    let oldPriority = null;
    
    for (const priority of priorities) {
      const queueKey = `${queue}:p:${priority}`;
      const tasks = await redis.lrange(queueKey, 0, -1);
      
      for (let i = 0; i < tasks.length; i++) {
        try {
          const parsedTask = JSON.parse(tasks[i]);
          if (parsedTask.id === taskId) {
            task = parsedTask;
            oldPriority = priority;
            // Remove from current queue
            await redis.lrem(queueKey, 1, tasks[i]);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      if (task) break;
    }
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Update task priority and add to new queue
    task.priority = newPriority;
    task.reprioritized = true;
    task.reprioritizedAt = Date.now();
    task.reprioritizedReason = reason;
    task.oldPriority = oldPriority;
    
    const newQueueKey = `${queue}:p:${newPriority}`;
    await redis.lpush(newQueueKey, JSON.stringify(task));
    
    // Update priority set
    await redis.sadd(`${queue}:priorities`, newPriority);
    
    // Log reprioritization
    await redis.lpush('queue:reprioritizations', JSON.stringify({
      taskId,
      queue,
      oldPriority,
      newPriority,
      reason,
      timestamp: Date.now()
    }));
    
    return res.json({
      success: true,
      message: `Task ${taskId} reprioritized from ${oldPriority} to ${newPriority}`,
      action: 'reprioritize',
      taskId,
      oldPriority,
      newPriority,
      task
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to reprioritize task',
      details: error.message
    });
  }
}

async function addAdditionalContext(req, res) {
  const { queue, taskId, additionalContext, additionalPrompt } = req.body;
  
  try {
    // Find task across all priority queues
    const priorities = ['critical', 'high', 'normal', 'low', 'deferred'];
    let task = null;
    let queueKey = null;
    let taskIndex = -1;
    
    for (const priority of priorities) {
      const currentQueueKey = `${queue}:p:${priority}`;
      const tasks = await redis.lrange(currentQueueKey, 0, -1);
      
      for (let i = 0; i < tasks.length; i++) {
        try {
          const parsedTask = JSON.parse(tasks[i]);
          if (parsedTask.id === taskId) {
            task = parsedTask;
            queueKey = currentQueueKey;
            taskIndex = i;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      if (task) break;
    }
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Add additional context
    task.additionalContext = additionalContext;
    if (additionalPrompt) {
      task.prompt = task.prompt + '\n\nAdditional Context:\n' + additionalPrompt;
    }
    task.contextAdded = true;
    task.contextAddedAt = Date.now();
    
    // Update task in queue
    await redis.lset(queueKey, taskIndex, JSON.stringify(task));
    
    // Log context addition
    await redis.lpush('queue:context_additions', JSON.stringify({
      taskId,
      queue,
      additionalContext,
      additionalPrompt,
      timestamp: Date.now()
    }));
    
    return res.json({
      success: true,
      message: `Additional context added to task ${taskId}`,
      action: 'add_context',
      taskId,
      task
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to add context to task',
      details: error.message
    });
  }
}

async function emergencyStop(req, res) {
  const { reason } = req.body;
  
  try {
    // Set global emergency stop
    await redis.set('queue:emergency_stop', 'true');
    await redis.set('queue:emergency_stop_reason', reason || 'Manual emergency stop');
    await redis.set('queue:emergency_stop_at', Date.now());
    
    // Broadcast emergency stop to all agents
    await redis.publish('queue:emergency', JSON.stringify({
      action: 'emergency_stop',
      reason,
      timestamp: Date.now()
    }));
    
    return res.json({
      success: true,
      message: 'Emergency stop activated',
      action: 'emergency_stop',
      reason
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to activate emergency stop',
      details: error.message
    });
  }
}

async function requeueFailedTasks(req, res) {
  const { queue } = req.body;
  
  try {
    const failedTasks = await redis.lrange(`queue:${queue}:failed`, 0, -1);
    let requeuedCount = 0;
    
    for (const taskStr of failedTasks) {
      try {
        const task = JSON.parse(taskStr);
        
        // Reset task status
        task.retryCount = (task.retryCount || 0) + 1;
        task.requeuedAt = Date.now();
        delete task.error;
        delete task.failedAt;
        
        // Re-enqueue with original priority
        if (queueEnhancer) {
          await queueEnhancer.enqueue(queue, task, { priority: task.priority });
        } else {
          await redis.lpush(queue, JSON.stringify(task));
        }
        
        // Remove from failed queue
        await redis.lrem(`queue:${queue}:failed`, 1, taskStr);
        requeuedCount++;
      } catch (e) {
        console.error('Failed to requeue task:', e);
      }
    }
    
    return res.json({
      success: true,
      message: `Requeued ${requeuedCount} failed tasks`,
      action: 'requeue_failed',
      queue,
      requeuedCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to requeue tasks',
      details: error.message
    });
  }
}

async function getControlStatus(req, res) {
  try {
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    const status = {
      emergencyStop: await redis.get('queue:emergency_stop') === 'true',
      emergencyStopReason: await redis.get('queue:emergency_stop_reason'),
      queues: {}
    };
    
    for (const model of models) {
      const queueKey = `queue:${model}`;
      const paused = await redis.get(`${queueKey}:paused`) === 'true';
      const pausedAt = await redis.get(`${queueKey}:paused_at`);
      
      status.queues[model] = {
        paused,
        pausedAt: pausedAt ? parseInt(pausedAt) : null,
        pausedDuration: paused && pausedAt ? Date.now() - parseInt(pausedAt) : 0
      };
    }
    
    // Get recent control actions
    const recentReprioritizations = await redis.lrange('queue:reprioritizations', 0, 9);
    const recentContextAdditions = await redis.lrange('queue:context_additions', 0, 9);
    
    status.recentActions = {
      reprioritizations: recentReprioritizations.map(item => {
        try {
          return JSON.parse(item);
        } catch (e) {
          return null;
        }
      }).filter(Boolean),
      contextAdditions: recentContextAdditions.map(item => {
        try {
          return JSON.parse(item);
        } catch (e) {
          return null;
        }
      }).filter(Boolean)
    };
    
    return res.json({
      success: true,
      status
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get control status',
      details: error.message
    });
  }
}