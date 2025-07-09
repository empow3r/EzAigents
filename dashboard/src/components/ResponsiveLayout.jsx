'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Zap
} from 'lucide-react';

const ResponsiveLayout = ({ 
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

  // Detect screen size and update layout
  useEffect(() => {
    const updateScreenSize = () => {
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
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
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

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleTabClick = useCallback((tabId) => {
    onTabChange(tabId);
    // Close sidebar on mobile after tab selection
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [onTabChange, isMobile]);

  const getSidebarWidth = () => {
    if (screenWidth < 481) return '100vw';
    if (screenWidth < 769) return '320px';
    if (screenWidth < 1440) return '280px';
    return '320px';
  };

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
              width: getSidebarWidth(),
              boxShadow: (isMobile || isTablet) ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
            }}
          >
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } flex-shrink-0`}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="text-white" size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`font-semibold text-sm truncate ${
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

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="truncate">{tab.name}</span>
                  </button>
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
          marginLeft: sidebarOpen && !isMobile && !isTablet ? getSidebarWidth() : 0
        }}
      >
        {/* Header */}
        <header className={`sticky top-0 z-30 border-b backdrop-blur-sm ${
          darkMode 
            ? 'bg-gray-900/95 border-gray-700' 
            : 'bg-white/95 border-gray-200'
        } flex-shrink-0`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Menu Toggle Button */}
              <button
                onClick={toggleSidebar}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
              </button>

              {/* Current Page Title */}
              <h1 className={`text-xl font-semibold truncate ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {tabs.find(tab => tab.id === activeTab)?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={onToggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
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
};

export default ResponsiveLayout;