import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

const ScrollProgress = ({ 
  position = 'top',
  height = 4,
  color = 'bg-gradient-to-r from-blue-500 to-purple-500',
  showPercentage = false,
  darkMode = true 
}) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const positionClasses = {
    top: 'top-0',
    bottom: 'bottom-0'
  };

  return (
    <>
      <motion.div
        className={`fixed left-0 right-0 z-50 ${positionClasses[position]}`}
        style={{ height: `${height}px` }}
      >
        <motion.div
          className={`h-full ${color} shadow-lg`}
          style={{ 
            scaleX,
            transformOrigin: '0%'
          }}
        />
      </motion.div>

      {showPercentage && (
        <motion.div
          className={`fixed ${position === 'top' ? 'top-16' : 'bottom-16'} right-4 z-50 
            ${darkMode ? 'bg-gray-800/90' : 'bg-white/90'} 
            backdrop-blur-sm rounded-full px-4 py-2 shadow-lg`}
        >
          <motion.span 
            className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            {scrollYProgress.get() > 0 ? Math.round(scrollYProgress.get() * 100) : 0}%
          </motion.span>
        </motion.div>
      )}
    </>
  );
};

export default ScrollProgress;