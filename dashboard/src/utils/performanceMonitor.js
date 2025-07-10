// Enhanced performance monitoring with adaptive quality control
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.performanceScore = 100;
    this.frameCount = 0;
    this.isSupported = typeof window !== 'undefined' && 'PerformanceObserver' in window && 'performance' in window;
    this.lastFrameTime = this.isSupported ? performance.now() : 0;
    this.fps = 60;
    
    // Device capabilities - only detect if in browser environment
    this.deviceCapabilities = this.isSupported ? this.detectDeviceCapabilities() : this.getDefaultCapabilities();
    this.networkQuality = this.isSupported ? this.detectNetworkQuality() : 'unknown';
    
    if (this.isSupported) {
      this.initializeObservers();
      this.startFPSMonitoring();
    }
  }
  
  detectDeviceCapabilities() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return this.getDefaultCapabilities();
    }
    
    const capabilities = {
      cores: navigator.hardwareConcurrency || 4,
      memory: navigator.deviceMemory || 4,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1
      },
      touch: 'ontouchstart' in window,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    
    // Calculate device tier
    let tier = 'high';
    if (capabilities.cores <= 2 || capabilities.memory <= 2) {
      tier = 'low';
    } else if (capabilities.cores <= 4 || capabilities.memory <= 4) {
      tier = 'medium';
    }
    
    capabilities.tier = tier;
    return capabilities;
  }
  
  getDefaultCapabilities() {
    return {
      cores: 4,
      memory: 4,
      screen: {
        width: 1920,
        height: 1080,
        pixelRatio: 1
      },
      touch: false,
      reducedMotion: false,
      tier: 'medium'
    };
  }
  
  detectNetworkQuality() {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return { type: 'unknown', quality: 'medium' };
    }
    
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;
    
    let quality = 'high';
    if (effectiveType === '2g' || downlink < 1) {
      quality = 'low';
    } else if (effectiveType === '3g' || downlink < 5) {
      quality = 'medium';
    }
    
    return {
      type: effectiveType,
      quality,
      downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  
  startFPSMonitoring() {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      
      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta);
        this.metrics.set('fps', this.fps);
        
        // Adjust performance score based on FPS
        if (this.fps < 30) {
          this.performanceScore = Math.max(0, this.performanceScore - 10);
        } else if (this.fps < 50) {
          this.performanceScore = Math.max(0, this.performanceScore - 5);
        } else if (this.fps >= 58) {
          this.performanceScore = Math.min(100, this.performanceScore + 1);
        }
        
        this.frameCount = 0;
        this.lastFrameTime = now;
      }
      
      this.frameCount++;
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  initializeObservers() {
    // Monitor Large Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.set('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Monitor First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.set('fid', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Monitor Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.set('cls', clsValue);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // Monitor component render times
    try {
      const measureObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.startsWith('⚛️')) {
            this.metrics.set(`render_${entry.name}`, entry.duration);
          }
        });
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);
    } catch (e) {
      console.warn('Measure observer not supported');
    }
  }

  // Measure component performance
  measureComponent(name, fn) {
    if (!this.isSupported) return fn();
    
    const markName = `${name}_start`;
    const endMarkName = `${name}_end`;
    const measureName = `⚛️ ${name}`;
    
    performance.mark(markName);
    const result = fn();
    
    if (result && typeof result.then === 'function') {
      // Handle promises
      return result.finally(() => {
        performance.mark(endMarkName);
        performance.measure(measureName, markName, endMarkName);
      });
    } else {
      performance.mark(endMarkName);
      performance.measure(measureName, markName, endMarkName);
      return result;
    }
  }

  // Get current metrics
  getMetrics() {
    const metrics = Object.fromEntries(this.metrics);
    
    // Add memory info if available
    if ('memory' in performance) {
      metrics.memoryUsed = performance.memory.usedJSHeapSize;
      metrics.memoryTotal = performance.memory.totalJSHeapSize;
      metrics.memoryLimit = performance.memory.jsHeapSizeLimit;
    }
    
    // Add timing info
    if ('timing' in performance) {
      const timing = performance.timing;
      metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
      metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    }
    
    return metrics;
  }

  // Check if performance is good
  isPerformanceGood() {
    const lcp = this.metrics.get('lcp') || 0;
    const fid = this.metrics.get('fid') || 0;
    const cls = this.metrics.get('cls') || 0;
    
    return {
      lcp: lcp < 2500, // Good LCP is < 2.5s
      fid: fid < 100,  // Good FID is < 100ms
      cls: cls < 0.1,  // Good CLS is < 0.1
      overall: lcp < 2500 && fid < 100 && cls < 0.1
    };
  }

  // Get performance score (0-100) with FPS consideration
  getPerformanceScore() {
    return Math.round(this.performanceScore);
  }
  
  // Get adaptive settings based on performance
  getAdaptiveSettings() {
    const score = this.getPerformanceScore();
    const deviceTier = this.deviceCapabilities.tier;
    const networkQuality = this.networkQuality.quality;
    
    const settings = {
      animations: true,
      transitions: true,
      shadows: true,
      blur: true,
      particles: true,
      quality: 'high',
      maxFPS: 60,
      renderScale: 1,
      imageQuality: 'high',
      lazyLoadDistance: '200px'
    };
    
    // Adjust based on performance score
    if (score < 30 || deviceTier === 'low') {
      settings.animations = false;
      settings.transitions = false;
      settings.shadows = false;
      settings.blur = false;
      settings.particles = false;
      settings.quality = 'low';
      settings.maxFPS = 30;
      settings.renderScale = 0.75;
      settings.imageQuality = 'low';
      settings.lazyLoadDistance = '50px';
    } else if (score < 60 || deviceTier === 'medium') {
      settings.animations = true;
      settings.transitions = true;
      settings.shadows = false;
      settings.blur = false;
      settings.particles = false;
      settings.quality = 'medium';
      settings.maxFPS = 45;
      settings.renderScale = 0.9;
      settings.imageQuality = 'medium';
      settings.lazyLoadDistance = '100px';
    }
    
    // Further adjust based on network
    if (networkQuality === 'low' || this.networkQuality.saveData) {
      settings.quality = 'low';
      settings.renderScale = Math.min(settings.renderScale, 0.8);
      settings.imageQuality = 'low';
      settings.lazyLoadDistance = '0px';
    }
    
    // Respect user preferences
    if (this.deviceCapabilities.reducedMotion) {
      settings.animations = false;
      settings.transitions = false;
      settings.particles = false;
    }
    
    return settings;
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

import { useState, useEffect, useCallback, useMemo } from 'react';

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [monitor] = useState(() => new PerformanceMonitor());
  const [metrics, setMetrics] = useState({});
  const [adaptiveSettings, setAdaptiveSettings] = useState(monitor.getAdaptiveSettings());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
      setAdaptiveSettings(monitor.getAdaptiveSettings());
    }, 1000); // Update every second for responsive adaptation
    
    return () => {
      clearInterval(interval);
      monitor.disconnect();
    };
  }, [monitor]);
  
  const measureComponent = useCallback((name, fn) => {
    return monitor.measureComponent(name, fn);
  }, [monitor]);
  
  const performanceScore = useMemo(() => {
    return monitor.getPerformanceScore();
  }, [monitor, metrics]);
  
  const isGoodPerformance = useMemo(() => {
    return monitor.isPerformanceGood();
  }, [monitor, metrics]);
  
  return {
    metrics,
    performanceScore,
    isGoodPerformance,
    measureComponent,
    adaptiveSettings,
    deviceCapabilities: monitor.deviceCapabilities,
    networkQuality: monitor.networkQuality
  };
};

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (!('getEntriesByType' in performance)) {
    return { supported: false };
  }
  
  const resources = performance.getEntriesByType('resource');
  const jsResources = resources.filter(r => r.name.endsWith('.js'));
  const cssResources = resources.filter(r => r.name.endsWith('.css'));
  
  const totalJS = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  const totalCSS = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
  
  return {
    supported: true,
    totalJS: totalJS / 1024, // KB
    totalCSS: totalCSS / 1024, // KB
    totalResources: resources.length,
    jsFiles: jsResources.length,
    cssFiles: cssResources.length,
    recommendations: {
      jsOptimization: totalJS > 500 * 1024, // > 500KB
      cssOptimization: totalCSS > 100 * 1024, // > 100KB
      tooManyRequests: resources.length > 50
    }
  };
};

export default PerformanceMonitor;