// /cli/agent-sync-service.js
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const redis = new Redis(process.env.REDIS_URL);
const FILE_KEYS = ['todo.md', 'version.md', 'codebase.md', 'notes.md', 'security.md', 'memory.md', 'blueprint.md', 'workflow.md'];

export async function syncAgentMemory(agentId, basePath) {
  const dir = path.join(basePath, '.ai');
  for (const file of FILE_KEYS) {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
      const contents = fs.readFileSync(filePath, 'utf-8');
      await redis.set(`agent:${agentId}:memory:${file}`, contents);
    }
  }
  await redis.set(`agent:${agentId}:lastSync`, new Date().toISOString());
  return true;
}

export async function fetchAgentMemory(agentId, file) {
  return await redis.get(`agent:${agentId}:memory:${file}`);
}
