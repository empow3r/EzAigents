// /agents/mistral/index.js
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL);
const MODEL = process.env.MODEL || 'command-r-plus';
const API_KEY = process.env.API_KEY;
const ROLE = process.env.ROLE || 'docgen';

(async () => {
  console.log(`📄 Mistral Doc Agent [${ROLE}] ready...`);
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

      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: MODEL,
        messages: [{ role: 'user', content: `${prompt}\n\nFile:\n${code}` }],
        max_tokens: 800,
        temperature: 0.4
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data.choices[0].message.content;
      const outPath = path.join('/src/output', `doc__${file.replace('/', '__')}`);
      fs.writeFileSync(outPath, result);
      await redis.lrem(`processing:${MODEL}`, 1, job);
      console.log(`✅ Mistral generated docs for: ${file}`);
    } catch (e) {
      console.error(`❌ Mistral error on ${file}:`, e.message);
      await redis.rpoplpush(`processing:${MODEL}`, `queue:${MODEL}`);
    }
  }
})();
