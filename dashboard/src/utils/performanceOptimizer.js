// Performance optimization utilities
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory cleanup utility
export const memoryCleanup = () => {
  if (typeof window !== 'undefined' && window.gc) {
    window.gc();
  }
};

// Check device performance capabilities
export const getDeviceCapabilities = () => {
  if (typeof window === 'undefined') return { isHighEnd: true };
  
  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;
  const connection = navigator.connection;
  
  const isHighEnd = memory >= 8 && cores >= 4;
  const isLowEnd = memory < 4 || cores < 2;
  const isSlowNetwork = connection && (
    connection.effectiveType === 'slow-2g' || 
    connection.effectiveType === '2g' ||
    connection.saveData
  );
  
  return {
    isHighEnd,
    isLowEnd,
    isSlowNetwork,
    memory,
    cores,
    effectiveType: connection?.effectiveType
  };
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (callback, options = {}) => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }
  
  return new IntersectionObserver(callback, {
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  });
};

// Performance measurement
export const measurePerformance = (name, fn) => {
  if (typeof window === 'undefined') return fn();
  
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  console.log(`Performance: ${name} took ${end - start} milliseconds`);
  return result;
};

// Bundle size optimization
export const shouldLoadHeavyFeature = () => {
  const capabilities = getDeviceCapabilities();
  return capabilities.isHighEnd && !capabilities.isSlowNetwork;
};

export default {
  debounce,
  throttle,
  memoryCleanup,
  getDeviceCapabilities,
  createIntersectionObserver,
  measurePerformance,
  shouldLoadHeavyFeature
};