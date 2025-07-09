// /cli/orchestrator-autotuner.js
import { getAllAgentStats } from '../server/agent-dashboard-api.js';
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

const MODELS = {
  claude: 'claude-3-opus',
  gemini: 'gemini-pro',
  gpt: 'gpt-4o',
  deepseek: 'deepseek-coder-r1'
};

export async function autoTuneOrchestration() {
  const stats = await getAllAgentStats();

  // Prefer lower token use, same role specialization
  const sorted = Object.entries(stats).sort(([, a], [, b]) => a.avgTokens - b.avgTokens);

  const bestAgent = sorted[0];
  const [bestType, bestData] = bestAgent;

  // Set next default for general tasks
  await redis.set('orchestrator:preferred_model', MODELS[bestType]);

  console.log(`✅ Orchestrator auto-tuned: Using ${MODELS[bestType]} based on ${bestData.runs} runs with avg ${bestData.avgTokens} tokens.`);

  return {
    bestModel: MODELS[bestType],
    reasoning: bestData.lastSummary
  };
}
