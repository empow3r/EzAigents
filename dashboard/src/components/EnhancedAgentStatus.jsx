'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const EnhancedAgentStatus = ({ 
  agents = [], 
  stats = {}, 
  queues = [], 
  health = {},
  onTaskSubmit = null 
}) => {
  const [isClient, setIsClient] = useState(false);
  const [realTimeData, setRealTimeData] = useState({});
  const [agentLogs, setAgentLogs] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [taskProgress, setTaskProgress] = useState({});
  const [agentMetrics, setAgentMetrics] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const intervalRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && autoRefresh) {
      startRealTimeUpdates();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [isClient, autoRefresh, refreshInterval]);

  const startRealTimeUpdates = useCallback(() => {
    // Start polling for updates
    intervalRef.current = setInterval(updateAgentStatus, refreshInterval);
    
    // Initialize WebSocket for live updates
    try {
      wsRef.current = new WebSocket(`ws://${window.location.host}/ws/agents`);
      wsRef.current.onmessage = handleWebSocketMessage;
      wsRef.current.onerror = () => {
        console.log('WebSocket connection failed, using polling only');
      };
    } catch (error) {
      console.log('WebSocket not available, using polling fallback');
    }
  }, [refreshInterval]);

  const updateAgentStatus = useCallback(async () => {
    try {
      // Update agent status and metrics
      const responses = await Promise.allSettled([
        fetch('/api/agents/status'),
        fetch('/api/agents/metrics'),
        fetch('/api/tasks/progress')
      ]);

      const [statusRes, metricsRes, progressRes] = responses;

      // Process agent status
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const statusData = await statusRes.value.json();
        setRealTimeData(prev => ({ ...prev, ...statusData }));
      }

      // Process agent metrics
      if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
        const metricsData = await metricsRes.value.json();
        setAgentMetrics(metricsData);
      }

      // Process task progress
      if (progressRes.status === 'fulfilled' && progressRes.value.ok) {
        const progressData = await progressRes.value.json();
        setTaskProgress(progressData);
      }

    } catch (error) {
      // Generate mock data for demonstration
      updateMockData();
    }
  }, []);

  const updateMockData = useCallback(() => {
    const mockData = {};
    agents.forEach((agent, index) => {
      mockData[`agent-${index}`] = {
        status: ['active', 'idle', 'working', 'error'][Math.floor(Math.random() * 4)],
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        tasksInProgress: Math.floor(Math.random() * 5),
        lastHeartbeat: new Date().toISOString(),
        throughput: Math.floor(Math.random() * 20) + 5,
        errors: Math.floor(Math.random() * 3),
        uptime: Math.floor(Math.random() * 86400)
      };
    });
    setRealTimeData(mockData);

    // Update task progress
    const progressData = {};
    agents.forEach((agent, index) => {
      if (Math.random() > 0.5) {
        progressData[`agent-${index}`] = {
          currentTask: `Task ${Math.floor(Math.random() * 1000)}`,
          progress: Math.floor(Math.random() * 100),
          estimatedCompletion: new Date(Date.now() + Math.random() * 3600000).toISOString(),
          taskType: ['code_generation', 'analysis', 'testing', 'documentation'][Math.floor(Math.random() * 4)]
        };
      }
    });
    setTaskProgress(progressData);
  }, [agents]);

  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'agent_status_update':
          setRealTimeData(prev => ({
            ...prev,
            [data.agentId]: { ...prev[data.agentId], ...data.status }
          }));
          break;
          
        case 'task_progress_update':
          setTaskProgress(prev => ({
            ...prev,
            [data.agentId]: data.progress
          }));
          break;
          
        case 'agent_log':
          setAgentLogs(prev => ({
            ...prev,
            [data.agentId]: [...(prev[data.agentId] || []).slice(-49), {
              timestamp: new Date().toISOString(),
              message: data.message,
              level: data.level || 'info'
            }]
          }));
          break;
          
        case 'notification':
          addNotification(data.notification);
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, []);

  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  const sendAgentCommand = useCallback(async (agentId, command, params = {}) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, params })
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Command Sent',
          message: `${command} command sent to agent ${agentId}`,
        });
      } else {
        throw new Error('Command failed');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Command Failed',
        message: `Failed to send ${command} to agent ${agentId}`,
      });
    }
  }, [addNotification]);

  const assignTaskToAgent = useCallback(async (agentId, task) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/assign-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });

      if (response.ok) {
        addNotification({
          type: 'success',
          title: 'Task Assigned',
          message: `Task assigned to agent ${agentId}`,
        });
        if (onTaskSubmit) onTaskSubmit();
      } else {
        throw new Error('Task assignment failed');
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Assignment Failed',
        message: `Failed to assign task to agent ${agentId}`,
      });
    }
  }, [addNotification, onTaskSubmit]);

  const getAgentStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'working': return 'bg-blue-500';
      case 'idle': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'working': return 'Working';
      case 'idle': return 'Idle';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatLastSeen = (timestamp) => {
    if (!isClient || !timestamp) return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading agent status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg border-l-4 animate-slide-in ${
                notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
                notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
                'bg-blue-50 border-blue-500 text-blue-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm mt-1">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Agent Status Control Panel</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                Auto-refresh
              </label>
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
              disabled={!autoRefresh}
            >
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
          </div>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {agents.filter(a => realTimeData[`agent-${agents.indexOf(a)}`]?.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Agents</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {agents.filter(a => realTimeData[`agent-${agents.indexOf(a)}`]?.status === 'working').length}
            </div>
            <div className="text-sm text-gray-600">Working</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {agents.filter(a => realTimeData[`agent-${agents.indexOf(a)}`]?.status === 'idle').length}
            </div>
            <div className="text-sm text-gray-600">Idle</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {agents.filter(a => realTimeData[`agent-${agents.indexOf(a)}`]?.status === 'error').length}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>
      </div>

      {/* Enhanced Agent List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agent Status & Interactions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {agents.map((agent, index) => {
            const agentId = `agent-${index}`;
            const statusData = realTimeData[agentId] || {};
            const progress = taskProgress[agentId] || {};
            const logs = agentLogs[agentId] || [];
            const isExpanded = expandedAgent === agentId;

            return (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Status Indicator */}
                    <div className="relative">
                      <div className={`w-4 h-4 rounded-full ${getAgentStatusColor(statusData.status)} animate-pulse`}></div>
                      {statusData.status === 'working' && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                        </div>
                      )}
                    </div>

                    {/* Agent Info */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {agent.name || agent.type || `Agent ${index + 1}`}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {agent.type} • {getAgentStatusText(statusData.status)} • {formatLastSeen(statusData.lastHeartbeat)}
                      </p>
                    </div>

                    {/* Real-time Metrics */}
                    <div className="hidden md:flex items-center space-x-4 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">CPU</div>
                        <div className={`font-medium ${statusData.cpu > 80 ? 'text-red-600' : 'text-green-600'}`}>
                          {statusData.cpu || 0}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Memory</div>
                        <div className={`font-medium ${statusData.memory > 85 ? 'text-red-600' : 'text-green-600'}`}>
                          {statusData.memory || 0}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">Tasks</div>
                        <div className="font-medium text-blue-600">
                          {statusData.tasksInProgress || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => sendAgentCommand(agentId, 'restart')}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      disabled={statusData.status === 'working'}
                    >
                      Restart
                    </button>
                    <button
                      onClick={() => sendAgentCommand(agentId, 'pause')}
                      className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      disabled={statusData.status === 'error'}
                    >
                      {statusData.status === 'working' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => setExpandedAgent(isExpanded ? null : agentId)}
                      className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Current Task Progress */}
                {progress.currentTask && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-blue-900">Current Task</h5>
                      <span className="text-xs text-blue-600">{progress.taskType}</span>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">{progress.currentTask}</p>
                    <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                      <span>Progress</span>
                      <span>{progress.progress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress || 0}%` }}
                      ></div>
                    </div>
                    {progress.estimatedCompletion && (
                      <p className="text-xs text-blue-600 mt-1">
                        ETA: {new Date(progress.estimatedCompletion).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Performance Metrics */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Performance Metrics</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Uptime:</span>
                            <span className="font-medium">{formatUptime(statusData.uptime)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Throughput:</span>
                            <span className="font-medium">{statusData.throughput || 0} tasks/hour</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Errors:</span>
                            <span className={`font-medium ${statusData.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {statusData.errors || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Heartbeat:</span>
                            <span className="font-medium">{formatLastSeen(statusData.lastHeartbeat)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Recent Logs */}
                      <div>
                        <h5 className="font-medium text-gray-900 mb-3">Recent Activity</h5>
                        <div className="bg-gray-900 text-green-400 text-xs p-3 rounded font-mono h-32 overflow-y-auto">
                          {logs.length > 0 ? logs.slice(-10).map((log, logIndex) => (
                            <div key={logIndex} className="mb-1">
                              <span className="text-gray-500">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <span className={`ml-2 ${
                                log.level === 'error' ? 'text-red-400' :
                                log.level === 'warning' ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {log.message}
                              </span>
                            </div>
                          )) : (
                            <div className="text-gray-500">No recent activity</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-3">Quick Actions</h5>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => assignTaskToAgent(agentId, {
                            prompt: "Analyze current system status",
                            priority: "normal",
                            type: "analysis"
                          })}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          System Analysis
                        </button>
                        <button
                          onClick={() => sendAgentCommand(agentId, 'health_check')}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Health Check
                        </button>
                        <button
                          onClick={() => sendAgentCommand(agentId, 'clear_cache')}
                          className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                        >
                          Clear Cache
                        </button>
                        <button
                          onClick={() => sendAgentCommand(agentId, 'priority_boost')}
                          className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                        >
                          Priority Boost
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {agents.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No agents available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedAgentStatus;