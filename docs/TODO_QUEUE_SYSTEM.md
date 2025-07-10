# Todo Queue System for Ez Aigents

## Overview

The Todo Queue System enables agents to automatically check for and process tasks during idle periods. Agents check the todo queue every 10 seconds when idle and assign themselves available tasks. The system includes an Orchestrator Agent role that delegates tasks with proper context and expected results, ensuring system safety through multi-agent consensus for destructive operations.

## Features

- **Automatic Idle Detection**: Agents monitor their own idle state
- **10-Second Check Interval**: Configurable interval for checking the todo queue
- **Task Assignment**: Atomic task assignment prevents duplicate processing
- **Task Types**: Support for specialized task types (code_review, refactoring, etc.)
- **Priority System**: High, medium, and low priority task support
- **Metrics Tracking**: Comprehensive metrics for monitoring performance
- **Multi-Agent Support**: Multiple agents can process tasks concurrently
- **Orchestrator Agent**: Dedicated agent role for task delegation and coordination
- **Code Safety**: Backup/snapshot mechanism before destructive operations
- **Consensus Requirements**: Multi-agent agreement for file deletion or major refactoring

## Architecture

```
┌───────────────────┐
│  Orchestrator     │────── Delegates tasks with context
│     Agent         │       and expected results
└────────┬──────────┘
         │
    ┌────▼────┐
    │ Consensus│────── Multi-agent agreement for
    │  System  │       destructive operations
    └────┬────┘
         │
┌────────▼────────┐     ┌──────────────┐     ┌─────────────────┐
│   Todo Queue    │────▶│ Idle Checker │────▶│  Worker Agent   │
│  (Redis List)   │     │  (10s timer) │     │  (Processing)   │
└─────────────────┘     └──────────────┘     └─────────────────┘
        │                                              │
        │                                              │
        ▼                                              ▼
┌─────────────────┐                          ┌─────────────────┐
│ Processing Queue│                          │ Completed Tasks │
└─────────────────┘                          └─────────────────┘
        │
        ▼
┌─────────────────┐
│ Backup/Snapshot │────── Code safety mechanism
│     Storage     │
└─────────────────┘
```

## Usage

### 1. Basic Integration

Add todo queue checking to any agent:

```javascript
const TodoQueueIdleChecker = require('./cli/todo-queue-idle-checker');

// Create idle checker for your agent
const todoChecker = new TodoQueueIdleChecker(agentId, agentType, {
  checkInterval: 10000, // 10 seconds
  todoQueueName: 'queue:todos'
});

// Start checking
await todoChecker.start();

// Handle task assignment
todoChecker.on('taskAssigned', async ({ task, agentId }) => {
  // Process the task
  const result = await processTask(task);
  
  // Mark as completed
  await todoChecker.completeCurrentTask(result);
});
```

### 2. Enhanced Agent Integration

Use the pre-built agent wrapper:

```javascript
const { AgentWithTodoIdleChecker } = require('./cli/agent-with-todo-idle-checker');

const agent = new AgentWithTodoIdleChecker('agent_001', 'claude', {
  idleCheckInterval: 10000,
  todoTaskHandler: async (task) => {
    // Custom task processing logic
    return { success: true, result: 'Task completed' };
  }
});

await agent.startTodoChecker();
```

### 3. Using with Existing Agents

For existing Claude agent with todo support:

```bash
# Start the enhanced Claude agent with todo queue support
node agents/claude/index-with-todo.js
```

## Task Types

The system supports specialized task types:

1. **code_review** - Security and code quality reviews
2. **architecture_analysis** - System architecture assessment
3. **refactoring** - Code improvement and restructuring
4. **documentation** - Generate docs and comments
5. **optimization** - Performance improvements
6. **general** - Generic tasks
7. **orchestration** - Task delegation and coordination
8. **destructive_operation** - File deletion or major changes (requires consensus)

## Adding Tasks

### Via CLI Tool

```bash
# Basic usage
node cli/add-todo-task.js "Review authentication module"

# With type and priority
node cli/add-todo-task.js "Refactor user service" refactoring high
```

### Programmatically

```javascript
const TodoQueueIdleChecker = require('./cli/todo-queue-idle-checker');

await TodoQueueIdleChecker.addTodoTask({
  description: 'Review authentication module for security',
  type: 'code_review',
  priority: 'high',
  data: {
    file_path: 'src/auth/auth.js',
    focus: 'SQL injection vulnerabilities'
  }
});
```

## Testing

Run the comprehensive test suite:

```bash
# Start Redis first
docker run -d -p 6379:6379 redis:alpine

# Run the test
node test-todo-queue.js
```

This will:
- Create 3 test agents (Claude, GPT, DeepSeek)
- Add 5 sample tasks to the queue
- Monitor task processing for 30 seconds
- Display metrics and statistics

## Monitoring

### Queue Statistics

Check queue status via Redis:

```bash
# Pending tasks
redis-cli LLEN queue:todos

# Processing tasks
redis-cli LLEN queue:todos:processing

# Completed tasks
redis-cli LLEN queue:todos:completed

# View metrics
redis-cli HGETALL todo:metrics
```

### Agent Status

Monitor agent activity:

```bash
# Check agent status
redis-cli GET agent:claude_001:status

# View current task
redis-cli GET agent:claude_001:current_task

# Task assignments
redis-cli HGETALL todo:assignments
```

## Configuration

### Environment Variables

```bash
REDIS_URL=redis://localhost:6379
TODO_CHECK_INTERVAL=10000  # milliseconds
TODO_QUEUE_NAME=queue:todos
```

### Agent Configuration

```javascript
{
  checkInterval: 10000,      // Check every 10 seconds
  todoQueueName: 'queue:todos',  // Redis queue name
  todoTaskHandler: customHandler  // Custom processing function
}
```

## Orchestrator Agent Role

The Orchestrator Agent is a specialized agent responsible for:

1. **Task Delegation**: Breaking down complex tasks into subtasks
2. **Context Management**: Providing proper context and expected results
3. **Resource Allocation**: Assigning tasks to appropriate agent types
4. **Progress Monitoring**: Tracking task completion and dependencies
5. **Quality Assurance**: Ensuring deliverables meet requirements

### Task Delegation Format

```javascript
{
  id: 'task_123',
  type: 'orchestration',
  description: 'Build user authentication system',
  subtasks: [
    {
      id: 'subtask_1',
      type: 'architecture_analysis',
      assigned_to: 'claude',
      context: {
        requirements: ['OAuth2', 'JWT', 'Session management'],
        constraints: ['Must support 10k concurrent users'],
        dependencies: []
      },
      expected_results: {
        deliverables: ['architecture_diagram.md', 'tech_spec.md'],
        acceptance_criteria: ['Scalable design', 'Security best practices']
      }
    },
    {
      id: 'subtask_2',
      type: 'code_review',
      assigned_to: 'gpt',
      context: {
        previous_task: 'subtask_1',
        focus_areas: ['Security vulnerabilities', 'Performance bottlenecks']
      },
      expected_results: {
        deliverables: ['security_review.md'],
        acceptance_criteria: ['No critical vulnerabilities']
      }
    }
  ]
}
```

## Safety Mechanisms

### 1. Backup/Snapshot System

Before any destructive operation:

```javascript
const snapshot = await BackupSystem.createSnapshot({
  files: ['src/auth.js', 'src/user.js'],
  reason: 'Major refactoring of authentication system',
  initiated_by: 'agent_orchestrator_001',
  approval_required: true
});
```

### 2. Multi-Agent Consensus

For destructive operations (file deletion, major refactoring):

```javascript
const consensus = await ConsensusSystem.requestApproval({
  operation: 'delete_files',
  files: ['deprecated/old_auth.js'],
  reason: 'Removing deprecated authentication module',
  required_approvals: 2,
  timeout: 300000 // 5 minutes
});

if (consensus.approved && consensus.approvers.length >= 2) {
  // Proceed with operation
  await performDestructiveOperation();
}
```

### 3. Testing Requirements

All changes must be tested before implementation:

```javascript
const testResults = await TestRunner.validate({
  changes: ['src/auth.js', 'src/user.js'],
  test_suites: ['unit', 'integration', 'security'],
  coverage_threshold: 80
});

if (testResults.passed && testResults.coverage >= 80) {
  // Safe to proceed
}
```

## Best Practices

1. **Idle Detection**: Ensure agents properly report idle state
2. **Task Granularity**: Keep tasks small and focused
3. **Error Handling**: Always handle task failures gracefully
4. **Monitoring**: Track metrics to optimize performance
5. **Priority**: Use priority levels appropriately
6. **Context Preservation**: Always provide sufficient context for delegated tasks
7. **Testing First**: Test all changes before applying to production code
8. **Consensus for Destruction**: Require multi-agent agreement for deletions
9. **Backup Everything**: Create snapshots before major changes
10. **Document Decisions**: Record why changes were made

## Troubleshooting

### Tasks Not Being Processed

1. Check Redis connection: `redis-cli ping`
2. Verify agent idle status: `redis-cli GET agent:{id}:status`
3. Check queue contents: `redis-cli LRANGE queue:todos 0 -1`
4. Review agent logs for errors

### Tasks Stuck in Processing

1. Check processing queue: `redis-cli LLEN queue:todos:processing`
2. Manually move back to main queue if needed
3. Review agent health and restart if necessary

## Architecture Benefits

1. **No Agent Modification**: Works with existing agent code
2. **Automatic Load Balancing**: Tasks distributed to idle agents
3. **Fault Tolerance**: Failed tasks returned to queue
4. **Scalability**: Add more agents to increase throughput
5. **Visibility**: Comprehensive metrics and monitoring