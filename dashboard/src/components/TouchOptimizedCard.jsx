import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

export default function TouchOptimizedCard({ 
  children, 
  title, 
  subtitle, 
  icon: Icon,
  onTap,
  onLongPress,
  actions = [],
  className = '',
  isMobile = false,
  ...props 
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (onTap) onTap();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
      setShowActions(true);
    }
  };

  return (
    <motion.div
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        ${isMobile ? 'min-h-[44px] p-3' : 'p-4'}
        ${onTap ? 'cursor-pointer select-none' : ''}
        ${isPressed ? 'bg-gray-50 dark:bg-gray-750' : ''}
        ${className}
      `}
      whileTap={isMobile ? { scale: 0.98 } : {}}
      whileHover={!isMobile ? { scale: 1.02 } : {}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        if (isMobile) {
          e.preventDefault();
          handleLongPress();
        }
      }}
      {...props}
    >
      {/* Header Section */}
      {(title || Icon) && (
        <div className={`flex items-center justify-between ${children ? 'mb-3' : ''}`}>
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {Icon && (
              <div className={`flex-shrink-0 ${isMobile ? 'p-1' : 'p-2'} bg-blue-100 dark:bg-blue-900 rounded-lg`}>
                <Icon className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-blue-600 dark:text-blue-400`} />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`font-semibold text-gray-900 dark:text-white truncate ${
                  isMobile ? 'text-sm' : 'text-base'
                }`}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={`text-gray-600 dark:text-gray-400 truncate ${
                  isMobile ? 'text-xs' : 'text-sm'
                }`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex items-center space-x-2">
            {actions.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActions(!showActions);
                }}
                className={`${isMobile ? 'p-2' : 'p-1'} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
              >
                <Icons.MoreVertical className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-gray-500`} />
              </button>
            )}
            
            {onTap && (
              <Icons.ChevronRight className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'} text-gray-400`} />
            )}
          </div>
        </div>
      )}
      
      {/* Content Section */}
      {children && (
        <div className={isMobile ? 'text-sm' : ''}>
          {children}
        </div>
      )}
      
      {/* Actions Menu */}
      {showActions && actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[150px] z-50"
        >
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onTap();
                setShowActions(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 first:rounded-t-lg last:rounded-b-lg"
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              <span>{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}
      
      {/* Touch Feedback Overlay */}
      {isPressed && isMobile && (
        <div className="absolute inset-0 bg-gray-900/5 dark:bg-white/5 rounded-lg pointer-events-none" />
      )}
    </motion.div>
  );
}