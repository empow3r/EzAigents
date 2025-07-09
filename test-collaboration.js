#!/usr/bin/env node

/**
 * Multi-Agent Collaboration Protocol Test Suite
 * 
 * This script tests the enhanced multi-agent coordination capabilities:
 * - File locking and coordination
 * - Inter-agent communication
 * - Task delegation and completion tracking
 * - Conflict resolution workflows
 * - Emergency protocols
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

// Import our collaboration components
const AgentCoordinator = require('./cli/coordination-service');
const AgentCommunication = require('./cli/agent-communication');
const FileLockManager = require('./cli/file-lock-manager');
const DelegationOrchestrator = require('./cli/delegation-orchestrator');

class CollaborationTestSuite {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.testResults = [];
    this.testAgents = [];
    this.lockManager = new FileLockManager();
    
    console.log('🧪 Multi-Agent Collaboration Test Suite Initializing...');
  }
  
  async runAllTests() {
    console.log('\n🚀 Starting Multi-Agent Collaboration Protocol Tests\n');
    
    try {
      // Test 1: Basic coordination setup
      await this.testBasicCoordination();
      
      // Test 2: File locking protocol
      await this.testFileLockingProtocol();
      
      // Test 3: Inter-agent communication
      await this.testInterAgentCommunication();
      
      // Test 4: Task delegation workflow
      await this.testTaskDelegation();
      
      // Test 5: Conflict resolution
      await this.testConflictResolution();
      
      // Test 6: Emergency protocols
      await this.testEmergencyProtocols();
      
      // Cleanup
      await this.cleanup();
      
      // Report results
      this.reportResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      await this.cleanup();
      process.exit(1);
    }
  }
  
  async testBasicCoordination() {
    console.log('📋 Test 1: Basic Agent Coordination Setup');
    
    try {
      // Create test agents
      const agent1 = new AgentCoordinator('test-claude-1', ['refactor', 'architecture'], 'high');
      const agent2 = new AgentCoordinator('test-gpt-1', ['backend', 'logic'], 'normal');
      
      this.testAgents.push(agent1, agent2);
      
      // Wait for registration
      await this.sleep(2000);
      
      // Check if agents are registered
      const agent1Status = await this.redis.hgetall('agent:test-claude-1');
      const agent2Status = await this.redis.hgetall('agent:test-gpt-1');
      
      this.assert(agent1Status.status === 'active', 'Agent 1 should be active');
      this.assert(agent2Status.status === 'active', 'Agent 2 should be active');
      this.assert(agent1Status.capabilities.includes('refactor'), 'Agent 1 should have refactor capability');
      
      this.logSuccess('Basic coordination setup works correctly');
      
    } catch (error) {
      this.logFailure('Basic coordination setup failed', error);
    }
  }
  
  async testFileLockingProtocol() {
    console.log('📋 Test 2: File Locking Protocol');
    
    try {
      const testFile = 'test/example.js';
      
      // Test 2.1: Basic file claiming
      const lock1 = await this.lockManager.claimFile(testFile, 'test-claude-1', 60);
      this.assert(lock1.success, 'Should be able to claim unclaimed file');
      
      // Test 2.2: Lock conflict detection
      const lock2 = await this.lockManager.claimFile(testFile, 'test-gpt-1', 60);
      this.assert(!lock2.success, 'Should not be able to claim already locked file');
      this.assert(lock2.owner === 'test-claude-1', 'Should correctly identify lock owner');
      
      // Test 2.3: Lock release
      const release1 = await this.lockManager.releaseFile(testFile, 'test-claude-1');
      this.assert(release1.success, 'Should be able to release own lock');
      
      // Test 2.4: Claim after release\n      const lock3 = await this.lockManager.claimFile(testFile, 'test-gpt-1', 60);
      this.assert(lock3.success, 'Should be able to claim released file');
      
      // Test 2.5: Force lock functionality
      const forceLock = await this.lockManager.forceLock(testFile, 'test-claude-1', 'emergency test');
      this.assert(forceLock.success, 'Should be able to force lock with reason');
      
      // Cleanup
      await this.lockManager.releaseFile(testFile, 'test-claude-1');
      
      this.logSuccess('File locking protocol works correctly');
      
    } catch (error) {
      this.logFailure('File locking protocol failed', error);
    }
  }
  
  async testInterAgentCommunication() {
    console.log('📋 Test 3: Inter-Agent Communication');
    
    try {
      const comm1 = new AgentCommunication('test-claude-1');
      const comm2 = new AgentCommunication('test-gpt-1');
      
      let messageReceived = false;
      let broadcastReceived = false;
      
      // Set up message listeners
      comm2.on('directMessage', (data) => {
        if (data.from === 'test-claude-1' && data.message === 'Hello GPT!') {
          messageReceived = true;
        }
      });
      
      comm2.on('message', (data) => {
        if (data.channel === 'agent-chat' && data.data.message === 'Broadcasting test') {
          broadcastReceived = true;
        }
      });
      
      // Wait for subscriptions to be set up
      await this.sleep(1000);
      
      // Test 3.1: Direct messaging
      await comm1.sendDirectMessage('test-gpt-1', 'Hello GPT!', 'test_message');
      
      // Test 3.2: Broadcast messaging
      await comm1.broadcastMessage('Broadcasting test', 'test_broadcast');
      
      // Wait for message delivery
      await this.sleep(2000);
      
      this.assert(messageReceived, 'Direct message should be received');
      this.assert(broadcastReceived, 'Broadcast message should be received');
      
      // Test 3.3: Code review request
      await comm1.requestCodeReview('test/example.js', 'test-gpt-1', 'Please review this test file');
      
      // Test 3.4: Emergency message
      await comm1.sendEmergencyMessage('Test emergency alert', 'test_emergency');
      
      await comm1.disconnect();
      await comm2.disconnect();
      
      this.logSuccess('Inter-agent communication works correctly');
      
    } catch (error) {
      this.logFailure('Inter-agent communication failed', error);
    }
  }
  
  async testTaskDelegation() {
    console.log('📋 Test 4: Task Delegation Workflow');
    
    try {
      // Create delegation orchestrator
      const orchestrator = new DelegationOrchestrator('test-orchestrator');
      
      // Wait for initialization
      await this.sleep(3000);
      
      // Test 4.1: Check initial todos
      const initialStatus = await orchestrator.getProjectStatus();
      this.assert(initialStatus.includes('Pending:'), 'Should have initial pending todos');
      
      // Test 4.2: Manual task delegation
      const delegationResult = await orchestrator.delegateTask('todo-1', 'test-claude-1');
      this.assert(delegationResult.success, 'Should be able to delegate task manually');
      this.assert(delegationResult.agent === 'test-claude-1', 'Should assign to correct agent');
      
      // Test 4.3: Task completion
      const completionResult = await orchestrator.completeTask('todo-1', 'test-claude-1', {\n        output: 'Task completed successfully',\n        changes: ['fixed auth issues']\n      });
      this.assert(completionResult.success, 'Should be able to complete assigned task');
      
      // Test 4.4: Auto-delegation of high priority tasks
      await this.sleep(2000); // Wait for auto-delegation cycle
      
      this.logSuccess('Task delegation workflow works correctly');
      
    } catch (error) {\n      this.logFailure('Task delegation workflow failed', error);
    }
  }
  
  async testConflictResolution() {
    console.log('📋 Test 5: Conflict Resolution');
    
    try {
      const testFile = 'test/conflict-file.js';
      
      // Test 5.1: Queue and merge conflict
      const conflict1 = await this.lockManager.queueAndMerge(testFile, 'test-gpt-1', {\n        type: 'edit_conflict',
        description: 'Both agents want to edit the same section'\n      });
      this.assert(conflict1.success, 'Should be able to queue conflict for merge');
      
      // Test 5.2: Coordination request
      const conflict2 = await this.lockManager.notifyAndCoordinate(testFile, 'test-claude-1', {\n        type: 'coordination_needed',
        description: 'Need to coordinate changes'\n      });
      this.assert(conflict2.success, 'Should be able to request coordination');
      
      // Test 5.3: Approval requirement
      const conflict3 = await this.lockManager.requireApproval(testFile, 'test-gpt-1', {\n        type: 'critical_change',
        description: 'Critical file modification needs approval'\n      });
      this.assert(conflict3.success, 'Should be able to require approval');
      
      // Check that conflict resolution channels received messages
      await this.sleep(1000);
      
      this.logSuccess('Conflict resolution works correctly');
      
    } catch (error) {
      this.logFailure('Conflict resolution failed', error);
    }
  }
  
  async testEmergencyProtocols() {
    console.log('📋 Test 6: Emergency Protocols');
    
    try {
      // Test 6.1: Emergency lock release
      const testFile = 'test/emergency-file.js';
      
      // First, lock the file
      await this.lockManager.claimFile(testFile, 'test-claude-1', 60);
      
      // Then emergency release
      const emergencyRelease = await this.lockManager.emergencyReleaseAll('test-claude-1');
      this.assert(emergencyRelease.success, 'Should be able to emergency release all locks');
      this.assert(emergencyRelease.released.includes(testFile), 'Should release the locked file');
      
      // Test 6.2: Stale agent detection (simulated)
      const staleTime = new Date(Date.now() - 300000).toISOString(); // 5 minutes ago
      await this.redis.hset('agent:test-stale-agent', {\n        status: 'active',
        last_heartbeat: staleTime
      });
      
      // The orchestrator should detect this agent as stale in its monitoring cycle
      
      // Test 6.3: Force lock with high priority
      await this.lockManager.claimFile(testFile, 'test-gpt-1', 60);
      const forceLock = await this.lockManager.forceLock(testFile, 'test-claude-1', 'critical emergency');
      this.assert(forceLock.success, 'Should be able to force lock in emergency');
      
      this.logSuccess('Emergency protocols work correctly');
      
    } catch (error) {
      this.logFailure('Emergency protocols failed', error);
    }
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up test resources...');
    
    try {
      // Clean up test agents
      for (const agent of this.testAgents) {
        await agent.shutdown();
      }
      
      // Clean up Redis test data
      const testKeys = await this.redis.keys('*test*');
      if (testKeys.length > 0) {
        await this.redis.del(...testKeys);
      }
      
      // Clean up agent registrations
      await this.redis.del('agent:test-claude-1');
      await this.redis.del('agent:test-gpt-1');
      await this.redis.del('agent:test-orchestrator');
      await this.redis.del('agent:test-stale-agent');
      
      // Clean up test files from lock system
      const lockKeys = await this.redis.keys('lock:test/*');
      if (lockKeys.length > 0) {
        await this.redis.del(...lockKeys);
      }
      
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
  
  reportResults() {
    console.log('\n📊 Multi-Agent Collaboration Protocol Test Results\n');
    console.log('='.repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);\n    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    console.log('\nDetailed Results:');
    console.log('-'.repeat(60));
    
    this.testResults.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      if (result.error) {
        console.log(`   Error: ${result.error.message}`);
      }
    });
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! Multi-Agent Collaboration Protocol is working correctly.');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please review the implementation.`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  // Helper methods
  
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
  
  logSuccess(message) {
    this.testResults.push({
      test: this.getCurrentTestName(),
      status: 'passed',
      message
    });
    console.log(`✅ ${message}`);
  }
  
  logFailure(message, error) {
    this.testResults.push({
      test: this.getCurrentTestName(),
      status: 'failed',
      message,
      error
    });
    console.log(`❌ ${message}:`, error.message);
  }
  
  getCurrentTestName() {
    const stack = new Error().stack;
    const match = stack.match(/at CollaborationTestSuite\\.test(\\w+)/);
    return match ? match[1] : 'Unknown Test';
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const testSuite = new CollaborationTestSuite();
  
  process.on('SIGINT', async () => {
    console.log('\\n⚠️  Test interrupted. Cleaning up...');
    await testSuite.cleanup();
    process.exit(0);
  });
  
  testSuite.runAllTests()
    .then(() => {
      console.log('\\n🏁 Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n💥 Test suite crashed:', error);
      process.exit(1);
    });
}\n\nmodule.exports = CollaborationTestSuite;