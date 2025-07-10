// Unified Performance Monitoring Service
// Combines all performance tracking into a single, optimized service

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: {},
      apiCalls: {},
      componentRenders: new Map(),
      errors: [],
      vitals: {}
    };
    
    this.observers = {
      performance: null,
      errors: null,
      resources: null
    };

    this.thresholds = {
      slowApiCall: 3000, // 3 seconds
      slowRender: 16, // 16ms (60fps)
      memoryWarning: 100 * 1024 * 1024, // 100MB
      errorLimit: 10 // Max errors before alert
    };

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    // Web Vitals
    this.trackWebVitals();
    
    // Performance Observer
    this.initPerformanceObserver();
    
    // Error tracking
    this.initErrorTracking();
    
    // Memory monitoring
    this.initMemoryMonitoring();
    
    // Network monitoring
    this.initNetworkMonitoring();
  }

  // Track Core Web Vitals
  trackWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.vitals.fcp = entry.startTime;
          this.reportMetric('FCP', entry.startTime);
        }
      });
    });

    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.vitals.lcp = lastEntry.startTime;
      this.reportMetric('LCP', lastEntry.startTime);
    });

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.vitals.fid = entry.processingStart - entry.startTime;
        this.reportMetric('FID', this.metrics.vitals.fid);
      });
    });

    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metrics.vitals.cls = clsValue;
          this.reportMetric('CLS', clsValue);
        }
      });
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  // Initialize performance observer
  initPerformanceObserver() {
    if (!('PerformanceObserver' in window)) return;

    this.observers.performance = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          this.trackPageLoad(entry);
        } else if (entry.entryType === 'resource') {
          this.trackResource(entry);
        } else if (entry.entryType === 'measure') {
          this.trackCustomMetric(entry);
        }
      });
    });

    try {
      this.observers.performance.observe({ 
        entryTypes: ['navigation', 'resource', 'measure'] 
      });
    } catch (e) {
      console.warn('Some performance entry types not supported');
    }
  }

  // Track page load performance
  trackPageLoad(entry) {
    this.metrics.pageLoad = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive,
      timeToFirstByte: entry.responseStart - entry.requestStart,
      totalTime: entry.loadEventEnd - entry.fetchStart
    };

    this.reportMetric('PageLoad', this.metrics.pageLoad.totalTime);
  }

  // Track resource loading
  trackResource(entry) {
    const isSlowResource = entry.duration > this.thresholds.slowApiCall;
    
    if (isSlowResource || entry.name.includes('/api/')) {
      const metric = {
        url: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        type: entry.initiatorType,
        slow: isSlowResource
      };

      if (entry.name.includes('/api/')) {
        if (!this.metrics.apiCalls[entry.name]) {
          this.metrics.apiCalls[entry.name] = [];
        }
        this.metrics.apiCalls[entry.name].push(metric);
      }

      if (isSlowResource) {
        this.reportSlowResource(metric);
      }
    }
  }

  // Track custom metrics
  trackCustomMetric(entry) {
    this.reportMetric(entry.name, entry.duration);
  }

  // Error tracking
  initErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        type: 'javascript'
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack,
        type: 'unhandled_promise'
      });
    });
  }

  // Memory monitoring
  initMemoryMonitoring() {
    if (!performance.memory) return;

    setInterval(() => {
      const memoryUsage = performance.memory.usedJSHeapSize;
      
      if (memoryUsage > this.thresholds.memoryWarning) {
        this.reportWarning('HighMemoryUsage', {
          usage: memoryUsage,
          limit: performance.memory.jsHeapSizeLimit,
          percentage: (memoryUsage / performance.memory.jsHeapSizeLimit) * 100
        });
      }
    }, 30000); // Check every 30 seconds
  }

  // Network monitoring
  initNetworkMonitoring() {
    if (!('connection' in navigator)) return;

    const connection = navigator.connection;
    
    connection.addEventListener('change', () => {
      this.reportMetric('NetworkChange', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
    });
  }

  // Component render tracking
  trackComponentRender(componentName, duration) {
    if (!this.metrics.componentRenders.has(componentName)) {
      this.metrics.componentRenders.set(componentName, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        slowRenders: 0
      });
    }

    const stats = this.metrics.componentRenders.get(componentName);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;

    if (duration > this.thresholds.slowRender) {
      stats.slowRenders++;
      this.reportSlowRender(componentName, duration);
    }
  }

  // API call tracking
  async trackApiCall(url, fetchPromise) {
    const startTime = performance.now();
    
    try {
      const result = await fetchPromise;
      const duration = performance.now() - startTime;
      
      this.trackApiMetric(url, duration, 'success');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackApiMetric(url, duration, 'error', error);
      throw error;
    }
  }

  trackApiMetric(url, duration, status, error = null) {
    if (!this.metrics.apiCalls[url]) {
      this.metrics.apiCalls[url] = [];
    }

    const metric = {
      duration,
      status,
      timestamp: Date.now(),
      error: error?.message
    };

    this.metrics.apiCalls[url].push(metric);

    if (duration > this.thresholds.slowApiCall) {
      this.reportSlowApiCall(url, duration);
    }

    if (status === 'error') {
      this.trackError({
        message: `API call failed: ${url}`,
        error: error?.message,
        type: 'api'
      });
    }
  }

  // Error tracking
  trackError(errorInfo) {
    this.metrics.errors.push({
      ...errorInfo,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    if (this.metrics.errors.length > this.thresholds.errorLimit) {
      this.reportCriticalErrors();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Performance Monitor Error:', errorInfo);
    }
  }

  // Reporting methods
  reportMetric(name, value) {
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        value: value
      });
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}:`, value);
    }
  }

  reportSlowResource(resource) {
    console.warn('[Performance] Slow resource:', resource);
  }

  reportSlowRender(component, duration) {
    console.warn(`[Performance] Slow render in ${component}: ${duration}ms`);
  }

  reportSlowApiCall(url, duration) {
    console.warn(`[Performance] Slow API call to ${url}: ${duration}ms`);
  }

  reportWarning(type, data) {
    console.warn(`[Performance Warning] ${type}:`, data);
  }

  reportCriticalErrors() {
    console.error('[Performance] Critical error threshold reached!', {
      errorCount: this.metrics.errors.length,
      recentErrors: this.metrics.errors.slice(-5)
    });
  }

  // Get performance report
  getReport() {
    return {
      vitals: this.metrics.vitals,
      pageLoad: this.metrics.pageLoad,
      apiCalls: this.getApiCallStats(),
      components: this.getComponentStats(),
      errors: this.getErrorStats(),
      timestamp: Date.now()
    };
  }

  getApiCallStats() {
    const stats = {};
    
    Object.entries(this.metrics.apiCalls).forEach(([url, calls]) => {
      const durations = calls.map(c => c.duration);
      stats[url] = {
        count: calls.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / calls.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        errorRate: calls.filter(c => c.status === 'error').length / calls.length
      };
    });
    
    return stats;
  }

  getComponentStats() {
    const stats = {};
    
    this.metrics.componentRenders.forEach((data, component) => {
      stats[component] = {
        ...data,
        slowRenderRate: data.slowRenders / data.count
      };
    });
    
    return stats;
  }

  getErrorStats() {
    const errorsByType = {};
    
    this.metrics.errors.forEach(error => {
      if (!errorsByType[error.type]) {
        errorsByType[error.type] = 0;
      }
      errorsByType[error.type]++;
    });
    
    return {
      total: this.metrics.errors.length,
      byType: errorsByType,
      recent: this.metrics.errors.slice(-5)
    };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {
      pageLoad: {},
      apiCalls: {},
      componentRenders: new Map(),
      errors: [],
      vitals: {}
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;