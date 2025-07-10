'use client';
import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export const ParallaxBackground = ({ darkMode = true, children }) => {
  const { scrollY } = useScroll();
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Multiple parallax layers with different speeds
  const y1 = useTransform(scrollY, [0, windowHeight], [0, -100]);
  const y2 = useTransform(scrollY, [0, windowHeight], [0, -200]);
  const y3 = useTransform(scrollY, [0, windowHeight], [0, -300]);
  
  const opacity1 = useTransform(scrollY, [0, windowHeight / 2], [0.3, 0]);
  const opacity2 = useTransform(scrollY, [0, windowHeight], [0.2, 0]);
  const opacity3 = useTransform(scrollY, [0, windowHeight * 1.5], [0.1, 0]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Parallax layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Layer 1 - Fastest */}
        <motion.div
          style={{ y: y1, opacity: opacity1 }}
          className="absolute inset-0"
        >
          <div
            className={`absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl ${
              darkMode 
                ? 'bg-blue-500/10' 
                : 'bg-blue-400/5'
            }`}
          />
          <div
            className={`absolute bottom-40 right-20 w-80 h-80 rounded-full blur-3xl ${
              darkMode 
                ? 'bg-purple-500/10' 
                : 'bg-purple-400/5'
            }`}
          />
        </motion.div>

        {/* Layer 2 - Medium */}
        <motion.div
          style={{ y: y2, opacity: opacity2 }}
          className="absolute inset-0"
        >
          <div
            className={`absolute top-60 right-40 w-[600px] h-[600px] rounded-full blur-3xl ${
              darkMode 
                ? 'bg-indigo-500/10' 
                : 'bg-indigo-400/5'
            }`}
          />
          <div
            className={`absolute bottom-20 left-60 w-[400px] h-[400px] rounded-full blur-3xl ${
              darkMode 
                ? 'bg-pink-500/10' 
                : 'bg-pink-400/5'
            }`}
          />
        </motion.div>

        {/* Layer 3 - Slowest */}
        <motion.div
          style={{ y: y3, opacity: opacity3 }}
          className="absolute inset-0"
        >
          <div
            className={`absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-3xl ${
              darkMode 
                ? 'bg-gradient-to-br from-blue-500/5 to-purple-500/5' 
                : 'bg-gradient-to-br from-blue-400/3 to-purple-400/3'
            }`}
          />
        </motion.div>

        {/* Animated gradient overlay */}
        <motion.div
          animate={{
            background: darkMode
              ? [
                  'radial-gradient(circle at 0% 0%, transparent 40%, rgba(59, 130, 246, 0.05) 100%)',
                  'radial-gradient(circle at 100% 100%, transparent 40%, rgba(168, 85, 247, 0.05) 100%)',
                  'radial-gradient(circle at 0% 100%, transparent 40%, rgba(34, 197, 94, 0.05) 100%)',
                  'radial-gradient(circle at 100% 0%, transparent 40%, rgba(251, 191, 36, 0.05) 100%)',
                ]
              : [
                  'radial-gradient(circle at 0% 0%, transparent 40%, rgba(59, 130, 246, 0.02) 100%)',
                  'radial-gradient(circle at 100% 100%, transparent 40%, rgba(168, 85, 247, 0.02) 100%)',
                  'radial-gradient(circle at 0% 100%, transparent 40%, rgba(34, 197, 94, 0.02) 100%)',
                  'radial-gradient(circle at 100% 0%, transparent 40%, rgba(251, 191, 36, 0.02) 100%)',
                ]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'linear'
          }}
          className="absolute inset-0"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ParallaxBackground;