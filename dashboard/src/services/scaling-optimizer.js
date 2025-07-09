// Scaling Optimization Service for EzAugent Dashboard
import PerformanceOptimizer from './performance-optimizer';
import ResourceManager from './resource-manager';

class ScalingOptimizer {
  constructor() {
    this.loadBalancer = new LoadBalancer();
    this.autoScaler = new AutoScaler();
    this.queueManager = new QueueManager();
    this.circuitBreaker = new CircuitBreaker();
    this.metricsCollector = new MetricsCollector();
    
    this.initializeScaling();
  }

  initializeScaling() {
    this.startMetricsCollection();
    this.setupAutoScaling();
    this.initializeLoadBalancing();
  }

  // Load Balancing for API Requests
  async distributeLoad(requests) {
    return this.loadBalancer.distribute(requests);
  }

  // Auto-scaling based on load
  async scaleResources(currentLoad) {
    return this.autoScaler.scale(currentLoad);
  }

  // Queue Management for High Load
  async enqueueTask(task, priority = 'normal') {
    return this.queueManager.enqueue(task, priority);
  }

  async dequeueTask() {
    return this.queueManager.dequeue();
  }

  // Circuit Breaker Pattern
  async executeWithCircuitBreaker(operation, serviceId) {
    return this.circuitBreaker.execute(operation, serviceId);
  }

  // Metrics Collection
  startMetricsCollection() {
    this.metricsCollector.start();
  }

  getScalingMetrics() {
    return this.metricsCollector.getMetrics();
  }

  // Configuration
  configure(config) {
    this.loadBalancer.configure(config.loadBalancer);
    this.autoScaler.configure(config.autoScaler);
    this.queueManager.configure(config.queueManager);
    this.circuitBreaker.configure(config.circuitBreaker);
  }
}

class LoadBalancer {
  constructor() {
    this.endpoints = [];
    this.currentIndex = 0;
    this.strategy = 'round-robin';
    this.healthCheck = new HealthCheck();
  }

  configure(config) {
    this.endpoints = config.endpoints || [];
    this.strategy = config.strategy || 'round-robin';
    this.healthCheck.configure(config.healthCheck);
  }

  async distribute(requests) {
    const healthyEndpoints = await this.healthCheck.getHealthyEndpoints(this.endpoints);
    
    if (healthyEndpoints.length === 0) {
      throw new Error('No healthy endpoints available');
    }

    const results = [];
    
    for (const request of requests) {
      const endpoint = this.selectEndpoint(healthyEndpoints);
      results.push(this.sendRequest(request, endpoint));
    }
    
    return Promise.allSettled(results);
  }

  selectEndpoint(endpoints) {
    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(endpoints);
      case 'least-connections':
        return this.leastConnectionsSelection(endpoints);
      case 'weighted':
        return this.weightedSelection(endpoints);
      default:
        return endpoints[0];
    }
  }

  roundRobinSelection(endpoints) {
    const endpoint = endpoints[this.currentIndex % endpoints.length];
    this.currentIndex++;
    return endpoint;
  }

  leastConnectionsSelection(endpoints) {
    return endpoints.reduce((least, current) => 
      current.activeConnections < least.activeConnections ? current : least
    );
  }

  weightedSelection(endpoints) {
    const totalWeight = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return endpoints[0];
  }

  async sendRequest(request, endpoint) {
    endpoint.activeConnections++;
    
    try {
      const response = await fetch(endpoint.url, {
        ...request,
        timeout: endpoint.timeout || 10000
      });
      
      endpoint.successCount++;
      return response;
    } catch (error) {
      endpoint.errorCount++;
      throw error;
    } finally {
      endpoint.activeConnections--;
    }
  }
}

class AutoScaler {
  constructor() {
    this.instances = [];
    this.minInstances = 1;
    this.maxInstances = 10;
    this.targetUtilization = 70;
    this.scaleUpThreshold = 80;
    this.scaleDownThreshold = 30;
    this.scalingCooldown = 300000; // 5 minutes
    this.lastScalingAction = 0;
  }

  configure(config) {
    this.minInstances = config.minInstances || 1;
    this.maxInstances = config.maxInstances || 10;
    this.targetUtilization = config.targetUtilization || 70;
    this.scaleUpThreshold = config.scaleUpThreshold || 80;
    this.scaleDownThreshold = config.scaleDownThreshold || 30;
    this.scalingCooldown = config.scalingCooldown || 300000;
  }

  async scale(currentLoad) {
    const now = Date.now();
    
    // Check cooldown period
    if (now - this.lastScalingAction < this.scalingCooldown) {
      return { action: 'none', reason: 'cooldown' };
    }

    const utilization = this.calculateUtilization(currentLoad);
    
    if (utilization > this.scaleUpThreshold && this.instances.length < this.maxInstances) {
      return this.scaleUp();
    } else if (utilization < this.scaleDownThreshold && this.instances.length > this.minInstances) {
      return this.scaleDown();
    }
    
    return { action: 'none', reason: 'within-threshold' };
  }

  calculateUtilization(currentLoad) {
    const totalCapacity = this.instances.reduce((sum, instance) => sum + instance.capacity, 0);
    return totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0;
  }

  async scaleUp() {
    const newInstance = await this.createInstance();
    this.instances.push(newInstance);
    this.lastScalingAction = Date.now();
    
    return {
      action: 'scale-up',
      instanceId: newInstance.id,
      totalInstances: this.instances.length
    };
  }

  async scaleDown() {
    const instanceToRemove = this.selectInstanceForRemoval();
    await this.removeInstance(instanceToRemove);
    this.instances = this.instances.filter(i => i.id !== instanceToRemove.id);
    this.lastScalingAction = Date.now();
    
    return {
      action: 'scale-down',
      instanceId: instanceToRemove.id,
      totalInstances: this.instances.length
    };
  }

  async createInstance() {
    const instance = {
      id: `instance-${Date.now()}`,
      capacity: 100,
      currentLoad: 0,
      status: 'starting',
      createdAt: Date.now()
    };
    
    // Simulate instance startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    instance.status = 'running';
    
    return instance;
  }

  selectInstanceForRemoval() {
    // Select instance with lowest load
    return this.instances.reduce((lowest, current) => 
      current.currentLoad < lowest.currentLoad ? current : lowest
    );
  }

  async removeInstance(instance) {
    instance.status = 'stopping';
    
    // Graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    instance.status = 'stopped';
  }
}

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.processing = new Map();
    this.maxQueueSize = 1000;
    this.maxProcessingTime = 60000; // 1 minute
    this.retryAttempts = 3;
    this.priorities = ['critical', 'high', 'normal', 'low'];
    
    this.initializeQueues();
    this.startProcessing();
  }

  configure(config) {
    this.maxQueueSize = config.maxQueueSize || 1000;
    this.maxProcessingTime = config.maxProcessingTime || 60000;
    this.retryAttempts = config.retryAttempts || 3;
  }

  initializeQueues() {
    this.priorities.forEach(priority => {
      this.queues.set(priority, []);
    });
  }

  async enqueue(task, priority = 'normal') {
    const queue = this.queues.get(priority);
    
    if (!queue) {
      throw new Error(`Invalid priority: ${priority}`);
    }
    
    if (queue.length >= this.maxQueueSize) {
      throw new Error(`Queue full for priority: ${priority}`);
    }
    
    const queuedTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      task,
      priority,
      enqueuedAt: Date.now(),
      attempts: 0
    };
    
    queue.push(queuedTask);
    
    return queuedTask.id;
  }

  async dequeue() {
    // Process by priority
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority);
      
      if (queue.length > 0) {
        const task = queue.shift();
        this.processing.set(task.id, {
          ...task,
          startedAt: Date.now()
        });
        
        return task;
      }
    }
    
    return null;
  }

  async completeTask(taskId) {
    this.processing.delete(taskId);
  }

  async failTask(taskId, error) {
    const task = this.processing.get(taskId);
    
    if (!task) {
      return;
    }
    
    this.processing.delete(taskId);
    
    // Retry if attempts remaining
    if (task.attempts < this.retryAttempts) {
      task.attempts++;
      task.lastError = error;
      task.retryAt = Date.now() + (task.attempts * 1000); // Exponential backoff
      
      const queue = this.queues.get(task.priority);
      queue.push(task);
    }
  }

  startProcessing() {
    setInterval(() => {
      this.cleanupStaleProcessing();
      this.processRetries();
    }, 10000); // Check every 10 seconds
  }

  cleanupStaleProcessing() {
    const now = Date.now();
    
    for (const [taskId, task] of this.processing.entries()) {
      if (now - task.startedAt > this.maxProcessingTime) {
        this.failTask(taskId, new Error('Processing timeout'));
      }
    }
  }

  processRetries() {
    const now = Date.now();
    
    for (const [priority, queue] of this.queues.entries()) {
      const retryTasks = queue.filter(task => task.retryAt && task.retryAt <= now);
      
      retryTasks.forEach(task => {
        task.retryAt = null;
      });
    }
  }

  getQueueStats() {
    const stats = {};
    
    for (const [priority, queue] of this.queues.entries()) {
      stats[priority] = {
        queued: queue.length,
        processing: Array.from(this.processing.values()).filter(t => t.priority === priority).length
      };
    }
    
    return stats;
  }
}

class CircuitBreaker {
  constructor() {
    this.services = new Map();
    this.defaultConfig = {
      threshold: 5,
      timeout: 60000,
      monitoringPeriod: 10000
    };
  }

  configure(config) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  async execute(operation, serviceId) {
    const service = this.getOrCreateService(serviceId);
    
    if (service.state === 'open') {
      if (Date.now() - service.lastFailureTime > service.config.timeout) {
        service.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      
      if (service.state === 'half-open') {
        service.state = 'closed';
        service.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      service.failureCount++;
      service.lastFailureTime = Date.now();
      
      if (service.failureCount >= service.config.threshold) {
        service.state = 'open';
      }
      
      throw error;
    }
  }

  getOrCreateService(serviceId) {
    if (!this.services.has(serviceId)) {
      this.services.set(serviceId, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        config: { ...this.defaultConfig }
      });
    }
    
    return this.services.get(serviceId);
  }

  getServiceStats() {
    const stats = {};
    
    for (const [serviceId, service] of this.services.entries()) {
      stats[serviceId] = {
        state: service.state,
        failureCount: service.failureCount,
        lastFailureTime: service.lastFailureTime
      };
    }
    
    return stats;
  }
}

class HealthCheck {
  constructor() {
    this.checks = new Map();
    this.interval = 30000; // 30 seconds
    this.timeout = 5000; // 5 seconds
    
    this.startHealthChecks();
  }

  configure(config) {
    this.interval = config.interval || 30000;
    this.timeout = config.timeout || 5000;
  }

  async getHealthyEndpoints(endpoints) {
    const healthyEndpoints = [];
    
    for (const endpoint of endpoints) {
      const health = this.checks.get(endpoint.id) || { status: 'unknown' };
      
      if (health.status === 'healthy') {
        healthyEndpoints.push(endpoint);
      }
    }
    
    return healthyEndpoints;
  }

  startHealthChecks() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.interval);
  }

  async performHealthChecks() {
    // This would typically check endpoint health
    // For now, simulate health checks
    for (const [endpointId, health] of this.checks.entries()) {
      try {
        await this.checkEndpoint(endpointId);
        health.status = 'healthy';
        health.lastCheck = Date.now();
      } catch (error) {
        health.status = 'unhealthy';
        health.lastError = error.message;
        health.lastCheck = Date.now();
      }
    }
  }

  async checkEndpoint(endpointId) {
    // Simulate health check
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve();
        } else {
          reject(new Error('Health check failed'));
        }
      }, 100);
    });
  }
}

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      averageResponseTime: 0,
      throughput: 0,
      queueDepth: 0,
      activeConnections: 0
    };
    
    this.history = [];
    this.maxHistorySize = 1000;
  }

  start() {
    setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect every 5 seconds
  }

  collectMetrics() {
    const timestamp = Date.now();
    const snapshot = { ...this.metrics, timestamp };
    
    this.history.push(snapshot);
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
    
    // Calculate derived metrics
    this.calculateDerivedMetrics();
  }

  calculateDerivedMetrics() {
    if (this.history.length < 2) return;
    
    const recent = this.history.slice(-10); // Last 10 snapshots
    
    this.metrics.throughput = recent.reduce((sum, snapshot) => 
      sum + snapshot.requests, 0) / recent.length;
    
    const responseTimes = recent.map(snapshot => snapshot.averageResponseTime);
    this.metrics.averageResponseTime = responseTimes.reduce((sum, time) => 
      sum + time, 0) / responseTimes.length;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getHistory() {
    return [...this.history];
  }

  recordRequest() {
    this.metrics.requests++;
  }

  recordResponse(responseTime) {
    this.metrics.responses++;
    this.updateAverageResponseTime(responseTime);
  }

  recordError() {
    this.metrics.errors++;
  }

  updateAverageResponseTime(responseTime) {
    const alpha = 0.1; // Exponential smoothing factor
    this.metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
  }

  setQueueDepth(depth) {
    this.metrics.queueDepth = depth;
  }

  setActiveConnections(connections) {
    this.metrics.activeConnections = connections;
  }
}

// Export singleton instance
export default new ScalingOptimizer();