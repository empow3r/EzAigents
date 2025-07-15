# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## System Enhancements (v2.0)

### **🚀 New Enhanced Features**
- ✅ **API Key Management** - Intelligent rotation and health monitoring
- ✅ **Advanced Error Handling** - Circuit breaker and retry mechanisms  
- ✅ **Real-time Monitoring** - Comprehensive metrics and alerting
- ✅ **Load Balancing** - Smart agent selection and auto-scaling
- ✅ **Analytics Engine** - Performance insights and data analytics

### **Enhanced System Components**

#### **API Key Manager** (`shared/api-key-manager.js`)
```javascript
// Intelligent API key management with health monitoring
const keyManager = new APIKeyManager();
const bestKey = keyManager.getBestKey('claude'); // Auto-selects healthiest key
keyManager.recordKeyUsage(key, latency, success); // Track performance
```
- **Features**: Multi-key rotation, health-based selection, validation
- **Strategies**: Round-robin, least-used, weighted, health-based
- **Monitoring**: Real-time key health testing and latency tracking
- **Auto-healing**: Automatic key rehabilitation and failure detection

#### **Error Handler** (`shared/enhanced-error-handler.js`)
```javascript
// Circuit breaker and retry logic
await errorHandler.executeWithBoth('api_claude', async () => {
  return await apiCall();
}, { maxRetries: 3, circuitBreakerOptions: { threshold: 5 } });
```
- **Circuit Breaker**: Prevents cascade failures with configurable thresholds
- **Retry Logic**: Exponential backoff with jitter and smart retry conditions
- **Error Classification**: Automatic categorization and severity assessment
- **Fallback Support**: Graceful degradation with alternative responses

#### **Monitoring System** (`shared/enhanced-monitoring-system.js`)
```javascript
// Comprehensive metrics and alerting
globalMonitoring.metrics.recordMetric('api.response_time', duration);
globalMonitoring.metrics.setThreshold('cpu_usage', { warning: 70, critical: 90 });
```
- **Metrics Collection**: System, agent, API, and Redis metrics
- **Real-time Alerts**: Threshold-based alerting with multiple channels
- **Performance Analysis**: Trend analysis and predictive insights
- **Health Scoring**: Composite health metrics with recommendations

#### **Load Balancer** (`shared/load-balancer.js`)
```javascript
// Intelligent agent selection and auto-scaling
const agentId = await loadBalancer.selectAgent({ requiredCapabilities: ['analysis'] });
const autoScaler = new AutoScaler(loadBalancer, { maxAgents: 10 });
```
- **Selection Strategies**: Health-weighted, round-robin, least-connections
- **Auto-scaling**: Dynamic capacity management based on load metrics
- **Health Checks**: Continuous agent monitoring and failure detection
- **Load Distribution**: Intelligent request routing with capacity awareness

#### **Analytics Engine** (`shared/enhanced-analytics.js`)
```javascript
// Comprehensive analytics and insights
globalAnalytics.trackEvent('agent:activity', { agentId, success: true });
const report = globalAnalytics.generatePerformanceReport('24h');
```
- **Event Tracking**: Comprehensive activity logging and session management
- **Performance Analytics**: Response time, success rates, and error analysis
- **Insights Generation**: Automated recommendations and trend detection
- **Data Export**: CSV and JSON reporting with customizable time ranges

### **Enhanced API Endpoints**

#### **Enhanced Monitoring API** (`dashboard/pages/api/enhanced-monitoring.js`)
- **GET /api/enhanced-monitoring?endpoint=metrics** - System metrics
- **GET /api/enhanced-monitoring?endpoint=alerts** - Active alerts
- **GET /api/enhanced-monitoring?endpoint=performance** - Performance analysis
- **GET /api/enhanced-monitoring?endpoint=health** - System health overview
- **POST /api/enhanced-monitoring** - Record custom metrics and manage alerts

## Enhanced Agent Capabilities

### **Core AI Agents**

#### **Claude Agent** (`agents/claude/enhanced-coordinated-index.js`)
- **Specialization**: Architecture, refactoring, large context analysis
- **Capabilities**: `architecture`, `refactoring`, `code_analysis`, `large_context`, `complex_reasoning`
- **Coordination**: Collaborates with GPT for implementation, DeepSeek for testing
- **Queue**: `queue:claude-3-opus`

#### **GPT Agent** (`agents/gpt/enhanced-coordinated-index.js`)
- **Specialization**: Backend development, API integration, general programming
- **Capabilities**: `api_development`, `backend_logic`, `general_programming`, `text_generation`
- **Coordination**: Works with Claude on architecture, DeepSeek on testing
- **Queue**: `queue:gpt-4o`

#### **DeepSeek Agent** (`agents/deepseek/enhanced-coordinated-index.js`)
- **Specialization**: Testing, validation, debugging, optimization
- **Capabilities**: `testing`, `validation`, `code_generation`, `debugging`, `optimization`
- **Coordination**: Provides testing for Claude and GPT implementations
- **Queue**: `queue:deepseek-coder`

#### **Mistral Agent** (`agents/mistral/enhanced-coordinated-index.js`)
- **Specialization**: Documentation, technical writing, translation
- **Capabilities**: `documentation`, `summarization`, `technical_writing`, `translation`
- **Coordination**: Documents work from other agents
- **Queue**: `queue:mistral-large`

#### **Gemini Agent** (`agents/gemini/enhanced-coordinated-index.js`)
- **Specialization**: Code analysis, research, multimodal processing
- **Capabilities**: `code_analysis`, `research`, `multimodal`, `data_analysis`
- **Coordination**: Provides analysis and research support
- **Queue**: `queue:gemini-pro`

### **Specialized AI Agents**

#### **Ollama Agent** (`agents/ollama/enhanced-coordinated-index.js`)
- **Specialization**: Local inference, privacy-focused processing
- **Capabilities**: `local_inference`, `privacy_focused`, `offline_processing`
- **Coordination**: Handles sensitive tasks that require local processing
- **Queue**: `queue:ollama`

#### **Perplexity Agent** (`agents/perplexity/enhanced-coordinated-index.js`)
- **Specialization**: Web search, real-time research, fact-checking
- **Capabilities**: `web_search`, `fact_checking`, `real_time_data`, `research_synthesis`
- **Coordination**: Provides research data to other agents
- **Queue**: `queue:perplexity`

#### **WebScraper Agent** (`agents/webscraper/enhanced-coordinated-index.js`)
- **Specialization**: Authenticated web scraping, data extraction
- **Capabilities**: `web_scraping`, `authenticated_scraping`, `research`, `browser_automation`
- **Coordination**: Sends data to Claude for analysis
- **Queue**: `queue:webscraper`

### **Domain-Specific Agents**

#### **Database Agent** (`agents/database/enhanced-coordinated-index.js`)
- **Specialization**: Database operations, schema design, data management
- **Capabilities**: `sql_queries`, `data_management`, `schema_design`, `migrations`
- **Coordination**: Provides data services to all agents
- **Queue**: `queue:database`

#### **Security Agent** (`agents/security/enhanced-coordinated-index.js`)
- **Specialization**: Security scanning, vulnerability assessment, compliance
- **Capabilities**: `vulnerability_scanning`, `penetration_testing`, `compliance`, `audit`
- **Coordination**: Reviews code from other agents for security issues
- **Queue**: `queue:security`

#### **DevOps Agent** (`agents/devops/enhanced-coordinated-index.js`)
- **Specialization**: Infrastructure automation, deployment, monitoring
- **Capabilities**: `infrastructure_automation`, `monitoring`, `logging`, `deployment`
- **Coordination**: Handles deployment for all agent outputs
- **Queue**: `queue:devops`

#### **Frontend Agent** (`agents/frontend/enhanced-coordinated-index.js`)
- **Specialization**: Frontend development, UI/UX, JavaScript frameworks
- **Capabilities**: `react`, `vue`, `angular`, `css`, `javascript`
- **Coordination**: Works with Backend agents for full-stack development
- **Queue**: `queue:frontend`

#### **Mobile Agent** (`agents/mobile/enhanced-coordinated-index.js`)
- **Specialization**: Mobile app development, cross-platform solutions
- **Capabilities**: `ios_development`, `android_development`, `react_native`, `flutter`
- **Coordination**: Integrates with Backend and Frontend agents
- **Queue**: `queue:mobile`

#### **Analytics Agent** (`agents/analytics/enhanced-coordinated-index.js`)
- **Specialization**: Data analysis, business intelligence, reporting
- **Capabilities**: `data_analysis`, `reporting`, `metrics`, `business_intelligence`
- **Coordination**: Analyzes outputs and performance from other agents
- **Queue**: `queue:analytics`

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

## Development Commands

### **Root Package**
```bash
# Start the orchestrator system
npm start

# Run analytics and monitoring
npm run analytics

# Monitor system health
npm run monitor

# Stop all services
npm run stop
```

### **Dashboard (Next.js)**
```bash
cd dashboard

# Development server
npm run dev

# Production build and start
npm run build
npm run start

# Linting
npm run lint

# Build optimization analysis
npm run analyze
```

### **CLI Services**
```bash
cd cli

# Run tests
npm test
npm run test:watch
npm run test:coverage
```

### **Docker Operations**
```bash
# Start full system
docker-compose up -d

# Start specific profiles
docker-compose --profile development up -d    # Core development agents
docker-compose --profile production up -d     # Production-ready agents
docker-compose --profile minimal up -d        # Minimal core system
docker-compose --profile security up -d       # Security-focused agents
docker-compose --profile mobile up -d         # Mobile development agents
docker-compose --profile frontend up -d       # Frontend development agents
docker-compose --profile research up -d       # Research and analysis agents
docker-compose --profile local up -d          # Local/privacy-focused agents
docker-compose --profile analytics up -d      # Data analysis agents
docker-compose --profile devops up -d         # Infrastructure automation

# View service logs
docker-compose logs -f [service-name]

# Scale agents
docker-compose up -d --scale claude-agent=3
docker-compose up -d --scale gpt-agent=5
```

### **Agent Creation and Management**
```bash
# Create new agents interactively
node scripts/create-agent.js

# Create agent from command line
node scripts/create-agent.js create myagent ai-agent

# List available templates
node scripts/create-agent.js list

# View template details
node scripts/create-agent.js templates

# Quick setup popular agents
./scripts/setup-agents.sh

# Start a specific new agent
docker-compose up -d myagent-agent
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

# Core AI API Keys
CLAUDE_API_KEY=sk-or-cl-xxxxx
OPENAI_API_KEY=sk-xxxxx
DEEPSEEK_API_KEYS=key1,key2,key3
MISTRAL_API_KEY=sk-mistralxxxxx
GEMINI_API_KEY=sk-geminixxx

# Additional AI Services
OLLAMA_HOST=http://localhost:11434
PERPLEXITY_API_KEY=pplx-xxxxx
COHERE_API_KEY=co-xxxxx
ANTHROPIC_HAIKU_API_KEY=sk-ant-xxxxx

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/ezaigent
POSTGRES_URL=postgresql://user:pass@localhost:5432/postgres
MONGO_URL=mongodb://localhost:27017/ezaigent
ANALYTICS_DB_URL=postgresql://user:pass@localhost:5432/analytics

# Security and DevOps
SECURITY_API_KEY=sec-xxxxx
DOCKER_HOST=/var/run/docker.sock
KUBECTL_CONFIG=/path/to/kubeconfig

# Mobile Development
MOBILE_SDK_PATH=/opt/android-sdk

# Integration Services
SLACK_BOT_TOKEN=xoxb-xxxxx
GITHUB_TOKEN=ghp_xxxxx
AWS_ACCESS_KEY_ID=AKIA-xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AZURE_CLIENT_ID=xxxxx
GCP_SERVICE_ACCOUNT_KEY=xxxxx

# Health monitoring
AGENT_HEALTH_CHECK_INTERVAL=30
AGENT_ALERT_THRESHOLD=120
AGENT_AUTO_RESTART=true

# WebScraper
SCRAPER_HEADLESS=true

# Performance and Scaling
MIN_AGENTS=1
MAX_AGENTS=10
SCALE_UP_THRESHOLD=20
SCALE_DOWN_THRESHOLD=5
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

## Agent Template System

### **Available Agent Templates**
- `ai-agent` - General AI agent with API integration
- `tool-agent` - Tool execution and automation agent  
- `service-agent` - Service management and coordination
- `integration-agent` - External service integration
- `database-agent` - Database operations specialist
- `frontend-agent` - Frontend development specialist
- `mobile-agent` - Mobile development specialist
- `security-agent` - Security and compliance specialist
- `devops-agent` - Infrastructure automation specialist
- `analytics-agent` - Data analysis and BI specialist

### **Creating Custom Agents**
```bash
# Interactive agent creation
node scripts/create-agent.js

# Quick agent creation
node scripts/create-agent.js create myapi ai-agent

# Batch setup popular agents
./scripts/setup-agents.sh

# View all available templates
node scripts/create-agent.js templates
```

### **Agent Development Workflow**
1. **Generate Agent**: Use template factory to create base structure
2. **Configure**: Set API keys and environment variables
3. **Customize**: Modify capabilities and specialization logic
4. **Test**: Run locally with `npm run dev`
5. **Deploy**: Add to docker-compose and start with coordination
6. **Monitor**: Use health monitoring and agent registry

### **Agent Coordination Patterns**
```javascript
// Find agent by capability
const dbAgent = await this.coordinator.findAgentForTask('sql_queries');

// Multi-agent workflow
async processComplexTask(task) {
  // Step 1: Analysis (Claude)
  const analysis = await this.delegateToAgent('claude', task);
  
  // Step 2: Implementation (GPT)  
  const code = await this.delegateToAgent('gpt', { ...task, analysis });
  
  // Step 3: Security Review (Security Agent)
  const security = await this.delegateToAgent('security', { code });
  
  // Step 4: Testing (DeepSeek)
  const tests = await this.delegateToAgent('deepseek', { code, security });
  
  return { analysis, code, security, tests };
}
```

### **Scaling Agent Deployments**
```bash
# Scale by agent type
docker-compose up -d --scale gpt-agent=5
docker-compose up -d --scale claude-agent=3

# Profile-based scaling
docker-compose --profile production up -d
docker-compose --profile development up -d

# Monitor scaling
./scripts/agent-health-monitor.sh status
docker-compose ps
```

## Success Indicators

✅ **System Working Correctly:**
- All agents show "healthy" status in health monitor
- Port conflicts automatically resolved during startup
- Agents communicate successfully (visible in Redis monitoring)
- File operations complete without lock conflicts
- WebScraper extracts data and integrates with Claude analysis
- Dashboard accessible with real-time agent status
- Custom agents can be created and deployed seamlessly
- Multi-agent workflows complete successfully

## Documentation Files
- `AGENT_COORDINATION_SYSTEM.md` - Complete coordination system guide
- `WEBSCRAPER_USAGE_GUIDE.md` - WebScraper usage and examples
- `shared/agent-coordinator.js` - Core coordination implementation
- `shared/enhanced-base-agent.js` - Enhanced base agent class
- `shared/agent-templates.js` - Agent template factory system
- `scripts/create-agent.js` - Agent creation CLI tool

Remember: The Universal Coordination System ensures all agents work together seamlessly while maintaining isolation, security, and performance. All new agents should use the enhanced base class and coordination features.