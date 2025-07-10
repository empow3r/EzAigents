import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  Cpu,
  Database,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Server,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

// Agent Statistics Detail View
export const AgentStatsDetailView = ({ data, darkMode }) => {
  const agents = data?.agents || [];
  const totalTasks = data?.totalTasks || 0;
  const completedTasks = data?.completedTasks || 0;
  const failedTasks = data?.failedTasks || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Completed Tasks
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {completedTasks.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <XCircle className="text-red-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Failed Tasks
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {failedTasks.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-blue-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Success Rate
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Agent List */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Active Agents
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'active' ? 'bg-green-500' : 
                    agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className={`font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {agent.name}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  agent.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : agent.status === 'busy'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {agent.status}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Tasks Completed
                  </span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                    {agent.tasksCompleted || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Last Activity
                  </span>
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                    {agent.lastActivity || 'Never'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// System Performance Detail View
export const SystemPerformanceDetailView = ({ data, darkMode }) => {
  const metrics = data?.metrics || {};
  
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Cpu className="text-blue-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                CPU Usage
              </p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics.cpuUsage || '0'}%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Database className="text-green-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Memory
              </p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics.memoryUsage || '0'}%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Zap className="text-yellow-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Response Time
              </p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics.responseTime || '0'}ms
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Server className="text-purple-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Uptime
              </p>
              <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics.uptime || '0h'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Performance Graph Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`p-6 rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-gray-50'
        }`}
      >
        <h3 className={`text-lg font-semibold mb-4 flex items-center ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <BarChart3 className="mr-2" size={20} />
          Performance Trends
        </h3>
        
        <div className={`h-64 flex items-center justify-center border-2 border-dashed rounded-lg ${
          darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'
        }`}>
          <div className="text-center">
            <LineChart size={48} className="mx-auto mb-2 opacity-50" />
            <p>Performance chart will be rendered here</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Queue Statistics Detail View
export const QueueStatsDetailView = ({ data, darkMode }) => {
  const queues = data?.queues || [];
  const totalItems = data?.totalItems || 0;
  
  return (
    <div className="space-y-6">
      {/* Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Activity className="text-blue-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Queues
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {queues.length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Clock className="text-orange-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Pending Items
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {totalItems.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <TrendingUp className="text-green-500" size={24} />
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Processing Rate
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data?.processingRate || 0}/min
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Queue Details */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Queue Details
        </h3>
        
        <div className="space-y-3">
          {queues.map((queue, index) => (
            <motion.div
              key={queue.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`p-4 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {queue.name}
                  </h4>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {queue.description || 'No description'}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {queue.count || 0}
                  </p>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    items
                  </p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className={`mt-3 h-2 rounded-full ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((queue.count || 0) / Math.max(totalItems, 1) * 100, 100)}%`
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default {
  AgentStatsDetailView,
  SystemPerformanceDetailView,
  QueueStatsDetailView
};