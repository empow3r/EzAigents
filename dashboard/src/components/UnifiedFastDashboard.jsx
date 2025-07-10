import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, Users, Zap, AlertCircle, CheckCircle, 
  Clock, BarChart, Cpu, Database, Play, Pause
} from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import { useUnifiedRealTimeData } from '../hooks/useUnifiedRealTimeData';

// Lazy load heavy components
const ChartComponent = lazy(() => import('./ChartComponent'));
const Agent3DVisualization = lazy(() => import('./Agent3DFallback'));

// Memoized components
const StatCard = React.memo(({ icon: Icon, title, value, trend, color = "blue" }) => (
  <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon className={`h-4 w-4 text-${color}-500`} />
          {title}
        </span>
        {trend && (
          <Badge variant={trend > 0 ? "success" : "destructive"}>
            {trend > 0 ? '+' : ''}{trend}%
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
    </CardContent>
  </Card>
));

const AgentCard = React.memo(({ agent }) => (
  <Card className="overflow-hidden">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium flex items-center justify-between">
        <span>{agent.name}</span>
        <Badge className={agent.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
          {agent.status}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Tasks</span>
          <span>{agent.tasksCompleted}/{agent.totalTasks}</span>
        </div>
        <Progress value={(agent.tasksCompleted / agent.totalTasks) * 100} />
        <div className="flex justify-between text-xs text-gray-500">
          <span>CPU: {agent.cpu}%</span>
          <span>Memory: {agent.memory}%</span>
        </div>
      </div>
    </CardContent>
  </Card>
));

const UnifiedFastDashboard = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [view3D, setView3D] = useState(false);
  
  // Use unified real-time data hook
  const { 
    agents, 
    queueStats, 
    systemMetrics,
    recentTasks,
    isConnected 
  } = useUnifiedRealTimeData(!isPaused);

  // Memoized calculations
  const stats = useMemo(() => ({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalTasks: queueStats.totalProcessed + queueStats.pending,
    successRate: queueStats.totalProcessed > 0 
      ? Math.round((queueStats.successful / queueStats.totalProcessed) * 100)
      : 0,
    avgResponseTime: systemMetrics.avgResponseTime || 0
  }), [agents, queueStats, systemMetrics]);

  // Optimize rendering
  useEffect(() => {
    // Performance optimization placeholder
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const toggle3D = useCallback(() => {
    setView3D(prev => !prev);
  }, []);

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <div className="min-h-screen bg-gray-50 p-4">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">EzAigents Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time system monitoring</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={togglePause} variant="outline" size="sm">
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={toggle3D} variant="outline" size="sm">
              {view3D ? '2D View' : '3D View'}
            </Button>
            <Badge variant={isConnected ? "success" : "destructive"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard 
            icon={Users} 
            title="Active Agents" 
            value={`${stats.activeAgents}/${stats.totalAgents}`}
            color="blue"
          />
          <StatCard 
            icon={Zap} 
            title="Total Tasks" 
            value={stats.totalTasks}
            trend={12}
            color="green"
          />
          <StatCard 
            icon={CheckCircle} 
            title="Success Rate" 
            value={`${stats.successRate}%`}
            color="emerald"
          />
          <StatCard 
            icon={Clock} 
            title="Avg Response" 
            value={`${stats.avgResponseTime}ms`}
            trend={-8}
            color="orange"
          />
          <StatCard 
            icon={AlertCircle} 
            title="Failed Tasks" 
            value={queueStats.failed}
            color="red"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Status</CardTitle>
              </CardHeader>
              <CardContent>
                {view3D ? (
                  <Suspense fallback={<div>Loading 3D view...</div>}>
                    <div className="h-96">
                      <Agent3DVisualization agents={agents} />
                    </div>
                  </Suspense>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agents.map(agent => (
                      <AgentCard key={agent.id} agent={agent} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Queue Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Queue Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pending</span>
                    <Badge>{queueStats.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Processing</span>
                    <Badge variant="secondary">{queueStats.processing}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <Badge variant="success">{queueStats.successful}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Failed</span>
                    <Badge variant="destructive">{queueStats.failed}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  System Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>{systemMetrics.cpuUsage}%</span>
                    </div>
                    <Progress value={systemMetrics.cpuUsage} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>{systemMetrics.memoryUsage}%</span>
                    </div>
                    <Progress value={systemMetrics.memoryUsage} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Queue Depth</span>
                      <span>{systemMetrics.queueDepth}</span>
                    </div>
                    <Progress value={Math.min((systemMetrics.queueDepth / 100) * 100, 100)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentTasks.slice(0, 5).map((task, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{task.file}</span>
                        <Badge 
                          variant={task.status === 'completed' ? 'success' : 
                                  task.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{task.timestamp}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading chart...</div>}>
                <div className="h-64">
                  <ChartComponent data={systemMetrics.history || []} />
                </div>
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default UnifiedFastDashboard;