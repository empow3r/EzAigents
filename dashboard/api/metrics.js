// /dashboard/api/metrics/route.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function GET() {
  const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus'];

  const agents = await Promise.all(models.map(async (model) => {
    const [tasks, tokens, cost, lastFile, runtime] = await redis.mget(
      `metrics:${model}:tasks`,
      `metrics:${model}:tokens`,
      `metrics:${model}:cost`,
      `metrics:${model}:lastFile`,
      `metrics:${model}:runtime`
    );

    return {
      name: model.split('-')[0].toUpperCase(),
      model,
      tasks: parseInt(tasks || '0'),
      tokens: parseInt(tokens || '0'),
      cost: parseFloat(cost || '0'),
      lastFile: lastFile || '',
      runtime: parseFloat(runtime || '0'),
    };
  }));

  const timeline = await redis.lrange('timeline', -100, -1);
  const errors = await redis.lrange('errors', -50, -1);

  return new Response(JSON.stringify({ agents, timeline, errors }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
