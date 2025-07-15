import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get system health metrics
    const healthData = await calculateSystemHealth();
    
    res.status(200).json(healthData);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system health',
      health: 0,
      status: 'error'
    });
  }
}

async function calculateSystemHealth() {
  try {
    // Get Redis connection status
    const redisHealth = await checkRedisHealth();
    
    // Get agent status
    const agentHealth = await checkAgentHealth();
    
    // Get queue health
    const queueHealth = await checkQueueHealth();
    
    // Calculate overall health score (weighted average)
    const overallHealth = Math.round(
      (redisHealth.score * 0.3) + 
      (agentHealth.score * 0.4) + 
      (queueHealth.score * 0.3)
    );

    return {
      health: overallHealth,
      status: overallHealth >= 90 ? 'excellent' : 
              overallHealth >= 70 ? 'good' : 
              overallHealth >= 50 ? 'fair' : 'poor',
      components: {
        redis: redisHealth,
        agents: agentHealth,
        queues: queueHealth
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error calculating system health:', error);
    return {
      health: 0,
      status: 'error',
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function checkRedisHealth() {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    // Get Redis info
    const info = await redis.info();
    const memory = info.match(/used_memory:(\d+)/);
    const connections = info.match(/connected_clients:(\d+)/);
    
    let score = 100;
    
    // Deduct points for high latency
    if (latency > 100) score -= 20;
    else if (latency > 50) score -= 10;
    
    // Deduct points for high memory usage (over 1GB)
    const memoryMB = memory ? parseInt(memory[1]) / (1024 * 1024) : 0;
    if (memoryMB > 1024) score -= 15;
    else if (memoryMB > 512) score -= 5;
    
    // Deduct points for too many connections
    const clientCount = connections ? parseInt(connections[1]) : 0;
    if (clientCount > 100) score -= 10;
    else if (clientCount > 50) score -= 5;
    
    return {
      score: Math.max(0, score),
      latency,
      memory: memoryMB,
      connections: clientCount,
      status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
    };
  } catch (error) {
    return {
      score: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function checkAgentHealth() {
  try {
    // Get agent heartbeats
    const heartbeats = await redis.hgetall('agents:heartbeats');
    const registry = await redis.hgetall('agents:registry');
    
    const now = Date.now();
    const heartbeatThreshold = 120000; // 2 minutes
    
    let totalAgents = 0;
    let healthyAgents = 0;
    let activeAgents = 0;
    
    for (const [agentId, lastHeartbeat] of Object.entries(heartbeats)) {
      totalAgents++;
      const lastSeen = parseInt(lastHeartbeat);
      
      if (now - lastSeen < heartbeatThreshold) {
        healthyAgents++;
        
        // Check if agent is actively processing
        const agentInfo = registry[agentId];
        if (agentInfo) {
          const info = JSON.parse(agentInfo);
          if (info.status === 'active' || info.currentTask) {
            activeAgents++;
          }
        }
      }
    }
    
    let score = 100;
    
    if (totalAgents === 0) {
      score = 50; // No agents is concerning but not critical
    } else {
      const healthyRatio = healthyAgents / totalAgents;
      if (healthyRatio < 0.5) score = 20;
      else if (healthyRatio < 0.7) score = 50;
      else if (healthyRatio < 0.9) score = 80;
      
      // Bonus for having active agents
      if (activeAgents > 0) score = Math.min(100, score + 10);
    }
    
    return {
      score,
      totalAgents,
      healthyAgents,
      activeAgents,
      healthyRatio: totalAgents > 0 ? (healthyAgents / totalAgents) : 0,
      status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
    };
  } catch (error) {
    return {
      score: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function checkQueueHealth() {
  try {
    const queueNames = [
      'queue:claude-3-opus',
      'queue:gpt-4o', 
      'queue:deepseek-coder',
      'queue:command-r-plus',
      'queue:gemini-pro',
      'queue:webscraper'
    ];
    
    let totalPending = 0;
    let totalProcessing = 0;
    let totalFailed = 0;
    let queueStats = [];
    
    for (const queueName of queueNames) {
      const pending = await redis.llen(queueName);
      const processing = await redis.llen(`processing:${queueName.split(':')[1]}`);
      
      totalPending += pending;
      totalProcessing += processing;
      
      queueStats.push({
        name: queueName.split(':')[1],
        pending,
        processing
      });
    }
    
    // Check failed queue
    totalFailed = await redis.llen('queue:failures');
    
    let score = 100;
    
    // Deduct points for high queue backlogs
    if (totalPending > 1000) score -= 30;
    else if (totalPending > 500) score -= 20;
    else if (totalPending > 100) score -= 10;
    
    // Deduct points for failed tasks
    if (totalFailed > 50) score -= 20;
    else if (totalFailed > 20) score -= 10;
    else if (totalFailed > 5) score -= 5;
    
    // Deduct points if too many tasks are stuck in processing
    if (totalProcessing > totalPending * 2) score -= 15;
    
    return {
      score: Math.max(0, score),
      totalPending,
      totalProcessing,
      totalFailed,
      queueStats,
      status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical'
    };
  } catch (error) {
    return {
      score: 0,
      status: 'error',
      error: error.message
    };
  }
}