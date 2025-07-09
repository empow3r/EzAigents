'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Zap, 
  Settings
} from 'lucide-react';

export default function MinimalDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'enhancements', name: 'Enhancements', icon: Zap },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-sm bg-black/20 border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">Ez Aigent Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">System Online</span>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex space-x-1 bg-black/20 p-1 rounded-lg backdrop-blur-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">System Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Active Agents:</span>
                    <span className="text-green-400">5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasks Completed:</span>
                    <span className="text-blue-400">142</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queue Size:</span>
                    <span className="text-yellow-400">8</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Claude Agent:</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GPT Agent:</span>
                    <span className="text-green-400">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DeepSeek Agent:</span>
                    <span className="text-green-400">Active</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    View Full Dashboard
                  </Button>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Start New Task
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'enhancements' && (
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Enhancement System</h3>
              <p className="text-gray-300 mb-4">Manage and deploy system enhancements.</p>
              <Button className="bg-green-600 hover:bg-green-700">
                Load Enhancement Dashboard
              </Button>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Settings</h3>
              <p className="text-gray-300 mb-4">Configure system settings and preferences.</p>
              <Button className="bg-gray-600 hover:bg-gray-700">
                Open Settings
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}