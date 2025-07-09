// Data Optimization Service for EzAugent Dashboard
import PerformanceOptimizer from './performance-optimizer';
import ResourceManager from './resource-manager';

class DataOptimizer {
  constructor() {
    this.compressionWorker = null;
    this.dataCache = new Map();
    this.compressionQueue = [];
    this.isProcessing = false;
    this.streamingBuffers = new Map();
    this.deltaCache = new Map();
    
    this.initializeWorkers();
    this.setupStreaming();
  }

  // Initialize Web Workers for data processing
  initializeWorkers() {
    if (typeof Worker !== 'undefined') {
      this.compressionWorker = new Worker('/workers/compression-worker.js');
      this.compressionWorker.onmessage = this.handleWorkerMessage.bind(this);
    }
  }

  // Data Compression and Decompression
  async compressData(data, options = {}) {
    const method = options.method || 'auto';
    const level = options.level || 'medium';
    
    if (this.compressionWorker) {
      return this.compressWithWorker(data, method, level);
    }
    
    return this.compressInMainThread(data, method, level);
  }

  async compressWithWorker(data, method, level) {
    return new Promise((resolve, reject) => {
      const requestId = `compress-${Date.now()}`;
      
      this.compressionQueue.push({
        id: requestId,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.compressionWorker.postMessage({
        id: requestId,
        type: 'compress',
        data,
        method,
        level
      });
    });
  }

  compressInMainThread(data, method, level) {
    switch (method) {
      case 'json':
        return this.compressJSON(data, level);
      case 'text':
        return this.compressText(data, level);
      case 'binary':
        return this.compressBinary(data, level);
      case 'auto':
        return this.autoCompress(data, level);
      default:
        return this.autoCompress(data, level);
    }
  }

  compressJSON(data, level) {
    const jsonString = JSON.stringify(data);
    
    // Remove whitespace and optimize structure
    const optimized = this.optimizeJSONStructure(data);
    
    // Apply compression based on level
    switch (level) {
      case 'high':
        return this.applyHighCompression(optimized);
      case 'medium':
        return this.applyMediumCompression(optimized);
      case 'low':
        return this.applyLowCompression(optimized);
      default:
        return optimized;
    }
  }

  optimizeJSONStructure(data) {
    if (Array.isArray(data)) {
      return this.optimizeArray(data);
    } else if (typeof data === 'object' && data !== null) {
      return this.optimizeObject(data);
    }
    return data;
  }

  optimizeArray(arr) {
    // Use columnar format for large arrays of objects
    if (arr.length > 100 && arr.every(item => typeof item === 'object')) {
      return this.arrayToColumnar(arr);
    }
    
    return arr.map(item => this.optimizeJSONStructure(item));
  }

  optimizeObject(obj) {
    const optimized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip null/undefined values
      if (value === null || value === undefined) {
        continue;
      }
      
      // Compress common patterns
      if (key === 'timestamp' && typeof value === 'number') {
        optimized[key] = this.compressTimestamp(value);
      } else if (key === 'id' && typeof value === 'string') {
        optimized[key] = this.compressId(value);
      } else {
        optimized[key] = this.optimizeJSONStructure(value);
      }
    }
    
    return optimized;
  }

  arrayToColumnar(arr) {
    if (arr.length === 0) return arr;
    
    const columns = {};
    const keys = Object.keys(arr[0]);
    
    // Initialize columns
    keys.forEach(key => {
      columns[key] = [];
    });
    
    // Fill columns
    arr.forEach(item => {
      keys.forEach(key => {
        columns[key].push(item[key]);
      });
    });
    
    return {
      _format: 'columnar',
      _length: arr.length,
      _columns: columns
    };
  }

  compressTimestamp(timestamp) {
    // Use relative timestamps from a base
    const base = 1640995200000; // 2022-01-01
    return timestamp - base;
  }

  compressId(id) {
    // Compress UUIDs and common ID patterns
    if (id.length === 36 && id.includes('-')) {
      return id.replace(/-/g, '');
    }
    return id;
  }

  // Delta Compression for Real-time Data
  async applyDeltaCompression(newData, previousData) {
    if (!previousData) {
      return {
        type: 'full',
        data: newData
      };
    }
    
    const delta = this.calculateDelta(newData, previousData);
    
    if (this.getDeltaSize(delta) < this.getDataSize(newData) * 0.7) {
      return {
        type: 'delta',
        data: delta,
        base: this.getDataHash(previousData)
      };
    }
    
    return {
      type: 'full',
      data: newData
    };
  }

  calculateDelta(newData, oldData) {
    const delta = {};
    
    for (const [key, newValue] of Object.entries(newData)) {
      const oldValue = oldData[key];
      
      if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        delta[key] = newValue;
      }
    }
    
    // Track removed keys
    const removedKeys = Object.keys(oldData).filter(key => !(key in newData));
    if (removedKeys.length > 0) {
      delta._removed = removedKeys;
    }
    
    return delta;
  }

  applyDelta(baseData, delta) {
    const result = { ...baseData };
    
    // Apply changes
    for (const [key, value] of Object.entries(delta)) {
      if (key !== '_removed') {
        result[key] = value;
      }
    }
    
    // Remove deleted keys
    if (delta._removed) {
      delta._removed.forEach(key => {
        delete result[key];
      });
    }
    
    return result;
  }

  // Data Streaming and Chunking
  setupStreaming() {
    this.streamingBuffers = new Map();
    this.chunkSize = 64 * 1024; // 64KB chunks
    this.maxBufferSize = 1024 * 1024; // 1MB max buffer
  }

  async streamData(data, streamId, options = {}) {
    const chunkSize = options.chunkSize || this.chunkSize;
    const compressed = await this.compressData(data, options);
    
    const chunks = this.createChunks(compressed, chunkSize);
    
    return {
      streamId,
      totalChunks: chunks.length,
      totalSize: compressed.length,
      chunks: chunks.map((chunk, index) => ({
        id: `${streamId}-${index}`,
        index,
        data: chunk,
        size: chunk.length
      }))
    };
  }

  createChunks(data, chunkSize) {
    const chunks = [];
    let offset = 0;
    
    while (offset < data.length) {
      chunks.push(data.slice(offset, offset + chunkSize));
      offset += chunkSize;
    }
    
    return chunks;
  }

  async receiveChunk(chunk) {
    const { streamId, index, data } = chunk;
    
    if (!this.streamingBuffers.has(streamId)) {
      this.streamingBuffers.set(streamId, {
        chunks: new Map(),
        receivedCount: 0,
        totalChunks: 0,
        totalSize: 0
      });
    }
    
    const buffer = this.streamingBuffers.get(streamId);
    buffer.chunks.set(index, data);
    buffer.receivedCount++;
    
    // Check if all chunks received
    if (buffer.receivedCount === buffer.totalChunks) {
      return this.assembleStream(streamId);
    }
    
    return null;
  }

  assembleStream(streamId) {
    const buffer = this.streamingBuffers.get(streamId);
    
    if (!buffer) {
      throw new Error(`Stream ${streamId} not found`);
    }
    
    const chunks = [];
    
    for (let i = 0; i < buffer.totalChunks; i++) {
      const chunk = buffer.chunks.get(i);
      
      if (!chunk) {
        throw new Error(`Missing chunk ${i} for stream ${streamId}`);
      }
      
      chunks.push(chunk);
    }
    
    this.streamingBuffers.delete(streamId);
    
    return this.concatenateChunks(chunks);
  }

  concatenateChunks(chunks) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  // Data Deduplication
  async deduplicateData(data, options = {}) {
    const hashFunction = options.hashFunction || 'sha256';
    const dedupLevel = options.level || 'medium';
    
    switch (dedupLevel) {
      case 'high':
        return this.deepDeduplication(data, hashFunction);
      case 'medium':
        return this.mediumDeduplication(data, hashFunction);
      case 'low':
        return this.shallowDeduplication(data, hashFunction);
      default:
        return this.mediumDeduplication(data, hashFunction);
    }
  }

  deepDeduplication(data, hashFunction) {
    const dedupMap = new Map();
    const result = this.processDeepDeduplication(data, dedupMap, hashFunction);
    
    return {
      data: result,
      dedupMap: Array.from(dedupMap.entries()),
      savings: this.calculateSavings(data, result)
    };
  }

  processDeepDeduplication(data, dedupMap, hashFunction) {
    if (Array.isArray(data)) {
      return data.map(item => this.processDeepDeduplication(item, dedupMap, hashFunction));
    }
    
    if (typeof data === 'object' && data !== null) {
      const hash = this.calculateHash(data, hashFunction);
      
      if (dedupMap.has(hash)) {
        return { _ref: hash };
      }
      
      const processed = {};
      
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.processDeepDeduplication(value, dedupMap, hashFunction);
      }
      
      dedupMap.set(hash, processed);
      return processed;
    }
    
    return data;
  }

  // Data Validation and Sanitization
  validateAndSanitize(data, schema) {
    const sanitized = this.sanitizeData(data);
    const validated = this.validateData(sanitized, schema);
    
    return {
      data: validated.data,
      valid: validated.valid,
      errors: validated.errors
    };
  }

  sanitizeData(data) {
    if (typeof data === 'string') {
      return data
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .trim();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeData(key);
        sanitized[sanitizedKey] = this.sanitizeData(value);
      }
      
      return sanitized;
    }
    
    return data;
  }

  validateData(data, schema) {
    const errors = [];
    
    try {
      const validated = this.validateAgainstSchema(data, schema, errors);
      
      return {
        data: validated,
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(error.message);
      
      return {
        data: null,
        valid: false,
        errors
      };
    }
  }

  // Utility Methods
  handleWorkerMessage(event) {
    const { id, type, result, error } = event.data;
    
    const request = this.compressionQueue.find(req => req.id === id);
    
    if (request) {
      this.compressionQueue = this.compressionQueue.filter(req => req.id !== id);
      
      if (error) {
        request.reject(new Error(error));
      } else {
        request.resolve(result);
      }
    }
  }

  getDataSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  getDeltaSize(delta) {
    return new Blob([JSON.stringify(delta)]).size;
  }

  getDataHash(data) {
    return this.calculateHash(data, 'sha256');
  }

  calculateHash(data, algorithm) {
    // Simple hash function (in production, use crypto.subtle.digest)
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  calculateSavings(original, compressed) {
    const originalSize = this.getDataSize(original);
    const compressedSize = this.getDataSize(compressed);
    
    return {
      originalSize,
      compressedSize,
      savings: originalSize - compressedSize,
      ratio: compressedSize / originalSize
    };
  }

  // Public API
  async optimizePayload(data, options = {}) {
    const startTime = Date.now();
    
    // Apply optimizations in sequence
    let optimized = data;
    
    if (options.sanitize) {
      optimized = this.sanitizeData(optimized);
    }
    
    if (options.deduplicate) {
      const dedupResult = await this.deduplicateData(optimized, options.deduplicate);
      optimized = dedupResult.data;
    }
    
    if (options.compress) {
      optimized = await this.compressData(optimized, options.compress);
    }
    
    const endTime = Date.now();
    
    return {
      data: optimized,
      originalSize: this.getDataSize(data),
      optimizedSize: this.getDataSize(optimized),
      processingTime: endTime - startTime,
      savings: this.calculateSavings(data, optimized)
    };
  }

  getOptimizationStats() {
    return {
      compressionQueueLength: this.compressionQueue.length,
      activeBStreams: this.streamingBuffers.size,
      cacheSize: this.dataCache.size,
      deltaCache: this.deltaCache.size
    };
  }
}

// Export singleton instance
export default new DataOptimizer();