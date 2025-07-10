'use client';
import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  fullScreen = false,
  text = '',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const colorClasses = {
    primary: 'border-blue-500',
    secondary: 'border-purple-500',
    success: 'border-green-500',
    warning: 'border-yellow-500',
    danger: 'border-red-500',
    white: 'border-white'
  };

  const spinner = (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[color]} 
        border-3 border-t-transparent rounded-full
        ${className}
      `}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center space-y-4">
          {spinner}
          {text && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white text-sm font-medium"
            >
              {text}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {spinner}
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;