// Unified API Cache - Combines best features from both implementations
// Eliminates duplication while preserving all functionality

import { useState, useEffect, useCallback } from 'react';

class UnifiedApiCache {
  constructor(options = {}) {
    // Core cache storage
    this.cache = new Map();
    this.cacheTTL = new Map();
    this.pending = new Map();
    
    // Configuration
    this.defaultTTL = options.defaultTTL || 60000; // 1 minute
    this.maxCacheSize = options.maxCacheSize || 100;
    this.maxAge = options.maxAge || 30000; // 30 seconds
    
    // Statistics
    this.hitCount = 0;
    this.missCount = 0;
    
    // Page visibility handling
    this.isPageVisible = true;
    this.setupVisibilityHandling();
  }

  // Generate cache key from request (combining both approaches)
  generateKey(url, options = {}) {
    const method = options.method || 'GET';
    const body = options.body || '';
    const headers = JSON.stringify(options.headers || {});
    return `${method}:${url}:${body}:${headers}`;
  }

  // Check if cache entry is valid
  isValid(key) {
    if (!this.cache.has(key)) return false;
    
    const ttl = this.cacheTTL.get(key);
    if (Date.now() > ttl) {
      this.cache.delete(key);
      this.cacheTTL.delete(key);
      return false;
    }
    
    return true;
  }

  // Get cached response
  get(key) {
    if (this.isValid(key)) {
      this.hitCount++;
      const cachedData = this.cache.get(key);
      return Promise.resolve(cachedData);
    }
    
    this.missCount++;
    return null;
  }

  // Store response in cache with LRU eviction
  set(key, data, ttl = this.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheTTL.delete(firstKey);
    }
    
    this.cache.set(key, data);
    this.cacheTTL.set(key, Date.now() + ttl);
  }

  // Deduplicated fetch - prevents multiple identical requests
  async fetch(url, options = {}) {
    const key = this.generateKey(url, options);
    
    // Check cache first for GET requests
    if (!options.method || options.method === 'GET') {
      const cached = this.get(key);
      if (cached) return cached;
    }
    
    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
    
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    // Make the request
    const request = fetch(url, fetchOptions)
      .then(async (response) => {
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache successful GET requests
        if ((!options.method || options.method === 'GET') && response.ok) {
          const ttl = this.getTTLForEndpoint(url);
          this.set(key, data, ttl);
        }
        
        this.pending.delete(key);
        return data;
      })
      .catch(error => {
        clearTimeout(timeout);
        this.pending.delete(key);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      });
    
    this.pending.set(key, request);
    return request;
  }

  // Get TTL based on endpoint
  getTTLForEndpoint(url) {
    if (url.includes('/api/agents')) {
      return 30000; // 30 seconds for agent status
    } else if (url.includes('/api/metrics')) {
      return 15000; // 15 seconds for metrics
    } else if (url.includes('/api/queue')) {
      return 5000; // 5 seconds for queue status
    }
    return this.defaultTTL;
  }

  // Clear cache
  clear() {
    this.cache.clear();
    this.cacheTTL.clear();
    this.pending.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Cache invalidation by pattern
  invalidate(pattern) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTTL.delete(key);
    });
    
    console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    return keysToDelete.length;
  }

  // Get cache statistics
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      cacheSize: this.cache.size,
      maxSize: this.maxCacheSize,
      pendingRequests: this.pending.size
    };
  }

  // Setup page visibility handling
  setupVisibilityHandling() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isPageVisible = !document.hidden;
      });
    }
  }
}

// Create singleton instance
const apiCache = new UnifiedApiCache();

// Enhanced fetch with caching
export const cachedFetch = async (url, options = {}) => {
  return apiCache.fetch(url, options);
};

// React hook for API caching
export const useCachedApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await cachedFetch(url, options);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Prefetch utility for warming cache
export const prefetchApi = async (urls) => {
  const promises = urls.map(url => {
    return cachedFetch(url).catch(err => {
      console.warn(`Prefetch failed for ${url}:`, err);
      return null;
    });
  });
  
  return Promise.allSettled(promises);
};

// Batch API requests to reduce load
export class BatchRequester {
  constructor(batchFn, delay = 50) {
    this.batchFn = batchFn;
    this.delay = delay;
    this.queue = [];
    this.timeout = null;
  }

  request(params) {
    return new Promise((resolve, reject) => {
      this.queue.push({ params, resolve, reject });
      
      if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  async flush() {
    const batch = this.queue.splice(0);
    this.timeout = null;
    
    if (batch.length === 0) return;
    
    try {
      const results = await this.batchFn(batch.map(item => item.params));
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }
  }
}

// Polling manager to prevent excessive API calls
export class PollingManager {
  constructor() {
    this.intervals = new Map();
    this.isPageVisible = true;
    
    // Pause polling when page is hidden
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isPageVisible = !document.hidden;
        if (!this.isPageVisible) {
          this.pauseAll();
        } else {
          this.resumeAll();
        }
      });
    }
  }

  start(key, callback, interval) {
    this.stop(key);
    
    const wrappedCallback = async () => {
      if (!this.isPageVisible) return;
      try {
        await callback();
      } catch (error) {
        console.error(`Polling error for ${key}:`, error);
      }
    };
    
    // Run immediately
    wrappedCallback();
    
    // Then set interval
    const id = setInterval(wrappedCallback, interval);
    this.intervals.set(key, { id, callback: wrappedCallback, interval });
  }

  stop(key) {
    const item = this.intervals.get(key);
    if (item) {
      clearInterval(item.id);
      this.intervals.delete(key);
    }
  }

  pauseAll() {
    this.intervals.forEach((item, key) => {
      clearInterval(item.id);
    });
  }

  resumeAll() {
    this.intervals.forEach((item, key) => {
      const id = setInterval(item.callback, item.interval);
      item.id = id;
    });
  }

  stopAll() {
    this.intervals.forEach((item, key) => {
      clearInterval(item.id);
    });
    this.intervals.clear();
  }
}

// Background cache refresh
export const setupBackgroundRefresh = (endpoints, interval = 30000) => {
  const pollingManager = new PollingManager();
  
  const refresh = async () => {
    for (const endpoint of endpoints) {
      try {
        await cachedFetch(endpoint);
      } catch (error) {
        console.warn(`Background refresh failed for ${endpoint}:`, error);
      }
    }
  };
  
  pollingManager.start('background-refresh', refresh, interval);
  
  return () => pollingManager.stop('background-refresh');
};

// Cache warming strategy
export const warmCache = async () => {
  const criticalEndpoints = [
    '/api/agents',
    '/api/queue',
    '/api/metrics'
  ];
  
  console.log('Warming cache for critical endpoints...');
  await prefetchApi(criticalEndpoints);
  console.log('Cache warmed successfully');
};

// Export cache instance and utilities
export { apiCache };
export default {
  cachedFetch,
  useCachedApi,
  prefetchApi,
  setupBackgroundRefresh,
  warmCache,
  invalidateCache: (pattern) => apiCache.invalidate(pattern),
  getStats: () => apiCache.getStats(),
  clearCache: () => apiCache.clear(),
  BatchRequester,
  PollingManager
};