#!/usr/bin/env node

/**
 * CLI tool to add tasks to the todo queue
 * 
 * Usage:
 *   node add-todo-task.js "Task description" [type] [priority]
 *   
 * Examples:
 *   node add-todo-task.js "Review authentication module"
 *   node add-todo-task.js "Refactor user service" refactoring high
 *   node add-todo-task.js "Generate API docs" documentation medium
 */

const TodoQueueIdleChecker = require('./todo-queue-idle-checker');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node add-todo-task.js "Task description" [type] [priority]');
    console.log('\nTypes: code_review, architecture_analysis, refactoring, documentation, optimization, general');
    console.log('Priorities: high, medium, low');
    process.exit(1);
  }
  
  const description = args[0];
  const type = args[1] || 'general';
  const priority = args[2] || 'medium';
  
  const validTypes = ['code_review', 'architecture_analysis', 'refactoring', 'documentation', 'optimization', 'general'];
  const validPriorities = ['high', 'medium', 'low'];
  
  if (!validTypes.includes(type)) {
    console.error(`Invalid type: ${type}. Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }
  
  if (!validPriorities.includes(priority)) {
    console.error(`Invalid priority: ${priority}. Valid priorities: ${validPriorities.join(', ')}`);
    process.exit(1);
  }
  
  try {
    const task = await TodoQueueIdleChecker.addTodoTask({
      description,
      type,
      priority,
      data: {}
    });
    
    console.log('✅ Task added successfully!');
    console.log(`   ID: ${task.id}`);
    console.log(`   Description: ${task.description}`);
    console.log(`   Type: ${task.type}`);
    console.log(`   Priority: ${task.priority}`);
    console.log(`   Created: ${task.created_at}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding task:', error.message);
    process.exit(1);
  }
}

main();