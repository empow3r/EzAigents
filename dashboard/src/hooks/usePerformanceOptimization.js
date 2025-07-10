import { useState, useEffect, useCallback, useMemo } from 'react';

export const usePerformanceOptimization = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [connectionType, setConnectionType] = useState('4g');
  const [deviceMemory, setDeviceMemory] = useState(4);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      
      const handleChange = (event) => setReducedMotion(event.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      // Check connection type
      if ('connection' in navigator) {
        const connection = navigator.connection;
        setConnectionType(connection.effectiveType || '4g');
        
        const handleConnectionChange = () => {
          setConnectionType(connection.effectiveType || '4g');
        };
        connection.addEventListener('change', handleConnectionChange);
        
        return () => {
          mediaQuery.removeEventListener('change', handleChange);
          connection.removeEventListener('change', handleConnectionChange);
        };
      }
      
      // Check device memory
      if ('deviceMemory' in navigator) {
        setDeviceMemory(navigator.deviceMemory || 4);
      }
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, []);

  const animationConfig = useMemo(() => {
    const isLowPerformance = connectionType === 'slow-2g' || connectionType === '2g' || deviceMemory < 4;
    
    return {
      duration: reducedMotion ? 0 : isLowPerformance ? 0.2 : 0.3,
      ease: reducedMotion ? 'linear' : 'easeOut',
      enabled: !reducedMotion && !isLowPerformance,
      stagger: reducedMotion ? 0 : isLowPerformance ? 0.05 : 0.1,
    };
  }, [reducedMotion, connectionType, deviceMemory]);

  const shouldLoad3D = useMemo(() => {
    return deviceMemory >= 4 && connectionType !== 'slow-2g' && connectionType !== '2g';
  }, [deviceMemory, connectionType]);

  const shouldLoadHeavyAnimations = useMemo(() => {
    return !reducedMotion && deviceMemory >= 2 && connectionType !== 'slow-2g';
  }, [reducedMotion, deviceMemory, connectionType]);

  const memoryCleanup = useCallback(() => {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear large objects from memory
    const clearLargeObjects = () => {
      // Remove unused audio buffers
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio.paused && !audio.currentTime) {
          audio.src = '';
          audio.load();
        }
      });
      
      // Clear unused canvas contexts
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        if (!canvas.parentNode) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      });
    };
    
    clearLargeObjects();
  }, []);

  return {
    animationConfig,
    shouldLoad3D,
    shouldLoadHeavyAnimations,
    reducedMotion,
    connectionType,
    deviceMemory,
    memoryCleanup,
  };
};

export const useOptimizedAnimations = () => {
  const { animationConfig } = usePerformanceOptimization();
  
  return {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: animationConfig.duration, ease: animationConfig.ease }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: animationConfig.duration, ease: animationConfig.ease }
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
      transition: { duration: animationConfig.duration, ease: animationConfig.ease }
    },
    stagger: {
      animate: {
        transition: {
          staggerChildren: animationConfig.stagger
        }
      }
    }
  };
};