// /server/agent-dashboard-api.js
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function getAgentStats(agentType) {
  const raw = await redis.get(`agent-kb:${agentType}`);
  const history = raw?.split('---\n') || [];
  const runs = history.length;
  const last = history.at(-2) || 'No recent run.';

  const tokens = history.reduce((acc, entry) => {
    const match = entry.match(/Tokens: (\d+)/);
    return acc + (match ? parseInt(match[1]) : 0);
  }, 0);

  const avgTokens = runs > 0 ? Math.round(tokens / runs) : 0;

  return {
    agentType,
    runs,
    avgTokens,
    lastSummary: last.slice(0, 300)
  };
}

export async function getAllAgentStats() {
  const types = ['claude', 'gemini', 'gpt', 'deepseek'];
  const results = {};
  for (const type of types) {
    results[type] = await getAgentStats(type);
  }
  return results;
}
