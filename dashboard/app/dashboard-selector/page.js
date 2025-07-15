'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardSelector() {
  const router = useRouter();
  const [selectedVersion, setSelectedVersion] = useState(null);

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    // Navigate to the selected dashboard version
    if (version === 'simple') {
      window.location.href = '/simple';
    } else if (version === 'executive') {
      window.location.href = '/executive';
    }
  };

  const dashboardVersions = [
    {
      id: 'simple',
      name: 'Simple Dashboard',
      description: 'Clean, minimal interface for basic agent monitoring',
      icon: '🎯',
      color: 'from-blue-500 to-cyan-500',
      features: ['Basic agent status', 'Task submission', 'Queue monitoring']
    },
    {
      id: 'executive',
      name: 'Executive Dashboard',
      description: 'Advanced analytics and comprehensive system overview',
      icon: '📊',
      color: 'from-purple-500 to-pink-500',
      features: ['Advanced analytics', 'Performance metrics', '3D visualizations', 'Real-time monitoring']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Ez Aigents
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Choose Your Dashboard Experience
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
        </div>

        {/* Version Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {dashboardVersions.map((version) => (
            <div
              key={version.id}
              className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                selectedVersion === version.id ? 'ring-4 ring-white ring-opacity-50' : ''
              }`}
              onClick={() => handleVersionSelect(version.id)}
            >
              <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 hover:border-white hover:border-opacity-30 transition-all duration-300">
                {/* Icon and Header */}
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">{version.icon}</div>
                  <h2 className="text-3xl font-bold mb-2">{version.name}</h2>
                  <p className="text-gray-400 text-lg">{version.description}</p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-gray-300">Features:</h3>
                  <ul className="space-y-2">
                    {version.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-300">
                        <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Launch Button */}
                <button
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 bg-gradient-to-r ${version.color} hover:shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1`}
                >
                  Launch {version.name}
                </button>

                {/* Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 bg-gradient-to-r ${version.color} blur-xl -z-10`}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Access Links */}
        <div className="mt-16 text-center">
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-xl p-6 max-w-4xl mx-auto border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Quick Access</h3>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => window.open('/api/health', '_blank')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                🔋 System Health
              </button>
              <button
                onClick={() => window.open('/api/agent-stats', '_blank')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                🤖 Agent Status
              </button>
              <button
                onClick={() => window.open('/api/queue-stats', '_blank')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                📈 Queue Stats
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                🏠 Current Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400">
          <p>Ez Aigents - Multi-Agent AI Orchestration Platform</p>
        </div>
      </div>
    </div>
  );
}