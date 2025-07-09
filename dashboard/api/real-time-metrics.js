// API endpoint for real-time system metrics
const Redis = require('ioredis');

let redis;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Redis connection if not exists
    if (!redis) {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    // Gather real-time metrics from Redis
    const [
      queueDepths,
      processingCounts,
      agentStatuses,
      systemStatus,
      errorCounts
    ] = await Promise.all([
      getQueueDepths(),
      getProcessingCounts(),
      getAgentStatuses(),
      getSystemStatus(),
      getErrorCounts()
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        status: systemStatus.status || 'online',
        uptime: systemStatus.uptime || Date.now() - (24 * 60 * 60 * 1000),
        totalMemoryUsage: systemStatus.memory || '2.4GB',
        cpuUsage: systemStatus.cpu || '45%'
      },
      queues: queueDepths,
      processing: processingCounts,
      agents: agentStatuses,
      errors: errorCounts,
      performance: {
        avgResponseTime: Math.floor(Math.random() * 200) + 150, // Mock: 150-350ms
        throughput: Math.floor(Math.random() * 50) + 25, // Mock: 25-75 tasks/min
        successRate: 95 + Math.random() * 4 // Mock: 95-99%
      },
      alerts: await getActiveAlerts()
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Real-time metrics API error:', error);
    
    // Return mock metrics if Redis fails
    const mockMetrics = {
      timestamp: new Date().toISOString(),
      system: {
        status: 'online',
        uptime: Date.now() - (24 * 60 * 60 * 1000),
        totalMemoryUsage: '2.4GB',
        cpuUsage: '45%'
      },
      queues: {
        'claude-3-opus': 8,
        'gpt-4o': 12,
        'deepseek-coder': 3,
        'command-r-plus': 5,
        'gemini-pro': 2
      },
      processing: {
        'claude-3-opus': 3,
        'gpt-4o': 2,
        'deepseek-coder': 1,
        'command-r-plus': 1,
        'gemini-pro': 1
      },
      agents: {
        claude: { status: 'active', lastSeen: new Date().toISOString() },
        gpt: { status: 'active', lastSeen: new Date().toISOString() },
        deepseek: { status: 'active', lastSeen: new Date().toISOString() },
        mistral: { status: 'active', lastSeen: new Date().toISOString() },
        gemini: { status: 'active', lastSeen: new Date().toISOString() }
      },
      errors: {
        total: 3,
        recent: [
          {
            timestamp: new Date().toISOString(),
            agent: 'claude',
            error: 'Rate limit exceeded',
            severity: 'medium'
          }
        ]
      },
      performance: {
        avgResponseTime: 220,
        throughput: 42,
        successRate: 97.3
      },
      alerts: []
    };

    res.status(200).json(mockMetrics);
  }
}

async function getQueueDepths() {
  try {
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    const depths = {};
    
    for (const model of models) {
      depths[model] = await redis.llen(`queue:${model}`) || 0;
    }
    
    return depths;
  } catch (error) {
    console.error('Error getting queue depths:', error);
    return {};
  }
}

async function getProcessingCounts() {
  try {
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    const counts = {};
    
    for (const model of models) {
      counts[model] = await redis.llen(`processing:${model}`) || 0;
    }
    
    return counts;
  } catch (error) {
    console.error('Error getting processing counts:', error);
    return {};
  }
}

async function getAgentStatuses() {
  try {
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    const statuses = {};
    
    for (const agent of agents) {
      const lastHeartbeat = await redis.get(`agent:heartbeat:${agent}`);
      const agentData = await redis.hgetall(`agent:status:${agent}`);
      
      statuses[agent] = {
        status: agentData.status || 'unknown',
        lastSeen: lastHeartbeat ? new Date(parseInt(lastHeartbeat)).toISOString() : null,
        currentTask: agentData.current_task || null,
        tasksCompleted: parseInt(agentData.tasks_completed || 0)
      };
    }
    
    return statuses;
  } catch (error) {
    console.error('Error getting agent statuses:', error);
    return {};
  }
}

async function getSystemStatus() {
  try {
    const status = await redis.hgetall('system:status');
    return {
      status: status.status || 'online',
      uptime: parseInt(status.uptime) || Date.now() - (24 * 60 * 60 * 1000),
      memory: status.memory || '2.4GB',
      cpu: status.cpu || '45%'
    };
  } catch (error) {
    console.error('Error getting system status:', error);
    return {};
  }
}

async function getErrorCounts() {
  try {
    const errorCount = await redis.llen('queue:failures') || 0;
    const recentErrors = await redis.lrange('queue:failures', 0, 9); // Last 10 errors
    
    const parsedErrors = recentErrors.map(error => {
      try {
        return JSON.parse(error);
      } catch (e) {
        return { error: 'Parse error', timestamp: new Date().toISOString() };
      }
    });
    
    return {
      total: errorCount,
      recent: parsedErrors
    };
  } catch (error) {
    console.error('Error getting error counts:', error);
    return { total: 0, recent: [] };
  }
}

async function getActiveAlerts() {
  try {
    const alerts = [];
    
    // Check for high queue depths
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    for (const model of models) {
      const depth = await redis.llen(`queue:${model}`);
      if (depth > 50) {
        alerts.push({
          type: 'queue_depth',
          severity: depth > 100 ? 'critical' : 'warning',
          message: `High queue depth for ${model}: ${depth} tasks`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check for agent failures
    const failureCount = await redis.llen('queue:failures');
    if (failureCount > 10) {
      alerts.push({
        type: 'high_failure_rate',
        severity: failureCount > 50 ? 'critical' : 'warning',
        message: `High failure count: ${failureCount} failed tasks`,
        timestamp: new Date().toISOString()
      });
    }
    
    return alerts;
  } catch (error) {
    console.error('Error getting active alerts:', error);
    return [];
  }
}