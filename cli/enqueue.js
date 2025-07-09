// /cli/enqueue.js
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');
const { primeAgentContext } = require('./context-orchestrator');

const redis = new Redis(process.env.REDIS_URL);
const filemap = require(path.resolve(process.env.FILEMAP_PATH || './shared/filemap.json'));

(async () => {
  console.log('🚀 Enqueuing jobs...');
  for (const file in filemap) {
    const { model, prompt } = filemap[file];
    const agentType = model.includes('claude') ? 'nextjs-core' :
                      model.includes('gpt') ? 'copywriter-genius' :
                      model.includes('deepseek') ? 'database-specialist' :
                      model;

    const fullContext = await primeAgentContext(agentType, file, prompt);
    const payload = JSON.stringify({ file, prompt });

    try {
      await redis.lpush(`queue:${model}`, payload);
      console.log(`📩 Enqueued ${file} to ${model}`);
    } catch (err) {
      console.error(`❌ Failed to enqueue ${file}:`, err.message);
      try {
        await redis.lpush(`queue:failures`, JSON.stringify({ file, model, reason: err.message }));
      } catch {}
    }
  }
  process.exit(0);
})();
