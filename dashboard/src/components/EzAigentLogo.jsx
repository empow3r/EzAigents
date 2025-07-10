'use client';
import React from 'react';
import { motion } from 'framer-motion';

const EzAigentLogo = ({ size = 'md', animated = true, className = '' }) => {
  const sizes = {
    sm: { container: 'w-8 h-8', text: 'text-sm', icon: 20 },
    md: { container: 'w-10 h-10', text: 'text-base', icon: 24 },
    lg: { container: 'w-12 h-12', text: 'text-lg', icon: 28 },
    xl: { container: 'w-16 h-16', text: 'text-xl', icon: 32 }
  };

  const currentSize = sizes[size];

  const LogoIcon = () => (
    <div className={`relative ${currentSize.container} ${className}`}>
      {/* Main logo circle */}
      <motion.div
        className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 shadow-lg flex items-center justify-center border-2 border-blue-400/50"
        animate={animated ? {
          rotate: [0, 360],
        } : {}}
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
      >
        {/* AI Text */}
        <motion.div
          className="text-white font-bold select-none"
          style={{ fontSize: `${currentSize.icon * 0.4}px` }}
          animate={animated ? {
            scale: [1, 1.1, 1]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Ez
        </motion.div>
        
        {/* Orbiting dots */}
        {animated && (
          <>
            <motion.div
              className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full"
              style={{
                top: '10%',
                right: '20%'
              }}
              animate={{
                scale: [0.5, 1.2, 0.5],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0
              }}
            />
            <motion.div
              className="absolute w-1 h-1 bg-emerald-300 rounded-full"
              style={{
                bottom: '15%',
                left: '15%'
              }}
              animate={{
                scale: [0.5, 1.2, 0.5],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 0.5
              }}
            />
            <motion.div
              className="absolute w-1 h-1 bg-pink-300 rounded-full"
              style={{
                top: '50%',
                left: '5%'
              }}
              animate={{
                scale: [0.5, 1.2, 0.5],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: 1
              }}
            />
          </>
        )}
      </motion.div>
      
      {/* Subtle glow effect */}
      {animated && (
        <motion.div
          className="absolute -inset-1 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 60%)',
            filter: 'blur(4px)'
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );

  return <LogoIcon />;
};

// Full logo with text
export const EzAigentFullLogo = ({ size = 'md', darkMode = true, animated = true, showText = true }) => {
  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl'
  };

  return (
    <div className="flex items-center space-x-3">
      <EzAigentLogo size={size} animated={animated} />
      {showText && (
        <div>
          <motion.h1 
            className={`font-bold ${textSizes[size]} ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Ez Aigent
          </motion.h1>
          {size !== 'sm' && (
            <motion.p 
              className={`text-xs ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              AI Agent Platform
            </motion.p>
          )}
        </div>
      )}
    </div>
  );
};

export default EzAigentLogo;