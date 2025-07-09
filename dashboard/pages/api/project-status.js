import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { project } = req.query;

  try {
    // Get project overview
    const overviewData = await redis.get(`project:${project}:overview`);
    const overview = overviewData ? JSON.parse(overviewData) : null;

    // Get task details
    const taskData = await redis.hgetall('dashboard:tasks');
    const tasks = Object.entries(taskData).map(([id, data]) => ({
      id,
      ...JSON.parse(data)
    }));

    // Get project status
    const statusData = await redis.hget('project:status', project);
    const status = statusData ? JSON.parse(statusData) : null;

    // Calculate metrics
    const metrics = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      queued: tasks.filter(t => t.status === 'queued' || t.status === 'pending').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      completionRate: tasks.length > 0 
        ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
        : 0
    };

    // Get recent activities (last 20)
    const activities = []; // Would be fetched from Redis pub/sub history

    res.status(200).json({
      project: project || 'dashboard-enhancement',
      overview,
      tasks,
      status,
      metrics,
      activities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching project status:', error);
    res.status(500).json({ error: 'Failed to fetch project status' });
  }
}