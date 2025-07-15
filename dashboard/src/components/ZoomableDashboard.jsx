import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import ExpandableTile from './ExpandableTile';
import { 
  AgentStatsDetailView, 
  SystemPerformanceDetailView, 
  QueueStatsDetailView 
} from './TileDetailViews';
import * as Icons from 'lucide-react';

const ZoomableDashboard = memo(({ darkMode = false }) => {
  const [dashboardData, setDashboardData] = useState({
    agents: {
      total: 5,
      active: 3,
      busy: 1,
      idle: 1,
      agents: [
        { id: 1, name: 'Claude Agent', status: 'active', tasksCompleted: 142, lastActivity: '2 min ago' },
        { id: 2, name: 'GPT-4 Agent', status: 'busy', tasksCompleted: 98, lastActivity: 'Now' },
        { id: 3, name: 'DeepSeek Agent', status: 'active', tasksCompleted: 76, lastActivity: '5 min ago' },
        { id: 4, name: 'Mistral Agent', status: 'idle', tasksCompleted: 54, lastActivity: '1 hour ago' },
        { id: 5, name: 'Gemini Agent', status: 'active', tasksCompleted: 87, lastActivity: '1 min ago' }
      ],
      totalTasks: 457,
      completedTasks: 445,
      failedTasks: 12
    },
    performance: {
      metrics: {
        cpuUsage: 67,
        memoryUsage: 54,
        responseTime: 234,
        uptime: '7d 14h'
      },
      trends: []
    },
    queues: {
      totalItems: 156,
      processingRate: 45,
      queues: [
        { name: 'claude-3-opus', count: 45, description: 'High-priority Claude tasks' },
        { name: 'gpt-4o', count: 32, description: 'GPT-4 processing queue' },
        { name: 'deepseek-coder', count: 28, description: 'Code generation tasks' },
        { name: 'command-r-plus', count: 25, description: 'Mistral command tasks' },
        { name: 'gemini-pro', count: 26, description: 'Gemini analysis tasks' }
      ]
    }
  });

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDashboardData(prev => ({
        ...prev,
        performance: {
          ...prev.performance,
          metrics: {
            ...prev.performance.metrics,
            cpuUsage: Math.max(20, Math.min(90, prev.performance.metrics.cpuUsage + (Math.random() - 0.5) * 10)),
            memoryUsage: Math.max(30, Math.min(80, prev.performance.metrics.memoryUsage + (Math.random() - 0.5) * 8)),
            responseTime: Math.max(100, Math.min(500, prev.performance.metrics.responseTime + (Math.random() - 0.5) * 50))
          }
        },
        queues: {
          ...prev.queues,
          totalItems: Math.max(50, Math.min(300, prev.queues.totalItems + Math.floor((Math.random() - 0.5) * 20)))
        }
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const tileContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const tileVariants = {
    hidden: { 
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          AI Agent Command Center
        </h1>
        <p className={`text-lg ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          Click any tile to explore detailed insights
        </p>
      </motion.div>

      {/* Dashboard Grid */}
      <motion.div
        variants={tileContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Agent Statistics Tile */}
        <motion.div variants={tileVariants}>
          <ExpandableTile
            title="Agent Statistics"
            darkMode={darkMode}
            className={`p-6 rounded-xl ${
              darkMode 
                ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700' 
                : 'bg-white/80 backdrop-blur-sm border border-gray-200'
            }`}
            detailView={<AgentStatsDetailView data={dashboardData.agents} darkMode={darkMode} />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Agent Status
                </h3>
                <Icons.Users className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`} size={24} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {dashboardData.agents.active}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Active
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`}>
                    {dashboardData.agents.busy}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Busy
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {dashboardData.agents.idle}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Idle
                  </div>
                </div>
              </div>

              <div className={`pt-4 border-t ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Success Rate
                  </span>
                  <span className={`font-semibold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {Math.round((dashboardData.agents.completedTasks / dashboardData.agents.totalTasks) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </ExpandableTile>
        </motion.div>

        {/* System Performance Tile */}
        <motion.div variants={tileVariants}>
          <ExpandableTile
            title="System Performance"
            darkMode={darkMode}
            className={`p-6 rounded-xl ${
              darkMode 
                ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700' 
                : 'bg-white/80 backdrop-blur-sm border border-gray-200'
            }`}
            detailView={<SystemPerformanceDetailView data={dashboardData.performance} darkMode={darkMode} />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  System Health
                </h3>
                <Icons.Activity className={`${darkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icons.Cpu size={16} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      CPU
                    </span>
                  </div>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardData.performance.metrics.cpuUsage}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icons.Database size={16} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Memory
                    </span>
                  </div>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardData.performance.metrics.memoryUsage}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icons.Zap size={16} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Response
                    </span>
                  </div>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dashboardData.performance.metrics.responseTime}ms
                  </span>
                </div>
              </div>
            </div>
          </ExpandableTile>
        </motion.div>

        {/* Queue Statistics Tile */}
        <motion.div variants={tileVariants}>
          <ExpandableTile
            title="Queue Statistics"
            darkMode={darkMode}
            className={`p-6 rounded-xl ${
              darkMode 
                ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700' 
                : 'bg-white/80 backdrop-blur-sm border border-gray-200'
            }`}
            detailView={<QueueStatsDetailView data={dashboardData.queues} darkMode={darkMode} />}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Task Queues
                </h3>
                <Icons.Clock className={`${darkMode ? 'text-orange-400' : 'text-orange-600'}`} size={24} />
              </div>

              <div className="space-y-3">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {dashboardData.queues.totalItems}
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Pending Tasks
                  </div>
                </div>

                <div className={`pt-3 border-t ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Processing Rate
                    </span>
                    <span className={`font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {dashboardData.queues.processingRate}/min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ExpandableTile>
        </motion.div>

        {/* Additional tiles can be added here */}
        <motion.div variants={tileVariants}>
          <div className={`p-6 rounded-xl ${
            darkMode 
              ? 'bg-gray-800/80 backdrop-blur-sm border border-gray-700' 
              : 'bg-white/80 backdrop-blur-sm border border-gray-200'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Quick Actions
                </h3>
                <Icons.BarChart3 className={`${darkMode ? 'text-purple-400' : 'text-purple-600'}`} size={24} />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button className={`p-3 rounded-lg text-left transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}>
                  Deploy New Agent
                </button>
                <button className={`p-3 rounded-lg text-left transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}>
                  View System Logs
                </button>
                <button className={`p-3 rounded-lg text-left transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}>
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
});

ZoomableDashboard.displayName = 'ZoomableDashboard';

export default ZoomableDashboard;