export default async function handler(req, res) {
  const { method, query } = req;
  const { service } = query;

  try {
    switch (method) {
      case 'GET':
        if (service === 'redis') {
          return await checkRedisHealth(req, res);
        } else if (service === 'all') {
          return await checkAllServices(req, res);
        } else {
          return await basicHealthCheck(req, res);
        }
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Health API error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function basicHealthCheck(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      api: 'operational',
      redis: 'checking'
    }
  };

  // Quick Redis check
  if (process.env.REDIS_URL) {
    try {
      const redis = await import('ioredis').then(m => new m.default(process.env.REDIS_URL));
      await redis.ping();
      health.services.redis = 'operational';
      redis.disconnect();
    } catch (error) {
      health.services.redis = 'error';
      health.status = 'degraded';
    }
  } else {
    health.services.redis = 'not configured';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}

async function checkRedisHealth(req, res) {
  if (!process.env.REDIS_URL) {
    return res.status(503).json({
      status: 'error',
      service: 'redis',
      error: 'Redis URL not configured',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const redis = await import('ioredis').then(m => new m.default(process.env.REDIS_URL));
    
    // Comprehensive Redis checks
    const startTime = Date.now();
    await redis.ping();
    const pingTime = Date.now() - startTime;
    
    const info = await redis.info();
    const dbSize = await redis.dbsize();
    const memoryUsage = await redis.memory('usage');
    
    redis.disconnect();
    
    res.status(200).json({
      status: 'operational',
      service: 'redis',
      metrics: {
        pingTime: `${pingTime}ms`,
        dbSize,
        memoryUsage: `${Math.round(memoryUsage / 1024 / 1024)} MB`,
        info: info.split('\n').slice(0, 10).join('\n') // First 10 lines
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'redis',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function checkAllServices(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {}
  };

  // Check API
  health.services.api = {
    status: 'operational',
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  };

  // Check Redis
  if (process.env.REDIS_URL) {
    try {
      const redis = await import('ioredis').then(m => new m.default(process.env.REDIS_URL));
      const startTime = Date.now();
      await redis.ping();
      const pingTime = Date.now() - startTime;
      const dbSize = await redis.dbsize();
      
      health.services.redis = {
        status: 'operational',
        pingTime: `${pingTime}ms`,
        dbSize
      };
      redis.disconnect();
    } catch (error) {
      health.services.redis = {
        status: 'error',
        error: error.message
      };
      health.status = 'degraded';
    }
  } else {
    health.services.redis = {
      status: 'not configured'
    };
  }

  // Check OpenRouter API status
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'HEAD',
      timeout: 5000
    });
    health.services.openrouter = {
      status: response.ok ? 'operational' : 'degraded'
    };
  } catch (error) {
    health.services.openrouter = {
      status: 'error',
      error: 'API unreachable'
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}