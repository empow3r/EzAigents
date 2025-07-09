// Enhanced Claude Agent with Todo Queue Idle Checker
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AgentCoordinator = require('../../cli/coordination-service');
const AgentCommunication = require('../../cli/agent-communication');
const FileLockManager = require('../../cli/file-lock-manager');
const AgentChatHandler = require('../../cli/agent-chat-handler');
const AgentMemoryManager = require('../../cli/agent-memory-manager');
const TodoQueueIdleChecker = require('../../cli/todo-queue-idle-checker');

const redis = new Redis(process.env.REDIS_URL);
const MODEL = process.env.MODEL || 'claude-3-opus';
const API_KEY = process.env.API_KEY;
const ROLE = process.env.ROLE || 'refactor-core';
const AGENT_ID = process.env.AGENT_ID || `claude-${ROLE}-${Date.now()}`;

// Initialize collaboration components
const coordinator = new AgentCoordinator(AGENT_ID, ['refactor-core', 'architecture', 'code-review'], 'high');
const communication = new AgentCommunication(AGENT_ID);
const lockManager = new FileLockManager();
const memoryManager = new AgentMemoryManager(AGENT_ID, 'claude', path.resolve('../../'));

// Initialize Todo Queue Idle Checker
const todoChecker = new TodoQueueIdleChecker(AGENT_ID, 'claude', {
  checkInterval: 10000, // Check every 10 seconds
  todoQueueName: 'queue:todos'
});

// Track agent state
let isProcessingMainTask = false;
let isProcessingTodoTask = false;

// Set up chat handlers for intelligent responses
AgentChatHandler.setupChatHandlers(AGENT_ID, 'claude', communication);

// Set up enhanced collaboration event handlers
communication.on('directMessage', async (data) => {
  if (data.type === 'coordination_request') {
    console.log(`🤝 Coordination request from ${data.from} for file work`);
    await communication.sendDirectMessage(data.from, 'I can coordinate with you on this task', 'coordination_accept');
  }
  if (data.type === 'review_request') {
    console.log(`📋 Code review request from ${data.from}`);
    await communication.sendDirectMessage(data.from, 'I\'ll review your code', 'review_accept');
  }
});

communication.on('mentioned', async (data) => {
  console.log(`👋 Mentioned by ${data.from}: ${data.message}`);
  if (data.message.includes('architecture') || data.message.includes('refactor')) {
    await communication.sendDirectMessage(data.from, 'I can help with architecture and refactoring tasks!', 'capability_offer');
  }
});

// Set up todo task event handlers
todoChecker.on('taskAssigned', async ({ task, agentId }) => {
  console.log(`📋 Todo task assigned: ${task.description || task.id}`);
  isProcessingTodoTask = true;
  
  try {
    // Process the todo task
    const result = await processTodoTask(task);
    
    // Mark task as completed
    await todoChecker.completeCurrentTask(result);
    
    console.log(`✅ Completed todo task: ${task.id}`);
    
  } catch (error) {
    console.error(`❌ Error processing todo task: ${error.message}`);
    
    // Save error to memory
    memoryManager.saveError(`todo_${task.id}`, error, { 
      task_type: 'todo',
      task_id: task.id,
      description: task.description 
    });
    
    // Return task to queue for retry by another agent
    await todoChecker.returnTaskToQueue(task);
    
  } finally {
    isProcessingTodoTask = false;
  }
});

todoChecker.on('error', (error) => {
  console.error(`❌ Todo checker error: ${error.message}`);
});

// Process todo tasks with Claude's capabilities
async function processTodoTask(task) {
  console.log(`🔄 Processing todo task: ${task.description}`);
  
  const taskStartTime = Date.now();
  
  try {
    // Determine task type and process accordingly
    let result;
    
    if (task.type === 'code_review') {
      result = await performCodeReview(task);
    } else if (task.type === 'architecture_analysis') {
      result = await performArchitectureAnalysis(task);
    } else if (task.type === 'refactoring') {
      result = await performRefactoring(task);
    } else if (task.type === 'documentation') {
      result = await generateDocumentation(task);
    } else {
      // Generic task processing
      result = await processGenericTodoTask(task);
    }
    
    const processingTime = Date.now() - taskStartTime;
    
    return {
      success: true,
      result: result,
      agent_id: AGENT_ID,
      agent_type: 'claude',
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    throw error;
  }
}

// Specialized todo task processors
async function performCodeReview(task) {
  const { file_path, code_snippet } = task.data || {};
  
  const prompt = `Perform a code review for the following:
File: ${file_path || 'Unknown'}
Task: ${task.description}

Code:
${code_snippet || 'No code provided'}

Provide:
1. Security concerns
2. Performance issues
3. Code quality improvements
4. Best practices violations`;

  const response = await callClaudeAPI(prompt);
  
  // Save review to memory
  const reviewId = `review_${Date.now()}`;
  memoryManager.saveLearning(`Code review completed for ${file_path}: ${reviewId}`, 'code_review');
  
  return {
    type: 'code_review',
    review: response,
    file: file_path,
    review_id: reviewId
  };
}

async function performArchitectureAnalysis(task) {
  const { project_path, focus_area } = task.data || {};
  
  const prompt = `Analyze the architecture for:
Project: ${project_path || 'Current project'}
Focus: ${focus_area || task.description}

Provide:
1. Current architecture assessment
2. Scalability concerns
3. Design pattern recommendations
4. Improvement suggestions`;

  const response = await callClaudeAPI(prompt);
  
  return {
    type: 'architecture_analysis',
    analysis: response,
    focus_area: focus_area
  };
}

async function performRefactoring(task) {
  const { code, target_improvement } = task.data || {};
  
  const prompt = `Refactor the following code:
Target improvement: ${target_improvement || task.description}

Original code:
${code || 'No code provided'}

Provide the refactored code with explanations.`;

  const response = await callClaudeAPI(prompt);
  
  return {
    type: 'refactoring',
    original_code: code,
    refactored_code: response,
    improvement: target_improvement
  };
}

async function generateDocumentation(task) {
  const { code, doc_type } = task.data || {};
  
  const prompt = `Generate ${doc_type || 'comprehensive'} documentation for:
${task.description}

Code:
${code || 'No code provided'}`;

  const response = await callClaudeAPI(prompt);
  
  return {
    type: 'documentation',
    documentation: response,
    doc_type: doc_type
  };
}

async function processGenericTodoTask(task) {
  const prompt = `Process the following task:
${task.description}

Additional context:
${JSON.stringify(task.data || {}, null, 2)}`;

  const response = await callClaudeAPI(prompt);
  
  return {
    type: 'generic',
    response: response,
    task_description: task.description
  };
}

// Helper function to call Claude API
async function callClaudeAPI(prompt) {
  try {
    const response = await axios.post('https://api.openrouter.ai/v1/chat/completions', {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid API response');
    }
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error(`API call error: ${error.message}`);
    throw error;
  }
}

// Override the idle check to consider both main and todo tasks
async function isAgentIdle() {
  return !isProcessingMainTask && !isProcessingTodoTask;
}

// Helper functions for collaboration (kept from original)
async function checkForCollaborationNeeds(file, prompt) {
  const criticalPatterns = [/package\.json$/, /tsconfig/, /webpack/, /docker/i, /auth/i];
  const isCritical = criticalPatterns.some(pattern => pattern.test(file));
  
  if (isCritical) {
    return { needed: true, reason: 'critical_file', collaborators: ['gpt', 'deepseek'] };
  }
  
  if (prompt.includes('test') && !prompt.includes('refactor')) {
    return { needed: true, reason: 'needs_testing', collaborators: ['deepseek'] };
  }
  
  if (prompt.includes('document') || prompt.includes('comment')) {
    return { needed: true, reason: 'needs_documentation', collaborators: ['mistral'] };
  }
  
  return { needed: false };
}

async function initiateCollaboration(file, prompt, needs, taskId) {
  console.log(`🤝 Initiating collaboration for ${file}: ${needs.reason}`);
  
  const onlineAgents = await communication.getOnlineAgents();
  
  for (const collaboratorType of needs.collaborators) {
    const collaborator = onlineAgents.find(agent => 
      agent.type === collaboratorType && agent.status === 'active'
    );
    
    if (collaborator) {
      await communication.sendDirectMessage(
        collaborator.id,
        `Collaboration request for ${file}. Task: ${prompt}. Session: ${taskId}`,
        'collaboration_invite',
        'high'
      );
    }
  }
}

async function checkIfNeedsReview(file, result) {
  const criticalChanges = [
    /class\s+\w+/,
    /function\s+\w+/,
    /async\s+function/,
    /export\s+default/,
    /import\s+.*from/
  ];
  
  return criticalChanges.some(pattern => pattern.test(result));
}

async function requestCodeReview(file, result, taskId) {
  console.log(`📋 Requesting code review for ${file}`);
  
  await communication.requestCodeReview(
    file,
    'gpt',
    `Please review changes made by Claude agent for task ${taskId}`
  );
}

// Main agent loop
(async () => {
  console.log(`🤖 Enhanced Claude Agent [${ROLE}] starting with ID: ${AGENT_ID}`);
  console.log(`📋 Todo Queue Idle Checker enabled (10 second intervals)`);
  
  // Start the todo queue idle checker
  await todoChecker.start();
  
  // Announce agent capabilities
  await communication.broadcastMessage(
    `Claude agent ${AGENT_ID} online. Specializing in: architecture, refactoring, code review. Todo queue monitoring enabled!`,
    'agent_online'
  );
  
  // Update idle status for todo checker
  setInterval(async () => {
    if (await isAgentIdle()) {
      await redis.set(`agent:${AGENT_ID}:status`, 'idle', 'EX', 300);
    }
  }, 5000);
  
  while (true) {
    // Update status
    if (!isProcessingTodoTask) {
      await coordinator.updateStatus('scanning_for_work');
    }
    
    const job = await redis.rpoplpush(`queue:${MODEL}`, `processing:${MODEL}`);
    if (!job) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    
    isProcessingMainTask = true;
    const { file, prompt } = JSON.parse(job);
    const taskId = `claude_task_${Date.now()}`;
    
    try {
      console.log(`📋 Processing main task ${taskId}: ${file}`);
      await coordinator.updateStatus('working', `Processing ${file}`);
      
      // Save task start to memory
      memoryManager.startTask(taskId, file, prompt);
      
      // Step 1: Try to claim file lock
      const lockResult = await lockManager.claimFile(file, AGENT_ID, 1800);
      
      if (!lockResult.success) {
        console.log(`🔒 File ${file} is locked by ${lockResult.owner}. Coordinating...`);
        
        await communication.sendDirectMessage(
          lockResult.owner,
          `I need to work on ${file} for: ${prompt}. Can we coordinate?`,
          'coordination_request',
          'high'
        );
        
        await new Promise(r => setTimeout(r, 5000));
        const retryLock = await lockManager.waitForFile(file, AGENT_ID, 300);
        
        if (!retryLock.success) {
          console.log(`⏰ Could not acquire lock for ${file}, re-queuing task`);
          await redis.lpush(`queue:${MODEL}`, job);
          isProcessingMainTask = false;
          continue;
        }
      }
      
      const filePath = path.resolve(file);
      
      // Check if file exists
      let code = '';
      let isNewFile = false;
      
      if (!fs.existsSync(filePath)) {
        isNewFile = true;
        code = '// New file to be created\n';
        console.log(`📝 Creating new file: ${filePath}`);
      } else {
        code = fs.readFileSync(filePath, 'utf-8');
        console.log(`📝 Modifying existing file: ${filePath}`);
      }
      
      // Check if task requires collaboration
      const requiresCollaboration = await checkForCollaborationNeeds(file, prompt);
      
      if (requiresCollaboration.needed) {
        console.log(`🤝 Task requires collaboration: ${requiresCollaboration.reason}`);
        await initiateCollaboration(file, prompt, requiresCollaboration, taskId);
        isProcessingMainTask = false;
        continue;
      }
      
      // Ensure output directory exists
      const outputDir = path.resolve('src/output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const response = await callClaudeAPI(`${prompt}\n\nCode:\n${code}`);
      
      const result = response;
      const outPath = path.join('src/output', file.replace(/\//g, '__'));
      
      // Ensure output directory exists for the specific file
      const outputFileDir = path.dirname(outPath);
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true });
      }
      
      fs.writeFileSync(outPath, result);
      
      // Also write to the actual file location if needed
      if (isNewFile || prompt.includes('create') || prompt.includes('implement')) {
        const actualFileDir = path.dirname(filePath);
        if (!fs.existsSync(actualFileDir)) {
          fs.mkdirSync(actualFileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, result);
        console.log(`✅ ${isNewFile ? 'Created' : 'Updated'} actual file: ${filePath}`);
      }
      
      // Check if result needs review
      const needsReview = await checkIfNeedsReview(file, result);
      if (needsReview) {
        await requestCodeReview(file, result, taskId);
      }
      
      // Save task completion to memory
      memoryManager.completeTask(taskId, outPath, result, isNewFile);
      
      // Verify work before proceeding
      const workVerified = await memoryManager.verifyWork(taskId, filePath);
      if (!workVerified) {
        throw new Error('Work verification failed - output may be corrupted');
      }
      
      // Save learning about this task type
      const taskInsight = `Successfully ${isNewFile ? 'created' : 'modified'} ${file} with ${result.split('\n').length} lines of code`;
      memoryManager.saveLearning(taskInsight, 'task_completion');
      
      // Release file lock
      await lockManager.releaseFile(file, AGENT_ID);
      
      await redis.lrem(`processing:${MODEL}`, 1, job);
      
      // Announce completion
      await communication.broadcastMessage(
        `Claude completed task: ${file} (${taskId})`,
        'task_completed',
        'low'
      );
      
      console.log(`✅ Claude [${ROLE}] updated: ${file} (Task: ${taskId})`);  
      await coordinator.updateStatus('idle');
      
      // Clear context after successful completion to save tokens
      await memoryManager.clearContextAfterTask(taskId);
      
    } catch (e) {
      console.error(`❌ Claude [${ROLE}] error on ${file}:`, e.message);
      
      // Save error to memory for analysis
      memoryManager.saveError(taskId, e, { file, model: MODEL, role: ROLE });
      
      // Release lock if held
      try {
        await lockManager.releaseFile(file, AGENT_ID);
      } catch (lockError) {
        console.error(`❌ Error releasing lock:`, lockError);
        memoryManager.saveError(taskId, lockError, { type: 'lock_release', file });
      }
      
      // Notify about error
      await communication.sendEmergencyMessage(
        `Claude agent ${AGENT_ID} encountered error on ${file}: ${e.message}`,
        'task_error'
      );
      
      await redis.rpoplpush(`processing:${MODEL}`, `queue:${MODEL}`); // requeue
      await redis.lpush('queue:failures', JSON.stringify({ 
        file, 
        model: MODEL, 
        role: ROLE,
        agent_id: AGENT_ID,
        task_id: taskId || 'unknown',
        error: e.message,
        timestamp: new Date().toISOString()
      }));
      
      await coordinator.updateStatus('error', `Failed: ${file}`);
      
    } finally {
      isProcessingMainTask = false;
    }
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Claude agent with todo checker...');
  await todoChecker.stop();
  await coordinator.updateStatus('offline');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down Claude agent with todo checker...');
  await todoChecker.stop();
  await coordinator.updateStatus('offline');
  process.exit(0);
});