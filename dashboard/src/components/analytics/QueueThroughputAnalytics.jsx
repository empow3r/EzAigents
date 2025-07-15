'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { format, subHours, subMinutes } from 'date-fns';

const QueueThroughputAnalytics = ({ refreshInterval = 15000 }) => {
  const [throughputData, setThroughputData] = useState([]);
  const [queueMetrics, setQueueMetrics] = useState([]);
  const [priorityAnalysis, setPriorityAnalysis] = useState([]);
  const [bottleneckData, setBottleneckData] = useState([]);
  const [timeRange, setTimeRange] = useState('6h');
  const [selectedQueue, setSelectedQueue] = useState('all');
  const [loading, setLoading] = useState(true);

  // Queue configuration
  const queueConfig = {
    'claude-3-opus': { 
      name: 'Claude Opus', 
      color: '#3B82F6',
      priority: 'high',
      maxThroughput: 120 
    },
    'gpt-4o': { 
      name: 'GPT-4o', 
      color: '#10B981',
      priority: 'normal',
      maxThroughput: 150 
    },
    'deepseek-coder': { 
      name: 'DeepSeek Coder', 
      color: '#F59E0B',
      priority: 'normal',
      maxThroughput: 100 
    },
    'mistral-large': { 
      name: 'Mistral Large', 
      color: '#8B5CF6',
      priority: 'low',
      maxThroughput: 80 
    },
    'gemini-pro': { 
      name: 'Gemini Pro', 
      color: '#EC4899',
      priority: 'normal',
      maxThroughput: 110 
    }
  };

  const priorityLevels = ['urgent', 'high', 'normal', 'low'];
  const priorityColors = {
    urgent: '#EF4444',
    high: '#F97316',
    normal: '#3B82F6',
    low: '#6B7280'
  };

  // Generate realistic throughput data
  const generateThroughputData = useMemo(() => {
    const now = new Date();
    const hours = timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 72;
    const intervalMinutes = timeRange === '6h' ? 10 : timeRange === '24h' ? 60 : 240;
    
    const data = [];
    const metricsData = [];
    const priorityData = [];
    const bottleneckData = [];

    // Generate time series data
    for (let i = hours * 60; i >= 0; i -= intervalMinutes) {
      const timestamp = subMinutes(now, i);
      const hour = timestamp.getHours();
      const minute = timestamp.getMinutes();
      
      // Business hours pattern with micro-variations
      const businessMultiplier = hour >= 9 && hour <= 17 ? 1.4 : 0.6;
      const randomVariation = (Math.random() - 0.5) * 0.4;
      
      const entry = {
        time: format(timestamp, timeRange === '6h' ? 'HH:mm' : 'MMM dd HH:mm'),
        timestamp: timestamp.toISOString(),
        totalThroughput: 0,
        totalQueued: 0,
        totalProcessing: 0,
        avgWaitTime: 0,
        totalCompleted: 0,
        totalFailed: 0
      };

      // Generate data for each queue
      Object.entries(queueConfig).forEach(([queueKey, config]) => {
        const baseThroughput = config.maxThroughput * businessMultiplier * (1 + randomVariation);
        const throughput = Math.max(0, Math.floor(baseThroughput));
        const queued = Math.floor(Math.random() * 20 + 5);
        const processing = Math.floor(Math.random() * 8 + 2);
        const waitTime = Math.floor(Math.random() * 300 + 100);
        const completed = Math.floor(throughput * 0.95);
        const failed = Math.floor(throughput * 0.05);

        entry[`${queueKey}Throughput`] = throughput;
        entry[`${queueKey}Queued`] = queued;
        entry[`${queueKey}Processing`] = processing;
        entry[`${queueKey}WaitTime`] = waitTime;
        entry[`${queueKey}Completed`] = completed;
        entry[`${queueKey}Failed`] = failed;

        entry.totalThroughput += throughput;
        entry.totalQueued += queued;
        entry.totalProcessing += processing;
        entry.totalCompleted += completed;
        entry.totalFailed += failed;
      });

      entry.avgWaitTime = Math.floor(
        Object.entries(queueConfig).reduce((sum, [key]) => 
          sum + entry[`${key}WaitTime`], 0
        ) / Object.keys(queueConfig).length
      );

      data.push(entry);
    }

    // Generate current queue metrics
    Object.entries(queueConfig).forEach(([queueKey, config]) => {
      const currentThroughput = Math.floor(Math.random() * config.maxThroughput * 0.8 + config.maxThroughput * 0.2);
      const utilizationPercent = Math.floor((currentThroughput / config.maxThroughput) * 100);
      
      metricsData.push({
        queue: config.name,
        key: queueKey,
        currentThroughput,
        maxThroughput: config.maxThroughput,
        utilization: utilizationPercent,
        queueLength: Math.floor(Math.random() * 25 + 5),
        avgProcessingTime: Math.floor(Math.random() * 200 + 150),
        completionRate: Math.floor(Math.random() * 8 + 92),
        priority: config.priority,
        color: config.color,
        bottleneckRisk: utilizationPercent > 80 ? 'high' : utilizationPercent > 60 ? 'medium' : 'low'
      });
    });

    // Generate priority analysis
    priorityLevels.forEach(priority => {
      const totalTasks = Math.floor(Math.random() * 200 + 100);
      const completedTasks = Math.floor(totalTasks * (Math.random() * 0.2 + 0.8));
      const avgWaitTime = Math.floor(Math.random() * 300 + (priority === 'urgent' ? 50 : priority === 'high' ? 150 : 250));
      
      priorityData.push({
        priority,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        avgWaitTime,
        completionRate: Math.floor((completedTasks / totalTasks) * 100),
        color: priorityColors[priority]
      });
    });

    // Generate bottleneck analysis
    const bottleneckFactors = [
      { factor: 'API Rate Limits', impact: Math.floor(Math.random() * 30 + 10), color: '#EF4444' },
      { factor: 'Queue Capacity', impact: Math.floor(Math.random() * 20 + 5), color: '#F97316' },
      { factor: 'Agent Availability', impact: Math.floor(Math.random() * 25 + 15), color: '#3B82F6' },
      { factor: 'Network Latency', impact: Math.floor(Math.random() * 15 + 5), color: '#8B5CF6' },
      { factor: 'Processing Complexity', impact: Math.floor(Math.random() * 40 + 20), color: '#10B981' }
    ];

    bottleneckFactors.forEach(item => {
      bottleneckData.push(item);
    });

    return {
      throughput: data,
      metrics: metricsData,
      priority: priorityData,
      bottlenecks: bottleneckData
    };
  }, [timeRange]);

  useEffect(() => {
    const mockData = generateThroughputData;
    setThroughputData(mockData.throughput);
    setQueueMetrics(mockData.metrics);
    setPriorityAnalysis(mockData.priority);
    setBottleneckData(mockData.bottlenecks);
    setLoading(false);

    const interval = setInterval(() => {
      const newMockData = generateThroughputData;
      setThroughputData(newMockData.throughput);
      setQueueMetrics(newMockData.metrics);
      setPriorityAnalysis(newMockData.priority);
      setBottleneckData(newMockData.bottlenecks);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [generateThroughputData, refreshInterval]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {typeof entry.value === 'number' ? 
                entry.value.toLocaleString() : entry.value}
              {entry.name.includes('Time') && 'ms'}
              {entry.name.includes('Rate') && '%'}
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
        {[1, 2, 3, 4].map(i => (
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
            <h2 className="text-lg font-semibold text-gray-900">Queue Throughput Analytics</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Real-time</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="72h">Last 3 Days</option>
            </select>
            
            <select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Queues</option>
              {Object.entries(queueConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Throughput</p>
              <p className="text-2xl font-bold text-blue-600">
                {queueMetrics.reduce((sum, q) => sum + q.currentThroughput, 0)}
              </p>
              <p className="text-xs text-gray-500">tasks/hour</p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Wait Time</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.floor(queueMetrics.reduce((sum, q) => sum + q.avgProcessingTime, 0) / queueMetrics.length)}ms
              </p>
              <p className="text-xs text-gray-500">processing time</p>
            </div>
            <div className="text-3xl">⏱️</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queue Utilization</p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.floor(queueMetrics.reduce((sum, q) => sum + q.utilization, 0) / queueMetrics.length)}%
              </p>
              <p className="text-xs text-gray-500">average usage</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-emerald-600">
                {Math.floor(queueMetrics.reduce((sum, q) => sum + q.completionRate, 0) / queueMetrics.length)}%
              </p>
              <p className="text-xs text-gray-500">completion rate</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>
      </div>

      {/* Throughput Timeline */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">Throughput Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={throughputData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="totalThroughput"
              fill="#3B82F6"
              fillOpacity={0.3}
              stroke="#3B82F6"
              strokeWidth={2}
              name="Total Throughput"
            />
            
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgWaitTime"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Avg Wait Time (ms)"
            />
            
            <Bar
              yAxisId="left"
              dataKey="totalQueued"
              fill="#8B5CF6"
              fillOpacity={0.7}
              name="Queued Tasks"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Queue Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Individual Queue Performance */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Queue Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={queueMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="queue" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="utilization"
                name="Utilization %"
                radius={[4, 4, 0, 0]}
              >
                {queueMetrics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Level Analysis */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Priority Level Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart data={priorityAnalysis}>
              <Tooltip content={<CustomTooltip />} />
              <Funnel
                dataKey="totalTasks"
                data={priorityAnalysis}
                isAnimationActive
              >
                <LabelList position="center" fill="#fff" stroke="none" />
                {priorityAnalysis.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">Bottleneck Impact Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={bottleneckData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="factor" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="impact"
              name="Impact Score"
              radius={[0, 4, 4, 0]}
            >
              {bottleneckData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Queue Status */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Detailed Queue Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Throughput</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue Length</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Processing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bottleneck Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {queueMetrics.map((queue) => (
                <tr key={queue.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: queue.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{queue.queue}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {queue.currentThroughput}/{queue.maxThroughput} tasks/h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${queue.utilization}%`,
                            backgroundColor: queue.color
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{queue.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {queue.queueLength}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {queue.avgProcessingTime}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {queue.completionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      queue.bottleneckRisk === 'high' ? 'bg-red-100 text-red-800' :
                      queue.bottleneckRisk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {queue.bottleneckRisk}
                    </span>
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

export default QueueThroughputAnalytics;