import { useState, useEffect, useCallback } from 'react';

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      componentRenderTime: new Map(),
      apiResponseTimes: new Map(),
      memoryUsage: 0,
      bundleSize: 0,
      cacheHitRate: 0
    };
    
    this.observers = new Map();
    this.setupObservers();
  }

  // Track page load performance
  trackPageLoad() {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        // Track Core Web Vitals
        this.trackCoreWebVitals();
      }
    }
  }

  // Track Core Web Vitals (LCP, FID, CLS)
  trackCoreWebVitals() {
    if (typeof window !== 'undefined') {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.fid = entry.processingStart - entry.startTime;
        });
      }).observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
      }).observe({ type: 'layout-shift', buffered: true });
    }
  }

  // Track component render times
  trackComponentRender(componentName, startTime) {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (this.metrics.componentRenderTime.has(componentName)) {
      const existing = this.metrics.componentRenderTime.get(componentName);
      existing.push(renderTime);
      // Keep only last 10 measurements
      if (existing.length > 10) {
        existing.shift();
      }
    } else {
      this.metrics.componentRenderTime.set(componentName, [renderTime]);
    }
  }

  // Track API response times
  trackApiResponse(endpoint, startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    if (this.metrics.apiResponseTimes.has(endpoint)) {
      const existing = this.metrics.apiResponseTimes.get(endpoint);
      existing.push(responseTime);
      // Keep only last 20 measurements
      if (existing.length > 20) {
        existing.shift();
      }
    } else {
      this.metrics.apiResponseTimes.set(endpoint, [responseTime]);
    }
  }

  // Track memory usage
  trackMemoryUsage() {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      this.metrics.memoryUsage = {
        used: window.performance.memory.usedJSHeapSize,
        total: window.performance.memory.totalJSHeapSize,
        limit: window.performance.memory.jsHeapSizeLimit
      };
    }
  }

  // Track bundle size
  trackBundleSize() {
    if (typeof window !== 'undefined' && window.performance) {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;
      
      resources.forEach(resource => {
        if (resource.name.includes('/_next/static/')) {
          totalSize += resource.transferSize || 0;
        }
      });
      
      this.metrics.bundleSize = totalSize;
    }
  }

  // Calculate cache hit rate
  calculateCacheHitRate() {
    if (typeof window !== 'undefined' && window.performance) {
      const resources = performance.getEntriesByType('resource');
      let cached = 0;
      let total = 0;
      
      resources.forEach(resource => {
        if (resource.name.includes('/api/')) {
          total++;
          if (resource.transferSize === 0) {
            cached++;
          }
        }
      });
      
      this.metrics.cacheHitRate = total > 0 ? (cached / total) * 100 : 0;
    }
  }

  // Set up performance observers
  setupObservers() {
    if (typeof window !== 'undefined' && window.PerformanceObserver) {
      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('/api/')) {
            this.trackApiResponse(entry.name, entry.startTime);
          }
        });
      });
      
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.set('resource', resourceObserver);
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    this.trackMemoryUsage();
    this.trackBundleSize();
    this.calculateCacheHitRate();
    
    return {
      pageLoadTime: this.metrics.pageLoadTime,
      coreWebVitals: {
        lcp: this.metrics.lcp,
        fid: this.metrics.fid,
        cls: this.metrics.cls
      },
      componentRenderTimes: Array.from(this.metrics.componentRenderTime.entries()).map(([name, times]) => ({
        component: name,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        lastRender: times[times.length - 1]
      })),
      apiResponseTimes: Array.from(this.metrics.apiResponseTimes.entries()).map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        lastResponse: times[times.length - 1]
      })),
      memoryUsage: this.metrics.memoryUsage,
      bundleSize: this.metrics.bundleSize,
      cacheHitRate: this.metrics.cacheHitRate
    };
  }

  // Get performance score (0-100)
  getPerformanceScore() {
    const summary = this.getPerformanceSummary();
    let score = 100;
    
    // Deduct points for poor Core Web Vitals
    if (summary.coreWebVitals.lcp > 2500) score -= 20;
    if (summary.coreWebVitals.fid > 100) score -= 20;
    if (summary.coreWebVitals.cls > 0.1) score -= 20;
    
    // Deduct points for slow API responses
    const avgApiTime = summary.apiResponseTimes.reduce((sum, api) => sum + api.averageTime, 0) / summary.apiResponseTimes.length;
    if (avgApiTime > 1000) score -= 15;
    
    // Deduct points for large bundle size
    if (summary.bundleSize > 1000000) score -= 10; // 1MB
    
    // Deduct points for low cache hit rate
    if (summary.cacheHitRate < 70) score -= 15;
    
    return Math.max(0, score);
  }

  // Export performance data
  exportPerformanceData() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getPerformanceSummary(),
      score: this.getPerformanceScore(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [monitor] = useState(() => new PerformanceMonitor());
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    monitor.trackPageLoad();
    
    const updateMetrics = () => {
      setMetrics(monitor.getPerformanceSummary());
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => {
      clearInterval(interval);
      monitor.cleanup();
    };
  }, [monitor]);

  const trackComponent = useCallback((componentName) => {
    const startTime = performance.now();
    return () => monitor.trackComponentRender(componentName, startTime);
  }, [monitor]);

  const trackApi = useCallback((endpoint) => {
    const startTime = performance.now();
    return () => monitor.trackApiResponse(endpoint, startTime);
  }, [monitor]);

  return {
    metrics,
    trackComponent,
    trackApi,
    getScore: () => monitor.getPerformanceScore(),
    exportData: () => monitor.exportPerformanceData()
  };
};

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

export default PerformanceMonitor;