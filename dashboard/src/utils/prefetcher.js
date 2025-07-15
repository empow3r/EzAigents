// Intelligent prefetching system
class Prefetcher {
  constructor() {
    this.prefetchQueue = new Set();
    this.prefetchCache = new Map();
    this.observer = null;
    this.initObserver();
  }

  initObserver() {
    if (typeof window === 'undefined') return;
    
    // Observe link hover for prefetching
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target;
            const href = link.getAttribute('href');
            if (href) this.prefetchRoute(href);
          }
        });
      },
      { rootMargin: '100px' }
    );
  }

  // Prefetch route data
  async prefetchRoute(route) {
    if (this.prefetchCache.has(route)) return;
    
    try {
      // Prefetch page data
      const response = await fetch(`${route}?_data=true`, {
        priority: 'low',
        headers: {
          'X-Prefetch': 'true'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.prefetchCache.set(route, data);
        
        // Cache for 5 minutes
        setTimeout(() => {
          this.prefetchCache.delete(route);
        }, 300000);
      }
    } catch (error) {
      console.error('Prefetch failed:', error);
    }
  }

  // Prefetch API data based on user patterns
  prefetchAPIData(endpoint, probability = 0.8) {
    if (Math.random() > probability) return;
    
    // Use requestIdleCallback for low-priority prefetching
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        fetch(endpoint, {
          priority: 'low',
          headers: {
            'X-Prefetch': 'true'
          }
        });
      });
    }
  }

  // Observe links for prefetching
  observeLinks() {
    if (!this.observer) return;
    
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      this.observer.observe(link);
    });
  }

  // Preload critical resources
  preloadResources(resources) {
    resources.forEach(({ href, as, type }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (type) link.type = type;
      document.head.appendChild(link);
    });
  }

  // Prefetch based on user navigation patterns
  predictivePrefetch(currentPage) {
    const predictions = {
      '/': ['/api/agents', '/api/queue-stats'],
      '/agents': ['/api/agents/details', '/api/tasks'],
      '/tasks': ['/api/tasks/recent', '/api/queue-stats'],
    };
    
    const toPrefetch = predictions[currentPage] || [];
    toPrefetch.forEach(endpoint => {
      this.prefetchAPIData(endpoint, 0.7);
    });
  }
}

export const prefetcher = new Prefetcher();

// Auto-prefetch on route change
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    prefetcher.predictivePrefetch(window.location.pathname);
  });
}