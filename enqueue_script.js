// /cli/enqueue.js
const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL);
const filemap = require(path.resolve(process.env.FILEMAP_PATH || './shared/filemap.json'));

(async () => {
  console.log('🚀 Enqueuing jobs...');
  for (const file in filemap) {
    const { model, prompt } = filemap[file];
    const payload = JSON.stringify({ file, prompt });
    await redis.lpush(`queue:${model}`, payload);
    console.log(`📩 Enqueued ${file} to ${model}`);
  }
  process.exit(0);
})();
