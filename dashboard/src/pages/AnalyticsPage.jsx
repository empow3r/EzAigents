'use client';
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  Zap,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const AnalyticsPage = ({ darkMode, realTimeData = {} }) => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('performance');

  const performanceMetrics = [
    { label: 'Task Completion Rate', value: 94, change: +5, target: 95 },
    { label: 'Average Response Time', value: 2.3, change: -0.5, target: 2.0, unit: 's' },
    { label: 'System Uptime', value: 99.9, change: 0, target: 99.9, unit: '%' },
    { label: 'Error Rate', value: 0.8, change: -0.2, target: 1.0, unit: '%' }
  ];

  const costMetrics = {
    today: { tokens: 145000, cost: 2.45 },
    week: { tokens: 980000, cost: 16.80 },
    month: { tokens: 4200000, cost: 72.40 },
    projectedMonth: { tokens: 4500000, cost: 78.00 }
  };

  const agentPerformance = [
    { name: 'Claude', tasks: 342, successRate: 96, avgTime: 1.8, cost: 0.82 },
    { name: 'GPT-4', tasks: 298, successRate: 94, avgTime: 2.1, cost: 0.75 },
    { name: 'DeepSeek', tasks: 156, successRate: 92, avgTime: 1.5, cost: 0.23 },
    { name: 'Mistral', tasks: 89, successRate: 98, avgTime: 1.2, cost: 0.15 },
    { name: 'Gemini', tasks: 67, successRate: 91, avgTime: 2.5, cost: 0.12 }
  ];

  const taskDistribution = [
    { type: 'Refactoring', count: 234, percentage: 35 },
    { type: 'API Development', count: 187, percentage: 28 },
    { type: 'Testing', count: 134, percentage: 20 },
    { type: 'Documentation', count: 67, percentage: 10 },
    { type: 'Analysis', count: 47, percentage: 7 }
  ];

  const predictions = [
    { metric: 'Queue Depth', current: 23, predicted: 45, timeframe: '1h', trend: 'up' },
    { metric: 'Agent Utilization', current: 78, predicted: 65, timeframe: '2h', trend: 'down' },
    { metric: 'Cost per Task', current: 0.18, predicted: 0.16, timeframe: '24h', trend: 'down' },
    { metric: 'Error Rate', current: 0.8, predicted: 1.2, timeframe: '6h', trend: 'up' }
  ];

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics & Insights</h2>
          <p className="text-muted-foreground">
            Performance metrics, cost analysis, and predictive insights
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="agents">Agent Analytics</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {performanceMetrics.map((metric, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </h4>
                  {getChangeIcon(metric.change)}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold">
                    {metric.value}{metric.unit || ''}
                  </span>
                  <span className={`text-sm ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}{metric.unit || ''}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Target: {metric.target}{metric.unit || ''}</span>
                    <span>{((metric.value / metric.target) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(metric.value / metric.target) * 100} className="h-2" />
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Task Distribution</h3>
            <div className="space-y-4">
              {taskDistribution.map((task, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{task.type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{task.count} tasks</span>
                      <Badge variant="outline">{task.percentage}%</Badge>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${task.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value="cost" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Today's Cost</h4>
              </div>
              <p className="text-2xl font-bold">${costMetrics.today.cost}</p>
              <p className="text-sm text-muted-foreground">
                {costMetrics.today.tokens.toLocaleString()} tokens
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Week to Date</h4>
              </div>
              <p className="text-2xl font-bold">${costMetrics.week.cost}</p>
              <p className="text-sm text-muted-foreground">
                {costMetrics.week.tokens.toLocaleString()} tokens
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Month to Date</h4>
              </div>
              <p className="text-2xl font-bold">${costMetrics.month.cost}</p>
              <p className="text-sm text-muted-foreground">
                {costMetrics.month.tokens.toLocaleString()} tokens
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Projected Month</h4>
              </div>
              <p className="text-2xl font-bold">${costMetrics.projectedMonth.cost}</p>
              <p className="text-sm text-muted-foreground">
                {costMetrics.projectedMonth.tokens.toLocaleString()} tokens
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Cost Optimization Suggestions</h3>
            <div className="space-y-3">
              {[
                { suggestion: 'Use DeepSeek for simple refactoring tasks', savings: '~$12/month', impact: 'high' },
                { suggestion: 'Batch similar tasks to reduce context switching', savings: '~$8/month', impact: 'medium' },
                { suggestion: 'Enable smart caching for repetitive queries', savings: '~$5/month', impact: 'low' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="font-medium">{item.suggestion}</p>
                    <p className="text-sm text-muted-foreground">Potential savings: {item.savings}</p>
                  </div>
                  <Badge variant={item.impact === 'high' ? 'default' : item.impact === 'medium' ? 'secondary' : 'outline'}>
                    {item.impact} impact
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Agent Analytics Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Agent Performance Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Agent</th>
                    <th className="text-right py-2">Tasks</th>
                    <th className="text-right py-2">Success Rate</th>
                    <th className="text-right py-2">Avg Time</th>
                    <th className="text-right py-2">Cost/Task</th>
                    <th className="text-right py-2">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 font-medium">{agent.name}</td>
                      <td className="text-right">{agent.tasks}</td>
                      <td className="text-right">
                        <span className={agent.successRate >= 95 ? 'text-green-500' : ''}>
                          {agent.successRate}%
                        </span>
                      </td>
                      <td className="text-right">{agent.avgTime}s</td>
                      <td className="text-right">${(agent.cost / agent.tasks).toFixed(3)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Award 
                              key={i} 
                              className={`h-4 w-4 ${
                                i < Math.floor(agent.successRate / 20) 
                                  ? 'text-yellow-500 fill-yellow-500' 
                                  : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Predictive Analytics</h3>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                ML-Powered
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {predictions.map((prediction, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{prediction.metric}</h4>
                    <Badge variant={prediction.trend === 'up' ? 'destructive' : 'default'}>
                      {prediction.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current</p>
                      <p className="text-xl font-bold">{prediction.current}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Predicted ({prediction.timeframe})</p>
                      <p className="text-xl font-bold">{prediction.predicted}</p>
                    </div>
                  </div>
                  {prediction.metric === 'Error Rate' && prediction.predicted > 1 && (
                    <div className="mt-3 p-2 rounded bg-yellow-500/10 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Consider scaling up agents</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Anomaly Detection</h3>
            <div className="space-y-3">
              {[
                { type: 'warning', message: 'Unusual spike in GPT-4 response times', time: '15m ago' },
                { type: 'info', message: 'Queue depth trending 30% above average', time: '1h ago' },
                { type: 'success', message: 'Cost optimization achieved target savings', time: '3h ago' }
              ].map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg flex items-start gap-3 ${
                  alert.type === 'warning' ? 'bg-yellow-500/10' :
                  alert.type === 'info' ? 'bg-blue-500/10' :
                  'bg-green-500/10'
                }`}>
                  {alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" /> :
                   alert.type === 'info' ? <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" /> :
                   <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;