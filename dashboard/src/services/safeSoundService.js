// Safe fallback sound service that won't break the app
const safeSoundService = {
  play: (soundName, options = {}) => {
    // Safe no-op implementation
    if (typeof window !== 'undefined' && window.console) {
      console.debug(`Playing sound: ${soundName}`);
    }
  },
  
  setVolume: (volume) => {
    // Safe no-op
  },
  
  setEnabled: (enabled) => {
    // Safe no-op
  },
  
  cleanup: () => {
    // Safe no-op
  },
  
  getMemoryUsage: () => ({
    soundCount: 0,
    preloadedCount: 0,
    isEnabled: false,
    isInitialized: false
  })
};

export default safeSoundService;