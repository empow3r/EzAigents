import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Research project management API
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await getResearchProjects(req, res);
      case 'POST':
        return await createResearchProject(req, res);
      case 'PUT':
        return await updateResearchProject(req, res);
      case 'DELETE':
        return await deleteResearchProject(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Research projects API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function getResearchProjects(req, res) {
  const { projectId, category, status } = req.query;

  try {
    if (projectId) {
      // Get specific project
      const projectData = await redis.hget('research:projects', projectId);
      if (!projectData) {
        return res.status(404).json({ 
          success: false, 
          error: 'Project not found' 
        });
      }

      const project = JSON.parse(projectData);
      
      // Get project insights
      const insights = await redis.lrange(`research:insights:${projectId}`, 0, -1);
      project.insights = insights.map(insight => JSON.parse(insight));

      // Get project tasks
      const tasks = await redis.lrange(`research:tasks:${projectId}`, 0, -1);
      project.tasks = tasks.map(task => JSON.parse(task));

      return res.json({
        success: true,
        project
      });
    }

    // Get all projects
    const projectsData = await redis.hgetall('research:projects');
    let projects = Object.entries(projectsData).map(([id, data]) => ({
      id,
      ...JSON.parse(data)
    }));

    // Apply filters
    if (category && category !== 'all') {
      projects = projects.filter(p => p.category === category);
    }
    
    if (status) {
      projects = projects.filter(p => p.status === status);
    }

    // Sort by last updated
    projects.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    return res.json({
      success: true,
      projects,
      count: projects.length
    });
  } catch (error) {
    console.error('Error getting research projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get research projects',
      details: error.message
    });
  }
}

async function createResearchProject(req, res) {
  const { 
    title, 
    description, 
    category, 
    priority, 
    deadline, 
    assignedAgents,
    tags,
    automationRules 
  } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: title, description, category'
    });
  }

  try {
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const project = {
      id: projectId,
      title,
      description,
      category,
      priority: priority || 'medium',
      status: 'pending',
      progress: 0,
      deadline,
      assignedAgents: assignedAgents || [],
      tags: tags || [],
      createdAt: now,
      lastUpdated: now,
      createdBy: 'user', // TODO: Get from auth
      insightCount: 0,
      sourceCount: 0,
      color: getProjectColor(category)
    };

    // Store project
    await redis.hset('research:projects', projectId, JSON.stringify(project));

    // Create initial tasks based on category
    const initialTasks = generateInitialTasks(category, assignedAgents);
    for (const task of initialTasks) {
      await submitResearchTask(projectId, task);
    }

    // Set up automation rules if provided
    if (automationRules && automationRules.length > 0) {
      for (const rule of automationRules) {
        await createAutomationRule(projectId, rule);
      }
    }

    // Track project creation analytics
    await redis.hincrby('research:analytics', 'projects:created', 1);
    await redis.hincrby('research:analytics', `category:${category}`, 1);

    return res.json({
      success: true,
      project,
      message: 'Research project created successfully'
    });
  } catch (error) {
    console.error('Error creating research project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create research project',
      details: error.message
    });
  }
}

async function updateResearchProject(req, res) {
  const { projectId } = req.query;
  const updates = req.body;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: 'Project ID is required'
    });
  }

  try {
    // Get existing project
    const existingData = await redis.hget('research:projects', projectId);
    if (!existingData) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const existingProject = JSON.parse(existingData);
    
    // Update project
    const updatedProject = {
      ...existingProject,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    await redis.hset('research:projects', projectId, JSON.stringify(updatedProject));

    // If status changed to active, trigger initial data collection
    if (updates.status === 'active' && existingProject.status !== 'active') {
      await startProjectAutomation(projectId, updatedProject);
    }

    return res.json({
      success: true,
      project: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating research project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update research project',
      details: error.message
    });
  }
}

async function deleteResearchProject(req, res) {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: 'Project ID is required'
    });
  }

  try {
    // Check if project exists
    const projectData = await redis.hget('research:projects', projectId);
    if (!projectData) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Delete project and related data
    await redis.hdel('research:projects', projectId);
    await redis.del(`research:insights:${projectId}`);
    await redis.del(`research:tasks:${projectId}`);
    await redis.del(`research:automation:${projectId}`);

    return res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting research project:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete research project',
      details: error.message
    });
  }
}

// Helper functions
function getProjectColor(category) {
  const colors = {
    'market-research': 'bg-blue-500',
    'competitive-analysis': 'bg-green-500',
    'user-research': 'bg-purple-500',
    'trend-analysis': 'bg-yellow-500',
    'technical-research': 'bg-indigo-500'
  };
  return colors[category] || 'bg-gray-500';
}

function generateInitialTasks(category, assignedAgents) {
  const taskTemplates = {
    'market-research': [
      {
        type: 'data_collection',
        title: 'Market Size Analysis',
        description: 'Collect market size and growth data for the target industry',
        priority: 'high',
        estimatedHours: 4
      },
      {
        type: 'analysis',
        title: 'Trend Identification',
        description: 'Identify key market trends and growth drivers',
        priority: 'medium',
        estimatedHours: 6
      }
    ],
    'competitive-analysis': [
      {
        type: 'data_collection',
        title: 'Competitor Identification',
        description: 'Identify and profile key competitors in the market',
        priority: 'high',
        estimatedHours: 3
      },
      {
        type: 'analysis',
        title: 'Feature Comparison',
        description: 'Compare competitor features and positioning',
        priority: 'medium',
        estimatedHours: 5
      }
    ],
    'user-research': [
      {
        type: 'data_collection',
        title: 'User Behavior Data',
        description: 'Collect user behavior and interaction data',
        priority: 'high',
        estimatedHours: 4
      },
      {
        type: 'analysis',
        title: 'User Journey Mapping',
        description: 'Analyze user journeys and pain points',
        priority: 'medium',
        estimatedHours: 6
      }
    ]
  };

  return taskTemplates[category] || [];
}

async function submitResearchTask(projectId, task) {
  const taskId = uuidv4();
  const taskWithId = {
    ...task,
    id: taskId,
    projectId,
    status: 'queued',
    createdAt: new Date().toISOString()
  };

  // Store task
  await redis.lpush(`research:tasks:${projectId}`, JSON.stringify(taskWithId));

  // Submit to appropriate agent queue based on task type
  const queueMapping = {
    'data_collection': 'queue:webscraper',
    'analysis': 'queue:claude-3-opus',
    'report_generation': 'queue:gpt-4o',
    'web_scraping': 'queue:webscraper'
  };

  const queue = queueMapping[task.type] || 'queue:gpt-4o';
  
  // Create agent task
  const agentTask = {
    id: taskId,
    projectId,
    type: 'research_task',
    prompt: `Research Task: ${task.title}\n\nDescription: ${task.description}\n\nExpected Output: Detailed analysis and insights`,
    priority: task.priority,
    researchContext: {
      projectId,
      taskType: task.type,
      category: task.category
    }
  };

  await redis.lpush(queue, JSON.stringify(agentTask));

  return taskWithId;
}

async function createAutomationRule(projectId, rule) {
  const ruleId = uuidv4();
  const automationRule = {
    ...rule,
    id: ruleId,
    projectId,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  await redis.hset(`research:automation:${projectId}`, ruleId, JSON.stringify(automationRule));
  
  return automationRule;
}

async function startProjectAutomation(projectId, project) {
  // Trigger initial data collection based on project category
  const automationTasks = {
    'market-research': [
      { type: 'web_scraping', target: 'industry_reports' },
      { type: 'data_collection', target: 'market_data' }
    ],
    'competitive-analysis': [
      { type: 'web_scraping', target: 'competitor_websites' },
      { type: 'data_collection', target: 'competitor_data' }
    ],
    'user-research': [
      { type: 'data_collection', target: 'user_analytics' },
      { type: 'web_scraping', target: 'user_feedback' }
    ]
  };

  const tasks = automationTasks[project.category] || [];
  
  for (const task of tasks) {
    await submitResearchTask(projectId, {
      ...task,
      title: `Automated ${task.type}`,
      description: `Automatically triggered ${task.type} for ${project.title}`,
      priority: 'medium'
    });
  }
}