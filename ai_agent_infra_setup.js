// dashboard/ui/app/page.tsx (Next.js UI)
'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [agents, setAgents] = useState([]);
  const [usage, setUsage] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      const a = await fetch('/api/agents').then(res => res.json());
      const u = await fetch('/api/usage').then(res => res.json());
      setAgents(a);
      setUsage(u);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">🧠 AI Agent Dashboard</h1>
      <h2 className="text-xl font-semibold mt-4">Agents</h2>
      <ul className="grid grid-cols-2 gap-4">
        {agents.map((a: any, i) => (
          <li key={i} className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <div className="font-bold">{a.agent}</div>
            <div>Status: {a.status}</div>
            <div>File: {a.file}</div>
            <div>Cost: ${a.cost}</div>
          </li>
        ))}
      </ul>
      <h2 className="text-xl font-semibold mt-6">Usage Stats</h2>
      <pre className="bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
        {JSON.stringify(usage, null, 2)}
      </pre>
    </div>
  );
}

// api/agents.ts (proxy to Redis backend)
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const data = await fetch('http://localhost:3000/agents').then(r => r.json());
  res.json(data);
}

// api/usage.ts
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const data = await fetch('http://localhost:3000/usage').then(r => r.json());
  res.json(data);
}

// monitor.js (Agent Health + Retry)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
const failedQueue = 'queue:failed';

setInterval(async () => {
  const failed = await redis.lrange(failedQueue, 0, -1);
  for (const msg of failed) {
    const task = JSON.parse(msg);
    const agent = task.agent || 'gpt';
    await redis.publish(`agent:${agent}`, msg);
    await redis.lrem(failedQueue, 0, msg);
    console.log(`🔁 Retried: ${task.file} with ${agent}`);
  }
}, 30000);

// deploy.sh
#!/bin/bash

echo "🚀 Building agents and dashboard..."
docker-compose build

echo "🌐 Starting services via Cloudflare Tunnel + Docker Compose..."
cloudflared tunnel run ai-agents &
sleep 3
docker-compose up --scale agent_claude=10 --scale agent_gpt=10 --scale agent_deepseek=10 -d

echo "✅ System live at: http://localhost:3000"

# Tips:
# - Store secrets in .env
# - Ensure Redis is accessible
# - Cloudflare tunnel must be active
# - Use Railway or Fly.io for external scaling
