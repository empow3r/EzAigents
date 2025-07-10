import React, { useState, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2 } from 'lucide-react';

const ExpandableTile = memo(({
  children,
  detailView,
  title,
  darkMode = false,
  className = '',
  disabled = false,
  onExpand,
  onCollapse
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tilePosition, setTilePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const tileRef = useRef(null);

  const handleExpand = useCallback(() => {
    if (disabled) return;

    const tile = tileRef.current;
    if (tile) {
      const rect = tile.getBoundingClientRect();
      setTilePosition({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      });
    }

    setIsExpanded(true);
    onExpand?.();
  }, [disabled, onExpand]);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
    onCollapse?.();
  }, [onCollapse]);

  const tileVariants = {
    normal: {
      scale: 1,
      zIndex: 1,
      transition: {
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    hover: {
      scale: 1.02,
      zIndex: 2,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1,
        ease: "easeIn"
      }
    }
  };

  const expandedVariants = {
    initial: {
      scale: 0.8,
      opacity: 0,
      x: typeof window !== 'undefined' ? tilePosition.x - window.innerWidth / 2 : 0,
      y: typeof window !== 'undefined' ? tilePosition.y - window.innerHeight / 2 : 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        opacity: { duration: 0.2 }
      }
    },
    exit: {
      scale: 0.8,
      opacity: 0,
      x: typeof window !== 'undefined' ? tilePosition.x - window.innerWidth / 2 : 0,
      y: typeof window !== 'undefined' ? tilePosition.y - window.innerHeight / 2 : 0,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Original Tile */}
      <motion.div
        ref={tileRef}
        variants={tileVariants}
        initial="normal"
        whileHover={!disabled ? "hover" : "normal"}
        whileTap={!disabled ? "tap" : "normal"}
        onClick={handleExpand}
        className={`relative cursor-pointer transition-shadow duration-200 ${
          !disabled ? 'hover:shadow-lg' : 'cursor-not-allowed opacity-50'
        } ${className}`}
        style={{
          visibility: isExpanded ? 'hidden' : 'visible'
        }}
      >
        {children}
        
        {/* Expand indicator */}
        {!disabled && (
          <motion.div
            className={`absolute top-2 right-2 p-1 rounded ${
              darkMode 
                ? 'bg-gray-800/80 text-gray-300' 
                : 'bg-white/80 text-gray-600'
            } opacity-0 transition-opacity duration-200`}
            whileHover={{ opacity: 1 }}
          >
            <Maximize2 size={14} />
          </motion.div>
        )}
      </motion.div>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleCollapse}
            />

            {/* Expanded Content */}
            <motion.div
              variants={expandedVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`fixed inset-4 md:inset-8 lg:inset-16 z-50 rounded-2xl shadow-2xl overflow-hidden ${
                darkMode 
                  ? 'bg-gray-900 border border-gray-700' 
                  : 'bg-white border border-gray-200'
              }`}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-4 border-b ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <h2 className={`text-xl font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h2>
                
                <button
                  onClick={handleCollapse}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4">
                {detailView}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

ExpandableTile.displayName = 'ExpandableTile';

export default ExpandableTile;