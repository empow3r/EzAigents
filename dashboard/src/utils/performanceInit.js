// Performance initialization utilities
export const initializePerformance = () => {
  if (typeof window === 'undefined') return;

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }

  // Preload critical resources
  const preloadCriticalResources = () => {
    const criticalPaths = [
      '/api/agents',
      '/api/queue',
      '/api/metrics'
    ];

    criticalPaths.forEach(path => {
      fetch(path).catch(() => {}); // Silently fail if offline
    });
  };

  // Initialize performance monitoring
  const initPerformanceMonitoring = () => {
    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // FID
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      }).observe({ type: 'first-input', buffered: true });

      // CLS
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      }).observe({ type: 'layout-shift', buffered: true });
    }
  };

  // DNS prefetch for external resources
  const prefetchDNS = () => {
    const domains = ['fonts.googleapis.com', 'fonts.gstatic.com'];
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });
  };

  // Initialize all performance optimizations
  setTimeout(() => {
    preloadCriticalResources();
    initPerformanceMonitoring();
    prefetchDNS();
  }, 100);
};

// Simple cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

export const cachedFetch = async (url, options = {}) => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  // Check cache for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Cache successful GET requests
    if (!options.method || options.method === 'GET') {
      apiCache.set(cacheKey, { data, timestamp: Date.now() });
    }
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Export for use in components
export { apiCache };