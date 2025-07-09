#!/usr/bin/env node

/**
 * Enhancement Task Dispatcher
 * Automatically assigns enhancement tasks to appropriate agents based on enhancement-tasks.json
 */

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const ENHANCEMENT_TASKS_PATH = path.join(__dirname, '../shared/enhancement-tasks.json');
const FILEMAP_PATH = path.join(__dirname, '../shared/filemap.json');

async function loadEnhancementTasks() {
  try {
    const data = fs.readFileSync(ENHANCEMENT_TASKS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load enhancement tasks:', error);
    process.exit(1);
  }
}

async function getModelForAgent(agentType) {
  const agentModelMap = {
    'claude': 'claude-3-opus',
    'gpt': 'gpt-4o',
    'deepseek': 'deepseek-coder',
    'mistral': 'command-r-plus',
    'gemini': 'gemini-pro'
  };
  return agentModelMap[agentType] || 'gpt-4o';
}

async function dispatchEnhancement(enhancementId) {
  const enhancementData = await loadEnhancementTasks();
  const enhancement = enhancementData.enhancements[enhancementId];
  
  if (!enhancement) {
    console.error(`Enhancement ${enhancementId} not found`);
    return;
  }
  
  console.log(`\n🚀 Dispatching Enhancement: ${enhancement.title}`);
  console.log(`Priority: ${enhancement.priority}`);
  console.log(`Assigned Agents: ${enhancement.assigned_agents.join(', ')}`);
  
  let dispatchedCount = 0;
  
  // Dispatch each task to the appropriate agent queue
  for (const task of enhancement.tasks) {
    const model = await getModelForAgent(task.agent);
    
    // Add global prompt prefix
    const enhancedPrompt = `${enhancementData.global_modifications.all_agents.prompt_prefix}\n\n${task.prompt}\n\n${enhancementData.global_modifications.all_agents.testing_requirements}\n\n${enhancementData.global_modifications.all_agents.documentation_requirements}`;
    
    const job = {
      file: task.file,
      prompt: enhancedPrompt,
      model: model,
      enhancement_id: enhancement.id,
      priority: enhancement.priority,
      timestamp: new Date().toISOString()
    };
    
    // Add to appropriate queue
    await redis.lpush(`queue:${model}`, JSON.stringify(job));
    dispatchedCount++;
    
    console.log(`✅ Dispatched task for ${task.file} to ${task.agent} (${model})`);
  }
  
  // Update enhancement status
  await redis.hset(`enhancement:${enhancement.id}`, {
    status: 'dispatched',
    dispatched_at: new Date().toISOString(),
    total_tasks: enhancement.tasks.length,
    dispatched_tasks: dispatchedCount
  });
  
  // Notify all agents about the enhancement
  await redis.publish('agent-chat', JSON.stringify({
    from: 'enhancement-dispatcher',
    message: `🎯 Enhancement "${enhancement.title}" has been dispatched! ${dispatchedCount} tasks assigned to agents.`,
    enhancement_id: enhancement.id,
    type: 'enhancement_dispatch'
  }));
  
  console.log(`\n✨ Successfully dispatched ${dispatchedCount} tasks for enhancement ${enhancement.id}`);
}

async function dispatchAllEnhancements() {
  const enhancementData = await loadEnhancementTasks();
  const implementationOrder = enhancementData.implementation_order;
  
  console.log('📋 Enhancement Implementation Order:');
  implementationOrder.forEach((id, index) => {
    console.log(`${index + 1}. ${id}`);
  });
  
  // Dispatch enhancements in order with delay
  for (const enhancementId of implementationOrder) {
    await dispatchEnhancement(enhancementId);
    
    // Wait 5 seconds between enhancements to avoid overwhelming the system
    if (implementationOrder.indexOf(enhancementId) < implementationOrder.length - 1) {
      console.log('\n⏳ Waiting 5 seconds before next enhancement...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function getEnhancementStatus(enhancementId) {
  const status = await redis.hgetall(`enhancement:${enhancementId}`);
  if (!status || Object.keys(status).length === 0) {
    console.log(`No status found for enhancement ${enhancementId}`);
    return;
  }
  
  console.log(`\nEnhancement ${enhancementId} Status:`);
  console.log(`Status: ${status.status}`);
  console.log(`Dispatched at: ${status.dispatched_at}`);
  console.log(`Total tasks: ${status.total_tasks}`);
  console.log(`Dispatched tasks: ${status.dispatched_tasks}`);
}

// CLI interface
const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  try {
    switch (command) {
      case 'dispatch':
        if (arg === 'all') {
          await dispatchAllEnhancements();
        } else if (arg) {
          await dispatchEnhancement(arg);
        } else {
          console.log('Usage: enhancement-dispatcher.js dispatch <enhancement-id|all>');
        }
        break;
        
      case 'status':
        if (arg) {
          await getEnhancementStatus(arg);
        } else {
          // Show all enhancement statuses
          const enhancementData = await loadEnhancementTasks();
          for (const id of Object.keys(enhancementData.enhancements)) {
            await getEnhancementStatus(id);
          }
        }
        break;
        
      case 'list':
        const enhancementData = await loadEnhancementTasks();
        console.log('\nAvailable Enhancements:');
        Object.entries(enhancementData.enhancements).forEach(([id, enhancement]) => {
          console.log(`\n${id}: ${enhancement.title}`);
          console.log(`Priority: ${enhancement.priority}`);
          console.log(`Tasks: ${enhancement.tasks.length}`);
          console.log(`Agents: ${enhancement.assigned_agents.join(', ')}`);
        });
        break;
        
      default:
        console.log('Ez Aigent Enhancement Dispatcher');
        console.log('\nCommands:');
        console.log('  dispatch <enhancement-id|all>  - Dispatch enhancement tasks to agents');
        console.log('  status [enhancement-id]        - Show enhancement status');
        console.log('  list                          - List all available enhancements');
        console.log('\nExamples:');
        console.log('  node enhancement-dispatcher.js dispatch security-layer');
        console.log('  node enhancement-dispatcher.js dispatch all');
        console.log('  node enhancement-dispatcher.js status');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

main();