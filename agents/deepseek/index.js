// /agents/deepseek/index.js
const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL);
const MODEL = process.env.MODEL || 'deepseek-coder';
const config = require('./config.js');
const SmartLLMSelector = require('../../shared/smart-llm-selector');
const API_KEY_POOL = process.env.API_KEY_POOL ? process.env.API_KEY_POOL.split(',') : [];
const ROLE = process.env.ROLE || 'test-utils';

let currentKeyIndex = 0;

const getNextApiKey = () => {
  if (API_KEY_POOL.length === 0) throw new Error('No API keys available');
  const key = API_KEY_POOL[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEY_POOL.length;
  return key;
};

(async () => {
  console.log(`🧪 DeepSeek Agent [${ROLE}] starting...`);
  while (true) {
    const job = await redis.rpoplpush(`queue:${MODEL}`, `processing:${MODEL}`);
    if (!job) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }
    const { file, prompt } = JSON.parse(job);
    try {
      const filePath = path.resolve(file);
      
      // Save task start to memory
      memoryManager.startTask(taskId, file, prompt);
      
      // Check if file exists, if not we'll create it
      let code = '';
      let isNewFile = false;
      
      if (!fs.existsSync(filePath)) {
        isNewFile = true;
        code = '// New file to be created\n';
        console.log(`📝 Creating new file: ${filePath}`);
      } else {
        code = fs.readFileSync(filePath, 'utf-8');
        console.log(`📝 Modifying existing file: ${filePath}`);
      }
      
      // Ensure output directory exists
      const outputDir = path.resolve('src/output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Determine the best model for this specific task
      const selector = new SmartLLMSelector();
      const selection = selector.selectBestLLM(prompt, code.length);
      
      let modelToUse = MODEL;
      let endpoint = 'https://api.openrouter.ai/v1/chat/completions';
      let maxTokens = 600;
      
      // Use DeepSeek R1 for complex reasoning tasks
      if (selection.recommended.model === 'deepseek-r1') {
        modelToUse = 'deepseek/deepseek-r1';
        maxTokens = 1000; // R1 can handle more complex outputs
        console.log(`🧠 Using DeepSeek R1 for complex reasoning task`);
      } else if (selection.recommended.model === 'deepseek-coder') {
        modelToUse = 'deepseek/deepseek-coder';
        console.log(`💻 Using DeepSeek Coder for coding task`);
      }

      // If R1 is selected, use direct DeepSeek API if available
      if (modelToUse.includes('deepseek-r1') && process.env.DEEPSEEK_API_KEY) {
        endpoint = 'https://api.deepseek.com/v1/chat/completions';
      }

      const response = await axios.post(endpoint, {
        model: modelToUse,
        messages: [{ 
          role: 'user', 
          content: `${prompt}\n\nCode:\n${code}` 
        }],
        max_tokens: maxTokens,
        temperature: modelToUse.includes('r1') ? 0.0 : 0.1 // R1 works better with 0 temperature
      }, {
        headers: {
          'Authorization': `Bearer ${getNextApiKey()}`,
          'Content-Type': 'application/json'
        },
        timeout: modelToUse.includes('r1') ? 60000 : 30000, // R1 might take longer
        validateStatus: (status) => status < 500
      });
      
      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('Invalid API response');
      }
      
      const result = response.data.choices[0].message.content;
      const outPath = path.join('src/output', `test__${file.replace(/\//g, '__')}`);
      fs.writeFileSync(outPath, result);
      
      // Also write to the actual file location if it's a new file or modification
      if (isNewFile || prompt.includes('create') || prompt.includes('implement')) {
        const actualFileDir = path.dirname(filePath);
        if (!fs.existsSync(actualFileDir)) {
          fs.mkdirSync(actualFileDir, { recursive: true });
        }
        fs.writeFileSync(filePath, result);
        console.log(`✅ ${isNewFile ? 'Created' : 'Updated'} actual file: ${filePath}`);
      }
      
      
      // Save task completion to memory
      memoryManager.completeTask(taskId, outPath, result, isNewFile);
      
      // Verify work before proceeding
      const workVerified = await memoryManager.verifyWork(taskId, filePath);
      if (!workVerified) {
        throw new Error('Work verification failed - output may be corrupted');
      }
      
      // Save learning about this task type
      const taskInsight = `Successfully ${isNewFile ? 'created' : 'modified'} ${file} - deepseek specialization`;
      memoryManager.saveLearning(taskInsight, 'deepseek_tasks');
      
      await redis.lrem(`processing:${MODEL}`, 1, job);
      console.log(`✅ DEEPSEEK [${ROLE}] updated: ${file}`);
      
      // Clear context after successful completion to save tokens
      await memoryManager.clearContextAfterTask(taskId);
    } catch (e) {
      console.error(`❌ DEEPSEEK [${ROLE}] error on ${file}:`, e.message);
      
      // Save error to memory for analysis
      memoryManager.saveError(taskId, e, { file, model: MODEL, role: ROLE });
      await redis.rpoplpush(`processing:${MODEL}`, `queue:${MODEL}`); // requeue
      await redis.lpush('queue:failures', JSON.stringify({ 
        file, 
        model: MODEL, 
        role: ROLE,
        error: e.message,
        timestamp: new Date().toISOString()
      }));
    }
  }
})();
