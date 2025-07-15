/**
 * Enhanced Error Handling System
 * Provides circuit breaker, retry logic, and comprehensive error management
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        if (fallback) {
          return await fallback();
        }
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  shouldAttemptReset() {
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }
}

class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitter = options.jitter || true;
  }

  async executeWithRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation(attempt);
        if (attempt > 0) {
          console.log(`Operation succeeded on attempt ${attempt + 1}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          break;
        }
        
        if (!this.shouldRetry(error, attempt, context)) {
          break;
        }
        
        const delay = this.calculateDelay(attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }
    
    throw new EnhancedError(
      `Operation failed after ${this.maxRetries + 1} attempts`,
      'MAX_RETRIES_EXCEEDED',
      { originalError: lastError, attempts: this.maxRetries + 1 }
    );
  }

  shouldRetry(error, attempt, context) {
    // Don't retry on authentication errors
    if (error.code === 'AUTHENTICATION_FAILED' || error.status === 401) {
      return false;
    }
    
    // Don't retry on client errors (4xx) except for rate limiting
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }
    
    // Retry on server errors (5xx) and network errors
    if (error.status >= 500 || error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }
    
    // Custom retry logic based on context
    if (context.retryCondition) {
      return context.retryCondition(error, attempt);
    }
    
    return true;
  }

  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.backoffMultiplier, attempt);
    delay = Math.min(delay, this.maxDelay);
    
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class EnhancedError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.stack = (new Error()).stack;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class ErrorHandler {
  constructor() {
    this.circuitBreakers = new Map();
    this.retryManager = new RetryManager();
    this.errorCount = new Map();
    this.errorPatterns = new Map();
  }

  getCircuitBreaker(name, options = {}) {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(options));
    }
    return this.circuitBreakers.get(name);
  }

  async executeWithCircuitBreaker(name, operation, fallback = null, options = {}) {
    const circuitBreaker = this.getCircuitBreaker(name, options);
    return await circuitBreaker.execute(operation, fallback);
  }

  async executeWithRetry(operation, context = {}) {
    return await this.retryManager.executeWithRetry(operation, context);
  }

  async executeWithBoth(name, operation, context = {}) {
    const circuitBreaker = this.getCircuitBreaker(name, context.circuitBreakerOptions);
    
    return await circuitBreaker.execute(async () => {
      return await this.retryManager.executeWithRetry(operation, context);
    }, context.fallback);
  }

  recordError(error, context = {}) {
    const errorKey = `${error.code || 'UNKNOWN'}_${context.service || 'unknown'}`;
    this.errorCount.set(errorKey, (this.errorCount.get(errorKey) || 0) + 1);
    
    // Track error patterns
    const pattern = this.identifyErrorPattern(error);
    if (pattern) {
      this.errorPatterns.set(pattern, (this.errorPatterns.get(pattern) || 0) + 1);
    }
    
    console.error('Enhanced Error Recorded:', {
      error: error.toJSON ? error.toJSON() : error,
      context,
      pattern,
      timestamp: new Date().toISOString()
    });
  }

  identifyErrorPattern(error) {
    if (error.status === 429) return 'RATE_LIMIT';
    if (error.status >= 500) return 'SERVER_ERROR';
    if (error.status === 401) return 'AUTH_ERROR';
    if (error.code === 'NETWORK_ERROR') return 'NETWORK_ERROR';
    if (error.code === 'TIMEOUT') return 'TIMEOUT_ERROR';
    return 'UNKNOWN_PATTERN';
  }

  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCount),
      errorPatterns: Object.fromEntries(this.errorPatterns),
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([name, cb]) => [name, cb.getState()])
      )
    };
  }

  createAPIError(response, context = {}) {
    const status = response.status;
    let code = 'API_ERROR';
    let message = `API request failed with status ${status}`;
    
    if (status === 401) {
      code = 'AUTHENTICATION_FAILED';
      message = 'API authentication failed - check your API key';
    } else if (status === 403) {
      code = 'AUTHORIZATION_FAILED';
      message = 'API authorization failed - insufficient permissions';
    } else if (status === 429) {
      code = 'RATE_LIMIT_EXCEEDED';
      message = 'API rate limit exceeded';
    } else if (status >= 500) {
      code = 'SERVER_ERROR';
      message = 'Server error occurred';
    }
    
    return new EnhancedError(message, code, { ...context, status, url: response.url });
  }

  createNetworkError(error, context = {}) {
    let code = 'NETWORK_ERROR';
    let message = 'Network request failed';
    
    if (error.code === 'ENOTFOUND') {
      code = 'DNS_ERROR';
      message = 'DNS resolution failed';
    } else if (error.code === 'ECONNREFUSED') {
      code = 'CONNECTION_REFUSED';
      message = 'Connection refused';
    } else if (error.code === 'ETIMEDOUT') {
      code = 'TIMEOUT';
      message = 'Request timed out';
    }
    
    return new EnhancedError(message, code, { ...context, originalError: error });
  }

  async handleAPICall(apiCall, context = {}) {
    const serviceName = context.service || 'unknown';
    
    return await this.executeWithBoth(
      `api_${serviceName}`,
      async (attempt) => {
        try {
          const response = await apiCall();
          
          if (!response.ok) {
            const error = this.createAPIError(response, { ...context, attempt });
            this.recordError(error, context);
            throw error;
          }
          
          return response;
        } catch (error) {
          if (error instanceof EnhancedError) {
            throw error;
          }
          
          const enhancedError = this.createNetworkError(error, { ...context, attempt });
          this.recordError(enhancedError, context);
          throw enhancedError;
        }
      },
      {
        ...context,
        circuitBreakerOptions: {
          threshold: 3,
          timeout: 60000,
          resetTimeout: 30000
        }
      }
    );
  }
}

// Global error handler instance
const globalErrorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  EnhancedError,
  CircuitBreaker,
  RetryManager,
  globalErrorHandler
};