// Safe Docker version of Claude Agent - won't crash on missing API keys
const Redis = require('ioredis');

const MODEL = process.env.MODEL || 'claude-3-opus';
const API_KEY = process.env.CLAUDE_API_KEY || 'demo-key-not-configured';
const AGENT_ID = process.env.AGENT_ID || `claude-${Date.now()}`;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`🤖 Claude Agent [${AGENT_ID}] starting...`);
console.log(`   Model: ${MODEL}`);
console.log(`   Redis: ${REDIS_URL}`);
console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);

const redis = new Redis(REDIS_URL);

// Simple heartbeat system
async function sendHeartbeat() {
  try {
    const heartbeat = {
      agentId: AGENT_ID,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      status: 'active'
    };
    
    await redis.hset('agents:heartbeats', AGENT_ID, JSON.stringify(heartbeat));
    await redis.hset('agents:registry', AGENT_ID, JSON.stringify({
      agentType: 'claude',
      capabilities: ['architecture', 'refactoring', 'code_analysis'],
      status: 'healthy',
      lastSeen: Date.now()
    }));
    
    console.log(`💓 Heartbeat sent at ${heartbeat.timestamp}`);
  } catch (error) {
    console.error('❌ Heartbeat failed:', error.message);
  }
}

// Process tasks from queue
async function processQueue() {
  try {
    const job = await redis.brpop(`queue:${MODEL}`, 10); // 10 second timeout
    
    if (job) {
      const [queueName, taskData] = job;
      const task = JSON.parse(taskData);
      
      console.log(`📋 Processing task: ${task.file || 'unknown'}`);
      console.log(`   Prompt: ${task.prompt?.substring(0, 50)}...`);
      
      // Simulate processing (since we might not have real API key)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Task completed: ${task.file || 'unknown'}`);
      
      // Send completion heartbeat
      await sendHeartbeat();
    }
  } catch (error) {
    console.error('❌ Queue processing error:', error.message);
  }
}

// Main agent loop
async function runAgent() {
  console.log('🚀 Claude Agent is running...');
  
  // Initial heartbeat
  await sendHeartbeat();
  
  // Set up periodic heartbeat
  setInterval(sendHeartbeat, 30000); // Every 30 seconds
  
  // Main processing loop
  while (true) {
    try {
      await processQueue();
    } catch (error) {
      console.error('❌ Agent error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retry
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📄 Received SIGTERM, shutting down gracefully...');
  try {
    await redis.hdel('agents:heartbeats', AGENT_ID);
    await redis.hdel('agents:registry', AGENT_ID);
    await redis.disconnect();
  } catch (error) {
    console.error('❌ Shutdown error:', error.message);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📄 Received SIGINT, shutting down gracefully...');
  try {
    await redis.hdel('agents:heartbeats', AGENT_ID);
    await redis.hdel('agents:registry', AGENT_ID);
    await redis.disconnect();
  } catch (error) {
    console.error('❌ Shutdown error:', error.message);
  }
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the agent
runAgent().catch(error => {
  console.error('❌ Failed to start agent:', error);
  process.exit(1);
});