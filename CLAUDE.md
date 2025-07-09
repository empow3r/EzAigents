# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**EzAugent (AgentForce VCore)** - An AI Multi-Agent SaaS Builder Orchestrator platform that coordinates 10-100+ cloud-based AI coding agents to build and scale SaaS products within 24 hours.

## Project Structure

### Current File Layout
```
EzAugent/
├── agent_*.js          # Individual agent implementations
├── orchestrator_*.js   # Orchestration and context engines
├── dashboard_*.js/jsx  # Dashboard UI components
├── *.yaml             # Docker and K8s configurations
├── filemap.json       # Task-to-agent mapping
├── tokenpool.json     # API key rotation pool
└── CLAUDE.md          # This file
```

### Expected Directory Structure (for Docker deployment)
```
EzAugent/
├── cli/               # Orchestrator and runner services
│   ├── runner.js
│   ├── enqueue.js
│   └── agent-spawner.js
├── agents/            # Individual agent containers
│   ├── claude/
│   │   └── index.js
│   ├── gpt/
│   │   └── index.js
│   ├── deepseek/
│   │   └── index.js
│   └── mistral/
│       └── index.js
├── dashboard/         # Web UI
│   ├── src/
│   └── api/
├── src/               # Shared code repository
│   └── output/        # Agent-generated outputs
└── shared/            # Shared configuration
    ├── filemap.json
    └── tokenpool.json
```

## Key Architecture Components

### 1. **Multi-Agent System**
- **Redis Queue**: Central task distribution via pub/sub (port 6379)
- **Agent Types**: Claude, GPT-4o, DeepSeek, Mistral agents with specialized roles
- **Token Pool**: Rotating API key management in `tokenpool.json`
- **File Mapping**: Task assignments defined in `filemap.json`

### 2. **Core Files**
**Orchestration Layer:**
- `agent_runner.js`: Main task dequeuer and distributor
- `orchestrator_context_engine.js`: Context priming for agents (enqueue.js)
- `orchestrator_autotuner.js`: Performance optimization
- `agent_spawner_enhancer.js`: Dynamic agent configuration with model-specific prompts
- `enqueue_script.js`: Task enqueueing utility
- `agent_sync_service.js`: Agent synchronization service

**Agent Implementations:**
- `agent_claude_index.js`: Claude agent (refactoring, architecture)
- `agent_mistral_index.js`: Mistral agent (documentation)
- Individual agents follow pattern: dequeue → process → output

**Dashboard & UI:**
- `agent_dashboard_ui.jsx`: React component for stats visualization
- `agent_dashboard_api.js`: Backend API for dashboard
- `agent_dashboard_tui.js`: Terminal UI version
- `dashboard_nextjs_app.jsx`: Next.js dashboard application
- `metrics_api_route.js`: Metrics endpoint for dashboard

**Supporting Services:**
- `agent_memory_writer.js`: Persistent memory management
- `agent_knowledge_evolver.js`: Knowledge base evolution
- `cost_model.js`: Token cost calculation and tracking

**Configuration:**
- `filemap.json`: Task-to-model mapping
- `tokenpool.json`: API key rotation pool
- `ai_agent_infra_setup.env`: Environment setup guide
- `ai_agent_infra_setup.js`: Infrastructure initialization
- `env.txt`: Environment variable reference

**Infrastructure:**
- `docker_compose_ai_mesh.yaml`: Local multi-agent setup
- `ai_agent_mesh_stack.yaml`: Kubernetes deployment
- `cloudflare_tunnel_setup.yaml`: Secure remote access
- `agentstack_deployment_kit.js`: Deployment utilities (v1, v2, v3)

### 3. **Memory & Context System**
Each agent maintains context through:
- `todo.md`: Task tracking with [x] checkboxes
- `notes.md`: Technical decisions and logs
- `codebase.md`: File changes and diffs
- `version.md`: Commit summaries
- `security.md`: Security audit logs

## Dependency Management

### Core Dependencies Required
**Note:** No package.json files exist yet. Each service needs its own:

**Orchestrator/CLI (`cli/package.json`):**
```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  }
}
```

**Agents (`agents/*/package.json`):**
```json
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "axios": "^1.6.0"
  }
}
```

**Dashboard (`dashboard/package.json`):**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "recharts": "^2.9.0",
    "@radix-ui/react-*": "latest",
    "ioredis": "^5.3.2"
  }
}
```

### Installing Dependencies
```bash
# After creating directory structure:
cd cli && npm install
cd ../dashboard && npm install
cd ../agents/claude && npm install
# Repeat for each agent
```

## Development Commands

### Local Development
```bash
# Start Redis and all services
docker-compose -f docker_compose_ai_mesh.yaml up

# Scale specific agents
docker-compose up --scale agent_claude=10 --scale agent_gpt=10 --scale agent_deepseek=5

# Run individual agent (after npm install)
node agent_runner.js

# Start dashboard (after npm install)
cd dashboard && npm run dev
```

### Testing & Validation
```bash
# No test suites exist yet, but when implementing:
# npm test - Run test suite
# npm run lint - Check code style
# npm run security-audit - Run security checks
```

## Critical Conventions

### API Key Management
- Store keys in `.env.tokenpool` (never commit)
- Keys rotate automatically via `tokenPool` in agent_runner.js
- Each model has multiple keys for load balancing

### Task Assignment
- Tasks defined in `filemap.json` with model + prompt
- Redis queue manages task distribution
- Failed tasks auto-retry with exponential backoff

### Queue Architecture
**Queue Naming Pattern:**
- `queue:{model}` - Pending tasks for specific model
- `processing:{model}` - Tasks currently being processed
- `queue:failures` - Failed tasks with error details
- `agent:status` - Real-time status updates channel
- `agent:errors` - Error logging channel

**Job Payload Structure:**
```json
{
  "file": "core/api/handler.ts",
  "prompt": "Refactor for clarity and add error handling",
  "model": "claude-3-opus",
  "timestamp": "2025-07-09T00:00:00Z"
}
```

**Queue Operations:**
- Enqueue: `LPUSH queue:{model} {job_json}`
- Dequeue: `RPOPLPUSH queue:{model} processing:{model}`
- Complete: `LREM processing:{model} 1 {job_json}`
- Retry: `RPOPLPUSH processing:{model} queue:{model}`

### Agent Communication Patterns
**Model-to-Queue Mapping:**
- Claude models → `queue:claude-3-opus`
- GPT models → `queue:gpt-4o`
- DeepSeek → `queue:deepseek-coder`
- Mistral → `queue:command-r-plus`

**Context Priming System:**
1. Orchestrator loads `filemap.json`
2. Determines agent type based on model
3. Calls `primeAgentContext()` to enhance prompt
4. Publishes enriched job to appropriate queue

**Agent Role Assignment:**
- Claude: `nextjs-core`, architecture, refactoring
- GPT: `copywriter-genius`, logic, backend
- DeepSeek: `database-specialist`, testing
- Mistral: Documentation generation

**Inter-Agent Communication:**
- All via Redis pub/sub channels
- No direct agent-to-agent communication
- Agents write outputs to `./src/output/` directory
- Status updates published to `agent:status` channel

### Security Practices
- Input sanitization required for all user inputs
- No hardcoded credentials
- Agent outputs sandboxed before execution
- Memory isolation between agents

## Agent-Specific Guidelines

### Claude Agents
- Focus: Architecture, refactoring, documentation
- Max context: 200k tokens
- Best for: Complex reasoning, code review

### GPT-4o Agents  
- Focus: Logic implementation, API endpoints
- Max context: 128k tokens
- Best for: Backend services, data processing

### DeepSeek Agents
- Focus: Testing, validation, type generation
- Max context: 32k tokens  
- Best for: Unit tests, integration tests

### Mistral Agents
- Focus: Documentation, comments, README files
- Max context: 32k tokens
- Best for: Technical writing, API docs

## Deployment Patterns

### Local (1-3 agents)
```bash
docker-compose up
```

### Distributed (2-5 workstations)
- Shared Redis instance
- NFS/shared volume for code
- VPN or Tailscale networking

### Cloud (50+ agents)
- Kubernetes via `ai_agent_mesh_stack.yaml`
- Auto-scaling based on queue depth
- Fly.io or Railway deployment ready

## Monitoring & Observability

### Dashboard Routes
- `/agents` - Live agent status
- `/queue` - Task queue depth
- `/cost` - Token usage and costs
- `/errors` - Failed tasks and retries
- `/memory` - Agent context usage

### Logging
- Agent logs: `.logs/{agent}.md`
- Task history: `.agent.history.md`
- Cost tracking: Supabase integration
- Errors: Redis `agent:errors` channel

## Project Phases

1. **Foundation**: Redis setup, basic agents, token rotation
2. **Agent Runtime**: Memory management, file I/O, commit hooks
3. **Dashboard**: Real-time UI, diff viewer, cost tracking
4. **Control**: Slack/CLI commands, voice triggers, PDF reports

## Environment Variables
```bash
REDIS_URL=redis://localhost:6379
FILEMAP_PATH=./filemap.json
TOKENPOOL_PATH=./tokenpool.json
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEYS=key1,key2,key3
MISTRAL_API_KEY=sk-...
```

## Development Setup

### Initial Project Setup
1. **Create Directory Structure:**
```bash
mkdir -p cli agents/{claude,gpt,deepseek,mistral} dashboard/src src/output shared
```

2. **Move Files to Correct Locations:**
```bash
# Move orchestrator files
mv agent_runner.js cli/runner.js
mv orchestrator_context_engine.js cli/enqueue.js
mv agent_spawner_enhancer.js cli/agent-spawner.js

# Move agent files
mv agent_claude_index.js agents/claude/index.js
mv agent_mistral_index.js agents/mistral/index.js

# Move shared configs
mv filemap.json tokenpool.json shared/

# Create placeholder agents for GPT and DeepSeek
cp agents/claude/index.js agents/gpt/index.js
cp agents/claude/index.js agents/deepseek/index.js
```

3. **Create Package.json Files:**
```bash
# Create package.json in each directory using the dependency templates above
cd cli && npm init -y && npm install ioredis axios dotenv
cd ../dashboard && npm init -y && npm install next react recharts @radix-ui/react-*
# Repeat for each agent directory
```

4. **Start Redis:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
brew install redis && redis-server
```

5. **Set Environment Variables:**
```bash
cp env.txt .env
# Edit .env with your API keys
export $(cat .env | xargs)
```

### Running the System

**Option 1: Using Docker Compose (Recommended)**
```bash
docker-compose -f docker_compose_ai_mesh.yaml up
```

**Option 2: Manual Startup**
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start orchestrator
cd cli && node runner.js

# Terminal 3: Start an agent
cd agents/claude && node index.js

# Terminal 4: Enqueue tasks
cd cli && node enqueue.js

# Terminal 5: Start dashboard
cd dashboard && npm run dev
```

## Common Development Tasks

### Adding a New Agent
1. Create directory: `mkdir agents/{agent_name}`
2. Copy template: `cp agents/claude/index.js agents/{agent_name}/index.js`
3. Update model and role in the agent file
4. Add to `docker_compose_ai_mesh.yaml`
5. Update `tokenpool.json` with API keys
6. Add role mapping in orchestrator

### Debugging Task Failures
1. Check Redis queue: `redis-cli LRANGE queue:{model} 0 -1`
2. View processing queue: `redis-cli LRANGE processing:{model} 0 -1`
3. Check failure queue: `redis-cli LRANGE queue:failures 0 -1`
4. View agent logs: `docker logs ai_{agent_name}`
5. Monitor Redis pub/sub: `redis-cli PSUBSCRIBE agent:*`
6. Verify API key validity in tokenpool

### Performance Optimization
- Use model fallbacks for cost optimization
- Implement caching for repeated tasks
- Monitor token usage per agent/model
- Adjust concurrency based on API limits
- Use DeepSeek for high-volume, low-complexity tasks

## Security Checklist
- [ ] No hardcoded API keys or secrets
- [ ] Input validation on all external data
- [ ] Sandboxed execution for generated code
- [ ] Rate limiting per API key
- [ ] Audit logs for all agent actions
- [ ] Memory isolation between agents
- [ ] Secure Redis with AUTH
- [ ] HTTPS for dashboard access

### API Security
**OpenRouter Integration:**
- All agents use OpenRouter API endpoints
- Supports multiple models through single endpoint
- API keys stored in environment variables only
- Token rotation prevents rate limit issues

**Secure Key Management:**
- Use `API_KEY_POOL` for comma-separated keys
- Keys rotate automatically in `tokenPool`
- Never log or output API keys
- Store keys in `.env.tokenpool` (gitignored)

**Output Sanitization:**
- Agent outputs written to isolated directories
- No direct execution of generated code
- Review outputs before integration
- Sandbox testing environment recommended

### Redis Security
```bash
# Enable Redis AUTH
redis-cli CONFIG SET requirepass "your-secure-password"

# Update connection strings
REDIS_URL=redis://:your-secure-password@localhost:6379
```

### Dashboard Security
- Implement authentication before production
- Use HTTPS in production (see cloudflare_tunnel_setup.yaml)
- Restrict dashboard access to internal network
- Add rate limiting to API endpoints

Remember: Context, Model, Prompt are the eternal fundamentals. This system maximizes all three through structured thinking, autonomous execution, and continuous feedback. 