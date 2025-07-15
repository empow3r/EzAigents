'use client';
import React from 'react';

const AgentMonitor = ({ agents = [], stats = {}, mode = 'default', onAgentSelect = null, showCollaboration = false }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'working': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (mode === 'executive') {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Agent Fleet Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.total || 0}</div>
            <div className="text-sm text-gray-600">Total Agents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.active || 0}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.idle || 0}</div>
            <div className="text-sm text-gray-600">Idle</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.working || 0}</div>
            <div className="text-sm text-gray-600">Working</div>
          </div>
        </div>
        {/* Agent type distribution */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(stats.types || {}).map(([type, count]) => (
            <div key={type} className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="capitalize">{type}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Agent Monitor</h2>
        <div className="text-sm text-gray-500">
          {agents.length} agent{agents.length !== 1 ? 's' : ''} online
        </div>
      </div>
      
      {agents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No agents currently active
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => (
            <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
                <div>
                  <div className="font-medium">{agent.type}</div>
                  <div className="text-sm text-gray-600">{agent.id}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{agent.current_task || 'Idle'}</div>
                <div className="text-xs text-gray-500">
                  {formatLastSeen(agent.last_heartbeat)}
                </div>
                {showCollaboration && (
                  <div className="flex space-x-1 mt-1">
                    <button
                      onClick={() => onAgentSelect && onAgentSelect(agent, 'assign')}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Assign Task
                    </button>
                    <button
                      onClick={() => onAgentSelect && onAgentSelect(agent, 'collaborate')}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    >
                      Collaborate
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentMonitor;