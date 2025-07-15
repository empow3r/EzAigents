'use client';
import React, { useState, lazy, Suspense, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import * as Icons from 'lucide-react';
import ResponsiveLayout from './components/ResponsiveLayout';

// Lazy load components
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
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
));

// Sidebar component
const Sidebar = React.memo(({ 
  isOpen, 
  onClose, 
  tabs, 
  activeTab, 
  onTabChange, 
  darkMode, 
  isMobile 
}) => {
  const sidebarVariants = {
    open: { 
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    closed: { 
      x: '-100%',
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    }
  };

  const overlayVariants = {
    open: { opacity: 1, visibility: 'visible' },
    closed: { opacity: 0, visibility: 'hidden' }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && (
        <motion.div
          variants={overlayVariants}
          initial="closed"
          animate={isOpen ? "open" : "closed"}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.div
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        className={`fixed left-0 top-0 bottom-0 z-50 w-64 ${
          darkMode 
            ? 'bg-gray-900 border-gray-700' 
            : 'bg-white border-gray-200'
        } border-r shadow-lg lg:shadow-none`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <Icons.Zap className="text-white" size={16} />
            </div>
            <div>
              <h2 className={`font-semibold text-sm ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Ez Aigent
              </h2>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Command Center
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  if (isMobile) onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                    : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            AI Agent Orchestration
          </div>
        </div>
      </motion.div>
    </>
  );
});

export default function MobileFirstDashboard() {
  const [activeTab, setActiveTab] = useState('command');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      // Auto-close sidebar on mobile, auto-open on desktop
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [sidebarOpen]);

  // Tabs configuration
  const tabs = useMemo(() => [
    { id: 'command', name: 'Command Center', icon:Icons.Zap, component: EnhancementCommandCenter },
    { id: 'project', name: 'Project Status', icon:Icons.GitBranch, component: ProjectDashboard },
    { id: 'enhanced', name: 'Enhanced Dashboard', icon:Icons.Sparkles, component: EnhancedAgentDashboard },
    { id: 'chat', name: 'Agent Chat', icon:Icons.MessageCircle, component: ChatDashboard },
    { id: 'dashboard', name: 'Classic Dashboard', icon:Icons.BarChart3, component: AgentDashboard },
    { id: 'workspace', name: '3D Workspace', icon:Icons.Box, component: Agent3DWorkspace },
    { id: 'diffs', name: 'Code Diffs', icon:Icons.GitCompare, component: CodeDiffViewer },
    { id: 'gamification', name: 'Achievements', icon:Icons.Trophy, component: GameficationDashboard },
    { id: 'prompts', name: 'Prompt Manager', icon:Icons.Settings, component: PromptManager },
    { id: 'enhancements', name: 'Enhancements', icon:Icons.Settings, component: EnhancementDashboard }
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

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  return (
    <ResponsiveLayout
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      darkMode={darkMode}
      onToggleTheme={toggleTheme}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full"
        >
          <Suspense fallback={<LoadingSpinner />}>
            {activeComponent && React.createElement(activeComponent)}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: darkMode ? '#374151' : '#FFFFFF',
            color: darkMode ? '#FFFFFF' : '#374151',
            border: darkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '12px 16px'
          }
        }}
      />
    </ResponsiveLayout>
  );
}