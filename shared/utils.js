// Shared Utilities Module
// Eliminates duplicate code for file operations, error handling, and common patterns

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

// File Operations
class FileUtils {
  // Ensure directory exists (used in 10+ files)
  static async ensureDirectory(dirPath) {
    try {
      if (!fsSync.existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to create directory ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  // Read file with automatic creation if missing
  static async readOrCreate(filePath, defaultContent = '') {
    try {
      const fullPath = path.resolve(filePath);
      if (!fsSync.existsSync(fullPath)) {
        // Ensure directory exists
        await FileUtils.ensureDirectory(path.dirname(fullPath));
        await fs.writeFile(fullPath, defaultContent);
        console.log(`📄 Created new file: ${fullPath}`);
        return defaultContent;
      }
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read/create file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  // Safe file write with backup
  static async safeWrite(filePath, content, createBackup = false) {
    try {
      const fullPath = path.resolve(filePath);
      await FileUtils.ensureDirectory(path.dirname(fullPath));
      
      if (createBackup && fsSync.existsSync(fullPath)) {
        const backupPath = `${fullPath}.backup`;
        await fs.copyFile(fullPath, backupPath);
      }
      
      await fs.writeFile(fullPath, content, 'utf-8');
      return fullPath;
    } catch (error) {
      console.error(`Failed to write file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  // Check if file exists
  static exists(filePath) {
    return fsSync.existsSync(path.resolve(filePath));
  }

  // Get file stats
  static async getStats(filePath) {
    try {
      return await fs.stat(path.resolve(filePath));
    } catch (error) {
      return null;
    }
  }

  // List directory contents
  static async listDirectory(dirPath, filter = null) {
    try {
      const files = await fs.readdir(dirPath);
      if (filter) {
        return files.filter(filter);
      }
      return files;
    } catch (error) {
      console.error(`Failed to list directory ${dirPath}: ${error.message}`);
      return [];
    }
  }
}

// Error Handling Utilities
class ErrorUtils {
  // Format error for logging (used in 18+ files)
  static formatError(error, context = {}) {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      context,
      timestamp: new Date().toISOString()
    };
  }

  // Log error with consistent format
  static logError(component, operation, error, details = {}) {
    const formatted = ErrorUtils.formatError(error, details);
    console.error(`❌ ${component} [${operation}] error:`, formatted.message);
    
    if (process.env.DEBUG === 'true') {
      console.error('Stack:', formatted.stack);
      console.error('Context:', formatted.context);
    }
    
    return formatted;
  }

  // Create standardized error response
  static createErrorResponse(error, statusCode = 500) {
    return {
      success: false,
      error: {
        message: error.message || 'An error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        statusCode
      }
    };
  }

  // Retry logic with exponential backoff
  static async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retry attempt ${attempt}/${maxRetries} after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

// String and Data Utilities
class DataUtils {
  // Generate unique ID
  static generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  // Safe JSON parse
  static safeJsonParse(str, defaultValue = null) {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.warn('Failed to parse JSON:', error.message);
      return defaultValue;
    }
  }

  // Deep clone object
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Truncate string with ellipsis
  static truncate(str, maxLength = 100) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  // Format bytes to human readable
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Format duration to human readable
  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Time and Date Utilities
class TimeUtils {
  // Sleep/delay function
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get timestamp
  static timestamp() {
    return new Date().toISOString();
  }

  // Format date
  static formatDate(date = new Date(), format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    
    const replacements = {
      'YYYY': d.getFullYear(),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0')
    };
    
    let formatted = format;
    for (const [key, value] of Object.entries(replacements)) {
      formatted = formatted.replace(key, value);
    }
    
    return formatted;
  }

  // Calculate time difference
  static timeDiff(start, end = Date.now()) {
    return end - start;
  }
}

// Process Utilities
class ProcessUtils {
  // Graceful shutdown handler
  static setupGracefulShutdown(cleanupFn) {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        await cleanupFn();
        console.log('✅ Cleanup completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  // Get memory usage
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: DataUtils.formatBytes(usage.rss),
      heapTotal: DataUtils.formatBytes(usage.heapTotal),
      heapUsed: DataUtils.formatBytes(usage.heapUsed),
      external: DataUtils.formatBytes(usage.external),
      arrayBuffers: DataUtils.formatBytes(usage.arrayBuffers)
    };
  }

  // Get process info
  static getProcessInfo() {
    return {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: DataUtils.formatDuration(process.uptime() * 1000),
      memory: ProcessUtils.getMemoryUsage()
    };
  }
}

// Validation Utilities
class ValidationUtils {
  // Validate required fields
  static validateRequired(data, requiredFields) {
    const missing = [];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }

  // Validate data type
  static validateType(value, expectedType) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (actualType !== expectedType) {
      throw new Error(`Expected ${expectedType} but got ${actualType}`);
    }
    
    return true;
  }

  // Validate enum value
  static validateEnum(value, allowedValues) {
    if (!allowedValues.includes(value)) {
      throw new Error(`Invalid value: ${value}. Allowed: ${allowedValues.join(', ')}`);
    }
    
    return true;
  }
}

// Task Management Utilities
class TaskUtils {
  // Check for available tasks and suggest next action
  static async checkTaskQueue(agentName) {
    try {
      const TaskManager = require('../scripts/task-manager');
      const taskManager = new TaskManager();
      
      console.log(`\n🔄 ${agentName} checking task queue...`);
      const nextTask = await taskManager.getNextTask(agentName.toLowerCase());
      
      if (nextTask) {
        console.log(`\n🎯 Recommended next task for ${agentName}:`);
        console.log(`[${nextTask.id}] ${nextTask.title} (${nextTask.priority})`);
        console.log(`📝 ${nextTask.description}`);
        console.log(`\n💡 To claim: node scripts/task-manager.js claim ${nextTask.id} ${agentName}`);
        console.log(`📋 Instructions: ${nextTask.instructions}`);
        
        return nextTask;
      } else {
        console.log(`✅ No available tasks for ${agentName}!`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Failed to check task queue: ${error.message}`);
      return null;
    }
  }

  // Auto-claim next available task
  static async autoClaimTask(agentName) {
    try {
      const TaskManager = require('../scripts/task-manager');
      const taskManager = new TaskManager();
      
      const nextTask = await taskManager.getNextTask(agentName.toLowerCase());
      if (nextTask) {
        const claimed = await taskManager.claimTask(nextTask.id, agentName);
        if (claimed) {
          console.log(`🎉 ${agentName} automatically claimed ${nextTask.id}!`);
          return nextTask;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Failed to auto-claim task: ${error.message}`);
      return null;
    }
  }
}

// Export all utilities
module.exports = {
  FileUtils,
  ErrorUtils,
  DataUtils,
  TimeUtils,
  ProcessUtils,
  ValidationUtils,
  TaskUtils,
  
  // Convenience exports
  ensureDirectory: FileUtils.ensureDirectory,
  readOrCreate: FileUtils.readOrCreate,
  safeWrite: FileUtils.safeWrite,
  formatError: ErrorUtils.formatError,
  logError: ErrorUtils.logError,
  retryWithBackoff: ErrorUtils.retryWithBackoff,
  generateId: DataUtils.generateId,
  sleep: TimeUtils.sleep,
  timestamp: TimeUtils.timestamp,
  setupGracefulShutdown: ProcessUtils.setupGracefulShutdown,
  checkTaskQueue: TaskUtils.checkTaskQueue,
  autoClaimTask: TaskUtils.autoClaimTask
};