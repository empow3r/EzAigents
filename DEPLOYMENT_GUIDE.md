# EzAigents Docker Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Docker & Docker Compose installed
- Valid API keys for Claude, OpenAI, Gemini
- Minimum 4GB RAM, 10GB disk space

### Quick Start Commands

#### Start Core System
```bash
# Start Redis + Core Agents
docker-compose --profile production up -d redis claude-agent gpt-agent gemini-agent

# Start Dashboard
docker-compose --profile production up -d dashboard

# Check system health
./scripts/agent-health-monitor.sh
```

### Environment Configuration
Key variables in `.env`:
```bash
NODE_ENV=production
REDIS_PASSWORD=ezaigent123
CLAUDE_API_KEY=sk-ant-api03-xxxxx
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=xxxxx
```

### Production Services
- **Redis**: Message queue with auth (port 6379)
- **Dashboard**: Web UI (port 3000)
- **Claude Agent**: Architecture & analysis
- **GPT Agent**: Backend development
- **Gemini Agent**: Code analysis

### Health Monitoring
```bash
# System status check
./scripts/agent-health-monitor.sh

# View logs
docker-compose logs -f claude-agent
docker logs ezaigents-redis
```

### Troubleshooting
```bash
# Check all containers
docker ps --filter "name=ezaigents-"

# Test Redis
redis-cli ping

# Test dashboard
curl http://localhost:3000/api/health
```

Ready for production deployment! 🚀