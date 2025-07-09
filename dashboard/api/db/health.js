// Database health check endpoint
export default function handler(req, res) {
  if (req.method === 'GET') {
    // Simulate database health check
    const dbHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: {
        active: 5,
        idle: 10,
        total: 15
      },
      queries: {
        slow: 0,
        failed: 0,
        total: 1247
      },
      latency: Math.random() * 50 + 5 // 5-55ms
    };

    // Simulate occasional issues
    if (Math.random() < 0.1) {
      dbHealth.status = 'degraded';
      dbHealth.message = 'Slow query detected';
    }

    res.status(200).json(dbHealth);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}