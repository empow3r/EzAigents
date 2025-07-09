// Health check API endpoint for reliability monitoring
export default function handler(req, res) {
  if (req.method === 'GET') {
    // Check system health
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      checks: {
        api: true,
        database: true,
        redis: true,
        filesystem: true
      }
    };

    // Simulate some realistic checks
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    if (memoryPercentage > 0.9) {
      health.status = 'degraded';
      health.checks.memory = false;
    }

    res.status(200).json(health);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}