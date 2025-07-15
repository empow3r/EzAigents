'use client';
import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

// Lazy load heavy components
const Globe3D = React.lazy(() => import('./Globe3D'));
const ExecutiveDashboard = React.lazy(() => import('./ExecutiveDashboard'));

// Memoized components for performance
const StatCard = memo(({ title, value, icon: Icon, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800 rounded-lg p-6 flex items-center justify-between"
  >
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-gray-400 text-sm">{title}</div>
    </div>
    <Icon className={`w-8 h-8 ${color}`} />
  </motion.div>
));

const AgentCard = memo(({ agent }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
  >
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${
        agent.status === 'active' ? 'bg-green-400' : 'bg-gray-500'
      }`} />
      <span className="font-medium text-white">{agent.name}</span>
    </div>
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-400">{agent.tasks} tasks</span>
      <span className={`text-xs px-2 py-1 rounded ${
        agent.status === 'active' 
          ? 'bg-green-900 text-green-400' 
          : 'bg-gray-600 text-gray-400'
      }`}>
        {agent.status}
      </span>
    </div>
  </motion.div>
));

const BasicDashboard = memo(() => {
  const [taskText, setTaskText] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Mock data for speed
  const agents = useMemo(() => [
    { id: 'claude', name: 'Claude', status: 'active', tasks: 3 },
    { id: 'gpt', name: 'GPT-4o', status: 'idle', tasks: 0 },
    { id: 'deepseek', name: 'DeepSeek', status: 'active', tasks: 1 },
    { id: 'mistral', name: 'Mistral', status: 'idle', tasks: 0 },
    { id: 'gemini', name: 'Gemini', status: 'active', tasks: 2 }
  ], []);

  const stats = useMemo(() => ({
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalTasks: agents.reduce((sum, a) => sum + a.tasks, 0),
    totalAgents: agents.length,
    successRate: 94
  }), [agents]);

  const handleSubmitTask = useCallback(async () => {
    if (!taskText.trim()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: 'user-task.txt',
          prompt: taskText.trim(),
          model: 'claude-3-opus'
        }),
      });
      
      if (response.ok) {
        setTaskText('');
        alert('Task submitted successfully!');
      }
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setLoading(false);
    }
  }, [taskText]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Ez Aigents Dashboard</h1>
          <p className="text-gray-400">Lightning-fast agent monitoring and task submission</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Active Agents" value={stats.activeAgents} icon={Zap} color="text-green-400" />
          <StatCard title="Total Tasks" value={stats.totalTasks} icon={Activity} color="text-blue-400" />
          <StatCard title="All Agents" value={stats.totalAgents} icon={Users} color="text-purple-400" />
          <StatCard title="Success Rate" value={`${stats.successRate}%`} icon={TrendingUp} color="text-yellow-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Status */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icons.Users className="w-5 h-5" />
              Agent Status
            </h2>
            <div className="space-y-3">
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </motion.div>

          {/* Task Submission */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icons.Database className="w-5 h-5" />
              Submit New Task
            </h2>
            <div className="space-y-4">
              <textarea
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="Enter your task description here..."
                className="w-full h-32 p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                onClick={handleSubmitTask}
                disabled={loading || !taskText.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Submit Task
                    <Icons.ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

const FastNavigationDashboard = () => {
  const [currentView, setCurrentView] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);

  const handleViewChange = useCallback((view) => {
    if (view === currentView) return;
    
    setIsLoading(true);
    setCurrentView(view);
    
    // Simulate loading time for heavy components
    setTimeout(() => setIsLoading(false), 300);
  }, [currentView]);

  const navigationItems = useMemo(() => [
    { 
      id: 'basic', 
      label: 'Basic Dashboard', 
      icon:Icons.Home, 
      description: 'Fast & Simple',
      color: 'from-blue-500 to-blue-700'
    },
    { 
      id: 'globe', 
      label: '3D Globe View', 
      icon:Icons.Globe, 
      description: 'Business Overview',
      color: 'from-emerald-500 to-emerald-700'
    },
    { 
      id: 'executive', 
      label: 'Executive Dashboard', 
      icon:Icons.BarChart3, 
      description: 'Advanced Analytics',
      color: 'from-purple-500 to-purple-700'
    }
  ], []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icons.Cpu className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold">Ez Aigents</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleViewChange(item.id)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 text-sm
                    ${currentView === item.id 
                      ? `bg-gradient-to-r ${item.color} text-white shadow-lg` 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className="bg-gray-800 rounded-lg p-6 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading view...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentView === 'basic' && <BasicDashboard />}
          
          {currentView === 'globe' && (
            <React.Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading 3D Globe...</p>
                </div>
              </div>
            }>
              <Globe3D />
            </React.Suspense>
          )}
          
          {currentView === 'executive' && (
            <React.Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading Executive Dashboard...</p>
                </div>
              </div>
            }>
              <ExecutiveDashboard />
            </React.Suspense>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FastNavigationDashboard;