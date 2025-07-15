const AgentCoordinator = require('./shared/agent-coordinator');
const Redis = require('redis');

/**
 * Test Multi-Agent Coordination System
 * Tests communication, port management, file locking, and collaboration
 */
async function testAgentCoordination() {
  console.log('🧪 Testing Ez Aigent Universal Coordination System\n');
  
  const tests = [];
  let passed = 0;
  let failed = 0;
  
  // Test 1: Basic Coordinator Initialization
  tests.push(async () => {
    console.log('📋 Test 1: Coordinator Initialization');
    
    const coordinator = new AgentCoordinator({
      agentId: 'test-coordinator-001',
      agentType: 'test',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    try {
      await coordinator.initialize();
      console.log('✅ Coordinator initialized successfully');
      
      await coordinator.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ Coordinator initialization failed: ${error.message}`);
      return false;
    }
  });
  
  // Test 2: Port Management
  tests.push(async () => {
    console.log('\n📋 Test 2: Port Management');
    
    const coordinator = new AgentCoordinator({
      agentId: 'test-port-manager',
      agentType: 'test'
    });
    
    try {
      await coordinator.initialize();
      
      // Test port reservation
      const reserved = await coordinator.requestPort(19999, 'test-service');
      if (!reserved) {
        throw new Error('Failed to reserve test port');
      }
      console.log('✅ Port 19999 reserved successfully');
      
      // Test port availability check
      const available = await coordinator.checkPortAvailability(19999);
      if (available) {
        throw new Error('Port should show as unavailable after reservation');
      }
      console.log('✅ Port availability check working');
      
      // Test port release
      const released = await coordinator.releasePort(19999);
      if (!released) {
        throw new Error('Failed to release test port');
      }
      console.log('✅ Port released successfully');
      
      await coordinator.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ Port management test failed: ${error.message}`);
      await coordinator.cleanup();
      return false;
    }
  });
  
  // Test 3: File Locking
  tests.push(async () => {
    console.log('\n📋 Test 3: File Locking System');
    
    const coordinator1 = new AgentCoordinator({
      agentId: 'test-file-lock-1',
      agentType: 'test'
    });
    
    const coordinator2 = new AgentCoordinator({
      agentId: 'test-file-lock-2',
      agentType: 'test'
    });
    
    try {
      await coordinator1.initialize();
      await coordinator2.initialize();
      
      const testFile = '/tmp/test-coordination-file.txt';
      
      // Agent 1 acquires lock
      const lock1 = await coordinator1.acquireFileLock(testFile, 'write', 5000);
      console.log('✅ Agent 1 acquired file lock');
      
      // Agent 2 tries to acquire same lock (should fail)
      try {
        await coordinator2.acquireFileLock(testFile, 'write', 1000);
        throw new Error('Agent 2 should not have been able to acquire lock');
      } catch (error) {
        console.log('✅ Agent 2 correctly blocked from acquiring lock');
      }
      
      // Agent 1 releases lock
      await coordinator1.releaseFileLock(testFile);
      console.log('✅ Agent 1 released file lock');
      
      // Agent 2 can now acquire lock
      const lock2 = await coordinator2.acquireFileLock(testFile, 'write', 1000);
      console.log('✅ Agent 2 acquired lock after release');
      
      await coordinator2.releaseFileLock(testFile);
      
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ File locking test failed: ${error.message}`);
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return false;
    }
  });
  
  // Test 4: Agent Communication
  tests.push(async () => {
    console.log('\n📋 Test 4: Agent Communication');
    
    const coordinator1 = new AgentCoordinator({
      agentId: 'test-comm-sender',
      agentType: 'test'
    });
    
    const coordinator2 = new AgentCoordinator({
      agentId: 'test-comm-receiver',
      agentType: 'test'
    });
    
    try {
      await coordinator1.initialize();
      await coordinator2.initialize();
      
      // Set up message handler for coordinator2
      let messageReceived = false;
      coordinator2.registerMessageHandler('test:message', async (data, sender) => {
        if (data.content === 'Hello from test!' && sender === 'test-comm-sender') {
          messageReceived = true;
          console.log('✅ Message received correctly');
        }
      });
      
      // Wait a moment for subscriptions to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send direct message
      await coordinator1.sendDirectMessage('test-comm-receiver', 'test:message', {
        content: 'Hello from test!'
      });
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!messageReceived) {
        throw new Error('Message was not received');
      }
      
      // Test broadcast message
      let broadcastReceived = false;
      coordinator2.registerMessageHandler('test:broadcast', async (data, sender) => {
        if (data.content === 'Broadcast test!' && sender === 'test-comm-sender') {
          broadcastReceived = true;
          console.log('✅ Broadcast message received correctly');
        }
      });
      
      await coordinator1.broadcastMessage('test:broadcast', {
        content: 'Broadcast test!'
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!broadcastReceived) {
        throw new Error('Broadcast message was not received');
      }
      
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ Communication test failed: ${error.message}`);
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return false;
    }
  });
  
  // Test 5: Agent Discovery
  tests.push(async () => {
    console.log('\n📋 Test 5: Agent Discovery');
    
    const coordinator1 = new AgentCoordinator({
      agentId: 'test-discovery-claude',
      agentType: 'claude'
    });
    
    const coordinator2 = new AgentCoordinator({
      agentId: 'test-discovery-gpt',
      agentType: 'gpt'
    });
    
    try {
      await coordinator1.initialize();
      await coordinator2.initialize();
      
      // Wait for registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test discovering all agents
      const allAgents = await coordinator1.discoverAgents();
      console.log(`✅ Discovered ${allAgents.length} agents`);
      
      // Test discovering by type
      const claudeAgents = await coordinator1.discoverAgents('claude');
      if (claudeAgents.length === 0) {
        throw new Error('Should have found at least one Claude agent');
      }
      console.log(`✅ Found ${claudeAgents.length} Claude agent(s)`);
      
      // Test discovering by capability
      const analysisAgents = await coordinator1.discoverAgents(null, 'code_analysis');
      console.log(`✅ Found ${analysisAgents.length} agent(s) with code_analysis capability`);
      
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ Agent discovery test failed: ${error.message}`);
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return false;
    }
  });
  
  // Test 6: Shared State Management
  tests.push(async () => {
    console.log('\n📋 Test 6: Shared State Management');
    
    const coordinator1 = new AgentCoordinator({
      agentId: 'test-state-writer',
      agentType: 'test'
    });
    
    const coordinator2 = new AgentCoordinator({
      agentId: 'test-state-reader',
      agentType: 'test'
    });
    
    try {
      await coordinator1.initialize();
      await coordinator2.initialize();
      
      // Test setting shared state
      const testData = { message: 'Hello shared state!', timestamp: new Date().toISOString() };
      await coordinator1.setSharedState('test:data', testData);
      console.log('✅ Shared state set by agent 1');
      
      // Test getting shared state from another agent
      const retrievedData = await coordinator2.getSharedState('test:data');
      if (!retrievedData || retrievedData.message !== 'Hello shared state!') {
        throw new Error('Shared state not retrieved correctly');
      }
      console.log('✅ Shared state retrieved by agent 2');
      
      // Test deleting shared state
      await coordinator1.deleteSharedState('test:data');
      const deletedData = await coordinator2.getSharedState('test:data');
      if (deletedData !== null) {
        throw new Error('Shared state should have been deleted');
      }
      console.log('✅ Shared state deleted successfully');
      
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ Shared state test failed: ${error.message}`);
      await coordinator1.cleanup();
      await coordinator2.cleanup();
      return false;
    }
  });
  
  // Test 7: Health Monitoring
  tests.push(async () => {
    console.log('\n📋 Test 7: Health Monitoring');
    
    const coordinator = new AgentCoordinator({
      agentId: 'test-health-monitor',
      agentType: 'test'
    });
    
    try {
      await coordinator.initialize();
      
      // Wait for initial heartbeat
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if heartbeat was sent
      const redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      await redis.connect();
      
      const heartbeat = await redis.hGet('agents:heartbeats', 'test-health-monitor');
      if (!heartbeat) {
        throw new Error('Heartbeat not found');
      }
      
      const heartbeatData = JSON.parse(heartbeat);
      if (!heartbeatData.timestamp || !heartbeatData.uptime) {
        throw new Error('Heartbeat data incomplete');
      }
      
      console.log('✅ Heartbeat monitoring working');
      
      await redis.disconnect();
      await coordinator.cleanup();
      return true;
    } catch (error) {
      console.log(`❌ Health monitoring test failed: ${error.message}`);
      await coordinator.cleanup();
      return false;
    }
  });
  
  // Run all tests
  console.log('🚀 Starting coordination system tests...\n');
  
  for (let i = 0; i < tests.length; i++) {
    try {
      const result = await tests[i]();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test ${i + 1} crashed: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🎯 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All coordination system tests passed!');
    console.log('\n✨ Ez Aigent Universal Coordination System is working correctly');
    console.log('\n📝 Next steps:');
    console.log('   1. Start agents with: ./start-ez-aigent.sh');
    console.log('   2. Monitor agent health: ./scripts/agent-health-monitor.sh monitor');
    console.log('   3. Check coordination: ./scripts/agent-health-monitor.sh status');
  } else {
    console.log('\n⚠️  Some tests failed - check the coordination system setup');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure Redis is running: redis-cli ping');
    console.log('   2. Check Redis URL: echo $REDIS_URL');
    console.log('   3. Verify network connectivity');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  testAgentCoordination().catch(error => {
    console.error('Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = { testAgentCoordination };