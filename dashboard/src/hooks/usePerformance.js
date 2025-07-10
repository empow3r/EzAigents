'use client';
import { useEffect, useRef, useCallback } from 'react';
import performanceMonitor from '@/services/performanceMonitor';

// Hook for tracking component performance
export const useComponentPerformance = (componentName) => {
  const renderStart = useRef(null);
  const renderCount = useRef(0);

  useEffect(() => {
    // Track component mount
    renderStart.current = performance.now();
    renderCount.current++;

    return () => {
      // Track component unmount
      if (renderStart.current) {
        const duration = performance.now() - renderStart.current;
        performanceMonitor.trackComponentRender(componentName, duration);
      }
    };
  });

  // Track render time
  useEffect(() => {
    const duration = performance.now() - renderStart.current;
    performanceMonitor.trackComponentRender(`${componentName}-render-${renderCount.current}`, duration);
    renderStart.current = performance.now();
  });

  return {
    renderCount: renderCount.current
  };
};

// Hook for tracking API calls
export const useApiPerformance = () => {
  const trackApi = useCallback(async (url, fetchFn) => {
    return performanceMonitor.trackApiCall(url, fetchFn());
  }, []);

  return { trackApi };
};

// Hook for tracking custom metrics
export const useMetrics = () => {
  const startMeasure = useCallback((name) => {
    performance.mark(`${name}-start`);
  }, []);

  const endMeasure = useCallback((name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    if (measure) {
      performanceMonitor.reportMetric(name, measure.duration);
    }
  }, []);

  const trackMetric = useCallback((name, value) => {
    performanceMonitor.reportMetric(name, value);
  }, []);

  return { startMeasure, endMeasure, trackMetric };
};

// Hook for error boundary integration
export const useErrorTracking = () => {
  const trackError = useCallback((error, errorInfo) => {
    performanceMonitor.trackError({
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      type: 'react_error'
    });
  }, []);

  return { trackError };
};

// Main performance hook combining all features
export const usePerformance = (componentName) => {
  const component = useComponentPerformance(componentName);
  const api = useApiPerformance();
  const metrics = useMetrics();
  const errors = useErrorTracking();

  return {
    ...component,
    ...api,
    ...metrics,
    ...errors,
    getReport: () => performanceMonitor.getReport()
  };
};