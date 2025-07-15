import React, { useState, useEffect } from 'react';

const LLMStatusMonitor = () => {
  const [llmStatus, setLlmStatus] = useState({});
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLLMStatus = async () => {
    try {
      const response = await fetch('/api/llm-status');
      const data = await response.json();
      
      if (data.success) {
        setLlmStatus(data.llmStatus);
        setSummary(data.summary);
        setLastUpdate(new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to fetch LLM status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testLLMConnection = async (llmType) => {
    setTesting(prev => ({ ...prev, [llmType]: true }));
    
    try {
      const response = await fetch(`/api/llm-status?test=${llmType}`);
      const data = await response.json();
      
      if (data.success) {
        // Update the specific LLM status with test results
        setLlmStatus(prev => ({
          ...prev,
          [llmType]: {
            ...prev[llmType],
            testResult: data.result,
            lastTested: new Date().toISOString()
          }
        }));
      }
    } catch (error) {
      console.error(`Failed to test ${llmType}:`, error);
    } finally {
      setTesting(prev => ({ ...prev, [llmType]: false }));
    }
  };

  const testAllConnections = async () => {
    const llmTypes = Object.keys(llmStatus);
    setTesting(Object.fromEntries(llmTypes.map(type => [type, true])));
    
    try {
      const response = await fetch('/api/llm-status?test=all');
      const data = await response.json();
      
      if (data.success) {
        // Update all LLM statuses with test results
        const updatedStatus = { ...llmStatus };
        Object.entries(data.results).forEach(([llmType, result]) => {
          if (updatedStatus[llmType]) {
            updatedStatus[llmType].testResult = result;
            updatedStatus[llmType].lastTested = new Date().toISOString();
          }
        });
        setLlmStatus(updatedStatus);
      }
    } catch (error) {
      console.error('Failed to test all LLM connections:', error);
    } finally {
      setTesting({});
    }
  };

  useEffect(() => {
    fetchLLMStatus();
    const interval = setInterval(fetchLLMStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status, hasErrors = false) => {
    if (hasErrors) return 'text-red-600 bg-red-100';
    switch (status) {
      case 'active':
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status, hasErrors = false) => {
    if (hasErrors) return '❌';
    switch (status) {
      case 'active':
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">{summary.total || 0}</div>
          <div className="text-sm text-gray-600">Total LLMs</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">{summary.configured || 0}</div>
          <div className="text-sm text-gray-600">Configured</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">{summary.active || 0}</div>
          <div className="text-sm text-gray-600">Active Agents</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">{summary.errors || 0}</div>
          <div className="text-sm text-gray-600">Issues Found</div>
        </div>
      </div>

      {/* LLM Status Details */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">LLM Agent Status</h2>
            {lastUpdate && (
              <p className="text-sm text-gray-500">
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={fetchLLMStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={testAllConnections}
              disabled={Object.values(testing).some(t => t)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              {Object.values(testing).some(t => t) ? '⏳ Testing...' : '🧪 Test All'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(llmStatus).map(([llmType, status]) => (
            <div key={llmType} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    status.configured && status.agentStatus?.status === 'active' && status.errors.length === 0
                      ? 'bg-green-500' 
                      : status.errors.length > 0 
                      ? 'bg-red-500' 
                      : 'bg-yellow-500'
                  }`}></div>
                  
                  <div>
                    <h3 className="font-semibold text-lg">{status.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>API Key: {status.apiKeyStatus === 'present' ? '✅ Set' : '❌ Missing'}</span>
                      {status.agentStatus && (
                        <span>Agent: {getStatusIcon(status.agentStatus.status)} {status.agentStatus.status}</span>
                      )}
                      {status.testResult && (
                        <span>
                          Connection: {getStatusIcon(status.testResult.status)} {status.testResult.status}
                          {status.testResult.responseTime && (
                            <span className="ml-1">({status.testResult.responseTime}ms)</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testLLMConnection(llmType)}
                    disabled={testing[llmType]}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors disabled:bg-gray-200 disabled:text-gray-500 text-sm"
                  >
                    {testing[llmType] ? '⏳ Testing...' : '🧪 Test'}
                  </button>
                  
                  {status.capabilities && (
                    <div className="flex flex-wrap gap-1">
                      {status.capabilities.slice(0, 2).map(capability => (
                        <span
                          key={capability}
                          className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
                        >
                          {capability.replace('_', ' ')}
                        </span>
                      ))}
                      {status.capabilities.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{status.capabilities.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Status Details */}
              {status.agentStatus && (
                <div className="mt-3 pl-7 text-sm text-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>Agent ID: {status.agentStatus.id}</div>
                    <div>Task: {status.agentStatus.currentTask}</div>
                    {status.agentStatus.lastHeartbeat && (
                      <div>Last seen: {new Date(status.agentStatus.lastHeartbeat).toLocaleTimeString()}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Test Results */}
              {status.testResult && (
                <div className="mt-3 pl-7">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(status.testResult.status)}`}>
                    {getStatusIcon(status.testResult.status)} {status.testResult.status}
                    {status.testResult.error && `: ${status.testResult.error}`}
                  </div>
                  {status.lastTested && (
                    <div className="text-xs text-gray-500 mt-1">
                      Tested: {new Date(status.lastTested).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Errors */}
              {status.errors.length > 0 && (
                <div className="mt-3 pl-7 space-y-2">
                  {status.errors.map((error, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-start space-x-2">
                        <span className="text-red-500 text-sm">❌</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-red-800">{error.message}</div>
                          <div className="text-xs text-red-600 mt-1">
                            <strong>Solution:</strong> {error.solution}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(llmStatus).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p>No LLM agents configured</p>
            <p className="text-sm mt-1">Add API keys to environment variables to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMStatusMonitor;