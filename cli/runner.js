// /cli/runner.js - Enhanced Multi-Agent Orchestrator
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import coordination services
const FileLockManager = require('./file-lock-manager');
const AgentCommunication = require('./agent-communication');
const QueueEnhancer = require('./queue-enhancer');

const redis = new Redis(process.env.REDIS_URL);

// Initialize queue enhancer for priority-aware dequeuing
const queueEnhancer = new QueueEnhancer(redis, {
  enableFeatures: {
    priorities: process.env.ENABLE_PRIORITIES !== 'false',
    deduplication: process.env.ENABLE_DEDUPLICATION !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    alerts: process.env.ENABLE_ALERTS !== 'false'
  },
  fallbackToLegacy: true
});
const FILEMAP_PATH = process.env.FILEMAP_PATH || '../shared/filemap.json';
const TOKENPOOL_PATH = process.env.TOKENPOOL_PATH || '../shared/tokenpool.json';

let fileMap, tokenPool;

// Async initialization
const initializeConfig = async () => {
  try {
    const [fileMapData, tokenPoolData] = await Promise.all([
      fs.promises.readFile(FILEMAP_PATH, 'utf-8'),
      fs.promises.readFile(TOKENPOOL_PATH, 'utf-8')
    ]);
    fileMap = JSON.parse(fileMapData);
    tokenPool = JSON.parse(tokenPoolData);
  } catch (error) {
    console.error('Failed to load configuration files:', error);
    process.exit(1);
  }
};

// Initialize coordination services
const ORCHESTRATOR_ID = `orchestrator-${Date.now()}`;
const lockManager = new FileLockManager();
const communication = new AgentCommunication(ORCHESTRATOR_ID);

const dequeueJob = async () => {
  // Use enhanced priority-aware dequeuing
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  const queueKeys = models.map(model => `queue:${model}`);
  
  try {
    const result = await queueEnhancer.dequeue(queueKeys, 1000); // 1 second timeout
    if (result) {
      const { queue, task, priority, fallback } = result;
      const model = queue.replace('queue:', '');
      
      if (fallback) {
        console.log(`   ⚠️ Used legacy dequeue for ${queue}`);
      }
      
      console.log(`📋 Dequeued ${task.file || 'unknown'} from ${queue} (Priority: ${priority})`);
      return { ...task, model, priority };
    }
  } catch (error) {
    console.error('Error dequeuing job:', error);
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
    const content = await fs.promises.readFile(path.join('./src', file), 'utf-8');

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
      },
      timeout: 30000,
      validateStatus: (status) => status < 500
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
      `Orchestrator completed task: ${file} using ${model} (${taskId}, Priority: ${job.priority || 'normal'})`,
      'task_completed',
      'low'
    );
    
    console.log(`✅ ${model} updated ${file} (Task: ${taskId}, Priority: ${job.priority || 'normal'})`);
    
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
  
  // Initialize configuration files
  await initializeConfig();
  
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
  
  // Listen for queue control messages
  const queueControlSubscriber = new Redis(process.env.REDIS_URL);
  queueControlSubscriber.subscribe('queue:control', 'queue:emergency');
  
  queueControlSubscriber.on('message', async (channel, message) => {
    try {
      const controlMessage = JSON.parse(message);
      
      if (channel === 'queue:emergency' && controlMessage.action === 'emergency_stop') {
        console.log('🚨 Emergency stop received:', controlMessage.reason);
        await gracefulShutdown();
      }
      
      if (channel === 'queue:control') {
        console.log('📢 Queue control message:', controlMessage);
      }
    } catch (error) {
      console.error('Error processing queue control message:', error);
    }
  });
  
  while (true) {
    try {
      // Check for emergency stop
      const emergencyStop = await redis.get('queue:emergency_stop');
      if (emergencyStop === 'true') {
        console.log('🛑 Emergency stop is active, waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      const job = await dequeueJob();
      if (job) {
        // Check if specific queue is paused
        const queuePaused = await redis.get(`queue:${job.model}:paused`);
        if (queuePaused === 'true') {
          console.log(`⏸️ Queue ${job.model} is paused, re-queuing task`);
          // Put the job back at the front of the queue
          if (queueEnhancer) {
            await queueEnhancer.enqueue(`queue:${job.model}`, job, { priority: job.priority });
          } else {
            await redis.lpush(`queue:${job.model}`, JSON.stringify(job));
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        console.log(`📋 Processing job: ${job.file} with ${job.model} (Priority: ${job.priority})`);
        await submitTask(job);
      }
      // No need for timeout - BLPOP handles blocking
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
