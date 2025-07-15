// /cli/enqueue.js
const Redis = require('ioredis');
const path = require('path');
const { primeAgentContext } = require('./context-orchestrator');
const QueueEnhancer = require('./queue-enhancer');

const redis = new Redis(process.env.REDIS_URL);
const filemap = require(path.resolve(process.env.FILEMAP_PATH || '../shared/filemap.json'));

// Initialize queue enhancer with feature flags
const queueEnhancer = new QueueEnhancer(redis, {
  enableFeatures: {
    priorities: process.env.ENABLE_PRIORITIES !== 'false',
    deduplication: process.env.ENABLE_DEDUPLICATION !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    alerts: process.env.ENABLE_ALERTS !== 'false'
  },
  fallbackToLegacy: true
});

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
    const task = { 
      file, 
      prompt, 
      model,
      type: agentType,
      timestamp: new Date().toISOString(),
      agentType 
    };

    try {
      // Use enhanced enqueue with priority detection
      const result = await queueEnhancer.enqueue(`queue:${model}`, task, {
        source: 'enqueue.js'
      });
      
      if (result.success) {
        console.log(`📩 Enqueued ${file} to ${model} (Priority: ${result.priority}, ID: ${result.taskId})`);
        if (result.fallback) {
          console.log(`   ⚠️ Used legacy fallback`);
        }
      } else if (result.reason === 'duplicate') {
        console.log(`🔄 Skipped duplicate ${file} (Original: ${result.originalTaskId})`);
        continue;
      }
      
      // Track enhancement queue assignments
      if (file.startsWith('cli/') && (file.includes('vault') || file.includes('auth') || file.includes('rbac') || file.includes('encryption'))) {
        await queueEnhancer.enqueue('queue:enhancement:security-layer', task, { priority: 'high' });
      } else if (file.startsWith('cli/') && (file.includes('telemetry') || file.includes('metrics') || file.includes('monitoring'))) {
        await queueEnhancer.enqueue('queue:enhancement:observability-stack', task, { priority: 'normal' });
      } else if (file.startsWith('cli/') && (file.includes('queue') || file.includes('kafka') || file.includes('rabbitmq'))) {
        await queueEnhancer.enqueue('queue:enhancement:distributed-queue-system', task, { priority: 'high' });
      } else if (file.startsWith('cli/') && (file.includes('orchestration') || file.includes('ml-agent'))) {
        await queueEnhancer.enqueue('queue:enhancement:intelligent-orchestration', task, { priority: 'normal' });
      } else if (file.startsWith('cli/') && (file.includes('consensus') || file.includes('knowledge') || file.includes('task-negotiation'))) {
        await queueEnhancer.enqueue('queue:enhancement:collaboration-framework', task, { priority: 'normal' });
      } else if ((file.includes('k8s') || file.includes('health') || file.includes('circuit')) && file.startsWith('cli/') || file.startsWith('deployment/')) {
        await queueEnhancer.enqueue('queue:enhancement:self-healing-infrastructure', task, { priority: 'high' });
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
