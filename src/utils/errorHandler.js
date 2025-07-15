/**
 * Centralized error handling utilities for EzAigents
 * Provides secure, consistent error handling across all components
 */

class ErrorHandler {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Sanitize error message for safe client exposure
   */
  sanitizeError(error) {
    if (typeof error === 'string') {
      // Remove potential sensitive patterns
      return error
        .replace(/api[_-]?key[s]?[=:]\s*[\w-]+/gi, 'api_key=***')
        .replace(/password[=:]\s*[\w-]+/gi, 'password=***')
        .replace(/token[=:]\s*[\w-]+/gi, 'token=***')
        .replace(/secret[=:]\s*[\w-]+/gi, 'secret=***')
        .replace(/\/[A-Za-z]:[\\\/].*/g, '[file_path]') // Windows paths
        .replace(/\/[a-zA-Z0-9_\-\.\/]+/g, '[file_path]'); // Unix paths
    }
    
    if (error instanceof Error) {
      return this.sanitizeError(error.message);
    }
    
    return 'Internal error occurred';
  }

  /**
   * Create standardized error response for APIs
   */
  createErrorResponse(message, details = null, statusCode = 500) {
    const response = {
      success: false,
      error: typeof message === 'string' ? message : 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId()
    };

    // Only include details in development or if explicitly safe
    if (this.isDevelopment && details) {
      response.details = this.sanitizeError(details);
    }

    return { response, statusCode };
  }

  /**
   * Secure logging function
   */
  log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level: level.toUpperCase(),
      message: this.sanitizeError(message),
      timestamp,
      ...this.sanitizeContext(context)
    };

    // Log to console (can be replaced with proper logger)
    if (this.shouldLog(level)) {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Sanitize logging context to prevent sensitive data exposure
   */
  sanitizeContext(context) {
    if (!context || typeof context !== 'object') {
      return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(context)) {
      const keyLower = key.toLowerCase();
      
      // Skip sensitive keys entirely
      if (keyLower.includes('password') || 
          keyLower.includes('secret') ||
          keyLower.includes('token') ||
          keyLower.includes('key')) {
        sanitized[key] = '***';
        continue;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeError(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.logLevel] || 2;
    const messageLevel = levels[level] || 0;
    return messageLevel <= currentLevel;
  }

  /**
   * Generate unique request ID for tracking
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Error handling for async operations
   */
  async handleAsync(asyncFn, context = {}) {
    try {
      return await asyncFn();
    } catch (error) {
      this.log('error', 'Async operation failed', {
        error: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        ...context
      });
      throw error;
    }
  }

  /**
   * Cleanup handler for graceful shutdowns
   */
  async cleanup(resources = []) {
    const errors = [];
    
    for (const resource of resources) {
      try {
        if (typeof resource.cleanup === 'function') {
          await resource.cleanup();
        } else if (typeof resource.close === 'function') {
          await resource.close();
        } else if (typeof resource.destroy === 'function') {
          await resource.destroy();
        }
      } catch (error) {
        errors.push(error);
        this.log('warn', 'Resource cleanup failed', {
          resource: resource.constructor?.name || 'unknown',
          error: error.message
        });
      }
    }

    if (errors.length > 0) {
      throw new Error(`Cleanup completed with ${errors.length} errors`);
    }
  }
}

/**
 * Express.js middleware for consistent error handling
 */
function createErrorMiddleware(errorHandler) {
  return (error, req, res, next) => {
    const { response, statusCode } = errorHandler.createErrorResponse(
      error.message,
      error.details || error.stack,
      error.statusCode || 500
    );

    errorHandler.log('error', 'Request failed', {
      method: req.method,
      url: req.url,
      error: error.message,
      statusCode
    });

    res.status(statusCode).json(response);
  };
}

/**
 * Process-level error handlers
 */
function setupGlobalErrorHandlers(errorHandler) {
  process.on('uncaughtException', (error) => {
    errorHandler.log('error', 'Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    errorHandler.log('error', 'Unhandled promise rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack
    });
  });
}

// Export singleton instance and utilities
const defaultErrorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  defaultErrorHandler,
  createErrorMiddleware,
  setupGlobalErrorHandlers,
  
  // Convenience methods
  sanitizeError: (error) => defaultErrorHandler.sanitizeError(error),
  createErrorResponse: (...args) => defaultErrorHandler.createErrorResponse(...args),
  log: (...args) => defaultErrorHandler.log(...args)
};