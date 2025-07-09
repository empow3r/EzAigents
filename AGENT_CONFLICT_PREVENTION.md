# Agent Conflict Prevention System

## Overview
This system prevents multiple agents from working on the same files simultaneously, eliminating conflicts, overwrites, and system instability.

## Architecture

### 1. File Lock Manager (`cli/file-lock-manager.js`)
- **Distributed locking** using Redis with 30-minute TTL
- **Atomic operations** prevent race conditions
- **Metadata tracking** for lock ownership and timing
- **Emergency release** capabilities
- **Conflict resolution** strategies

### 2. Agent Coordination (`cli/agent-coordination.js`)
- **Agent registration** with capabilities and heartbeat
- **Conflict detection** and resolution
- **Priority-based** task handling
- **Message passing** between agents
- **Graceful shutdown** with cleanup

### 3. Key Features

#### File Access Control
```javascript
// Request file access
const result = await coordination.requestFileAccess(
  'dashboard/pages/api/agents.js',
  'Update agents API endpoint',
  'high'
);

// Work on file (protected)
if (result.success) {
  // Do work...
  
  // Release when done
  await coordination.releaseFileAccess(
    'dashboard/pages/api/agents.js',
    'Updated API to return proper agent data'
  );
}
```

#### Conflict Resolution Strategies
1. **Wait**: Agent waits for file to be released
2. **Coordinate**: Agents communicate to share work
3. **Queue**: Work is queued for sequential execution
4. **Priority Override**: High-priority tasks can override locks

#### Agent Capabilities
- **Claude**: Architecture, refactoring, documentation, security
- **GPT**: Backend logic, API design, frontend, implementation
- **DeepSeek**: Testing, validation, DevOps, optimization
- **Mistral**: Documentation, analysis, comments
- **Gemini**: Analysis, optimization, performance

## Usage

### 1. Agent Registration
```javascript
const AgentCoordination = require('./cli/agent-coordination');
const coordination = new AgentCoordination();

// Register agent with capabilities
await coordination.registerAgent('claude', [
  'architecture', 'refactoring', 'documentation'
]);
```

### 2. File Access Pattern
```javascript
// Always request access before editing files
const access = await coordination.requestFileAccess(
  filePath, 
  taskDescription, 
  priority
);

if (access.success) {
  try {
    // Do your work here
    await editFile(filePath, changes);
    
    // Release access when done
    await coordination.releaseFileAccess(filePath, workSummary);
  } catch (error) {
    // Always release on error
    await coordination.releaseFileAccess(filePath, `Error: ${error.message}`);
  }
}
```

### 3. Conflict Handling
The system automatically handles conflicts based on:
- **File criticality** (package.json, docker-compose.yml, etc.)
- **Task priority** (urgent, critical, security keywords)
- **Agent capabilities** (complementary vs overlapping work)

## Deployment

### 1. Environment Variables
```bash
# Required
REDIS_URL=redis://localhost:6379
AGENT_ID=claude_agent_001  # Unique per agent instance

# Optional
AGENT_TYPE=claude
AGENT_CAPABILITIES=architecture,refactoring,documentation
```

### 2. Integration in Agents
```javascript
// In each agent (agents/claude/index.js, etc.)
const AgentCoordination = require('../../cli/agent-coordination');

class ClaudeAgent {
  constructor() {
    this.coordination = new AgentCoordination();
  }
  
  async start() {
    // Register with coordination system
    await this.coordination.registerAgent('claude', [
      'architecture', 'refactoring', 'documentation', 'security'
    ]);
  }
  
  async processTask(task) {
    // Request file access
    const access = await this.coordination.requestFileAccess(
      task.file,
      task.description,
      task.priority
    );
    
    if (access.success) {
      try {
        // Process the task
        const result = await this.executeTask(task);
        
        // Release access
        await this.coordination.releaseFileAccess(
          task.file,
          `Completed: ${task.description}`
        );
        
        return result;
      } catch (error) {
        await this.coordination.releaseFileAccess(
          task.file,
          `Error: ${error.message}`
        );
        throw error;
      }
    } else {
      // Handle conflict (wait, coordinate, or queue)
      console.log(`Conflict: ${access.message}`);
      return access;
    }
  }
}
```

### 3. Monitoring Commands
```bash
# Check all active locks
redis-cli HGETALL agents

# View file locks
redis-cli KEYS "lock:*" | head -10

# Monitor agent coordination
redis-cli PSUBSCRIBE "agent:*"

# Check work queues
redis-cli KEYS "work_queue:*"

# View coordination requests
redis-cli KEYS "coordination:*"
```

## Emergency Procedures

### 1. Release All Locks
```javascript
// Emergency release all locks held by an agent
await coordination.lockManager.emergencyReleaseAll(agentId);
```

### 2. Force Lock Release
```javascript
// Force release a specific lock
await coordination.lockManager.forceLock(
  filePath, 
  newAgentId, 
  'Emergency override'
);
```

### 3. System Reset
```bash
# Clear all locks and registrations
redis-cli FLUSHDB

# Or selectively clear
redis-cli DEL $(redis-cli KEYS "lock:*")
redis-cli DEL $(redis-cli KEYS "agents")
```

## Best Practices

### 1. Always Use Coordination
- **Never edit files directly** without requesting access
- **Always release locks** when done or on error
- **Use try/finally** blocks to ensure cleanup

### 2. Appropriate Task Descriptions
- Use **descriptive task names** for better coordination
- Include **priority keywords** (urgent, critical, security)
- Mention **scope** (small fix, major refactor, etc.)

### 3. Graceful Shutdown
- All agents register **signal handlers** for SIGINT/SIGTERM
- **Cleanup locks** on shutdown
- **Notify other agents** of shutdown

### 4. Error Handling
```javascript
// Always wrap file operations
try {
  const access = await coordination.requestFileAccess(file, task, priority);
  if (access.success) {
    // Work here
  }
} catch (error) {
  console.error('Coordination error:', error);
} finally {
  // Always cleanup
  await coordination.releaseFileAccess(file, 'Cleanup');
}
```

## Troubleshooting

### Common Issues

1. **Agent Not Responding**
```bash
# Check agent registration
redis-cli HGET agents agent_id

# Check heartbeat
redis-cli HGET agents agent_id | jq '.last_heartbeat'
```

2. **Stuck Locks**
```bash
# Check lock TTL
redis-cli TTL lock:filename

# Force release if needed
redis-cli DEL lock:filename
```

3. **Coordination Failures**
```bash
# Check coordination requests
redis-cli KEYS "coordination:*"

# View messages
redis-cli LRANGE "messages:agent_id" 0 -1
```

This system ensures that **no two agents can work on the same file simultaneously**, eliminating conflicts and maintaining system stability.