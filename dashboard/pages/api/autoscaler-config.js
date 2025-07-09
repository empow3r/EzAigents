import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get current configuration
    try {
      const config = await redis.get('autoscaler:config');
      const configData = config ? JSON.parse(config) : {
        minAgents: 1,
        maxAgents: 10,
        scaleUpThreshold: 20,
        scaleDownThreshold: 5,
        cooldownPeriod: 300,
        performanceWindow: 60,
        costOptimization: true
      };

      res.status(200).json({
        success: true,
        config: configData
      });
    } catch (error) {
      console.error('Error fetching autoscaler config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch configuration'
      });
    }
  } else if (req.method === 'PUT') {
    // Update configuration
    try {
      const newConfig = req.body;
      
      // Validate configuration
      const validatedConfig = validateConfig(newConfig);
      
      // Store updated configuration
      await redis.set('autoscaler:config', JSON.stringify(validatedConfig));
      
      // Notify running autoscaler of config change
      await redis.publish('autoscaler:config-update', JSON.stringify(validatedConfig));
      
      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        config: validatedConfig
      });
    } catch (error) {
      console.error('Error updating autoscaler config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update configuration'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function validateConfig(config) {
  const validated = { ...config };
  
  // Validate numeric values
  if (validated.minAgents !== undefined) {
    validated.minAgents = Math.max(0, Math.min(100, parseInt(validated.minAgents)));
  }
  
  if (validated.maxAgents !== undefined) {
    validated.maxAgents = Math.max(1, Math.min(100, parseInt(validated.maxAgents)));
  }
  
  if (validated.scaleUpThreshold !== undefined) {
    validated.scaleUpThreshold = Math.max(1, Math.min(1000, parseInt(validated.scaleUpThreshold)));
  }
  
  if (validated.scaleDownThreshold !== undefined) {
    validated.scaleDownThreshold = Math.max(0, Math.min(1000, parseInt(validated.scaleDownThreshold)));
  }
  
  if (validated.cooldownPeriod !== undefined) {
    validated.cooldownPeriod = Math.max(30, Math.min(3600, parseInt(validated.cooldownPeriod)));
  }
  
  if (validated.performanceWindow !== undefined) {
    validated.performanceWindow = Math.max(10, Math.min(300, parseInt(validated.performanceWindow)));
  }
  
  // Ensure minAgents <= maxAgents
  if (validated.minAgents > validated.maxAgents) {
    validated.minAgents = validated.maxAgents;
  }
  
  // Ensure scaleDownThreshold <= scaleUpThreshold
  if (validated.scaleDownThreshold > validated.scaleUpThreshold) {
    validated.scaleDownThreshold = validated.scaleUpThreshold;
  }
  
  return validated;
}