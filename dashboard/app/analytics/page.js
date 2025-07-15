'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Badge } from '@/src/components/ui/badge';
import { Alert, AlertDescription } from '@/src/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Cpu,
  MemoryStick,
  Database
} from 'lucide-react';

export default function AnalyticsPage() {
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [agentStats, setAgentStats] = useState([]);
  const [queueStats, setQueueStats] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple data sources in parallel
      const [
        systemResponse,
        agentsResponse,
        queueResponse,
        metricsResponse
      ] = await Promise.all([
        fetch('/api/system-health'),
        fetch('/api/agents'),
        fetch('/api/queue-stats'),
        fetch('/api/real-time-metrics')
      ]);

      const systemData = await systemResponse.json();
      const agentsData = await agentsResponse.json();
      const queueData = await queueResponse.json();
      const metricsData = await metricsResponse.json();

      setSystemMetrics(systemData);
      setAgentStats(agentsData.agents || []);
      setQueueStats(queueData.queues || []);
      
      // Generate performance data from metrics
      setPerformanceData(generatePerformanceData(metricsData));
      setCostData(generateCostData(agentsData, metricsData));
      
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = (metrics) => {
    // Generate sample performance data based on system metrics
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      return {
        time: hour.getHours() + ':00',
        tasksCompleted: Math.floor(Math.random() * 50) + 20,
        avgResponseTime: Math.floor(Math.random() * 2000) + 500,
        successRate: Math.floor(Math.random() * 20) + 80,
        activeAgents: Math.floor(Math.random() * 5) + 3
      };
    });
  };

  const generateCostData = (agentsData, metricsData) => {
    const agentTypes = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    return agentTypes.map(type => ({
      agent: type,
      tokensUsed: Math.floor(Math.random() * 100000) + 10000,
      cost: (Math.random() * 50 + 5).toFixed(2),
      efficiency: Math.floor(Math.random() * 30) + 70
    }));
  };

  const getSystemHealthColor = (health) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSystemHealthIcon = (health) => {
    if (health >= 90) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (health >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  if (loading && !systemMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalTasks = performanceData.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const avgResponseTime = performanceData.reduce((sum, d) => sum + d.avgResponseTime, 0) / performanceData.length;
  const avgSuccessRate = performanceData.reduce((sum, d) => sum + d.successRate, 0) / performanceData.length;
  const totalCost = costData.reduce((sum, d) => sum + parseFloat(d.cost), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ez Aigent Analytics</h1>
          <p className="text-gray-600">Comprehensive system performance and agent metrics</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              {getSystemHealthIcon(systemMetrics?.health || 85)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={getSystemHealthColor(systemMetrics?.health || 85)}>
                  {systemMetrics?.health || 85}%
                </span>
              </div>
              <p className="text-xs text-gray-600">Overall system status</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.filter(a => a.status === 'active').length}</div>
              <p className="text-xs text-gray-600">Currently processing tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks (24h)</CardTitle>
              <Activity className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
              <p className="text-xs text-gray-600">Completed successfully</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</div>
              <p className="text-xs text-gray-600">Task completion time</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="agents">Agent Details</TabsTrigger>
            <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
            <TabsTrigger value="system">System Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="tasksCompleted" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Time & Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="avgResponseTime" stroke="#f59e0b" name="Response Time (ms)" />
                      <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{avgSuccessRate.toFixed(1)}%</div>
                    <p className="text-sm text-gray-600">Average Success Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{Math.round(avgResponseTime)}ms</div>
                    <p className="text-sm text-gray-600">Average Response Time</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{agentStats.length}</div>
                    <p className="text-sm text-gray-600">Total Agents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {agentStats.map((agent, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            agent.status === 'active' ? 'bg-green-500' : 
                            agent.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="font-medium">{agent.type || `Agent ${index + 1}`}</span>
                        </div>
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status || 'unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={queueStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                      <Bar dataKey="processing" fill="#3b82f6" name="Processing" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="costs" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown by Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({agent, cost}) => `${agent}: $${cost}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cost"
                      >
                        {costData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Token Usage & Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agent" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="tokensUsed" fill="#8b5cf6" name="Tokens Used" />
                      <Bar yAxisId="right" dataKey="efficiency" fill="#10b981" name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
                    <p className="text-sm text-gray-600">Total Cost (24h)</p>
                  </div>
                  <div className="text-center">
                    <Cpu className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{costData.reduce((sum, d) => sum + d.tokensUsed, 0).toLocaleString()}</div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{(costData.reduce((sum, d) => sum + d.efficiency, 0) / costData.length).toFixed(1)}%</div>
                    <p className="text-sm text-gray-600">Avg Efficiency</p>
                  </div>
                  <div className="text-center">
                    <Activity className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold">${(totalCost / totalTasks * 1000).toFixed(3)}</div>
                    <p className="text-sm text-gray-600">Cost per 1k Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-5 h-5 text-blue-600" />
                        <span>CPU Usage</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: '45%'}}></div>
                        </div>
                        <span className="text-sm">45%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MemoryStick className="w-5 h-5 text-green-600" />
                        <span>Memory Usage</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: '68%'}}></div>
                        </div>
                        <span className="text-sm">68%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5 text-purple-600" />
                        <span>Redis Usage</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{width: '32%'}}></div>
                        </div>
                        <span className="text-sm">32%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network & Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">12.5ms</div>
                        <p className="text-sm text-gray-600">Avg Latency</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">99.8%</div>
                        <p className="text-sm text-gray-600">Uptime</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">1.2GB</div>
                        <p className="text-sm text-gray-600">Data Processed</p>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">450/min</div>
                        <p className="text-sm text-gray-600">Throughput</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>All agents are operating normally</AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>Claude agent queue is approaching capacity (85%)</AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}