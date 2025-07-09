import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Load enhancement tasks configuration
const enhancementTasksPath = path.join(process.cwd(), '../shared/enhancement-tasks.json');
let enhancementTasks = {};

try {
  const data = fs.readFileSync(enhancementTasksPath, 'utf-8');
  enhancementTasks = JSON.parse(data);
} catch (error) {
  console.error('Failed to load enhancement tasks:', error);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { enhancementId } = req.body;

  if (!enhancementId) {
    return res.status(400).json({ error: 'Enhancement ID is required' });
  }

  const enhancement = enhancementTasks.enhancements[enhancementId];
  
  if (!enhancement) {
    return res.status(404).json({ error: 'Enhancement not found' });
  }

  try {
    console.log(`Dispatching enhancement: ${enhancement.title}`);
    
    let dispatchedCount = 0;
    const errors = [];

    // Dispatch each task to the appropriate agent queue
    for (const task of enhancement.tasks) {
      try {
        const model = getModelForAgent(task.agent);
        
        // Add global prompt prefix
        const enhancedPrompt = `${enhancementTasks.global_modifications.all_agents.prompt_prefix}\n\n${task.prompt}\n\n${enhancementTasks.global_modifications.all_agents.testing_requirements}\n\n${enhancementTasks.global_modifications.all_agents.documentation_requirements}`;
        
        const job = {
          file: task.file,
          prompt: enhancedPrompt,
          model: model,
          enhancement_id: enhancement.id,
          priority: enhancement.priority,
          timestamp: new Date().toISOString()
        };
        
        // Add to appropriate queue
        await redis.lpush(`queue:${model}`, JSON.stringify(job));
        dispatchedCount++;
        
      } catch (error) {
        console.error(`Failed to dispatch task ${task.file}:`, error);
        errors.push({ file: task.file, error: error.message });
      }
    }
    
    // Update enhancement status
    await redis.hset(`enhancement:${enhancement.id}`, {
      status: 'dispatched',
      dispatched_at: new Date().toISOString(),
      total_tasks: enhancement.tasks.length,
      dispatched_tasks: dispatchedCount
    });
    
    // Notify all agents about the enhancement
    await redis.publish('agent-chat', JSON.stringify({
      from: 'enhancement-dispatcher',
      message: `🎯 Enhancement "${enhancement.title}" has been dispatched! ${dispatchedCount} tasks assigned to agents.`,
      enhancement_id: enhancement.id,
      type: 'enhancement_dispatch'
    }));

    res.status(200).json({
      success: true,
      enhancement: {
        id: enhancement.id,
        title: enhancement.title,
        tasksDispatched: dispatchedCount,
        totalTasks: enhancement.tasks.length,
        errors: errors
      }
    });
  } catch (error) {
    console.error('Error dispatching enhancement:', error);
    res.status(500).json({ error: 'Failed to dispatch enhancement', details: error.message });
  }
}

function getModelForAgent(agentType) {
  const agentModelMap = {
    'claude': 'claude-3-opus',
    'gpt': 'gpt-4o',
    'deepseek': 'deepseek-coder',
    'mistral': 'command-r-plus',
    'gemini': 'gemini-pro'
  };
  return agentModelMap[agentType] || 'gpt-4o';
}