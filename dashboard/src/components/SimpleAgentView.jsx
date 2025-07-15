'use client';
import React, { useState, useEffect } from 'react';
// import EnhancedAgentStatus from './EnhancedAgentStatus';
// import TaskProgressTracker from './TaskProgressTracker';
// import AgentCommunication from './AgentCommunication';

const SimpleAgentView = ({ 
  agents = [], 
  stats = {}, 
  queues = [], 
  health = {},
  onTaskSubmit = null 
}) => {
  const [isClient, setIsClient] = useState(false);
  const [task, setTask] = useState({
    prompt: '',
    model: 'claude-3-opus',
    priority: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const models = [
    { value: 'claude-3-opus', label: 'Claude (Architecture)', icon: '🧠' },
    { value: 'gpt-4o', label: 'GPT-4o (Backend)', icon: '⚡' },
    { value: 'deepseek-coder', label: 'DeepSeek (Testing)', icon: '🔍' },
    { value: 'mistral-large', label: 'Mistral (Docs)', icon: '📝' },
    { value: 'gemini-pro', label: 'Gemini (Analysis)', icon: '💎' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.prompt.trim()) {
      setMessage('Please enter a task prompt');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (response.ok) {
        setMessage('Task submitted successfully!');
        setTask({ ...task, prompt: '' });
        if (onTaskSubmit) onTaskSubmit();
      } else {
        setMessage('Failed to submit task');
      }
    } catch (error) {
      setMessage('Error submitting task');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalPending = queues.reduce((sum, q) => sum + (q.pendingCount || 0), 0);
  const totalProcessing = queues.reduce((sum, q) => sum + (q.processingCount || 0), 0);
  const totalFailed = queues.reduce((sum, q) => sum + (q.failedCount || 0), 0);
  const healthyAgents = agents.filter(a => a.status === 'healthy' || a.status === 'active').length;
  const totalAgents = agents.length;

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading agent system...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'status':
        return (
          <div className="p-6 bg-white rounded-lg shadow border">
            <h2 className="text-xl font-semibold mb-4">Enhanced Agent Status</h2>
            <p className="text-gray-600">Advanced agent status monitoring coming soon...</p>
          </div>
        );
      case 'tasks':
        return (
          <div className="p-6 bg-white rounded-lg shadow border">
            <h2 className="text-xl font-semibold mb-4">Task Progress Tracker</h2>
            <p className="text-gray-600">Real-time task tracking coming soon...</p>
          </div>
        );
      case 'communication':
        return (
          <div className="p-6 bg-white rounded-lg shadow border">
            <h2 className="text-xl font-semibold mb-4">Agent Communication</h2>
            <p className="text-gray-600">Agent messaging interface coming soon...</p>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Agents Status */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Agents</p>
              <p className="text-2xl font-bold text-gray-900">{healthyAgents}/{totalAgents}</p>
            </div>
            <div className="text-3xl">🤖</div>
          </div>
          <div className="mt-2">
            <div className="flex text-sm">
              <span className="text-green-600">
                {healthyAgents} healthy
              </span>
              {totalAgents - healthyAgents > 0 && (
                <span className="text-red-600 ml-2">
                  {totalAgents - healthyAgents} issues
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Queue Status */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Queue</p>
              <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
          <div className="mt-2">
            <div className="flex text-sm space-x-2">
              <span className="text-blue-600">{totalProcessing} processing</span>
              {totalFailed > 0 && (
                <span className="text-red-600">{totalFailed} failed</span>
              )}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Health</p>
              <p className="text-2xl font-bold text-gray-900">
                {health.status === 'healthy' ? 'Good' : health.status || 'Unknown'}
              </p>
            </div>
            <div className="text-3xl">
              {health.status === 'healthy' ? '✅' : '❓'}
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              {health.uptime ? `${Math.floor(health.uptime / 3600)}h uptime` : 'Status unknown'}
            </span>
          </div>
        </div>

        {/* Quick Submit */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600">Quick Task</p>
            <div className="text-3xl">⚡</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="Enter task..."
              value={task.prompt}
              onChange={(e) => setTask({ ...task, prompt: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-3 py-2 text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </form>
          {message && (
            <p className={`text-xs mt-2 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Agent List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Agents ({agents.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {agents.length > 0 ? agents.map((agent, index) => (
            <div key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'healthy' || agent.status === 'active' ? 'bg-green-500' :
                    agent.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {agent.name || agent.type || `Agent ${index + 1}`}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {agent.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'healthy' || agent.status === 'active' ? 'text-green-600 bg-green-50' :
                    agent.status === 'idle' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
                  }`}>
                    {agent.status}
                  </span>
                  <span className="text-gray-500">
                    {agent.tasksCompleted || 0} tasks
                  </span>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-6 text-center text-gray-500">
              No agents available
            </div>
          )}
        </div>
      </div>

      {/* Task Submission */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Submit New Task</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Description
              </label>
              <textarea
                value={task.prompt}
                onChange={(e) => setTask({ ...task, prompt: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the task you want the agents to perform..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Model
                </label>
                <select
                  value={task.model}
                  onChange={(e) => setTask({ ...task, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {models.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.icon} {model.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => setTask({ ...task, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Task'}
              </button>
            </div>
          </form>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.includes('success') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4">
          <nav className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'status', label: 'Agent Status', icon: '🤖' },
              { id: 'tasks', label: 'Task Progress', icon: '📋' },
              { id: 'communication', label: 'Communication', icon: '💬' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default SimpleAgentView;