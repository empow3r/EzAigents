/**
 * Transaction Logger Service
 * Provides comprehensive audit trails for all queue operations
 */

const Redis = require('ioredis');
const EventEmitter = require('events');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TransactionLogger extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(this.redisUrl);
    this.subClient = new Redis(this.redisUrl);
    
    this.config = {
      logDir: config.logDir || path.join(process.cwd(), 'logs', 'transactions'),
      retention: config.retention || 30, // days
      flushInterval: config.flushInterval || 60000, // 1 minute
      maxBatchSize: config.maxBatchSize || 1000,
      enableFileBackup: config.enableFileBackup !== false,
      compressOldLogs: config.compressOldLogs !== false,
      ...config
    };
    
    this.buffer = [];
    this.transactionStats = new Map();
    
    // Logger for internal use
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'transaction-logger' },
      transports: [
        new winston.transports.File({ filename: 'transaction-logger-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'transaction-logger.log' }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  async start() {
    this.logger.info('Starting Transaction Logger');
    
    // Ensure log directory exists
    if (this.config.enableFileBackup) {
      await fs.mkdir(this.config.logDir, { recursive: true });
    }
    
    // Subscribe to all transaction events
    await this.subscribeToTransactionEvents();
    
    // Start buffer flush interval
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 86400000); // Daily
    
    // Initialize stats
    await this.initializeStats();
    
    this.emit('started');
  }

  async subscribeToTransactionEvents() {
    // Queue operation patterns
    const patterns = [
      'txlog:*',
      'queue:*:enqueue',
      'queue:*:dequeue',
      'queue:*:complete',
      'queue:*:failed',
      'agent:*:task_assigned',
      'agent:*:task_completed',
      'agent:*:task_failed',
      'dlq:*:retry',
      'dlq:*:archive',
      'health:correction'
    ];
    
    // Subscribe to patterns
    await this.subClient.psubscribe(...patterns);
    
    this.subClient.on('pmessage', (pattern, channel, message) => {
      this.handleTransactionEvent(channel, message);
    });
    
    // Also monitor direct queue operations
    this.monitorQueueOperations();
  }

  async monitorQueueOperations() {
    // Use Redis MONITOR command for comprehensive logging (be careful in production)
    if (this.config.enableMonitoring) {
      const monitorClient = new Redis(this.redisUrl);
      
      monitorClient.monitor((err, monitor) => {
        if (err) {
          this.logger.error('Failed to start Redis monitor', err);
          return;
        }
        
        monitor.on('monitor', (time, args, source, database) => {
          this.handleMonitorEvent(time, args, source, database);
        });
      });
    }
  }

  handleTransactionEvent(channel, message) {
    try {
      const transaction = {
        id: uuidv4(),
        timestamp: Date.now(),
        channel,
        type: this.extractEventType(channel),
        data: JSON.parse(message),
        source: 'pubsub'
      };
      
      this.logTransaction(transaction);
      
    } catch (error) {
      this.logger.error('Error handling transaction event', { channel, error });
    }
  }

  handleMonitorEvent(time, args, source, database) {
    // Only log relevant queue operations
    const command = args[0]?.toLowerCase();
    const relevantCommands = ['lpush', 'rpush', 'lpop', 'rpop', 'lrem', 'rpoplpush', 'blpop', 'brpop'];
    
    if (relevantCommands.includes(command) && args[1]?.includes('queue:')) {
      const transaction = {
        id: uuidv4(),
        timestamp: parseFloat(time) * 1000,
        command,
        queue: args[1],
        args: args.slice(2),
        source: source,
        database,
        type: 'redis_command'
      };
      
      this.logTransaction(transaction);
    }
  }

  logTransaction(transaction) {
    // Add to buffer
    this.buffer.push(transaction);
    
    // Update stats
    this.updateStats(transaction);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.config.maxBatchSize) {
      this.flushBuffer();
    }
    
    // Emit for real-time monitoring
    this.emit('transaction', transaction);
  }

  async flushBuffer() {
    if (this.buffer.length === 0) return;
    
    const transactions = [...this.buffer];
    this.buffer = [];
    
    try {
      // Store in Redis
      await this.storeInRedis(transactions);
      
      // Backup to file if enabled
      if (this.config.enableFileBackup) {
        await this.backupToFile(transactions);
      }
      
      this.logger.info('Flushed transactions', { count: transactions.length });
      
    } catch (error) {
      this.logger.error('Error flushing buffer', error);
      // Re-add to buffer on failure
      this.buffer.unshift(...transactions);
    }
  }

  async storeInRedis(transactions) {
    const pipeline = this.redis.pipeline();
    
    for (const tx of transactions) {
      // Store in sorted set by timestamp
      const key = `txlog:${this.getDateKey(tx.timestamp)}`;
      pipeline.zadd(key, tx.timestamp, JSON.stringify(tx));
      
      // Set expiry
      pipeline.expire(key, this.config.retention * 86400);
      
      // Store by type for quick filtering
      if (tx.type) {
        const typeKey = `txlog:type:${tx.type}:${this.getDateKey(tx.timestamp)}`;
        pipeline.zadd(typeKey, tx.timestamp, tx.id);
        pipeline.expire(typeKey, this.config.retention * 86400);
      }
      
      // Store by queue for queue-specific queries
      if (tx.queue || tx.data?.queue) {
        const queue = tx.queue || tx.data.queue;
        const queueKey = `txlog:queue:${queue}:${this.getDateKey(tx.timestamp)}`;
        pipeline.zadd(queueKey, tx.timestamp, tx.id);
        pipeline.expire(queueKey, this.config.retention * 86400);
      }
    }
    
    await pipeline.exec();
  }

  async backupToFile(transactions) {
    const dateKey = this.getDateKey(Date.now());
    const fileName = `transactions_${dateKey}_${Date.now()}.jsonl`;
    const filePath = path.join(this.config.logDir, fileName);
    
    const lines = transactions.map(tx => JSON.stringify(tx)).join('\n') + '\n';
    
    await fs.appendFile(filePath, lines);
  }

  updateStats(transaction) {
    const hour = new Date(transaction.timestamp).getHours();
    const type = transaction.type || 'unknown';
    
    // Update hourly stats
    const hourKey = `hour_${hour}`;
    if (!this.transactionStats.has(hourKey)) {
      this.transactionStats.set(hourKey, { total: 0, byType: {} });
    }
    
    const hourStats = this.transactionStats.get(hourKey);
    hourStats.total++;
    hourStats.byType[type] = (hourStats.byType[type] || 0) + 1;
    
    // Update type stats
    const typeKey = `type_${type}`;
    if (!this.transactionStats.has(typeKey)) {
      this.transactionStats.set(typeKey, { total: 0, lastSeen: 0 });
    }
    
    const typeStats = this.transactionStats.get(typeKey);
    typeStats.total++;
    typeStats.lastSeen = transaction.timestamp;
  }

  async initializeStats() {
    // Load recent stats from Redis
    const today = this.getDateKey(Date.now());
    const transactions = await this.redis.zrange(`txlog:${today}`, 0, -1);
    
    for (const txStr of transactions) {
      try {
        const tx = JSON.parse(txStr);
        this.updateStats(tx);
      } catch (error) {
        // Skip invalid entries
      }
    }
  }

  extractEventType(channel) {
    const parts = channel.split(':');
    
    if (parts[0] === 'queue' && parts[2]) {
      return `queue_${parts[2]}`;
    }
    
    if (parts[0] === 'agent' && parts[2]) {
      return `agent_${parts[2]}`;
    }
    
    if (parts[0] === 'dlq' && parts[2]) {
      return `dlq_${parts[2]}`;
    }
    
    return parts.join('_');
  }

  getDateKey(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }

  async query(options = {}) {
    const {
      startTime = Date.now() - 3600000, // Last hour
      endTime = Date.now(),
      type = null,
      queue = null,
      limit = 100,
      offset = 0
    } = options;
    
    try {
      let key;
      
      if (queue) {
        key = `txlog:queue:${queue}:${this.getDateKey(startTime)}`;
      } else if (type) {
        key = `txlog:type:${type}:${this.getDateKey(startTime)}`;
      } else {
        key = `txlog:${this.getDateKey(startTime)}`;
      }
      
      // Get transaction IDs or full transactions
      const results = await this.redis.zrangebyscore(
        key,
        startTime,
        endTime,
        'LIMIT',
        offset,
        limit
      );
      
      // If we got IDs, fetch full transactions
      if (queue || type) {
        const transactions = [];
        for (const id of results) {
          const tx = await this.getTransactionById(id, startTime);
          if (tx) transactions.push(tx);
        }
        return transactions;
      }
      
      // Parse full transactions
      return results.map(r => JSON.parse(r));
      
    } catch (error) {
      this.logger.error('Query error', { options, error });
      return [];
    }
  }

  async getTransactionById(id, timestamp) {
    const dateKey = this.getDateKey(timestamp);
    const transactions = await this.redis.zrange(`txlog:${dateKey}`, 0, -1);
    
    for (const txStr of transactions) {
      try {
        const tx = JSON.parse(txStr);
        if (tx.id === id) return tx;
      } catch (error) {
        // Skip invalid entries
      }
    }
    
    return null;
  }

  async generateReport(options = {}) {
    const {
      startTime = Date.now() - 86400000, // Last 24 hours
      endTime = Date.now(),
      groupBy = 'hour'
    } = options;
    
    const report = {
      period: { startTime, endTime },
      summary: {
        total: 0,
        byType: {},
        byQueue: {},
        byHour: {}
      },
      timeline: [],
      topQueues: [],
      errorRate: 0
    };
    
    // Get all transactions in period
    const dateKeys = this.getDateKeysInRange(startTime, endTime);
    
    for (const dateKey of dateKeys) {
      const transactions = await this.redis.zrangebyscore(
        `txlog:${dateKey}`,
        startTime,
        endTime
      );
      
      for (const txStr of transactions) {
        try {
          const tx = JSON.parse(txStr);
          
          // Update summary
          report.summary.total++;
          
          // By type
          const type = tx.type || 'unknown';
          report.summary.byType[type] = (report.summary.byType[type] || 0) + 1;
          
          // By queue
          const queue = tx.queue || tx.data?.queue;
          if (queue) {
            report.summary.byQueue[queue] = (report.summary.byQueue[queue] || 0) + 1;
          }
          
          // By hour
          const hour = new Date(tx.timestamp).getHours();
          report.summary.byHour[hour] = (report.summary.byHour[hour] || 0) + 1;
          
          // Track errors
          if (type.includes('failed') || type.includes('error')) {
            report.errorRate++;
          }
          
        } catch (error) {
          // Skip invalid entries
        }
      }
    }
    
    // Calculate error rate
    report.errorRate = report.summary.total > 0 
      ? (report.errorRate / report.summary.total) * 100 
      : 0;
    
    // Get top queues
    report.topQueues = Object.entries(report.summary.byQueue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([queue, count]) => ({ queue, count }));
    
    // Generate timeline
    if (groupBy === 'hour') {
      for (let hour = 0; hour < 24; hour++) {
        report.timeline.push({
          hour,
          count: report.summary.byHour[hour] || 0
        });
      }
    }
    
    return report;
  }

  getDateKeysInRange(startTime, endTime) {
    const keys = [];
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      keys.push(this.getDateKey(d.getTime()));
    }
    
    return keys;
  }

  async cleanupOldLogs() {
    try {
      // Clean up Redis logs
      const cutoffTime = Date.now() - (this.config.retention * 86400000);
      const oldDateKeys = this.getDateKeysInRange(
        cutoffTime - (7 * 86400000), // Extra week buffer
        cutoffTime
      );
      
      for (const dateKey of oldDateKeys) {
        await this.redis.del(`txlog:${dateKey}`);
        await this.redis.del(`txlog:type:*:${dateKey}`);
        await this.redis.del(`txlog:queue:*:${dateKey}`);
      }
      
      // Clean up file logs
      if (this.config.enableFileBackup) {
        await this.cleanupFileBackups();
      }
      
      this.logger.info('Cleaned up old logs', { cutoffTime });
      
    } catch (error) {
      this.logger.error('Error cleaning up logs', error);
    }
  }

  async cleanupFileBackups() {
    const files = await fs.readdir(this.config.logDir);
    const cutoffTime = Date.now() - (this.config.retention * 86400000);
    
    for (const file of files) {
      if (file.startsWith('transactions_')) {
        const filePath = path.join(this.config.logDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          if (this.config.compressOldLogs && !file.endsWith('.gz')) {
            // Compress before deletion
            await this.compressLog(filePath);
          }
          
          await fs.unlink(filePath);
          this.logger.info('Deleted old log file', { file });
        }
      }
    }
  }

  async compressLog(filePath) {
    const zlib = require('zlib');
    const { pipeline } = require('stream');
    const { promisify } = require('util');
    const pipe = promisify(pipeline);
    
    const gzip = zlib.createGzip();
    const source = require('fs').createReadStream(filePath);
    const destination = require('fs').createWriteStream(`${filePath}.gz`);
    
    await pipe(source, gzip, destination);
  }

  async getStats() {
    const stats = {
      timestamp: Date.now(),
      buffer: {
        size: this.buffer.length,
        oldestTransaction: this.buffer[0]?.timestamp
      },
      hourlyStats: {},
      typeStats: {}
    };
    
    // Convert Map to object for JSON serialization
    for (const [key, value] of this.transactionStats) {
      if (key.startsWith('hour_')) {
        stats.hourlyStats[key] = value;
      } else if (key.startsWith('type_')) {
        stats.typeStats[key] = value;
      }
    }
    
    // Get today's total
    const today = this.getDateKey(Date.now());
    stats.todayTotal = await this.redis.zcard(`txlog:${today}`);
    
    return stats;
  }

  async stop() {
    this.logger.info('Stopping Transaction Logger');
    
    // Flush remaining buffer
    await this.flushBuffer();
    
    // Clear intervals
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Close Redis connections
    await this.redis.disconnect();
    await this.subClient.disconnect();
    
    this.emit('stopped');
  }
}

module.exports = TransactionLogger;

// Start if run directly
if (require.main === module) {
  const logger = new TransactionLogger();
  
  logger.start().catch(error => {
    console.error('Failed to start transaction logger:', error);
    process.exit(1);
  });
  
  process.on('SIGINT', async () => {
    await logger.stop();
    process.exit(0);
  });
}