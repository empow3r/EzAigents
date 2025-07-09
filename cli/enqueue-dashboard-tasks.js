#!/usr/bin/env node

const Redis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function enqueueDashboardTasks() {
  console.log('🚀 Starting dashboard enhancement task distribution...\n');

  try {
    // Load task definitions
    const tasksFile = path.join(__dirname, '../shared/dashboard-enhancement-tasks.json');
    const taskData = JSON.parse(await fs.readFile(tasksFile, 'utf8'));

    // Announce project start
    await redis.publish('agent:chat', JSON.stringify({
      type: 'announcement',
      from: 'orchestrator',
      message: '🎯 Dashboard Enhancement Project v2.0 Starting!',
      timestamp: new Date().toISOString()
    }));

    // Process each task
    for (const task of taskData.tasks) {
      const job = {
        id: task.id,
        type: 'dashboard-enhancement',
        title: task.title,
        description: task.description,
        files: task.files,
        dependencies: task.dependencies,
        priority: task.priority,
        agent: task.agent,
        model: task.model,
        project: taskData.project,
        timestamp: new Date().toISOString(),
        instructions: getAgentInstructions(task)
      };

      // Determine queue based on model
      const queueName = `queue:${task.model}`;
      
      // Enqueue the task
      await redis.lpush(queueName, JSON.stringify(job));
      
      console.log(`✅ Enqueued task for ${task.agent.toUpperCase()} agent:`);
      console.log(`   📋 Task: ${task.title}`);
      console.log(`   🎯 Priority: ${task.priority}`);
      console.log(`   📂 Files: ${task.files.length} files to create/modify`);
      console.log(`   ⏱️  Estimated: ${task.estimated_hours} hours`);
      console.log(`   📍 Queue: ${queueName}\n`);

      // Create task tracking entry
      await redis.hset('dashboard:tasks', task.id, JSON.stringify({
        ...task,
        status: 'queued',
        queued_at: new Date().toISOString()
      }));

      // Announce task assignment
      await redis.publish(`agent:${task.agent}`, JSON.stringify({
        type: 'task-assigned',
        task: task.id,
        title: task.title,
        priority: task.priority
      }));
    }

    // Set up coordination channels
    await setupCoordinationChannels(taskData);

    // Create project dashboard
    await createProjectDashboard(taskData);

    console.log('🎉 All tasks successfully enqueued!');
    console.log('\n📊 Project Dashboard: http://localhost:3000/projects/dashboard-enhancement');
    console.log('📡 Monitor progress: redis-cli PSUBSCRIBE "agent:*"');
    console.log('💬 Join coordination: redis-cli SUBSCRIBE "dashboard-enhancement"');

  } catch (error) {
    console.error('❌ Error enqueueing tasks:', error);
  } finally {
    redis.disconnect();
  }
}

function getAgentInstructions(task) {
  const baseInstructions = `
# Dashboard Enhancement Task: ${task.title}

## Your Assignment
${task.description}

## Files to Create/Modify
${task.files.map(f => `- ${f}`).join('\n')}

## Required Dependencies
${task.dependencies.map(d => `- ${d}`).join('\n')}

## Coordination Protocol
1. Announce start: redis-cli PUBLISH "dashboard-enhancement" "Starting ${task.title}"
2. Lock files before editing: redis-cli SET "lock:{filepath}" "${task.agent}" EX 3600 NX
3. Update progress: redis-cli HSET "task:progress" "${task.id}" "{percentage}"
4. Request help: redis-cli LPUSH "messages:{other-agent}" "{your message}"

## Integration Guidelines
- Follow the existing code style and patterns
- Use Tailwind CSS for styling
- Ensure mobile responsiveness
- Add proper TypeScript types if applicable
- Include unit tests for new components
- Document complex logic with comments

## Quality Standards
- Accessibility: WCAG 2.1 AA compliance
- Performance: 60fps animations, <100ms response time
- Security: Input validation, XSS prevention
- Testing: >80% code coverage

Remember to communicate with other agents working on related features!
`;

  // Add task-specific instructions
  const specificInstructions = {
    'claude-1': `
## Collaboration Specific Notes
- Use Socket.io for real-time updates
- Implement conflict resolution for simultaneous edits
- Add presence indicators showing active users
- Ensure cursor positions are accurate across different screen sizes`,
    
    'gpt-1': `
## Analytics Specific Notes
- Pre-train models for common patterns
- Implement caching for predictions
- Add confidence scores to predictions
- Create fallback for when ML models fail`,
    
    'deepseek-1': `
## Visualization Specific Notes
- Use WebGL for performance with large datasets
- Implement LOD (Level of Detail) for complex visualizations
- Add smooth transitions between states
- Ensure colorblind-friendly palettes`,
    
    'mistral-1': `
## Audio Specific Notes
- Implement volume controls and mute options
- Add audio compression for network efficiency
- Create fallback for browsers without audio API
- Respect user's reduced motion preferences`,
    
    'gemini-1': `
## PWA Specific Notes
- Implement smart caching strategies
- Add offline queue for actions
- Create app install prompts
- Optimize bundle size for mobile`,
    
    'claude-2': `
## Gamification Specific Notes
- Balance rewards to maintain engagement
- Add anti-cheat mechanisms
- Create smooth achievement animations
- Implement leaderboard pagination`
  };

  return baseInstructions + (specificInstructions[task.id] || '');
}

async function setupCoordinationChannels(taskData) {
  // Create coordination channel info
  await redis.hset('project:channels', taskData.project, JSON.stringify({
    main: taskData.coordination.communication_channel,
    status: `${taskData.project}:status`,
    help: `${taskData.project}:help`,
    integration: `${taskData.project}:integration`
  }));

  // Initialize project status
  await redis.hset('project:status', taskData.project, JSON.stringify({
    status: 'active',
    started_at: new Date().toISOString(),
    deadline: taskData.coordination.deadline,
    total_tasks: taskData.tasks.length,
    completed_tasks: 0
  }));
}

async function createProjectDashboard(taskData) {
  // Create a project overview for the web dashboard
  const projectOverview = {
    id: taskData.project,
    name: 'Dashboard Enhancement v2.0',
    description: 'Major UI/UX upgrade with real-time collaboration, AI analytics, and gamification',
    created_at: taskData.created,
    deadline: taskData.coordination.deadline,
    tasks: taskData.tasks.map(t => ({
      id: t.id,
      agent: t.agent,
      title: t.title,
      priority: t.priority,
      status: 'queued'
    })),
    metrics: {
      total_tasks: taskData.tasks.length,
      high_priority: taskData.tasks.filter(t => t.priority === 'high').length,
      total_hours: taskData.tasks.reduce((sum, t) => sum + t.estimated_hours, 0)
    }
  };

  await redis.set(`project:${taskData.project}:overview`, JSON.stringify(projectOverview));
}

// Run the script
enqueueDashboardTasks();