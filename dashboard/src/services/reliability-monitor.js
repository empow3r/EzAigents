// Reliability Monitoring Service for EzAugent Dashboard
// Ensures system reliability while maintaining performance optimizations

class ReliabilityMonitor {
  constructor() {
    this.healthChecks = new Map();
    this.errorTracking = new ErrorTracker();
    this.redundancyManager = new RedundancyManager();
    this.fallbackSystem = new FallbackSystem();
    this.alertSystem = new AlertSystem();
    this.recoveryManager = new RecoveryManager();
    
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    this.setupHealthChecks();
    this.setupErrorTracking();
    this.setupRedundancy();
    this.setupFallbacks();
    this.setupAlerts();
    this.setupRecovery();
  }

  // Health Check System
  setupHealthChecks() {
    const checks = [
      {
        name: 'api-connectivity',
        check: () => this.checkAPIConnectivity(),
        interval: 30000,
        timeout: 5000,
        retries: 3
      },
      {
        name: 'database-health',
        check: () => this.checkDatabaseHealth(),
        interval: 60000,
        timeout: 10000,
        retries: 2
      },
      {
        name: 'memory-usage',
        check: () => this.checkMemoryUsage(),
        interval: 15000,
        timeout: 1000,
        retries: 1
      },
      {
        name: 'cpu-usage',
        check: () => this.checkCPUUsage(),
        interval: 15000,
        timeout: 1000,
        retries: 1
      },
      {
        name: 'network-latency',
        check: () => this.checkNetworkLatency(),
        interval: 45000,
        timeout: 5000,
        retries: 3
      }
    ];

    checks.forEach(check => {
      this.healthChecks.set(check.name, {
        ...check,
        status: 'unknown',
        lastCheck: null,
        lastSuccess: null,
        failures: 0,
        interval: setInterval(() => this.runHealthCheck(check.name), check.interval)
      });
    });
  }

  async runHealthCheck(checkName) {
    const check = this.healthChecks.get(checkName);
    if (!check) return;

    const startTime = Date.now();
    let attempt = 0;
    
    while (attempt < check.retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), check.timeout);
        
        const result = await Promise.race([
          check.check(),
          new Promise((_, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new Error('Health check timeout'));
            });
          })
        ]);
        
        clearTimeout(timeoutId);
        
        // Health check passed
        check.status = 'healthy';
        check.lastCheck = Date.now();
        check.lastSuccess = Date.now();
        check.failures = 0;
        check.responseTime = Date.now() - startTime;
        
        this.onHealthCheckSuccess(checkName, result);
        return;
        
      } catch (error) {
        attempt++;
        
        if (attempt >= check.retries) {
          // Health check failed after all retries
          check.status = 'unhealthy';
          check.lastCheck = Date.now();
          check.failures++;
          check.lastError = error.message;
          
          this.onHealthCheckFailure(checkName, error);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  async checkAPIConnectivity() {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`API health check failed: ${response.status}`);
    }
    
    return response.json();
  }

  async checkDatabaseHealth() {
    const response = await fetch('/api/db/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Database health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'healthy') {
      throw new Error(`Database is unhealthy: ${data.message}`);
    }
    
    return data;
  }

  checkMemoryUsage() {
    if (!performance.memory) {
      return { status: 'unknown', message: 'Memory API not available' };
    }
    
    const usage = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const percentage = (usage / limit) * 100;
    
    if (percentage > 90) {
      throw new Error(`Memory usage critical: ${percentage.toFixed(1)}%`);
    }
    
    if (percentage > 75) {
      console.warn(`Memory usage high: ${percentage.toFixed(1)}%`);
    }
    
    return {
      status: 'healthy',
      usage,
      limit,
      percentage
    };
  }

  checkCPUUsage() {
    // Approximate CPU usage check using timing
    const start = performance.now();
    let iterations = 0;
    
    while (performance.now() - start < 10) {
      iterations++;
    }
    
    const actualTime = performance.now() - start;
    const expectedIterations = iterations * (10 / actualTime);
    const cpuLoad = Math.max(0, 1 - (expectedIterations / iterations));
    
    if (cpuLoad > 0.9) {
      throw new Error(`CPU usage critical: ${(cpuLoad * 100).toFixed(1)}%`);
    }
    
    return {
      status: 'healthy',
      load: cpuLoad,
      percentage: cpuLoad * 100
    };
  }

  async checkNetworkLatency() {
    const start = performance.now();
    
    const response = await fetch('/api/ping', {
      method: 'GET',
      cache: 'no-cache'
    });
    
    const latency = performance.now() - start;
    
    if (latency > 2000) {
      throw new Error(`Network latency too high: ${latency}ms`);
    }
    
    return {
      status: 'healthy',
      latency,
      timestamp: Date.now()
    };
  }

  // Error Tracking and Recovery
  setupErrorTracking() {
    this.errorTracking.initialize();
  }

  setupRedundancy() {
    this.redundancyManager.initialize();
  }

  setupFallbacks() {
    this.fallbackSystem.initialize();
  }

  setupAlerts() {
    this.alertSystem.initialize();
  }

  setupRecovery() {
    this.recoveryManager.initialize();
  }

  // Event Handlers
  onHealthCheckSuccess(checkName, result) {
    console.log(`Health check ${checkName} passed:`, result);
    
    // Recovery actions if previously failed
    if (this.healthChecks.get(checkName).failures > 0) {
      this.recoveryManager.handleRecovery(checkName);
    }
  }

  onHealthCheckFailure(checkName, error) {
    console.error(`Health check ${checkName} failed:`, error);
    
    // Trigger alerts
    this.alertSystem.triggerAlert(checkName, error);
    
    // Attempt recovery
    this.recoveryManager.attemptRecovery(checkName, error);
    
    // Enable fallbacks
    this.fallbackSystem.enableFallback(checkName);
  }

  // Public API
  getHealthStatus() {
    const status = {};
    
    for (const [name, check] of this.healthChecks.entries()) {
      status[name] = {
        status: check.status,
        lastCheck: check.lastCheck,
        lastSuccess: check.lastSuccess,
        failures: check.failures,
        responseTime: check.responseTime,
        lastError: check.lastError
      };
    }
    
    return status;
  }

  getOverallHealth() {
    const checks = Array.from(this.healthChecks.values());
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const total = checks.length;
    
    return {
      healthy,
      total,
      percentage: (healthy / total) * 100,
      status: healthy === total ? 'healthy' : healthy > total * 0.7 ? 'degraded' : 'unhealthy'
    };
  }

  async runAllHealthChecks() {
    const promises = Array.from(this.healthChecks.keys()).map(name => 
      this.runHealthCheck(name)
    );
    
    await Promise.allSettled(promises);
    return this.getHealthStatus();
  }
}

class ErrorTracker {
  constructor() {
    this.errors = [];
    this.errorCounts = new Map();
    this.errorPatterns = new Map();
    this.maxErrors = 1000;
  }

  initialize() {
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        reason: event.reason,
        timestamp: Date.now()
      });
    });
  }

  trackError(error) {
    // Add to error log
    this.errors.push(error);
    
    // Maintain maximum size
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
    
    // Count occurrences
    const key = `${error.type}:${error.message}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // Detect patterns
    this.detectErrorPattern(error);
    
    // Log to console
    console.error('Error tracked:', error);
  }

  detectErrorPattern(error) {
    const pattern = this.identifyPattern(error);
    
    if (pattern) {
      const count = this.errorPatterns.get(pattern) || 0;
      this.errorPatterns.set(pattern, count + 1);
      
      // Alert if pattern occurs frequently
      if (count > 5) {
        console.warn(`Error pattern detected: ${pattern} (${count} occurrences)`);
      }
    }
  }

  identifyPattern(error) {
    // Simple pattern detection
    if (error.message.includes('Network')) return 'network-error';
    if (error.message.includes('timeout')) return 'timeout-error';
    if (error.message.includes('Memory')) return 'memory-error';
    if (error.filename?.includes('chunk')) return 'chunk-loading-error';
    
    return null;
  }

  getErrorStats() {
    return {
      totalErrors: this.errors.length,
      errorCounts: Array.from(this.errorCounts.entries()),
      errorPatterns: Array.from(this.errorPatterns.entries()),
      recentErrors: this.errors.slice(-10)
    };
  }
}

class RedundancyManager {
  constructor() {
    this.backupSystems = new Map();
    this.loadBalancers = new Map();
  }

  initialize() {
    this.setupBackupSystems();
    this.setupLoadBalancers();
  }

  setupBackupSystems() {
    // Define backup systems for critical components
    this.backupSystems.set('api', {
      primary: '/api',
      backups: ['/api/v2', '/api/backup'],
      current: '/api'
    });
    
    this.backupSystems.set('storage', {
      primary: 'localStorage',
      backups: ['sessionStorage', 'indexedDB'],
      current: 'localStorage'
    });
  }

  setupLoadBalancers() {
    // Setup load balancing for distributed systems
    this.loadBalancers.set('api', {
      endpoints: ['/api/primary', '/api/secondary'],
      strategy: 'round-robin',
      healthCheck: true
    });
  }

  switchToBackup(system) {
    const backup = this.backupSystems.get(system);
    
    if (backup && backup.backups.length > 0) {
      const nextBackup = backup.backups.shift();
      backup.backups.push(backup.current);
      backup.current = nextBackup;
      
      console.log(`Switched ${system} to backup: ${nextBackup}`);
      return nextBackup;
    }
    
    return null;
  }
}

class FallbackSystem {
  constructor() {
    this.fallbacks = new Map();
    this.activeFallbacks = new Set();
  }

  initialize() {
    // Define fallback strategies
    this.fallbacks.set('api-connectivity', {
      strategy: 'cached-data',
      implementation: () => this.useCachedData()
    });
    
    this.fallbacks.set('database-health', {
      strategy: 'readonly-mode',
      implementation: () => this.enableReadOnlyMode()
    });
    
    this.fallbacks.set('memory-usage', {
      strategy: 'aggressive-cleanup',
      implementation: () => this.performAggressiveCleanup()
    });
  }

  enableFallback(checkName) {
    const fallback = this.fallbacks.get(checkName);
    
    if (fallback && !this.activeFallbacks.has(checkName)) {
      console.log(`Enabling fallback for ${checkName}: ${fallback.strategy}`);
      fallback.implementation();
      this.activeFallbacks.add(checkName);
    }
  }

  disableFallback(checkName) {
    if (this.activeFallbacks.has(checkName)) {
      console.log(`Disabling fallback for ${checkName}`);
      this.activeFallbacks.delete(checkName);
    }
  }

  useCachedData() {
    // Implement cached data usage
    window.dispatchEvent(new CustomEvent('reliability:use-cached-data'));
  }

  enableReadOnlyMode() {
    // Implement read-only mode
    window.dispatchEvent(new CustomEvent('reliability:readonly-mode'));
  }

  performAggressiveCleanup() {
    // Implement aggressive memory cleanup
    window.dispatchEvent(new CustomEvent('reliability:aggressive-cleanup'));
  }
}

class AlertSystem {
  constructor() {
    this.alerts = [];
    this.alertLevels = {
      info: 0,
      warning: 1,
      error: 2,
      critical: 3
    };
  }

  initialize() {
    this.setupAlertHandlers();
  }

  setupAlertHandlers() {
    // Setup various alert mechanisms
    this.handlers = {
      console: (alert) => console.log(`[${alert.level}] ${alert.message}`),
      notification: (alert) => this.showNotification(alert),
      toast: (alert) => this.showToast(alert)
    };
  }

  triggerAlert(checkName, error, level = 'error') {
    const alert = {
      id: Date.now(),
      checkName,
      error: error.message,
      level,
      timestamp: Date.now()
    };
    
    this.alerts.push(alert);
    
    // Trigger handlers
    Object.values(this.handlers).forEach(handler => {
      try {
        handler(alert);
      } catch (e) {
        console.error('Alert handler failed:', e);
      }
    });
  }

  showNotification(alert) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`EzAugent Alert: ${alert.checkName}`, {
        body: alert.error,
        icon: '/favicon.ico'
      });
    }
  }

  showToast(alert) {
    window.dispatchEvent(new CustomEvent('reliability:toast', {
      detail: {
        message: `${alert.checkName}: ${alert.error}`,
        type: alert.level
      }
    }));
  }
}

class RecoveryManager {
  constructor() {
    this.recoveryStrategies = new Map();
    this.recoveryAttempts = new Map();
  }

  initialize() {
    this.setupRecoveryStrategies();
  }

  setupRecoveryStrategies() {
    this.recoveryStrategies.set('api-connectivity', [
      () => this.retryWithBackoff(),
      () => this.switchEndpoint(),
      () => this.useCachedData()
    ]);
    
    this.recoveryStrategies.set('memory-usage', [
      () => this.clearCaches(),
      () => this.triggerGarbageCollection(),
      () => this.reduceFeatures()
    ]);
  }

  async attemptRecovery(checkName, error) {
    const strategies = this.recoveryStrategies.get(checkName) || [];
    const attempts = this.recoveryAttempts.get(checkName) || 0;
    
    if (attempts >= strategies.length) {
      console.error(`All recovery strategies exhausted for ${checkName}`);
      return false;
    }
    
    const strategy = strategies[attempts];
    
    try {
      await strategy();
      console.log(`Recovery strategy ${attempts + 1} succeeded for ${checkName}`);
      this.recoveryAttempts.delete(checkName);
      return true;
    } catch (recoveryError) {
      console.error(`Recovery strategy ${attempts + 1} failed for ${checkName}:`, recoveryError);
      this.recoveryAttempts.set(checkName, attempts + 1);
      return false;
    }
  }

  handleRecovery(checkName) {
    // Reset recovery attempts on successful health check
    this.recoveryAttempts.delete(checkName);
    console.log(`Recovery completed for ${checkName}`);
  }

  async retryWithBackoff() {
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  switchEndpoint() {
    window.dispatchEvent(new CustomEvent('reliability:switch-endpoint'));
  }

  useCachedData() {
    window.dispatchEvent(new CustomEvent('reliability:use-cached-data'));
  }

  clearCaches() {
    window.dispatchEvent(new CustomEvent('reliability:clear-caches'));
  }

  triggerGarbageCollection() {
    if (window.gc) {
      window.gc();
    }
  }

  reduceFeatures() {
    window.dispatchEvent(new CustomEvent('reliability:reduce-features'));
  }
}

// Export singleton instance
export default new ReliabilityMonitor();