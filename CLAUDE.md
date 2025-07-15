# CLAUDE.md

This file provides guidance to Claude Code when working with the Ez Aigent codebase.

## Project Overview
**Ez Aigent** - An AI Multi-Agent SaaS Builder Orchestrator platform that coordinates 10-100+ cloud-based AI coding agents to build and scale SaaS products within 24 hours.

## Universal Agent Coordination System

**🎯 NEW: All agents now use the Universal Coordination System for:**
- ✅ **Port Management** - Automatic port checking and reservation
- ✅ **File Locking** - Conflict-free file operations
- ✅ **Agent Communication** - Direct messaging and broadcasting
- ✅ **Agent Discovery** - Find and collaborate with other agents
- ✅ **Shared Memory** - Cross-agent state management
- ✅ **Health Monitoring** - Real-time agent status tracking

## High-Level Architecture

1. **Agent Coordinator** (`shared/agent-coordinator.js`) - Universal communication and resource management
2. **Enhanced Base Agent** (`shared/enhanced-base-agent.js`) - Enhanced base class for all agents
3. **Port Management System** - Automatic port conflict resolution
4. **File Lock Manager** - Distributed file locking with Redis
5. **Health Monitor** (`scripts/agent-health-monitor.sh`) - Agent health and auto-recovery
6. **WebScraper Agent** - Authenticated web scraping with AI integration

**Key Coordination Features:**
- **Automatic Port Checking** - No more port conflicts
- **Distributed File Locking** - Safe concurrent file operations
- **Inter-Agent Messaging** - Direct communication between agents
- **Agent Registry** - Automatic discovery and collaboration
- **Shared State Management** - Cross-agent data sharing
- **Health Monitoring** - Real-time status and auto-restart

## Project Structure
```
Ez Aigent/
├── shared/                    # Universal coordination system
│   ├── agent-coordinator.js   # Core coordination system
│   └── enhanced-base-agent.js # Enhanced base class
├── agents/                    # Individual agent containers
│   ├── claude/               # Architecture and analysis
│   ├── gpt/                  # Backend development
│   ├── deepseek/             # Testing and validation
│   ├── mistral/              # Documentation
│   ├── gemini/               # Code analysis
│   └── webscraper/           # Web scraping and research
├── scripts/                   # System management scripts
│   ├── port-check.sh         # Port management
│   └── agent-health-monitor.sh # Health monitoring
├── dashboard/                 # Web UI and monitoring
├── cli/                      # Orchestrator services
├── .agent-memory/            # Agent persistent memory
│   ├── communication/        # Inter-agent messages
│   ├── locks/               # File lock management
│   └── [agent-type]/        # Individual memories
└── src/                      # Shared outputs
```

## Agent Coordination Usage

### **For Agent Development**
All agents should inherit from `EnhancedBaseAgent`:

```javascript
const EnhancedBaseAgent = require('../shared/enhanced-base-agent');

class MyAgent extends EnhancedBaseAgent {
  constructor(config) {
    super({
      agentType: 'my-agent',
      capabilities: ['my_capability'],
      ...config
    });
    
    // Add required ports
    this.addRequiredPort(8080);
  }
  
  async executeTask(task) {
    // Safe file operations with automatic locking
    const content = await this.safeReadFile('/path/to/file.txt');
    await this.safeWriteFile('/path/to/output.txt', result);
    
    // Agent communication
    const claudeAgent = await this.coordinator.findAgentForTask('code_analysis');
    if (claudeAgent) {
      await this.coordinator.sendDirectMessage(claudeAgent.agentId, 'analyze:code', data);
    }
    
    return result;
  }
}
```

### **Port Management**
```bash
# Check all ports before starting
./scripts/port-check.sh check

# Free conflicting ports
./scripts/port-check.sh free

# Start with automatic port management
./scripts/port-check.sh start
```

### **Agent Health Monitoring**
```bash
# View agent status
./scripts/agent-health-monitor.sh status

# Continuous monitoring with auto-restart
./scripts/agent-health-monitor.sh monitor

# Manual restart of unhealthy agents
./scripts/agent-health-monitor.sh auto-restart
```

## Enhanced Agent Capabilities

### **Claude Agent** (`agents/claude/enhanced-coordinated-index.js`)
- **Specialization**: Architecture, refactoring, large context analysis
- **Capabilities**: `architecture`, `refactoring`, `code_analysis`, `large_context`
- **Coordination**: Collaborates with GPT for implementation, DeepSeek for testing
- **Queue**: `queue:claude-3-opus`

### **WebScraper Agent** (`agents/webscraper/enhanced-coordinated-index.js`)
- **Specialization**: Authenticated web scraping, data extraction
- **Capabilities**: `web_scraping`, `authenticated_scraping`, `research`
- **Coordination**: Sends data to Claude for analysis
- **Queue**: `queue:webscraper`

## Core Commands

### **System Management**
```bash
# Safe startup with coordination
./start-ez-aigent.sh

# Port and service management
./scripts/port-check.sh {check|free|start|stop|restart|status}

# Agent health monitoring
./scripts/agent-health-monitor.sh {status|monitor|auto-restart|report}

# Test coordination system
node test-agent-coordination.js
```

### **Agent Operations**
```bash
# Start individual agents (with coordination)
node agents/claude/enhanced-coordinated-index.js
node agents/webscraper/enhanced-coordinated-index.js

# Monitor agent communication
redis-cli PSUBSCRIBE agent:*

# Check agent registry
redis-cli HGETALL agents:registry

# View agent heartbeats
redis-cli HGETALL agents:heartbeats
```

## WebScraper Integration

### **Dashboard Access**
- **URL**: http://localhost:3000
- **Features**: Real-time scraping interface, session management, AI integration

### **Scraping Examples**
```javascript
// LinkedIn profile scraping with Claude analysis
{
  "url": "https://linkedin.com/in/username",
  "scraperType": "linkedin", 
  "authRequired": true,
  "credentials": { "username": "user", "password": "pass" },
  "analyzeWithClaude": true,
  "analysisPrompt": "Extract key skills and experience"
}

// Research scraping with multi-agent collaboration
{
  "type": "research_scraping",
  "researchTopics": ["AI trends", "SaaS development"],
  "requiresAnalysis": true,
  "generateSummary": true
}
```

## Environment Variables
```bash
# Core coordination
REDIS_URL=redis://localhost:6379
AGENT_ID=agent-001
AGENT_TYPE=claude

# API Keys (for agents)
CLAUDE_API_KEY=sk-or-cl-xxxxx
OPENAI_API_KEY=sk-xxxxx
DEEPSEEK_API_KEYS=key1,key2,key3
MISTRAL_API_KEY=sk-mistralxxxxx
GEMINI_API_KEY=sk-geminixxx

# Health monitoring
AGENT_HEALTH_CHECK_INTERVAL=30
AGENT_ALERT_THRESHOLD=120
AGENT_AUTO_RESTART=true

# WebScraper
SCRAPER_HEADLESS=true
```

## Agent Communication Patterns

### **Direct Messaging**
```javascript
// Send analysis request to Claude
await this.coordinator.sendDirectMessage('claude-001', 'code:analyze', {
  code: sourceCode,
  analysisType: 'security'
});

// Request web scraping from WebScraper
await this.coordinator.sendDirectMessage('webscraper-001', 'scrape:request', {
  url: 'https://example.com',
  extractionRules: { title: 'h1', content: '.content' }
});
```

### **Broadcast Messaging**
```javascript
// Notify all agents of task completion
await this.coordinator.broadcastMessage('task:completed', {
  taskId: 'task-123',
  result: completionData
});
```

### **Agent Discovery**
```javascript
// Find agents by capability
const analysisAgents = await this.coordinator.discoverAgents(null, 'code_analysis');
const scraperAgents = await this.coordinator.discoverAgents('webscraper');
```

## File Operations with Coordination

### **Safe File Operations**
```javascript
// Automatic locking for conflict-free operations
const content = await this.safeReadFile('/path/to/file.txt');
await this.safeWriteFile('/path/to/output.txt', processedContent);
await this.safeAppendFile('/path/to/log.txt', 'New log entry\n');
```

### **Manual Lock Management**
```javascript
// Acquire file lock
const lockId = await this.coordinator.acquireFileLock('/path/to/file.txt', 'write');
try {
  // Perform file operations
  await fs.writeFile('/path/to/file.txt', newContent);
} finally {
  // Always release lock
  await this.coordinator.releaseFileLock('/path/to/file.txt');
}
```

## Shared State Management

### **Cross-Agent Data Sharing**
```javascript
// Set shared state (available to all agents)
await this.coordinator.setSharedState('project:current', projectData, 3600);

// Get shared state from another agent
const projectData = await this.coordinator.getSharedState('project:current');

// Monitor shared state changes
this.coordinator.registerMessageHandler('state:changed', async (data) => {
  // Handle state changes
});
```

## Troubleshooting Guide

### **Port Conflicts**
```bash
# Check which ports are in use
./scripts/port-check.sh status

# Free Ez Aigent ports
./scripts/port-check.sh free

# Start with port checking
./scripts/port-check.sh start
```

### **Agent Communication Issues**
```bash
# Check Redis connectivity
redis-cli ping

# View agent registry
redis-cli HGETALL agents:registry

# Monitor real-time messages
redis-cli PSUBSCRIBE agent:*
```

### **File Lock Issues**
```bash
# Check active file locks
redis-cli KEYS "file:lock:*"

# Emergency lock cleanup (use carefully)
redis-cli DEL "file:lock:*"
```

### **Health Issues**
```bash
# Check agent health
./scripts/agent-health-monitor.sh status

# Auto-restart unhealthy agents
./scripts/agent-health-monitor.sh auto-restart

# Continuous monitoring
./scripts/agent-health-monitor.sh monitor
```

## Agent Memory System
All agents use enhanced memory with cross-agent access:

```
.agent-memory/
├── communication/          # Inter-agent messages
├── shared-state.json      # Global state storage
├── claude/               # Claude-specific memory
├── webscraper/           # WebScraper-specific memory
│   ├── sessions/         # Authentication sessions
│   ├── screenshots/      # Captured screenshots
│   └── extracted-data/   # Scraped data
└── [other-agents]/       # Other agent memories
```

## Security Features

- **Isolated Agent Execution** - Each agent runs in separate container
- **Encrypted Session Storage** - Authentication data encrypted locally
- **Secure File Locking** - Prevents concurrent write conflicts
- **Port Validation** - Only authorized agents can reserve ports
- **Resource Limits** - Memory and connection limits per agent

## Performance Optimization

- **Automatic Memory Cleanup** - Clears context when limits reached
- **Efficient Port Usage** - Releases dynamic ports immediately
- **Smart Task Delegation** - Routes tasks to specialized agents
- **Health-Based Routing** - Avoids overloaded agents
- **Connection Pooling** - Reuses Redis connections efficiently

## Success Indicators

✅ **System Working Correctly:**
- All agents show "healthy" status in health monitor
- Port conflicts automatically resolved during startup
- Agents communicate successfully (visible in Redis monitoring)
- File operations complete without lock conflicts
- WebScraper extracts data and integrates with Claude analysis
- Dashboard accessible with real-time agent status

## Documentation Files
- `AGENT_COORDINATION_SYSTEM.md` - Complete coordination system guide
- `WEBSCRAPER_USAGE_GUIDE.md` - WebScraper usage and examples
- `shared/agent-coordinator.js` - Core coordination implementation
- `shared/enhanced-base-agent.js` - Enhanced base agent class

Remember: The Universal Coordination System ensures all agents work together seamlessly while maintaining isolation, security, and performance. All new agents should use the enhanced base class and coordination features.