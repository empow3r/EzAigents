'use client';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  Server, 
  Cpu,
  MemoryStick,
  HardDrive,
  Zap,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

const OverviewPage = ({ darkMode, realTimeData = {} }) => {
  const {
    activeAgents = 0,
    totalTasks = 0,
    completedTasks = 0,
    queueDepth = 0,
    systemHealth = {},
    performance = {}
  } = realTimeData;

  const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const statsCards = [
    {
      title: 'Active Agents',
      value: activeAgents,
      icon: Users,
      trend: '+12%',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Tasks Completed',
      value: `${completedTasks}/${totalTasks}`,
      icon: CheckCircle,
      trend: `${taskProgress.toFixed(0)}%`,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Queue Depth',
      value: queueDepth,
      icon: Clock,
      trend: queueDepth > 50 ? 'High' : 'Normal',
      color: queueDepth > 50 ? 'text-yellow-500' : 'text-blue-500',
      bgColor: queueDepth > 50 ? 'bg-yellow-500/10' : 'bg-blue-500/10'
    },
    {
      title: 'System Health',
      value: systemHealth.status || 'Healthy',
      icon: Activity,
      trend: systemHealth.uptime || '99.9%',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    }
  ];

  const systemMetrics = [
    {
      label: 'CPU Usage',
      value: performance.cpu || 45,
      icon: Cpu,
      max: 100,
      unit: '%'
    },
    {
      label: 'Memory',
      value: performance.memory || 62,
      icon: MemoryStick,
      max: 100,
      unit: '%'
    },
    {
      label: 'Disk Usage',
      value: performance.disk || 38,
      icon: HardDrive,
      max: 100,
      unit: '%'
    },
    {
      label: 'Network',
      value: performance.network || 72,
      icon: Zap,
      max: 100,
      unit: 'Mbps'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
        <p className="text-muted-foreground">
          Real-time monitoring of your AI agent orchestration system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    <span className={`text-sm ${stat.color}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* System Metrics */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">System Resources</h3>
          <p className="text-sm text-muted-foreground">
            Real-time resource utilization
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {systemMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <span className="text-sm font-bold">
                    {metric.value}{metric.unit}
                  </span>
                </div>
                <Progress value={metric.value} max={metric.max} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { agent: 'Claude', task: 'Refactoring auth module', status: 'completed', time: '2m ago' },
              { agent: 'GPT-4', task: 'API endpoint creation', status: 'in-progress', time: '5m ago' },
              { agent: 'DeepSeek', task: 'Unit test generation', status: 'completed', time: '8m ago' },
              { agent: 'Mistral', task: 'Documentation update', status: 'completed', time: '12m ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{activity.agent}</p>
                    <p className="text-xs text-muted-foreground">{activity.task}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
          <div className="space-y-3">
            {[
              { type: 'warning', message: 'High queue depth detected', time: '1m ago' },
              { type: 'info', message: 'New agent spawned: claude_005', time: '15m ago' },
              { type: 'success', message: 'Auto-scaling completed', time: '30m ago' }
            ].map((alert, index) => (
              <div key={index} className={`p-3 rounded-lg flex items-start gap-3 ${
                alert.type === 'warning' ? 'bg-yellow-500/10' :
                alert.type === 'info' ? 'bg-blue-500/10' :
                'bg-green-500/10'
              }`}>
                <AlertCircle className={`h-4 w-4 mt-0.5 ${
                  alert.type === 'warning' ? 'text-yellow-500' :
                  alert.type === 'info' ? 'text-blue-500' :
                  'text-green-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;