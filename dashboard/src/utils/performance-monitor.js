// Performance Monitoring Utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: [],
      apiCalls: [],
      renderTimes: [],
      interactions: []
    };
    this.observers = new Map();
  }

  // Measure page load performance
  measurePageLoad() {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
      const tcpTime = perfData.connectEnd - perfData.connectStart;
      const requestTime = perfData.responseEnd - perfData.requestStart;

      const metrics = {
        pageLoadTime,
        domReadyTime,
        dnsTime,
        tcpTime,
        requestTime,
        timestamp: Date.now()
      };

      this.metrics.pageLoad.push(metrics);
      console.log('Page Load Metrics:', metrics);

      // Send to analytics if enabled
      if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
        this.sendMetrics('pageLoad', metrics);
      }
    });
  }

  // Measure API call performance
  measureApiCall(url, startTime) {
    const duration = Date.now() - startTime;
    const metric = {
      url,
      duration,
      timestamp: Date.now()
    };

    this.metrics.apiCalls.push(metric);

    // Log slow API calls
    if (duration > 1000) {
      console.warn(`Slow API call to ${url}: ${duration}ms`);
    }

    return metric;
  }

  // Measure React component render time
  measureRender(componentName, callback) {
    const startTime = performance.now();
    
    const result = callback();
    
    const duration = performance.now() - startTime;
    const metric = {
      component: componentName,
      duration,
      timestamp: Date.now()
    };

    this.metrics.renderTimes.push(metric);

    // Log slow renders
    if (duration > 16) { // 60 FPS threshold
      console.warn(`Slow render in ${componentName}: ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  // Create Performance Observer for long tasks
  observeLongTasks() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 50ms threshold
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (e) {
      console.log('Long task monitoring not supported');
    }
  }

  // Monitor First Contentful Paint, Largest Contentful Paint, etc.
  observeWebVitals() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const metric = {
            name: entry.name,
            value: entry.startTime,
            rating: this.getVitalRating(entry.name, entry.startTime)
          };

          console.log(`Web Vital - ${entry.name}:`, metric);

          if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
            this.sendMetrics('webVital', metric);
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      this.observers.set('paint', observer);
    } catch (e) {
      console.log('Web Vitals monitoring not supported');
    }
  }

  // Get rating for web vitals
  getVitalRating(name, value) {
    const thresholds = {
      'first-paint': { good: 1000, poor: 3000 },
      'first-contentful-paint': { good: 1800, poor: 3000 },
      'largest-contentful-paint': { good: 2500, poor: 4000 }
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  // Monitor user interactions
  measureInteraction(action, metadata = {}) {
    const metric = {
      action,
      metadata,
      timestamp: Date.now()
    };

    this.metrics.interactions.push(metric);
    
    // Keep only last 100 interactions
    if (this.metrics.interactions.length > 100) {
      this.metrics.interactions = this.metrics.interactions.slice(-100);
    }
  }

  // Get performance summary
  getSummary() {
    const summary = {
      pageLoad: this.getAverageMetric(this.metrics.pageLoad, 'pageLoadTime'),
      apiCalls: {
        average: this.getAverageMetric(this.metrics.apiCalls, 'duration'),
        count: this.metrics.apiCalls.length,
        slow: this.metrics.apiCalls.filter(m => m.duration > 1000).length
      },
      renders: {
        average: this.getAverageMetric(this.metrics.renderTimes, 'duration'),
        count: this.metrics.renderTimes.length,
        slow: this.metrics.renderTimes.filter(m => m.duration > 16).length
      },
      interactions: this.metrics.interactions.length
    };

    return summary;
  }

  // Calculate average metric
  getAverageMetric(metrics, key) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m[key], 0);
    return Math.round(sum / metrics.length);
  }

  // Send metrics to analytics endpoint
  async sendMetrics(type, data) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: Date.now() })
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  performanceMonitor.measurePageLoad();
  performanceMonitor.observeLongTasks();
  performanceMonitor.observeWebVitals();
}

export default performanceMonitor;
export { PerformanceMonitor };