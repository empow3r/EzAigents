# 🤖 Ez Aigent Universal Coordination System

## 🏗️ **System Overview**

The Universal Agent Coordination System provides seamless communication, resource management, and collaboration between all Ez Aigent agents. Every agent now has built-in:

- ✅ **Port Management** - Automatic port checking and reservation
- ✅ **File Locking** - Conflict-free file operations
- ✅ **Agent Discovery** - Find and communicate with other agents  
- ✅ **Shared Memory** - Cross-agent state management
- ✅ **Health Monitoring** - Real-time agent status tracking
- ✅ **Task Delegation** - Intelligent work distribution

## 📁 **System Architecture**

```
shared/
├── agent-coordinator.js      # Core coordination system
├── enhanced-base-agent.js    # Enhanced base class for all agents
└── coordination-config.json  # System configuration

.agent-memory/
├── communication/            # Inter-agent messages
├── locks/                   # File lock management
├── shared-state.json        # Global state storage
└── [agent-type]/           # Individual agent memories
```

## 🚀 **Usage for Agent Developers**

### **1. Enhanced Base Agent**

All agents should now inherit from `EnhancedBaseAgent`:

```javascript
const EnhancedBaseAgent = require('../shared/enhanced-base-agent');

class MyAgent extends EnhancedBaseAgent {
  constructor(config) {
    super({
      agentType: 'my-agent',
      agentId: 'my-agent-001',
      capabilities: ['custom_capability'],
      ...config
    });
    
    // Add required ports
    this.addRequiredPort(8080);
  }
  
  async initializeAgent() {
    // Agent-specific initialization
    this.log('My agent initializing...');
  }
  
  async executeTask(task) {
    // Implement task processing
    return { result: 'Task completed' };
  }
}
```

### **2. Port Management**

```javascript
// Reserve required ports during initialization
this.addRequiredPort(3000);
this.addRequiredPort(8080);

// Request dynamic ports at runtime
const reserved = await this.requestDynamicPort(9000, 'temporary-service');
if (reserved) {
  // Use port 9000
  await this.releaseDynamicPort(9000); // Release when done
}

// Check port availability
const available = await this.coordinator.checkPortAvailability(3000);
```

### **3. File Operations with Locking**

```javascript
// Safe file operations (automatic locking)
const content = await this.safeReadFile('/path/to/file.txt');
await this.safeWriteFile('/path/to/file.txt', 'new content');
await this.safeAppendFile('/path/to/log.txt', 'log entry\n');

// Manual lock management
const lockId = await this.coordinator.acquireFileLock('/path/to/file.txt', 'write');
try {
  // Perform file operations
} finally {
  await this.coordinator.releaseFileLock('/path/to/file.txt');
}
```

### **4. Agent Communication**

```javascript
// Broadcast to all agents
await this.coordinator.broadcastMessage('task:available', {
  taskId: 'task-123',
  type: 'analysis'
});

// Send direct message to specific agent
await this.coordinator.sendDirectMessage('claude-001', 'task:delegate', {
  task: taskData
});

// Register message handlers
this.coordinator.registerMessageHandler('custom:message', async (data, sender) => {
  this.log(`Received custom message from ${sender}`);
  // Handle message
});
```

### **5. Agent Discovery**

```javascript
// Find agents by type
const claudeAgents = await this.coordinator.discoverAgents('claude');

// Find agents by capability
const analysisAgents = await this.coordinator.discoverAgents(null, 'code_analysis');

// Find best agent for a task
const agent = await this.coordinator.findAgentForTask('web_scraping');
if (agent) {
  await this.coordinator.sendDirectMessage(agent.agentId, 'task:delegate', task);
}
```

### **6. Shared State Management**

```javascript
// Set shared state (available to all agents)
await this.coordinator.setSharedState('project:current', projectData, 3600);

// Get shared state
const projectData = await this.coordinator.getSharedState('project:current');

// Delete shared state
await this.coordinator.deleteSharedState('project:current');
```

### **7. Memory Management**

```javascript
// Save to agent memory
await this.saveToMemory({
  type: 'task_completed',
  result: taskResult
}, 'completed');

// Retrieve memory
const recentTasks = await this.getMemoryFromFile('completed', 5);

// Clear memory when needed
await this.clearMemory('session');
```

## 🔧 **System Configuration**

### **Environment Variables**

```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# Agent-specific settings
AGENT_ID=my-agent-001
AGENT_TYPE=my-agent
MEMORY_LIMIT=100          # MB
QUEUE_CHECK_INTERVAL=5000 # ms
```

### **Docker Integration**

```yaml
# docker-compose.yml
my-agent:
  build:
    context: .
    dockerfile: Dockerfile.agent
  environment:
    - AGENT_ID=my-agent-docker-001
    - REDIS_URL=redis://redis:6379
    - AGENT_TYPE=my-agent
  volumes:
    - ./.agent-memory:/app/.agent-memory
    - ./shared:/app/shared
```

## 📊 **Health Monitoring & Status**

### **Agent Status Tracking**

```javascript
// Get agent status
const status = await this.getAgentStatus();
// Returns: { agentId, agentType, status, uptime, memory, queueName, reservedPorts }

// Check other agents
const agents = await this.coordinator.discoverAgents();
agents.forEach(agent => {
  console.log(`${agent.agentId}: ${agent.status} (${agent.agentType})`);
});
```

### **Health Check API**

```bash
# Via Redis
redis-cli HGETALL agents:registry
redis-cli HGETALL agents:heartbeats

# Via Dashboard API
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/agent-stats
```

## 🚦 **Agent Lifecycle Management**

### **Startup Sequence**

1. **Initialize Coordinator** - Connect to Redis, create directories
2. **Port Management** - Check and reserve required ports
3. **Register Agent** - Add to registry, start heartbeat
4. **Message Listening** - Subscribe to communications
5. **Start Processing** - Begin queue monitoring

### **Shutdown Sequence**

1. **Stop Processing** - Exit queue loop gracefully
2. **Release Resources** - Free ports and file locks
3. **Deregister** - Remove from registry
4. **Cleanup** - Close connections, save state

### **Graceful Shutdown**

```javascript
// Handle shutdown signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await agent.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await agent.cleanup();
  process.exit(0);
});
```

## 🔄 **Task Delegation & Collaboration**

### **Automatic Task Delegation**

```javascript
async checkCollaborationNeeded(task) {
  // Example: Delegate UI tasks to frontend specialists
  if (task.type === 'ui-component') {
    return true;
  }
  return false;
}

getRequiredCapabilities(task) {
  if (task.type === 'ui-component') return ['frontend', 'react'];
  if (task.type === 'api-endpoint') return ['backend', 'api_development'];
  return [];
}
```

### **Multi-Agent Workflows**

```javascript
// Orchestrated workflow example
async processComplexTask(task) {
  // Step 1: Analysis (Claude)
  const analysisAgent = await this.coordinator.findAgentForTask('code_analysis');
  const analysis = await this.delegateTask(analysisAgent, { ...task, phase: 'analysis' });
  
  // Step 2: Implementation (GPT)
  const implAgent = await this.coordinator.findAgentForTask('api_development');
  const implementation = await this.delegateTask(implAgent, { ...task, phase: 'implementation', analysis });
  
  // Step 3: Testing (DeepSeek)
  const testAgent = await this.coordinator.findAgentForTask('testing');
  const tests = await this.delegateTask(testAgent, { ...task, phase: 'testing', implementation });
  
  return { analysis, implementation, tests };
}
```

## 🛠️ **Troubleshooting**

### **Common Issues**

**Port Conflicts:**
```bash
# Check port status
./scripts/port-check.sh status

# Free conflicts
./scripts/port-check.sh free
```

**Agent Not Registering:**
```bash
# Check Redis connection
redis-cli ping

# Check agent logs
docker logs ezaigents-[agent-name]
```

**File Lock Conflicts:**
```bash
# Check locks in Redis
redis-cli KEYS "file:lock:*"

# Manual lock cleanup (emergency only)
redis-cli DEL "file:lock:*"
```

**Memory Issues:**
```bash
# Check agent memory usage
curl http://localhost:3000/api/agent-stats

# Clear agent memory
# (done automatically when limit exceeded)
```

## 📈 **Performance Monitoring**

### **Key Metrics**

- **Agent Uptime** - Time since agent started
- **Memory Usage** - Heap usage vs. limit
- **Queue Depth** - Pending tasks per agent
- **Port Utilization** - Reserved vs. available ports
- **File Lock Duration** - Average lock hold time
- **Message Latency** - Inter-agent communication speed

### **Optimization Tips**

1. **Memory Management** - Regular cleanup prevents OOM
2. **Port Efficiency** - Release dynamic ports quickly
3. **File Lock Minimization** - Keep lock duration short
4. **Smart Delegation** - Route tasks to specialized agents
5. **Heartbeat Monitoring** - Detect and restart failed agents

## 🔐 **Security Features**

- **Isolated Agents** - Each agent has separate memory space
- **Encrypted Communication** - Redis AUTH and TLS support
- **File Lock Security** - Prevents concurrent write conflicts
- **Port Validation** - Ensure only authorized port usage
- **Resource Limits** - Memory and connection limits

---

**This coordination system ensures all Ez Aigent agents work together seamlessly while maintaining isolation, security, and performance.**