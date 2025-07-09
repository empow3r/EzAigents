// Performance Optimization Service for EzAugent Dashboard
import { debounce, throttle } from 'lodash';

class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessing = false;
    this.metrics = {
      requestCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      resourcesLoaded: 0
    };
    
    // Initialize performance monitoring
    this.initializeMonitoring();
    this.setupResourceOptimization();
  }

  // Data Transfer Optimization
  async optimizeDataTransfer(data, compressionLevel = 'medium') {
    // Implement compression based on data size and type
    const compressed = await this.compressData(data, compressionLevel);
    
    // Use chunking for large datasets
    if (compressed.size > 1024 * 1024) { // 1MB threshold
      return this.chunkData(compressed);
    }
    
    return compressed;
  }

  async compressData(data, level = 'medium') {
    const compressionOptions = {
      low: { quality: 0.8, speed: 'fast' },
      medium: { quality: 0.6, speed: 'balanced' },
      high: { quality: 0.4, speed: 'slow' }
    };
    
    const options = compressionOptions[level] || compressionOptions.medium;
    
    // For text data, use gzip compression
    if (typeof data === 'string') {
      return this.gzipCompress(data, options);
    }
    
    // For binary data, use more efficient compression
    return this.binaryCompress(data, options);
  }

  chunkData(data, chunkSize = 64 * 1024) { // 64KB chunks
    const chunks = [];
    let offset = 0;
    
    while (offset < data.length) {
      chunks.push(data.slice(offset, offset + chunkSize));
      offset += chunkSize;
    }
    
    return {
      chunks,
      totalSize: data.length,
      chunkCount: chunks.length
    };
  }

  // Intelligent Caching System
  async getWithCache(key, fetcher, ttl = 300000) { // 5 minutes default TTL
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      this.metrics.cacheHits++;
      return cached.data;
    }
    
    this.metrics.cacheMisses++;
    
    try {
      const data = await fetcher();
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        size: this.calculateSize(data)
      });
      
      // Implement cache size management
      this.manageCacheSize();
      
      return data;
    } catch (error) {
      // Return stale data if available during errors
      if (cached) {
        console.warn('Using stale cache data due to error:', error);
        return cached.data;
      }
      throw error;
    }
  }

  manageCacheSize() {
    const maxCacheSize = 50 * 1024 * 1024; // 50MB
    let currentSize = 0;
    
    for (const [key, value] of this.cache.entries()) {
      currentSize += value.size;
    }
    
    if (currentSize > maxCacheSize) {
      // Remove oldest entries first (LRU)
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (currentSize > maxCacheSize * 0.7 && entries.length > 0) {
        const [key, value] = entries.shift();
        this.cache.delete(key);
        currentSize -= value.size;
      }
    }
  }

  // Request Batching and Queuing
  async batchRequest(requests, maxBatchSize = 10) {
    const batches = [];
    
    for (let i = 0; i < requests.length; i += maxBatchSize) {
      batches.push(requests.slice(i, i + maxBatchSize));
    }
    
    const results = await Promise.allSettled(
      batches.map(batch => this.processBatch(batch))
    );
    
    return results.flatMap(result => 
      result.status === 'fulfilled' ? result.value : []
    );
  }

  async processBatch(batch) {
    return Promise.all(batch.map(request => this.processRequest(request)));
  }

  // Adaptive Loading Strategy
  async loadResourcesAdaptively(resources, priority = 'normal') {
    const strategies = {
      critical: { concurrency: 6, timeout: 5000 },
      high: { concurrency: 4, timeout: 10000 },
      normal: { concurrency: 2, timeout: 15000 },
      low: { concurrency: 1, timeout: 30000 }
    };
    
    const strategy = strategies[priority] || strategies.normal;
    
    return this.loadWithConcurrency(resources, strategy);
  }

  async loadWithConcurrency(resources, strategy) {
    const results = [];
    const executing = [];
    
    for (const resource of resources) {
      const promise = this.loadResource(resource, strategy.timeout);
      results.push(promise);
      
      if (resources.length >= strategy.concurrency) {
        executing.push(promise);
        
        if (executing.length >= strategy.concurrency) {
          await Promise.race(executing);
          executing.splice(executing.findIndex(p => p === promise), 1);
        }
      }
    }
    
    return Promise.allSettled(results);
  }

  // Memory Management
  optimizeMemoryUsage() {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear unused references
    this.cleanupUnusedData();
    
    // Monitor memory usage
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
      
      // Trigger cleanup if memory usage is high
      if (performance.memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
        this.emergencyCleanup();
      }
    }
  }

  cleanupUnusedData() {
    // Remove old cache entries
    const now = Date.now();
    const maxAge = 600000; // 10 minutes
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  emergencyCleanup() {
    // Clear all non-essential caches
    this.cache.clear();
    
    // Clear temporary data
    this.requestQueue.length = 0;
    
    // Notify about memory pressure
    this.dispatchEvent('memoryPressure', {
      memoryUsage: this.metrics.memoryUsage,
      action: 'emergency_cleanup'
    });
  }

  // Network Optimization
  async optimizeNetworkRequests(url, options = {}) {
    const optimizedOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json',
        'Cache-Control': 'max-age=300'
      }
    };
    
    // Implement request deduplication
    const requestKey = this.generateRequestKey(url, optimizedOptions);
    
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }
    
    const request = this.performOptimizedRequest(url, optimizedOptions);
    this.pendingRequests.set(requestKey, request);
    
    try {
      const result = await request;
      this.pendingRequests.delete(requestKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(requestKey);
      throw error;
    }
  }

  // Resource Prioritization
  prioritizeResources(resources) {
    return resources.sort((a, b) => {
      const priorityOrder = {
        critical: 0,
        high: 1,
        normal: 2,
        low: 3
      };
      
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Performance Monitoring
  initializeMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      this.recordLoadPerformance();
    });
    
    // Monitor resource loading
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordResourcePerformance(entry);
      }
    }).observe({ entryTypes: ['resource'] });
    
    // Monitor long tasks
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          this.recordLongTask(entry);
        }
      }
    }).observe({ entryTypes: ['longtask'] });
  }

  recordLoadPerformance() {
    const navigation = performance.getEntriesByType('navigation')[0];
    
    this.metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
    this.metrics.firstPaint = performance.getEntriesByType('paint')[0]?.startTime || 0;
    
    console.log('Load Performance:', this.metrics);
  }

  recordResourcePerformance(entry) {
    this.metrics.resourcesLoaded++;
    
    if (entry.duration > 1000) { // Resources taking longer than 1 second
      console.warn('Slow resource:', entry.name, 'Duration:', entry.duration);
    }
  }

  recordLongTask(entry) {
    console.warn('Long task detected:', entry.duration, 'ms');
    
    // Implement task breaking for future optimizations
    this.suggestTaskOptimization(entry);
  }

  // Adaptive Quality Management
  adjustQualityBasedOnPerformance() {
    const performanceScore = this.calculatePerformanceScore();
    
    if (performanceScore < 0.5) {
      // Reduce quality for better performance
      return {
        imageQuality: 'low',
        animationLevel: 'minimal',
        updateFrequency: 'slow',
        concurrency: 1
      };
    } else if (performanceScore < 0.8) {
      return {
        imageQuality: 'medium',
        animationLevel: 'reduced',
        updateFrequency: 'normal',
        concurrency: 2
      };
    } else {
      return {
        imageQuality: 'high',
        animationLevel: 'full',
        updateFrequency: 'fast',
        concurrency: 4
      };
    }
  }

  calculatePerformanceScore() {
    const factors = {
      memoryUsage: this.metrics.memoryUsage,
      loadTime: this.metrics.loadTime,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      networkLatency: this.metrics.averageResponseTime
    };
    
    // Weighted scoring algorithm
    let score = 1.0;
    
    // Memory usage impact
    if (factors.memoryUsage > 100 * 1024 * 1024) score *= 0.7;
    else if (factors.memoryUsage > 50 * 1024 * 1024) score *= 0.85;
    
    // Load time impact
    if (factors.loadTime > 3000) score *= 0.6;
    else if (factors.loadTime > 1000) score *= 0.8;
    
    // Cache hit rate impact
    score *= factors.cacheHitRate;
    
    // Network latency impact
    if (factors.networkLatency > 1000) score *= 0.7;
    else if (factors.networkLatency > 500) score *= 0.85;
    
    return Math.max(0, Math.min(1, score));
  }

  // Utility methods
  generateRequestKey(url, options) {
    return `${url}_${JSON.stringify(options)}`;
  }

  calculateSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  dispatchEvent(type, data) {
    window.dispatchEvent(new CustomEvent(`performance:${type}`, { detail: data }));
  }

  // Public API
  getMetrics() {
    return { ...this.metrics };
  }

  getRecommendations() {
    const quality = this.adjustQualityBasedOnPerformance();
    const performanceScore = this.calculatePerformanceScore();
    
    return {
      performanceScore,
      recommendedQuality: quality,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      memoryUsage: this.metrics.memoryUsage,
      optimizations: this.generateOptimizationSuggestions()
    };
  }

  generateOptimizationSuggestions() {
    const suggestions = [];
    
    if (this.metrics.memoryUsage > 50 * 1024 * 1024) {
      suggestions.push('Consider reducing cache size or clearing unused data');
    }
    
    if (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) < 0.5) {
      suggestions.push('Improve caching strategy for better performance');
    }
    
    if (this.metrics.averageResponseTime > 500) {
      suggestions.push('Optimize network requests or implement request batching');
    }
    
    return suggestions;
  }
}

// Export singleton instance
export default new PerformanceOptimizer();