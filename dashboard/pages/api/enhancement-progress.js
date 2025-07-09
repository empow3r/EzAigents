import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get enhancement progress from Redis
    const progressKeys = await redis.keys('enhancement:progress:*');
    const progress = {};
    
    for (const key of progressKeys) {
      const enhancementId = key.replace('enhancement:progress:', '');
      const value = await redis.get(key);
      progress[enhancementId] = parseInt(value) || 0;
    }

    // Get task status
    const dashboardTasks = [
      { id: 'collaboration-hub', status: 'pending' },
      { id: 'predictive-analytics', status: 'pending' },
      { id: 'brain-visualizer', status: 'pending' },
      { id: 'voice-commands', status: 'pending' },
      { id: 'mobile-pwa', status: 'pending' },
      { id: 'team-competitions', status: 'pending' }
    ];

    const systemTasks = [
      { id: 'vault-client', status: 'pending' },
      { id: 'auth-service', status: 'pending' },
      { id: 'rbac-manager', status: 'pending' },
      { id: 'encryption-service', status: 'pending' },
      { id: 'telemetry', status: 'pending' },
      { id: 'metrics-collector', status: 'pending' },
      { id: 'queue-manager', status: 'pending' },
      { id: 'kafka-adapter', status: 'pending' },
      { id: 'orchestration-engine', status: 'pending' },
      { id: 'consensus-protocol', status: 'pending' },
      { id: 'k8s-operator', status: 'pending' },
      { id: 'health-checker', status: 'pending' }
    ];

    // Check actual task status from processing queues
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    
    for (const model of models) {
      const processingTasks = await redis.lrange(`processing:${model}`, 0, -1);
      const pendingTasks = await redis.lrange(`queue:${model}`, 0, -1);
      
      // Check processing tasks
      processingTasks.forEach(taskStr => {
        try {
          const task = JSON.parse(taskStr);
          const fileName = task.file?.split('/').pop()?.replace('.jsx', '').replace('.js', '');
          
          // Update dashboard task status
          const dashboardTask = dashboardTasks.find(t => 
            fileName?.toLowerCase().includes(t.id.replace('-', '')) ||
            task.file?.toLowerCase().includes(t.id.replace('-', ''))
          );
          if (dashboardTask) {
            dashboardTask.status = 'in_progress';
          }
          
          // Update system task status
          const systemTask = systemTasks.find(t => 
            fileName?.toLowerCase().includes(t.id.replace('-', '')) ||
            task.file?.toLowerCase().includes(t.id.replace('-', ''))
          );
          if (systemTask) {
            systemTask.status = 'in_progress';
          }
        } catch (e) {
          console.error('Error parsing processing task:', e);
        }
      });
      
      // Check pending tasks
      pendingTasks.forEach(taskStr => {
        try {
          const task = JSON.parse(taskStr);
          const fileName = task.file?.split('/').pop()?.replace('.jsx', '').replace('.js', '');
          
          // Update dashboard task status
          const dashboardTask = dashboardTasks.find(t => 
            fileName?.toLowerCase().includes(t.id.replace('-', '')) ||
            task.file?.toLowerCase().includes(t.id.replace('-', ''))
          );
          if (dashboardTask && dashboardTask.status === 'pending') {
            dashboardTask.status = 'queued';
          }
          
          // Update system task status
          const systemTask = systemTasks.find(t => 
            fileName?.toLowerCase().includes(t.id.replace('-', '')) ||
            task.file?.toLowerCase().includes(t.id.replace('-', ''))
          );
          if (systemTask && systemTask.status === 'pending') {
            systemTask.status = 'queued';
          }
        } catch (e) {
          console.error('Error parsing pending task:', e);
        }
      });
    }
    
    // Check for completed tasks in output directory
    try {
      const outputPath = '/Users/nathanhart/ClaudeCode/EzAigents/src/output';
      const fs = require('fs').promises;
      const outputFiles = await fs.readdir(outputPath).catch(() => []);
      
      outputFiles.forEach(fileName => {
        const cleanName = fileName.replace('.js', '').replace('.jsx', '').replace('.yaml', '');
        
        // Mark corresponding tasks as completed
        const dashboardTask = dashboardTasks.find(t => 
          cleanName.toLowerCase().includes(t.id.replace('-', ''))
        );
        if (dashboardTask) {
          dashboardTask.status = 'completed';
        }
        
        const systemTask = systemTasks.find(t => 
          cleanName.toLowerCase().includes(t.id.replace('-', ''))
        );
        if (systemTask) {
          systemTask.status = 'completed';
        }
      });
    } catch (e) {
      console.error('Error checking output files:', e);
    }

    res.status(200).json({
      success: true,
      progress: progress || {
        'security-layer': 0,
        'observability-stack': 0,
        'distributed-queue-system': 0,
        'intelligent-orchestration': 0,
        'collaboration-framework': 0,
        'self-healing-infrastructure': 0
      },
      tasks: {
        dashboard: dashboardTasks,
        system: systemTasks
      }
    });
  } catch (error) {
    console.error('Enhancement progress error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch enhancement progress' 
    });
  }
}