'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

const ThemeToggle = ({ size = 20, className = '' }) => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-all
        ${darkMode 
          ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
          : 'bg-blue-500/20 text-blue-600 hover:bg-blue-500/30'
        }
        ${className}
      `}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: darkMode ? 0 : 180 }}
        transition={{ duration: 0.3 }}
      >
        {darkMode ? <Sun size={size} /> : <Moon size={size} />}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;