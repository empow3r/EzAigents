'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const UnifiedDashboard = dynamic(
  () => import('../src/components/OptimizedUnifiedDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);
// import '../src/styles/animations.css';

export default function Home() {
  const [dashboardMode, setDashboardMode] = useState('simple');
  const [showSelector, setShowSelector] = useState(false);

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

      <UnifiedDashboard 
        mode={dashboardMode}
        features={currentMode?.features || ['agents']}
        refreshInterval={5000}
      />
    </div>
  );
}