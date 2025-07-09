// /cli/enqueue.js
const Redis = require('ioredis');
const path = require('path');
const { primeAgentContext } = require('./context-orchestrator');

const redis = new Redis(process.env.REDIS_URL);
const filemap = require(path.resolve(process.env.FILEMAP_PATH || './shared/filemap.json'));

(async () => {
  console.log('🚀 Enqueuing jobs...');
  for (const file in filemap) {
    // Skip enhancement_mode configuration
    if (file === 'enhancement_mode') continue;
    
    const { model, prompt } = filemap[file];
    if (!model || !prompt) {
      console.log(`⚠️  Skipping ${file} - missing model or prompt`);
      continue;
    }
    
    const agentType = model.includes('claude') ? 'refactor-core' :
                      model.includes('gpt') ? 'backend-logic' :
                      model.includes('deepseek') ? 'test-utils' :
                      model.includes('command-r') ? 'docgen' :
                      model.includes('gemini') ? 'analysis' :
                      'refactor-core';

    await primeAgentContext(agentType, file, prompt);
    const payload = JSON.stringify({ 
      file, 
      prompt, 
      model,
      timestamp: new Date().toISOString(),
      agentType 
    });

    try {
      await redis.lpush(`queue:${model}`, payload);
      console.log(`📩 Enqueued ${file} to ${model}`);
      
      // Track enhancement queue assignments
      if (file.startsWith('cli/') && (file.includes('vault') || file.includes('auth') || file.includes('rbac') || file.includes('encryption'))) {
        await redis.lpush('queue:enhancement:security-layer', payload);
      } else if (file.startsWith('cli/') && (file.includes('telemetry') || file.includes('metrics') || file.includes('monitoring'))) {
        await redis.lpush('queue:enhancement:observability-stack', payload);
      } else if (file.startsWith('cli/') && (file.includes('queue') || file.includes('kafka') || file.includes('rabbitmq'))) {
        await redis.lpush('queue:enhancement:distributed-queue-system', payload);
      } else if (file.startsWith('cli/') && (file.includes('orchestration') || file.includes('ml-agent'))) {
        await redis.lpush('queue:enhancement:intelligent-orchestration', payload);
      } else if (file.startsWith('cli/') && (file.includes('consensus') || file.includes('knowledge') || file.includes('task-negotiation'))) {
        await redis.lpush('queue:enhancement:collaboration-framework', payload);
      } else if ((file.includes('k8s') || file.includes('health') || file.includes('circuit')) && file.startsWith('cli/') || file.startsWith('deployment/')) {
        await redis.lpush('queue:enhancement:self-healing-infrastructure', payload);
      }
      
    } catch (err) {
      console.error(`❌ Failed to enqueue ${file}:`, err.message);
      try {
        await redis.lpush(`queue:failures`, JSON.stringify({ file, model, reason: err.message, timestamp: new Date().toISOString() }));
      } catch {
        // Ignore failures queue errors
      }
    }
  }
  
  // Initialize enhancement progress tracking
  const enhancements = ['security-layer', 'observability-stack', 'distributed-queue-system', 'intelligent-orchestration', 'collaboration-framework', 'self-healing-infrastructure'];
  for (const enhancement of enhancements) {
    const exists = await redis.exists(`enhancement:progress:${enhancement}`);
    if (!exists) {
      await redis.set(`enhancement:progress:${enhancement}`, '0');
    }
  }
  
  console.log('✅ All jobs enqueued successfully!');
  process.exit(0);
})();
