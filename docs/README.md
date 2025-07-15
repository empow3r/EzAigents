# Ez Aigent Documentation Library

## Overview
This documentation library provides comprehensive references for all frameworks, APIs, and technologies used in the Ez Aigent multi-agent orchestration system. These docs are specifically organized for AI coding agents to quickly reference during development tasks.

## Directory Structure

```
docs/
├── README.md                           # This file
├── apis/                              # AI Model APIs
│   ├── claude-api-reference.md        # Anthropic Claude API
│   ├── openai-api-reference.md        # OpenAI GPT APIs
│   ├── deepseek-api-reference.md      # DeepSeek Coder API
│   ├── mistral-api-reference.md       # Mistral AI API
│   └── gemini-api-reference.md        # Google Gemini API
├── infrastructure/                    # Core Infrastructure
│   └── redis-reference.md             # Redis pub/sub and queues
├── frontend/                          # Frontend Technologies
│   └── nextjs-reference.md            # Next.js dashboard framework
├── containerization/                  # Containerization
│   └── docker-reference.md           # Docker and docker-compose
└── runtime/                           # Runtime Environment
    └── nodejs-reference.md            # Node.js runtime and modules
```

## Quick Reference Guide

### AI Model APIs

| Model | Specialization | Context Window | Queue Name | Reference |
|-------|---------------|----------------|------------|-----------|
| Claude | Architecture & Refactoring | 200k tokens | `queue:claude-3-opus` | [claude-api-reference.md](apis/claude-api-reference.md) |
| GPT-4o | Backend Logic & APIs | 128k tokens | `queue:gpt-4o` | [openai-api-reference.md](apis/openai-api-reference.md) |
| DeepSeek | Testing & Validation | 32k tokens | `queue:deepseek-coder` | [deepseek-api-reference.md](apis/deepseek-api-reference.md) |
| Mistral | Documentation | 32k tokens | `queue:command-r-plus` | [mistral-api-reference.md](apis/mistral-api-reference.md) |
| Gemini | Code Analysis | 1M+ tokens | `queue:gemini-pro` | [gemini-api-reference.md](apis/gemini-api-reference.md) |

### Core Technologies

| Technology | Purpose | Port | Reference |
|------------|---------|------|-----------|
| Redis | Message Broker & Queues | 6379 | [redis-reference.md](infrastructure/redis-reference.md) |
| Next.js | Dashboard Frontend | 3000 | [nextjs-reference.md](frontend/nextjs-reference.md) |
| Docker | Containerization | Various | [docker-reference.md](containerization/docker-reference.md) |
| Node.js | Runtime Environment | N/A | [nodejs-reference.md](runtime/nodejs-reference.md) |

## Common Integration Patterns

### Agent API Integration
```javascript
// Example: Claude API integration
import anthropic from '@anthropic-ai/sdk';

const client = new anthropic.Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const response = await client.messages.create({
  model: "claude-opus-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Refactor this code..." }]
});
```

### Redis Queue Management
```javascript
// Example: Queue processing
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Enqueue task
await redis.lpush('queue:claude-3-opus', JSON.stringify(task));

// Process task
const task = await redis.brpop('queue:claude-3-opus', 0);
```

### Docker Agent Container
```dockerfile
# Example: Agent Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER node
CMD ["node", "index.js"]
```

## Agent Memory Management

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

## Environment Variables

### Required API Keys
```bash
CLAUDE_API_KEY=sk-or-cl-max-xxxxx
OPENAI_API_KEY=sk-xxxxx
DEEPSEEK_API_KEYS=key1,key2,key3
MISTRAL_API_KEY=sk-mistralxxxxx
GEMINI_API_KEY=sk-geminixxx
```

### Infrastructure
```bash
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

## Best Practices for AI Agents

### 1. Token Efficiency
- Use appropriate model for task complexity
- Clear context after completing tasks
- Leverage model specializations

### 2. Error Handling
- Implement exponential backoff for API retries
- Use circuit breakers for failing services
- Log errors to agent memory for learning

### 3. Queue Management
- Process tasks from model-specific queues
- Use file locks to prevent conflicts
- Update status via Redis pub/sub

### 4. Memory Management
- Save learnings to persistent memory
- Clear working context regularly
- Archive completed tasks

## Quick Start Commands

### Development
```bash
# Start Redis
docker run -d -p 6379:6379 redis:alpine

# Start all services
docker-compose up -d

# Monitor queues
redis-cli LLEN queue:claude-3-opus
```

### Agent Operations
```bash
# Start individual agent
node agents/claude/index.js

# Start wrapped agent (with coordination)
node agents/claude/wrapped-index.js

# Monitor agent status
redis-cli PSUBSCRIBE agent:*
```

### Dashboard
```bash
# Start dashboard
cd dashboard && npm run dev

# Build for production
cd dashboard && npm run build
```

## Troubleshooting Quick Reference

### Redis Issues
```bash
# Check Redis connection
docker ps | grep redis
redis-cli ping

# View queue contents
redis-cli LRANGE queue:claude-3-opus 0 -1
redis-cli LRANGE queue:failures 0 -1
```

### API Issues
```bash
# Test API connectivity
curl -H "Authorization: Bearer $CLAUDE_API_KEY" https://api.anthropic.com/v1/messages

# Check rate limits
curl -I https://api.openai.com/v1/models
```

### Docker Issues
```bash
# Check container logs
docker logs ai_claude
docker logs ai_dashboard

# Check container status
docker ps
docker stats
```

## Documentation Maintenance

### Adding New APIs
1. Create new reference file in `docs/apis/`
2. Include authentication, endpoints, examples
3. Add integration patterns for Ez Aigent
4. Update this README with quick reference

### Updating References
1. Keep API documentation current with provider changes
2. Update examples when new features are available
3. Maintain compatibility with existing agent code
4. Test all code examples before committing

## Support Resources

- **Ez Aigent Issues**: Check project issues for known problems
- **API Documentation**: Always refer to official provider docs for latest updates
- **Community**: Join discussions about multi-agent architectures
- **Examples**: See working examples in the project codebase

---

*This documentation is maintained for AI coding agents. Each reference includes practical examples and integration patterns specific to the Ez Aigent system.*