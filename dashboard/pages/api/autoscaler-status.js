import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get autoscaler status from Redis
    const [
      performance,
      config,
      history,
      isRunning
    ] = await Promise.all([
      redis.get('autoscaler:performance'),
      redis.get('autoscaler:config'),
      redis.lrange('autoscaler:history', 0, 19), // Last 20 actions
      redis.get('autoscaler:running')
    ]);

    // Parse the data
    const performanceData = performance ? JSON.parse(performance) : {};
    const configData = config ? JSON.parse(config) : {
      minAgents: 1,
      maxAgents: 10,
      scaleUpThreshold: 20,
      scaleDownThreshold: 5,
      cooldownPeriod: 300,
      performanceWindow: 60,
      costOptimization: true
    };
    
    const historyData = history.map(item => {
      try {
        return JSON.parse(item);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    // Get current model status
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    const modelsStatus = {};
    
    for (const model of models) {
      const [queueDepth, processingCount, failedCount] = await Promise.all([
        redis.llen(`queue:${model}`),
        redis.llen(`processing:${model}`),
        redis.llen(`queue:${model}:failed`)
      ]);
      
      // Get agent count (this would need to be tracked by the autoscaler)
      const agentCount = await redis.get(`autoscaler:agents:${model}`) || 0;
      
      modelsStatus[model] = {
        agents: parseInt(agentCount),
        metrics: {
          queueDepth,
          processingCount,
          failedCount,
          totalLoad: queueDepth + processingCount
        }
      };
    }

    const status = {
      config: configData,
      performance: performanceData,
      history: historyData,
      models: modelsStatus,
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      status,
      isRunning: isRunning === 'true'
    });
  } catch (error) {
    console.error('Error fetching autoscaler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch autoscaler status'
    });
  }
}