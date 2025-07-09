'use client';

import React, { useState, Suspense, lazy, memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from 'react-error-boundary';
import { initializePerformance } from '../utils/performanceInit';
import { 
  BarChart3, 
  Zap, 
  Box, 
  GitCompare, 
  Trophy, 
  Settings,
  Moon,
  Sun,
  Sparkles,
  GitBranch,
  MessageCircle,
  Loader2,
  Activity
} from 'lucide-react';

// Lazy load components for better performance
const AgentDashboard = lazy(() => import('../AgentDashboard'));
const EnhancedAgentDashboard = lazy(() => import('../EnhancedAgentDashboard'));
const Agent3DWorkspace = lazy(() => import('../Agent3DWorkspace'));
const CodeDiffViewer = lazy(() => import('../CodeDiffViewer'));
const GameficationDashboard = lazy(() => import('../GameficationDashboard'));
const ProjectDashboard = lazy(() => import('../ProjectDashboard'));
const PromptManager = lazy(() => import('../PromptManager'));
const EnhancementDashboard = lazy(() => import('./EnhancementDashboard'));
const ChatDashboard = lazy(() => import('./ChatDashboard'));
const PerformanceDashboard = lazy(() => import('./PerformanceDashboard'));

// Loading component
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center h-96">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
));

// Error fallback component
const ErrorFallback = memo(({ error, resetErrorBoundary }) => (
  <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
    <div className="text-center">
      <div className="text-red-600 text-lg font-semibold mb-2">Something went wrong</div>
      <div className="text-red-500 text-sm mb-4">{error.message}</div>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  </div>
));

// Memoized tab button component
const TabButton = memo(({ tab, isActive, onClick, darkMode }) => {
  const Icon = tab.icon;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
        isActive
          ? darkMode
            ? 'bg-white/20 text-white shadow-lg'
            : 'bg-black/20 text-gray-900 shadow-lg'
          : darkMode
            ? 'text-gray-300 hover:text-white hover:bg-white/10'
            : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
      }`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{tab.name}</span>
      
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className={`absolute inset-0 rounded-md ${
            darkMode 
              ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' 
              : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10'
          }`}
          style={{ zIndex: -1 }}
        />
      )}
    </motion.button>
  );
});

const OptimizedMainDashboard = memo(() => {
  const [activeTab, setActiveTab] = useState('enhanced');
  const [darkMode, setDarkMode] = useState(true);

  // Initialize performance optimizations on mount
  useEffect(() => {
    initializePerformance();
  }, []);

  const tabs = [
    { id: 'project', name: 'Project Status', icon: GitBranch, component: ProjectDashboard },
    { id: 'enhanced', name: 'Enhanced Dashboard', icon: Sparkles, component: EnhancedAgentDashboard },
    { id: 'chat', name: 'Agent Chat', icon: MessageCircle, component: ChatDashboard },
    { id: 'performance', name: 'Performance', icon: Activity, component: PerformanceDashboard },
    { id: 'dashboard', name: 'Classic Dashboard', icon: BarChart3, component: AgentDashboard },
    { id: 'workspace', name: '3D Workspace', icon: Box, component: Agent3DWorkspace },
    { id: 'diffs', name: 'Code Diffs', icon: GitCompare, component: CodeDiffViewer },
    { id: 'gamification', name: 'Achievements', icon: Trophy, component: GameficationDashboard },
    { id: 'prompts', name: 'Prompt Manager', icon: Settings, component: PromptManager },
    { id: 'enhancements', name: 'Enhancements', icon: Zap, component: EnhancementDashboard }
  ];

  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`backdrop-blur-sm border-b transition-all duration-300 ${
          darkMode 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/20 border-black/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center space-x-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center"
                >
                  <Zap className="text-white" size={20} />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-500/30"
                />
              </div>
              <div>
                <h1 className={`text-2xl font-bold transition-colors ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  EzAugent Command Center
                </h1>
                <p className={`text-sm transition-colors ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Next-generation AI agent orchestration
                </p>
              </div>
            </motion.div>
            
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {/* Tab Navigation */}
              <div className={`flex rounded-lg p-1 transition-all ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm' 
                  : 'bg-black/10 backdrop-blur-sm'
              }`}>
                {tabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <main className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <ErrorBoundary
              FallbackComponent={ErrorFallback}
              onReset={() => window.location.reload()}
            >
              <Suspense fallback={<LoadingSpinner />}>
                {activeComponent && React.createElement(activeComponent)}
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: darkMode ? '#1F2937' : '#FFFFFF',
            color: darkMode ? '#FFFFFF' : '#1F2937',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
          }
        }}
      />

      {/* Background Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            background: darkMode 
              ? [
                  'radial-gradient(circle at 20% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 40% 60%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)'
                ]
              : [
                  'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)',
                  'radial-gradient(circle at 40% 60%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)'
                ]
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
});

OptimizedMainDashboard.displayName = 'OptimizedMainDashboard';

export default OptimizedMainDashboard;