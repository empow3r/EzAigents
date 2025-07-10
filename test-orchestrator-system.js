#!/usr/bin/env node

/**
 * Test script for Orchestrator Agent with TODO Queue, Backup, and Consensus Systems
 * 
 * Demonstrates:
 * 1. Orchestrator agent delegating tasks
 * 2. Backup system creating snapshots
 * 3. Consensus system for destructive operations
 * 4. Integration of all safety mechanisms
 */

const Redis = require('ioredis');
const TodoQueueIdleChecker = require('./cli/todo-queue-idle-checker');
const BackupSystem = require('./cli/backup-system');
const ConsensusSystem = require('./cli/consensus-system');
const { ConsensusAgent } = require('./cli/consensus-system');
const fs = require('fs').promises;
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Test file for demonstration
const TEST_FILE = path.join(__dirname, 'test-files', 'deprecated-auth.js');

async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Create test directory and file
  await fs.mkdir(path.dirname(TEST_FILE), { recursive: true });
  await fs.writeFile(TEST_FILE, `
// Deprecated authentication module
// TODO: Remove after migration to new auth system

function oldAuthenticate(user, pass) {
  return user === 'admin' && pass === 'password123';
}

module.exports = { oldAuthenticate };
`);
  
  console.log('✅ Test file created');
}

// Orchestrator Agent implementation
class OrchestratorAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.todoChecker = new TodoQueueIdleChecker(agentId, 'orchestrator', {
      checkInterval: 5000,
      todoTaskHandler: this.handleTask.bind(this)
    });
    this.backupSystem = new BackupSystem();
    this.consensusSystem = new ConsensusSystem();
  }

  async handleTask(task) {
    console.log(`\n🎯 [${this.agentId}] Orchestrating task: ${task.description}`);
    
    if (task.type === 'orchestration') {
      return await this.orchestrateComplexTask(task);
    } else if (task.type === 'destructive_operation') {
      return await this.handleDestructiveOperation(task);
    }
    
    return { success: true, message: 'Task processed' };
  }

  async orchestrateComplexTask(task) {
    console.log('📋 Breaking down complex task into subtasks...');
    
    const subtasks = [
      {
        description: 'Analyze deprecated authentication module',
        type: 'code_review',
        priority: 'high',
        context: {
          file: TEST_FILE,
          focus: 'Identify dependencies and usage'
        },
        expected_results: {
          deliverables: ['dependency_analysis.json'],
          criteria: ['Complete dependency map', 'Usage locations']
        }
      },
      {
        description: 'Create migration plan for new auth system',
        type: 'architecture_analysis',
        priority: 'high',
        context: {
          current_system: 'deprecated-auth.js',
          target_system: 'modern OAuth2/JWT'
        },
        expected_results: {
          deliverables: ['migration_plan.md'],
          criteria: ['Step-by-step migration', 'Risk assessment']
        }
      }
    ];

    // Add subtasks to queue
    for (const subtask of subtasks) {
      const todoTask = await TodoQueueIdleChecker.addTodoTask({
        ...subtask,
        data: {
          parent_task: task.id,
          context: subtask.context,
          expected_results: subtask.expected_results
        }
      });
      console.log(`  ✅ Created subtask: ${todoTask.id}`);
    }

    return {
      success: true,
      subtasks_created: subtasks.length,
      message: 'Complex task delegated successfully'
    };
  }

  async handleDestructiveOperation(task) {
    console.log('⚠️  Handling destructive operation...');
    
    const { files, operation } = task.data;
    
    // Step 1: Create backup
    console.log('\n📸 Creating backup before destructive operation...');
    const snapshot = await this.backupSystem.createSnapshot({
      files,
      reason: task.description,
      initiated_by: this.agentId,
      approval_required: true
    });
    
    // Step 2: Request consensus
    console.log('\n🤝 Requesting multi-agent consensus...');
    const consensus = await this.consensusSystem.requestApproval({
      operation,
      files,
      reason: task.description,
      required_approvals: 2,
      timeout: 30000, // 30 seconds for demo
      initiated_by: this.agentId
    });
    
    if (consensus.approved) {
      console.log('✅ Consensus achieved! Proceeding with operation...');
      
      // Perform the operation
      if (operation === 'delete_files') {
        for (const file of files) {
          await fs.unlink(file);
          console.log(`  🗑️  Deleted: ${file}`);
        }
      }
      
      return {
        success: true,
        snapshot_id: snapshot.id,
        consensus_id: consensus.id,
        approvers: consensus.approvers,
        message: 'Destructive operation completed with consensus'
      };
    } else {
      console.log('❌ Consensus not achieved. Operation cancelled.');
      
      return {
        success: false,
        snapshot_id: snapshot.id,
        consensus_id: consensus.id,
        reason: consensus.status,
        message: 'Operation cancelled due to lack of consensus'
      };
    }
  }

  async start() {
    await this.todoChecker.start();
  }

  async stop() {
    await this.todoChecker.stop();
  }
}

// Worker agents that participate in consensus
class WorkerAgent {
  constructor(agentId, agentType) {
    this.agentId = agentId;
    this.agentType = agentType;
    this.consensusAgent = new ConsensusAgent(agentId, new ConsensusSystem());
    this.todoChecker = new TodoQueueIdleChecker(agentId, agentType, {
      checkInterval: 5000,
      todoTaskHandler: this.handleTask.bind(this)
    });
  }

  async handleTask(task) {
    console.log(`\n🔧 [${this.agentId}] Processing ${task.type} task`);
    
    // Simulate task processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = {
      'code_review': {
        dependencies: ['express', 'bcrypt'],
        usage_count: 3,
        risk_level: 'low'
      },
      'architecture_analysis': {
        migration_steps: 5,
        estimated_hours: 8,
        complexity: 'medium'
      }
    };

    return {
      success: true,
      agent: this.agentId,
      type: this.agentType,
      results: results[task.type] || {}
    };
  }

  async start() {
    await this.todoChecker.start();
    await this.consensusAgent.startAutoReview();
    console.log(`✅ ${this.agentType} agent ${this.agentId} started with consensus participation`);
  }

  async stop() {
    await this.todoChecker.stop();
  }
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Orchestrator System Test\n');
  
  try {
    // Setup
    await setupTestEnvironment();
    
    // Clear any existing data
    await redis.del('queue:todos', 'queue:todos:processing', 'queue:todos:completed');
    await redis.del('consensus:requests', 'consensus:pending');
    
    // Create orchestrator and worker agents
    const orchestrator = new OrchestratorAgent('orchestrator_001');
    const workers = [
      new WorkerAgent('claude_001', 'claude'),
      new WorkerAgent('gpt_001', 'gpt'),
      new WorkerAgent('deepseek_001', 'deepseek')
    ];
    
    // Start all agents
    await orchestrator.start();
    for (const worker of workers) {
      await worker.start();
    }
    
    console.log('\n📊 System ready. Adding test tasks...\n');
    
    // Test 1: Complex orchestration task
    const orchestrationTask = await TodoQueueIdleChecker.addTodoTask({
      description: 'Migrate authentication system to OAuth2',
      type: 'orchestration',
      priority: 'high',
      data: {
        complexity: 'high',
        components: ['auth', 'user', 'session']
      }
    });
    console.log(`✅ Added orchestration task: ${orchestrationTask.id}`);
    
    // Wait for subtasks to be created and processed
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test 2: Destructive operation requiring consensus
    const destructiveTask = await TodoQueueIdleChecker.addTodoTask({
      description: 'Remove deprecated authentication module after migration',
      type: 'destructive_operation',
      priority: 'high',
      data: {
        operation: 'delete_files',
        files: [TEST_FILE]
      }
    });
    console.log(`✅ Added destructive operation task: ${destructiveTask.id}`);
    
    // Monitor for 30 seconds
    console.log('\n⏰ Monitoring system for 30 seconds...\n');
    
    const monitorInterval = setInterval(async () => {
      const multi = redis.multi();
      multi.llen('queue:todos');
      multi.llen('queue:todos:processing');
      multi.llen('queue:todos:completed');
      
      const results = await multi.exec();
      
      console.log('📊 Queue Status:');
      console.log(`   Pending: ${results[0][1]}`);
      console.log(`   Processing: ${results[1][1]}`);
      console.log(`   Completed: ${results[2][1]}`);
      
      // Check if test file still exists
      try {
        await fs.access(TEST_FILE);
        console.log(`   Test file: Still exists`);
      } catch {
        console.log(`   Test file: Deleted (consensus approved)`);
      }
      
      console.log('');
    }, 5000);
    
    // Run for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    clearInterval(monitorInterval);
    
    // Final report
    console.log('\n📋 Final Report:\n');
    
    // Check completed tasks
    const completedTasks = await redis.lrange('queue:todos:completed', 0, -1);
    console.log(`Total tasks completed: ${completedTasks.length}`);
    
    completedTasks.forEach(taskStr => {
      const task = JSON.parse(taskStr);
      console.log(`\n- ${task.description}`);
      console.log(`  Type: ${task.type}`);
      console.log(`  Status: Completed`);
    });
    
    // Check backups
    const backupSystem = new BackupSystem();
    const snapshots = await backupSystem.listSnapshots();
    console.log(`\n📸 Backups created: ${snapshots.length}`);
    snapshots.forEach(s => {
      console.log(`- ${s.id}: ${s.reason}`);
    });
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    await orchestrator.stop();
    for (const worker of workers) {
      await worker.stop();
    }
    
    // Clean test files
    try {
      await fs.rm(path.dirname(TEST_FILE), { recursive: true, force: true });
    } catch {}
    
    await redis.quit();
    await backupSystem.close();
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted! Cleaning up...');
  await redis.quit();
  process.exit(0);
});

// Run the test
runTest().then(() => process.exit(0)).catch(console.error);