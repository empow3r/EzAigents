'use client';
import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import soundService from '../services/soundService';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Zap,
  Sparkles
} from 'lucide-react';

const ResponsiveLayout = memo(({ 
  children, 
  tabs = [], 
  activeTab, 
  onTabChange, 
  darkMode = false, 
  onToggleTheme 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [isTablet, setIsTablet] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const sidebarRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  // Optimized screen size detection with debouncing
  useEffect(() => {
    const updateScreenSize = () => {
      // Clear previous timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Debounce resize events
      resizeTimeoutRef.current = setTimeout(() => {
        const width = window.innerWidth;
        setScreenWidth(width);
        
        const mobile = width < 768;
        const tablet = width >= 768 && width < 1024;
        const desktop = width >= 1024;
        
        setIsMobile(mobile);
        setIsTablet(tablet);
        
        // Auto-open sidebar on desktop, close on mobile
        if (desktop && !sidebarOpen) {
          setSidebarOpen(true);
        } else if (mobile && sidebarOpen) {
          setSidebarOpen(false);
        }
      }, 100); // 100ms debounce
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize, { passive: true });
    return () => {
      window.removeEventListener('resize', updateScreenSize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [sidebarOpen]);

  // Close sidebar when clicking outside (mobile/tablet)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target) &&
        (isMobile || isTablet) &&
        sidebarOpen
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen, isMobile, isTablet]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // Cleanup sound service on unmount and page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      soundService.destroy();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup sound service when component unmounts
      soundService.stopCurrentEnvironment();
    };
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const newState = !prev;
      // Audio feedback for sidebar toggle
      soundService.play(newState ? 'buttonClick' : 'buttonHover');
      return newState;
    });
  }, []);

  const handleTabClick = useCallback((tabId) => {
    // Optimized audio feedback
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        soundService.play('tabSwitch');
      });
    } else {
      setTimeout(() => soundService.play('tabSwitch'), 0);
    }
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(10);
    }
    
    onTabChange(tabId);
    // Close sidebar on mobile after tab selection
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [onTabChange, isMobile]);

  // Memoize sidebar width calculation
  const sidebarWidth = useMemo(() => {
    if (screenWidth < 481) return '85vw';
    if (screenWidth < 769) return '280px';
    if (screenWidth < 1440) return '280px';
    return '320px';
  }, [screenWidth]);

  // Memoize visible tabs for performance
  const visibleTabs = useMemo(() => {
    return tabs.slice(0, 20); // Limit to 20 tabs for performance
  }, [tabs]);

  return (
    <div className={`flex h-screen overflow-hidden ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Overlay for mobile/tablet */}
      <AnimatePresence>
        {sidebarOpen && (isMobile || isTablet) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || (!isMobile && !isTablet)) && (
          <motion.aside
            ref={sidebarRef}
            initial={{ x: isMobile || isTablet ? '-100%' : 0 }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              mass: 1
            }}
            className={`fixed left-0 top-0 bottom-0 z-50 ${
              darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            } border-r shadow-lg lg:shadow-none flex flex-col`}
            style={{
              width: sidebarWidth,
              boxShadow: (isMobile || isTablet) ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between p-3 sm:p-4 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } flex-shrink-0`}>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="text-white" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`font-semibold text-base sm:text-sm truncate ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Ez Aigent
                  </h2>
                  <p className={`text-xs truncate ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Command Center
                  </p>
                </div>
              </div>
              
              {/* Close button - only show on mobile/tablet */}
              {(isMobile || isTablet) && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label="Close sidebar"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Navigation - Virtualized for performance */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    whileHover={{ 
                      scale: 1.02,
                      x: 4,
                      transition: { duration: 0.15 }
                    }}
                    whileTap={{ 
                      scale: 0.98,
                      transition: { duration: 0.1 }
                    }}
                    className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all relative ${
                      isActive
                        ? darkMode
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                        : darkMode
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <motion.div
                      animate={isActive ? { 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.1, 1]
                      } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                    </motion.div>
                    <span className="truncate text-sm sm:text-base">{tab.name}</span>
                    
                    {/* Active indicator with sparkle effect */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -right-1 -top-1"
                      >
                        <motion.div
                          animate={{ 
                            rotate: [0, 180, 360],
                            scale: [1, 1.2, 1]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Sparkles size={12} className="text-yellow-400" />
                        </motion.div>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className={`p-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } flex-shrink-0`}>
              <div className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                AI Agent Orchestration
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen && !isMobile && !isTablet ? 'ml-[280px]' : 'ml-0'
        }`}
        style={{
          marginLeft: sidebarOpen && !isMobile && !isTablet ? sidebarWidth : 0
        }}
      >
        {/* Header */}
        <header className={`sticky top-0 z-30 border-b backdrop-blur-sm ${
          darkMode 
            ? 'bg-gray-900/95 border-gray-700' 
            : 'bg-white/95 border-gray-200'
        } flex-shrink-0`}>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              {/* Menu Toggle Button */}
              <button
                onClick={toggleSidebar}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen && (isMobile || isTablet) ? <ChevronLeft size={20} /> : <Menu size={20} />}
              </button>

              {/* Current Page Title */}
              <h1 className={`text-base sm:text-xl font-semibold truncate ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {tabs.find(tab => tab.id === activeTab)?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Theme Toggle */}
              <motion.button
                onClick={() => {
                  if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => soundService.play('perfectClick'));
                  }
                  onToggleTheme();
                }}
                onMouseEnter={() => {
                  if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => soundService.play('buttonHover'));
                  }
                }}
                whileHover={{ 
                  scale: 1.1,
                  rotate: darkMode ? 0 : 180,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ 
                  scale: 0.9,
                  transition: { duration: 0.1 }
                }}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <motion.div
                  animate={{ 
                    rotate: darkMode ? [0, 15, -15, 0] : [0, -15, 15, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {darkMode ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
                </motion.div>
              </motion.button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
});

// Add display name for debugging
ResponsiveLayout.displayName = 'ResponsiveLayout';

export default ResponsiveLayout;