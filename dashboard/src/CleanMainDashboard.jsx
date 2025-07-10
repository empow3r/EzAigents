'use client';
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import CompactHeader from './components/CompactHeader';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';
import soundService from './services/soundService';

// Lazy load components with improved error handling
const lazyWithRetry = (componentImport, componentName = 'Component') => lazy(() => 
  componentImport().catch((error) => {
    console.error(`${componentName} loading error:`, error);
    
    // Try immediate retry
    return componentImport().catch(() => {
      // If immediate retry fails, wait and try once more
      return new Promise((resolve) => {
        setTimeout(() => {
          componentImport()
            .then(resolve)
            .catch((finalError) => {
              console.error(`${componentName} final loading attempt failed:`, finalError);
              resolve({ 
                default: ({ darkMode = true }) => (
                  <div className={`flex items-center justify-center min-h-[400px] p-8 ${
                    darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
                  }`}>
                    <div className="text-center max-w-md">
                      <div className="text-6xl mb-4">⚠️</div>
                      <h3 className={`text-lg font-semibold mb-2 ${
                        darkMode ? 'text-gray-200' : 'text-gray-700'
                      }`}>
                        {componentName} failed to load
                      </h3>
                      <p className={`text-sm mb-4 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        There was an issue loading this dashboard component. This may be due to a network issue or outdated cache.
                      </p>
                      <div className="space-y-2">
                        <button 
                          onClick={() => window.location.reload()}
                          className="block w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Refresh Page
                        </button>
                        <button 
                          onClick={() => {
                            if ('caches' in window) {
                              caches.keys().then(names => {
                                names.forEach(name => caches.delete(name));
                              }).then(() => window.location.reload());
                            } else {
                              window.location.reload();
                            }
                          }}
                          className={`block w-full px-4 py-2 rounded-lg transition-colors ${
                            darkMode 
                              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Clear Cache & Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                ) 
              });
            });
        }, 1000);
      });
    });
  })
);

// Lazy load all dashboard components with descriptive names
const EnhancementCommandCenter = lazyWithRetry(() => import('./components/EnhancementCommandCenter'), 'Enhancement Command Center');
const ProjectDashboard = lazyWithRetry(() => import('./ProjectDashboard'), 'Project Dashboard');
const EnhancedAgentDashboard = lazyWithRetry(() => import('./EnhancedAgentDashboard'), 'Enhanced Agent Dashboard');
const ChatDashboard = lazyWithRetry(() => import('./components/ChatDashboard'), 'Chat Dashboard');
const TTSManager = lazyWithRetry(() => import('./components/TTSManager'), 'Text-to-Speech Manager');
const AgentDashboard = lazyWithRetry(() => import('./AgentDashboard'), 'Agent Dashboard');
const Agent3DWorkspace = lazyWithRetry(() => import('./Agent3DWorkspace'), '3D Workspace');
const CodeDiffViewer = lazyWithRetry(() => import('./CodeDiffViewer'), 'Code Diff Viewer');
const GameficationDashboard = lazyWithRetry(() => import('./GameficationDashboard'), 'Gamification Dashboard');
const PromptManager = lazyWithRetry(() => import('./PromptManager'), 'Prompt Manager');
const EnhancementDashboard = lazyWithRetry(() => import('./components/EnhancementDashboard'), 'Enhancement Dashboard');

// Component mapping
const components = {
  command: EnhancementCommandCenter,
  project: ProjectDashboard,
  enhanced: EnhancedAgentDashboard,
  chat: ChatDashboard,
  tts: TTSManager,
  dashboard: AgentDashboard,
  workspace: Agent3DWorkspace,
  diffs: CodeDiffViewer,
  gamification: GameficationDashboard,
  prompts: PromptManager,
  enhancements: EnhancementDashboard
};

export default function CleanMainDashboard() {
  const [activeTab, setActiveTab] = useState('command');
  const [darkMode, setDarkMode] = useState(true);

  // Add scroll sound effect
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        soundService.play('scroll');
      }, 100); // Throttle scroll sounds
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const ActiveComponent = components[activeTab] || components.command;

  // Safety check to ensure component exists
  const renderActiveComponent = () => {
    try {
      return <ActiveComponent darkMode={darkMode} />;
    } catch (error) {
      console.error('Error rendering active component:', error);
      return (
        <div className={`flex items-center justify-center min-h-[400px] p-8 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}>
          <div className="text-center">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Component Error
            </h3>
            <p className={`text-sm mb-4 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              There was an error rendering this component. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Single Compact Header */}
      <CompactHeader 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />
      
      {/* Main Content Area */}
      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3,
              ease: [0.4, 0.0, 0.2, 1]
            }}
            className="w-full"
          >
            <ChunkErrorBoundary darkMode={darkMode}>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[500px]">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className={`w-12 h-12 border-3 border-t-transparent rounded-full mx-auto mb-4 ${
                        darkMode ? 'border-blue-400' : 'border-blue-500'
                      }`}
                    />
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className={`text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      Loading dashboard...
                    </motion.p>
                  </div>
                </div>
              }>
                {renderActiveComponent()}
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

      {/* Subtle Background Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{
            background: darkMode 
              ? [
                  'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 40% 60%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)'
                ]
              : [
                  'radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)',
                  'radial-gradient(circle at 40% 60%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)'
                ]
          }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}