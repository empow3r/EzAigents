import { useState, useEffect, useCallback } from 'react';

// API caching utility for enhanced performance
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = new Map();
    this.defaultTTL = 60000; // 1 minute
    this.maxCacheSize = 100;
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Generate cache key from request
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

  // Store response in cache
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

  // Clear cache
  clear() {
    this.cache.clear();
    this.cacheTTL.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  // Get cache statistics
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
      hitCount: this.hitCount,
      missCount: this.missCount,
      cacheSize: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

// Create global cache instance
const apiCache = new ApiCache();

// Enhanced fetch with caching
export const cachedFetch = async (url, options = {}) => {
  const cacheKey = apiCache.generateKey(url, options);
  
  // Check cache first for GET requests
  if (!options.method || options.method === 'GET') {
    const cachedResponse = apiCache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Clone response for caching
    const responseClone = response.clone();
    const data = await response.json();
    
    // Cache successful GET requests
    if ((!options.method || options.method === 'GET') && response.ok) {
      // Set different TTL based on endpoint
      let ttl = apiCache.defaultTTL;
      
      if (url.includes('/api/agents')) {
        ttl = 30000; // 30 seconds for agent status
      } else if (url.includes('/api/metrics')) {
        ttl = 15000; // 15 seconds for metrics
      } else if (url.includes('/api/queue')) {
        ttl = 5000; // 5 seconds for queue status
      }
      
      apiCache.set(cacheKey, data, ttl);
    }
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
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

// Background cache refresh
export const setupBackgroundRefresh = (endpoints, interval = 30000) => {
  const refresh = async () => {
    for (const endpoint of endpoints) {
      try {
        await cachedFetch(endpoint);
      } catch (error) {
        console.warn(`Background refresh failed for ${endpoint}:`, error);
      }
    }
  };
  
  const intervalId = setInterval(refresh, interval);
  
  // Initial refresh
  refresh();
  
  return () => clearInterval(intervalId);
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

// Cache invalidation utility
export const invalidateCache = (pattern) => {
  const keysToDelete = [];
  
  for (const key of apiCache.cache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    apiCache.cache.delete(key);
    apiCache.cacheTTL.delete(key);
  });
  
  console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
};

// Request deduplication
const pendingRequests = new Map();

export const deduplicatedFetch = async (url, options = {}) => {
  const cacheKey = apiCache.generateKey(url, options);
  
  // Check if request is already in flight
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Check cache first
  const cachedResponse = apiCache.get(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Make new request
  const requestPromise = cachedFetch(url, options)
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });
  
  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

// Export cache instance and utilities
export { apiCache };
export default {
  cachedFetch,
  useCachedApi,
  prefetchApi,
  setupBackgroundRefresh,
  warmCache,
  invalidateCache,
  deduplicatedFetch,
  getStats: () => apiCache.getStats(),
  clearCache: () => apiCache.clear()
};