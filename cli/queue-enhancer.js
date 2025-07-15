const PriorityQueueManager = require('./priority-queue-manager');
const fs = require('fs').promises;
const path = require('path');

class QueueEnhancer {
    constructor(redisClient, options = {}) {
        this.redis = redisClient;
        this.options = {
            enableFeatures: {
                priorities: true,
                deduplication: true,
                analytics: true,
                alerts: true,
                ...options.enableFeatures
            },
            configPath: options.configPath || path.join(__dirname, '../shared/priority-rules.json'),
            fallbackToLegacy: options.fallbackToLegacy !== false,
            ...options
        };
        
        this.config = null;
        this.priorityManager = null;
        this.deduplicationCache = new Map();
        this.metrics = {
            enqueued: 0,
            dequeued: 0,
            duplicatesBlocked: 0,
            errors: 0
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadConfig();
            
            if (this.options.enableFeatures.priorities) {
                this.priorityManager = new PriorityQueueManager(this.redis, {
                    enablePriorities: true,
                    priorityLevels: this.config?.priorityLevels,
                    fairnessInterval: this.config?.fairnessSettings?.fairnessInterval,
                    starvationThreshold: this.config?.fairnessSettings?.starvationThreshold
                });
            }
            
            if (this.options.enableFeatures.deduplication) {
                this.startDeduplicationCleanup();
            }
            
            console.log('QueueEnhancer initialized with features:', Object.keys(this.options.enableFeatures).filter(k => this.options.enableFeatures[k]));
        } catch (error) {
            console.warn('QueueEnhancer initialization failed, falling back to legacy mode:', error.message);
            this.options.enableFeatures = Object.fromEntries(Object.keys(this.options.enableFeatures).map(k => [k, false]));
        }
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.options.configPath, 'utf8');
            this.config = JSON.parse(configData);
            
            if (!this.config.enabled) {
                console.log('Priority queue system disabled in config');
                this.options.enableFeatures.priorities = false;
            }
        } catch (error) {
            console.warn('Failed to load priority config, using defaults:', error.message);
            this.config = {
                enabled: false,
                defaultPriority: 'normal',
                priorityLevels: {
                    critical: { weight: 10, color: '#dc2626' },
                    high: { weight: 5, color: '#ea580c' },
                    normal: { weight: 1, color: '#059669' },
                    low: { weight: 0.5, color: '#0891b2' },
                    deferred: { weight: 0.1, color: '#6b7280' }
                }
            };
        }
    }

    async enqueue(queueName, task, options = {}) {
        try {
            this.metrics.enqueued++;
            
            const priority = this.determinePriority(task, options);
            const taskId = await this.generateTaskId(task);
            
            if (this.options.enableFeatures.deduplication) {
                const isDuplicate = await this.checkDuplicate(queueName, task, taskId);
                if (isDuplicate) {
                    this.metrics.duplicatesBlocked++;
                    console.log(`Blocked duplicate task: ${taskId}`);
                    return { success: false, reason: 'duplicate', taskId, originalTaskId: isDuplicate };
                }
            }

            const enrichedTask = {
                ...task,
                id: taskId,
                priority,
                enqueuedAt: Date.now(),
                source: options.source || 'unknown'
            };

            let result;
            if (this.options.enableFeatures.priorities && this.priorityManager) {
                result = await this.priorityManager.enqueuePriority(queueName, enrichedTask, priority);
            } else {
                result = await this.redis.lpush(queueName, JSON.stringify(enrichedTask));
            }

            if (this.options.enableFeatures.analytics) {
                await this.updateAnalytics(queueName, 'enqueued', priority);
            }

            if (this.options.enableFeatures.alerts) {
                await this.checkQueueAlerts(queueName);
            }

            return { success: true, taskId, priority, queueName };
            
        } catch (error) {
            this.metrics.errors++;
            console.error('Queue enhancement error:', error);
            
            if (this.options.fallbackToLegacy) {
                console.log('Falling back to legacy enqueue');
                const result = await this.redis.lpush(queueName, JSON.stringify(task));
                return { success: true, fallback: true, result };
            }
            
            throw error;
        }
    }

    async dequeue(queueNames, timeout = 0) {
        try {
            let result;
            
            if (this.options.enableFeatures.priorities && this.priorityManager) {
                result = await this.priorityManager.dequeuePriority(queueNames, timeout);
            } else {
                const keys = Array.isArray(queueNames) ? queueNames : [queueNames];
                const taskData = await this.redis.brpop(keys, timeout);
                
                if (taskData) {
                    result = {
                        queue: taskData[0],
                        task: JSON.parse(taskData[1]),
                        priority: 'normal'
                    };
                }
            }

            if (result) {
                this.metrics.dequeued++;
                
                if (this.options.enableFeatures.analytics) {
                    await this.updateAnalytics(result.queue, 'dequeued', result.priority);
                }
                
                if (this.options.enableFeatures.deduplication) {
                    this.markTaskProcessing(result.task.id);
                }
            }

            return result;
            
        } catch (error) {
            this.metrics.errors++;
            console.error('Queue dequeue error:', error);
            
            if (this.options.fallbackToLegacy) {
                console.log('Falling back to legacy dequeue');
                const keys = Array.isArray(queueNames) ? queueNames : [queueNames];
                const result = await this.redis.brpop(keys, timeout);
                
                if (result) {
                    return {
                        queue: result[0],
                        task: JSON.parse(result[1]),
                        priority: 'normal',
                        fallback: true
                    };
                }
            }
            
            throw error;
        }
    }

    determinePriority(task, options = {}) {
        if (options.priority) return options.priority;
        if (!this.config) return 'normal';

        if (task.type && this.config.taskTypePriorities?.[task.type]) {
            return this.config.taskTypePriorities[task.type];
        }

        if (task.file) {
            for (const [pathPattern, priority] of Object.entries(this.config.filePriorities || {})) {
                if (task.file.startsWith(pathPattern)) {
                    return priority;
                }
            }
        }

        if (task.prompt || task.description) {
            const text = (task.prompt || task.description).toLowerCase();
            for (const [keyword, priority] of Object.entries(this.config.keywordPriorities || {})) {
                if (text.includes(keyword)) {
                    return priority;
                }
            }
        }

        return this.config.defaultPriority || 'normal';
    }

    async generateTaskId(task) {
        const content = JSON.stringify({
            file: task.file,
            prompt: task.prompt,
            type: task.type
        });
        
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        return `task_${Date.now()}_${hash.substr(0, 8)}`;
    }

    async checkDuplicate(queueName, task, taskId) {
        const fingerprint = this.generateFingerprint(task);
        const cacheKey = `${queueName}:${fingerprint}`;
        
        if (this.deduplicationCache.has(cacheKey)) {
            const cachedEntry = this.deduplicationCache.get(cacheKey);
            if (Date.now() - cachedEntry.timestamp < 300000) { // 5 minutes
                return cachedEntry.taskId;
            }
        }

        const redisKey = `dedup:${queueName}:${fingerprint}`;
        const existingTaskId = await this.redis.get(redisKey);
        
        if (existingTaskId) {
            return existingTaskId;
        }

        this.deduplicationCache.set(cacheKey, { taskId, timestamp: Date.now() });
        await this.redis.setex(redisKey, 300, taskId); // 5 minutes TTL
        
        return null;
    }

    generateFingerprint(task) {
        const crypto = require('crypto');
        const normalizedTask = {
            file: task.file?.toLowerCase().trim(),
            prompt: task.prompt?.toLowerCase().trim().replace(/\s+/g, ' '),
            type: task.type?.toLowerCase().trim()
        };
        
        const content = JSON.stringify(normalizedTask, Object.keys(normalizedTask).sort());
        return crypto.createHash('md5').update(content).digest('hex');
    }

    markTaskProcessing(taskId) {
        setTimeout(() => {
            for (const [key, value] of this.deduplicationCache.entries()) {
                if (value.taskId === taskId) {
                    this.deduplicationCache.delete(key);
                    break;
                }
            }
        }, 1000);
    }

    startDeduplicationCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.deduplicationCache.entries()) {
                if (now - value.timestamp > 300000) { // 5 minutes
                    this.deduplicationCache.delete(key);
                }
            }
        }, 60000); // Clean every minute
    }

    async updateAnalytics(queueName, operation, priority) {
        const timestamp = Date.now();
        const hour = Math.floor(timestamp / 3600000) * 3600000;
        
        const multi = this.redis.multi();
        multi.incr(`analytics:${queueName}:${operation}:total`);
        multi.incr(`analytics:${queueName}:${operation}:${priority}`);
        multi.incr(`analytics:${queueName}:${operation}:hourly:${hour}`);
        multi.expire(`analytics:${queueName}:${operation}:hourly:${hour}`, 86400 * 7); // 7 days
        await multi.exec();
    }

    async checkQueueAlerts(queueName) {
        if (!this.config?.queueLimits) return;
        
        const stats = await this.getQueueStats(queueName);
        
        for (const [priority, limit] of Object.entries(this.config.queueLimits)) {
            const count = stats.byPriority?.[priority]?.pending || 0;
            if (count > limit) {
                console.warn(`Queue alert: ${queueName}:${priority} has ${count} tasks (limit: ${limit})`);
                await this.redis.publish('queue:alerts', JSON.stringify({
                    type: 'queue_limit_exceeded',
                    queue: queueName,
                    priority,
                    count,
                    limit,
                    timestamp: Date.now()
                }));
            }
        }
    }

    async getQueueStats(queueName) {
        if (this.priorityManager) {
            return await this.priorityManager.getQueueStats(queueName);
        }
        
        const length = await this.redis.llen(queueName);
        return {
            total: length,
            byPriority: {
                normal: { pending: length }
            }
        };
    }

    async getMetrics() {
        return {
            ...this.metrics,
            features: this.options.enableFeatures,
            deduplicationCacheSize: this.deduplicationCache.size
        };
    }

    async getAnalytics(queueName, timeRange = '24h') {
        const analytics = {
            enqueued: {},
            dequeued: {},
            byPriority: {}
        };
        
        const keys = await this.redis.keys(`analytics:${queueName}:*`);
        
        for (const key of keys) {
            const value = await this.redis.get(key);
            const parts = key.split(':');
            const operation = parts[2];
            const metric = parts[3];
            
            if (operation === 'enqueued' || operation === 'dequeued') {
                if (!analytics[operation][metric]) {
                    analytics[operation][metric] = 0;
                }
                analytics[operation][metric] += parseInt(value) || 0;
            }
        }
        
        return analytics;
    }
}

module.exports = QueueEnhancer;