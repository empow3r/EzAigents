// /agents/gpt/index.js - Enhanced Multi-Agent Collaboration
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
const MODEL = process.env.MODEL || 'gpt-4o';
const API_KEY = process.env.API_KEY;
const ROLE = process.env.ROLE || 'backend-logic';
const AGENT_ID = process.env.AGENT_ID || `gpt-${ROLE}-${Date.now()}`;

// Initialize collaboration components
const coordinator = new AgentCoordinator(AGENT_ID, ['backend-logic', 'api-development', 'data-processing'], 'normal');
const communication = new AgentCommunication(AGENT_ID);
const lockManager = new FileLockManager();
const memoryManager = new AgentMemoryManager(AGENT_ID, 'gpt', path.resolve('../../'));

// Set up chat handlers for intelligent responses
AgentChatHandler.setupChatHandlers(AGENT_ID, 'gpt', communication);

// Set up enhanced collaboration event handlers
communication.on('directMessage', async (data) => {
  if (data.type === 'review_request') {
    console.log(`📋 Code review request from ${data.from}`);
    await handleCodeReview(data);
  }
  if (data.type === 'coordination_request') {
    console.log(`🤝 Coordination request from ${data.from}`);
    await communication.sendDirectMessage(data.from, 'I can coordinate on backend logic tasks', 'coordination_accept');
  }
});

communication.on('mentioned', async (data) => {
  if (data.message.includes('backend') || data.message.includes('api') || data.message.includes('logic')) {
    await communication.sendDirectMessage(data.from, 'I specialize in backend logic and API development!', 'capability_offer');
  }
});

(async () => {
  console.log(`🤖 Enhanced GPT Agent [${ROLE}] starting with ID: ${AGENT_ID}`);
  
  // Announce agent capabilities
  await communication.broadcastMessage(
    `GPT agent ${AGENT_ID} online. Specializing in: backend logic, API development, data processing. Ready for collaboration!`,
    'agent_online'
  );
  
  while (true) {
    await coordinator.updateStatus('scanning_for_work');
    
    const job = await redis.rpoplpush(`queue:${MODEL}`, `processing:${MODEL}`);
    if (!job) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    
    const { file, prompt } = JSON.parse(job);
    const taskId = `gpt_task_${Date.now()}`;
    
    try {
      console.log(`📝 Processing task ${taskId}: ${file}`);
      await coordinator.updateStatus('working', `Processing ${file}`);
      
      // Try to claim file lock
      const lockResult = await lockManager.claimFile(file, AGENT_ID, 1800);
      
      if (!lockResult.success) {
        console.log(`🔒 File ${file} is locked. Attempting coordination...`);
        await handleLockConflict(file, lockResult, prompt, taskId);
        continue;
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
      
      // Check if task needs architecture review (from Claude)
      const needsArchitectureReview = checkForArchitectureNeeds(prompt, code);
      if (needsArchitectureReview) {
        await requestArchitectureReview(file, prompt, taskId);
      }
      
      // Ensure output directory exists
      const outputDir = path.resolve('src/output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: MODEL,
        messages: [{ 
          role: 'user', 
          content: `${prompt}\n\nFile: ${file}\nCode:\n${code}\n\nAs a backend logic specialist, focus on clean implementation, error handling, and maintainability.` 
        }],
        max_tokens: 1200,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: (status) => status < 500
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
      
      // Check if result needs testing
      const needsTesting = checkIfNeedsTesting(file, result);
      if (needsTesting) {
        await requestTesting(file, result, taskId);
      }
      
      // Release file lock
      await lockManager.releaseFile(file, AGENT_ID);
      
      await redis.lrem(`processing:${MODEL}`, 1, job);
      
      // Announce completion
      await communication.broadcastMessage(
        `GPT completed backend logic task: ${file} (${taskId})`,
        'task_completed',
        'low'
      );
      
      console.log(`✅ GPT [${ROLE}] updated: ${file} (Task: ${taskId})`);
      await coordinator.updateStatus('idle');
    } catch (e) {
      console.error(`❌ GPT [${ROLE}] error on ${file}:`, e.message);
      
      // Release lock if held
      try {
        await lockManager.releaseFile(file, AGENT_ID);
      } catch (lockError) {
        console.error(`❌ Error releasing lock:`, lockError);
      }
      
      await communication.sendEmergencyMessage(
        `GPT agent ${AGENT_ID} encountered error on ${file}: ${e.message}`,
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
async function handleLockConflict(file, lockResult, prompt, taskId) {
  const owner = lockResult.owner;
  
  // Try to coordinate with lock owner
  await communication.sendDirectMessage(
    owner,
    `I need to work on ${file} for backend logic. Current task: ${prompt}. Can we coordinate?`,
    'coordination_request',
    'high'
  );
  
  // Wait for file to become available
  const waitResult = await lockManager.waitForFile(file, AGENT_ID, 300);
  if (!waitResult.success) {
    console.log(`⏰ Could not acquire lock for ${file}, re-queuing`);
    await redis.lpush(`queue:${MODEL}`, JSON.stringify({ file, prompt }));
  }
}

function checkForArchitectureNeeds(prompt, code) {
  // Check if this is a major architectural change
  const architecturalKeywords = [
    'refactor', 'restructure', 'redesign', 'architecture',
    'class', 'interface', 'abstract', 'inheritance'
  ];
  
  return architecturalKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword) || code.includes(keyword)
  );
}

async function requestArchitectureReview(file, prompt, taskId) {
  console.log(`🏗️ Requesting architecture review for ${file}`);
  
  // Find available Claude agents
  const onlineAgents = await communication.getOnlineAgents();
  const claudeAgent = onlineAgents.find(agent => agent.type === 'claude');
  
  if (claudeAgent) {
    await communication.sendDirectMessage(
      claudeAgent.id,
      `Architecture review needed for ${file}. Task: ${prompt}. Session: ${taskId}`,
      'review_request',
      'high'
    );
  }
}

function checkIfNeedsTesting(file, result) {
  // Check if this is new logic that needs testing
  const needsTestingPatterns = [
    /function\s+\w+\(/,  // New functions
    /class\s+\w+/,      // New classes
    /async\s+function/, // Async functions
    /\.post\(|\.get\(|\.put\(|\.delete\(/  // API endpoints
  ];
  
  return needsTestingPatterns.some(pattern => pattern.test(result));
}

async function requestTesting(file, result, taskId) {
  console.log(`🧪 Requesting testing for ${file}`);
  
  await communication.requestCodeReview(
    file,
    'deepseek',
    `Please create tests for the backend logic implemented in task ${taskId}`
  );
}

async function handleCodeReview(data) {
  console.log(`📋 Reviewing code as requested by ${data.from}`);
  
  // For now, just acknowledge the review request
  await communication.sendDirectMessage(
    data.from,
    `I'll review the backend logic and provide feedback`,
    'review_acknowledged'
  );
}
