#!/usr/bin/env node

/**
 * Test script for Todo Queue Idle Checker
 * 
 * Demonstrates:
 * 1. Adding tasks to the todo queue
 * 2. Multiple agents checking and processing tasks
 * 3. Task assignment and completion tracking
 */

const Redis = require('ioredis');
const TodoQueueIdleChecker = require('./cli/todo-queue-idle-checker');
const { AgentWithTodoIdleChecker } = require('./cli/agent-with-todo-idle-checker');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Clear any existing data (for clean test)
async function clearTestData() {
  console.log('🧹 Clearing test data...');
  const keys = await redis.keys('queue:todos*');
  const todoKeys = await redis.keys('todo:*');
  const agentKeys = await redis.keys('agent:test_*');
  
  const allKeys = [...keys, ...todoKeys, ...agentKeys];
  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
}

// Add sample tasks to the todo queue
async function addSampleTasks() {
  console.log('📝 Adding sample tasks to todo queue...');
  
  const tasks = [
    {
      description: 'Review authentication module for security vulnerabilities',
      type: 'code_review',
      priority: 'high',
      data: {
        file_path: 'src/auth/authentication.js',
        code_snippet: 'function authenticate(user, password) { return user === "admin" && password === "admin"; }'
      }
    },
    {
      description: 'Analyze system architecture for scalability improvements',
      type: 'architecture_analysis',
      priority: 'high',
      data: {
        project_path: '/src',
        focus_area: 'Database layer and caching strategy'
      }
    },
    {
      description: 'Refactor user service for better error handling',
      type: 'refactoring',
      priority: 'medium',
      data: {
        code: 'try { getUserById(id) } catch(e) { console.log(e) }',
        target_improvement: 'Proper error handling and logging'
      }
    },
    {
      description: 'Generate API documentation for payment service',
      type: 'documentation',
      priority: 'medium',
      data: {
        code: 'class PaymentService { processPayment(amount, currency) { } }',
        doc_type: 'API reference'
      }
    },
    {
      description: 'Optimize database queries in reporting module',
      type: 'optimization',
      priority: 'low',
      data: {
        module: 'reporting',
        focus: 'Query performance'
      }
    }
  ];
  
  for (const task of tasks) {
    const todoTask = await TodoQueueIdleChecker.addTodoTask(task);
    console.log(`  ✅ Added: ${todoTask.description} (${todoTask.id})`);
  }
  
  console.log(`\n📊 Total tasks added: ${tasks.length}`);
}

// Create a test agent
async function createTestAgent(agentType, agentId) {
  console.log(`🤖 Creating ${agentType} agent: ${agentId}`);
  
  const agent = new AgentWithTodoIdleChecker(agentId, agentType, {
    idleCheckInterval: 5000, // Check every 5 seconds for testing
    todoTaskHandler: async (task) => {
      console.log(`\n🔄 [${agentId}] Processing task: ${task.description}`);
      console.log(`   Type: ${task.type}, Priority: ${task.priority}`);
      
      // Simulate processing time based on task type
      const processingTimes = {
        'code_review': 3000,
        'architecture_analysis': 4000,
        'refactoring': 2500,
        'documentation': 2000,
        'optimization': 3500
      };
      
      const processingTime = processingTimes[task.type] || 2000;
      
      console.log(`   ⏱️  Estimated processing time: ${processingTime}ms`);
      
      // Simulate actual work
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Return detailed result
      return {
        success: true,
        processed_by: agentId,
        agent_type: agentType,
        task_type: task.type,
        processing_time: processingTime,
        timestamp: new Date().toISOString(),
        result: {
          message: `Task completed successfully by ${agentType} agent`,
          insights: generateTaskInsights(task.type)
        }
      };
    }
  });
  
  // Set up event handlers
  agent.on('todoTaskCompleted', ({ task, result }) => {
    console.log(`\n✅ [${agentId}] Completed task: ${task.id}`);
    console.log(`   Result: ${JSON.stringify(result.result, null, 2)}`);
  });
  
  agent.on('todoTaskFailed', ({ task, error }) => {
    console.error(`\n❌ [${agentId}] Failed task: ${task.id}`);
    console.error(`   Error: ${error.message}`);
  });
  
  return agent;
}

// Generate task-specific insights
function generateTaskInsights(taskType) {
  const insights = {
    'code_review': ['Found security vulnerability', 'Suggested input validation', 'Improved error handling'],
    'architecture_analysis': ['Identified bottlenecks', 'Proposed caching strategy', 'Suggested microservices split'],
    'refactoring': ['Improved code readability', 'Applied SOLID principles', 'Reduced complexity'],
    'documentation': ['Generated comprehensive docs', 'Added usage examples', 'Created API reference'],
    'optimization': ['Reduced query time by 60%', 'Added proper indexes', 'Implemented caching']
  };
  
  return insights[taskType] || ['Task processed successfully'];
}

// Monitor queue statistics
async function monitorQueueStats() {
  setInterval(async () => {
    const multi = redis.multi();
    multi.llen('queue:todos');
    multi.llen('queue:todos:processing');
    multi.llen('queue:todos:completed');
    multi.hgetall('todo:metrics');
    
    const results = await multi.exec();
    
    console.log('\n📊 Queue Statistics:');
    console.log(`   Pending: ${results[0][1] || 0}`);
    console.log(`   Processing: ${results[1][1] || 0}`);
    console.log(`   Completed: ${results[2][1] || 0}`);
    
    const metrics = results[3][1] || {};
    if (Object.keys(metrics).length > 0) {
      console.log('   Metrics:', metrics);
    }
  }, 10000); // Every 10 seconds
}

// Main test function
async function runTest() {
  console.log('🚀 Starting Todo Queue Idle Checker Test\n');
  
  try {
    // Clean up first
    await clearTestData();
    
    // Add sample tasks
    await addSampleTasks();
    
    // Create multiple test agents
    const agents = [
      await createTestAgent('claude', 'test_claude_001'),
      await createTestAgent('gpt', 'test_gpt_001'),
      await createTestAgent('deepseek', 'test_deepseek_001')
    ];
    
    console.log(`\n🤖 Created ${agents.length} test agents`);
    
    // Start all agents
    for (const agent of agents) {
      await agent.startTodoChecker();
    }
    
    console.log('\n✅ All agents started and monitoring todo queue');
    console.log('⏰ Agents will check for tasks every 5 seconds\n');
    
    // Start monitoring
    monitorQueueStats();
    
    // Run for 30 seconds then show final stats
    setTimeout(async () => {
      console.log('\n\n🏁 Test completed! Final statistics:\n');
      
      // Get final stats
      const multi = redis.multi();
      multi.llen('queue:todos');
      multi.llen('queue:todos:processing');
      multi.llen('queue:todos:completed');
      multi.hgetall('todo:metrics');
      multi.hgetall('todo:assignments');
      
      const results = await multi.exec();
      
      console.log('📊 Final Queue Status:');
      console.log(`   Pending: ${results[0][1] || 0}`);
      console.log(`   Processing: ${results[1][1] || 0}`);
      console.log(`   Completed: ${results[2][1] || 0}`);
      
      const metrics = results[3][1] || {};
      console.log('\n📈 Processing Metrics:');
      Object.entries(metrics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      
      const assignments = results[4][1] || {};
      console.log('\n📋 Task Assignments:');
      Object.values(assignments).forEach(assignmentStr => {
        const assignment = JSON.parse(assignmentStr);
        console.log(`   Task ${assignment.task_id}: ${assignment.agent_id} (${assignment.status})`);
      });
      
      // Stop all agents
      console.log('\n🛑 Stopping all agents...');
      for (const agent of agents) {
        await agent.stopTodoChecker();
      }
      
      // Cleanup
      await clearTestData();
      
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
      
    }, 30000); // Run for 30 seconds
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted! Cleaning up...');
  await clearTestData();
  process.exit(0);
});

// Run the test
runTest().catch(console.error);