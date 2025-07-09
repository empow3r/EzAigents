// /cli/agent-spawner.js
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL);

const modelEnhancers = {
  'claude': {
    systemFile: 'claude.md',
    intro: 'Ultimate Claude Programming Agent Mode: Autonomous Architect v3.0',
    notes: 'Enable claude.md structure: todo.md, version.md, codebase.md, security.md, notes.md'
  },
  'gemini': {
    systemFile: 'gemini.md',
    intro: 'Gemini Autonomous Engineering Stack Active',
    notes: 'Use Gemini CLI-compatible planning stack: memory.md, blueprint.md, testplan.md'
  },
  'gpt': {
    systemFile: 'openai.md',
    intro: 'GPT Engineering Mode: Multi-Agent Intelligent Builders Activated',
    notes: 'System prompt should include test-first, commit-often mindset with clarity and modularity goals'
  },
  'deepseek': {
    systemFile: 'deepseek.md',
    intro: 'DeepSeek Code Intelligence Mode Activated',
    notes: 'Specialize in recursive pattern learning and symbolic generation. Use references in vector store.'
  }
};

export async function buildSystemPrompt(agentId, model, filePath) {
  const context = await redis.get(`context:${filePath}`);
  const shortModel = Object.keys(modelEnhancers).find(m => model.includes(m));
  const enhancer = modelEnhancers[shortModel] || {};

  const sysPrompt = `# 🧠 AI Agent Spawned: ${agentId}
Model: ${model}

${enhancer.intro || 'Custom Intelligent Agent Mode'}

${enhancer.notes || ''}

## Mission Context
${context || 'No context found.'}

Remember: Always write clean, secure, modular, documented code.`;

  return sysPrompt;
}
