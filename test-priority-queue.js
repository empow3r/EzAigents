#!/usr/bin/env node

// Test script for priority queue system
const Redis = require('ioredis');
const QueueEnhancer = require('./cli/queue-enhancer');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function testPriorityQueue() {
  console.log('🧪 Testing Priority Queue System...\n');
  
  const queueEnhancer = new QueueEnhancer(redis, {
    enableFeatures: {
      priorities: true,
      deduplication: true,
      analytics: true,
      alerts: true
    }
  });

  const testQueue = 'queue:test-model';
  
  // Clean up previous test data
  console.log('🧹 Cleaning up previous test data...');
  const keys = await redis.keys(`${testQueue}*`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
  await redis.del('analytics:*', 'dedup:*');
  
  console.log('✅ Test data cleaned\n');

  // Test 1: Basic priority enqueuing
  console.log('📥 Test 1: Basic Priority Enqueuing');
  const tasks = [
    { file: 'src/security/auth.js', prompt: 'Fix security vulnerability', type: 'security' },
    { file: 'src/api/users.js', prompt: 'Add new feature', type: 'feature' },
    { file: 'src/utils/cleanup.js', prompt: 'Code cleanup', type: 'cleanup' },
    { file: 'src/config/production.js', prompt: 'Production hotfix', type: 'hotfix' },
    { file: 'docs/readme.md', prompt: 'Update documentation', type: 'documentation' }
  ];

  for (const task of tasks) {
    const result = await queueEnhancer.enqueue(testQueue, task);
    console.log(`   Enqueued: ${task.file} -> Priority: ${result.priority}`);
  }
  
  // Test 2: Priority-aware dequeuing
  console.log('\n📤 Test 2: Priority-Aware Dequeuing');
  const dequeuedTasks = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const result = await queueEnhancer.dequeue([testQueue], 0);
    if (result) {
      dequeuedTasks.push(result);
      console.log(`   Dequeued: ${result.task.file} -> Priority: ${result.priority}`);
    }
  }
  
  // Test 3: Deduplication
  console.log('\n🔄 Test 3: Task Deduplication');
  const duplicateTask = { file: 'src/security/auth.js', prompt: 'Fix security vulnerability', type: 'security' };
  
  const result1 = await queueEnhancer.enqueue(testQueue, duplicateTask);
  console.log(`   First attempt: ${result1.success ? 'Success' : 'Failed'} (ID: ${result1.taskId})`);
  
  const result2 = await queueEnhancer.enqueue(testQueue, duplicateTask);
  console.log(`   Duplicate attempt: ${result2.success ? 'Success' : 'Blocked'} (Reason: ${result2.reason})`);
  
  // Test 4: Queue statistics
  console.log('\n📊 Test 4: Queue Statistics');
  
  // Add some tasks with different priorities
  await queueEnhancer.enqueue(testQueue, { file: 'test1.js', type: 'security' });
  await queueEnhancer.enqueue(testQueue, { file: 'test2.js', type: 'feature' });
  await queueEnhancer.enqueue(testQueue, { file: 'test3.js', type: 'cleanup' });
  
  const stats = await queueEnhancer.getQueueStats(testQueue);
  console.log('   Queue Stats:', JSON.stringify(stats, null, 2));
  
  // Test 5: Analytics
  console.log('\n📈 Test 5: Analytics');
  const analytics = await queueEnhancer.getAnalytics(testQueue);
  console.log('   Analytics:', JSON.stringify(analytics, null, 2));
  
  // Test 6: Metrics
  console.log('\n📋 Test 6: System Metrics');
  const metrics = await queueEnhancer.getMetrics();
  console.log('   Metrics:', JSON.stringify(metrics, null, 2));
  
  // Verify priority ordering was correct
  console.log('\n✅ Priority Ordering Verification:');
  const expectedOrder = ['critical', 'high', 'normal', 'low', 'deferred'];
  const actualOrder = dequeuedTasks.map(t => t.priority);
  
  let correctOrder = true;
  for (let i = 0; i < actualOrder.length - 1; i++) {
    const currentPriorityIndex = expectedOrder.indexOf(actualOrder[i]);
    const nextPriorityIndex = expectedOrder.indexOf(actualOrder[i + 1]);
    
    if (currentPriorityIndex > nextPriorityIndex) {
      correctOrder = false;
      console.log(`   ❌ Priority order violation: ${actualOrder[i]} should come before ${actualOrder[i + 1]}`);
    }
  }
  
  if (correctOrder) {
    console.log('   ✅ Priority ordering is correct!');
  }
  
  console.log(`\n   Dequeue order: ${actualOrder.join(' -> ')}`);
  
  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  const cleanupKeys = await redis.keys(`${testQueue}*`);
  if (cleanupKeys.length > 0) {
    await redis.del(cleanupKeys);
  }
  
  console.log('\n🎉 Priority Queue System Test Complete!');
  console.log('📊 Summary:');
  console.log(`   ✅ Priority Enqueuing: ${tasks.length} tasks`);
  console.log(`   ✅ Priority Dequeuing: ${dequeuedTasks.length} tasks`);
  console.log(`   ✅ Deduplication: ${result2.reason === 'duplicate' ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Queue Stats: ${stats.total >= 0 ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Analytics: ${Object.keys(analytics).length > 0 ? 'Working' : 'Failed'}`);
  console.log(`   ✅ Priority Ordering: ${correctOrder ? 'Correct' : 'Failed'}`);
  
  await redis.disconnect();
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testPriorityQueue().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = testPriorityQueue;