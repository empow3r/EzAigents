#!/usr/bin/env node

// Task Manager for Agent Coordination
// Agents use this to check queue and self-assign tasks

const fs = require('fs');
const path = require('path');
const { TimeUtils } = require('../shared/utils');

class TaskManager {
  constructor() {
    this.taskQueuePath = path.join(__dirname, '..', 'ACTIVE_TASK_QUEUE.json');
    this.lockPath = path.join(__dirname, '..', '.task-queue.lock');
  }

  // Load task queue with file locking
  async loadTaskQueue() {
    try {
      // Wait for lock to be released
      while (fs.existsSync(this.lockPath)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const data = fs.readFileSync(this.taskQueuePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to load task queue:', error.message);
      return null;
    }
  }

  // Save task queue with file locking
  async saveTaskQueue(taskQueue) {
    try {
      // Create lock
      fs.writeFileSync(this.lockPath, Date.now().toString());
      
      // Update timestamp
      taskQueue.last_updated = new Date().toISOString();
      
      // Save
      fs.writeFileSync(this.taskQueuePath, JSON.stringify(taskQueue, null, 2));
      
      // Remove lock
      fs.unlinkSync(this.lockPath);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save task queue:', error.message);
      
      // Clean up lock
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
      
      return false;
    }
  }

  // Show available tasks
  async showAvailableTasks() {
    const taskQueue = await this.loadTaskQueue();
    if (!taskQueue) return;

    console.log('\n🔧 REFACTORING TASK QUEUE');
    console.log('=' .repeat(50));
    
    // Show progress
    const progress = Math.round((taskQueue.completed_tasks / taskQueue.total_tasks) * 100);
    console.log(`📊 Progress: ${taskQueue.completed_tasks}/${taskQueue.total_tasks} (${progress}%)`);
    console.log(`⏰ Last Updated: ${new Date(taskQueue.last_updated).toLocaleString()}`);
    
    // Show available tasks by priority
    const available = taskQueue.tasks.filter(task => task.status === 'AVAILABLE');
    const inProgress = taskQueue.tasks.filter(task => task.status === 'IN_PROGRESS');
    
    if (available.length === 0) {
      console.log('\n✅ No available tasks! All tasks are complete or in progress.');
      return;
    }

    console.log(`\n📋 Available Tasks (${available.length}):`);
    console.log('-'.repeat(50));
    
    ['HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
      const priorityTasks = available.filter(task => task.priority === priority);
      if (priorityTasks.length === 0) return;
      
      console.log(`\n🎯 ${priority} PRIORITY:`);
      priorityTasks.forEach((task, index) => {
        console.log(`\n${index + 1}. [${task.id}] ${task.title}`);
        console.log(`   📝 ${task.description}`);
        console.log(`   📁 Files: ${task.files_affected.join(', ')}`);
        console.log(`   📉 Lines Saved: ~${task.estimated_lines_saved}`);
        if (task.dependencies.length > 0) {
          console.log(`   ⚠️  Dependencies: ${task.dependencies.join(', ')}`);
        }
      });
    });

    if (inProgress.length > 0) {
      console.log(`\n🔄 In Progress (${inProgress.length}):`);
      inProgress.forEach(task => {
        console.log(`   • [${task.id}] ${task.title} (${task.assigned_to})`);
      });
    }
  }

  // Claim a task
  async claimTask(taskId, agentName) {
    const taskQueue = await this.loadTaskQueue();
    if (!taskQueue) return false;

    const task = taskQueue.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`❌ Task ${taskId} not found`);
      return false;
    }

    if (task.status !== 'AVAILABLE') {
      console.error(`❌ Task ${taskId} is not available (status: ${task.status})`);
      return false;
    }

    // Check dependencies
    const unmetDeps = task.dependencies.filter(depId => {
      const depTask = taskQueue.completed.find(t => t.id === depId);
      return !depTask;
    });

    if (unmetDeps.length > 0) {
      console.error(`❌ Task ${taskId} has unmet dependencies: ${unmetDeps.join(', ')}`);
      return false;
    }

    // Claim the task
    task.status = 'IN_PROGRESS';
    task.assigned_to = agentName;
    task.started_at = new Date().toISOString();

    const saved = await this.saveTaskQueue(taskQueue);
    if (saved) {
      console.log(`✅ Task ${taskId} claimed by ${agentName}`);
      console.log(`📝 Description: ${task.description}`);
      console.log(`📁 Files to modify: ${task.files_affected.join(', ')}`);
      console.log(`📋 Instructions: ${task.instructions}`);
      return true;
    }

    return false;
  }

  // Complete a task
  async completeTask(taskId, agentName) {
    const taskQueue = await this.loadTaskQueue();
    if (!taskQueue) return false;

    const taskIndex = taskQueue.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      console.error(`❌ Task ${taskId} not found`);
      return false;
    }

    const task = taskQueue.tasks[taskIndex];
    
    if (task.status !== 'IN_PROGRESS') {
      console.error(`❌ Task ${taskId} is not in progress`);
      return false;
    }

    if (task.assigned_to !== agentName) {
      console.error(`❌ Task ${taskId} is assigned to ${task.assigned_to}, not ${agentName}`);
      return false;
    }

    // Move to completed
    taskQueue.completed.push({
      id: task.id,
      title: task.title,
      completed_by: agentName,
      completed_at: new Date().toISOString(),
      lines_saved: task.estimated_lines_saved
    });

    // Remove from active tasks
    taskQueue.tasks.splice(taskIndex, 1);
    taskQueue.completed_tasks++;

    const saved = await this.saveTaskQueue(taskQueue);
    if (saved) {
      console.log(`🎉 Task ${taskId} completed by ${agentName}!`);
      console.log(`📊 Progress: ${taskQueue.completed_tasks}/${taskQueue.total_tasks}`);
      
      // Show next available task
      console.log('\n🔄 Checking for next available task...');
      await this.showAvailableTasks();
      
      return true;
    }

    return false;
  }

  // Get next recommended task for agent
  async getNextTask(agentType = 'general') {
    const taskQueue = await this.loadTaskQueue();
    if (!taskQueue) return null;

    const available = taskQueue.tasks.filter(task => 
      task.status === 'AVAILABLE' && 
      task.dependencies.every(depId => 
        taskQueue.completed.find(t => t.id === depId)
      )
    );

    if (available.length === 0) return null;

    // Sort by priority and specialization
    available.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      // Agent-specific recommendations
      if (agentType === 'claude' && a.title.includes('Agent')) return -1;
      if (agentType === 'gpt' && a.title.includes('Dashboard')) return -1;
      if (agentType === 'deepseek' && a.title.includes('Test')) return -1;
      
      return 0;
    });

    return available[0];
  }

  // Show task details
  async showTaskDetails(taskId) {
    const taskQueue = await this.loadTaskQueue();
    if (!taskQueue) return;

    const task = taskQueue.tasks.find(t => t.id === taskId);
    if (!task) {
      console.error(`❌ Task ${taskId} not found`);
      return;
    }

    console.log(`\n📋 Task Details: ${task.id}`);
    console.log('=' .repeat(50));
    console.log(`Title: ${task.title}`);
    console.log(`Priority: ${task.priority}`);
    console.log(`Status: ${task.status}`);
    if (task.assigned_to) console.log(`Assigned to: ${task.assigned_to}`);
    console.log(`Description: ${task.description}`);
    console.log(`Files affected: ${task.files_affected.join(', ')}`);
    console.log(`Estimated lines saved: ${task.estimated_lines_saved}`);
    console.log(`Instructions: ${task.instructions}`);
    if (task.dependencies.length > 0) {
      console.log(`Dependencies: ${task.dependencies.join(', ')}`);
    }
  }
}

// CLI Interface
async function main() {
  const taskManager = new TaskManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'list':
    case 'ls':
      await taskManager.showAvailableTasks();
      break;
      
    case 'claim':
      if (args.length < 2) {
        console.error('Usage: node task-manager.js claim <task-id> <agent-name>');
        process.exit(1);
      }
      await taskManager.claimTask(args[0], args[1]);
      break;
      
    case 'complete':
      if (args.length < 2) {
        console.error('Usage: node task-manager.js complete <task-id> <agent-name>');
        process.exit(1);
      }
      await taskManager.completeTask(args[0], args[1]);
      break;
      
    case 'next':
      const agentType = args[0] || 'general';
      const nextTask = await taskManager.getNextTask(agentType);
      if (nextTask) {
        console.log(`\n🎯 Recommended next task for ${agentType}:`);
        console.log(`[${nextTask.id}] ${nextTask.title} (${nextTask.priority})`);
        console.log(`📝 ${nextTask.description}`);
        console.log(`\n💡 To claim: node scripts/task-manager.js claim ${nextTask.id} ${agentType}`);
      } else {
        console.log('✅ No available tasks for your agent type!');
      }
      break;
      
    case 'details':
      if (args.length < 1) {
        console.error('Usage: node task-manager.js details <task-id>');
        process.exit(1);
      }
      await taskManager.showTaskDetails(args[0]);
      break;
      
    default:
      console.log('🔧 Task Manager Commands:');
      console.log('  list         - Show all available tasks');
      console.log('  claim <id> <agent>  - Claim a task');
      console.log('  complete <id> <agent> - Mark task as complete');
      console.log('  next [agent] - Get recommended next task');
      console.log('  details <id> - Show task details');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/task-manager.js list');
      console.log('  node scripts/task-manager.js claim TASK-006 gpt-agent');
      console.log('  node scripts/task-manager.js complete TASK-006 gpt-agent');
      console.log('  node scripts/task-manager.js next claude');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TaskManager;