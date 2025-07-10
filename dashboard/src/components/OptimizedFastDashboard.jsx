import React, { useState, useEffect, memo } from 'react';

const OptimizedCard = memo(({ title, children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
    {children}
  </div>
));

const QuickStats = memo(() => {
  const stats = {
    agents: 5,
    tasks: 127,
    queue: 8,
    success: 94
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <OptimizedCard className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.agents}</div>
        <div className="text-sm text-gray-600">Active Agents</div>
      </OptimizedCard>
      <OptimizedCard className="text-center">
        <div className="text-2xl font-bold text-green-600">{stats.tasks}</div>
        <div className="text-sm text-gray-600">Tasks Done</div>
      </OptimizedCard>
      <OptimizedCard className="text-center">
        <div className="text-2xl font-bold text-yellow-600">{stats.queue}</div>
        <div className="text-sm text-gray-600">In Queue</div>
      </OptimizedCard>
      <OptimizedCard className="text-center">
        <div className="text-2xl font-bold text-purple-600">{stats.success}%</div>
        <div className="text-sm text-gray-600">Success Rate</div>
      </OptimizedCard>
    </div>
  );
});

const QuickActions = memo(() => (
  <OptimizedCard title="Quick Actions" className="mb-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <button className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
        Deploy Agent
      </button>
      <button className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
        Add Task
      </button>
      <button className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors">
        View Queue
      </button>
      <button className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors">
        Settings
      </button>
    </div>
  </OptimizedCard>
));

const SystemStatus = memo(() => {
  const healthStatus = { status: 'healthy', healthy: 12, total: 12 };
  
  return (
    <OptimizedCard title="System Status" className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-sm">All systems operational</span>
        </div>
        <div className="text-xs text-gray-500">
          {healthStatus.healthy}/{healthStatus.total} checks passing
        </div>
      </div>
    </OptimizedCard>
  );
});

export default function OptimizedFastDashboard() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EzAugent Dashboard</h1>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Ultra Fast Mode</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <QuickStats />
        <QuickActions />
        <SystemStatus />
      </div>
    </div>
  );
}