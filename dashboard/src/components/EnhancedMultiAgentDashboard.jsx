'use client';
import React, { useState, useEffect } from 'react';
import AgentMonitor from './features/AgentMonitor';
import TaskSubmission from './features/TaskSubmission';
import QueueStatistics from './features/QueueStatistics';
import HealthStatus from './features/HealthStatus';
import SchedulingPage from '../../app/scheduling/page';

const EnhancedMultiAgentDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    agents: [],
    queues: [],
    health: {},
    stats: {},
    prompts: [],
    contexts: [],
    agentTemplates: []
  });
  
  const [showForm, setShowForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Safer fetch with error handling
      const fetchSafely = async (url) => {
        try {
          const response = await fetch(url);
          return response.ok ? response : null;
        } catch (error) {
          console.warn(`Failed to fetch ${url}:`, error.message);
          return null;
        }
      };

      const [agentsRes, queuesRes, healthRes, promptsRes, contextsRes, agentTemplatesRes] = await Promise.all([
        fetchSafely('/api/agents?stats=true'),
        fetchSafely('/api/queue-stats'),
        fetchSafely('/api/health?service=all'),
        fetchSafely('/api/agent-management?type=prompts'),
        fetchSafely('/api/agent-management?type=contexts'),
        fetchSafely('/api/agent-management?type=agents')
      ]);

      const newData = { ...data };
      
      if (agentsRes?.ok) {
        const agentData = await agentsRes.json();
        newData.agents = agentData.agents || [];
        newData.stats = agentData.stats || {};
      }
      
      if (queuesRes?.ok) {
        const queueData = await queuesRes.json();
        newData.queues = queueData.queues || [];
      }
      
      if (healthRes?.ok) {
        newData.health = await healthRes.json();
      }

      if (promptsRes?.ok) {
        const promptData = await promptsRes.json();
        newData.prompts = promptData.prompts || [];
      }

      if (contextsRes?.ok) {
        const contextData = await contextsRes.json();
        newData.contexts = contextData.contexts || [];
      }

      if (agentTemplatesRes?.ok) {
        const agentTemplateData = await agentTemplatesRes.json();
        newData.agentTemplates = agentTemplateData.agents || [];
      }

      setData(newData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleSubmit = async (type) => {
    try {
      const url = `/api/agent-management?type=${type}${editingId ? `&id=${editingId}` : ''}`;
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowForm(null);
        setFormData({});
        setEditingId(null);
        loadDashboardData();
      } else {
        console.error('Failed to save:', await response.text());
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleEdit = (type, item) => {
    setEditingId(item.id);
    setFormData(item);
    setShowForm(type);
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`/api/agent-management?type=${type}&id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const resetForm = () => {
    setShowForm(null);
    setFormData({});
    setEditingId(null);
  };

  const renderPromptForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {editingId ? 'Edit Prompt' : 'Create New Prompt'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Prompt name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={formData.category || 'general'}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="general">General</option>
              <option value="coding">Coding</option>
              <option value="analysis">Analysis</option>
              <option value="creative">Creative</option>
              <option value="research">Research</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              className="w-full p-2 border rounded-lg h-32"
              value={formData.content || ''}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="Enter your prompt content..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
              onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim())})}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('prompts')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderContextForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {editingId ? 'Edit Context' : 'Create New Context'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Context name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">System Prompt</label>
            <textarea
              className="w-full p-2 border rounded-lg h-40"
              value={formData.system_prompt || ''}
              onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
              placeholder="System prompt that defines the agent's behavior and context..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Variables (JSON)</label>
            <textarea
              className="w-full p-2 border rounded-lg h-24"
              value={typeof formData.variables === 'object' ? JSON.stringify(formData.variables, null, 2) : formData.variables || '{}'}
              onChange={(e) => {
                try {
                  setFormData({...formData, variables: JSON.parse(e.target.value)});
                } catch {
                  setFormData({...formData, variables: e.target.value});
                }
              }}
              placeholder='{"variable1": "value1", "variable2": "value2"}'
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Settings (JSON)</label>
            <textarea
              className="w-full p-2 border rounded-lg h-24"
              value={typeof formData.settings === 'object' ? JSON.stringify(formData.settings, null, 2) : formData.settings || '{}'}
              onChange={(e) => {
                try {
                  setFormData({...formData, settings: JSON.parse(e.target.value)});
                } catch {
                  setFormData({...formData, settings: e.target.value});
                }
              }}
              placeholder='{"temperature": 0.7, "max_tokens": 1000}'
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('contexts')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderAgentForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">
          {editingId ? 'Edit Agent Template' : 'Create New Agent Template'}
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Agent name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                className="w-full p-2 border rounded-lg"
                value={formData.type || ''}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="">Select type</option>
                <option value="claude">Claude</option>
                <option value="gpt">GPT</option>
                <option value="gemini">Gemini</option>
                <option value="deepseek">DeepSeek</option>
                <option value="mistral">Mistral</option>
                <option value="webscraper">WebScraper</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full p-2 border rounded-lg h-20"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Agent description and purpose"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={formData.model || ''}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              placeholder="Model name (e.g., claude-3-opus, gpt-4, gemini-pro)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Capabilities (comma-separated)</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg"
              value={Array.isArray(formData.capabilities) ? formData.capabilities.join(', ') : ''}
              onChange={(e) => setFormData({...formData, capabilities: e.target.value.split(',').map(c => c.trim())})}
              placeholder="coding, analysis, creative_writing, research"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">API Configuration (JSON)</label>
            <textarea
              className="w-full p-2 border rounded-lg h-24"
              value={typeof formData.api_config === 'object' ? JSON.stringify(formData.api_config, null, 2) : formData.api_config || '{}'}
              onChange={(e) => {
                try {
                  setFormData({...formData, api_config: JSON.parse(e.target.value)});
                } catch {
                  setFormData({...formData, api_config: e.target.value});
                }
              }}
              placeholder='{"api_key": "key", "base_url": "url", "timeout": 30}'
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Settings (JSON)</label>
            <textarea
              className="w-full p-2 border rounded-lg h-24"
              value={typeof formData.settings === 'object' ? JSON.stringify(formData.settings, null, 2) : formData.settings || '{}'}
              onChange={(e) => {
                try {
                  setFormData({...formData, settings: JSON.parse(e.target.value)});
                } catch {
                  setFormData({...formData, settings: e.target.value});
                }
              }}
              placeholder='{"temperature": 0.7, "max_tokens": 2000, "queue": "claude-3-opus"}'
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit('agents')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderManagementTab = (type, items, title) => (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          onClick={() => setShowForm(type)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add New {title.slice(0, -1)}
        </button>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {title.toLowerCase()} found. Create your first one!
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{item.name}</h3>
                  {item.description && (
                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Created: {new Date(item.created_at).toLocaleDateString()}
                    {item.updated_at !== item.created_at && (
                      <span> • Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {type === 'prompts' && item.category && (
                    <div className="mt-1">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {item.category}
                      </span>
                    </div>
                  )}
                  {type === 'agents' && (
                    <div className="mt-1 space-x-2">
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        {item.type}
                      </span>
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                        {item.model}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(type, item)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(type, item.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'agents', label: 'Live Agents', icon: '🤖' },
    { id: 'prompts', label: 'Prompts', icon: '💬' },
    { id: 'contexts', label: 'Contexts', icon: '🎯' },
    { id: 'templates', label: 'Agent Templates', icon: '📝' },
    { id: 'tasks', label: 'Tasks', icon: '⚡' },
    { id: 'scheduling', label: 'Scheduling', icon: '📅' },
    { id: 'health', label: 'Health', icon: '❤️' }
  ];

  return (
    <div className="enhanced-multi-agent-dashboard p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Multi-Agent Dashboard
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Manage agents, prompts, contexts, and monitor system health
            </p>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <AgentMonitor agents={data.agents} stats={data.stats} />
              <QueueStatistics queues={data.queues} />
              <div className="xl:col-span-2">
                <HealthStatus health={data.health} />
              </div>
            </div>
          )}
          
          {activeTab === 'agents' && (
            <AgentMonitor agents={data.agents} stats={data.stats} mode="detailed" />
          )}
          
          {activeTab === 'prompts' && renderManagementTab('prompts', data.prompts, 'Prompts')}
          
          {activeTab === 'contexts' && renderManagementTab('contexts', data.contexts, 'Contexts')}
          
          {activeTab === 'templates' && renderManagementTab('agents', data.agentTemplates, 'Agent Templates')}
          
          {activeTab === 'tasks' && <TaskSubmission />}

          {activeTab === 'scheduling' && <SchedulingPage />}
          
          {activeTab === 'health' && <HealthStatus health={data.health} mode="detailed" />}
        </div>

        {/* Forms */}
        {showForm === 'prompts' && renderPromptForm()}
        {showForm === 'contexts' && renderContextForm()}
        {showForm === 'agents' && renderAgentForm()}
      </div>
    </div>
  );
};

export default EnhancedMultiAgentDashboard;