// /dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge, TimerReset, Bug, DollarSign } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { estimateCostComparison } from '../api/cost-estimate';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>({});
  const [showCost, setShowCost] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/metrics')
        .then((res) => res.json())
        .then((data) => setMetrics(data));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const renderAgent = (agent: any) => {
    const comparison = estimateCostComparison(agent.model, agent.tokens);

    return (
      <Card className="w-full max-w-xl mx-auto mb-4 shadow-md">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">🤖 {agent.name}</h3>
            <span className="text-sm text-muted-foreground">Model: {agent.model}</span>
          </div>
          <div className="text-sm mt-2">
            <p>Tasks processed: <strong>{agent.tasks}</strong></p>
            <p>Last file: <code>{agent.lastFile}</code></p>
            <p>Total tokens used: <strong>{agent.tokens}</strong></p>
            <p>Total AI cost: <strong>${agent.cost.toFixed(4)}</strong></p>
            <p>Runtime: <strong>{agent.runtime}s</strong></p>
            {showCost && (
              <div className="mt-2 bg-gray-900 p-3 rounded-lg">
                <p>👨‍💻 Human Est: <strong>${comparison.humanCost}</strong> ({comparison.humanHours} hrs)</p>
                <p>🧠 AI Est: <strong>${comparison.aiCost}</strong></p>
                <p>💸 Saved: <strong>${comparison.savings}</strong></p>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-between">
            <Button variant="outline" size="sm">Trace</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCost(!showCost)}>
              <DollarSign className="w-4 h-4 mr-1" /> {showCost ? 'Hide ROI' : 'Compare Cost'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">🧠 AI Agent Mesh Dashboard</h1>
      <Tabs defaultValue="agents" className="w-full max-w-6xl mx-auto">
        <TabsList className="flex justify-center">
          <TabsTrigger value="agents"><Gauge className="w-4 h-4 mr-1" /> Agents</TabsTrigger>
          <TabsTrigger value="timeline"><TimerReset className="w-4 h-4 mr-1" /> Timeline</TabsTrigger>
          <TabsTrigger value="errors"><Bug className="w-4 h-4 mr-1" /> Errors</TabsTrigger>
        </TabsList>
        <TabsContent value="agents">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {metrics.agents?.map(renderAgent)}
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <pre className="bg-black text-green-400 text-xs p-4 rounded-xl overflow-auto max-h-[500px]">
            {metrics.timeline?.join('\n') || 'No timeline data.'}
          </pre>
        </TabsContent>
        <TabsContent value="errors">
          <pre className="bg-black text-red-400 text-xs p-4 rounded-xl overflow-auto max-h-[500px]">
            {metrics.errors?.join('\n') || 'No recent errors.'}
          </pre>
        </TabsContent>
      </Tabs>
    </main>
  );
}
