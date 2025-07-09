# Ez Aigent Dockge Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Docker installed
- Dockge instance running
- API keys ready

### Step 1: Build Docker Images
```bash
./deploy-dockge.sh
```

### Step 2: Deploy to Dockge
1. Copy `dockge-dashboard-stack.yml` to your Dockge server
2. Copy `.env.dockge` to your Dockge server
3. Open Dockge web interface (http://your-server:5001)
4. Create new stack named `ez-aigent`
5. Paste the contents of `dockge-dashboard-stack.yml`
6. Set environment variables from `.env.dockge`
7. Click "Deploy"

### Step 3: Access Dashboard
- Dashboard: http://your-server:3000
- Features: All enhanced features enabled

## 🔧 Configuration

### Required Environment Variables
```bash
CLAUDE_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEYS=key1,key2,key3
GEMINI_API_KEY=your-gemini-api-key
MISTRAL_API_KEY=your-mistral-api-key
```

### Optional Configuration
```bash
DASHBOARD_PORT=3000
MAX_AGENTS=10
SCALE_UP_THRESHOLD=20
SCALE_DOWN_THRESHOLD=5
ENABLE_MONITORING=true
ENABLE_CHAT=true
ENABLE_3D_WORKSPACE=true
```

## 🐳 Docker Services

### ez-aigent-dashboard
- **Image**: ezaigent/dashboard:latest
- **Port**: 3000
- **Features**: Full enhanced dashboard with animations
- **Health Check**: HTTP check on port 3000

### ez-aigent-redis
- **Image**: redis:7-alpine
- **Port**: 6379
- **Purpose**: Queue and cache storage
- **Health Check**: Redis ping

### ez-aigent-claude
- **Image**: ezaigent/claude-agent:latest
- **Purpose**: Architecture and refactoring
- **Model**: claude-3-opus

### ez-aigent-gpt
- **Image**: ezaigent/gpt-agent:latest
- **Purpose**: Backend logic and APIs
- **Model**: gpt-4o

### ez-aigent-deepseek
- **Image**: ezaigent/deepseek-agent:latest
- **Purpose**: Testing and validation
- **Model**: deepseek-coder

### ez-aigent-orchestrator
- **Image**: ezaigent/orchestrator:latest
- **Purpose**: Task distribution and scaling
- **Metrics**: Port 9090

## 📊 Monitoring

### Health Checks
- All services have health checks
- Dashboard includes monitoring interface
- Metrics available on orchestrator:9090

### Logs
```bash
docker logs ez-aigent-dashboard
docker logs ez-aigent-redis
docker logs ez-aigent-claude
```

## 🔧 Troubleshooting

### Common Issues

1. **Dashboard won't start**
   - Check Redis connection
   - Verify environment variables
   - Check port 3000 availability

2. **Agents not processing**
   - Verify API keys are correct
   - Check Redis connectivity
   - Review agent logs

3. **Build failures**
   - Ensure Docker is running
   - Check Dockerfile paths
   - Verify dependencies

### Debug Commands
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f ez-aigent-dashboard

# Test Redis
docker exec ez-aigent-redis redis-cli ping

# Check network
docker network inspect ez-aigent-network
```

## 🔄 Updates

### Update Dashboard
```bash
./deploy-dockge.sh
docker-compose pull ez-aigent-dashboard
docker-compose up -d ez-aigent-dashboard
```

### Update All Services
```bash
docker-compose pull
docker-compose up -d
```

## 🛡️ Security

- All services run as non-root users
- API keys stored in environment variables
- Network isolation via Docker networks
- Health checks ensure service availability

## 📈 Performance

- **Dashboard**: Optimized Next.js build
- **Redis**: Persistent data volume
- **Agents**: Memory-efficient processing
- **Orchestrator**: Auto-scaling enabled

## 🎯 Features Enabled

- ✅ Command Center
- ✅ Project Status
- ✅ Enhanced Agent Dashboard
- ✅ Agent Chat
- ✅ 3D Workspace
- ✅ Code Diffs
- ✅ Gamification
- ✅ Prompt Manager
- ✅ Dark/Light Mode
- ✅ Fancy Animations
- ✅ Responsive Design