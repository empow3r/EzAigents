// Unified API Cache Service
// Combines the best features from all cache implementations

class UnifiedApiCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.config = {
      maxSize: options.maxSize || 100,
      maxAge: options.maxAge || 15 * 60 * 1000, // 15 minutes
      staleWhileRevalidate: options.staleWhileRevalidate || true,
      persist: options.persist || false,
      storageKey: options.storageKey || 'api_cache'
    };
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      avgResponseTime: 0
    };

    // Load persisted cache if enabled
    if (this.config.persist && typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  // Generate cache key
  generateKey(url, options = {}) {
    const { params, method = 'GET', body } = options;
    const keyParts = [method, url];
    
    if (params) {
      const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
      keyParts.push(sortedParams);
    }
    
    if (body) {
      keyParts.push(JSON.stringify(body));
    }
    
    return keyParts.join(':');
  }

  // Set cache entry
  set(key, data, options = {}) {
    const entry = {
      data,
      timestamp: Date.now(),
      maxAge: options.maxAge || this.config.maxAge,
      etag: options.etag,
      headers: options.headers || {}
    };

    this.cache.set(key, entry);
    
    // Enforce max size
    if (this.cache.size > this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    // Persist if enabled
    if (this.config.persist) {
      this.saveToStorage();
    }
  }

  // Get cache entry
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.maxAge;

    if (isExpired && !this.config.staleWhileRevalidate) {
      this.cache.delete(key);
      this.metrics.misses++;
      return null;
    }

    this.metrics.hits++;
    
    return {
      ...entry,
      isStale: isExpired,
      age
    };
  }

  // Fetch with cache
  async fetch(url, options = {}) {
    const startTime = performance.now();
    const key = this.generateKey(url, options);
    const cached = this.get(key);

    // Return cached data if fresh
    if (cached && !cached.isStale) {
      this.updateMetrics(performance.now() - startTime);
      return { data: cached.data, fromCache: true };
    }

    // If stale, return it but revalidate in background
    if (cached && cached.isStale && this.config.staleWhileRevalidate) {
      this.revalidate(url, options, key);
      this.updateMetrics(performance.now() - startTime);
      return { data: cached.data, fromCache: true, isStale: true };
    }

    // Fetch fresh data
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          ...(cached?.etag && { 'If-None-Match': cached.etag })
        }
      });

      // Handle 304 Not Modified
      if (response.status === 304 && cached) {
        const updatedEntry = { ...cached, timestamp: Date.now() };
        this.cache.set(key, updatedEntry);
        this.updateMetrics(performance.now() - startTime);
        return { data: cached.data, fromCache: true };
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const etag = response.headers.get('etag');
      
      this.set(key, data, { etag });
      this.updateMetrics(performance.now() - startTime);
      
      return { data, fromCache: false };
    } catch (error) {
      this.metrics.errors++;
      
      // Return stale data if available
      if (cached) {
        return { data: cached.data, fromCache: true, error: true };
      }
      
      throw error;
    }
  }

  // Background revalidation
  async revalidate(url, options, key) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const data = await response.json();
        const etag = response.headers.get('etag');
        this.set(key, data, { etag });
      }
    } catch (error) {
      console.error('Revalidation failed:', error);
    }
  }

  // Clear cache
  clear(pattern) {
    if (pattern) {
      // Clear entries matching pattern
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
    
    if (this.config.persist) {
      this.saveToStorage();
    }
  }

  // Get cache statistics
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0,
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        isExpired: Date.now() - entry.timestamp > entry.maxAge
      }))
    };
  }

  // Update metrics
  updateMetrics(responseTime) {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * totalRequests + responseTime) / (totalRequests + 1);
  }

  // Persistence methods
  saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = JSON.stringify({
        cache: Array.from(this.cache.entries()),
        metrics: this.metrics
      });
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const { cache, metrics } = JSON.parse(stored);
        this.cache = new Map(cache);
        this.metrics = metrics;
        
        // Clean expired entries
        const now = Date.now();
        for (const [key, entry] of this.cache) {
          if (now - entry.timestamp > entry.maxAge) {
            this.cache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }
}

// Create singleton instance
const apiCache = new UnifiedApiCache({
  maxSize: 50,
  maxAge: 15 * 60 * 1000,
  persist: true
});

// Export both the class and singleton
export { UnifiedApiCache, apiCache as default };