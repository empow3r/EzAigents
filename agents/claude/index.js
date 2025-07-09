// /agents/claude/index.js - Enhanced Multi-Agent Collaboration with Memory Management
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AgentCoordinator = require('../../cli/coordination-service');
const AgentCommunication = require('../../cli/agent-communication');
const FileLockManager = require('../../cli/file-lock-manager');
const AgentChatHandler = require('../../cli/agent-chat-handler');
const AgentMemoryManager = require('../../cli/agent-memory-manager');

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

(async () => {
  console.log(`🤖 Enhanced Claude Agent [${ROLE}] starting with ID: ${AGENT_ID}`);
  
  // Announce agent capabilities
  await communication.broadcastMessage(
    `Claude agent ${AGENT_ID} online. Specializing in: architecture, refactoring, code review. Ready for collaboration!`,
    'agent_online'
  );
  
  while (true) {
    // Update status
    await coordinator.updateStatus('scanning_for_work');
    
    const job = await redis.rpoplpush(`queue:${MODEL}`, `processing:${MODEL}`);
    if (!job) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    
    const { file, prompt } = JSON.parse(job);
    const taskId = `claude_task_${Date.now()}`;
    
    try {
      console.log(`📋 Processing task ${taskId}: ${file}`);
      await coordinator.updateStatus('working', `Processing ${file}`);
      
      // Save task start to memory
      memoryManager.startTask(taskId, file, prompt);
      
      // Step 1: Try to claim file lock
      const lockResult = await lockManager.claimFile(file, AGENT_ID, 1800);
      
      if (!lockResult.success) {
        console.log(`🔒 File ${file} is locked by ${lockResult.owner}. Coordinating...`);
        
        // Request coordination with file owner
        await communication.sendDirectMessage(
          lockResult.owner,
          `I need to work on ${file} for: ${prompt}. Can we coordinate?`,
          'coordination_request',
          'high'
        );
        
        // Wait a bit and try again
        await new Promise(r => setTimeout(r, 5000));
        const retryLock = await lockManager.waitForFile(file, AGENT_ID, 300); // 5 minutes
        
        if (!retryLock.success) {
          console.log(`⏰ Could not acquire lock for ${file}, re-queuing task`);
          await redis.lpush(`queue:${MODEL}`, job);
          continue;
        }
      }
      const filePath = path.resolve(file);
      
      // Check if file exists, if not we'll create it
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
        continue;
      }
      
      // Ensure output directory exists
      const outputDir = path.resolve('src/output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const response = await axios.post('https://api.openrouter.ai/v1/chat/completions', {
        model: MODEL,
        messages: [{ role: 'user', content: `${prompt}\n\nCode:\n${code}` }],
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
      
      const result = response.data.choices[0].message.content;
      const outPath = path.join('src/output', file.replace(/\//g, '__'));
      
      // Ensure output directory exists for the specific file
      const outputFileDir = path.dirname(outPath);
      if (!fs.existsSync(outputFileDir)) {
        fs.mkdirSync(outputFileDir, { recursive: true });
      }
      
      fs.writeFileSync(outPath, result);
      
      // Also write to the actual file location if it's a new file or modification
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
    }
  }
})();

// Helper functions for collaboration
async function checkForCollaborationNeeds(file, prompt) {
  // Check if this is a critical file that needs review
  const criticalPatterns = [/package\.json$/, /tsconfig/, /webpack/, /docker/i, /auth/i];
  const isCritical = criticalPatterns.some(pattern => pattern.test(file));
  
  if (isCritical) {
    return { needed: true, reason: 'critical_file', collaborators: ['gpt', 'deepseek'] };
  }
  
  // Check if prompt indicates need for multiple skills
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
  
  // Find available collaborators
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
  // Always request review for critical changes
  const criticalChanges = [
    /class\s+\w+/,  // New classes
    /function\s+\w+/, // New functions
    /async\s+function/, // Async functions
    /export\s+default/, // Module exports
    /import\s+.*from/ // New imports
  ];
  
  return criticalChanges.some(pattern => pattern.test(result));
}

async function requestCodeReview(file, result, taskId) {
  console.log(`📋 Requesting code review for ${file}`);
  
  await communication.requestCodeReview(
    file,
    'gpt', // Default reviewer
    `Please review changes made by Claude agent for task ${taskId}`
  );
}
