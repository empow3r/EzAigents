// API route for agent statistics
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function getAgentStats(agentType) {
  try {
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
  } catch (error) {
    console.error(`Error getting stats for ${agentType}:`, error);
    return {
      agentType,
      runs: 0,
      avgTokens: 0,
      lastSummary: 'Error loading stats'
    };
  }
}

export async function getAllAgentStats() {
  try {
    // Get active agents from Redis
    const agentKeys = await redis.keys('agent:*');
    const agents = await Promise.all(
      agentKeys.map(async (key) => {
        const agentData = await redis.hgetall(key);
        return agentData;
      })
    );

    // Get stats for each agent type
    const types = ['claude', 'gemini', 'gpt', 'deepseek', 'mistral'];
    const results = {};
    
    for (const type of types) {
      results[type] = await getAgentStats(type);
    }

    // Add real-time agent status
    const activeAgents = agents.filter(agent => agent.status === 'active');
    results.activeAgents = activeAgents.length;
    results.totalAgents = agents.length;

    return results;
  } catch (error) {
    console.error('Error getting all agent stats:', error);
    return {
      claude: { agentType: 'claude', runs: 0, avgTokens: 0, lastSummary: 'Error loading stats' },
      gemini: { agentType: 'gemini', runs: 0, avgTokens: 0, lastSummary: 'Error loading stats' },
      gpt: { agentType: 'gpt', runs: 0, avgTokens: 0, lastSummary: 'Error loading stats' },
      deepseek: { agentType: 'deepseek', runs: 0, avgTokens: 0, lastSummary: 'Error loading stats' },
      mistral: { agentType: 'mistral', runs: 0, avgTokens: 0, lastSummary: 'Error loading stats' },
      activeAgents: 0,
      totalAgents: 0
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const stats = await getAllAgentStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}