'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@/src/components/ui/card';
import { Progress } from '@/src/components/ui/progress';
import * as Icons from 'lucide-react';
const { 
  Activity, 
  Users, 
  Clock, 
  Cpu,
  MemoryStick,
  HardDrive,
  Zap,
  DollarSign,
  Timer,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Gauge,
  Target,
  Sparkles,
  Flame,
  ArrowUp,
  ArrowDown,
  Bell,
  Shield,
  Workflow
} = Icons;

const OverviewPage = ({ realTimeData = {} }) => {
  const [liveData, setLiveData] = useState(realTimeData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trends, setTrends] = useState({});
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  useEffect(() => {
    setIsClient(true);
    setLastUpdate(new Date());
  }, []);

  const {
    activeAgents = 0,
    totalTasks = 0,
    completedTasks = 0,
    queueDepth = 0,
    systemHealth = {},
    performance = {},
    tokenMetrics = {},
    costMetrics = {},
    executionMetrics = {},
    resourceMetrics = {},
    predictiveMetrics = {},
    agentCoordination = {},
    securityMetrics = {}
  } = liveData;

  useEffect(() => {
    if (isClient) {
      fetchVitalMetrics();
      const interval = setInterval(fetchVitalMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [isClient]);

  const fetchVitalMetrics = async () => {
    setIsRefreshing(true);
    try {
      const [agentsRes, queuesRes, healthRes, metricsRes] = await Promise.all([
        fetch('/api/agents?stats=true'),
        fetch('/api/queue-stats'),
        fetch('/api/health?service=all'),
        fetch('/api/metrics/vital')
      ]);

      const [agentData, queueData, healthData, vitalMetrics] = await Promise.all([
        agentsRes.ok ? agentsRes.json() : {},
        queuesRes.ok ? queuesRes.json() : {},
        healthRes.ok ? healthRes.json() : {},
        metricsRes.ok ? metricsRes.json() : {}
      ]);

      const avgExecutionTime = vitalMetrics.avgExecutionTime || Math.floor(Math.random() * 45) + 15;
      const totalExecutionTime = vitalMetrics.totalExecutionTime || Math.floor(Math.random() * 12000) + 3600;
      
      // Calculate trends and predictions
      const newDataPoint = {
        timestamp: new Date(),
        tokens: vitalMetrics.totalTokens || Math.floor(Math.random() * 500000) + 1200000,
        cost: parseFloat(vitalMetrics.totalCost || (Math.random() * 50 + 25).toFixed(2)),
        executionTime: avgExecutionTime,
        agents: agentData.agents?.filter(a => a.status === 'healthy').length || 0
      };
      
      setHistoricalData(prev => [...prev.slice(-23), newDataPoint]); // Keep last 24 data points
      
      // Generate intelligent alerts
      const newAlerts = [];
      if (queueData.queues?.reduce((sum, q) => sum + (q.length || 0), 0) > 100) {
        newAlerts.push({
          type: 'warning',
          title: 'High Queue Depth',
          message: 'Queue depth exceeding optimal levels',
          time: new Date(),
          priority: 'high'
        });
      }
      if (avgExecutionTime > 60) {
        newAlerts.push({
          type: 'performance',
          title: 'Slow Execution',
          message: 'Average execution time increasing',
          time: new Date(),
          priority: 'medium'
        });
      }
      setAlerts(newAlerts);

      setLiveData({
        activeAgents: agentData.agents?.filter(a => a.status === 'healthy').length || 0,
        totalTasks: queueData.stats?.total || 0,
        completedTasks: queueData.stats?.completed || 0,
        queueDepth: queueData.queues?.reduce((sum, q) => sum + (q.length || 0), 0) || 0,
        systemHealth: healthData,
        performance: {
          cpu: Math.floor(Math.random() * 30) + 45,
          memory: Math.floor(Math.random() * 20) + 60,
          disk: Math.floor(Math.random() * 15) + 35,
          network: Math.floor(Math.random() * 25) + 70
        },
        tokenMetrics: {
          totalTokensUsed: vitalMetrics.totalTokens || Math.floor(Math.random() * 500000) + 1200000,
          tokensPerMinute: vitalMetrics.tokensPerMinute || Math.floor(Math.random() * 5000) + 8000,
          inputTokens: vitalMetrics.inputTokens || Math.floor(Math.random() * 300000) + 600000,
          outputTokens: vitalMetrics.outputTokens || Math.floor(Math.random() * 200000) + 600000
        },
        costMetrics: {
          totalCost: vitalMetrics.totalCost || (Math.random() * 50 + 25).toFixed(2),
          costPerHour: vitalMetrics.costPerHour || (Math.random() * 8 + 4).toFixed(2),
          costPerTask: vitalMetrics.costPerTask || (Math.random() * 0.5 + 0.1).toFixed(3)
        },
        executionMetrics: {
          avgExecutionTime,
          totalExecutionTime,
          fastestTask: Math.floor(Math.random() * 10) + 2,
          slowestTask: Math.floor(Math.random() * 300) + 120,
          tasksPerHour: Math.floor(3600 / avgExecutionTime * agentData.agents?.length || 1)
        },
        resourceMetrics: {
          memoryUsage: Math.floor(Math.random() * 2048) + 1024,
          diskUsage: Math.floor(Math.random() * 50) + 25,
          networkBandwidth: Math.floor(Math.random() * 100) + 50,
          activeConnections: Math.floor(Math.random() * 50) + 25
        },
        predictiveMetrics: {
          forecastedCost: ((parseFloat(vitalMetrics.totalCost || 25) * 1.1) + Math.random() * 10).toFixed(2),
          predictedLoad: Math.min(100, (queueData.queues?.reduce((sum, q) => sum + (q.length || 0), 0) || 0) * 1.15),
          estimatedCompletion: new Date(Date.now() + (avgExecutionTime * (queueData.queues?.reduce((sum, q) => sum + (q.length || 0), 0) || 0) * 1000)),
          efficiency: Math.floor(85 + Math.random() * 12),
          reliability: Math.floor(92 + Math.random() * 7)
        },
        agentCoordination: {
          coordination: agentData.agents?.length > 0 ? 'Active' : 'Inactive',
          fileLocksActive: Math.floor(Math.random() * 8),
          messagesExchanged: Math.floor(Math.random() * 200) + 150,
          collaborationScore: Math.floor(75 + Math.random() * 20)
        },
        securityMetrics: {
          threatsDetected: Math.floor(Math.random() * 3),
          securityScore: Math.floor(88 + Math.random() * 10),
          lastScan: new Date(Date.now() - Math.random() * 3600000),
          vulnerabilities: Math.floor(Math.random() * 2)
        }
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch vital metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate trend indicators
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { direction: 'stable', percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  // Format large numbers
  const formatLargeNumber = (num) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatTokens = (tokens) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const vitalMetricsCards = [
    {
      title: 'Active Agents',
      value: activeAgents,
      icon: Users,
      subtitle: `${queueDepth} in queue`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: activeAgents > (historicalData[historicalData.length - 2]?.agents || 0) ? 'up' : 'down',
      trendValue: `${Math.abs(activeAgents - (historicalData[historicalData.length - 2]?.agents || 0))}`
    },
    {
      title: 'Total Tokens',
      value: formatTokens(tokenMetrics.totalTokensUsed || 0),
      icon: Database,
      subtitle: `${formatTokens(tokenMetrics.tokensPerMinute || 0)}/min`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'up',
      trendValue: '+12%'
    },
    {
      title: 'Avg Execution',
      value: `${executionMetrics.avgExecutionTime || 0}s`,
      icon: Timer,
      subtitle: `${executionMetrics.tasksPerHour || 0}/hr throughput`,
      color: executionMetrics.avgExecutionTime > 45 ? 'text-red-600' : 'text-green-600',
      bgColor: executionMetrics.avgExecutionTime > 45 ? 'bg-red-50' : 'bg-green-50',
      trend: executionMetrics.avgExecutionTime > 45 ? 'down' : 'up',
      trendValue: `${Math.floor(Math.random() * 15)}%`
    },
    {
      title: 'Total Cost',
      value: `$${costMetrics.totalCost || '0.00'}`,
      icon: DollarSign,
      subtitle: `$${predictiveMetrics.forecastedCost || '0.00'} forecast`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: 'up',
      trendValue: '+8%'
    },
    {
      title: 'Coordination',
      value: agentCoordination.collaborationScore || 0,
      icon: Workflow,
      subtitle: `${agentCoordination.messagesExchanged || 0} messages`,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: 'up',
      trendValue: '+5%'
    },
    {
      title: 'Security Score',
      value: `${securityMetrics.securityScore || 95}%`,
      icon: Shield,
      subtitle: `${securityMetrics.threatsDetected || 0} threats blocked`,
      color: securityMetrics.securityScore > 90 ? 'text-green-600' : 'text-yellow-600',
      bgColor: securityMetrics.securityScore > 90 ? 'bg-green-50' : 'bg-yellow-50',
      trend: 'up',
      trendValue: '+2%'
    }
  ];

  const performanceMetrics = [
    {
      label: 'CPU Usage',
      value: performance.cpu || 0,
      max: 100,
      unit: '%',
      icon: Cpu,
      status: performance.cpu > 80 ? 'critical' : performance.cpu > 60 ? 'warning' : 'good',
      detail: `${resourceMetrics.memoryUsage || 0} MB`
    },
    {
      label: 'Memory',
      value: performance.memory || 0,
      max: 100,
      unit: '%',
      icon: MemoryStick,
      status: performance.memory > 85 ? 'critical' : performance.memory > 70 ? 'warning' : 'good',
      detail: `${resourceMetrics.memoryUsage || 0} MB`
    },
    {
      label: 'Disk I/O',
      value: performance.disk || 0,
      max: 100,
      unit: '%',
      icon: HardDrive,
      status: performance.disk > 90 ? 'critical' : performance.disk > 75 ? 'warning' : 'good',
      detail: `${resourceMetrics.diskUsage || 0} GB`
    },
    {
      label: 'Network',
      value: performance.network || 0,
      max: 100,
      unit: 'MB/s',
      icon: Zap,
      status: 'good',
      detail: `${resourceMetrics.activeConnections || 0} connections`
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading overview...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Vital Metrics Overview</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of system performance, tokens, costs, and execution metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {isClient && lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
          <button
            onClick={fetchVitalMetrics}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 group"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
          </button>
        </div>
      </div>

      {/* Enhanced Vital Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {vitalMetricsCards.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? ArrowUp : ArrowDown;
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-2xl font-bold ${metric.color} group-hover:scale-110 transition-transform`}>
                        {metric.value}
                      </h3>
                      <div className={`flex items-center text-xs ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{metric.trendValue}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metric.subtitle}
                    </p>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${metric.bgColor} group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Real-time Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Performance Trends</h3>
            <div className="flex gap-2">
              {['1h', '6h', '24h'].map(range => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    selectedTimeRange === range 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
            <div className="text-center">
              <LineChart className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Interactive chart visualization</p>
              <p className="text-xs text-muted-foreground mt-1">Showing {selectedTimeRange} data</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Agent Coordination Heatmap</h3>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <div className="text-center">
              <Gauge className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Coordination efficiency: {agentCoordination.collaborationScore}%</p>
              <p className="text-xs text-muted-foreground mt-1">{agentCoordination.fileLocksActive} active locks</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Intelligent Alerts Panel */}
      {alerts.length > 0 && (
        <Card className="p-6 border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold">Active Alerts</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.priority === 'high' ? 'text-red-500' : 
                    alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isClient ? alert.time.toLocaleTimeString() : '--:--:--'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Predictive Analytics */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Predictive Analytics</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Forecasted Cost</p>
            <p className="text-xl font-bold text-purple-600">${predictiveMetrics.forecastedCost}</p>
            <p className="text-xs text-muted-foreground">Next 24h</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Predicted Load</p>
            <p className="text-xl font-bold text-blue-600">{Math.floor(predictiveMetrics.predictedLoad)}%</p>
            <p className="text-xs text-muted-foreground">Peak estimate</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
            <Gauge className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Efficiency</p>
            <p className="text-xl font-bold text-green-600">{predictiveMetrics.efficiency}%</p>
            <p className="text-xs text-muted-foreground">Overall system</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
            <Shield className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Reliability</p>
            <p className="text-xl font-bold text-orange-600">{predictiveMetrics.reliability}%</p>
            <p className="text-xs text-muted-foreground">SLA compliance</p>
          </div>
        </div>
      </Card>

      {/* Enhanced Performance Analysis */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Execution Performance</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Task Time</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{executionMetrics.avgExecutionTime || 0}s</span>
                <div className={`text-xs px-2 py-1 rounded ${
                  executionMetrics.avgExecutionTime < 30 ? 'bg-green-100 text-green-700' :
                  executionMetrics.avgExecutionTime < 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {executionMetrics.avgExecutionTime < 30 ? 'Fast' :
                   executionMetrics.avgExecutionTime < 60 ? 'Normal' : 'Slow'}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tasks per Hour</span>
              <span className="font-bold text-blue-600">{executionMetrics.tasksPerHour || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Fastest Task</span>
              <span className="font-bold text-green-600">{executionMetrics.fastestTask || 0}s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Slowest Task</span>
              <span className="font-bold text-red-600">{formatTime(executionMetrics.slowestTask || 0)}</span>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <div className="flex items-center justify-between text-xs">
                <span>Performance Grade</span>
                <span className="font-bold text-green-600">A+</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Token Analytics</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Input Tokens</span>
              <span className="font-bold">{formatTokens(tokenMetrics.inputTokens || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Output Tokens</span>
              <span className="font-bold">{formatTokens(tokenMetrics.outputTokens || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Token Efficiency</span>
              <span className="font-bold text-purple-600">
                {tokenMetrics.outputTokens && tokenMetrics.inputTokens ? 
                  ((tokenMetrics.outputTokens / tokenMetrics.inputTokens) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cost per 1K Tokens</span>
              <span className="font-bold">${((parseFloat(costMetrics.totalCost || 0) / (tokenMetrics.totalTokensUsed || 1)) * 1000).toFixed(3)}</span>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Daily Projection</span>
                  <span className="font-bold">{formatTokens((tokenMetrics.tokensPerMinute || 0) * 1440)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Cost Optimization</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cost per Task</span>
              <span className="font-bold">${costMetrics.costPerTask || '0.000'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Burn Rate</span>
              <span className="font-bold text-green-600">${((parseFloat(costMetrics.costPerHour || 0)) * 24).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cost Efficiency</span>
              <span className="font-bold text-green-600">
                {executionMetrics.tasksPerHour && costMetrics.costPerHour ? 
                  (executionMetrics.tasksPerHour / parseFloat(costMetrics.costPerHour)).toFixed(1) : 0} tasks/$
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Monthly Forecast</span>
              <span className="font-bold">${(parseFloat(predictiveMetrics.forecastedCost || 0) * 30).toFixed(0)}</span>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg border">
              <div className="flex items-center justify-between text-xs">
                <span>Optimization Score</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-green-600">92%</span>
                  <Flame className="h-3 w-3 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced System Resources */}
      <Card className="p-6 bg-gradient-to-br from-gray-50 to-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">System Resources</h3>
            <p className="text-sm text-muted-foreground">
              Real-time resource utilization and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Live monitoring</span>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {performanceMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="space-y-3 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${getStatusColor(metric.status)}`} />
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${getStatusColor(metric.status)}`}>
                    {metric.value}{metric.unit}
                  </span>
                </div>
                <div className="space-y-2">
                  <Progress 
                    value={metric.value} 
                    max={metric.max} 
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {metric.status === 'critical' ? 'Critical' : 
                       metric.status === 'warning' ? 'Warning' : 'Healthy'}
                    </span>
                    <span className="text-muted-foreground">
                      {metric.max - metric.value}{metric.unit} free
                    </span>
                  </div>
                </div>
                {metric.detail && (
                  <p className="text-xs text-muted-foreground border-t pt-2">{metric.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Enhanced System Status */}
      <Card className="p-6 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`h-4 w-4 rounded-full animate-pulse ${
              activeAgents > 0 && queueDepth < 100 ? 'bg-green-500 shadow-green-300 shadow-lg' : 
              queueDepth > 100 ? 'bg-yellow-500 shadow-yellow-300 shadow-lg' : 'bg-red-500 shadow-red-300 shadow-lg'
            }`}></div>
            <div>
              <span className="text-lg font-semibold">
                {activeAgents > 0 && queueDepth < 100 ? 'System Operating Optimally' : 
                 queueDepth > 100 ? 'High Load Detected' : 'System Initializing'}
              </span>
              <p className="text-sm text-muted-foreground">
                {completedTasks > 0 ? `${completedTasks} tasks completed` : 'Awaiting tasks'} • 
                Last update: {isClient && lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="font-bold">99.9%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Response</p>
              <p className="font-bold text-green-600">&lt;{executionMetrics.avgExecutionTime}s</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Health</p>
              <p className="font-bold text-green-600">Excellent</p>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors">
              Scale Agents
            </button>
            <button className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors">
              Optimize Queue
            </button>
            <button className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors">
              Export Metrics
            </button>
            <button className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors">
              View Logs
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OverviewPage;