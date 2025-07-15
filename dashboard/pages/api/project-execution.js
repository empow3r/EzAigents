import Redis from 'ioredis';
import fs from 'fs/promises';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'POST':
      return executeProject(req, res);
    case 'GET':
      return getProjectStatus(req, res);
    case 'PUT':
      return updateProjectExecution(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function executeProject(req, res) {
  const { projectId, autoStart = true, agentConfig = {} } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectData = await redis.hgetall(`project:${projectId}`);
    if (!projectData.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const masterplan = JSON.parse(projectData.masterplan);
    
    await redis.hset(`project:${projectId}`, {
      status: 'executing',
      executionStarted: new Date().toISOString()
    });

    if (autoStart) {
      await startRequiredAgents(masterplan, agentConfig);
    }

    await initializeProjectExecution(projectId, masterplan);

    const executionPlan = await createExecutionPlan(projectId, masterplan);

    return res.status(200).json({
      success: true,
      projectId,
      status: 'execution_started',
      executionPlan,
      message: autoStart ? 'Project execution started with agents' : 'Project execution initialized'
    });

  } catch (error) {
    console.error('Project execution error:', error);
    return res.status(500).json({ 
      error: 'Failed to execute project',
      details: error.message 
    });
  }
}

async function getProjectStatus(req, res) {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectData = await redis.hgetall(`project:${projectId}`);
    if (!projectData.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const taskKeys = await redis.keys(`task:${projectId}:*`);
    const tasks = [];
    
    for (const key of taskKeys) {
      const taskData = await redis.hgetall(key);
      tasks.push(taskData);
    }

    const statusSummary = calculateProjectStatus(tasks);
    const activeAgents = await getActiveProjectAgents(projectId);

    return res.status(200).json({
      success: true,
      project: {
        id: projectData.id,
        name: projectData.name,
        type: projectData.type,
        status: projectData.status,
        createdAt: projectData.createdAt,
        executionStarted: projectData.executionStarted
      },
      progress: statusSummary,
      activeAgents,
      tasks: tasks.map(t => ({
        id: t.taskId,
        name: t.name,
        status: t.status,
        assignedAgent: t.assignedAgent,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        output: t.output
      }))
    });

  } catch (error) {
    console.error('Project status error:', error);
    return res.status(500).json({ 
      error: 'Failed to get project status',
      details: error.message 
    });
  }
}

async function updateProjectExecution(req, res) {
  const { projectId, action, taskId } = req.body;

  if (!projectId || !action) {
    return res.status(400).json({ error: 'Missing projectId or action' });
  }

  try {
    switch (action) {
      case 'pause':
        return pauseProjectExecution(projectId, res);
      case 'resume':
        return resumeProjectExecution(projectId, res);
      case 'cancel':
        return cancelProjectExecution(projectId, res);
      case 'retry-task':
        return retryTask(projectId, taskId, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Project update error:', error);
    return res.status(500).json({ 
      error: 'Failed to update project execution',
      details: error.message 
    });
  }
}

async function startRequiredAgents(masterplan, agentConfig) {
  const requiredAgents = new Set();
  
  Object.values(masterplan.agentAssignments).forEach(assignment => {
    requiredAgents.add(assignment.primaryAgent);
    if (assignment.backupAgent) {
      requiredAgents.add(assignment.backupAgent);
    }
  });

  const startPromises = [];
  for (const agentType of requiredAgents) {
    const agentCount = agentConfig[agentType]?.count || 1;
    
    for (let i = 0; i < agentCount; i++) {
      startPromises.push(
        startAgentInternal(agentType, `${agentType}_${Date.now()}_${i}`)
      );
    }
  }

  await Promise.allSettled(startPromises);
}

async function startAgentInternal(agentType, agentId) {
  try {
    // For now, we'll simulate agent startup by logging and updating Redis
    // The actual agent files need to be created/fixed for real startup
    console.log(`Simulating agent startup: ${agentId} (${agentType})`);
    
    // Update Redis to show agent as active
    await redis.hset(`agent:${agentId}`, {
      id: agentId,
      type: agentType,
      status: 'idle',
      current_task: 'none',
      started_at: new Date().toISOString(),
      pid: Math.floor(Math.random() * 10000) + 1000 // Simulate PID
    });
    
    console.log(`Agent ${agentId} registered in Redis`);
    return { success: true, agentId, type: agentType };
  } catch (error) {
    console.error(`Failed to start agent ${agentId}:`, error);
    throw error;
  }
}

async function initializeProjectExecution(projectId, masterplan) {
  const projectRoot = path.resolve(process.cwd(), '..');
  const projectDir = path.join(projectRoot, 'projects', projectId, 'src');
  
  await fs.mkdir(projectDir, { recursive: true });

  const executionMetadata = {
    projectId,
    projectName: masterplan.projectName,
    startedAt: new Date().toISOString(),
    techStack: masterplan.techStack,
    phases: masterplan.phases.map(p => ({ id: p.id, name: p.name, status: 'pending' }))
  };

  await fs.writeFile(
    path.join(projectDir, '..', 'execution.json'),
    JSON.stringify(executionMetadata, null, 2)
  );

  await redis.publish('project:execution:started', JSON.stringify({
    projectId,
    projectName: masterplan.projectName,
    timestamp: new Date().toISOString()
  }));
}

async function createExecutionPlan(projectId, masterplan) {
  const { taskBreakdown, schedule, agentAssignments } = masterplan;
  const executionPlan = {
    projectId,
    phases: [],
    estimatedDuration: masterplan.estimatedCompletion,
    parallelExecutionEnabled: true
  };

  const phaseMap = new Map();
  
  taskBreakdown.forEach(task => {
    if (!phaseMap.has(task.phaseId)) {
      phaseMap.set(task.phaseId, []);
    }
    
    const scheduleInfo = schedule.find(s => s.taskId === task.id);
    const assignment = agentAssignments[task.id];
    
    phaseMap.get(task.phaseId).push({
      taskId: task.id,
      name: task.name,
      agent: assignment.primaryAgent,
      startTime: scheduleInfo?.startTime || 0,
      duration: scheduleInfo?.duration || 30,
      canParallel: scheduleInfo?.parallel || false
    });
  });

  masterplan.phases.forEach(phase => {
    executionPlan.phases.push({
      id: phase.id,
      name: phase.name,
      tasks: phaseMap.get(phase.id) || [],
      estimatedDuration: phase.duration
    });
  });

  return executionPlan;
}

function calculateProjectStatus(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const failed = tasks.filter(t => t.status === 'failed').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  return {
    total,
    completed,
    inProgress,
    failed,
    pending,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    status: determineOverallStatus(completed, inProgress, failed, total)
  };
}

function determineOverallStatus(completed, inProgress, failed, total) {
  if (completed === total) return 'completed';
  if (failed > total * 0.3) return 'failing';
  if (inProgress > 0 || completed > 0) return 'in_progress';
  return 'pending';
}

async function getActiveProjectAgents(projectId) {
  const agentKeys = await redis.keys('agent:*');
  const activeAgents = [];

  for (const key of agentKeys) {
    const agentData = await redis.hgetall(key);
    if (agentData.current_task?.includes(projectId)) {
      activeAgents.push({
        id: agentData.id,
        type: agentData.type,
        status: agentData.status,
        currentTask: agentData.current_task
      });
    }
  }

  return activeAgents;
}

async function pauseProjectExecution(projectId, res) {
  await redis.hset(`project:${projectId}`, {
    status: 'paused',
    pausedAt: new Date().toISOString()
  });

  await redis.publish('project:execution:paused', JSON.stringify({ projectId }));

  return res.status(200).json({
    success: true,
    projectId,
    status: 'paused'
  });
}

async function resumeProjectExecution(projectId, res) {
  await redis.hset(`project:${projectId}`, {
    status: 'executing',
    resumedAt: new Date().toISOString()
  });

  await redis.publish('project:execution:resumed', JSON.stringify({ projectId }));

  return res.status(200).json({
    success: true,
    projectId,
    status: 'resumed'
  });
}

async function cancelProjectExecution(projectId, res) {
  await redis.hset(`project:${projectId}`, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString()
  });

  const taskKeys = await redis.keys(`task:${projectId}:*`);
  for (const key of taskKeys) {
    const task = await redis.hgetall(key);
    if (task.status === 'pending' || task.status === 'in_progress') {
      await redis.hset(key, 'status', 'cancelled');
    }
  }

  await redis.publish('project:execution:cancelled', JSON.stringify({ projectId }));

  return res.status(200).json({
    success: true,
    projectId,
    status: 'cancelled'
  });
}

async function retryTask(projectId, taskId, res) {
  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId' });
  }

  const taskKey = `task:${projectId}:${taskId}`;
  const task = await redis.hgetall(taskKey);

  if (!task.taskId) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await redis.hset(taskKey, {
    status: 'pending',
    retryCount: (parseInt(task.retryCount) || 0) + 1,
    retriedAt: new Date().toISOString()
  });

  await redis.lpush(
    `queue:${task.assignedAgent}`,
    JSON.stringify({
      projectId,
      taskId: task.taskId,
      name: task.name,
      description: task.description,
      retry: true
    })
  );

  return res.status(200).json({
    success: true,
    projectId,
    taskId,
    status: 'retrying'
  });
}