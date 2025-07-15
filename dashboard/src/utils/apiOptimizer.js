// API request batching and optimization
class APIOptimizer {
  constructor() {
    this.batchQueue = new Map();
    this.batchTimeout = null;
    this.batchDelay = 10; // ms
  }

  // Batch multiple API calls
  batchRequest(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      const key = `${endpoint}-${JSON.stringify(params)}`;
      
      if (!this.batchQueue.has(endpoint)) {
        this.batchQueue.set(endpoint, []);
      }
      
      this.batchQueue.get(endpoint).push({
        key,
        params,
        resolve,
        reject
      });
      
      // Schedule batch processing
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.batchDelay);
    });
  }

  async processBatch() {
    const batches = new Map(this.batchQueue);
    this.batchQueue.clear();
    
    for (const [endpoint, requests] of batches) {
      try {
        // Send batched request
        const response = await fetch(`${endpoint}/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Batch-Request': 'true'
          },
          body: JSON.stringify({
            requests: requests.map(r => r.params)
          })
        });
        
        if (!response.ok) throw new Error('Batch request failed');
        
        const results = await response.json();
        
        // Resolve individual promises
        requests.forEach((request, index) => {
          request.resolve(results[index]);
        });
      } catch (error) {
        // Fallback to individual requests
        requests.forEach(async (request) => {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(request.params)
            });
            const data = await response.json();
            request.resolve(data);
          } catch (err) {
            request.reject(err);
          }
        });
      }
    }
  }

  // Compress request payloads
  async compressRequest(data) {
    const encoder = new TextEncoder();
    const dataArray = encoder.encode(JSON.stringify(data));
    
    // Use CompressionStream API if available
    if ('CompressionStream' in window) {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(dataArray);
      writer.close();
      
      const compressed = await new Response(cs.readable).arrayBuffer();
      return new Uint8Array(compressed);
    }
    
    return dataArray;
  }

  // Deduplicate concurrent requests
  dedupeRequest(key, fetcher) {
    if (!this.inFlightRequests) {
      this.inFlightRequests = new Map();
    }
    
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key);
    }
    
    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });
    
    this.inFlightRequests.set(key, promise);
    return promise;
  }
}

export const apiOptimizer = new APIOptimizer();

// Optimized fetch wrapper
export const optimizedFetch = async (url, options = {}) => {
  const key = `${url}-${JSON.stringify(options)}`;
  
  return apiOptimizer.dedupeRequest(key, async () => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Accept-Encoding': 'br, gzip, deflate',
      }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    return response.json();
  });
};