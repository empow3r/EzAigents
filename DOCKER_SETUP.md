# 🐳 EzAigents Docker Setup

This guide will help you run the entire EzAigents system using Docker, making the web dashboard accessible from your local machine.

## 📋 Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)
- API keys for AI services (Claude, OpenAI, etc.)

## 🚀 Quick Start

### 1. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

Required API keys:
- `CLAUDE_API_KEY`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEYS` (comma-separated if multiple)
- `MISTRAL_API_KEY`
- `GEMINI_API_KEY`

### 2. Start Everything with One Command

```bash
# Make the script executable
chmod +x docker-start.sh

# Run the startup script
./docker-start.sh
```

This will:
- ✅ Create necessary directories
- ✅ Build all Docker images
- ✅ Start Redis, Dashboard, and AI Agents
- ✅ Make the dashboard accessible at http://localhost:3000

## 🌐 Accessing the Dashboard

Once running, you can access:

- **Main Dashboard**: http://localhost:3000
- **System Health**: http://localhost:3000/claude-doctor
- **Queue Stats API**: http://localhost:3000/api/queue-stats
- **Agent Stats API**: http://localhost:3000/api/agent-stats

## 🛠️ Docker Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d dashboard

# Start in development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f dashboard
docker-compose logs -f claude-agent
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean reset)
docker-compose down -v
```

### Service Management
```bash
# Restart a service
docker-compose restart dashboard

# View running containers
docker ps

# Access container shell
docker exec -it ezaigents-dashboard sh
docker exec -it ezaigents-claude sh
```

## 📦 Architecture

The Docker setup includes:

1. **Redis** (Port 6379)
   - Message queue for agent communication
   - Task distribution and caching

2. **Dashboard** (Port 3000)
   - Next.js web interface
   - API endpoints
   - Real-time monitoring

3. **AI Agents**
   - Claude Agent (Architecture & Refactoring)
   - GPT Agent (Backend & APIs)
   - DeepSeek Agent (Testing & QA)
   - API Key Manager

4. **Volumes**
   - `redis-data`: Persistent Redis storage
   - Agent memory directories
   - Log directories

## 🔧 Development Setup

For development with hot-reload:

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up

# This runs only Redis in Docker and dashboard with hot-reload
```

Then run agents locally:
```bash
# In separate terminals
node agents/claude/wrapped-index.js
node agents/gpt/wrapped-index.js
node agents/deepseek/wrapped-index.js
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec ezaigents-redis redis-cli ping
```

### Dashboard Not Loading
```bash
# Check dashboard logs
docker-compose logs dashboard

# Rebuild dashboard image
docker-compose build --no-cache dashboard
docker-compose up -d dashboard
```

### Agent Not Processing Tasks
```bash
# Check agent logs
docker-compose logs claude-agent

# Verify API keys are set
docker exec ezaigents-claude env | grep API_KEY
```

## 🔒 Security Notes

- API keys are stored in `.env` file (gitignored)
- Containers run as non-root users
- Network isolation between services
- No ports exposed except Dashboard (3000) and Redis (6379)

## 🚀 Production Deployment

For production, use the nginx profile:

```bash
# Start with nginx reverse proxy
docker-compose --profile production up -d

# This adds:
# - Nginx on ports 80/443
# - SSL termination
# - Rate limiting
# - Security headers
```

## 📊 Monitoring

Monitor your Docker containers:

```bash
# Resource usage
docker stats

# Container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.State}}"

# Disk usage
docker system df
```

## 🧹 Cleanup

```bash
# Remove stopped containers
docker-compose rm -f

# Clean up everything (including volumes)
docker-compose down -v

# Remove unused images
docker image prune -a

# Full system cleanup
docker system prune -a --volumes
```

## 📝 Environment Variables

Key environment variables used:

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Dashboard port | `3000` |
| `AGENT_ID` | Unique agent identifier | Auto-generated |

## 🎯 Next Steps

1. Submit tasks through the dashboard
2. Monitor agent activity
3. Check system health regularly
4. Scale agents as needed

Happy orchestrating! 🎉