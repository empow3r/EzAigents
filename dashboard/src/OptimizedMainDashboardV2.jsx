'use client';
import React, { useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, useTheme } from './components/ui/hooks/useTheme';
import { 
  LoadingSpinner, 
  AnimatedCard, 
  TabNavigation, 
  ThemeToggle,
  animations 
} from './components/ui';
import ResponsiveLayout from './components/ResponsiveLayout';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';
import { 
  BarChart3, Zap, Box, GitCompare, Trophy, Settings,
  Sparkles, GitBranch, MessageCircle, Volume2
} from 'lucide-react';

// Lazy load components with retry mechanism
const lazyWithRetry = (componentImport) => lazy(() => 
  componentImport().catch((error) => {
    console.error('Component loading error:', error);
    return new Promise((resolve) => {
      setTimeout(() => {
        componentImport()
          .then(resolve)
          .catch(() => {
            resolve({ 
              default: () => (
                <AnimatedCard className="text-center p-8">
                  <p className="text-gray-500">Component failed to load. Please refresh the page.</p>
                </AnimatedCard>
              )
            });
          });
      }, 1000);
    });
  })
);

// Lazy load dashboard components
const components = {
  command: lazyWithRetry(() => import('./components/EnhancementCommandCenter')),
  project: lazyWithRetry(() => import('./ProjectDashboard')),
  enhanced: lazyWithRetry(() => import('./EnhancedAgentDashboard')),
  chat: lazyWithRetry(() => import('./components/ChatDashboard')),
  tts: lazyWithRetry(() => import('./components/TTSManager')),
  dashboard: lazyWithRetry(() => import('./AgentDashboard')),
  workspace: lazyWithRetry(() => import('./Agent3DWorkspace')),
  diffs: lazyWithRetry(() => import('./CodeDiffViewer')),
  gamification: lazyWithRetry(() => import('./GameficationDashboard')),
  prompts: lazyWithRetry(() => import('./PromptManager')),
  enhancements: lazyWithRetry(() => import('./components/EnhancementDashboard'))
};

// Tab configuration
const tabConfig = [
  { id: 'command', name: 'Command Center', icon: Zap },
  { id: 'project', name: 'Project Status', icon: GitBranch },
  { id: 'enhanced', name: 'Enhanced Dashboard', icon: Sparkles },
  { id: 'chat', name: 'Agent Chat', icon: MessageCircle },
  { id: 'tts', name: 'Text-to-Speech', icon: Volume2 },
  { id: 'dashboard', name: 'Classic Dashboard', icon: BarChart3 },
  { id: 'workspace', name: '3D Workspace', icon: Box },
  { id: 'diffs', name: 'Code Diffs', icon: GitCompare },
  { id: 'gamification', name: 'Achievements', icon: Trophy },
  { id: 'prompts', name: 'Prompt Manager', icon: Settings },
  { id: 'enhancements', name: 'Enhancements', icon: Settings }
];

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('command');
  const { darkMode } = useTheme();
  
  // Memoize active component
  const ActiveComponent = useMemo(() => 
    components[activeTab] || components.command,
    [activeTab]
  );

  // Memoize gradient classes
  const gradientClasses = useMemo(() => 
    darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
      : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
    [darkMode]
  );

  // Memoize header classes
  const headerClasses = useMemo(() => 
    darkMode 
      ? 'bg-black/20 border-white/10' 
      : 'bg-white/20 border-black/10',
    [darkMode]
  );

  // Callbacks
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  return (
    <ResponsiveLayout currentPage={activeTab} onPageChange={handleTabChange}>
      <div className={`min-h-screen transition-all duration-300 ${gradientClasses}`}>
        {/* Header */}
        <motion.header 
          {...animations.fadeUp}
          className={`backdrop-blur-sm border-b transition-all duration-300 ${headerClasses}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Logo and Title */}
              <motion.div 
                className="flex items-center space-x-4"
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute -inset-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-sm"
                  />
                  <img
                    src={darkMode ? "/logo.svg" : "/logo-light.svg"}
                    alt="Ez Aigent Logo"
                    className="h-10 w-auto relative"
                  />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold transition-colors ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Command Center
                  </h1>
                  <p className={`text-sm transition-colors ${
                    darkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Next-generation AI agent orchestration
                  </p>
                </div>
              </motion.div>
              
              {/* Controls */}
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <TabNavigation 
                  tabs={tabConfig}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  darkMode={darkMode}
                  showLabels={true}
                  className="hidden sm:flex"
                />
              </div>
            </div>
            
            {/* Mobile tab navigation */}
            <div className="sm:hidden pb-4">
              <TabNavigation 
                tabs={tabConfig}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                darkMode={darkMode}
                orientation="horizontal"
                size="sm"
                showLabels={false}
              />
            </div>
          </div>
        </motion.header>
        
        {/* Main Content */}
        <main className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              {...animations.slideRight}
              className="w-full"
            >
              <ChunkErrorBoundary darkMode={darkMode}>
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[600px]">
                    <LoadingSpinner size="lg" color="primary" text="Loading dashboard..." />
                  </div>
                }>
                  <ActiveComponent darkMode={darkMode} />
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

        {/* Background Animation */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            {...animations.gradientAnimation}
            className="absolute inset-0"
          />
        </div>
      </div>
    </ResponsiveLayout>
  );
}

// Main component with theme provider
export default function OptimizedMainDashboard() {
  return (
    <ThemeProvider defaultTheme="dark">
      <DashboardContent />
    </ThemeProvider>
  );
}