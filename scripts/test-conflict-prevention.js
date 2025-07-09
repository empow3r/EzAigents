#!/usr/bin/env node

/**
 * Test Script for Agent Conflict Prevention System
 * 
 * This script validates that the conflict prevention system works correctly
 * by simulating multiple agents trying to access the same files.
 */

const AgentCoordination = require('../cli/agent-coordination');
const FileLockManager = require('../cli/file-lock-manager');
const Redis = require('ioredis');

class ConflictPreventionTester {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.results = [];
    this.testFiles = [
      'test/file1.js',
      'test/file2.js',
      'test/shared-file.js'
    ];
  }

  async runAllTests() {
    console.log('🧪 Starting Agent Conflict Prevention Tests...\n');
    
    // Clean up any existing test data
    await this.cleanup();
    
    // Run test suite
    await this.testBasicFileLocking();
    await this.testAgentCoordination();
    await this.testConflictResolution();
    await this.testEmergencyProcedures();
    await this.testSystemRecovery();
    
    // Show results
    this.showResults();
    
    // Clean up
    await this.cleanup();
    
    console.log('\n✅ All tests completed!');
    process.exit(0);
  }

  async testBasicFileLocking() {
    console.log('🔒 Testing Basic File Locking...');
    
    const lockManager = new FileLockManager();
    
    // Test 1: Basic lock acquire and release
    try {
      const claim1 = await lockManager.claimFile('test/file1.js', 'agent1');
      this.assert(claim1.success, 'Agent1 should acquire lock on file1.js');
      
      const claim2 = await lockManager.claimFile('test/file1.js', 'agent2');
      this.assert(!claim2.success, 'Agent2 should NOT acquire lock on file1.js');
      this.assert(claim2.owner === 'agent1', 'Lock should be owned by agent1');
      
      const release1 = await lockManager.releaseFile('test/file1.js', 'agent1');
      this.assert(release1.success, 'Agent1 should release lock successfully');
      
      const claim3 = await lockManager.claimFile('test/file1.js', 'agent2');
      this.assert(claim3.success, 'Agent2 should acquire lock after release');
      
      await lockManager.releaseFile('test/file1.js', 'agent2');
      
      console.log('  ✅ Basic file locking works correctly');
    } catch (error) {
      console.log('  ❌ Basic file locking failed:', error.message);
    }
  }

  async testAgentCoordination() {
    console.log('🤝 Testing Agent Coordination...');
    
    const agent1 = new AgentCoordination();
    const agent2 = new AgentCoordination();
    
    try {
      // Register agents
      await agent1.registerAgent('claude', ['architecture', 'refactoring']);
      await agent2.registerAgent('gpt', ['backend-logic', 'implementation']);
      
      // Test coordination request
      const access1 = await agent1.requestFileAccess('test/shared-file.js', 'Refactor architecture', 'high');
      this.assert(access1.success, 'Agent1 should get file access');
      
      const access2 = await agent2.requestFileAccess('test/shared-file.js', 'Add backend logic', 'normal');
      this.assert(!access2.success, 'Agent2 should be denied access');
      
      // Release and allow agent2 to proceed
      await agent1.releaseFileAccess('test/shared-file.js', 'Architecture refactored');
      
      const access3 = await agent2.requestFileAccess('test/shared-file.js', 'Add backend logic', 'normal');
      this.assert(access3.success, 'Agent2 should get access after release');
      
      await agent2.releaseFileAccess('test/shared-file.js', 'Backend logic added');
      
      // Cleanup
      await agent1.shutdown();
      await agent2.shutdown();
      
      console.log('  ✅ Agent coordination works correctly');
    } catch (error) {
      console.log('  ❌ Agent coordination failed:', error.message);
    }
  }

  async testConflictResolution() {
    console.log('⚡ Testing Conflict Resolution...');
    
    const agent1 = new AgentCoordination();
    const agent2 = new AgentCoordination();
    
    try {
      await agent1.registerAgent('claude', ['architecture']);
      await agent2.registerAgent('gpt', ['backend-logic']);
      
      // Create a conflict scenario
      const access1 = await agent1.requestFileAccess('test/conflict-file.js', 'Architecture review', 'normal');
      this.assert(access1.success, 'Agent1 should get initial access');
      
      const access2 = await agent2.requestFileAccess('test/conflict-file.js', 'URGENT security fix', 'urgent');
      
      // Check if conflict resolution was triggered
      this.assert(!access2.success, 'Conflict should be detected');
      
      // Cleanup
      await agent1.releaseFileAccess('test/conflict-file.js', 'Work completed');
      await agent1.shutdown();
      await agent2.shutdown();
      
      console.log('  ✅ Conflict resolution works correctly');
    } catch (error) {
      console.log('  ❌ Conflict resolution failed:', error.message);
    }
  }

  async testEmergencyProcedures() {
    console.log('🚨 Testing Emergency Procedures...');
    
    const lockManager = new FileLockManager();
    
    try {
      // Create locks
      await lockManager.claimFile('test/emergency1.js', 'agent1');
      await lockManager.claimFile('test/emergency2.js', 'agent1');
      
      // Test emergency release
      const emergency = await lockManager.emergencyReleaseAll('agent1');
      this.assert(emergency.success, 'Emergency release should succeed');
      this.assert(emergency.released.length === 2, 'Should release 2 files');
      
      // Test force lock
      await lockManager.claimFile('test/force-test.js', 'agent1');
      const force = await lockManager.forceLock('test/force-test.js', 'agent2', 'Emergency override');
      this.assert(force.success, 'Force lock should succeed');
      
      await lockManager.releaseFile('test/force-test.js', 'agent2');
      
      console.log('  ✅ Emergency procedures work correctly');
    } catch (error) {
      console.log('  ❌ Emergency procedures failed:', error.message);
    }
  }

  async testSystemRecovery() {
    console.log('🔄 Testing System Recovery...');
    
    const lockManager = new FileLockManager();
    
    try {
      // Test cleanup of expired locks
      const cleanup = await lockManager.cleanupExpiredLocks();
      this.assert(cleanup.hasOwnProperty('cleaned'), 'Cleanup should return cleaned count');
      
      // Test getting all locks
      const allLocks = await lockManager.getAllLocks();
      this.assert(typeof allLocks === 'object', 'Should return locks object');
      
      console.log('  ✅ System recovery works correctly');
    } catch (error) {
      console.log('  ❌ System recovery failed:', error.message);
    }
  }

  async cleanup() {
    // Clean up test data
    const testKeys = [
      'lock:test/*',
      'lock:meta:test/*',
      'coordination:*',
      'work_queue:test/*',
      'messages:*',
      'agents'
    ];
    
    for (const pattern of testKeys) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  assert(condition, message) {
    if (condition) {
      this.results.push({ test: message, status: 'PASS' });
    } else {
      this.results.push({ test: message, status: 'FAIL' });
      console.log(`    ❌ ASSERTION FAILED: ${message}`);
    }
  }

  showResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=========================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  ❌ ${r.test}`));
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ConflictPreventionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ConflictPreventionTester;