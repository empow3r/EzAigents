export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mock vital metrics data - in production this would come from Redis/database
    const vitalMetrics = {
      // Token metrics
      totalTokens: Math.floor(Math.random() * 500000) + 1200000,
      tokensPerMinute: Math.floor(Math.random() * 5000) + 8000,
      inputTokens: Math.floor(Math.random() * 300000) + 600000,
      outputTokens: Math.floor(Math.random() * 200000) + 600000,
      
      // Cost metrics
      totalCost: (Math.random() * 50 + 25).toFixed(2),
      costPerHour: (Math.random() * 8 + 4).toFixed(2),
      costPerTask: (Math.random() * 0.5 + 0.1).toFixed(3),
      
      // Execution metrics
      avgExecutionTime: Math.floor(Math.random() * 45) + 15,
      totalExecutionTime: Math.floor(Math.random() * 12000) + 3600,
      fastestTask: Math.floor(Math.random() * 10) + 2,
      slowestTask: Math.floor(Math.random() * 300) + 120,
      
      // Resource metrics
      memoryUsage: Math.floor(Math.random() * 2048) + 1024,
      diskUsage: Math.floor(Math.random() * 50) + 25,
      networkBandwidth: Math.floor(Math.random() * 100) + 50,
      activeConnections: Math.floor(Math.random() * 50) + 25,
      
      // Performance metrics
      cpu: Math.floor(Math.random() * 30) + 45,
      memory: Math.floor(Math.random() * 20) + 60,
      disk: Math.floor(Math.random() * 15) + 35,
      network: Math.floor(Math.random() * 25) + 70,
      
      timestamp: new Date().toISOString()
    };

    res.status(200).json(vitalMetrics);
  } catch (error) {
    console.error('Error fetching vital metrics:', error);
    res.status(500).json({ error: 'Failed to fetch vital metrics' });
  }
}