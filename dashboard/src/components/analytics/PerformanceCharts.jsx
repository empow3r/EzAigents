'use client';
import React, { useState, useEffect, useMemo } from 'react';
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
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import { format, subHours, subDays, isAfter } from 'date-fns';

const PerformanceCharts = ({ 
  timeRange = '24h',
  refreshInterval = 30000,
  showLiveUpdates = true 
}) => {
  const [performanceData, setPerformanceData] = useState([]);
  const [agentMetrics, setAgentMetrics] = useState([]);
  const [systemHealth, setSystemHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Generate mock performance data (replace with real API calls)
  const generateMockData = useMemo(() => {
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const interval = timeRange === '24h' ? 1 : timeRange === '7d' ? 6 : 24;
    
    const data = [];
    const agentData = [];
    const healthData = [];
    
    // Generate time series data
    for (let i = hours; i >= 0; i -= interval) {
      const timestamp = subHours(now, i);
      const hour = timestamp.getHours();
      
      // Simulate realistic patterns
      const baseLoad = Math.sin((hour / 24) * 2 * Math.PI) * 30 + 50;
      const randomVariation = (Math.random() - 0.5) * 20;
      
      data.push({
        timestamp: timestamp.toISOString(),
        time: format(timestamp, timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
        tasksCompleted: Math.max(0, Math.floor(baseLoad + randomVariation)),
        tasksQueued: Math.floor(Math.random() * 15 + 5),
        avgResponseTime: Math.floor(Math.random() * 300 + 200),
        successRate: Math.min(100, Math.max(85, 98 - Math.random() * 15)),
        activeAgents: Math.floor(Math.random() * 3 + 3),
        cpuUsage: Math.floor(baseLoad * 0.8 + randomVariation * 0.5),
        memoryUsage: Math.floor(Math.random() * 20 + 60),
        errorRate: Math.max(0, Math.random() * 5)
      });
    }

    // Generate agent-specific data
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];
    agents.forEach(agent => {
      agentData.push({
        name: agent,
        tasksCompleted: Math.floor(Math.random() * 100 + 50),
        avgResponseTime: Math.floor(Math.random() * 400 + 200),
        successRate: Math.floor(Math.random() * 15 + 85),
        uptime: Math.floor(Math.random() * 20 + 80),
        tokensProcessed: Math.floor(Math.random() * 50000 + 10000),
        errorCount: Math.floor(Math.random() * 10)
      });
    });

    // Generate system health data
    for (let i = 23; i >= 0; i--) {
      const timestamp = subHours(now, i);
      healthData.push({
        time: format(timestamp, 'HH:mm'),
        overall: Math.floor(Math.random() * 15 + 85),
        agents: Math.floor(Math.random() * 20 + 80),
        api: Math.floor(Math.random() * 10 + 90),
        database: Math.floor(Math.random() * 15 + 85),
        memory: Math.floor(Math.random() * 25 + 75)
      });
    }

    return { performance: data, agents: agentData, health: healthData };
  }, [timeRange]);

  useEffect(() => {
    // Initial data load
    const mockData = generateMockData;
    setPerformanceData(mockData.performance);
    setAgentMetrics(mockData.agents);
    setSystemHealth(mockData.health);
    setLoading(false);

    // Set up real-time updates
    if (showLiveUpdates) {
      const interval = setInterval(() => {
        const newMockData = generateMockData;
        setPerformanceData(newMockData.performance);
        setAgentMetrics(newMockData.agents);
        setSystemHealth(newMockData.health);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [generateMockData, refreshInterval, showLiveUpdates]);

  // Color schemes
  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    purple: '#8B5CF6',
    indigo: '#6366F1',
    pink: '#EC4899',
    teal: '#14B8A6'
  };

  const agentColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? 
                entry.value.toLocaleString() : entry.value}
              {entry.name.includes('Rate') || entry.name.includes('Usage') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Performance Analytics</h2>
            {showLiveUpdates && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live Updates</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Metrics</option>
              <option value="performance">Performance</option>
              <option value="health">System Health</option>
              <option value="agents">Agent Details</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-Time Performance Overview */}
      {(selectedMetric === 'all' || selectedMetric === 'performance') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tasks & Response Time */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Task Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="tasksCompleted"
                  fill={colors.primary}
                  name="Tasks Completed"
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgResponseTime"
                  stroke={colors.warning}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Avg Response Time (ms)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Success Rate & Error Rate */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Success & Error Rates</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="successRate"
                  stackId="1"
                  stroke={colors.success}
                  fill={colors.success}
                  fillOpacity={0.6}
                  name="Success Rate (%)"
                />
                <Area
                  type="monotone"
                  dataKey="errorRate"
                  stackId="2"
                  stroke={colors.error}
                  fill={colors.error}
                  fillOpacity={0.6}
                  name="Error Rate (%)"
                />
                <ReferenceLine y={95} stroke={colors.success} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* System Health Dashboard */}
      {(selectedMetric === 'all' || selectedMetric === 'health') && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">System Health Metrics</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={systemHealth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="overall"
                stroke={colors.primary}
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Overall Health (%)"
              />
              <Line
                type="monotone"
                dataKey="agents"
                stroke={colors.success}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Agents Health (%)"
              />
              <Line
                type="monotone"
                dataKey="api"
                stroke={colors.indigo}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="API Health (%)"
              />
              <Line
                type="monotone"
                dataKey="database"
                stroke={colors.purple}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Database Health (%)"
              />
              <Line
                type="monotone"
                dataKey="memory"
                stroke={colors.pink}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Memory Health (%)"
              />
              <ReferenceLine y={80} stroke={colors.warning} strokeDasharray="5 5" />
              <ReferenceLine y={95} stroke={colors.success} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Agent Performance Breakdown */}
      {(selectedMetric === 'all' || selectedMetric === 'agents') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Task Distribution */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Task Distribution by Agent</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={agentMetrics}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="tasksCompleted"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {agentMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={agentColors[index % agentColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Performance Comparison */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Agent Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentMetrics} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="successRate"
                  fill={colors.success}
                  name="Success Rate (%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Resource Utilization */}
      {(selectedMetric === 'all' || selectedMetric === 'performance') && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Resource Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6B7280"
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="cpuUsage"
                stackId="1"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.6}
                name="CPU Usage (%)"
              />
              <Area
                type="monotone"
                dataKey="memoryUsage"
                stackId="1"
                stroke={colors.purple}
                fill={colors.purple}
                fillOpacity={0.6}
                name="Memory Usage (%)"
              />
              <ReferenceLine y={80} stroke={colors.warning} strokeDasharray="5 5" />
              <ReferenceLine y={90} stroke={colors.error} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Summary Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Agent Performance Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens Processed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentMetrics.map((agent, index) => (
                <tr key={agent.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: agentColors[index] }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {agent.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.tasksCompleted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.successRate >= 95 ? 'bg-green-100 text-green-800' :
                      agent.successRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {agent.successRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.avgResponseTime}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.uptime}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.tokensProcessed.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCharts;