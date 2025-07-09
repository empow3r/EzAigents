// /agents/claude/index.js
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL);
const MODEL = process.env.MODEL || 'claude-3-opus';
const API_KEY = process.env.API_KEY;
const ROLE = process.env.ROLE || 'refactor-core';

(async () => {
  console.log(`🤖 Claude Agent [${ROLE}] starting...`);
  while (true) {
    const job = await redis.rpoplpush(`queue:${MODEL}`, `processing:${MODEL}`);
    if (!job) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    const { file, prompt } = JSON.parse(job);
    try {
      const filePath = path.join('/src', file);
      const code = fs.readFileSync(filePath, 'utf-8');
      const response = await axios.post('https://api.openrouter.ai/v1/chat/completions', {
        model: MODEL,
        messages: [{ role: 'user', content: `${prompt}\n\nCode:\n${code}` }],
        max_tokens: 1024,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const result = response.data.choices[0].message.content;
      const outPath = path.join('/src/output', file.replace('/', '__'));
      fs.writeFileSync(outPath, result);
      await redis.lrem(`processing:${MODEL}`, 1, job);
      console.log(`✅ Claude updated: ${file}`);
    } catch (e) {
      console.error(`❌ Claude error on ${file}:`, e.message);
      await redis.rpoplpush(`processing:${MODEL}`, `queue:${MODEL}`); // requeue
    }
  }
})();
