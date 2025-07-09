'use client';
import React, { useState, lazy, Suspense, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, ReducedMotion } from 'framer-motion';
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
  Loader2,
  Menu,
  X
} from 'lucide-react';

// Lazy load components with optimized loading
const AgentDashboard = lazy(() => import('./AgentDashboard'));
const EnhancedAgentDashboard = lazy(() => 
  import('./EnhancedAgentDashboard').catch(() => 
    import('./components/SimpleDashboard')
  )
);
const Agent3DWorkspace = lazy(() => 
  import('./Agent3DWorkspace').catch(() => 
    import('./components/Agent3DFallback')
  )
);
const CodeDiffViewer = lazy(() => import('./CodeDiffViewer'));
const GameficationDashboard = lazy(() => import('./GameficationDashboard'));
const ProjectDashboard = lazy(() => import('./ProjectDashboard'));
const PromptManager = lazy(() => import('./PromptManager'));
const EnhancementDashboard = lazy(() => import('./components/EnhancementDashboard'));
const EnhancementCommandCenter = lazy(() => import('./components/EnhancementCommandCenter'));
const ChatDashboard = lazy(() => import('./components/ChatDashboard'));

// Lightweight loading component
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center h-64">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
    />
  </div>
));

// Performance-optimized error boundary
class PerformanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to performance monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Component Error</h2>
            <p className="text-sm text-gray-600 mb-4">
              A component failed to load. Please try refreshing.
            </p>
            <button 
              onClick={() => this.setState({ hasError: false, errorInfo: null })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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

// Performance-optimized tab component
const TabButton = React.memo(({ tab, isActive, onClick, darkMode, isMobile }) => {
  const Icon = tab.icon;
  
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 whitespace-nowrap ${
        isActive
          ? darkMode
            ? 'bg-white/20 text-white shadow-lg'
            : 'bg-black/20 text-gray-900 shadow-lg'
          : darkMode
            ? 'text-gray-300 hover:text-white hover:bg-white/10'
            : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
      }`}
      aria-label={tab.name}
    >
      <Icon size={16} />
      {!isMobile && <span className="hidden sm:inline">{tab.name}</span>}
    </button>
  );
});

export default function PerformanceDashboard() {
  const [activeTab, setActiveTab] = useState('command');
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for theme preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Detect mobile and motion preferences
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const checkMotionPreference = () => {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };

    checkMobile();
    checkMotionPreference();
    
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Memoize tabs configuration
  const tabs = useMemo(() => [
    { 
      id: 'command', 
      name: 'Command Center', 
      icon: Zap, 
      component: EnhancementCommandCenter,
      priority: 'high'
    },
    { 
      id: 'project', 
      name: 'Project Status', 
      icon: GitBranch, 
      component: ProjectDashboard,
      priority: 'high'
    },
    { 
      id: 'enhanced', 
      name: 'Enhanced Dashboard', 
      icon: Sparkles, 
      component: EnhancedAgentDashboard,
      priority: 'medium'
    },
    { 
      id: 'chat', 
      name: 'Agent Chat', 
      icon: MessageCircle, 
      component: ChatDashboard,
      priority: 'high'
    },
    { 
      id: 'dashboard', 
      name: 'Classic Dashboard', 
      icon: BarChart3, 
      component: AgentDashboard,
      priority: 'high'
    },
    { 
      id: 'workspace', 
      name: '3D Workspace', 
      icon: Box, 
      component: Agent3DWorkspace,
      priority: 'low' // Heavy component - load last
    },
    { 
      id: 'diffs', 
      name: 'Code Diffs', 
      icon: GitCompare, 
      component: CodeDiffViewer,
      priority: 'medium'
    },
    { 
      id: 'gamification', 
      name: 'Achievements', 
      icon: Trophy, 
      component: GameficationDashboard,
      priority: 'low'
    },
    { 
      id: 'prompts', 
      name: 'Prompt Manager', 
      icon: Settings, 
      component: PromptManager,
      priority: 'medium'
    },
    { 
      id: 'enhancements', 
      name: 'Enhancements', 
      icon: Settings, 
      component: EnhancementDashboard,
      priority: 'medium'
    }
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
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // Reduced motion variants
  const motionVariants = useMemo(() => {
    if (reduceMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      };
    }
    return {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 }
    };
  }, [reduceMotion]);

  // High priority tabs (load immediately)
  const highPriorityTabs = tabs.filter(tab => tab.priority === 'high');
  const otherTabs = tabs.filter(tab => tab.priority !== 'high');

  return (
    <ReducedMotion>
      <div className={`min-h-screen transition-colors duration-300 ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900' 
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        {/* Optimized Header */}
        <header className={`backdrop-blur-sm border-b transition-colors duration-300 sticky top-0 z-50 ${
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

                {/* Mobile Menu Toggle */}
                {isMobile && (
                  <button
                    onClick={toggleMobileMenu}
                    className={`p-2 rounded-lg transition-all md:hidden ${
                      darkMode 
                        ? 'bg-white/10 text-white hover:bg-white/20' 
                        : 'bg-black/10 text-gray-900 hover:bg-black/20'
                    }`}
                    aria-label="Toggle menu"
                  >
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                  </button>
                )}

                {/* Desktop Tab Navigation */}
                {!isMobile && (
                  <div className={`flex rounded-lg p-1 transition-all overflow-x-auto ${
                    darkMode 
                      ? 'bg-white/10 backdrop-blur-sm' 
                      : 'bg-black/10 backdrop-blur-sm'
                  }`}>
                    {tabs.map((tab) => (
                      <TabButton
                        key={tab.id}
                        tab={tab}
                        isActive={activeTab === tab.id}
                        onClick={handleTabChange}
                        darkMode={darkMode}
                        isMobile={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu */}
            {isMobile && (
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`overflow-hidden border-t ${
                      darkMode ? 'border-white/10' : 'border-black/10'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-2 p-4">
                      {tabs.map((tab) => (
                        <TabButton
                          key={tab.id}
                          tab={tab}
                          isActive={activeTab === tab.id}
                          onClick={handleTabChange}
                          darkMode={darkMode}
                          isMobile={true}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </header>
        
        {/* Main Content with Error Boundary */}
        <main className="relative">
          <PerformanceErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={motionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                className="w-full"
              >
                <Suspense fallback={<LoadingSpinner />}>
                  {activeComponent && React.createElement(activeComponent)}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </PerformanceErrorBoundary>
        </main>

        {/* Optimized Toast Notifications */}
        <Toaster
          position={isMobile ? "top-center" : "bottom-right"}
          toastOptions={{
            duration: 3000,
            style: {
              background: darkMode ? '#1F2937' : '#FFFFFF',
              color: darkMode ? '#FFFFFF' : '#1F2937',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '12px 16px',
              maxWidth: isMobile ? '90vw' : '400px'
            }
          }}
        />
      </div>
    </ReducedMotion>
  );
}