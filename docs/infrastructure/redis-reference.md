# Redis Reference Guide

## Overview
Redis is an in-memory data structure store used as a database, cache, and message broker for the Ez Aigent system.

## Installation & Setup

### Docker (Recommended)
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Local Installation
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start service
redis-server
```

## Core Data Structures

### Strings
```bash
SET key value
GET key
INCR counter
EXPIRE key 300  # 5 minutes
```

### Lists (Queues)
```bash
LPUSH queue:tasks "task1"
RPOP queue:tasks
LLEN queue:tasks
LRANGE queue:tasks 0 -1
```

### Hashes
```bash
HSET user:1 name "John" age 30
HGET user:1 name
HGETALL user:1
```

### Sets
```bash
SADD tags "redis" "cache" "database"
SMEMBERS tags
SISMEMBER tags "redis"
```

### Sorted Sets
```bash
ZADD leaderboard 100 "player1" 200 "player2"
ZRANGE leaderboard 0 -1 WITHSCORES
```

## Pub/Sub Messaging

### Publishing
```bash
PUBLISH channel:updates "message content"
```

### Subscribing
```bash
SUBSCRIBE channel:updates
PSUBSCRIBE channel:*  # Pattern matching
```

### Python Example
```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Publisher
r.publish('agent:status', 'Agent started')

# Subscriber
pubsub = r.pubsub()
pubsub.subscribe('agent:*')
for message in pubsub.listen():
    print(message['data'])
```

## Node.js Integration (ioredis)

### Installation
```bash
npm install ioredis
```

### Basic Usage
```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false
});

// Basic operations
await redis.set('key', 'value');
const value = await redis.get('key');

// Queue operations
await redis.lpush('queue:tasks', JSON.stringify(task));
const task = await redis.brpop('queue:tasks', 0);
```

### Connection Options
```javascript
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  family: 4,
  keepAlive: 30000,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true
});
```

## Queue Management

### Ez Aigent Queue Pattern
```bash
# Task queues
LPUSH queue:claude-3-opus "task_data"
LPUSH queue:gpt-4o "task_data"
LPUSH queue:deepseek-coder "task_data"

# Processing queues
RPOPLPUSH queue:claude-3-opus processing:claude-3-opus

# Failure handling
LPUSH queue:failures "failed_task_data"
```

### Queue Monitoring
```bash
# Check queue lengths
LLEN queue:claude-3-opus
LLEN processing:claude-3-opus
LLEN queue:failures

# View queue contents
LRANGE queue:claude-3-opus 0 4
LRANGE queue:failures 0 -1
```

## File Locking

### Lock Implementation
```bash
# Acquire lock
SET file_lock:src/api.js "agent_id" EX 1800 NX

# Check lock
GET file_lock:src/api.js

# Release lock
DEL file_lock:src/api.js

# Auto-expiry (30 minutes)
EXPIRE file_lock:src/api.js 1800
```

### Node.js Lock Manager
```javascript
class FileLockManager {
  constructor(redis) {
    this.redis = redis;
    this.lockTTL = 1800; // 30 minutes
  }

  async acquireLock(filePath, agentId) {
    const lockKey = `file_lock:${filePath}`;
    const result = await this.redis.set(lockKey, agentId, 'EX', this.lockTTL, 'NX');
    return result === 'OK';
  }

  async releaseLock(filePath, agentId) {
    const lockKey = `file_lock:${filePath}`;
    const script = `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      else
        return 0
      end
    `;
    return await this.redis.eval(script, 1, lockKey, agentId);
  }
}
```

## Agent Status Tracking

### Status Updates
```bash
# Set agent status
HSET agent:claude_001 status "active" task "refactoring" started_at "2024-01-01T10:00:00Z"

# Get agent status
HGETALL agent:claude_001

# Agent heartbeat
HSET agent:claude_001 last_seen "2024-01-01T10:05:00Z"
```

### Status Monitoring
```javascript
async function updateAgentStatus(agentId, status, task = null) {
  const statusKey = `agent:${agentId}`;
  const statusData = {
    status,
    last_seen: new Date().toISOString(),
    task: task || 'idle'
  };
  
  await redis.hset(statusKey, statusData);
  await redis.publish('agent:status', JSON.stringify({
    agentId,
    ...statusData
  }));
}
```

## Error Handling & Monitoring

### Connection Monitoring
```javascript
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});
```

### Retry Logic
```javascript
const retryOperation = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
```

## Performance Optimization

### Connection Pooling
```javascript
const Redis = require('ioredis');
const cluster = new Redis.Cluster([
  { host: 'localhost', port: 6379 }
], {
  enableOfflineQueue: false,
  redisOptions: {
    maxRetriesPerRequest: 3
  }
});
```

### Pipelining
```javascript
const pipeline = redis.pipeline();
pipeline.lpush('queue:tasks', 'task1');
pipeline.lpush('queue:tasks', 'task2');
pipeline.lpush('queue:tasks', 'task3');
await pipeline.exec();
```

## Security Best Practices

### Authentication
```bash
# Set password
CONFIG SET requirepass "your-password"

# Connect with auth
redis-cli -a "your-password"
```

### Network Security
```bash
# Bind to specific interface
bind 127.0.0.1

# Disable dangerous commands
rename-command FLUSHALL ""
rename-command FLUSHDB ""
```

## Monitoring & Diagnostics

### Redis CLI Commands
```bash
# Server info
INFO server
INFO memory
INFO clients

# Monitor commands
MONITOR

# Slow log
SLOWLOG GET 10

# Client list
CLIENT LIST
```

### Memory Usage
```bash
# Memory info
INFO memory

# Key sampling
MEMORY USAGE key_name

# Memory stats
MEMORY STATS
```

## Backup & Recovery

### RDB Snapshots
```bash
# Manual snapshot
BGSAVE

# Configure automatic snapshots
# In redis.conf:
save 900 1    # Save after 900 seconds if at least 1 key changed
save 300 10   # Save after 300 seconds if at least 10 keys changed
save 60 10000 # Save after 60 seconds if at least 10000 keys changed
```

### AOF (Append Only File)
```bash
# Enable AOF
appendonly yes
appendfilename "appendonly.aof"

# Rewrite AOF
BGREWRITEAOF
```

## Ez Aigent Integration

### Queue Configuration
```javascript
const QUEUE_CONFIG = {
  'claude-3-opus': { maxConcurrency: 3, priority: 'high' },
  'gpt-4o': { maxConcurrency: 5, priority: 'medium' },
  'deepseek-coder': { maxConcurrency: 10, priority: 'low' },
  'command-r-plus': { maxConcurrency: 3, priority: 'medium' },
  'gemini-pro': { maxConcurrency: 5, priority: 'medium' }
};
```

### Health Check
```javascript
async function redisHealthCheck() {
  try {
    const pong = await redis.ping();
    const info = await redis.info('server');
    return {
      status: 'healthy',
      latency: Date.now() - startTime,
      version: info.match(/redis_version:(.+)/)[1]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```