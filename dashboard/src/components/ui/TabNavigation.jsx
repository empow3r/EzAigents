'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const TabNavigation = ({ 
  tabs, 
  activeTab, 
  onTabChange,
  darkMode = true,
  orientation = 'horizontal',
  size = 'md',
  showIcons = true,
  showLabels = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const orientationClasses = {
    horizontal: 'flex flex-row',
    vertical: 'flex flex-col'
  };

  return (
    <div 
      className={cn(
        'rounded-lg p-1 transition-all',
        darkMode ? 'bg-white/10 backdrop-blur-sm' : 'bg-black/10 backdrop-blur-sm',
        orientationClasses[orientation],
        className
      )}
    >
      <AnimatePresence>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'relative rounded-md font-medium transition-all flex items-center',
                orientation === 'horizontal' ? 'space-x-2' : 'space-x-2 w-full',
                sizeClasses[size],
                isActive
                  ? darkMode
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'bg-black/20 text-gray-900 shadow-lg'
                  : darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-white/10'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
              )}
            >
              {showIcons && Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
              {showLabels && (
                <span className={cn(
                  'transition-all',
                  !showIcons && 'ml-0',
                  orientation === 'horizontal' && 'hidden sm:inline'
                )}>
                  {tab.name}
                </span>
              )}
              
              {isActive && (
                <motion.div
                  layoutId={`activeTab-${orientation}`}
                  className={cn(
                    'absolute inset-0 rounded-md -z-10',
                    darkMode 
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20' 
                      : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10'
                  )}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default TabNavigation;