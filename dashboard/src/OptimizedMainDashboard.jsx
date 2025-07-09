'use client';
import React, { useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
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
  Loader2
} from 'lucide-react';

// Lazy load components for better performance
const AgentDashboard = lazy(() => import('./AgentDashboard'));
const EnhancedAgentDashboard = lazy(() => import('./EnhancedAgentDashboard'));
const Agent3DWorkspace = lazy(() => import('./Agent3DWorkspace'));
const CodeDiffViewer = lazy(() => import('./CodeDiffViewer'));
const GameficationDashboard = lazy(() => import('./GameficationDashboard'));
const ProjectDashboard = lazy(() => import('./ProjectDashboard'));
const PromptManager = lazy(() => import('./PromptManager'));
const EnhancementDashboard = lazy(() => import('./components/EnhancementDashboard'));
const EnhancementCommandCenter = lazy(() => import('./components/EnhancementCommandCenter'));
const ChatDashboard = lazy(() => import('./components/ChatDashboard'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
    />
  </div>
);

// Error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function OptimizedMainDashboard() {
  const [activeTab, setActiveTab] = useState('command');
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for theme preference
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ?? true;
    }
    return true;
  });

  // Memoize tabs configuration
  const tabs = useMemo(() => [
    { id: 'command', name: 'Command Center', icon: Zap, component: EnhancementCommandCenter },
    { id: 'project', name: 'Project Status', icon: GitBranch, component: ProjectDashboard },
    { id: 'enhanced', name: 'Enhanced Dashboard', icon: Sparkles, component: EnhancedAgentDashboard },
    { id: 'chat', name: 'Agent Chat', icon: MessageCircle, component: ChatDashboard },
    { id: 'dashboard', name: 'Classic Dashboard', icon: BarChart3, component: AgentDashboard },
    { id: 'workspace', name: '3D Workspace', icon: Box, component: Agent3DWorkspace },
    { id: 'diffs', name: 'Code Diffs', icon: GitCompare, component: CodeDiffViewer },
    { id: 'gamification', name: 'Achievements', icon: Trophy, component: GameficationDashboard },
    { id: 'prompts', name: 'Prompt Manager', icon: Settings, component: PromptManager },
    { id: 'enhancements', name: 'Enhancements', icon: Settings, component: EnhancementDashboard }
  ], []);

  const activeComponent = useMemo(() => 
    tabs.find(tab => tab.id === activeTab)?.component,
    [tabs, activeTab]
  );

  const toggleTheme = useCallback(() => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    }
  }, [darkMode]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  // Reduced motion for better performance
  const motionVariants = useMemo(() => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }), []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Optimized Header */}
      <header className={`backdrop-blur-sm border-b transition-colors duration-300 ${
        darkMode 
          ? 'bg-black/20 border-white/10' 
          : 'bg-white/20 border-black/10'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Zap className="text-white" size={20} />
                </div>
              </div>
              <div>
                <h1 className={`text-2xl font-bold transition-colors ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Ez Aigent Command Center
                </h1>
                <p className={`text-sm transition-colors ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Next-generation AI agent orchestration
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
                }`}
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Tab Navigation - Mobile optimized */}
              <div className={`flex rounded-lg p-1 transition-all overflow-x-auto ${
                darkMode 
                  ? 'bg-white/10 backdrop-blur-sm' 
                  : 'bg-black/10 backdrop-blur-sm'
              }`}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${
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
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content with Error Boundary */}
      <main className="relative">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={motionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <Suspense fallback={<LoadingSpinner />}>
                {activeComponent && React.createElement(activeComponent)}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Optimized Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: darkMode ? '#1F2937' : '#FFFFFF',
            color: darkMode ? '#FFFFFF' : '#1F2937',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '12px 16px'
          }
        }}
      />
    </div>
  );
}