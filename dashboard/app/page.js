'use client';
import React, { useState } from 'react';
// import '../src/styles/animations.css';

export default function Home() {
  const [dashboardMode, setDashboardMode] = useState('simple');
  const [showSelector, setShowSelector] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [filePath, setFilePath] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3-opus');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskDescription,
          filePath: filePath || undefined,
          model: selectedModel,
          priority,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setTaskDescription('');
        setFilePath('');
        alert('Task submitted successfully!');
      } else {
        alert('Failed to submit task. Please try again.');
      }
    } catch (error) {
      alert('Error submitting task: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashboardModes = [
    {
      id: 'simple',
      name: 'Simple Dashboard',
      description: 'Unified agent system management and task submission',
      features: ['agents', 'analytics']
    },
    {
      id: 'executive',
      name: 'Executive Dashboard',
      description: 'High-level agent system overview for management',
      features: ['agents']
    },
    {
      id: 'minimal',
      name: 'Minimal Dashboard',
      description: 'Streamlined agent and task management',
      features: ['agents']
    },
    {
      id: 'priority',
      name: 'Priority Queue Controller',
      description: 'Advanced priority queue management with real-time controls',
      features: ['priority-control', 'queues', 'tasks', 'reprioritize', 'context']
    },
    {
      id: 'review',
      name: 'Content Review & Rating',
      description: 'Comprehensive content review system with ratings and enhancement suggestions',
      features: ['reviews', 'ratings', 'suggestions', 'analytics']
    },
    {
      id: 'content',
      name: 'Content Creation Suite',
      description: 'Complete content generation and management toolkit',
      features: ['scraping', 'virality', 'content', 'media', 'characters', 'workflows', 'analytics', 'intelligence', 'optimizer']
    },
    {
      id: 'research',
      name: 'Niche Research & Ideation',
      description: 'Deep market research, trend analysis, and content ideation platform',
      features: ['research', 'trends', 'competitors', 'keywords', 'ideation', 'analytics']
    }
  ];

  const handleModeChange = (mode) => {
    setDashboardMode(mode);
    setShowSelector(false);
  };

  if (showSelector) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">EzAigents Dashboard</h1>
            <p className="text-gray-600">Choose your dashboard experience</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dashboardModes.map(mode => (
              <div
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className="bg-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
              >
                <h3 className="text-xl font-semibold mb-3">{mode.name}</h3>
                <p className="text-gray-600 mb-4">{mode.description}</p>
                <div className="flex flex-wrap gap-2">
                  {mode.features.map(feature => (
                    <span
                      key={feature}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <button
              onClick={() => setShowSelector(false)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Use Default Simple Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentMode = dashboardModes.find(m => m.id === dashboardMode);

  const renderDashboardContent = () => {
    switch(dashboardMode) {
      case 'simple':
        return renderSimpleDashboard();
      case 'executive':
        return renderExecutiveDashboard();
      case 'minimal':
        return renderMinimalDashboard();
      case 'priority':
        return renderPriorityDashboard();
      case 'review':
        return renderReviewDashboard();
      case 'content':
        return renderContentDashboard();
      case 'research':
        return renderResearchDashboard();
      default:
        return renderSimpleDashboard();
    }
  };

  const renderSimpleDashboard = () => (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Ez Aigent Dashboard</h1>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Total Agents</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Active Tasks</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Queue Size</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">Completed Today</h3>
              <p className="text-3xl font-bold text-purple-600">0</p>
            </div>
          </div>

          {/* Agent Monitor */}
          <div className="mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Agent Monitor</h2>
                <div className="text-sm text-gray-500">0 agents online</div>
              </div>
              <div className="text-center py-8 text-gray-500">
                No agents currently active
              </div>
            </div>
          </div>

          {/* Queue Statistics */}
          <div className="mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Queue Statistics</h2>
                <div className="text-sm text-gray-500">0 queues monitored</div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-blue-800">Total Pending</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-green-800">Processing</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">0</div>
                  <div className="text-sm text-red-800">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Task Submission */}
          <div className="mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Submit Task</h2>
              <form onSubmit={handleTaskSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Description</label>
                  <textarea 
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
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
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="e.g., src/components/Button.jsx"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
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
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
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
                  disabled={isSubmitting || !taskDescription.trim()}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isSubmitting || !taskDescription.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Task'}
                </button>
              </form>
            </div>
          </div>

          {/* System Health */}
          <div className="mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">System Health</h2>
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  ✅ Healthy
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Dashboard:</span>
                  <div className="font-medium text-green-600">Online</div>
                </div>
                <div>
                  <span className="text-gray-600">Redis:</span>
                  <div className="font-medium text-green-600">Connected</div>
                </div>
                <div>
                  <span className="text-gray-600">Environment:</span>
                  <div className="font-medium">Development</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  const renderExecutiveDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Executive Dashboard</h1>
        
        {/* Executive Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <h3 className="text-lg font-semibold text-white/80">System Status</h3>
            <p className="text-4xl font-bold text-green-400">98%</p>
            <p className="text-white/60">Uptime</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <h3 className="text-lg font-semibold text-white/80">Daily Output</h3>
            <p className="text-4xl font-bold text-blue-400">247</p>
            <p className="text-white/60">Tasks Completed</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
            <h3 className="text-lg font-semibold text-white/80">Efficiency</h3>
            <p className="text-4xl font-bold text-purple-400">94%</p>
            <p className="text-white/60">Success Rate</p>
          </div>
        </div>

        {/* Agent Fleet Status */}
        <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Agent Fleet Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['Claude', 'GPT-4o', 'DeepSeek', 'Mistral', 'Gemini'].map((agent, idx) => (
              <div key={agent} className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold">{agent[0]}</span>
                </div>
                <p className="text-white font-medium">{agent}</p>
                <p className="text-green-400 text-sm">Online</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMinimalDashboard = () => (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Minimal Dashboard</h1>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Agents</div>
          </div>
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Tasks</div>
          </div>
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold text-yellow-600">0</div>
            <div className="text-sm text-gray-600">Queue</div>
          </div>
          <div className="text-center p-4 border rounded">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Done</div>
          </div>
        </div>

        {/* Quick Task Submit */}
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-3">Quick Task</h2>
          <form onSubmit={handleTaskSubmit} className="space-y-3">
            <textarea 
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows="3"
              required
            />
            <div className="flex gap-2">
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 p-2 border rounded"
              >
                <option value="claude-3-opus">Claude</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="deepseek-coder">DeepSeek</option>
              </select>
              <button 
                type="submit"
                disabled={isSubmitting || !taskDescription.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderPriorityDashboard = () => (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Priority Queue Controller</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue Controls */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">Queue Management</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="p-3 bg-red-100 text-red-800 rounded hover:bg-red-200">
                  🚨 Urgent (0)
                </button>
                <button className="p-3 bg-orange-100 text-orange-800 rounded hover:bg-orange-200">
                  ⚡ High (0)
                </button>
                <button className="p-3 bg-blue-100 text-blue-800 rounded hover:bg-blue-200">
                  📝 Normal (0)
                </button>
                <button className="p-3 bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                  ⏳ Low (0)
                </button>
              </div>
            </div>

            {/* Active Tasks */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
              <div className="text-center py-8 text-gray-500">
                No active tasks in queue
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Queue Controls</h3>
              <div className="space-y-2">
                <button className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700">
                  ▶️ Start Queue
                </button>
                <button className="w-full p-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                  ⏸️ Pause Queue
                </button>
                <button className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700">
                  🛑 Stop Queue
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Queue Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Processing Rate:</span>
                  <span className="font-medium">0/min</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Wait Time:</span>
                  <span className="font-medium">0s</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-medium text-green-600">100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewDashboard = () => (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Content Review & Rating</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Review Queue</h2>
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📝</div>
                <p>No content pending review</p>
                <p className="text-sm mt-2">Content will appear here when tasks are completed</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Review Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-bold text-orange-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Approved:</span>
                  <span className="font-bold text-green-600">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Rejected:</span>
                  <span className="font-bold text-red-600">0</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  📊 Generate Report
                </button>
                <button className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700">
                  ✅ Bulk Approve
                </button>
                <button className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                  🎯 Set Criteria
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContentDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Content Creation Suite</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'Web Scraping', icon: '🌐', desc: 'Extract data from websites' },
            { name: 'Viral Content', icon: '🔥', desc: 'Generate trending content' },
            { name: 'Media Assets', icon: '🎨', desc: 'Create visual content' },
            { name: 'Characters', icon: '👥', desc: 'Develop personas' },
            { name: 'Workflows', icon: '⚙️', desc: 'Automate processes' },
            { name: 'Analytics', icon: '📊', desc: 'Track performance' }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20 hover:bg-white/20 cursor-pointer transition-all">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.name}</h3>
              <p className="text-white/70 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white/5 backdrop-blur-sm p-6 rounded-lg border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Content Pipeline</h2>
          <div className="flex flex-wrap gap-4">
            {['Research', 'Generate', 'Review', 'Optimize', 'Publish'].map((step, idx) => (
              <div key={idx} className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {idx + 1}
                </div>
                <span className="ml-2 text-white">{step}</span>
                {idx < 4 && <div className="ml-4 text-white/50">→</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderResearchDashboard = () => (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Niche Research & Ideation</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Research Tools */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Research Tools</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'Trend Analysis', icon: '📈' },
                  { name: 'Competitor Research', icon: '🔍' },
                  { name: 'Keyword Discovery', icon: '🔑' },
                  { name: 'Market Sizing', icon: '📊' },
                  { name: 'Content Gaps', icon: '📝' },
                  { name: 'Opportunity Map', icon: '🗺️' }
                ].map((tool, idx) => (
                  <button key={idx} className="p-4 border rounded-lg hover:bg-gray-50 text-center">
                    <div className="text-2xl mb-2">{tool.icon}</div>
                    <div className="text-sm font-medium">{tool.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Research Input */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Start Research</h2>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Research Topic</label>
                  <input 
                    type="text"
                    placeholder="e.g., AI productivity tools, sustainable fashion..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Research Depth</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg">
                      <option>Quick Overview</option>
                      <option>Standard Analysis</option>
                      <option>Deep Dive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Market</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg">
                      <option>Global</option>
                      <option>North America</option>
                      <option>Europe</option>
                      <option>Asia Pacific</option>
                    </select>
                  </div>
                </div>
                <button className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  🚀 Start Research
                </button>
              </form>
            </div>
          </div>

          {/* Research Results */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Recent Research</h3>
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🔬</div>
                <p>No research completed yet</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold mb-4">Research Queue</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span>In Progress:</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Quick mode switcher */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowSelector(true)}
          className="bg-white shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border"
        >
          Switch Mode ({currentMode?.name})
        </button>
      </div>

      {renderDashboardContent()}
    </div>
  );
}