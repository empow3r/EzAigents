'use client';
import React, { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import ResponsiveLayout from './components/ResponsiveLayout';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';

// Lazy load components for better performance with error handling
const lazyWithRetry = (componentImport) => lazy(() => 
  componentImport().catch((error) => {
    console.error('Component loading error:', error);
    // Retry once after a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        componentImport()
          .then(resolve)
          .catch(() => {
            // If retry fails, return a fallback component
            resolve({ default: () => <div className="p-6 text-center">Component failed to load. Please refresh the page.</div> });
          });
      }, 1000);
    });
  })
);

const AgentDashboard = lazyWithRetry(() => import('./AgentDashboard'));
const EnhancedAgentDashboard = lazyWithRetry(() => import('./EnhancedAgentDashboard'));
const Agent3DWorkspace = lazyWithRetry(() => 
  import('./Agent3DWorkspaceFixed').catch((error) => {
    console.warn('3D Workspace failed to load, using fallback:', error);
    return import('./components/Agent3DFallback').then(module => ({ default: module.default }));
  })
);
const CodeDiffViewer = lazyWithRetry(() => import('./CodeDiffViewer'));
const GameficationDashboard = lazyWithRetry(() => 
  import('./GameficationDashboard').catch((error) => {
    console.warn('GameficationDashboard failed to load, using fallback:', error);
    return import('./components/GameficationFallback').then(module => ({ default: module.default }));
  })
);
const ProjectDashboard = lazyWithRetry(() => import('./ProjectDashboard'));
const PromptManager = lazyWithRetry(() => import('./PromptManager'));
const EnhancementDashboard = lazyWithRetry(() => import('./components/EnhancementDashboard'));
const EnhancementCommandCenter = lazyWithRetry(() => import('./components/EnhancementCommandCenter'));
const ChatDashboard = lazyWithRetry(() => import('./components/ChatDashboard'));
const TTSManager = lazyWithRetry(() => import('./components/TTSManager').catch(() => ({ default: () => import('./components/TTSManagerFallback') })));
import { Button } from '@/components/ui/button';
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
  Volume2
} from 'lucide-react';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('command');
  const [darkMode, setDarkMode] = useState(true);

  const tabs = [
    { id: 'command', name: 'Command Center', icon: Zap, component: EnhancementCommandCenter },
    { id: 'project', name: 'Project Status', icon: GitBranch, component: ProjectDashboard },
    { id: 'enhanced', name: 'Enhanced Dashboard', icon: Sparkles, component: EnhancedAgentDashboard },
    { id: 'chat', name: 'Agent Chat', icon: MessageCircle, component: ChatDashboard },
    { id: 'tts', name: 'Text-to-Speech', icon: Volume2, component: TTSManager },
    { id: 'dashboard', name: 'Classic Dashboard', icon: BarChart3, component: AgentDashboard },
    { id: 'workspace', name: '3D Workspace', icon: Box, component: Agent3DWorkspace },
    { id: 'diffs', name: 'Code Diffs', icon: GitCompare, component: CodeDiffViewer },
    { id: 'gamification', name: 'Achievements', icon: Trophy, component: GameficationDashboard },
    { id: 'prompts', name: 'Prompt Manager', icon: Settings, component: PromptManager },
    { id: 'enhancements', name: 'Enhancements', icon: Settings, component: EnhancementDashboard }
  ];

  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <ResponsiveLayout 
      tabs={tabs}
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode(!darkMode)}
    >
      <div className={`min-h-screen transition-all duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
      {/* Futuristic Header - Hidden on mobile as ResponsiveLayout handles navigation */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`hidden lg:block backdrop-blur-sm border-b transition-all duration-300 ${
          darkMode 
            ? 'bg-black/20 border-white/10' 
            : 'bg-white/20 border-black/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-4">
            <motion.div 
              className="flex items-center space-x-2 sm:space-x-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <motion.img
                  src={darkMode ? "/logo.svg" : "/logo-light.svg"}
                  alt="Ez Aigent Logo"
                  className="h-8 sm:h-10 w-auto"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -inset-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm"
                />
              </div>
              <div>
                <h1 className={`text-lg sm:text-2xl font-bold transition-colors ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Command Center
                </h1>
                <p className={`hidden sm:block text-sm transition-colors ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Next-generation AI agent orchestration
                </p>
              </div>
            </motion.div>
            
            <div className="flex items-center space-x-2">
              {/* Theme Toggle - Hidden on small screens as ResponsiveLayout handles it */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`hidden sm:block p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </motion.button>

              {/* Tab Navigation - Desktop only */}
              <div className={`hidden xl:flex rounded-lg p-1 transition-all ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm' 
                  : 'bg-black/10 backdrop-blur-sm'
              }`}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                        activeTab === tab.id
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
                      
                      {activeTab === tab.id && (
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
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Main Content */}
      <main className="relative overflow-hidden px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[1920px] mx-auto"
          >
            <ChunkErrorBoundary darkMode={darkMode}>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] lg:min-h-[600px]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 sm:border-3 border-blue-500 border-t-transparent rounded-full"
                  />
                </div>
              }>
                {activeComponent && React.createElement(activeComponent, { darkMode })}
              </Suspense>
            </ChunkErrorBoundary>
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

      {/* Background Animation - Subtle ambient effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          className={`absolute inset-0 ${
            darkMode 
              ? 'bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-pink-900/10'
              : 'bg-gradient-to-br from-blue-100/20 via-purple-100/20 to-pink-100/20'
          }`}
          animate={{
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        />
      </div>
      </div>
    </ResponsiveLayout>
  );
}