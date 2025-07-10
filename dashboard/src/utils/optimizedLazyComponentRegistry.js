import { lazy, startTransition } from 'react';
import advancedLazyLoader from './advancedLazyLoader';

// Optimized component registry with route-based code splitting
class OptimizedComponentRegistry {
  constructor() {
    this.components = new Map();
    this.preloadedComponents = new Set();
    this.loadingPriorities = new Map();
    this.routePatterns = new Map();
    
    // Monitor route changes for predictive preloading
    if (typeof window !== 'undefined') {
      this.setupRoutePreloading();
    }
  }
  
  setupRoutePreloading() {
    // Predictive preloading based on user navigation patterns
    let lastRoute = window.location.pathname;
    
    const handleRouteChange = () => {
      const currentRoute = window.location.pathname;
      if (currentRoute !== lastRoute) {
        this.preloadRouteComponents(currentRoute);
        lastRoute = currentRoute;
      }
    };
    
    // Listen to popstate for browser navigation
    window.addEventListener('popstate', handleRouteChange);
    
    // Override pushState and replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleRouteChange();
    };
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleRouteChange();
    };
  }
  
  registerRoutePattern(pattern, components) {
    this.routePatterns.set(pattern, components);
  }
  
  preloadRouteComponents(route) {
    // Find components that match the current route
    this.routePatterns.forEach((components, pattern) => {
      if (new RegExp(pattern).test(route)) {
        components.forEach(componentName => {
          const component = this.components.get(componentName);
          if (component && !this.preloadedComponents.has(componentName)) {
            this.preloadComponent(componentName);
          }
        });
      }
    });
  }
  
  createLazyComponent(
    componentName,
    importFn,
    options = {}
  ) {
    const {
      priority = 'normal',
      preload = false,
      chunkName = componentName,
      retries = 3,
      retryDelay = 1000,
      fallback = null,
      suspenseOptions = {}
    } = options;
    
    // Create retry wrapper for network failures
    const retryImport = async (retriesLeft = retries) => {
      try {
        return await importFn();
      } catch (error) {
        if (retriesLeft > 0) {
          console.warn(`Failed to load ${componentName}, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return retryImport(retriesLeft - 1);
        }
        throw error;
      }
    };
    
    // Create the lazy component with enhanced loading
    const LazyComponent = lazy(() => {
      // Track loading state
      this.components.set(componentName, { 
        status: 'loading',
        component: null 
      });
      
      return retryImport().then(module => {
        // Mark as loaded
        this.components.set(componentName, {
          status: 'loaded',
          component: module.default || module
        });
        this.preloadedComponents.add(componentName);
        
        return module;
      }).catch(error => {
        // Mark as failed
        this.components.set(componentName, {
          status: 'failed',
          error
        });
        
        throw error;
      });
    });
    
    // Add metadata for preloading
    LazyComponent._componentName = componentName;
    LazyComponent._priority = priority;
    LazyComponent._preload = () => {
      if (!this.preloadedComponents.has(componentName)) {
        startTransition(() => {
          retryImport().catch(console.error);
        });
      }
    };
    
    // Store component reference
    this.components.set(componentName, {
      status: 'registered',
      component: LazyComponent,
      importFn: retryImport,
      priority
    });
    
    this.loadingPriorities.set(componentName, priority);
    
    // Auto-preload based on priority
    if (preload || priority === 'critical') {
      LazyComponent._preload();
    } else if (priority === 'high') {
      // Preload high priority components on idle
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => LazyComponent._preload(), { timeout: 3000 });
      } else {
        setTimeout(() => LazyComponent._preload(), 1000);
      }
    }
    
    return LazyComponent;
  }
  
  preloadComponent(componentName) {
    const componentData = this.components.get(componentName);
    if (componentData && componentData.component && componentData.component._preload) {
      componentData.component._preload();
    }
  }
  
  preloadByPriority(priority) {
    this.loadingPriorities.forEach((componentPriority, componentName) => {
      if (componentPriority === priority) {
        this.preloadComponent(componentName);
      }
    });
  }
  
  getLoadingStatus() {
    const status = {
      total: this.components.size,
      loaded: 0,
      loading: 0,
      failed: 0,
      registered: 0
    };
    
    this.components.forEach((data) => {
      status[data.status]++;
    });
    
    return status;
  }
  
  // Batch preload multiple components
  batchPreload(componentNames, options = {}) {
    const { maxConcurrent = 3, onProgress } = options;
    
    return advancedLazyLoader.batchLoad(
      componentNames.map(name => ({
        type: 'component',
        name,
        load: () => this.preloadComponent(name)
      })),
      { maxConcurrent, onProgress }
    );
  }
}

// Create singleton instance
const registry = new OptimizedComponentRegistry();

// Enhanced createLazyComponent with automatic route-based splitting
export function createLazyComponent(importFn, options = {}) {
  const {
    name = 'Component',
    route = null,
    dependencies = [],
    ...otherOptions
  } = options;
  
  // Generate chunk name from component name
  const chunkName = name.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
  
  // Create wrapped import function with webpack magic comments
  const wrappedImportFn = () => {
    // Add webpack magic comments for better code splitting
    if (typeof importFn === 'string') {
      return import(
        /* webpackChunkName: "[request]" */
        /* webpackMode: "lazy" */
        /* webpackPrefetch: false */
        /* webpackPreload: false */
        importFn
      );
    }
    return importFn();
  };
  
  // Register route pattern if provided
  if (route) {
    registry.registerRoutePattern(route, [name, ...dependencies]);
  }
  
  return registry.createLazyComponent(
    name,
    wrappedImportFn,
    { ...otherOptions, chunkName }
  );
}

// Preload strategies
export const preloadStrategies = {
  // Preload when user hovers over a link
  onHover: (componentName) => {
    return {
      onMouseEnter: () => registry.preloadComponent(componentName),
      onFocus: () => registry.preloadComponent(componentName)
    };
  },
  
  // Preload when component is likely to be used
  onLikelyUse: (componentName, likelihood = 0.5) => {
    if (Math.random() < likelihood) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => registry.preloadComponent(componentName));
      }
    }
  },
  
  // Preload based on viewport proximity
  onViewportProximity: (elementRef, componentName, distance = '200px') => {
    if (!elementRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          registry.preloadComponent(componentName);
          observer.disconnect();
        }
      },
      { rootMargin: distance }
    );
    
    observer.observe(elementRef.current);
    
    return () => observer.disconnect();
  }
};

// Export registry methods
export const preloadComponent = (name) => registry.preloadComponent(name);
export const preloadByPriority = (priority) => registry.preloadByPriority(priority);
export const getLoadingStatus = () => registry.getLoadingStatus();
export const batchPreload = (names, options) => registry.batchPreload(names, options);

export default registry;