// /cli/runner.js - Enhanced Multi-Agent Orchestrator
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import coordination services
const FileLockManager = require('./file-lock-manager');
const AgentCommunication = require('./agent-communication');

const redis = new Redis(process.env.REDIS_URL);
const FILEMAP_PATH = process.env.FILEMAP_PATH || '../shared/filemap.json';
const TOKENPOOL_PATH = process.env.TOKENPOOL_PATH || '../shared/tokenpool.json';

const fileMap = JSON.parse(fs.readFileSync(FILEMAP_PATH, 'utf-8'));
const tokenPool = JSON.parse(fs.readFileSync(TOKENPOOL_PATH, 'utf-8'));

// Initialize coordination services
const ORCHESTRATOR_ID = `orchestrator-${Date.now()}`;
const lockManager = new FileLockManager();
const communication = new AgentCommunication(ORCHESTRATOR_ID);

const dequeueJob = async () => {
  // Check all model queues for jobs
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  for (const model of models) {
    const job = await redis.lpop(`queue:${model}`);
    if (job) {
      const parsed = JSON.parse(job);
      return { ...parsed, model };
    }
  }
  return null;
};

const assignToken = (model) => {
  const pool = tokenPool[model];
  if (!pool || pool.length === 0) throw new Error(`No tokens available for ${model}`);
  const token = pool.shift();
  pool.push(token); // Rotate
  return token;
};

const submitTask = async (job) => {
  const { model, file, prompt } = job;
  const taskId = `orchestrator_${Date.now()}`;
  
  try {
    // Check for active file locks
    const lockStatus = await lockManager.checkLockStatus(file);
    
    if (lockStatus.locked) {
      console.log(`🔒 File ${file} is locked by ${lockStatus.owner}. Coordinating...`);
      
      // Send coordination message to lock owner
      await communication.sendDirectMessage(
        lockStatus.owner,
        `Orchestrator needs to process ${file}. Task: ${prompt}`,
        'orchestrator_request',
        'high'
      );
      
      // Wait for file to be available or timeout
      const waitResult = await lockManager.waitForFile(file, ORCHESTRATOR_ID, 60000); // 1 minute
      
      if (!waitResult.success) {
        console.log(`⏰ Timeout waiting for ${file}, re-queuing task`);
        await redis.lpush(`queue:${model}`, JSON.stringify(job));
        return;
      }
    }
    
    const token = assignToken(model);
    const content = fs.readFileSync(path.join('./src', file), 'utf-8');

    const payload = {
      model,
      messages: [{ role: 'user', content: `${prompt}\n\nFile content:\n${content}` }],
      max_tokens: 800,
      temperature: 0.3,
    };

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const response = res.data.choices[0].message.content;
    const outputPath = path.join('./src/output', file.replace('/', '__'));
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, response);
    
    // Announce task completion
    await communication.broadcastMessage(
      `Orchestrator completed task: ${file} using ${model} (${taskId})`,
      'task_completed',
      'low'
    );
    
    console.log(`✅ ${model} updated ${file} (Task: ${taskId})`);
    
  } catch (error) {
    console.error(`❌ Task error for ${file}:`, error.message);
    
    // Notify about orchestrator error
    await communication.sendEmergencyMessage(
      `Orchestrator error on ${file}: ${error.message}`,
      'orchestrator_error'
    );
    
    // Re-queue the job
    await redis.lpush(`queue:${model}`, JSON.stringify(job));
  }
};

(async () => {
  console.log(`🎯 Enhanced Multi-Agent Orchestrator starting (ID: ${ORCHESTRATOR_ID})`);
  
  // Announce orchestrator startup
  await communication.broadcastMessage(
    `Multi-Agent Orchestrator ${ORCHESTRATOR_ID} online. Coordinating agent tasks.`,
    'orchestrator_online',
    'normal'
  );
  
  // Set up orchestrator communication handlers
  communication.on('directMessage', async (data) => {
    if (data.type === 'agent_ready') {
      console.log(`🤖 Agent ${data.from} is ready for work`);
    }
    if (data.type === 'coordination_complete') {
      console.log(`✅ Coordination completed by ${data.from} for ${data.file}`);
    }
  });
  
  communication.on('emergencyShutdown', async () => {
    console.log('🛑 Emergency shutdown received');
    await gracefulShutdown();
  });
  
  while (true) {
    try {
      const job = await dequeueJob();
      if (job) {
        console.log(`📋 Processing job: ${job.file} with ${job.model}`);
        await submitTask(job);
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.error('❌ Job Error:', err.message);
      
      // Notify agents about orchestrator error
      await communication.sendEmergencyMessage(
        `Orchestrator encountered error: ${err.message}`,
        'orchestrator_error'
      );
    }
  }
})();

// Graceful shutdown function
async function gracefulShutdown() {
  console.log('🛑 Initiating graceful shutdown...');
  
  // Notify all agents
  await communication.broadcastMessage(
    'Orchestrator shutting down. Please complete current tasks.',
    'orchestrator_shutdown',
    'high'
  );
  
  // Wait a bit for agents to finish
  await new Promise(r => setTimeout(r, 5000));
  
  // Disconnect communication
  await communication.disconnect();
  
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
