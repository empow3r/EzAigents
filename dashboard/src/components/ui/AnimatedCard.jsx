'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const AnimatedCard = ({ 
  children, 
  className = '',
  darkMode = true,
  hover = true,
  delay = 0,
  onClick,
  glass = true,
  border = true,
  padding = 'p-6',
  animation = 'fadeUp'
}) => {
  const animations = {
    fadeUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 }
    },
    slideRight: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 }
    }
  };

  const selectedAnimation = animations[animation] || animations.fadeUp;

  const baseClasses = cn(
    'rounded-lg transition-all duration-300',
    padding,
    glass && (darkMode ? 'bg-black/20 backdrop-blur-sm' : 'bg-white/20 backdrop-blur-sm'),
    !glass && (darkMode ? 'bg-gray-800' : 'bg-white'),
    border && (darkMode ? 'border border-white/10' : 'border border-black/10'),
    hover && 'hover:shadow-lg hover:scale-[1.02]',
    onClick && 'cursor-pointer',
    className
  );

  return (
    <motion.div
      {...selectedAnimation}
      transition={{ duration: 0.3, delay }}
      className={baseClasses}
      onClick={onClick}
      whileHover={hover ? { y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;