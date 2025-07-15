'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Cell,
  Treemap
} from 'recharts';
import { format, subHours, startOfHour } from 'date-fns';

const AgentUtilizationDashboard = ({ refreshInterval = 30000 }) => {
  const [utilizationData, setUtilizationData] = useState([]);
  const [capacityData, setCapacityData] = useState([]);
  const [workloadDistribution, setWorkloadDistribution] = useState([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [loading, setLoading] = useState(true);

  // Agent configuration with capabilities
  const agentConfig = {
    claude: {
      name: 'Claude',
      color: '#3B82F6',
      capabilities: ['architecture', 'refactoring', 'analysis', 'documentation'],
      maxConcurrent: 10,
      specialization: 'Complex Reasoning'
    },
    gpt: {
      name: 'GPT-4',
      color: '#10B981',
      capabilities: ['coding', 'api-design', 'debugging', 'optimization'],
      maxConcurrent: 15,
      specialization: 'General Development'
    },
    deepseek: {
      name: 'DeepSeek',
      color: '#F59E0B',
      capabilities: ['testing', 'validation', 'security', 'performance'],
      maxConcurrent: 12,
      specialization: 'Code Quality'
    },
    mistral: {
      name: 'Mistral',
      color: '#8B5CF6',
      capabilities: ['documentation', 'content', 'translation', 'analysis'],
      maxConcurrent: 8,
      specialization: 'Content Creation'
    },
    gemini: {
      name: 'Gemini',
      color: '#EC4899',
      capabilities: ['multimodal', 'research', 'data-analysis', 'visualization'],
      maxConcurrent: 10,
      specialization: 'Research & Analysis'
    }
  };

  // Generate realistic utilization data
  const generateUtilizationData = useMemo(() => {
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const interval = timeRange === '24h' ? 1 : timeRange === '7d' ? 6 : 24;
    
    const data = [];
    const capacityData = [];
    const workloadData = [];
    const efficiencyData = [];

    // Generate hourly utilization data
    for (let i = hours; i >= 0; i -= interval) {
      const timestamp = subHours(now, i);
      const hour = timestamp.getHours();
      
      // Business hours pattern (9 AM - 5 PM peak usage)
      const businessHoursMultiplier = hour >= 9 && hour <= 17 ? 1.5 : 0.7;
      
      const entry = {
        time: format(timestamp, timeRange === '24h' ? 'HH:mm' : 'MMM dd'),
        timestamp: timestamp.toISOString()
      };

      Object.keys(agentConfig).forEach(agentKey => {
        const config = agentConfig[agentKey];
        const baseUtilization = Math.random() * 60 + 20;
        const utilization = Math.min(100, baseUtilization * businessHoursMultiplier);
        
        entry[`${agentKey}Utilization`] = Math.floor(utilization);
        entry[`${agentKey}Tasks`] = Math.floor((utilization / 100) * config.maxConcurrent);
        entry[`${agentKey}Queue`] = Math.floor(Math.random() * 10 + 2);
      });

      data.push(entry);
    }

    // Generate capacity data
    Object.keys(agentConfig).forEach(agentKey => {
      const config = agentConfig[agentKey];
      const currentUtilization = Math.floor(Math.random() * 40 + 40);
      const avgResponseTime = Math.floor(Math.random() * 300 + 200);
      
      capacityData.push({
        agent: config.name,
        key: agentKey,
        maxCapacity: config.maxConcurrent,
        currentLoad: Math.floor((currentUtilization / 100) * config.maxConcurrent),
        utilization: currentUtilization,
        queueLength: Math.floor(Math.random() * 15 + 5),
        avgResponseTime,
        efficiency: Math.floor(100 - (avgResponseTime / 10)),
        specialization: config.specialization,
        color: config.color
      });
    });

    // Generate workload distribution by task type
    const taskTypes = [
      { name: 'Code Generation', value: 35, color: '#3B82F6' },
      { name: 'Code Review', value: 25, color: '#10B981' },
      { name: 'Documentation', value: 15, color: '#F59E0B' },
      { name: 'Testing', value: 12, color: '#8B5CF6' },
      { name: 'Analysis', value: 8, color: '#EC4899' },
      { name: 'Refactoring', value: 5, color: '#6366F1' }
    ];

    taskTypes.forEach(taskType => {
      workloadData.push({
        ...taskType,
        agents: Object.keys(agentConfig).map(key => ({
          agent: agentConfig[key].name,
          value: Math.floor(Math.random() * taskType.value * 0.5 + taskType.value * 0.5),
          color: agentConfig[key].color
        }))
      });
    });

    // Generate efficiency metrics
    Object.keys(agentConfig).forEach(agentKey => {
      const config = agentConfig[agentKey];
      efficiencyData.push({
        agent: config.name,
        key: agentKey,
        tasksPerHour: Math.floor(Math.random() * 20 + 15),
        avgProcessingTime: Math.floor(Math.random() * 180 + 120),
        successRate: Math.floor(Math.random() * 10 + 90),
        resourceUtilization: Math.floor(Math.random() * 30 + 60),
        bottleneckScore: Math.floor(Math.random() * 40 + 20),
        color: config.color
      });
    });

    return {
      utilization: data,
      capacity: capacityData,
      workload: workloadData,
      efficiency: efficiencyData
    };
  }, [timeRange]);

  useEffect(() => {
    const mockData = generateUtilizationData;
    setUtilizationData(mockData.utilization);
    setCapacityData(mockData.capacity);
    setWorkloadDistribution(mockData.workload);
    setEfficiencyMetrics(mockData.efficiency);
    setLoading(false);

    const interval = setInterval(() => {
      const newMockData = generateUtilizationData;
      setUtilizationData(newMockData.utilization);
      setCapacityData(newMockData.capacity);
      setWorkloadDistribution(newMockData.workload);
      setEfficiencyMetrics(newMockData.efficiency);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [generateUtilizationData, refreshInterval]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
              {entry.name.includes('Utilization') && '%'}
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
          <h2 className="text-lg font-semibold text-gray-900">Agent Utilization Dashboard</h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Agents</option>
              {Object.entries(agentConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Current Capacity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity Utilization */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Current Capacity Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={capacityData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="agent" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="utilization"
                fill="#3B82F6"
                name="Utilization %"
                radius={[0, 4, 4, 0]}
              >
                {capacityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Performance Radar */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={efficiencyMetrics}>
              <PolarGrid />
              <PolarAngleAxis dataKey="agent" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Tasks/Hour"
                dataKey="tasksPerHour"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
              />
              <Radar
                name="Success Rate"
                dataKey="successRate"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
              <Radar
                name="Resource Utilization"
                dataKey="resourceUtilization"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Utilization Timeline */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">Utilization Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={utilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {Object.entries(agentConfig).map(([key, config]) => (
              <Line
                key={key}
                type="monotone"
                dataKey={`${key}Utilization`}
                stroke={config.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={`${config.name} Utilization`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Distribution Treemap */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Task Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={workloadDistribution}
              dataKey="value"
              ratio={4/3}
              stroke="#fff"
              fill="#3B82F6"
            >
              {workloadDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Queue Length vs Response Time */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Queue Length vs Response Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={capacityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="queueLength" 
                name="Queue Length" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                dataKey="avgResponseTime" 
                name="Response Time (ms)" 
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Agents" dataKey="avgResponseTime">
                {capacityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Agent Status Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Detailed Agent Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Specialization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Current Load
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Queue Length
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Efficiency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {capacityData.map((agent) => (
                <tr key={agent.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: agent.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">
                        {agent.agent}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {agent.specialization}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.currentLoad}/{agent.maxCapacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${agent.utilization}%`,
                            backgroundColor: agent.color
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{agent.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.queueLength}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.avgResponseTime}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.efficiency >= 85 ? 'bg-green-100 text-green-800' :
                      agent.efficiency >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {agent.efficiency}%
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

export default AgentUtilizationDashboard;