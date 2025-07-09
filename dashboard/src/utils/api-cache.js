// API Cache Utility - Prevents redundant requests and improves performance
class APICache {
  constructor(options = {}) {
    this.cache = new Map();
    this.pending = new Map();
    this.maxAge = options.maxAge || 30000; // 30 seconds default
    this.maxSize = options.maxSize || 100; // Max cache entries
  }

  // Generate cache key from URL and options
  getCacheKey(url, options = {}) {
    return `${url}-${JSON.stringify(options)}`;
  }

  // Check if cache entry is still valid
  isValid(entry) {
    return Date.now() - entry.timestamp < this.maxAge;
  }

  // Clean old entries if cache is too large
  cleanup() {
    if (this.cache.size <= this.maxSize) return;
    
    // Remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    while (this.cache.size > this.maxSize * 0.8) {
      const [key] = entries.shift();
      this.cache.delete(key);
    }
  }

  // Get cached data if available and valid
  get(url, options) {
    const key = this.getCacheKey(url, options);
    const entry = this.cache.get(key);
    
    if (entry && this.isValid(entry)) {
      return entry.data;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // Set cache entry
  set(url, options, data) {
    const key = this.getCacheKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.cleanup();
  }

  // Deduplicated fetch - prevents multiple identical requests
  async fetch(url, options = {}) {
    const key = this.getCacheKey(url, options);
    
    // Check cache first
    const cached = this.get(url, options);
    if (cached !== null) {
      return Promise.resolve(cached);
    }
    
    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    // Make the request
    const request = fetch(url, options)
      .then(res => res.json())
      .then(data => {
        this.set(url, options, data);
        this.pending.delete(key);
        return data;
      })
      .catch(error => {
        this.pending.delete(key);
        throw error;
      });
    
    this.pending.set(key, request);
    return request;
  }

  // Clear specific cache entry
  invalidate(url, options) {
    const key = this.getCacheKey(url, options);
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.pending.clear();
  }
}

// Create singleton instance with default settings
const apiCache = new APICache({
  maxAge: 30000, // 30 seconds
  maxSize: 100
});

// Enhanced fetch wrapper with caching and error handling
export async function cachedFetch(url, options = {}) {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    const data = await apiCache.fetch(url, fetchOptions);
    clearTimeout(timeout);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

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

// Export utilities
export default apiCache;
export { APICache };