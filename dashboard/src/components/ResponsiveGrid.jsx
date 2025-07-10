'use client';
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';

const ResponsiveGrid = memo(({ 
  children, 
  className = '',
  minItemWidth = '280px',
  gap = '1rem',
  autoRows = 'auto',
  darkMode = false 
}) => {
  // Memoize grid styles for performance
  const gridStyles = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`,
    gap: gap,
    gridAutoRows: autoRows,
    width: '100%'
  }), [minItemWidth, gap, autoRows]);

  // Container variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  // Item variants
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`responsive-grid ${className}`}
      style={gridStyles}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          className="grid-item"
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
});

ResponsiveGrid.displayName = 'ResponsiveGrid';

// Preset grid configurations
export const GridPresets = {
  dashboard: {
    minItemWidth: '300px',
    gap: '1.5rem',
    autoRows: 'min-content'
  },
  cards: {
    minItemWidth: '280px',
    gap: '1rem',
    autoRows: 'auto'
  },
  metrics: {
    minItemWidth: '200px',
    gap: '1rem',
    autoRows: '120px'
  },
  gallery: {
    minItemWidth: '250px',
    gap: '1rem',
    autoRows: '250px'
  }
};

// Responsive Card wrapper component
export const ResponsiveCard = memo(({ 
  children, 
  className = '',
  darkMode = false,
  hover = true,
  padding = 'p-4',
  ...props 
}) => {
  return (
    <motion.div
      whileHover={hover ? { 
        y: -2,
        transition: { duration: 0.2 }
      } : {}}
      className={`
        ${padding} rounded-xl border transition-all duration-200
        ${darkMode 
          ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70' 
          : 'bg-white border-gray-200 hover:shadow-lg'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
});

ResponsiveCard.displayName = 'ResponsiveCard';

export default ResponsiveGrid;