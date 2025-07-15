'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

const TaskProgressTracker = ({ onTaskUpdate = null }) => {
  const [isClient, setIsClient] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [taskLogs, setTaskLogs] = useState({});
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const intervalRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && realTimeUpdates) {
      startTaskTracking();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [isClient, realTimeUpdates]);

  const startTaskTracking = useCallback(() => {
    // Load initial tasks
    loadTasks();
    
    // Start polling for updates
    intervalRef.current = setInterval(loadTasks, 3000);
    
    // Initialize WebSocket for real-time updates
    try {
      wsRef.current = new WebSocket(`ws://${window.location.host}/ws/tasks`);
      wsRef.current.onmessage = handleTaskUpdate;
      wsRef.current.onerror = () => {
        console.log('Task WebSocket connection failed, using polling only');
      };
    } catch (error) {
      console.log('Task WebSocket not available, using polling fallback');
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/active');
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData.tasks || generateMockTasks());
      } else {
        setTasks(generateMockTasks());
      }
    } catch (error) {
      setTasks(generateMockTasks());
    }
  }, []);

  const generateMockTasks = useCallback(() => {
    const taskTypes = ['code_generation', 'analysis', 'testing', 'documentation', 'debugging'];
    const statuses = ['pending', 'running', 'completed', 'failed', 'paused'];
    const priorities = ['low', 'normal', 'high', 'urgent'];
    const agents = ['claude', 'gpt', 'deepseek', 'mistral', 'gemini'];

    return Array.from({ length: Math.floor(Math.random() * 15) + 5 }, (_, i) => {
      const createdAt = new Date(Date.now() - Math.random() * 86400000 * 7); // Last 7 days
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const progress = status === 'completed' ? 100 : 
                     status === 'failed' ? 0 :
                     status === 'pending' ? 0 :
                     Math.floor(Math.random() * 90) + 10;

      return {
        id: `task-${i + 1}`,
        title: `Task ${i + 1}: ${taskTypes[Math.floor(Math.random() * taskTypes.length)]}`,
        description: `Automated ${taskTypes[Math.floor(Math.random() * taskTypes.length)]} task for system optimization`,
        status,
        progress,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assignedAgent: agents[Math.floor(Math.random() * agents.length)],
        createdAt: createdAt.toISOString(),
        updatedAt: new Date(createdAt.getTime() + Math.random() * 3600000).toISOString(),
        estimatedDuration: Math.floor(Math.random() * 3600) + 300, // 5 minutes to 1 hour
        actualDuration: status === 'completed' ? Math.floor(Math.random() * 3600) + 300 : null,
        tags: ['automation', 'system'].concat(Math.random() > 0.5 ? ['urgent'] : []),
        metrics: {
          cpuUsage: Math.floor(Math.random() * 100),
          memoryUsage: Math.floor(Math.random() * 100),
          tokensProcessed: Math.floor(Math.random() * 50000) + 1000,
          apiCalls: Math.floor(Math.random() * 100) + 10
        }
      };
    });
  }, []);

  const handleTaskUpdate = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'task_status_update':
          setTasks(prev => prev.map(task => 
            task.id === data.taskId 
              ? { ...task, ...data.updates, updatedAt: new Date().toISOString() }
              : task
          ));
          break;
          
        case 'task_progress_update':
          setTasks(prev => prev.map(task => 
            task.id === data.taskId 
              ? { ...task, progress: data.progress, updatedAt: new Date().toISOString() }
              : task
          ));
          break;
          
        case 'task_log':
          setTaskLogs(prev => ({
            ...prev,
            [data.taskId]: [...(prev[data.taskId] || []).slice(-99), {
              timestamp: new Date().toISOString(),
              message: data.message,
              level: data.level || 'info'
            }]
          }));
          break;
          
        case 'new_task':
          setTasks(prev => [data.task, ...prev]);
          break;
          
        case 'task_completed':
          setTasks(prev => prev.map(task => 
            task.id === data.taskId 
              ? { ...task, status: 'completed', progress: 100, updatedAt: new Date().toISOString() }
              : task
          ));
          break;
      }
      
      if (onTaskUpdate) onTaskUpdate(data);
    } catch (error) {
      console.error('Failed to parse task WebSocket message:', error);
    }
  }, [onTaskUpdate]);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'updated':
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case 'progress':
        return b.progress - a.progress;
      default:
        return 0;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-blue-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimeAgo = (timestamp) => {
    if (!isClient || !timestamp) return 'N/A';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const cancelTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: 'POST'
      });
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, status: 'cancelled', updatedAt: new Date().toISOString() }
            : task
        ));
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const retryTask = async (taskId) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/retry`, {
        method: 'POST'
      });
      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId 
            ? { ...task, status: 'pending', progress: 0, updatedAt: new Date().toISOString() }
            : task
        ));
      }
    } catch (error) {
      console.error('Failed to retry task:', error);
    }
  };

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading task tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Overview */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Task Progress Tracker</h2>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="realTimeUpdates"
              checked={realTimeUpdates}
              onChange={(e) => setRealTimeUpdates(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="realTimeUpdates" className="text-sm text-gray-700">
              Real-time updates
            </label>
          </div>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {['all', 'pending', 'running', 'completed', 'failed'].map(status => {
            const count = status === 'all' ? tasks.length : tasks.filter(t => t.status === status).length;
            return (
              <div
                key={status}
                className={`text-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  filter === status 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFilter(status)}
              >
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{status}</div>
              </div>
            );
          })}
        </div>

        {/* Filters and Sorting */}
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="created">Sort by Created</option>
            <option value="updated">Sort by Updated</option>
            <option value="priority">Sort by Priority</option>
            <option value="progress">Sort by Progress</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Active Tasks ({filteredTasks.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTasks.map((task) => (
            <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Task Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Task Description */}
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'failed' ? 'bg-red-500' :
                          task.status === 'running' ? 'bg-blue-500 animate-pulse' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Agent:</span> {task.assignedAgent}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {formatTimeAgo(task.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Updated:</span> {formatTimeAgo(task.updatedAt)}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {
                        task.actualDuration 
                          ? formatDuration(task.actualDuration)
                          : formatDuration(task.estimatedDuration) + ' est.'
                      }
                    </div>
                  </div>

                  {/* Task Metrics */}
                  {task.metrics && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">CPU Usage</div>
                        <div className="font-medium">{task.metrics.cpuUsage}%</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">Memory</div>
                        <div className="font-medium">{task.metrics.memoryUsage}%</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">Tokens</div>
                        <div className="font-medium">{task.metrics.tokensProcessed?.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-gray-600">API Calls</div>
                        <div className="font-medium">{task.metrics.apiCalls}</div>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {task.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                  >
                    {selectedTask === task.id ? 'Hide' : 'Logs'}
                  </button>
                  {task.status === 'failed' && (
                    <button
                      onClick={() => retryTask(task.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  )}
                  {['pending', 'running'].includes(task.status) && (
                    <button
                      onClick={() => cancelTask(task.id)}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* Task Logs */}
              {selectedTask === task.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2">Task Logs</h5>
                  <div className="bg-gray-900 text-green-400 text-xs p-3 rounded font-mono h-40 overflow-y-auto">
                    {taskLogs[task.id]?.length > 0 ? taskLogs[task.id].slice(-20).map((log, logIndex) => (
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
                      <div className="text-gray-500">No logs available for this task</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredTasks.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No tasks found for the selected filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskProgressTracker;