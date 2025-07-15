'use client';
import React from 'react';
import AgentMonitor from './features/AgentMonitor';
import QueueStatistics from './features/QueueStatistics';
import TaskSubmission from './features/TaskSubmission';
import HealthStatus from './features/HealthStatus';

const SimpleDashboard = ({ agents = [], stats = {}, queues = [], health = {}, onTaskSubmit }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Ez Aigent Dashboard</h1>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Total Agents</h3>
            <p className="text-3xl font-bold text-blue-600">{agents.length || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Active Tasks</h3>
            <p className="text-3xl font-bold text-green-600">{stats.activeTasks || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Queue Size</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.queueSize || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Completed Today</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.completedToday || 0}</p>
          </div>
        </div>

        {/* Agent Monitor */}
        <div className="mb-8">
          <AgentMonitor agents={agents} stats={stats} />
        </div>

        {/* Queue Statistics */}
        <div className="mb-8">
          <QueueStatistics queues={queues} />
        </div>

        {/* Task Submission */}
        <div className="mb-8">
          <TaskSubmission onSubmit={onTaskSubmit} />
        </div>

        {/* Health Status */}
        <div className="mb-8">
          <HealthStatus health={health} />
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;