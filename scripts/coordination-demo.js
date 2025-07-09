#!/usr/bin/env node

// Multi-Agent Coordination Demo
// This script demonstrates the coordination protocol in action

const Redis = require('ioredis');
const path = require('path');

// Import coordination services
const FileLockManager = require('../cli/file-lock-manager');
const AgentCommunication = require('../cli/agent-communication');
const AgentCoordinator = require('../cli/coordination-service');

class CoordinationDemo {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.agents = [];
    this.demo_agent_id = `demo-coordinator-${Date.now()}`;
    
    this.lockManager = new FileLockManager();
    this.communication = new AgentCommunication(this.demo_agent_id);
  }

  async startDemo() {
    console.log('🚀 Multi-Agent Coordination Protocol Demo');
    console.log('==========================================\n');

    try {
      // Step 1: Show current agent status
      await this.showAgentStatus();
      
      // Step 2: Demonstrate file locking
      await this.demonstrateFileLocking();
      
      // Step 3: Show agent communication
      await this.demonstrateAgentCommunication();
      
      // Step 4: Demonstrate conflict resolution
      await this.demonstrateConflictResolution();
      
      // Step 5: Show coordination in action
      await this.demonstrateCoordination();

      console.log('\n✅ Demo completed successfully!');
      console.log('\nTo integrate this protocol into your agents:');
      console.log('1. Import the coordination services in your agent files');
      console.log('2. Initialize FileLockManager, AgentCommunication, and AgentCoordinator');
      console.log('3. Use lockManager.claimFile() before editing files');
      console.log('4. Use communication.sendDirectMessage() to coordinate with other agents');
      console.log('5. Use communication.broadcastMessage() for announcements');
      console.log('6. Always release locks with lockManager.releaseFile()');
      
    } catch (error) {
      console.error('❌ Demo error:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  async showAgentStatus() {
    console.log('📊 Current Agent Status:');
    console.log('------------------------');
    
    const onlineAgents = await this.communication.getOnlineAgents();
    
    if (onlineAgents.length === 0) {
      console.log('No agents currently online');
      console.log('💡 Start some agents with: npm run agent:claude, npm run agent:gpt, etc.\n');
    } else {
      onlineAgents.forEach(agent => {
        console.log(`🤖 ${agent.id}`);
        console.log(`   Status: ${agent.status}`);
        console.log(`   Capabilities: ${JSON.parse(agent.capabilities || '[]').join(', ')}`);
        console.log(`   Last heartbeat: ${agent.last_heartbeat}\n`);
      });
    }
  }

  async demonstrateFileLocking() {
    console.log('🔒 File Locking Demo:');
    console.log('---------------------');
    
    const testFile = 'demo/test-file.js';
    
    // Agent 1 claims file
    console.log(`Agent ${this.demo_agent_id} attempting to claim ${testFile}...`);
    const lockResult = await this.lockManager.claimFile(testFile, this.demo_agent_id, 60);
    
    if (lockResult.success) {
      console.log(`✅ Successfully claimed ${testFile}`);
      
      // Show current locks
      console.log('\nCurrent file locks:');
      const locks = await this.lockManager.getAllLocks();
      Object.entries(locks).forEach(([file, info]) => {
        console.log(`   ${file}: owned by ${info.owner} (expires in ${info.ttl}s)`);
      });
      
      // Release lock
      await new Promise(r => setTimeout(r, 2000));
      const releaseResult = await this.lockManager.releaseFile(testFile, this.demo_agent_id);
      console.log(`🔓 ${releaseResult.message}\n`);
      
    } else {
      console.log(`❌ Failed to claim ${testFile}: ${lockResult.message}\n`);
    }
  }

  async demonstrateAgentCommunication() {
    console.log('💬 Agent Communication Demo:');
    console.log('----------------------------');
    
    // Send broadcast message
    console.log('Broadcasting message to all agents...');
    await this.communication.broadcastMessage(
      'Hello from coordination demo! 👋',
      'demo_broadcast',
      'normal'
    );
    
    // Send direct message to first online agent
    const onlineAgents = await this.communication.getOnlineAgents();
    if (onlineAgents.length > 0) {
      const targetAgent = onlineAgents[0].id;
      console.log(`Sending direct message to ${targetAgent}...`);
      await this.communication.sendDirectMessage(
        targetAgent,
        'This is a direct coordination message from the demo script',
        'demo_direct',
        'normal'
      );
    }
    
    console.log('✅ Messages sent\n');
  }

  async demonstrateConflictResolution() {
    console.log('⚖️  Conflict Resolution Demo:');
    console.log('-----------------------------');
    
    const conflictFile = 'demo/conflict-file.js';
    
    // Simulate two agents wanting the same file
    console.log(`Simulating conflict for ${conflictFile}...`);
    
    // First agent gets the lock
    const firstLock = await this.lockManager.claimFile(conflictFile, this.demo_agent_id, 30);
    
    if (firstLock.success) {
      console.log(`✅ Agent ${this.demo_agent_id} claimed ${conflictFile}`);
      
      // Second agent tries to get same file (simulated)
      const conflictAgent = 'demo-agent-2';
      console.log(`❌ Agent ${conflictAgent} tries to claim same file...`);
      
      // Use conflict resolution
      console.log('🤝 Initiating conflict resolution...');
      const resolution = await this.lockManager.notifyAndCoordinate(
        conflictFile, 
        conflictAgent, 
        { 
          reason: 'Both agents need to modify file',
          priority: 'high',
          task: 'Demo coordination'
        }
      );
      
      console.log(`✅ ${resolution.message}`);
      
      // Release lock
      await this.lockManager.releaseFile(conflictFile, this.demo_agent_id);
      console.log(`🔓 Lock released\n`);
    }
  }

  async demonstrateCoordination() {
    console.log('🤝 Multi-Agent Coordination Demo:');
    console.log('---------------------------------');
    
    const coordinationFile = 'demo/coordination-test.js';
    
    // Show how agents coordinate on complex tasks
    console.log(`Demonstrating coordination workflow for ${coordinationFile}...`);
    
    // Step 1: Request code review
    console.log('📋 Requesting code review...');
    await this.communication.requestCodeReview(
      coordinationFile,
      'any-available-agent',
      'Please review this coordination demo file'
    );
    
    // Step 2: Announce project update
    console.log('📈 Announcing project update...');
    await this.communication.announceProjectUpdate(
      'Multi-agent coordination protocol successfully implemented and tested',
      'milestone_complete'
    );
    
    console.log('✅ Coordination workflow complete\n');
  }

  async cleanup() {
    console.log('🧹 Cleaning up demo resources...');
    
    // Release any remaining locks
    const myLocks = await this.lockManager.getAgentLocks(this.demo_agent_id);
    for (const filePath of Object.keys(myLocks)) {
      await this.lockManager.releaseFile(filePath, this.demo_agent_id);
    }
    
    // Disconnect
    await this.communication.disconnect();
    await this.redis.quit();
    
    console.log('✅ Cleanup complete');
  }
}

// Command line interface
async function main() {
  const demo = new CoordinationDemo();
  
  // Add graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Demo interrupted, cleaning up...');
    await demo.cleanup();
    process.exit(0);
  });
  
  await demo.startDemo();
}

// Run demo if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

module.exports = CoordinationDemo;