'use client';
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

const MobileNavigation = memo(({ 
  activeTab, 
  onTabChange, 
  darkMode = false,
  tabs = []
}) => {
  // Priority tabs for mobile bottom navigation
  const mobilePriorityTabs = [
    { id: 'command', icon:Icons.Zap, label: 'Command' },
    { id: 'dashboard', icon:Icons.BarChart3, label: 'Dashboard' },
    { id: 'enhanced', icon:Icons.Brain, label: 'Enhanced' },
    { id: 'chat', icon:Icons.MessageCircle, label: 'Chat' },
    { id: 'settings', icon:Icons.Settings, label: 'More' }
  ];

  const handleTabClick = (tabId) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tabId);
  };

  return (
    <nav className={`
      fixed bottom-0 left-0 right-0 z-50 
      border-t backdrop-blur-md
      ${darkMode 
        ? 'bg-gray-900/95 border-gray-700' 
        : 'bg-white/95 border-gray-200'
      }
      md:hidden
    `}>
      <div className="flex items-center justify-around px-2 py-1">
        {mobilePriorityTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              whileTap={{ scale: 0.9 }}
              className={`
                flex flex-col items-center justify-center
                min-h-[60px] px-2 py-1 rounded-lg
                transition-all duration-200
                ${isActive
                  ? darkMode
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-blue-600 bg-blue-50'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <motion.div
                animate={isActive ? { 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 0.3 }}
                className="mb-1"
              >
                <Icon size={20} />
              </motion.div>
              
              <span className={`
                text-xs font-medium
                ${isActive ? 'opacity-100' : 'opacity-70'}
              `}>
                {tab.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="mobileDot"
                  className={`
                    w-1 h-1 rounded-full mt-1
                    ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}
                  `}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Safe area spacing for devices with home indicator */}
      <div className="h-safe-bottom" />
    </nav>
  );
});

MobileNavigation.displayName = 'MobileNavigation';

export default MobileNavigation;