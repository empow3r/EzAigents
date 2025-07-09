// /cli/runner.js
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL);
const FILEMAP_PATH = process.env.FILEMAP_PATH || './filemap.json';
const TOKENPOOL_PATH = process.env.TOKENPOOL_PATH || './tokenpool.json';

const fileMap = JSON.parse(fs.readFileSync(FILEMAP_PATH, 'utf-8'));
const tokenPool = JSON.parse(fs.readFileSync(TOKENPOOL_PATH, 'utf-8'));

const dequeueJob = async () => {
  const job = await redis.lpop('agent:tasks');
  return job ? JSON.parse(job) : null;
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
  fs.writeFileSync(outputPath, response);
  console.log(`✅ ${model} updated ${file}`);
};

(async () => {
  console.log('🎯 Orchestrator running...');
  while (true) {
    try {
      const job = await dequeueJob();
      if (job) await submitTask(job);
      else await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error('❌ Job Error:', err.message);
    }
  }
})();
