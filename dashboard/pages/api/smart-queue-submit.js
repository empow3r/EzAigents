import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Import the Smart LLM Selector
const SmartLLMSelector = require('./smart-llm-selector');
const selector = new SmartLLMSelector();

// Smart Queue submission API with automatic LLM selection
export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        return await smartSubmitToQueue(req, res);
      case 'GET':
        return await getSmartQueueStatus(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Smart queue submission error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function smartSubmitToQueue(req, res) {
  const { 
    task, 
    priority = 'normal', 
    preferences = {},
    autoSelect = true,
    suggestedModel = null 
  } = req.body;

  if (!task || !task.prompt) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: task.prompt'
    });
  }

  try {
    let selectedModel = suggestedModel;
    let selectionInfo = null;

    // Use smart selection if auto-select is enabled and no model specified
    if (autoSelect && !suggestedModel) {
      const contextLength = (task.file ? await getFileLength(task.file) : 0) + task.prompt.length;
      const selection = selector.selectBestLLM(task.prompt, contextLength, preferences);
      
      selectedModel = selection.recommended.model;
      selectionInfo = {
        analysis: selection.analysis,
        reasoning: selection.selection_reasoning,
        alternatives: selection.alternatives.map(alt => ({
          model: alt.model,
          score: alt.score,
          reasoning: alt.reasoning
        })),
        confidence: selection.recommended.score
      };

      console.log(`🧠 Smart LLM Selection: ${selectedModel} (score: ${selection.recommended.score.toFixed(1)})`);
      console.log(`📝 Reasoning: ${selection.selection_reasoning}`);
    }

    // Map model to queue
    const queue = getQueueForModel(selectedModel || 'gpt-4o');
    
    const taskId = uuidv4();
    const enhancedTask = {
      id: taskId,
      ...task,
      priority,
      submittedAt: Date.now(),
      status: 'queued',
      selectedModel,
      autoSelected: autoSelect && !suggestedModel,
      selectionInfo
    };

    // Submit to the determined queue
    const queueLength = await redis.lpush(queue, JSON.stringify(enhancedTask));
    
    // Track submission analytics
    await redis.hincrby('queue:analytics', `${queue}:submissions`, 1);
    await redis.hincrby('queue:analytics', `${queue}:${priority}`, 1);
    
    // Track smart selection analytics
    if (selectionInfo) {
      await redis.hincrby('smart:analytics', `${selectedModel}:selections`, 1);
      await redis.hincrby('smart:analytics', `complexity:${selectionInfo.analysis.complexity.level}`, 1);
      
      // Store selection reasoning for analysis
      await redis.lpush('smart:selection_log', JSON.stringify({
        taskId,
        selectedModel,
        prompt: task.prompt.substring(0, 200), // First 200 chars
        analysis: selectionInfo.analysis,
        timestamp: Date.now()
      }));
    }
    
    // Store task metadata for tracking
    await redis.hset('queue:tasks', taskId, JSON.stringify({
      queue,
      task: enhancedTask,
      submittedAt: Date.now()
    }));

    // Set expiry for task metadata (7 days)
    await redis.expire('queue:tasks', 7 * 24 * 60 * 60);

    return res.json({
      success: true,
      taskId,
      queue,
      selectedModel,
      queueLength,
      message: (autoSelect && !suggestedModel) ? 'Task auto-routed to optimal LLM' : 'Task submitted successfully',
      selectionInfo,
      estimatedProcessingTime: getEstimatedProcessingTime(queue, queueLength),
      modelCapabilities: selectedModel ? selector.modelCapabilities[selectedModel] : null
    });
  } catch (error) {
    console.error('Smart queue submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit task to smart queue',
      details: error.message
    });
  }
}

async function getSmartQueueStatus(req, res) {
  const { taskId, includeAnalytics = false } = req.query;

  try {
    if (taskId) {
      // Get specific task status
      const taskData = await redis.hget('queue:tasks', taskId);
      if (!taskData) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      const task = JSON.parse(taskData);
      
      // Add smart selection info if available
      if (task.task.selectionInfo) {
        task.smartSelection = task.task.selectionInfo;
      }

      return res.json({
        success: true,
        task
      });
    }

    // Get comprehensive queue and analytics status
    const response = {
      success: true,
      timestamp: Date.now()
    };

    if (includeAnalytics) {
      // Get smart selection analytics
      const smartAnalytics = await redis.hgetall('smart:analytics');
      const recentSelections = await redis.lrange('smart:selection_log', 0, 9); // Last 10 selections
      
      response.smartAnalytics = {
        modelSelections: Object.entries(smartAnalytics)
          .filter(([key]) => key.includes(':selections'))
          .reduce((acc, [key, value]) => {
            const model = key.replace(':selections', '');
            acc[model] = parseInt(value);
            return acc;
          }, {}),
        complexityDistribution: Object.entries(smartAnalytics)
          .filter(([key]) => key.includes('complexity:'))
          .reduce((acc, [key, value]) => {
            const complexity = key.replace('complexity:', '');
            acc[complexity] = parseInt(value);
            return acc;
          }, {}),
        recentSelections: recentSelections.map(selection => JSON.parse(selection))
      };
    }

    // Get all queue statuses
    const queues = [
      'queue:claude-3-opus',
      'queue:gpt-4o',
      'queue:deepseek-r1',
      'queue:deepseek-coder', 
      'queue:gemini-pro',
      'queue:mistral-large',
      'queue:webscraper'
    ];

    const queueStatuses = {};
    for (const queueName of queues) {
      const length = await redis.llen(queueName);
      queueStatuses[queueName] = {
        length,
        estimatedProcessingTime: getEstimatedProcessingTime(queueName, length),
        model: queueName.replace('queue:', '')
      };
    }

    response.queues = queueStatuses;
    response.totalTasks = Object.values(queueStatuses).reduce((sum, q) => sum + q.length, 0);

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get smart queue status',
      details: error.message
    });
  }
}

// Helper functions
function getQueueForModel(model) {
  const queueMappings = {
    'claude-3-opus': 'queue:claude-3-opus',
    'gpt-4o': 'queue:gpt-4o',
    'deepseek-r1': 'queue:deepseek-r1',
    'deepseek-coder': 'queue:deepseek-coder',
    'gemini-pro': 'queue:gemini-pro',
    'mistral-large': 'queue:mistral-large',
    'webscraper': 'queue:webscraper'
  };

  return queueMappings[model] || 'queue:gpt-4o'; // Default fallback
}

async function getFileLength(filePath) {
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.length;
    }
  } catch (error) {
    console.warn('Could not read file for length calculation:', filePath);
  }
  return 0;
}

function getEstimatedProcessingTime(queue, queueLength) {
  // Enhanced processing times with model-specific estimates
  const processingTimes = {
    'queue:claude-3-opus': 45,
    'queue:gpt-4o': 30,
    'queue:deepseek-r1': 35,
    'queue:deepseek-coder': 25,
    'queue:gemini-pro': 20,
    'queue:mistral-large': 22,
    'queue:webscraper': 60
  };

  const baseTime = processingTimes[queue] || 30;
  const totalTime = queueLength * baseTime;

  if (totalTime < 60) {
    return `${totalTime} seconds`;
  } else if (totalTime < 3600) {
    return `${Math.ceil(totalTime / 60)} minutes`;
  } else {
    return `${Math.ceil(totalTime / 3600)} hours`;
  }
}