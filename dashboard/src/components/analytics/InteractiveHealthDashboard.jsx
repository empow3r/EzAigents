'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format, subMinutes } from 'date-fns';

const InteractiveHealthDashboard = ({ refreshInterval = 10000 }) => {
  const [healthData, setHealthData] = useState([]);
  const [systemComponents, setSystemComponents] = useState([]);
  const [alertsData, setAlertsData] = useState([]);
  const [resourceMetrics, setResourceMetrics] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState('all');
  const [alertLevel, setAlertLevel] = useState('all');
  const [timeWindow, setTimeWindow] = useState('1h');
  const [loading, setLoading] = useState(true);

  // System component configuration
  const componentConfig = {
    api_gateway: {
      name: 'API Gateway',
      color: '#3B82F6',
      criticalThreshold: 95,
      warningThreshold: 85,
      category: 'infrastructure'
    },
    database: {
      name: 'Database',
      color: '#10B981',
      criticalThreshold: 90,
      warningThreshold: 80,
      category: 'data'
    },
    redis_cache: {
      name: 'Redis Cache',
      color: '#F59E0B',
      criticalThreshold: 85,
      warningThreshold: 75,
      category: 'data'
    },
    llm_agents: {
      name: 'LLM Agents',
      color: '#8B5CF6',
      criticalThreshold: 92,
      warningThreshold: 82,
      category: 'compute'
    },
    queue_system: {
      name: 'Queue System',
      color: '#EC4899',
      criticalThreshold: 88,
      warningThreshold: 78,
      category: 'infrastructure'
    },
    auth_service: {
      name: 'Auth Service',
      color: '#6366F1',
      criticalThreshold: 95,
      warningThreshold: 85,
      category: 'security'
    },
    monitoring: {
      name: 'Monitoring',
      color: '#14B8A6',
      criticalThreshold: 90,
      warningThreshold: 80,
      category: 'observability'
    },
    file_storage: {
      name: 'File Storage',
      color: '#F97316',
      criticalThreshold: 80,
      warningThreshold: 70,
      category: 'storage'
    }
  };

  const alertTypes = {
    critical: { color: '#EF4444', icon: '🚨', priority: 1 },
    warning: { color: '#F59E0B', icon: '⚠️', priority: 2 },
    info: { color: '#3B82F6', icon: 'ℹ️', priority: 3 }
  };

  // Generate real-time health data
  const generateHealthData = useMemo(() => {
    const now = new Date();
    const minutes = timeWindow === '1h' ? 60 : timeWindow === '6h' ? 360 : 1440;
    const interval = timeWindow === '1h' ? 2 : timeWindow === '6h' ? 10 : 30;
    
    const data = [];
    const componentsData = [];
    const alerts = [];
    const resources = [];

    // Generate time series data
    for (let i = minutes; i >= 0; i -= interval) {
      const timestamp = subMinutes(now, i);
      
      const entry = {
        time: format(timestamp, timeWindow === '1h' ? 'HH:mm' : 'MMM dd HH:mm'),
        timestamp: timestamp.toISOString(),
        overallHealth: 0,
        componentCount: Object.keys(componentConfig).length
      };

      let totalHealth = 0;
      Object.entries(componentConfig).forEach(([componentKey, config]) => {
        // Simulate realistic health patterns
        const baseHealth = 95 - Math.random() * 10;
        const timeVariation = Math.sin((timestamp.getTime() / 3600000) * Math.PI) * 5;
        const randomSpike = Math.random() > 0.95 ? -20 : 0; // Occasional issues
        
        const health = Math.max(0, Math.min(100, baseHealth + timeVariation + randomSpike));
        entry[`${componentKey}_health`] = Math.round(health);
        totalHealth += health;

        // Generate alerts based on health thresholds
        if (health < config.criticalThreshold) {
          if (Math.random() > 0.8) { // Don't create too many alerts
            alerts.push({
              id: `alert_${componentKey}_${i}`,
              timestamp: timestamp.toISOString(),
              component: config.name,
              componentKey,
              type: health < (config.criticalThreshold - 10) ? 'critical' : 'warning',
              message: health < (config.criticalThreshold - 10) 
                ? `${config.name} is experiencing critical issues (${Math.round(health)}% health)`
                : `${config.name} performance degraded (${Math.round(health)}% health)`,
              value: health,
              threshold: config.criticalThreshold,
              category: config.category
            });
          }
        }
      });

      entry.overallHealth = Math.round(totalHealth / Object.keys(componentConfig).length);
      data.push(entry);
    }

    // Generate current component status
    Object.entries(componentConfig).forEach(([componentKey, config]) => {
      const currentHealth = Math.floor(Math.random() * 30 + 70);
      const responseTime = Math.floor(Math.random() * 200 + 50);
      const uptime = Math.floor(Math.random() * 5 + 95);
      const requests = Math.floor(Math.random() * 1000 + 500);
      const errors = Math.floor(requests * (100 - currentHealth) / 1000);
      
      const status = currentHealth >= config.criticalThreshold ? 'healthy' :
                    currentHealth >= config.warningThreshold ? 'warning' : 'critical';

      componentsData.push({
        component: config.name,
        key: componentKey,
        health: currentHealth,
        status,
        responseTime,
        uptime,
        requests,
        errors,
        errorRate: ((errors / requests) * 100).toFixed(2),
        category: config.category,
        color: config.color,
        criticalThreshold: config.criticalThreshold,
        warningThreshold: config.warningThreshold
      });
    });

    // Generate resource metrics
    const resourceTypes = [
      { name: 'CPU Usage', value: Math.floor(Math.random() * 40 + 40), max: 100, unit: '%', color: '#3B82F6' },
      { name: 'Memory Usage', value: Math.floor(Math.random() * 30 + 50), max: 100, unit: '%', color: '#10B981' },
      { name: 'Disk Usage', value: Math.floor(Math.random() * 20 + 30), max: 100, unit: '%', color: '#F59E0B' },
      { name: 'Network I/O', value: Math.floor(Math.random() * 50 + 200), max: 1000, unit: 'Mbps', color: '#8B5CF6' },
      { name: 'Active Connections', value: Math.floor(Math.random() * 200 + 300), max: 1000, unit: 'conn', color: '#EC4899' },
      { name: 'Request Rate', value: Math.floor(Math.random() * 100 + 50), max: 500, unit: 'req/s', color: '#6366F1' }
    ];

    resourceTypes.forEach(resource => {
      resources.push({
        ...resource,
        percentage: Math.round((resource.value / resource.max) * 100),
        status: resource.percentage > 90 ? 'critical' : resource.percentage > 75 ? 'warning' : 'healthy'
      });
    });

    return {
      health: data,
      components: componentsData,
      alerts: alerts.slice(-20), // Keep last 20 alerts
      resources
    };
  }, [timeWindow]);

  useEffect(() => {
    const mockData = generateHealthData;
    setHealthData(mockData.health);
    setSystemComponents(mockData.components);
    setAlertsData(mockData.alerts);
    setResourceMetrics(mockData.resources);
    setLoading(false);

    const interval = setInterval(() => {
      const newMockData = generateHealthData;
      setHealthData(newMockData.health);
      setSystemComponents(newMockData.components);
      setAlertsData(prev => [...prev.slice(-15), ...newMockData.alerts].slice(-20));
      setResourceMetrics(newMockData.resources);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [generateHealthData, refreshInterval]);

  const filteredAlerts = alertLevel === 'all' 
    ? alertsData 
    : alertsData.filter(alert => alert.type === alertLevel);

  const overallSystemHealth = systemComponents.length > 0
    ? Math.round(systemComponents.reduce((sum, comp) => sum + comp.health, 0) / systemComponents.length)
    : 0;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}%
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
            <h2 className="text-lg font-semibold text-gray-900">System Health Dashboard</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                overallSystemHealth >= 90 ? 'bg-green-500' :
                overallSystemHealth >= 75 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium">
                System Health: {overallSystemHealth}%
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
            </select>
            
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Components</option>
              {Object.entries(componentConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
            
            <select
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Health Score */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Overall System Health</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" data={[
              { name: 'Health', value: overallSystemHealth, fill: 
                overallSystemHealth >= 90 ? '#10B981' :
                overallSystemHealth >= 75 ? '#F59E0B' : '#EF4444'
              }
            ]}>
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                fill="#8884d8"
              />
              <text 
                x="50%" 
                y="50%" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="text-2xl font-bold"
              >
                {overallSystemHealth}%
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Resource Utilization */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Resource Utilization</h3>
          <div className="space-y-3">
            {resourceMetrics.slice(0, 4).map((resource, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 w-20">
                  {resource.name.split(' ')[0]}
                </span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${resource.percentage}%`,
                        backgroundColor: resource.color
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-12">
                  {resource.value} {resource.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredAlerts.slice(-5).map((alert, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'critical' ? 'bg-red-50 border-red-500' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{alertTypes[alert.type].icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {alert.component}
                    </p>
                    <p className="text-xs text-gray-600">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {filteredAlerts.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm">No alerts at this level</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Timeline */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">Health Timeline</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={healthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="overallHealth"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Overall Health"
            />
            
            {selectedComponent === 'all' 
              ? Object.entries(componentConfig).map(([key, config]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={`${key}_health`}
                    stroke={config.color}
                    strokeWidth={1}
                    dot={{ r: 2 }}
                    name={config.name}
                    strokeOpacity={0.7}
                  />
                ))
              : selectedComponent !== 'all' && (
                  <Line
                    type="monotone"
                    dataKey={`${selectedComponent}_health`}
                    stroke={componentConfig[selectedComponent].color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={componentConfig[selectedComponent].name}
                  />
                )
            }
            
            <ReferenceLine y={90} stroke="#10B981" strokeDasharray="5 5" />
            <ReferenceLine y={75} stroke="#F59E0B" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Component Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemComponents.map((component) => (
          <div 
            key={component.key}
            className={`bg-white p-4 rounded-lg shadow border-l-4 cursor-pointer hover:shadow-lg transition-shadow ${
              component.status === 'healthy' ? 'border-green-500' :
              component.status === 'warning' ? 'border-yellow-500' : 'border-red-500'
            }`}
            onClick={() => setSelectedComponent(component.key)}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{component.component}</h4>
              <div className={`w-3 h-3 rounded-full ${
                component.status === 'healthy' ? 'bg-green-500' :
                component.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Health:</span>
                <span className="font-medium">{component.health}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium">{component.uptime}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Response:</span>
                <span className="font-medium">{component.responseTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Errors:</span>
                <span className="font-medium">{component.errorRate}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Component Analysis */}
      {selectedComponent !== 'all' && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">
            {componentConfig[selectedComponent]?.name} - Detailed Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Performance Metrics</h4>
              <div className="space-y-2">
                {systemComponents
                  .filter(comp => comp.key === selectedComponent)
                  .map(comp => (
                    <div key={comp.key} className="grid grid-cols-2 gap-4 text-sm">
                      <div>Health Score: {comp.health}%</div>
                      <div>Uptime: {comp.uptime}%</div>
                      <div>Response Time: {comp.responseTime}ms</div>
                      <div>Requests: {comp.requests.toLocaleString()}</div>
                      <div>Error Rate: {comp.errorRate}%</div>
                      <div>Status: <span className={`font-medium ${
                        comp.status === 'healthy' ? 'text-green-600' :
                        comp.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                      }`}>{comp.status}</span></div>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Recent Alerts</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {alertsData
                  .filter(alert => alert.componentKey === selectedComponent)
                  .slice(-3)
                  .map((alert, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <span>{alertTypes[alert.type].icon}</span>
                        <span className="font-medium">{alert.type}</span>
                      </div>
                      <p className="text-gray-600 mt-1">{alert.message}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveHealthDashboard;