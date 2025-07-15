const Redis = require('ioredis');

class PriorityQueueManager {
    constructor(redisClient, options = {}) {
        this.redis = redisClient;
        this.options = {
            enablePriorities: options.enablePriorities !== false,
            priorityLevels: options.priorityLevels || {
                critical: { weight: 10, color: '#dc2626' },
                high: { weight: 5, color: '#ea580c' },
                normal: { weight: 1, color: '#059669' },
                low: { weight: 0.5, color: '#0891b2' },
                deferred: { weight: 0.1, color: '#6b7280' }
            },
            fairnessInterval: options.fairnessInterval || 100,
            starvationThreshold: options.starvationThreshold || 300000, // 5 minutes
            ...options
        };
        
        this.counters = new Map();
        this.lastProcessed = new Map();
    }

    async enqueuePriority(queueName, task, priority = 'normal') {
        if (!this.options.enablePriorities) {
            return this.redis.lpush(queueName, JSON.stringify(task));
        }

        const priorityLevel = this.options.priorityLevels[priority];
        if (!priorityLevel) {
            throw new Error(`Invalid priority level: ${priority}. Valid levels: ${Object.keys(this.options.priorityLevels).join(', ')}`);
        }

        const enrichedTask = {
            ...task,
            priority,
            weight: priorityLevel.weight,
            enqueuedAt: Date.now(),
            id: task.id || this._generateTaskId()
        };

        const priorityQueueName = `${queueName}:p:${priority}`;
        
        const multi = this.redis.multi();
        multi.lpush(priorityQueueName, JSON.stringify(enrichedTask));
        multi.sadd(`${queueName}:priorities`, priority);
        multi.zadd(`${queueName}:priority_weights`, priorityLevel.weight, priority);
        multi.incr(`${queueName}:stats:enqueued:${priority}`);
        
        await multi.exec();
        
        await this._updateQueueMetrics(queueName, priority, 'enqueued');
        
        return enrichedTask.id;
    }

    async dequeuePriority(queueNames, timeout = 0) {
        if (!Array.isArray(queueNames)) {
            queueNames = [queueNames];
        }

        if (!this.options.enablePriorities) {
            const keys = queueNames.map(name => name);
            const result = await this.redis.brpop(keys, timeout);
            if (result) {
                return {
                    queue: result[0],
                    task: JSON.parse(result[1]),
                    priority: 'normal'
                };
            }
            return null;
        }

        for (const queueName of queueNames) {
            const selectedPriority = await this._selectPriorityForDequeue(queueName);
            if (selectedPriority) {
                const priorityQueueName = `${queueName}:p:${selectedPriority}`;
                const taskData = await this.redis.rpop(priorityQueueName);
                
                if (taskData) {
                    const task = JSON.parse(taskData);
                    await this._updateQueueMetrics(queueName, selectedPriority, 'dequeued');
                    await this._updateProcessingStats(queueName, selectedPriority, task);
                    
                    return {
                        queue: queueName,
                        task,
                        priority: selectedPriority
                    };
                }
            }
        }

        if (timeout > 0) {
            await new Promise(resolve => setTimeout(resolve, Math.min(timeout, 1000)));
            return this.dequeuePriority(queueNames, Math.max(0, timeout - 1000));
        }

        return null;
    }

    async _selectPriorityForDequeue(queueName) {
        const priorities = await this.redis.smembers(`${queueName}:priorities`);
        if (!priorities.length) return null;

        priorities.sort((a, b) => {
            const aWeight = this.options.priorityLevels[a]?.weight || 0;
            const bWeight = this.options.priorityLevels[b]?.weight || 0;
            return bWeight - aWeight;
        });

        const counter = this.counters.get(queueName) || 0;
        this.counters.set(queueName, counter + 1);

        const now = Date.now();
        
        for (const priority of priorities) {
            const priorityQueueName = `${queueName}:p:${priority}`;
            const queueLength = await this.redis.llen(priorityQueueName);
            
            if (queueLength === 0) continue;

            const lastProcessed = this.lastProcessed.get(`${queueName}:${priority}`) || 0;
            const timeSinceLastProcessed = now - lastProcessed;
            
            if (timeSinceLastProcessed > this.options.starvationThreshold) {
                this.lastProcessed.set(`${queueName}:${priority}`, now);
                return priority;
            }

            const weight = this.options.priorityLevels[priority].weight;
            if (this._shouldProcessPriority(counter, weight)) {
                this.lastProcessed.set(`${queueName}:${priority}`, now);
                return priority;
            }
        }

        const highestPriority = priorities[0];
        this.lastProcessed.set(`${queueName}:${highestPriority}`, now);
        return highestPriority;
    }

    _shouldProcessPriority(counter, weight) {
        if (weight >= 10) return true;
        if (weight >= 5) return counter % 2 === 0;
        if (weight >= 1) return counter % 5 === 0;
        if (weight >= 0.5) return counter % 10 === 0;
        return counter % 20 === 0;
    }

    async getQueueStats(queueName) {
        const priorities = await this.redis.smembers(`${queueName}:priorities`);
        const stats = {
            total: 0,
            byPriority: {},
            processing: {},
            completed: {}
        };

        for (const priority of priorities) {
            const priorityQueueName = `${queueName}:p:${priority}`;
            const length = await this.redis.llen(priorityQueueName);
            const enqueued = await this.redis.get(`${queueName}:stats:enqueued:${priority}`) || 0;
            const dequeued = await this.redis.get(`${queueName}:stats:dequeued:${priority}`) || 0;
            const avgProcessingTime = await this.redis.get(`${queueName}:stats:avg_time:${priority}`) || 0;

            stats.byPriority[priority] = {
                pending: length,
                enqueued: parseInt(enqueued),
                dequeued: parseInt(dequeued),
                avgProcessingTime: parseFloat(avgProcessingTime),
                weight: this.options.priorityLevels[priority]?.weight || 0,
                color: this.options.priorityLevels[priority]?.color || '#6b7280'
            };
            
            stats.total += length;
        }

        return stats;
    }

    async _updateQueueMetrics(queueName, priority, operation) {
        const key = `${queueName}:stats:${operation}:${priority}`;
        await this.redis.incr(key);
        await this.redis.expire(key, 86400); // 24 hours TTL
    }

    async _updateProcessingStats(queueName, priority, task) {
        if (task.enqueuedAt) {
            const processingTime = Date.now() - task.enqueuedAt;
            const avgKey = `${queueName}:stats:avg_time:${priority}`;
            const countKey = `${queueName}:stats:count:${priority}`;
            
            const currentAvg = parseFloat(await this.redis.get(avgKey)) || 0;
            const count = parseInt(await this.redis.get(countKey)) || 0;
            
            const newAvg = (currentAvg * count + processingTime) / (count + 1);
            
            const multi = this.redis.multi();
            multi.set(avgKey, newAvg.toString());
            multi.incr(countKey);
            multi.expire(avgKey, 86400);
            multi.expire(countKey, 86400);
            await multi.exec();
        }
    }

    _generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async clearPriorityStats(queueName) {
        const priorities = await this.redis.smembers(`${queueName}:priorities`);
        const keys = [];
        
        for (const priority of priorities) {
            keys.push(
                `${queueName}:stats:enqueued:${priority}`,
                `${queueName}:stats:dequeued:${priority}`,
                `${queueName}:stats:avg_time:${priority}`,
                `${queueName}:stats:count:${priority}`
            );
        }
        
        if (keys.length > 0) {
            await this.redis.del(keys);
        }
    }

    async migrateLegacyQueue(queueName, defaultPriority = 'normal') {
        const tasks = [];
        let task;
        
        while ((task = await this.redis.rpop(queueName)) !== null) {
            tasks.push(JSON.parse(task));
        }
        
        for (const task of tasks) {
            await this.enqueuePriority(queueName, task, defaultPriority);
        }
        
        return tasks.length;
    }
}

module.exports = PriorityQueueManager;