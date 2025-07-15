'use client';
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

const AgentCollaborationHub = () => {
  const [agents, setAgents] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [taskTemplates, setTaskTemplates] = useState([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState({});

  useEffect(() => {
    loadCollaborationData();
    const interval = setInterval(loadCollaborationData, 3000); // Real-time updates
    return () => clearInterval(interval);
  }, []);

  const loadCollaborationData = async () => {
    try {
      const [agentsRes, collaborationsRes, metricsRes] = await Promise.all([
        fetch('/api/agents?stats=true'),
        fetch('/api/collaborations'),
        fetch('/api/real-time-metrics')
      ]);

      if (agentsRes.ok) {
        const agentData = await agentsRes.json();
        setAgents(agentData.agents || []);
      }

      if (collaborationsRes.ok) {
        const collabData = await collaborationsRes.json();
        setCollaborations(collabData.sessions || []);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setRealTimeMetrics(metricsData.metrics || {});
      }
    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    }
  };

  const createCollaborationSession = async (agentIds, taskType, objective) => {
    try {
      const response = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentIds,
          taskType,
          objective,
          sessionType: 'multi-agent-collaboration'
        })
      });

      if (response.ok) {
        const session = await response.json();
        setActiveSession(session);
        loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to create collaboration session:', error);
    }
  };

  const assignTask = async (agentId, task, priority = 'normal') => {
    try {
      const response = await fetch('/api/task-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          task,
          priority,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        loadCollaborationData();
      }
    } catch (error) {
      console.error('Failed to assign task:', error);
    }
  };

  const getAgentStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'working': return 'bg-blue-500';
      case 'idle': return 'bg-yellow-500';
      case 'collaborating': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getEfficiencyScore = (agent) => {
    if (!agent.metrics) return 0;
    const { completed = 0, failed = 0, avgTime = 0 } = agent.metrics;
    const total = completed + failed;
    if (total === 0) return 0;
    const successRate = (completed / total) * 100;
    const speedBonus = avgTime < 30 ? 20 : avgTime < 60 ? 10 : 0;
    return Math.min(100, Math.round(successRate + speedBonus));
  };

  return (
    <div className="space-y-6">
      {/* Header with Real-time Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center">
            <Icons.Users className="mr-2" />
            Agent Collaboration Hub
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{agents.length}</div>
              <div className="text-sm opacity-80">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{collaborations.length}</div>
              <div className="text-sm opacity-80">Live Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{realTimeMetrics.efficiency || 0}%</div>
              <div className="text-sm opacity-80">Fleet Efficiency</div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold">{realTimeMetrics.tasksPerMinute || 0}</div>
            <div className="text-xs opacity-80">Tasks/Min</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{realTimeMetrics.avgResponseTime || 0}s</div>
            <div className="text-xs opacity-80">Avg Response</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{realTimeMetrics.collaborativeEfficiency || 0}%</div>
            <div className="text-xs opacity-80">Collab Efficiency</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{realTimeMetrics.queueDepth || 0}</div>
            <div className="text-xs opacity-80">Queue Depth</div>
          </div>
        </div>
      </div>

      {/* Agent Fleet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Agents */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Icons.Target className="mr-2 text-blue-600" />
            Agent Fleet Status
          </h3>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {agents.map(agent => (
              <div key={agent.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getAgentStatusColor(agent.status)}`}></div>
                    <div>
                      <div className="font-medium">{agent.type}</div>
                      <div className="text-sm text-gray-600 truncate">{agent.id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {getEfficiencyScore(agent)}% Efficiency
                      </div>
                      <div className="text-xs text-gray-500">
                        {agent.current_task || 'Idle'}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          if (selectedAgents.includes(agent.id)) {
                            setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                          } else {
                            setSelectedAgents([...selectedAgents, agent.id]);
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedAgents.includes(agent.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {selectedAgents.includes(agent.id) ? 'Selected' : 'Select'}
                      </button>
                      
                      <button
                        onClick={() => assignTask(agent.id, { type: 'priority', content: 'High priority task' })}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        <Icons.Zap className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Agent Capabilities */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {(agent.capabilities || []).slice(0, 3).map(cap => (
                    <span key={cap} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {cap}
                    </span>
                  ))}
                  {(agent.capabilities || []).length > 3 && (
                    <span className="text-xs text-gray-500">+{agent.capabilities.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Collaboration Sessions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Icons.MessageSquare className="mr-2 text-purple-600" />
            Active Collaborations
          </h3>
          
          {collaborations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active collaboration sessions
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {collaborations.map(session => (
                <div key={session.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{session.objective}</div>
                      <div className="text-sm text-gray-600">
                        {session.agents.length} agents • {session.taskType}
                      </div>
                      <div className="text-xs text-gray-500">
                        Started {new Date(session.startTime).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-green-600 font-medium">
                        {session.progress || 0}%
                      </div>
                      <button
                        onClick={() => setActiveSession(session)}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                      >
                        View
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {session.agents.map(agentId => (
                      <span key={agentId} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {agentId.substring(0, 8)}...
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Control Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Icons.Share2 className="mr-2 text-green-600" />
          Create Collaboration Session
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Selected Agents</label>
            <div className="p-2 border rounded-lg min-h-20">
              {selectedAgents.length === 0 ? (
                <div className="text-gray-500 text-sm">Select agents from the list above</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedAgents.map(agentId => (
                    <span key={agentId} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {agentId.substring(0, 8)}...
                      <button
                        onClick={() => setSelectedAgents(selectedAgents.filter(id => id !== agentId))}
                        className="ml-1 text-blue-900 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Task Type</label>
            <select className="w-full p-2 border rounded-lg">
              <option value="code-review">Code Review</option>
              <option value="content-creation">Content Creation</option>
              <option value="data-analysis">Data Analysis</option>
              <option value="research">Research Project</option>
              <option value="qa-testing">QA Testing</option>
              <option value="creative-brainstorm">Creative Brainstorm</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Objective</label>
            <textarea
              className="w-full p-2 border rounded-lg"
              rows="3"
              placeholder="Describe the collaboration objective..."
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedAgents.length} agents selected
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setSelectedAgents([])}
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              Clear Selection
            </button>
            
            <button
              onClick={() => createCollaborationSession(selectedAgents, 'code-review', 'Test collaboration')}
              disabled={selectedAgents.length < 2}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Collaboration
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">{realTimeMetrics.throughput || 0}</div>
              <div className="text-sm text-gray-600">Tasks/Hour</div>
            </div>
            <Icons.TrendingUp className="text-blue-600" />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            +{realTimeMetrics.throughputChange || 0}% from last hour
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">{realTimeMetrics.successRate || 0}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <Icons.Target className="text-green-600" />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {realTimeMetrics.successfulTasks || 0} of {realTimeMetrics.totalTasks || 0} tasks
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">{realTimeMetrics.avgCollabTime || 0}m</div>
              <div className="text-sm text-gray-600">Avg Collab Time</div>
            </div>
            <Icons.Clock className="text-purple-600" />
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {realTimeMetrics.activeCollaborations || 0} sessions running
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCollaborationHub;