# Priority Queue System Testing Guide

This guide provides step-by-step instructions for testing the enhanced priority queue system in Ez Aigent.

## Prerequisites

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Redis Server

#### Option A: Using Docker (Recommended)
```bash
# Start Redis in Docker
docker run -d --name ez-aigent-redis -p 6379:6379 redis:alpine

# Verify Redis is running
docker ps | grep redis
redis-cli ping  # Should return PONG
```

#### Option B: Local Redis Installation
```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping  # Should return PONG
```

#### Option C: Redis Cloud (for production testing)
```bash
# Set environment variable
export REDIS_URL="redis://username:password@host:port"
```

## Testing Scenarios

### 1. Basic Functionality Test

#### Quick Smoke Test (2 minutes)
```bash
# Run the comprehensive test suite
node test-priority-queue.js
```

**Expected Output:**
```
🧪 Testing Priority Queue System...
✅ Test data cleaned
📥 Test 1: Basic Priority Enqueuing
   Enqueued: src/security/auth.js -> Priority: critical
   Enqueued: src/api/users.js -> Priority: normal
   Enqueued: src/utils/cleanup.js -> Priority: low
   ...
🎉 Priority Queue System Test Complete!
📊 Summary:
   ✅ Priority Enqueuing: 5 tasks
   ✅ Priority Dequeuing: 5 tasks
   ✅ Deduplication: Working
   ✅ Queue Stats: Working
   ✅ Analytics: Working
   ✅ Priority Ordering: Correct
```

### 2. Manual Step-by-Step Testing

#### Test Priority Assignment
```bash
# Create test tasks with different priorities
node -e "
const Redis = require('ioredis');
const QueueEnhancer = require('./cli/queue-enhancer');

(async () => {
  const redis = new Redis();
  const enhancer = new QueueEnhancer(redis);
  
  // Test different task types
  const tasks = [
    { file: 'src/security/auth.js', prompt: 'Fix vulnerability', type: 'security' },
    { file: 'src/api/users.js', prompt: 'Add feature', type: 'feature' },
    { file: 'docs/readme.md', prompt: 'Update docs', type: 'documentation' }
  ];
  
  for (const task of tasks) {
    const result = await enhancer.enqueue('queue:test', task);
    console.log(\`\${task.file} -> Priority: \${result.priority}\`);
  }
  
  await redis.disconnect();
})();
"
```

#### Test Deduplication
```bash
# Test duplicate task prevention
node -e "
const Redis = require('ioredis');
const QueueEnhancer = require('./cli/queue-enhancer');

(async () => {
  const redis = new Redis();
  const enhancer = new QueueEnhancer(redis);
  
  const task = { file: 'test.js', prompt: 'Same task', type: 'feature' };
  
  const result1 = await enhancer.enqueue('queue:test', task);
  console.log('First attempt:', result1.success);
  
  const result2 = await enhancer.enqueue('queue:test', task);
  console.log('Duplicate attempt:', result2.success, result2.reason);
  
  await redis.disconnect();
})();
"
```

### 3. Integration Testing

#### Test with Existing Enqueue System
```bash
# Set environment variables for testing
export ENABLE_PRIORITIES=true
export ENABLE_DEDUPLICATION=true
export REDIS_URL=redis://localhost:6379

# Test the enhanced enqueue system
cd cli
node enqueue.js
```

**Expected Output:**
```
🚀 Enqueuing jobs...
📩 Enqueued src/api/handler.js to claude-3-opus (Priority: normal, ID: task_1234_abcd5678)
📩 Enqueued src/security/auth.js to gpt-4o (Priority: critical, ID: task_1234_efgh9012)
...
✅ All jobs enqueued successfully!
```

#### Test with Runner System
```bash
# In another terminal, start the enhanced runner
node runner.js
```

**Expected Output:**
```
🎯 Enhanced Multi-Agent Orchestrator starting
📋 Dequeued src/security/auth.js from queue:gpt-4o (Priority: critical)
✅ gpt-4o updated src/security/auth.js (Task: orchestrator_1234, Priority: critical)
```

### 4. Dashboard Testing

#### Test Enhanced Queue Stats API
```bash
# Start the dashboard (if not running)
cd dashboard
npm run dev

# Test the enhanced API endpoint
curl http://localhost:3000/api/queue-stats | jq '.'
```

**Expected Response:**
```json
{
  "success": true,
  "queues": [
    {
      "model": "claude-3-opus",
      "pendingCount": 5,
      "byPriority": {
        "critical": { "pending": 1, "color": "#dc2626" },
        "high": { "pending": 2, "color": "#ea580c" },
        "normal": { "pending": 2, "color": "#059669" }
      },
      "enhanced": true
    }
  ]
}
```

### 5. Load Testing

#### High-Volume Task Test
```bash
# Create a load test script
node -e "
const Redis = require('ioredis');
const QueueEnhancer = require('./cli/queue-enhancer');

(async () => {
  const redis = new Redis();
  const enhancer = new QueueEnhancer(redis);
  
  console.log('🚀 Starting load test...');
  const startTime = Date.now();
  
  // Enqueue 1000 tasks
  const promises = [];
  for (let i = 0; i < 1000; i++) {
    const task = {
      file: \`test-file-\${i}.js\`,
      prompt: 'Load test task',
      type: i % 2 === 0 ? 'feature' : 'cleanup'
    };
    promises.push(enhancer.enqueue('queue:load-test', task));
  }
  
  await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(\`✅ Enqueued 1000 tasks in \${endTime - startTime}ms\`);
  
  // Get queue stats
  const stats = await enhancer.getQueueStats('queue:load-test');
  console.log('📊 Queue stats:', stats);
  
  await redis.disconnect();
})();
"
```

### 6. Feature Flag Testing

#### Test with Features Disabled
```bash
# Test with priorities disabled
export ENABLE_PRIORITIES=false
node test-priority-queue.js

# Test with deduplication disabled
export ENABLE_DEDUPLICATION=false
node test-priority-queue.js

# Test fallback mode
export ENABLE_PRIORITIES=false
export ENABLE_DEDUPLICATION=false
export ENABLE_ANALYTICS=false
node test-priority-queue.js
```

### 7. Error Handling Testing

#### Test Redis Connection Failure
```bash
# Stop Redis temporarily
docker stop ez-aigent-redis

# Test graceful fallback
node test-priority-queue.js

# Should show fallback behavior
# Restart Redis
docker start ez-aigent-redis
```

#### Test Invalid Priority Configuration
```bash
# Backup and modify priority rules
cp shared/priority-rules.json shared/priority-rules.json.backup
echo '{"enabled": false}' > shared/priority-rules.json

# Test fallback behavior
node test-priority-queue.js

# Restore configuration
mv shared/priority-rules.json.backup shared/priority-rules.json
```

## Performance Benchmarks

### Expected Performance Metrics
- **Enqueue Speed**: >1000 tasks/second
- **Dequeue Speed**: >500 tasks/second  
- **Priority Accuracy**: 100% correct ordering
- **Deduplication Rate**: >99% duplicate detection
- **Memory Usage**: <50MB for 10,000 tasks
- **Redis Memory**: <100MB for 100,000 tasks

### Benchmark Test
```bash
# Run performance benchmark
node -e "
const Redis = require('ioredis');
const QueueEnhancer = require('./cli/queue-enhancer');

(async () => {
  const redis = new Redis();
  const enhancer = new QueueEnhancer(redis);
  
  console.log('📊 Performance Benchmark');
  
  // Enqueue benchmark
  const startEnqueue = Date.now();
  for (let i = 0; i < 1000; i++) {
    await enhancer.enqueue('queue:benchmark', { 
      file: \`file-\${i}.js\`, 
      type: 'feature' 
    });
  }
  const enqueueTime = Date.now() - startEnqueue;
  console.log(\`Enqueue: \${1000 / (enqueueTime / 1000)} tasks/sec\`);
  
  // Dequeue benchmark
  const startDequeue = Date.now();
  for (let i = 0; i < 1000; i++) {
    await enhancer.dequeue(['queue:benchmark'], 0);
  }
  const dequeueTime = Date.now() - startDequeue;
  console.log(\`Dequeue: \${1000 / (dequeueTime / 1000)} tasks/sec\`);
  
  await redis.disconnect();
})();
"
```

## Troubleshooting

### Common Issues

1. **Redis Connection Error**
```bash
# Check Redis status
redis-cli ping
docker ps | grep redis

# Check environment
echo $REDIS_URL
```

2. **Module Not Found Error**
```bash
# Install dependencies
npm install

# Check file paths
ls -la cli/queue-enhancer.js
ls -la shared/priority-rules.json
```

3. **Permission Denied**
```bash
# Make test file executable
chmod +x test-priority-queue.js

# Check file ownership
ls -la test-priority-queue.js
```

4. **Priority Not Working**
```bash
# Check priority configuration
cat shared/priority-rules.json | jq '.enabled'

# Verify environment variables
echo $ENABLE_PRIORITIES
```

## Continuous Testing

### Automated Test Script
```bash
#!/bin/bash
# continuous-test.sh

echo "🔄 Starting continuous priority queue testing..."

while true; do
  echo "$(date): Running test cycle"
  
  if node test-priority-queue.js > /dev/null 2>&1; then
    echo "✅ Test passed"
  else
    echo "❌ Test failed - investigating..."
    node test-priority-queue.js
    break
  fi
  
  sleep 60  # Test every minute
done
```

### Monitoring Commands
```bash
# Monitor queue depths in real-time
watch -n 1 'redis-cli llen queue:claude-3-opus; redis-cli llen queue:gpt-4o'

# Monitor priority queues
watch -n 1 'redis-cli keys "queue:*:p:*" | xargs -I {} redis-cli llen {}'

# Monitor analytics
redis-cli keys "analytics:*" | head -10
```

This comprehensive testing guide ensures your priority queue system is working correctly across all scenarios. Start with the basic functionality test, then progress through integration and load testing as needed.