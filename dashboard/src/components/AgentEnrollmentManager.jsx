import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
const { Plus, ExternalLink, Check, X, AlertCircle, Settings, Trash2, Copy, Eye, EyeOff } = LucideIcons;

const AI_PLATFORMS = {
  openai: {
    name: 'OpenAI',
    color: 'bg-green-500',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    apiUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    keyFormat: 'sk-...',
    testEndpoint: 'https://api.openai.com/v1/models'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    color: 'bg-orange-500',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    apiUrl: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/',
    keyFormat: 'sk-ant-...',
    testEndpoint: 'https://api.anthropic.com/v1/messages'
  },
  deepseek: {
    name: 'DeepSeek',
    color: 'bg-blue-500',
    models: ['deepseek-coder', 'deepseek-chat'],
    apiUrl: 'https://platform.deepseek.com/api-keys',
    docsUrl: 'https://platform.deepseek.com/docs',
    keyFormat: 'sk-...',
    testEndpoint: 'https://api.deepseek.com/v1/models'
  },
  google: {
    name: 'Google (Gemini)',
    color: 'bg-blue-600',
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro'],
    apiUrl: 'https://makersuite.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
    keyFormat: 'AIza...',
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models'
  },
  mistral: {
    name: 'Mistral AI',
    color: 'bg-purple-500',
    models: ['mistral-large', 'mistral-medium', 'mistral-small'],
    apiUrl: 'https://console.mistral.ai/api-keys/',
    docsUrl: 'https://docs.mistral.ai/',
    keyFormat: 'xxx...',
    testEndpoint: 'https://api.mistral.ai/v1/models'
  },
  perplexity: {
    name: 'Perplexity',
    color: 'bg-indigo-500',
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
    apiUrl: 'https://www.perplexity.ai/settings/api',
    docsUrl: 'https://docs.perplexity.ai/',
    keyFormat: 'pplx-...',
    testEndpoint: 'https://api.perplexity.ai/models'
  },
  cohere: {
    name: 'Cohere',
    color: 'bg-pink-500',
    models: ['command-r-plus', 'command-r', 'command'],
    apiUrl: 'https://dashboard.cohere.com/api-keys',
    docsUrl: 'https://docs.cohere.com/',
    keyFormat: 'co-...',
    testEndpoint: 'https://api.cohere.ai/v1/models'
  },
  together: {
    name: 'Together AI',
    color: 'bg-cyan-500',
    models: ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    apiUrl: 'https://api.together.xyz/settings/api-keys',
    docsUrl: 'https://docs.together.ai/',
    keyFormat: '...',
    testEndpoint: 'https://api.together.xyz/models'
  }
};

const AgentEnrollmentManager = () => {
  const [agents, setAgents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    apiKey: '',
    model: '',
    maxTokens: 4096,
    temperature: 0.7,
    enabled: true
  });
  const [showApiKey, setShowApiKey] = useState({});
  const [testingAgents, setTestingAgents] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents/enrolled');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setFormData({
      ...formData,
      platform: platform,
      model: AI_PLATFORMS[platform]?.models[0] || '',
      name: `${AI_PLATFORMS[platform]?.name} Agent ${agents.filter(a => a.platform === platform).length + 1}`
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/agents/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadAgents();
        setShowAddForm(false);
        setFormData({
          name: '',
          platform: '',
          apiKey: '',
          model: '',
          maxTokens: 4096,
          temperature: 0.7,
          enabled: true
        });
        setSelectedPlatform('');
      }
    } catch (error) {
      console.error('Failed to enroll agent:', error);
    }
  };

  const testApiKey = async (agentId) => {
    setTestingAgents(prev => ({ ...prev, [agentId]: true }));
    
    try {
      const response = await fetch(`/api/agents/${agentId}/test`, {
        method: 'POST'
      });
      
      const result = await response.json();
      setTestResults(prev => ({ 
        ...prev, 
        [agentId]: { 
          success: response.ok, 
          message: result.message || (response.ok ? 'API key is valid' : 'API key test failed'),
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [agentId]: { 
          success: false, 
          message: 'Test failed: ' + error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setTestingAgents(prev => ({ ...prev, [agentId]: false }));
    }
  };

  const toggleAgent = async (agentId, enabled) => {
    try {
      await fetch(`/api/agents/${agentId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      await loadAgents();
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const deleteAgent = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      await loadAgents();
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const copyApiKey = (apiKey) => {
    navigator.clipboard.writeText(apiKey);
  };

  const maskApiKey = (apiKey) => {
    if (!apiKey) return '';
    const start = apiKey.substring(0, 8);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}${'*'.repeat(Math.max(0, apiKey.length - 12))}${end}`;
  };

  const groupedAgents = agents.reduce((acc, agent) => {
    if (!acc[agent.platform]) acc[agent.platform] = [];
    acc[agent.platform].push(agent);
    return acc;
  }, {});

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Agent Management</h1>
            <p className="text-gray-600 mt-2">Enroll and manage multiple AI agents across different platforms</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus size={20} />
            Add New Agent
          </button>
        </div>

        {/* Platform Quick Links */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Platform Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Object.entries(AI_PLATFORMS).map(([key, platform]) => (
              <div key={key} className="text-center">
                <div className={`${platform.color} w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm`}>
                  {platform.name.charAt(0)}
                </div>
                <p className="text-sm font-medium mb-2">{platform.name}</p>
                <div className="flex flex-col gap-1">
                  <a
                    href={platform.apiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center justify-center gap-1"
                  >
                    API Keys <ExternalLink size={12} />
                  </a>
                  <a
                    href={platform.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-gray-800 text-xs flex items-center justify-center gap-1"
                  >
                    Docs <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrolled Agents */}
        <div className="space-y-6">
          {Object.entries(groupedAgents).map(([platform, platformAgents]) => (
            <div key={platform} className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`${AI_PLATFORMS[platform]?.color} w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                    {AI_PLATFORMS[platform]?.name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-semibold">{AI_PLATFORMS[platform]?.name}</h3>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                    {platformAgents.length} agent{platformAgents.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4">
                  {platformAgents.map((agent) => (
                    <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${agent.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                          <h4 className="font-medium">{agent.name}</h4>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {agent.model}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => testApiKey(agent.id)}
                            disabled={testingAgents[agent.id]}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded"
                            title="Test API Key"
                          >
                            {testingAgents[agent.id] ? (
                              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            ) : (
                              <Settings size={16} />
                            )}
                          </button>
                          
                          <button
                            onClick={() => toggleAgent(agent.id, !agent.enabled)}
                            className={`p-2 rounded ${agent.enabled ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
                            title={agent.enabled ? 'Disable Agent' : 'Enable Agent'}
                          >
                            {agent.enabled ? <Check size={16} /> : <X size={16} />}
                          </button>
                          
                          <button
                            onClick={() => deleteAgent(agent.id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded"
                            title="Delete Agent"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">API Key:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded flex-1">
                              {showApiKey[agent.id] ? agent.apiKey : maskApiKey(agent.apiKey)}
                            </code>
                            <button
                              onClick={() => setShowApiKey(prev => ({ ...prev, [agent.id]: !prev[agent.id] }))}
                              className="text-gray-500 hover:text-gray-700 p-1"
                            >
                              {showApiKey[agent.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => copyApiKey(agent.apiKey)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Temperature:</span>
                          <div className="mt-1">{agent.temperature}</div>
                        </div>
                        
                        <div>
                          <span className="text-gray-500">Max Tokens:</span>
                          <div className="mt-1">{agent.maxTokens?.toLocaleString()}</div>
                        </div>
                      </div>
                      
                      {testResults[agent.id] && (
                        <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                          testResults[agent.id].success 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {testResults[agent.id].success ? (
                            <Check size={16} />
                          ) : (
                            <AlertCircle size={16} />
                          )}
                          <span className="text-sm">{testResults[agent.id].message}</span>
                          <span className="text-xs opacity-70 ml-auto">
                            {new Date(testResults[agent.id].timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Agent Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Add New AI Agent</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Platform Selection */}
                {!selectedPlatform && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select AI Platform
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(AI_PLATFORMS).map(([key, platform]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handlePlatformSelect(key)}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className={`${platform.color} w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2`}>
                            {platform.name.charAt(0)}
                          </div>
                          <div className="font-medium">{platform.name}</div>
                          <div className="text-sm text-gray-500">{platform.keyFormat}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Agent Configuration */}
                {selectedPlatform && (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className={`${AI_PLATFORMS[selectedPlatform].color} w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                        {AI_PLATFORMS[selectedPlatform].name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{AI_PLATFORMS[selectedPlatform].name}</div>
                        <div className="text-sm text-gray-600">Configure your agent settings</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlatform('')}
                        className="ml-auto text-gray-500 hover:text-gray-700"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Agent Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Model
                        </label>
                        <select
                          required
                          value={formData.model}
                          onChange={(e) => setFormData({...formData, model: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {AI_PLATFORMS[selectedPlatform].models.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                        <a
                          href={AI_PLATFORMS[selectedPlatform].apiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Get API Key <ExternalLink size={14} className="inline" />
                        </a>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder={AI_PLATFORMS[selectedPlatform].keyFormat}
                        value={formData.apiKey}
                        onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temperature (0-2)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={formData.temperature}
                          onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Tokens
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100000"
                          value={formData.maxTokens}
                          onChange={(e) => setFormData({...formData, maxTokens: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedPlatform('');
                      setFormData({
                        name: '',
                        platform: '',
                        apiKey: '',
                        model: '',
                        maxTokens: 4096,
                        temperature: 0.7,
                        enabled: true
                      });
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {selectedPlatform && (
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Agent
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentEnrollmentManager;