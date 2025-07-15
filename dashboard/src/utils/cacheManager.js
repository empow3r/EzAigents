class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = 30000; // 30 seconds
  }

  set(key, value, ttl = this.defaultTTL) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: this.hitRate || 0
    };
  }

  // Memory-aware cache with size limits
  setWithSizeLimit(key, value, maxSize = 100, ttl = this.defaultTTL) {
    if (this.cache.size >= maxSize) {
      // Remove oldest entries
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
    }
    this.set(key, value, ttl);
  }
}

// Singleton instance
const cacheManager = new CacheManager();

// API response caching
export const cacheApiResponse = (url, response, ttl = 30000) => {
  cacheManager.set(`api:${url}`, response, ttl);
};

export const getCachedApiResponse = (url) => {
  return cacheManager.get(`api:${url}`);
};

// Component state caching
export const cacheComponentState = (componentId, state, ttl = 60000) => {
  cacheManager.set(`component:${componentId}`, state, ttl);
};

export const getCachedComponentState = (componentId) => {
  return cacheManager.get(`component:${componentId}`);
};

// Performance metrics caching
export const cacheMetrics = (metrics, ttl = 10000) => {
  cacheManager.set('metrics:current', metrics, ttl);
};

export const getCachedMetrics = () => {
  return cacheManager.get('metrics:current');
};

export default cacheManager;