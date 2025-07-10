import React, { useMemo, useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';

const VirtualizedTabList = memo(({ 
  tabs, 
  activeTab, 
  onTabClick, 
  darkMode, 
  itemHeight = 56,
  containerHeight = 400 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const scrollElementRef = useRef(null);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      tabs.length
    );
    
    return {
      startIndex: Math.max(0, startIndex),
      endIndex,
      visibleTabs: tabs.slice(startIndex, endIndex)
    };
  }, [scrollTop, itemHeight, containerHeight, tabs]);

  // Handle scroll events with throttling
  const handleScroll = useMemo(() => {
    let ticking = false;
    
    return (e) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollTop(e.target.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };
  }, []);

  // Auto-scroll to active tab
  useEffect(() => {
    if (!scrollElementRef.current) return;
    
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    if (activeIndex === -1) return;
    
    const activeItemTop = activeIndex * itemHeight;
    const activeItemBottom = activeItemTop + itemHeight;
    const scrollBottom = scrollTop + containerHeight;
    
    // Check if active item is out of view
    if (activeItemTop < scrollTop) {
      // Scroll up to show active item
      scrollElementRef.current.scrollTop = activeItemTop;
    } else if (activeItemBottom > scrollBottom) {
      // Scroll down to show active item
      scrollElementRef.current.scrollTop = activeItemBottom - containerHeight;
    }
  }, [activeTab, tabs, itemHeight, containerHeight, scrollTop]);

  const totalHeight = tabs.length * itemHeight;
  const offsetY = visibleItems.startIndex * itemHeight;

  return (
    <div 
      className="relative overflow-hidden"
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="absolute inset-0 overflow-y-auto"
        onScroll={handleScroll}
        style={{ height: containerHeight }}
      >
        {/* Virtual scrolling container */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.visibleTabs.map((tab, index) => {
              const actualIndex = visibleItems.startIndex + index;
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onTabClick(tab.id)}
                  whileHover={{ 
                    scale: 1.02,
                    x: 4,
                    transition: { duration: 0.15 }
                  }}
                  whileTap={{ 
                    scale: 0.98,
                    transition: { duration: 0.1 }
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-3 text-sm font-medium transition-all relative ${
                    isActive
                      ? darkMode
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                      : darkMode
                        ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={{ 
                    height: itemHeight,
                    borderRadius: '8px',
                    margin: '2px 0'
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <motion.div
                    animate={isActive ? { 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.1, 1]
                    } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                  </motion.div>
                  <span className="truncate flex-1 text-left">{tab.name}</span>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Scroll indicators */}
      {visibleItems.startIndex > 0 && (
        <div className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b ${
          darkMode ? 'from-gray-900' : 'from-white'
        } to-transparent pointer-events-none z-10`} />
      )}
      
      {visibleItems.endIndex < tabs.length && (
        <div className={`absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t ${
          darkMode ? 'from-gray-900' : 'from-white'
        } to-transparent pointer-events-none z-10`} />
      )}
    </div>
  );
});

VirtualizedTabList.displayName = 'VirtualizedTabList';

export default VirtualizedTabList;