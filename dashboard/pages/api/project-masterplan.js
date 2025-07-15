import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    projectName, 
    projectType, 
    description, 
    features,
    timeline,
    budget,
    techStack 
  } = req.body;

  if (!projectName || !projectType || !description) {
    return res.status(400).json({ 
      error: 'Missing required fields: projectName, projectType, description' 
    });
  }

  try {
    const projectId = uuidv4();
    const masterplan = await generateMasterplan({
      projectId,
      projectName,
      projectType,
      description,
      features: features || [],
      timeline: timeline || '24 hours',
      budget: budget || 'efficient',
      techStack: techStack || []
    });

    await saveMasterplan(projectId, masterplan);
    await createInitialTasks(projectId, masterplan);

    return res.status(200).json({
      success: true,
      projectId,
      masterplan
    });

  } catch (error) {
    console.error('Masterplan generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate masterplan',
      details: error.message 
    });
  }
}

async function generateMasterplan(projectData) {
  const { 
    projectId, 
    projectName, 
    projectType, 
    description, 
    features, 
    timeline,
    budget,
    techStack 
  } = projectData;

  const phases = generateProjectPhases(projectType, features);
  const taskBreakdown = generateTaskBreakdown(phases, features);
  const agentAssignments = assignAgentsToTasks(taskBreakdown);
  const schedule = generateSchedule(taskBreakdown, timeline);

  return {
    projectId,
    projectName,
    projectType,
    description,
    features,
    timeline,
    budget,
    techStack: determineTechStack(projectType, techStack),
    phases,
    taskBreakdown,
    agentAssignments,
    schedule,
    estimatedCompletion: calculateEstimatedCompletion(taskBreakdown),
    createdAt: new Date().toISOString()
  };
}

function generateProjectPhases(projectType, features) {
  const basePhases = [
    {
      id: 'phase-1',
      name: 'Project Setup & Architecture',
      description: 'Initialize project, set up development environment, and design architecture',
      duration: '2 hours'
    },
    {
      id: 'phase-2',
      name: 'Core Infrastructure',
      description: 'Build foundational components, database schema, and API structure',
      duration: '4 hours'
    },
    {
      id: 'phase-3',
      name: 'Feature Implementation',
      description: 'Implement main features and business logic',
      duration: '8 hours'
    },
    {
      id: 'phase-4',
      name: 'Frontend Development',
      description: 'Create user interface and connect to backend',
      duration: '6 hours'
    },
    {
      id: 'phase-5',
      name: 'Testing & Optimization',
      description: 'Write tests, optimize performance, and fix bugs',
      duration: '3 hours'
    },
    {
      id: 'phase-6',
      name: 'Deployment & Documentation',
      description: 'Deploy to production and create documentation',
      duration: '1 hour'
    }
  ];

  return customizePhases(basePhases, projectType, features);
}

function customizePhases(basePhases, projectType, features) {
  const customPhases = [...basePhases];

  if (projectType === 'marketplace' || projectType === 'ecommerce') {
    customPhases.splice(3, 0, {
      id: 'phase-3a',
      name: 'Payment Integration',
      description: 'Integrate payment processing and order management',
      duration: '3 hours'
    });
  }

  if (features.includes('ai') || features.includes('ml')) {
    customPhases.splice(4, 0, {
      id: 'phase-4a',
      name: 'AI/ML Integration',
      description: 'Integrate AI models and ML pipelines',
      duration: '4 hours'
    });
  }

  return customPhases;
}

function generateTaskBreakdown(phases, features) {
  const tasks = [];
  let taskId = 1;

  phases.forEach(phase => {
    const phaseTasks = generatePhaseTasks(phase, features);
    phaseTasks.forEach(task => {
      tasks.push({
        id: `task-${taskId++}`,
        phaseId: phase.id,
        name: task.name,
        description: task.description,
        estimatedTime: task.time,
        dependencies: task.dependencies || [],
        priority: task.priority || 'medium',
        type: task.type
      });
    });
  });

  return tasks;
}

function generatePhaseTasks(phase, features) {
  const taskTemplates = {
    'phase-1': [
      { name: 'Initialize Git repository', description: 'Set up version control', time: '5m', type: 'setup' },
      { name: 'Create project structure', description: 'Set up directory structure and boilerplate', time: '15m', type: 'setup' },
      { name: 'Design system architecture', description: 'Create architecture diagrams and technical spec', time: '30m', type: 'architecture' },
      { name: 'Set up development environment', description: 'Configure Docker, environment variables', time: '20m', type: 'setup' },
      { name: 'Initialize package managers', description: 'Set up npm/yarn and dependencies', time: '10m', type: 'setup' }
    ],
    'phase-2': [
      { name: 'Design database schema', description: 'Create database models and relationships', time: '45m', type: 'backend' },
      { name: 'Set up API framework', description: 'Initialize Express/FastAPI/etc', time: '30m', type: 'backend' },
      { name: 'Create authentication system', description: 'Implement user auth and JWT', time: '1h', type: 'backend' },
      { name: 'Build core API endpoints', description: 'Create CRUD operations', time: '1.5h', type: 'backend' },
      { name: 'Set up Redis for caching', description: 'Configure Redis and caching layer', time: '30m', type: 'backend' }
    ],
    'phase-3': [
      { name: 'Implement business logic', description: 'Core feature implementation', time: '3h', type: 'backend' },
      { name: 'Create data models', description: 'Implement domain models', time: '1h', type: 'backend' },
      { name: 'Build service layer', description: 'Create business services', time: '2h', type: 'backend' },
      { name: 'Implement validation', description: 'Add input validation and sanitization', time: '1h', type: 'backend' },
      { name: 'Create background jobs', description: 'Set up job queues and workers', time: '1h', type: 'backend' }
    ],
    'phase-4': [
      { name: 'Set up frontend framework', description: 'Initialize React/Vue/Angular', time: '30m', type: 'frontend' },
      { name: 'Create component library', description: 'Build reusable UI components', time: '2h', type: 'frontend' },
      { name: 'Implement routing', description: 'Set up client-side routing', time: '30m', type: 'frontend' },
      { name: 'Build main pages', description: 'Create primary application pages', time: '2h', type: 'frontend' },
      { name: 'Connect to backend API', description: 'Integrate frontend with backend', time: '1h', type: 'frontend' }
    ],
    'phase-5': [
      { name: 'Write unit tests', description: 'Create unit test suite', time: '1h', type: 'testing' },
      { name: 'Write integration tests', description: 'Create integration test suite', time: '1h', type: 'testing' },
      { name: 'Performance optimization', description: 'Optimize queries and bundle size', time: '45m', type: 'optimization' },
      { name: 'Security audit', description: 'Review and fix security issues', time: '15m', type: 'security' }
    ],
    'phase-6': [
      { name: 'Create deployment config', description: 'Set up CI/CD pipeline', time: '20m', type: 'devops' },
      { name: 'Deploy to staging', description: 'Deploy and test in staging', time: '20m', type: 'devops' },
      { name: 'Write documentation', description: 'Create README and API docs', time: '20m', type: 'documentation' }
    ]
  };

  return taskTemplates[phase.id] || [];
}

function assignAgentsToTasks(tasks) {
  const assignments = {};

  tasks.forEach(task => {
    const agent = selectBestAgent(task);
    assignments[task.id] = {
      primaryAgent: agent.primary,
      backupAgent: agent.backup,
      reason: agent.reason
    };
  });

  return assignments;
}

function selectBestAgent(task) {
  const agentCapabilities = {
    claude: ['architecture', 'refactoring', 'setup', 'complex-logic'],
    gpt: ['backend', 'api', 'business-logic', 'integration'],
    deepseek: ['testing', 'validation', 'debugging', 'optimization'],
    mistral: ['documentation', 'frontend', 'ui', 'styling'],
    gemini: ['analysis', 'security', 'devops', 'monitoring']
  };

  let primaryAgent = 'claude';
  let backupAgent = 'gpt';
  let reason = 'Default assignment';

  if (task.type === 'backend' || task.type === 'api') {
    primaryAgent = 'gpt';
    backupAgent = 'claude';
    reason = 'GPT specializes in backend development';
  } else if (task.type === 'testing') {
    primaryAgent = 'deepseek';
    backupAgent = 'gemini';
    reason = 'DeepSeek specializes in testing';
  } else if (task.type === 'frontend' || task.type === 'documentation') {
    primaryAgent = 'mistral';
    backupAgent = 'gpt';
    reason = 'Mistral handles frontend and docs';
  } else if (task.type === 'security' || task.type === 'devops') {
    primaryAgent = 'gemini';
    backupAgent = 'claude';
    reason = 'Gemini handles security and DevOps';
  } else if (task.type === 'architecture' || task.type === 'setup') {
    primaryAgent = 'claude';
    backupAgent = 'gpt';
    reason = 'Claude excels at architecture';
  }

  return { primary: primaryAgent, backup: backupAgent, reason };
}

function generateSchedule(tasks, timeline) {
  const schedule = [];
  let currentTime = 0;
  const timelineHours = parseInt(timeline) || 24;

  tasks.forEach(task => {
    const duration = parseTimeToMinutes(task.estimatedTime);
    schedule.push({
      taskId: task.id,
      startTime: currentTime,
      endTime: currentTime + duration,
      duration: duration,
      parallel: canRunInParallel(task, tasks)
    });
    
    if (!canRunInParallel(task, tasks)) {
      currentTime += duration;
    }
  });

  return compressSchedule(schedule, timelineHours);
}

function parseTimeToMinutes(timeStr) {
  if (timeStr.includes('h')) {
    return parseInt(timeStr) * 60;
  } else if (timeStr.includes('m')) {
    return parseInt(timeStr);
  }
  return 30;
}

function canRunInParallel(task, allTasks) {
  return task.dependencies.length === 0 && 
         !['setup', 'architecture'].includes(task.type);
}

function compressSchedule(schedule, targetHours) {
  const targetMinutes = targetHours * 60;
  const totalMinutes = Math.max(...schedule.map(s => s.endTime));
  
  if (totalMinutes <= targetMinutes) {
    return schedule;
  }

  const compressionRatio = targetMinutes / totalMinutes;
  return schedule.map(item => ({
    ...item,
    startTime: Math.floor(item.startTime * compressionRatio),
    endTime: Math.floor(item.endTime * compressionRatio),
    duration: Math.floor(item.duration * compressionRatio)
  }));
}

function calculateEstimatedCompletion(tasks) {
  const totalMinutes = tasks.reduce((sum, task) => {
    return sum + parseTimeToMinutes(task.estimatedTime);
  }, 0);

  const parallelSavings = Math.floor(totalMinutes * 0.3);
  const actualMinutes = totalMinutes - parallelSavings;
  const hours = Math.floor(actualMinutes / 60);
  const minutes = actualMinutes % 60;

  return {
    totalTasks: tasks.length,
    estimatedHours: hours,
    estimatedMinutes: minutes,
    confidence: 'high'
  };
}

function determineTechStack(projectType, requestedStack) {
  const defaultStacks = {
    'web-app': ['Node.js', 'React', 'PostgreSQL', 'Redis', 'Docker'],
    'mobile-app': ['React Native', 'Node.js', 'MongoDB', 'Firebase'],
    'api': ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'JWT'],
    'marketplace': ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe', 'Redis'],
    'saas': ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe', 'Auth0'],
    'ai-app': ['Python', 'FastAPI', 'React', 'PostgreSQL', 'OpenAI']
  };

  return requestedStack.length > 0 ? requestedStack : (defaultStacks[projectType] || defaultStacks['web-app']);
}

async function saveMasterplan(projectId, masterplan) {
  const projectRoot = path.resolve(process.cwd(), '..');
  const projectDir = path.join(projectRoot, 'projects', projectId);
  
  await fs.mkdir(projectDir, { recursive: true });
  await fs.writeFile(
    path.join(projectDir, 'masterplan.json'),
    JSON.stringify(masterplan, null, 2)
  );

  await redis.hset(`project:${projectId}`, {
    id: projectId,
    name: masterplan.projectName,
    type: masterplan.projectType,
    status: 'planning',
    createdAt: masterplan.createdAt,
    masterplan: JSON.stringify(masterplan)
  });
}

async function createInitialTasks(projectId, masterplan) {
  const { taskBreakdown, agentAssignments } = masterplan;
  
  for (const task of taskBreakdown) {
    const assignment = agentAssignments[task.id];
    const taskData = {
      projectId,
      taskId: task.id,
      name: task.name,
      description: task.description,
      phaseId: task.phaseId,
      assignedAgent: assignment.primaryAgent,
      backupAgent: assignment.backupAgent,
      status: 'pending',
      priority: task.priority,
      estimatedTime: task.estimatedTime,
      dependencies: task.dependencies
    };

    await redis.lpush(
      `queue:${assignment.primaryAgent}`,
      JSON.stringify(taskData)
    );

    await redis.hset(`task:${projectId}:${task.id}`, taskData);
  }
}