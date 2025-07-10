import { lazy } from 'react';

// Enhanced lazy loading with performance optimizations
export const createOptimizedLazy = (componentImport, options = {}) => {
  const {
    fallback = null,
    preload = false,
    retryAttempts = 2,
    timeout = 10000,
    priority = 'normal'
  } = options;

  let componentPromise = null;
  
  const loadComponent = () => {
    if (componentPromise) return componentPromise;
    
    componentPromise = new Promise(async (resolve, reject) => {
      let attempts = 0;
      
      const attemptLoad = async () => {
        try {
          // Set loading priority
          if (priority === 'high' && typeof window !== 'undefined' && 'scheduler' in window) {
            await window.scheduler.postTask(async () => {
              const module = await componentImport();
              resolve(module);
            }, { priority: 'user-blocking' });
          } else {
            const module = await Promise.race([
              componentImport(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Component load timeout')), timeout)
              )
            ]);
            resolve(module);
          }
        } catch (error) {
          attempts++;
          if (attempts < retryAttempts) {
            console.warn(`Component load attempt ${attempts} failed, retrying...`, error);
            setTimeout(attemptLoad, 1000 * attempts); // Exponential backoff
          } else {
            console.error('Component failed to load after all attempts:', error);
            if (fallback) {
              resolve({ default: fallback });
            } else {
              resolve({
                default: () => (
                  <div className="p-6 text-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                    <p className="text-red-600 dark:text-red-400">Component failed to load</p>
                    <button 
                      onClick={() => typeof window !== 'undefined' && window.location.reload()} 
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Reload Page
                    </button>
                  </div>
                )
              });
            }
          }
        }
      };
      
      attemptLoad();
    });
    
    return componentPromise;
  };

  // Preload component if requested
  if (preload && typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadComponent);
    } else {
      setTimeout(loadComponent, 100);
    }
  }

  const LazyComponent = lazy(loadComponent);
  
  // Add preload method for manual preloading
  LazyComponent.preload = loadComponent;
  
  return LazyComponent;
};

// Performance-aware component loader
export const loadComponentByPerformance = async (highPerfComponent, lowPerfComponent) => {
  if (typeof navigator === 'undefined') return highPerfComponent;
  
  const connection = navigator.connection;
  const deviceMemory = navigator.deviceMemory || 4;
  
  const isLowPerformance = 
    (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) ||
    deviceMemory < 4;
  
  if (isLowPerformance) {
    return lowPerfComponent;
  } else {
    return highPerfComponent;
  }
};

// Bundle splitting helper
export const createChunkedLoader = (components) => {
  const chunks = {};
  
  Object.keys(components).forEach(key => {
    chunks[key] = createOptimizedLazy(components[key], {
      preload: false,
      priority: 'normal'
    });
  });
  
  return chunks;
};

// Intersection Observer for lazy loading
export const createIntersectionLazy = (componentImport, options = {}) => {
  const { threshold = 0.1, rootMargin = '50px' } = options;
  
  return lazy(() => {
    return new Promise((resolve) => {
      // Skip intersection observer on server
      if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
        componentImport().then(resolve);
        return;
      }
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              componentImport().then(resolve);
              observer.disconnect();
            }
          });
        },
        { threshold, rootMargin }
      );
      
      // Create a dummy element to observe
      const dummy = document.createElement('div');
      dummy.style.position = 'absolute';
      dummy.style.top = '0';
      dummy.style.left = '0';
      dummy.style.width = '1px';
      dummy.style.height = '1px';
      dummy.style.opacity = '0';
      dummy.style.pointerEvents = 'none';
      
      document.body.appendChild(dummy);
      observer.observe(dummy);
      
      // Cleanup function
      setTimeout(() => {
        if (dummy.parentNode) {
          dummy.parentNode.removeChild(dummy);
        }
        observer.disconnect();
        componentImport().then(resolve);
      }, 5000); // Fallback after 5 seconds
    });
  });
};