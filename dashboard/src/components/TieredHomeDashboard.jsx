'use client';
import React, { useState } from 'react';
import EnhancedMultiAgentDashboard from './EnhancedMultiAgentDashboard';
import UnifiedDashboard from './UnifiedDashboard';

const TieredHomeDashboard = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('enhanced');

  const dashboards = [
    {
      id: 'enhanced',
      name: 'Enhanced Multi-Agent',
      description: 'Full-featured dashboard with prompt, context, and agent management',
      icon: '🚀',
      component: EnhancedMultiAgentDashboard
    },
    {
      id: 'unified',
      name: 'Unified Dashboard',
      description: 'Simple unified view of agents, queues, and tasks',
      icon: '📊',
      component: UnifiedDashboard
    }
  ];

  const renderDashboardSelector = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            EzAigents Dashboard
          </h1>
          <p className="text-xl text-blue-200 mb-8">
            Choose your dashboard experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {dashboards.map(dashboard => (
            <div
              key={dashboard.id}
              onClick={() => setSelectedDashboard(dashboard.id)}
              className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-opacity-20 border border-white border-opacity-20"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">{dashboard.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {dashboard.name}
                </h3>
                <p className="text-blue-200 mb-6">
                  {dashboard.description}
                </p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Launch Dashboard
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="text-white text-sm opacity-75">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Agents Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSelectedDashboard = () => {
    const dashboard = dashboards.find(d => d.id === selectedDashboard);
    if (!dashboard) return null;

    const Component = dashboard.component;
    return (
      <div className="relative">
        {/* Dashboard Header with Switch Option */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setSelectedDashboard(null)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Switch Dashboard
          </button>
        </div>
        <Component />
      </div>
    );
  };

  if (!selectedDashboard) {
    return renderDashboardSelector();
  }

  return renderSelectedDashboard();
};

export default TieredHomeDashboard;