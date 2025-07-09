#!/usr/bin/env node

/**
 * Agent Status Monitor
 * Quick status check for all agents and queues
 */

const Redis = require('ioredis');

async function checkStatus() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  console.log('\n🤖 Ez Aigent System Status\n');
  
  // Check agents
  const agents = await redis.keys('agent:*');
  const activeAgents = new Set();
  
  console.log('Active Agents:');
  console.log('─'.repeat(60));
  
  for (const key of agents) {
    if (key.includes(':status:')) {
      const agentId = key.split(':')[2];
      const status = await redis.get(key);
      const ttl = await redis.ttl(key);
      
      if (ttl > 0) {
        activeAgents.add(agentId);
        console.log(`${agentId.substring(0, 30).padEnd(32)} ${(status || 'unknown').padEnd(15)} ${ttl}s TTL`);
      }
    }
  }
  
  console.log('─'.repeat(60));
  console.log(`Total: ${activeAgents.size} active agents\n`);
  
  // Check queues
  console.log('Queue Status:');
  console.log('─'.repeat(60));
  console.log('Queue'.padEnd(20) + 'Pending'.padEnd(10) + 'Processing'.padEnd(12) + 'Failed');
  console.log('─'.repeat(60));
  
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
  const failed = await redis.llen('queue:failures');
  
  for (const model of models) {
    const pending = await redis.llen(`queue:${model}`);
    const processing = await redis.llen(`processing:${model}`);
    
    console.log(
      model.padEnd(20) + 
      pending.toString().padEnd(10) + 
      processing.toString().padEnd(12) + 
      (model === models[0] ? failed : '')
    );
  }
  
  console.log('─'.repeat(60));
  
  // Check locks
  const locks = await redis.keys('file_lock:*');
  console.log(`\n🔒 Active file locks: ${locks.length}`);
  
  if (locks.length > 0 && locks.length <= 10) {
    for (const lock of locks) {
      const file = lock.replace('file_lock:', '');
      const owner = await redis.get(lock);
      console.log(`   ${file} → ${owner}`);
    }
  }
  
  // API health
  const healthKeys = await redis.keys('health:status:*');
  let healthy = 0, unhealthy = 0;
  
  for (const key of healthKeys) {
    const status = await redis.get(key);
    if (status) {
      const data = JSON.parse(status);
      if (data.status === 'healthy') healthy++;
      else unhealthy++;
    }
  }
  
  console.log(`\n🏥 API Health: ${healthy} healthy, ${unhealthy} unhealthy`);
  
  await redis.quit();
}

checkStatus().catch(console.error);