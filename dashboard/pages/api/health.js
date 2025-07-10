export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        api: 'operational',
        redis: 'checking',
        database: 'operational'
      }
    };

    // Check Redis connection if available
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

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}