import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AgentDashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/agent-stats')
      .then((res) => res.json())
      .then((stats) => {
        const formatted = Object.entries(stats).map(([type, s]) => ({
          name: type.toUpperCase(),
          tokens: s.avgTokens,
          runs: s.runs,
          summary: s.lastSummary
        }));
        setData(formatted);
      });
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {data.map((agent) => (
        <Card key={agent.name} className="rounded-2xl shadow-md p-2">
          <CardContent>
            <h2 className="text-xl font-bold mb-2">{agent.name}</h2>
            <p className="text-sm">Runs: {agent.runs}</p>
            <p className="text-sm mb-2">Avg. Tokens: {agent.tokens}</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[agent]}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="tokens" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs mt-2 line-clamp-4 text-muted-foreground">
              {agent.summary}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
