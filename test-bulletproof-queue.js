#!/usr/bin/env node

/**
 * Bulletproof Queue System Test Suite
 * Tests all components of the enhanced queue system
 */

const Redis = require('ioredis');
const { spawn } = require('child_process');
const axios = require('axios');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Test configuration
const config = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  testDuration: 300000, // 5 minutes
  concurrentTasks: 50,
  failureRate: 0.2, // 20% simulated failures
  agentCount: 3,
  orchestratorHealthCheck: 5000
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'test-results.log' }),
    new winston.transports.Console()
  ]
});

class BulletproofQueueTester {
  constructor() {
    this.redis = new Redis(config.redisUrl);
    this.processes = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    logger.info('Starting Bulletproof Queue System Tests');
    
    try {
      // Clean up before tests
      await this.cleanup();
      
      // Start core services
      await this.startServices();
      
      // Wait for services to initialize
      await this.sleep(5000);
      
      // Run test suites
      await this.testOrchestratorFunctionality();
      await this.testQueueResilience();
      await this.testAgentCommunication();
      await this.testErrorHandling();
      await this.testDLQProcessing();
      await this.testHealthMonitoring();
      await this.testTransactionLogging();
      await this.testLoadBalancing();
      await this.testAutoRecovery();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      logger.error('Test suite failed', error);
    } finally {
      // Cleanup
      await this.stopServices();
      await this.cleanup();
    }
  }

  async startServices() {
    logger.info('Starting services...');
    
    // Start Orchestrator
    const orchestrator = spawn('node', ['agents/orchestrator/index.js'], {
      env: { ...process.env, AGENT_ID: 'test_orchestrator' }
    });
    
    orchestrator.stdout.on('data', (data) => {
      logger.debug(`Orchestrator: ${data}`);
    });
    
    orchestrator.stderr.on('data', (data) => {
      logger.error(`Orchestrator Error: ${data}`);
    });
    
    this.processes.push(orchestrator);
    
    // Start Health Monitor
    const healthMonitor = spawn('node', ['cli/queue-health-monitor.js']);
    this.processes.push(healthMonitor);
    
    // Start DLQ Manager
    const dlqManager = spawn('node', ['cli/dlq-manager.js']);
    this.processes.push(dlqManager);
    
    // Start Transaction Logger
    const txLogger = spawn('node', ['cli/transaction-logger.js']);
    this.processes.push(txLogger);
    
    // Start test agents
    for (let i = 0; i < config.agentCount; i++) {
      const agent = spawn('node', ['test/mock-agent.js'], {
        env: { 
          ...process.env, 
          AGENT_ID: `test_agent_${i}`,
          FAILURE_RATE: config.failureRate
        }
      });
      this.processes.push(agent);
    }
    
    logger.info(`Started ${this.processes.length} services`);
  }

  async stopServices() {
    logger.info('Stopping services...');
    
    for (const proc of this.processes) {
      proc.kill('SIGTERM');
    }
    
    // Wait for graceful shutdown
    await this.sleep(2000);
    
    // Force kill if still running
    for (const proc of this.processes) {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }
  }

  async testOrchestratorFunctionality() {
    const testName = 'Orchestrator Functionality';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Test orchestrator registration
      const registered = await this.waitForCondition(async () => {
        const status = await this.redis.get('orchestrator:status');
        return status !== null;
      }, 10000);
      
      this.assert(registered, 'Orchestrator should register itself');
      
      // Test command handling
      await this.redis.publish('orchestrator:command', JSON.stringify({
        type: 'health_check'
      }));
      
      await this.sleep(1000);
      
      const healthData = await this.redis.get('orchestrator:health:latest');
      this.assert(healthData !== null, 'Orchestrator should respond to health check');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testQueueResilience() {
    const testName = 'Queue Resilience';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Enqueue multiple tasks
      const tasks = [];
      for (let i = 0; i < config.concurrentTasks; i++) {
        const task = {
          id: `test_task_${i}`,
          file: `test/file_${i}.js`,
          prompt: 'Test task',
          timestamp: Date.now()
        };
        
        await this.redis.rpush('queue:gpt-4o', JSON.stringify(task));
        tasks.push(task);
      }
      
      // Wait for processing
      await this.sleep(10000);
      
      // Check processing
      const queueDepth = await this.redis.llen('queue:gpt-4o');
      const processingCount = await this.redis.hlen('processing:queue:gpt-4o');
      
      this.assert(
        queueDepth < config.concurrentTasks,
        'Tasks should be processed from queue'
      );
      
      // Simulate queue interruption
      await this.redis.del('queue:gpt-4o');
      
      // Re-add some tasks
      for (let i = 0; i < 5; i++) {
        await this.redis.rpush('queue:gpt-4o', JSON.stringify(tasks[i]));
      }
      
      await this.sleep(5000);
      
      // Verify recovery
      const newDepth = await this.redis.llen('queue:gpt-4o');
      this.assert(newDepth < 5, 'Queue should recover and continue processing');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testAgentCommunication() {
    const testName = 'Agent Communication';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Wait for agents to register
      const agents = await this.waitForCondition(async () => {
        const keys = await this.redis.keys('agent:status:*');
        return keys.length >= config.agentCount;
      }, 15000);
      
      this.assert(agents, 'All agents should register');
      
      // Test direct messaging
      await this.redis.publish('agent:test_agent_0:task', JSON.stringify({
        id: 'comm_test_1',
        type: 'test',
        message: 'Test communication'
      }));
      
      // Test broadcast
      await this.redis.publish('agent:broadcast', JSON.stringify({
        type: 'test_broadcast',
        message: 'Broadcast test'
      }));
      
      await this.sleep(2000);
      
      // Verify status updates
      const statusKeys = await this.redis.keys('agent:status:*');
      this.assert(
        statusKeys.length >= config.agentCount,
        'All agents should update status'
      );
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testErrorHandling() {
    const testName = 'Error Handling';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Queue tasks that will fail
      const failTasks = [];
      for (let i = 0; i < 10; i++) {
        const task = {
          id: `fail_task_${i}`,
          file: 'test/fail.js',
          prompt: 'FORCE_FAILURE',
          timestamp: Date.now()
        };
        
        await this.redis.rpush('queue:gpt-4o', JSON.stringify(task));
        failTasks.push(task);
      }
      
      // Wait for processing
      await this.sleep(10000);
      
      // Check failures
      const failures = await this.redis.lrange('queue:failures', 0, -1);
      this.assert(failures.length > 0, 'Failed tasks should be recorded');
      
      // Check DLQ
      const dlqDepth = await this.redis.llen('dlq:gpt-4o');
      this.assert(dlqDepth > 0, 'Some tasks should move to DLQ');
      
      // Verify error reporting
      const errorLogs = await this.redis.zrange('agent:errors', 0, -1);
      this.assert(errorLogs.length > 0, 'Errors should be logged');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testDLQProcessing() {
    const testName = 'DLQ Processing';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Add tasks to DLQ
      const dlqTasks = [];
      for (let i = 0; i < 5; i++) {
        const task = {
          id: `dlq_test_${i}`,
          file: `test/dlq_${i}.js`,
          prompt: 'DLQ test',
          error: 'rate_limit_exceeded',
          retries: 1,
          failedAt: Date.now() - 60000
        };
        
        await this.redis.rpush('dlq:gpt-4o', JSON.stringify(task));
        dlqTasks.push(task);
      }
      
      // Wait for DLQ processing
      await this.sleep(35000); // DLQ processes every 30 seconds
      
      // Check if tasks were retried
      const dlqDepth = await this.redis.llen('dlq:gpt-4o');
      this.assert(
        dlqDepth < 5,
        'DLQ tasks should be processed and retried'
      );
      
      // Check retry logs
      const retryLogs = await this.redis.zrange('dlq:log:dlq:gpt-4o', 0, -1);
      this.assert(retryLogs.length > 0, 'DLQ actions should be logged');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testHealthMonitoring() {
    const testName = 'Health Monitoring';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Create unhealthy conditions
      for (let i = 0; i < 200; i++) {
        await this.redis.rpush('queue:claude-3-opus', JSON.stringify({
          id: `health_test_${i}`,
          file: 'test.js',
          prompt: 'Health test'
        }));
      }
      
      // Wait for health check
      await this.sleep(10000);
      
      // Check health status
      const healthEvents = await this.waitForCondition(async () => {
        const events = await this.redis.lrange('health:corrections', 0, -1);
        return events.length > 0;
      }, 20000);
      
      this.assert(healthEvents, 'Health monitor should detect and correct issues');
      
      // Verify auto-correction
      const queueDepth = await this.redis.llen('queue:claude-3-opus');
      this.assert(
        queueDepth < 200,
        'Queue depth should be reduced by auto-correction'
      );
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testTransactionLogging() {
    const testName = 'Transaction Logging';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Generate various transactions
      const txTypes = ['enqueue', 'dequeue', 'complete', 'failed'];
      
      for (const type of txTypes) {
        await this.redis.publish(`queue:test:${type}`, JSON.stringify({
          id: `tx_test_${type}`,
          type: type,
          timestamp: Date.now()
        }));
      }
      
      await this.sleep(5000);
      
      // Query transactions
      const today = new Date().toISOString().split('T')[0];
      const transactions = await this.redis.zrange(`txlog:${today}`, 0, -1);
      
      this.assert(transactions.length > 0, 'Transactions should be logged');
      
      // Verify transaction structure
      const tx = JSON.parse(transactions[0]);
      this.assert(tx.id && tx.timestamp, 'Transactions should have required fields');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testLoadBalancing() {
    const testName = 'Load Balancing';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Create load imbalance
      const queues = ['queue:gpt-4o', 'queue:claude-3-opus', 'queue:deepseek-coder'];
      
      // Overload one queue
      for (let i = 0; i < 100; i++) {
        await this.redis.rpush(queues[0], JSON.stringify({
          id: `load_test_${i}`,
          file: 'test.js',
          prompt: 'Load test'
        }));
      }
      
      // Light load on others
      for (let i = 1; i < queues.length; i++) {
        await this.redis.rpush(queues[i], JSON.stringify({
          id: `load_test_light_${i}`,
          file: 'test.js',
          prompt: 'Light load'
        }));
      }
      
      // Trigger rebalance
      await this.redis.publish('orchestrator:command', JSON.stringify({
        type: 'rebalance'
      }));
      
      await this.sleep(10000);
      
      // Check if load was distributed
      const depths = await Promise.all(
        queues.map(q => this.redis.llen(q))
      );
      
      const variance = this.calculateVariance(depths);
      this.assert(
        variance < 1000,
        'Queue depths should be more balanced after redistribution'
      );
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testAutoRecovery() {
    const testName = 'Auto Recovery';
    logger.info(`Testing: ${testName}`);
    
    try {
      // Simulate agent failure
      const agentKeys = await this.redis.keys('agent:status:*');
      if (agentKeys.length > 0) {
        // Mark agent as unresponsive
        const agent = await this.redis.get(agentKeys[0]);
        const agentData = JSON.parse(agent);
        agentData.timestamp = Date.now() - 60000; // 1 minute ago
        await this.redis.set(agentKeys[0], JSON.stringify(agentData));
      }
      
      // Add stuck tasks
      const stuckTask = {
        id: 'stuck_task_1',
        file: 'stuck.js',
        prompt: 'Stuck task',
        agentId: 'test_agent_0',
        startTime: Date.now() - 3600000 // 1 hour ago
      };
      
      await this.redis.hset(
        'processing:queue:gpt-4o',
        stuckTask.id,
        JSON.stringify(stuckTask)
      );
      
      // Wait for recovery
      await this.sleep(15000);
      
      // Check if stuck task was recovered
      const stillStuck = await this.redis.hget('processing:queue:gpt-4o', stuckTask.id);
      this.assert(!stillStuck, 'Stuck task should be recovered');
      
      // Check if task was requeued
      const queueDepth = await this.redis.llen('queue:gpt-4o');
      this.assert(queueDepth > 0, 'Stuck task should be requeued');
      
      this.recordTest(testName, true);
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  // Helper methods
  async cleanup() {
    logger.info('Cleaning up test data...');
    
    const patterns = [
      'queue:*',
      'processing:*',
      'dlq:*',
      'agent:*',
      'orchestrator:*',
      'txlog:*',
      'health:*'
    ];
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  async waitForCondition(condition, timeout = 10000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await this.sleep(100);
    }
    
    return false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(x => Math.pow(x - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  recordTest(name, passed, error = null) {
    const result = {
      name,
      passed,
      error,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.tests.push(result);
    
    if (passed) {
      this.testResults.passed++;
      logger.info(`✓ ${name}`);
    } else {
      this.testResults.failed++;
      logger.error(`✗ ${name}: ${error}`);
    }
  }

  generateReport() {
    logger.info('\n========== TEST REPORT ==========');
    logger.info(`Total Tests: ${this.testResults.tests.length}`);
    logger.info(`Passed: ${this.testResults.passed}`);
    logger.info(`Failed: ${this.testResults.failed}`);
    logger.info(`Success Rate: ${((this.testResults.passed / this.testResults.tests.length) * 100).toFixed(2)}%`);
    
    if (this.testResults.failed > 0) {
      logger.info('\nFailed Tests:');
      this.testResults.tests
        .filter(t => !t.passed)
        .forEach(t => {
          logger.error(`  - ${t.name}: ${t.error}`);
        });
    }
    
    logger.info('=================================\n');
    
    // Save detailed report
    const fs = require('fs');
    fs.writeFileSync(
      'test-report.json',
      JSON.stringify(this.testResults, null, 2)
    );
  }
}

// Create mock agent for testing
if (process.argv[2] === '--mock-agent') {
  const BaseAgent = require('./agents/base-agent');
  
  class MockAgent extends BaseAgent {
    async processTask(task) {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000));
      
      // Simulate failures based on config
      if (task.prompt === 'FORCE_FAILURE' || Math.random() < parseFloat(process.env.FAILURE_RATE || 0)) {
        throw new Error('Simulated task failure');
      }
      
      return {
        success: true,
        result: 'Mock task completed'
      };
    }
  }
  
  const agent = new MockAgent({
    model: 'mock-model',
    role: 'test-agent'
  });
  
  agent.initialize().catch(console.error);
  
} else {
  // Run tests
  const tester = new BulletproofQueueTester();
  tester.runAllTests().catch(console.error);
}

module.exports = BulletproofQueueTester;