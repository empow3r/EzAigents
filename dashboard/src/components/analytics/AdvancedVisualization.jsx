'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
  Sankey,
  ScatterChart,
  Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import * as Icons from 'lucide-react';

// Custom color palette for visualizations
const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

// Enhanced tooltip component
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Performance Heatmap Component
const PerformanceHeatmap = ({ data }) => {
  const [selectedMetric, setSelectedMetric] = useState('tasksCompleted');
  
  const heatmapData = data.map((item, index) => ({
    hour: item.time,
    day: Math.floor(index / 24),
    value: item[selectedMetric],
    ...item
  }));

  const getHeatmapColor = (value, max, min) => {
    const intensity = (value - min) / (max - min);
    const opacity = Math.max(0.1, intensity);
    return `rgba(59, 130, 246, ${opacity})`;
  };

  const maxValue = Math.max(...heatmapData.map(d => d.value));
  const minValue = Math.min(...heatmapData.map(d => d.value));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icons.Activity className="w-5 h-5 mr-2" />
          Performance Heatmap
        </CardTitle>
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="border rounded-lg px-3 py-1 text-sm"
        >
          <option value="tasksCompleted">Tasks Completed</option>
          <option value="avgResponseTime">Response Time</option>
          <option value="successRate">Success Rate</option>
          <option value="tokenUsage">Token Usage</option>
        </select>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-24 gap-1">
          {heatmapData.slice(0, 168).map((item, index) => (
            <div
              key={index}
              className="w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-blue-300"
              style={{
                backgroundColor: getHeatmapColor(item.value, maxValue, minValue)
              }}
              title={`${item.hour}: ${item.value} ${selectedMetric}`}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex space-x-1">
            {[0.1, 0.3, 0.5, 0.7, 1.0].map(opacity => (
              <div
                key={opacity}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Agent Performance Radar Chart
const AgentPerformanceRadar = ({ agentData }) => {
  const radarData = agentData.map(agent => ({
    agent: agent.agent,
    efficiency: agent.efficiency,
    speed: 100 - (agent.avgResponseTime / 50), // Inverted for better visualization
    reliability: 100 - (agent.errorRate * 20),
    costEfficiency: agent.roi * 10,
    utilization: agent.utilizationRate
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icons.Target className="w-5 h-5 mr-2" />
          Agent Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="agent" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            {radarData.map((agent, index) => (
              <Radar
                key={agent.agent}
                name={agent.agent}
                dataKey="efficiency"
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.1}
              />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Cost Efficiency Treemap
const CostEfficiencyTreemap = ({ costData }) => {
  const treemapData = costData.agents?.map(agent => ({
    name: agent.agent,
    size: agent.cost,
    efficiency: agent.efficiency,
    color: agent.efficiency >= 85 ? '#10b981' : agent.efficiency >= 75 ? '#f59e0b' : '#ef4444'
  })) || [];

  const CustomTreemapContent = ({ root, depth, x, y, width, height, index, payload, colors, rank, name }) => {
    if (depth === 1) {
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            style={{
              fill: payload.color,
              stroke: '#fff',
              strokeWidth: 2,
              strokeOpacity: 1,
            }}
          />
          <text x={x + width / 2} y={y + height / 2} textAnchor="middle" fill="#fff" fontSize="12">
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 15} textAnchor="middle" fill="#fff" fontSize="10">
            ${payload.size?.toFixed(2)}
          </text>
        </g>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChartIcon className="w-5 h-5 mr-2" />
          Cost Distribution by Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4/3}
            stroke="#fff"
            content={<CustomTreemapContent />}
          />
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2" />
            <span>High Efficiency (85%+)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2" />
            <span>Medium Efficiency (75-84%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2" />
            <span>Low Efficiency (&lt;75%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Real-time Performance Gauge
const PerformanceGauge = ({ value, title, max = 100, unit = '', color = '#3b82f6' }) => {
  const percentage = (value / max) * 100;
  const strokeDasharray = `${percentage * 2.51} 251`;
  
  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color }}>{value}{unit}</div>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2">{title}</p>
    </div>
  );
};

// Anomaly Detection Chart
const AnomalyDetectionChart = ({ performanceData, anomalies }) => {
  const chartData = performanceData.map(point => {
    const hasAnomaly = anomalies.some(anomaly => 
      Math.abs(anomaly.timestamp - point.timestamp) < 60000 // Within 1 minute
    );
    
    return {
      ...point,
      isAnomaly: hasAnomaly,
      anomalyType: hasAnomaly ? anomalies.find(a => Math.abs(a.timestamp - point.timestamp) < 60000)?.type : null
    };
  });

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.isAnomaly) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#ef4444"
          stroke="#fff"
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icons.Brain className="w-5 h-5 mr-2" />
          Anomaly Detection
          {anomalies.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {anomalies.length} detected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="avgResponseTime"
              fill="#3b82f6"
              fillOpacity={0.3}
              stroke="#3b82f6"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="successRate"
              stroke="#10b981"
              strokeWidth={2}
              dot={<CustomDot />}
            />
            <Legend />
          </ComposedChart>
        </ResponsiveContainer>
        {anomalies.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Recent Anomalies:</h4>
            <div className="space-y-2">
              {anomalies.slice(0, 3).map((anomaly, index) => (
                <div key={index} className="text-sm bg-red-50 border border-red-200 rounded p-2">
                  <span className="font-medium text-red-800">{anomaly.type.replace('_', ' ').toUpperCase()}:</span>
                  <span className="text-red-700 ml-2">{anomaly.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Cost vs Performance Scatter Plot
const CostPerformanceScatter = ({ costData }) => {
  const scatterData = costData.agents?.map(agent => ({
    x: agent.cost,
    y: agent.efficiency,
    z: agent.tasksCompleted,
    name: agent.agent,
    color: COLORS[costData.agents.indexOf(agent) % COLORS.length]
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icons.BarChart3 className="w-5 h-5 mr-2" />
          Cost vs Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={scatterData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="Cost ($)" />
            <YAxis dataKey="y" name="Efficiency (%)" />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow">
                      <p className="font-medium">{data.name}</p>
                      <p>Cost: ${data.x.toFixed(2)}</p>
                      <p>Efficiency: {data.y}%</p>
                      <p>Tasks: {data.z}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter dataKey="y" fill="#8884d8">
              {scatterData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 text-sm text-gray-600">
          <p>• Bubble size represents task volume</p>
          <p>• Ideal position: high efficiency (top), low cost (left)</p>
        </div>
      </CardContent>
    </Card>
  );
};

export {
  PerformanceHeatmap,
  AgentPerformanceRadar,
  CostEfficiencyTreemap,
  PerformanceGauge,
  AnomalyDetectionChart,
  CostPerformanceScatter,
  CustomTooltip,
  COLORS
};