// Resource Management Service for EzAugent Dashboard
import PerformanceOptimizer from './performance-optimizer';

class ResourceManager {
  constructor() {
    this.resources = new Map();
    this.loadingQueue = [];
    this.loadedResources = new Set();
    this.failedResources = new Set();
    this.resourcePools = new Map();
    this.connectionPool = null;
    
    this.initializeResourcePools();
    this.setupConnectionPooling();
  }

  // Connection Pooling for HTTP Requests
  setupConnectionPooling() {
    this.connectionPool = {
      maxConnections: 6,
      activeConnections: 0,
      waitingQueue: [],
      reuseConnections: true,
      keepAlive: true,
      timeout: 30000
    };
  }

  async acquireConnection() {
    if (this.connectionPool.activeConnections < this.connectionPool.maxConnections) {
      this.connectionPool.activeConnections++;
      return this.createConnection();
    }
    
    // Wait for available connection
    return new Promise((resolve) => {
      this.connectionPool.waitingQueue.push(resolve);
    });
  }

  releaseConnection(connection) {
    this.connectionPool.activeConnections--;
    
    if (this.connectionPool.waitingQueue.length > 0) {
      const nextResolver = this.connectionPool.waitingQueue.shift();
      this.connectionPool.activeConnections++;
      nextResolver(connection);
    } else {
      // Connection can be reused or closed
      if (this.connectionPool.reuseConnections) {
        this.reuseConnection(connection);
      } else {
        this.closeConnection(connection);
      }
    }
  }

  // Resource Pooling for Reusable Objects
  initializeResourcePools() {
    this.resourcePools.set('imageBuffers', {
      pool: [],
      maxSize: 50,
      create: () => new ArrayBuffer(1024 * 1024), // 1MB buffer
      reset: (buffer) => buffer.fill(0),
      destroy: (buffer) => buffer = null
    });
    
    this.resourcePools.set('canvasContexts', {
      pool: [],
      maxSize: 10,
      create: () => {
        const canvas = document.createElement('canvas');
        return canvas.getContext('2d');
      },
      reset: (ctx) => ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height),
      destroy: (ctx) => ctx.canvas.remove()
    });
    
    this.resourcePools.set('workerThreads', {
      pool: [],
      maxSize: navigator.hardwareConcurrency || 4,
      create: () => new Worker('/workers/data-processor.js'),
      reset: (worker) => worker.postMessage({ type: 'reset' }),
      destroy: (worker) => worker.terminate()
    });
  }

  acquireResource(poolName) {
    const pool = this.resourcePools.get(poolName);
    if (!pool) throw new Error(`Resource pool ${poolName} not found`);
    
    if (pool.pool.length > 0) {
      const resource = pool.pool.pop();
      pool.reset(resource);
      return resource;
    }
    
    return pool.create();
  }

  releaseResource(poolName, resource) {
    const pool = this.resourcePools.get(poolName);
    if (!pool) return;
    
    if (pool.pool.length < pool.maxSize) {
      pool.pool.push(resource);
    } else {
      pool.destroy(resource);
    }
  }

  // Intelligent Resource Loading
  async loadResource(url, options = {}) {
    const resourceKey = this.generateResourceKey(url, options);
    
    // Check if already loaded
    if (this.loadedResources.has(resourceKey)) {
      return this.resources.get(resourceKey);
    }
    
    // Check if failed recently
    if (this.failedResources.has(resourceKey)) {
      throw new Error(`Resource ${url} failed to load recently`);
    }
    
    // Add to loading queue with priority
    const loadPromise = this.queueResourceLoad(url, options);
    
    try {
      const resource = await loadPromise;
      this.loadedResources.add(resourceKey);
      this.resources.set(resourceKey, resource);
      return resource;
    } catch (error) {
      this.failedResources.add(resourceKey);
      // Remove from failed set after 5 minutes
      setTimeout(() => this.failedResources.delete(resourceKey), 300000);
      throw error;
    }
  }

  async queueResourceLoad(url, options) {
    const priority = options.priority || 'normal';
    const resourceType = this.detectResourceType(url);
    
    return new Promise((resolve, reject) => {
      const loadTask = {
        url,
        options,
        priority,
        resourceType,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.loadingQueue.push(loadTask);
      this.loadingQueue.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      this.processLoadingQueue();
    });
  }

  async processLoadingQueue() {
    if (this.loadingQueue.length === 0) return;
    
    const availableConnections = this.connectionPool.maxConnections - this.connectionPool.activeConnections;
    const tasksToProcess = Math.min(availableConnections, this.loadingQueue.length);
    
    const tasks = this.loadingQueue.splice(0, tasksToProcess);
    
    await Promise.all(tasks.map(task => this.executeResourceLoad(task)));
  }

  async executeResourceLoad(task) {
    const connection = await this.acquireConnection();
    
    try {
      const resource = await this.performResourceLoad(task.url, task.options, connection);
      task.resolve(resource);
    } catch (error) {
      task.reject(error);
    } finally {
      this.releaseConnection(connection);
    }
  }

  // Resource Type Detection and Optimized Loading
  detectResourceType(url) {
    const extension = url.split('.').pop().toLowerCase();
    const typeMap = {
      'js': 'script',
      'css': 'stylesheet',
      'json': 'data',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'svg': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'mp4': 'video',
      'webm': 'video',
      'mp3': 'audio',
      'ogg': 'audio'
    };
    
    return typeMap[extension] || 'unknown';
  }

  async performResourceLoad(url, options, connection) {
    const resourceType = this.detectResourceType(url);
    
    switch (resourceType) {
      case 'script':
        return this.loadScript(url, options);
      case 'stylesheet':
        return this.loadStylesheet(url, options);
      case 'image':
        return this.loadImage(url, options);
      case 'data':
        return this.loadData(url, options, connection);
      case 'font':
        return this.loadFont(url, options);
      default:
        return this.loadGeneric(url, options, connection);
    }
  }

  async loadScript(url, options) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = options.defer || false;
      
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      
      document.head.appendChild(script);
    });
  }

  async loadStylesheet(url, options) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.media = options.media || 'all';
      
      link.onload = () => resolve(link);
      link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
      
      document.head.appendChild(link);
    });
  }

  async loadImage(url, options) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (options.crossOrigin) img.crossOrigin = options.crossOrigin;
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      img.src = url;
    });
  }

  async loadData(url, options, connection) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async loadFont(url, options) {
    const font = new FontFace(options.family || 'CustomFont', `url(${url})`);
    
    try {
      await font.load();
      document.fonts.add(font);
      return font;
    } catch (error) {
      throw new Error(`Failed to load font: ${url}`);
    }
  }

  // Memory Management
  optimizeMemoryUsage() {
    // Clear unused resources
    this.clearUnusedResources();
    
    // Optimize resource pools
    this.optimizeResourcePools();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  clearUnusedResources() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [key, resource] of this.resources.entries()) {
      if (now - resource.timestamp > maxAge && !resource.inUse) {
        this.resources.delete(key);
        this.loadedResources.delete(key);
        this.cleanupResource(resource);
      }
    }
  }

  optimizeResourcePools() {
    for (const [poolName, pool] of this.resourcePools.entries()) {
      // Keep only half the maximum size during optimization
      const targetSize = Math.floor(pool.maxSize / 2);
      
      while (pool.pool.length > targetSize) {
        const resource = pool.pool.pop();
        pool.destroy(resource);
      }
    }
  }

  cleanupResource(resource) {
    if (resource.element) {
      resource.element.remove();
    }
    
    if (resource.worker) {
      resource.worker.terminate();
    }
    
    if (resource.buffer) {
      resource.buffer = null;
    }
  }

  // Adaptive Loading Strategy
  adaptLoadingStrategy() {
    const performanceMetrics = PerformanceOptimizer.getMetrics();
    const networkInfo = navigator.connection;
    
    let strategy = {
      maxConcurrentLoads: 4,
      chunkSize: 64 * 1024,
      compressionLevel: 'medium',
      preloadDistance: 2
    };
    
    // Adapt based on network conditions
    if (networkInfo) {
      switch (networkInfo.effectiveType) {
        case 'slow-2g':
        case '2g':
          strategy.maxConcurrentLoads = 1;
          strategy.chunkSize = 16 * 1024;
          strategy.compressionLevel = 'high';
          strategy.preloadDistance = 0;
          break;
        case '3g':
          strategy.maxConcurrentLoads = 2;
          strategy.chunkSize = 32 * 1024;
          strategy.compressionLevel = 'medium';
          strategy.preloadDistance = 1;
          break;
        case '4g':
          strategy.maxConcurrentLoads = 6;
          strategy.chunkSize = 128 * 1024;
          strategy.compressionLevel = 'low';
          strategy.preloadDistance = 3;
          break;
      }
    }
    
    // Adapt based on memory usage
    if (performanceMetrics.memoryUsage > 100 * 1024 * 1024) {
      strategy.maxConcurrentLoads = Math.max(1, strategy.maxConcurrentLoads - 2);
      strategy.chunkSize = Math.max(16 * 1024, strategy.chunkSize / 2);
    }
    
    return strategy;
  }

  // Prefetching and Preloading
  async prefetchResources(urls, priority = 'low') {
    const strategy = this.adaptLoadingStrategy();
    
    // Limit prefetch distance based on performance
    const prefetchUrls = urls.slice(0, strategy.preloadDistance);
    
    const prefetchPromises = prefetchUrls.map(url => 
      this.loadResource(url, { priority, prefetch: true })
    );
    
    return Promise.allSettled(prefetchPromises);
  }

  preloadCriticalResources(urls) {
    return Promise.all(urls.map(url => 
      this.loadResource(url, { priority: 'critical' })
    ));
  }

  // Resource Metrics and Monitoring
  getResourceMetrics() {
    return {
      totalResources: this.resources.size,
      loadedResources: this.loadedResources.size,
      failedResources: this.failedResources.size,
      queueLength: this.loadingQueue.length,
      activeConnections: this.connectionPool.activeConnections,
      memoryUsage: this.calculateMemoryUsage(),
      poolUtilization: this.getPoolUtilization()
    };
  }

  calculateMemoryUsage() {
    let totalSize = 0;
    
    for (const resource of this.resources.values()) {
      totalSize += resource.size || 0;
    }
    
    return totalSize;
  }

  getPoolUtilization() {
    const utilization = {};
    
    for (const [poolName, pool] of this.resourcePools.entries()) {
      utilization[poolName] = {
        poolSize: pool.pool.length,
        maxSize: pool.maxSize,
        utilization: (pool.maxSize - pool.pool.length) / pool.maxSize
      };
    }
    
    return utilization;
  }

  // Utility methods
  generateResourceKey(url, options) {
    return `${url}_${JSON.stringify(options)}`;
  }

  createConnection() {
    return {
      id: Date.now(),
      created: Date.now(),
      lastUsed: Date.now(),
      requests: 0
    };
  }

  reuseConnection(connection) {
    connection.lastUsed = Date.now();
    connection.requests++;
  }

  closeConnection(connection) {
    // Connection cleanup logic
    connection = null;
  }
}

// Export singleton instance
export default new ResourceManager();