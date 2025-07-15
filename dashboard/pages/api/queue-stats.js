import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue enhancer for priority stats - server-side only
let QueueEnhancer;
let queueEnhancer;

try {
  // Temporarily disabled due to Next.js module resolution issues
  // QueueEnhancer = require('../../../cli/queue-enhancer');
  // queueEnhancer = new QueueEnhancer(redis, {
  //   enableFeatures: {
  //     priorities: process.env.ENABLE_PRIORITIES !== 'false',
  //     analytics: true
  //   }
  // });
  console.log('Queue enhancer temporarily disabled - using legacy stats');
} catch (e) {
  console.log('Queue enhancer not available, using legacy stats');
}

export default async function handler(req, res) {
  const { method, query } = req;
  const { health } = query;

  try {
    switch (method) {
      case 'GET':
        if (health === 'true') {
          return await getQueueHealth(req, res);
        } else {
          return await getQueueStats(req, res);
        }
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Queue API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function getQueueStats(req, res) {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro', 'kimi-2'];
  const queues = [];
  
  for (const model of models) {
    const queueName = `queue:${model}`;
    let queueStats;
    
    // Try to get enhanced stats with priorities
    if (queueEnhancer) {
      try {
        queueStats = await queueEnhancer.getQueueStats(queueName);
      } catch (e) {
        console.log(`Enhanced stats failed for ${model}, falling back to legacy`);
        queueStats = null;
      }
    }
    
    // Fallback to legacy stats if enhanced not available
    if (!queueStats) {
      const pendingTasks = await redis.lrange(queueName, 0, -1);
      const pending = pendingTasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (e) {
          return { file: 'Unknown', prompt: task };
        }
      });
      
      const processingTasks = await redis.lrange(`processing:${model}`, 0, -1);
      const processing = processingTasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (e) {
          return { file: 'Unknown', prompt: task };
        }
      });
      
      const failedCount = await redis.llen(`queue:${model}:failed`);
      
      queueStats = {
        total: pending.length,
        byPriority: {
          normal: { pending: pending.length, color: '#059669' }
        },
        legacy: true,
        pendingTasks: pending,
        processingTasks: processing,
        failedCount
      };
    } else {
      // Get task details for enhanced stats
      const pendingTasks = [];
      const processingTasks = await redis.lrange(`processing:${model}`, 0, -1);
      const processing = processingTasks.map(task => {
        try {
          return JSON.parse(task);
        } catch (e) {
          return { file: 'Unknown', prompt: task };
        }
      });
      
      // Get tasks from priority queues
      for (const [priority, stats] of Object.entries(queueStats.byPriority || {})) {
        if (stats.pending > 0) {
          const priorityQueueName = `${queueName}:p:${priority}`;
          const tasks = await redis.lrange(priorityQueueName, 0, -1);
          const parsedTasks = tasks.map(task => {
            try {
              return { ...JSON.parse(task), priority };
            } catch (e) {
              return { file: 'Unknown', prompt: task, priority };
            }
          });
          pendingTasks.push(...parsedTasks);
        }
      }
      
      const failedCount = await redis.llen(`queue:${model}:failed`);
      
      queueStats.pendingTasks = pendingTasks;
      queueStats.processingTasks = processing;
      queueStats.failedCount = failedCount;
    }
    
    queues.push({
      model,
      pending: queueStats.pendingTasks || [],
      processing: queueStats.processingTasks || [],
      pendingCount: queueStats.total || 0,
      processingCount: (queueStats.processingTasks || []).length,
      failedCount: queueStats.failedCount || 0,
      byPriority: queueStats.byPriority || {},
      enhanced: !queueStats.legacy
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
}

async function getQueueHealth(req, res) {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro', 'kimi-2'];
  const health = {
    overall: 'healthy',
    issues: [],
    queues: {}
  };
  
  for (const model of models) {
    const pendingCount = await redis.llen(`queue:${model}`);
    const processingCount = await redis.llen(`processing:${model}`);
    const failedCount = await redis.llen(`queue:${model}:failed`);
    
    const queueHealth = {
      status: 'healthy',
      pendingCount,
      processingCount,
      failedCount,
      issues: []
    };
    
    // Check for health issues
    if (pendingCount > 50) {
      queueHealth.status = 'warning';
      queueHealth.issues.push('High pending task count');
      health.issues.push(`${model}: High pending task count (${pendingCount})`);
    }
    
    if (processingCount > 20) {
      queueHealth.status = 'warning';
      queueHealth.issues.push('High processing task count');
      health.issues.push(`${model}: High processing task count (${processingCount})`);
    }
    
    if (failedCount > 10) {
      queueHealth.status = 'critical';
      queueHealth.issues.push('High failed task count');
      health.issues.push(`${model}: High failed task count (${failedCount})`);
    }
    
    health.queues[model] = queueHealth;
    
    if (queueHealth.status === 'critical') {
      health.overall = 'critical';
    } else if (queueHealth.status === 'warning' && health.overall === 'healthy') {
      health.overall = 'warning';
    }
  }
  
  res.status(200).json({
    success: true,
    health,
    timestamp: new Date().toISOString()
  });
}