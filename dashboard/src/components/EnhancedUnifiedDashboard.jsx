'use client';
import React, { useState, useEffect, useCallback } from 'react';
import LLMStatusMonitor from './LLMStatusMonitor';
import AgentMonitor from './features/AgentMonitor';
import PerformanceCharts from './analytics/PerformanceCharts';
import AgentUtilizationDashboard from './analytics/AgentUtilizationDashboard';
import QueueThroughputAnalytics from './analytics/QueueThroughputAnalytics';
import HistoricalTrendAnalysis from './analytics/HistoricalTrendAnalysis';
import InteractiveHealthDashboard from './analytics/InteractiveHealthDashboard';

const EnhancedUnifiedDashboard = () => {
  // State management
  const [activeView, setActiveView] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [systemStats, setSystemStats] = useState({});
  const [agents, setAgents] = useState([]);
  const [queueStats, setQueueStats] = useState({});
  const [taskFormData, setTaskFormData] = useState({
    description: '',
    filePath: '',
    model: 'claude-3-opus',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [llmStatus, setLlmStatus] = useState({});

  // Navigation items with enhanced organization
  const navigationItems = [
    {
      id: 'overview',
      name: 'System Overview',
      icon: '🏠',
      description: 'High-level system status and metrics',
      category: 'main'
    },
    {
      id: 'agents',
      name: 'Agent Management',
      icon: '🤖',
      description: 'Monitor and control AI agents',
      category: 'main'
    },
    {
      id: 'tasks',
      name: 'Task Center',
      icon: '📋',
      description: 'Submit and track tasks',
      category: 'main'
    },
    {
      id: 'queues',
      name: 'Queue Control',
      icon: '⚡',
      description: 'Priority queue management',
      category: 'operations'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📊',
      description: 'Performance insights and trends',
      category: 'operations'
    },
    {
      id: 'content',
      name: 'Content Studio',
      icon: '🎨',
      description: 'Content creation and management',
      category: 'tools'
    },
    {
      id: 'research',
      name: 'Research Hub',
      icon: '🔬',
      description: 'Market research and insights',
      category: 'tools'
    },
    {
      id: 'webscraper',
      name: 'Web Scraper',
      icon: '🌐',
      description: 'Data extraction and feeds',
      category: 'tools'
    },
    {
      id: 'collaboration',
      name: 'Collaboration',
      icon: '👥',
      description: 'Team and agent coordination',
      category: 'tools'
    },
    {
      id: 'settings',
      name: 'System Settings',
      icon: '⚙️',
      description: 'Configuration and preferences',
      category: 'admin'
    }
  ];

  // Data fetching functions
  const fetchSystemData = useCallback(async () => {
    try {
      const [agentsRes, queueRes, llmRes] = await Promise.all([
        fetch('/api/agents?stats=true'),
        fetch('/api/queue-stats'),
        fetch('/api/llm-status')
      ]);

      if (agentsRes.ok) {
        const agentData = await agentsRes.json();
        setSystemStats(agentData.stats);
        setAgents(agentData.agents || []);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueueStats(queueData);
      }

      if (llmRes.ok) {
        const llmData = await llmRes.json();
        setLlmStatus(llmData);
      }
    } catch (error) {
      console.error('Failed to fetch system data:', error);
      addNotification('Failed to fetch system data', 'error');
    }
  }, []);

  // Notification system
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Task submission handler
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskFormData.description.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskFormData.description,
          filePath: taskFormData.filePath || undefined,
          model: taskFormData.model,
          priority: taskFormData.priority,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setTaskFormData({ description: '', filePath: '', model: 'claude-3-opus', priority: 'normal' });
        addNotification('Task submitted successfully!', 'success');
        fetchSystemData(); // Refresh data
      } else {
        addNotification('Failed to submit task', 'error');
      }
    } catch (error) {
      addNotification('Error submitting task: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agent interaction handlers
  const handleAgentSelect = (agent, action) => {
    setSelectedAgent({ agent, action });
    addNotification(`${action} selected for ${agent.type} agent`, 'info');
  };

  // Real-time updates
  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchSystemData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.altKey) {
        const key = e.key;
        const shortcuts = {
          '1': 'overview',
          '2': 'agents',
          '3': 'tasks',
          '4': 'queues',
          '5': 'analytics'
        };
        if (shortcuts[key]) {
          setActiveView(shortcuts[key]);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Calculate system health score
  const calculateHealthScore = () => {
    const totalAgents = systemStats.total || 0;
    const activeAgents = systemStats.active || 0;
    const configuredLLMs = llmStatus?.summary?.configured || 0;
    const totalLLMs = llmStatus?.summary?.total || 5;
    const errors = llmStatus?.summary?.errors || 0;
    
    if (totalAgents === 0) return 0;
    
    const agentScore = (activeAgents / totalAgents) * 40;
    const llmScore = (configuredLLMs / totalLLMs) * 40;
    const errorPenalty = Math.min(errors * 5, 20);
    
    return Math.max(0, Math.min(100, agentScore + llmScore - errorPenalty));
  };

  const healthScore = calculateHealthScore();

  // Render notification system
  const renderNotifications = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg border-l-4 ${
            notification.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
            'bg-blue-50 border-blue-500 text-blue-800'
          } max-w-sm transition-all duration-300 animate-slide-in`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{notification.message}</p>
              <p className="text-xs opacity-75 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // Render sidebar navigation
  const renderSidebar = () => (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    } min-h-screen relative`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-xl font-bold">EzAigents</h1>
              <p className="text-sm text-gray-400">AI Multi-Agent Platform</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* System Health Indicator */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            healthScore >= 80 ? 'bg-green-500' :
            healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}></div>
          {!sidebarCollapsed && (
            <div>
              <div className="text-sm font-medium">System Health</div>
              <div className="text-xs text-gray-400">{Math.round(healthScore)}%</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {['main', 'operations', 'tools', 'admin'].map(category => (
          <div key={category}>
            {!sidebarCollapsed && (
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
                {category}
              </div>
            )}
            {navigationItems
              .filter(item => item.category === category)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                    activeView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? `${item.name}: ${item.description}` : ''}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <div className="text-left">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  )}
                </button>
              ))}
          </div>
        ))}
      </nav>

      {/* Quick Stats */}
      {!sidebarCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Active Agents:</span>
              <span className="font-medium">{systemStats.active || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Queue Size:</span>
              <span className="font-medium">{queueStats.total || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>LLMs Ready:</span>
              <span className="font-medium">{llmStatus?.summary?.configured || 0}/5</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render main content based on active view
  const renderMainContent = () => {
    switch (activeView) {
      case 'overview':
        return renderOverview();
      case 'agents':
        return renderAgentManagement();
      case 'tasks':
        return renderTaskCenter();
      case 'queues':
        return renderQueueControl();
      case 'analytics':
        return renderAnalytics();
      case 'analytics-performance':
        return renderAnalyticsPerformance();
      case 'analytics-utilization':
        return renderAnalyticsUtilization();
      case 'analytics-trends':
        return renderAnalyticsTrends();
      case 'analytics-health':
        return renderAnalyticsHealth();
      case 'content':
        return renderContentStudio();
      case 'research':
        return renderResearchHub();
      case 'webscraper':
        return renderWebScraper();
      case 'collaboration':
        return renderCollaboration();
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  // Overview dashboard
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
          <p className="text-gray-600">Monitor your AI agent ecosystem at a glance</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search agents, tasks, or data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={fetchSystemData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="System Health"
          value={`${Math.round(healthScore)}%`}
          icon="❤️"
          color={healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red'}
          trend={healthScore >= 80 ? '+2%' : '-1%'}
          onClick={() => setActiveView('settings')}
        />
        <MetricCard
          title="Active Agents"
          value={systemStats.active || 0}
          icon="🤖"
          color="blue"
          trend={`${systemStats.total || 0} total`}
          onClick={() => setActiveView('agents')}
        />
        <MetricCard
          title="Queue Size"
          value={queueStats.total || 0}
          icon="📋"
          color="purple"
          trend={`${queueStats.processing || 0} processing`}
          onClick={() => setActiveView('queues')}
        />
        <MetricCard
          title="LLM Status"
          value={`${llmStatus?.summary?.configured || 0}/5`}
          icon="🧠"
          color="indigo"
          trend={`${llmStatus?.summary?.errors || 0} issues`}
          onClick={() => setActiveView('agents')}
        />
      </div>

      {/* LLM Status Monitor */}
      <LLMStatusMonitor />

      {/* Agent Monitor */}
      <AgentMonitor 
        agents={agents} 
        stats={systemStats} 
        showCollaboration={true}
        onAgentSelect={handleAgentSelect}
      />

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            icon="📝"
            label="New Task"
            onClick={() => setActiveView('tasks')}
            color="blue"
          />
          <QuickActionButton
            icon="🌐"
            label="Web Scrape"
            onClick={() => setActiveView('webscraper')}
            color="green"
          />
          <QuickActionButton
            icon="📊"
            label="Analytics"
            onClick={() => setActiveView('analytics')}
            color="purple"
          />
          <QuickActionButton
            icon="🔬"
            label="Research"
            onClick={() => setActiveView('research')}
            color="indigo"
          />
        </div>
      </div>
    </div>
  );

  // Agent Management view
  const renderAgentManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
        <div className="space-x-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            Start All Agents
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Emergency Stop
          </button>
        </div>
      </div>

      {/* LLM Status Monitor */}
      <LLMStatusMonitor />

      {/* Detailed Agent Monitor */}
      <AgentMonitor 
        agents={agents} 
        stats={systemStats} 
        mode="detailed"
        showCollaboration={true}
        onAgentSelect={handleAgentSelect}
      />
    </div>
  );

  // Task Center view
  const renderTaskCenter = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Task Center</h1>
      
      {/* Task Submission Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Submit New Task</h2>
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Description</label>
            <textarea 
              value={taskFormData.description}
              onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what you want the agent to do..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="4"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Path (Optional)</label>
            <input 
              type="text"
              value={taskFormData.filePath}
              onChange={(e) => setTaskFormData(prev => ({ ...prev, filePath: e.target.value }))}
              placeholder="e.g., src/components/Button.jsx"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
              <select 
                value={taskFormData.model}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="claude-3-opus">🧠 Claude (Architecture)</option>
                <option value="gpt-4o">⚡ GPT-4o (Backend)</option>
                <option value="deepseek-coder">🔍 DeepSeek (Testing)</option>
                <option value="mistral-large">📝 Mistral (Docs)</option>
                <option value="gemini-pro">💎 Gemini (Analysis)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select 
                value={taskFormData.priority}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isSubmitting || !taskFormData.description.trim()}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isSubmitting || !taskFormData.description.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Task'}
          </button>
        </form>
      </div>
    </div>
  );

  // Enhanced sections with data visualization
  const renderQueueControl = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Queue Control</h1>
        <div className="space-x-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            ▶️ Start All Queues
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            🛑 Emergency Stop
          </button>
        </div>
      </div>
      
      <QueueThroughputAnalytics />
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveView('analytics-performance')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            📊 Performance
          </button>
          <button 
            onClick={() => setActiveView('analytics-utilization')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            🔧 Utilization
          </button>
          <button 
            onClick={() => setActiveView('analytics-trends')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            📈 Trends
          </button>
          <button 
            onClick={() => setActiveView('analytics-health')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            ❤️ Health
          </button>
        </div>
      </div>
      
      <PerformanceCharts timeRange="24h" />
    </div>
  );

  // Specialized analytics views
  const renderAnalyticsPerformance = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setActiveView('analytics')}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ← Back to Analytics
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Performance Charts</h1>
      </div>
      <PerformanceCharts timeRange="24h" showLiveUpdates={true} />
    </div>
  );

  const renderAnalyticsUtilization = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setActiveView('analytics')}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ← Back to Analytics
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Agent Utilization</h1>
      </div>
      <AgentUtilizationDashboard />
    </div>
  );

  const renderAnalyticsTrends = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setActiveView('analytics')}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ← Back to Analytics
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Historical Trends</h1>
      </div>
      <HistoricalTrendAnalysis />
    </div>
  );

  const renderAnalyticsHealth = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => setActiveView('analytics')}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ← Back to Analytics
        </button>
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
      </div>
      <InteractiveHealthDashboard />
    </div>
  );

  const renderContentStudio = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Content Studio</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Content creation and management tools coming soon...</p>
      </div>
    </div>
  );

  const renderResearchHub = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Research Hub</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Market research and insights platform coming soon...</p>
      </div>
    </div>
  );

  const renderWebScraper = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Web Intelligence</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Advanced web scraping and data extraction interface coming soon...</p>
      </div>
    </div>
  );

  const renderCollaboration = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Collaboration Hub</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">Team and agent collaboration tools coming soon...</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">System configuration and preferences coming soon...</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {renderSidebar()}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {renderMainContent()}
        </div>
      </main>
      {renderNotifications()}
    </div>
  );
};

// Helper components
const MetricCard = ({ title, value, icon, color, trend, onClick }) => {
  const colorClasses = {
    green: 'border-green-500 bg-green-50',
    yellow: 'border-yellow-500 bg-yellow-50',
    red: 'border-red-500 bg-red-50',
    blue: 'border-blue-500 bg-blue-50',
    purple: 'border-purple-500 bg-purple-50',
    indigo: 'border-indigo-500 bg-indigo-50'
  };

  const textColorClasses = {
    green: 'text-green-800',
    yellow: 'text-yellow-800',
    red: 'text-red-800',
    blue: 'text-blue-800',
    purple: 'text-purple-800',
    indigo: 'text-indigo-800'
  };

  return (
    <div 
      className={`p-6 rounded-lg border-l-4 cursor-pointer hover:shadow-lg transition-all ${colorClasses[color]}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${textColorClasses[color]}`}>{value}</p>
          <p className="text-xs text-gray-500 mt-1">{trend}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

const QuickActionButton = ({ icon, label, onClick, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    green: 'bg-green-100 text-green-800 hover:bg-green-200',
    purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg text-center transition-colors ${colorClasses[color]}`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-medium">{label}</div>
    </button>
  );
};

export default EnhancedUnifiedDashboard;