import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Load enhancement tasks configuration
const enhancementTasksPath = path.join(process.cwd(), '../shared/enhancement-tasks.json');
let enhancementTasks = {};

try {
  const data = fs.readFileSync(enhancementTasksPath, 'utf-8');
  enhancementTasks = JSON.parse(data);
} catch (error) {
  console.error('Failed to load enhancement tasks:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const enhancements = {};
    const taskDetails = {};

    // Get status for each enhancement
    for (const [enhancementId, enhancement] of Object.entries(enhancementTasks.enhancements)) {
      // Get Redis status
      const status = await redis.hgetall(`enhancement:${enhancementId}`);
      
      // Initialize enhancement data
      enhancements[enhancementId] = {
        title: enhancement.title,
        priority: enhancement.priority,
        totalTasks: enhancement.tasks.length,
        completedTasks: 0,
        processing: 0,
        queued: 0,
        errors: 0,
        status: status.status || 'pending',
        dispatchedAt: status.dispatched_at,
        ...status
      };

      // Check task status
      taskDetails[enhancementId] = [];
      
      for (const task of enhancement.tasks) {
        const taskStatus = await getTaskStatus(task, enhancementId);
        taskDetails[enhancementId].push(taskStatus);
        
        // Update counters
        switch (taskStatus.status) {
          case 'completed':
            enhancements[enhancementId].completedTasks++;
            break;
          case 'processing':
            enhancements[enhancementId].processing++;
            break;
          case 'queued':
            enhancements[enhancementId].queued++;
            break;
          case 'error':
            enhancements[enhancementId].errors++;
            break;
        }
      }
    }

    // Get queue statistics
    const queueStats = await getQueueStatistics();

    res.status(200).json({
      enhancements,
      taskDetails,
      queueStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching enhancement status:', error);
    res.status(500).json({ error: 'Failed to fetch enhancement status' });
  }
}

async function getTaskStatus(task, enhancementId) {
  const model = getModelForAgent(task.agent);
  const taskInfo = {
    file: task.file,
    agent: task.agent,
    model: model,
    status: 'pending'
  };

  // Check if file exists (task completed)
  const filePath = path.join(process.cwd(), '..', task.file);
  if (fs.existsSync(filePath)) {
    taskInfo.status = 'completed';
    const stats = fs.statSync(filePath);
    taskInfo.completedAt = stats.mtime.toISOString();
    return taskInfo;
  }

  // Check if task is in processing queue
  const processingItems = await redis.lrange(`processing:${model}`, 0, -1);
  for (const item of processingItems) {
    try {
      const job = JSON.parse(item);
      if (job.file === task.file && job.enhancement_id === enhancementId) {
        taskInfo.status = 'processing';
        taskInfo.startedAt = job.timestamp;
        return taskInfo;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // Check if task is in queue
  const queueItems = await redis.lrange(`queue:${model}`, 0, -1);
  for (const item of queueItems) {
    try {
      const job = JSON.parse(item);
      if (job.file === task.file && job.enhancement_id === enhancementId) {
        taskInfo.status = 'queued';
        taskInfo.queuedAt = job.timestamp;
        return taskInfo;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // Check failure queue
  const failures = await redis.lrange('queue:failures', 0, -1);
  for (const item of failures) {
    try {
      const failure = JSON.parse(item);
      if (failure.job && failure.job.file === task.file && failure.job.enhancement_id === enhancementId) {
        taskInfo.status = 'error';
        taskInfo.error = failure.error;
        taskInfo.failedAt = failure.timestamp;
        return taskInfo;
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  return taskInfo;
}

async function getQueueStatistics() {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  const stats = {};

  for (const model of models) {
    stats[model] = {
      queued: await redis.llen(`queue:${model}`),
      processing: await redis.llen(`processing:${model}`)
    };
  }

  stats.failures = await redis.llen('queue:failures');
  
  return stats;
}

function getModelForAgent(agentType) {
  const agentModelMap = {
    'claude': 'claude-3-opus',
    'gpt': 'gpt-4o',
    'deepseek': 'deepseek-coder',
    'mistral': 'command-r-plus',
    'gemini': 'gemini-pro'
  };
  return agentModelMap[agentType] || 'gpt-4o';
}