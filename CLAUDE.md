# CLAUDE.md

This file provides guidance to Claude Code when working with the Ez Aigent codebase.

## Project Overview
**Ez Aigent** - An AI Multi-Agent SaaS Builder Orchestrator platform that coordinates 10-100+ cloud-based AI coding agents to build and scale SaaS products within 24 hours.

## High-Level Architecture

1. **Orchestrator** (`cli/runner.js`) - Central task distributor
2. **AI Agent Pool** - Five specialized agent types (Claude, GPT, DeepSeek, Mistral, Gemini)
3. **Redis Queue** - Central pub/sub message broker (port 6379)
4. **Dashboard** - Next.js web interface at http://localhost:3000
5. **Auto-Scaler** - Dynamic scaling based on queue depth

**Key Patterns:**
- Queue-Based Distribution: Model-specific Redis queues
- Token Pool Rotation: Automatic API key rotation
- File Lock Management: Prevents concurrent file conflicts
- Memory Optimization: Auto context clearing after tasks
- Failure Recovery: Exponential backoff retry mechanism

## Project Structure
```
Ez Aigent/
├── cli/               # Orchestrator and runner services
├── agents/            # Individual agent containers
├── dashboard/         # Web UI and monitoring
├── shared/            # Shared configuration
├── src/               # Shared source code and outputs
├── scripts/           # Utility scripts
└── .agent-memory/     # Agent persistent memory
```

## Core Files
- `cli/runner.js` - Main orchestrator
- `cli/enqueue.js` - Task enqueueing
- `cli/coordination-service.js` - Agent coordination
- `cli/file-lock-manager.js` - File lock management
- `shared/filemap.json` - Task-to-agent mapping
- `shared/tokenpool.json` - API key rotation pool
- `.env.example` - Environment template

## Agent Specializations
- **Claude**: Architecture, refactoring (200k tokens)
- **GPT-4o**: Backend logic, APIs (128k tokens)
- **DeepSeek**: Testing, validation (32k tokens)
- **Mistral**: Documentation (32k tokens)
- **Gemini**: Code analysis (32k tokens)

## Quick Start
```bash
# 1. Setup
git clone https://github.com/your-username/ez-aigent.git
cd ez-aigent
npm install
cp .env.example .env  # Add your API keys

# 2. Start Redis
docker run -d -p 6379:6379 redis:alpine

# 3. Start system
docker-compose up

# 4. Access dashboard
open http://localhost:3000
```

## Essential Commands

### Development
```bash
# System control
npm run start          # Start orchestrator
npm run stop           # Stop all services
npm run monitor        # Monitor system
npm run analytics      # Generate report

# Docker operations
docker-compose up -d   # Start all services
docker-compose down    # Stop all services
docker-compose logs -f # View logs

# Agent management
npm run autoscaler     # Start auto-scaler
npm run agent:claude   # Start individual agent

# Enhanced agent spawning (with coordination)
node agents/claude/wrapped-index.js     # Start wrapped Claude agent
node agents/gpt/wrapped-index.js        # Start wrapped GPT agent
node agents/deepseek/wrapped-index.js   # Start wrapped DeepSeek agent
node agents/mistral/wrapped-index.js    # Start wrapped Mistral agent
node agents/gemini/wrapped-index.js     # Start wrapped Gemini agent

# Original agent spawning (fallback)
node examples/enhanced-claude-agent.js  # Start enhanced Claude agent
AGENT_ID=claude_001 node examples/enhanced-claude-agent.js  # Custom agent ID

# Task operations
cd cli && node enqueue.js  # Enqueue tasks
```

### Redis Monitoring
```bash
# Queue inspection
redis-cli LLEN queue:claude-3-opus          # Queue size
redis-cli LRANGE queue:failures 0 -1        # Failed tasks
redis-cli PSUBSCRIBE agent:*                # Watch activity
redis-cli KEYS "file_lock:*"                # Check locks

# Queue recovery
redis-cli RPOPLPUSH processing:claude-3-opus queue:claude-3-opus
```

### Testing & Deployment
```bash
# Testing
./test-full-system.sh
node test-collaboration.js

# Production deployment
./scripts/deploy-production.sh
docker-compose -f docker-compose.production.yml up -d
```

## Environment Variables
```bash
# Core
REDIS_URL=redis://localhost:6379

# API Keys
CLAUDE_API_KEY=sk-or-cl-max-xxxxx
OPENAI_API_KEY=sk-xxxxx
DEEPSEEK_API_KEYS=key1,key2,key3  # Comma-separated
MISTRAL_API_KEY=sk-mistralxxxxx
GEMINI_API_KEY=sk-geminixxx

# Auto-scaling (optional)
MIN_AGENTS=1
MAX_AGENTS=10
SCALE_UP_THRESHOLD=20
SCALE_DOWN_THRESHOLD=5
```

## Queue Architecture
- `queue:{model}` - Pending tasks
- `processing:{model}` - Tasks in progress
- `queue:failures` - Failed tasks
- `agent:status` - Real-time updates
- `agent:errors` - Error logging

**Model-to-Queue Mapping:**
- Claude → `queue:claude-3-opus`
- GPT → `queue:gpt-4o`
- DeepSeek → `queue:deepseek-coder`
- Mistral → `queue:command-r-plus`
- Gemini → `queue:gemini-pro`

## Task Processing Flow
1. Load task from `filemap.json`
2. Context priming for agent role
3. Enqueue to model-specific queue
4. Agent claims file lock (30-min TTL)
5. Process with status updates
6. Save to memory and clear context
7. Release file lock

## Agent Memory System
All agents implement automatic context clearing for token efficiency:

```
.agent-memory/
├── claude/
│   ├── current-session.md
│   ├── completed-tasks.md
│   ├── errors.md
│   └── learnings.md
└── [other agents...]
```

## Common Development Tasks

### Adding a New Agent
1. Create `agents/{name}/` directory
2. Copy agent template from `agents/claude/index.js`
3. Update model, role, and capabilities
4. Add to `docker-compose.yaml`
5. Update `shared/tokenpool.json`
6. Add queue mapping in `cli/runner.js`

### Debugging Issues
1. Check Redis connection: `docker ps | grep redis`
2. View agent logs: `docker logs ai_{agent_name}`
3. Monitor activity: `redis-cli PSUBSCRIBE agent:*`
4. Check failures: `redis-cli LRANGE queue:failures 0 -1`
5. Verify API keys in environment

### Performance Optimization
- Use model fallbacks for cost optimization
- Monitor token usage per agent
- Adjust concurrency based on API limits
- Use DeepSeek for high-volume, simple tasks

## Security Best Practices
- [ ] Store API keys in `.env` only (gitignored)
- [ ] Enable Redis AUTH in production
- [ ] Implement dashboard authentication
- [ ] Sandbox agent outputs
- [ ] Regular security scans

## Token-Efficient Workflow
1. Make small code changes (5-20 lines)
2. Test immediately
3. Run security check
4. Save to memory files
5. Clear context with `/clear`
6. Repeat for next task

Benefits: 90% token savings, faster processing, better testing

## Enhancement System
Available enhancement modules:
- `security-layer` - Security hardening
- `observability-stack` - Monitoring infrastructure
- `distributed-queue-system` - Advanced queuing
- `intelligent-orchestration` - Smart routing
- `collaboration-framework` - Multi-agent coordination
- `self-healing-infrastructure` - Auto recovery

```bash
# Enhancement commands
npm run enhance:dispatch security-layer
npm run enhance:monitor
npm run enhance:validate all
```

## Dashboard API Endpoints
```bash
# Agent management
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/agent-stats

# Task management
curl http://localhost:3000/api/queue-stats
curl http://localhost:3000/api/enqueue -X POST -d '{"file":"src/api.js","prompt":"Add tests"}'

# System monitoring
curl http://localhost:3000/api/health
curl http://localhost:3000/api/redis-status
```

## Troubleshooting

### Redis Connection Failed
```bash
docker ps | grep redis
# Check REDIS_URL in .env
```

### Agent Not Processing
```bash
redis-cli CLIENT LIST | grep claude
curl -H "Authorization: Bearer $CLAUDE_API_KEY" https://api.openrouter.ai/api/v1/models
docker logs --tail 50 ai_claude
```

### Tasks Failing
```bash
redis-cli LRANGE queue:failures 0 0 | jq '.'
docker exec ai_claude ls -la /app/src/api/handler.js
jq '.' shared/filemap.json
```

## Production Checklist
- [ ] API keys configured
- [ ] Redis AUTH enabled
- [ ] Dashboard secured
- [ ] Monitoring alerts set
- [ ] Backup strategy ready
- [ ] Auto-scaling configured
- [ ] Security scans passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Team trained on procedures

## Key Documentation Files
- `ENHANCEMENT_GUIDE.md` - Enhancement implementation
- `ENHANCEMENT_ROADMAP.md` - Development roadmap
- `MONITORING.md` - System monitoring guide
- `CHANGE_LOG.md` - Mandatory change log with ROI
- `QUICK_WINS.md` - Week 1 implementation guide

## Mandatory Documentation SOP
Every code change MUST be documented with:
1. Files changed with purpose
2. Business impact and ROI (3x-20x)
3. Key features added
4. Integration points
5. Usage instructions
6. Testing procedures

Remember: Context, Model, Prompt are the eternal fundamentals. This system maximizes all three through structured thinking, autonomous execution, and continuous feedback.