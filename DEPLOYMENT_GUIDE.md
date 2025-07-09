# 🚀 Ez Aigent Dockge Deployment Guide

## Quick Deployment (TL;DR)

```bash
# 1. Copy environment template
cp .env.production .env

# 2. Edit .env with your API keys
nano .env

# 3. Deploy to Dockge
./scripts/deploy-dockge.sh

# 4. Access dashboard
open http://localhost:3000
```

---

## 📋 Pre-Deployment Checklist

### ✅ Server Requirements
- [ ] **Docker Engine 20.10+** installed and running
- [ ] **Docker Compose 2.0+** installed  
- [ ] **Minimum 4GB RAM** (8GB recommended)
- [ ] **Minimum 2 CPU cores** (4 cores recommended)
- [ ] **20GB free disk space** (for images, logs, data)
- [ ] **Dockge** installed and accessible
- [ ] **Ports available:** 3000 (dashboard), 6379 (Redis)

### ✅ API Keys Required
- [ ] **Claude API Key** (OpenRouter recommended: `sk-or-cl-...`)
- [ ] **OpenAI API Key** (`sk-...`)
- [ ] **DeepSeek API Keys** (comma-separated for rotation)
- [ ] **Mistral API Key** 
- [ ] **Gemini API Key**

### ✅ Network Configuration
- [ ] **Firewall rules** allow Docker internal communication
- [ ] **Port 3000** accessible for dashboard
- [ ] **Internet access** for AI API calls
- [ ] **DNS resolution** working for container communication

---

## 🔧 Detailed Deployment Steps

### Step 1: Environment Setup

```bash
# Clone or ensure you're in the project directory
cd /path/to/EzAigents

# Copy production environment template
cp .env.production .env

# Edit environment file with your API keys
nano .env
```

**Critical Environment Variables:**
```bash
# Required API Keys
CLAUDE_API_KEY=sk-or-cl-your-actual-key-here
OPENAI_API_KEY=sk-your-actual-key-here
DEEPSEEK_API_KEYS=key1,key2,key3
MISTRAL_API_KEY=sk-your-actual-key-here
GEMINI_API_KEY=AIza-your-actual-key-here

# System Configuration  
NODE_ENV=production
REDIS_URL=redis://redis:6379

# Scaling Configuration
MIN_AGENTS=1
MAX_AGENTS=10
SCALE_UP_THRESHOLD=20
SCALE_DOWN_THRESHOLD=5
```

### Step 2: Pre-deployment Validation

```bash
# Check Docker installation
docker --version
docker-compose --version

# Verify Docker daemon is running
docker info

# Test Docker permissions
docker run hello-world

# Validate environment file
grep -E "(API_KEY|REDIS_URL)" .env
```

### Step 3: Automated Deployment

```bash
# Run the automated deployment script
./scripts/deploy-dockge.sh
```

The script will:
1. ✅ Check prerequisites (Docker, Compose, permissions)
2. 🔍 Validate environment configuration
3. 📁 Create necessary directories with proper permissions
4. 💾 Backup existing deployment (if any)
5. 🏗️ Build all Docker images
6. 🛑 Stop existing services gracefully
7. 🚀 Start services in dependency order
8. 🏥 Run comprehensive health checks
9. 📊 Display service status and access information

### Step 4: Verification

```bash
# Check all services are running
docker-compose -f docker-compose.production.yml ps

# Verify dashboard accessibility
curl http://localhost:3000/api/health

# Check Redis connectivity
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# View service logs
docker-compose -f docker-compose.production.yml logs -f dashboard
```

---

## 🎛️ Dockge Integration

### Adding to Dockge

1. **Access Dockge Web Interface**
   - Navigate to your Dockge installation (typically `http://server:5001`)
   - Login with your Dockge credentials

2. **Import Ez Aigent Stack**
   - Click "Add Stack" or "Import Stack"
   - **Stack Name:** `ez-aigent`
   - **Compose File:** Upload `docker-compose.production.yml`
   - **Environment File:** Upload your configured `.env` file

3. **Configure Stack Settings**
   - **Auto-restart:** Enable
   - **Update Policy:** Manual (recommended for production)
   - **Network:** Use default or create dedicated network
   - **Resource Limits:** Set according to your server capacity

4. **Deploy Stack**
   - Click "Deploy" to start all services
   - Monitor deployment progress in Dockge interface
   - Verify all services show "Healthy" status

### Dockge Management Features

**Service Control:**
- 🟢 **Start/Stop** individual services
- 🔄 **Restart** services without affecting others  
- 📊 **Scale** agents based on load
- 📝 **View Logs** in real-time
- 📈 **Monitor Resources** (CPU, Memory, Network)

**Stack Operations:**
- 🔄 **Update** images and restart services
- 💾 **Backup** volumes and configurations
- 📋 **Clone** stack for testing environments
- 🗑️ **Remove** stack completely if needed

---

## 📊 Service Architecture

### Core Services
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │     Runner      │    │   Dashboard     │
│  (Queue/Cache)  │◄──►│ (Orchestrator)  │◄──►│  (Web UI)       │
│   Port: 6379    │    │                 │    │   Port: 3000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### AI Agent Pool
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Claude    │  │     GPT     │  │  DeepSeek   │  │   Mistral   │  │   Gemini    │
│(Architecture)│  │ (Backend)   │  │  (Testing)  │  │   (Docs)    │  │ (Analysis)  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Support Services
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Auto-Scaler │  │   Monitor   │  │ Efficiency  │  │   Security  │
│ (Scaling)   │  │ (Health)    │  │ (Tracking)  │  │ (Scanning)  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🔧 Configuration Options

### Auto-Scaling Configuration

```bash
# Environment variables for auto-scaling
MIN_AGENTS=1              # Minimum agents per type
MAX_AGENTS=10             # Maximum agents per type
SCALE_UP_THRESHOLD=20     # Queue depth to trigger scale up
SCALE_DOWN_THRESHOLD=5    # Queue depth to trigger scale down
COOLDOWN_PERIOD=300       # Seconds between scaling actions
```

### Resource Limits

```yaml
# Per-service resource limits in docker-compose.production.yml
deploy:
  resources:
    limits:
      memory: 1G          # Adjust based on your server
      cpus: '0.5'         # Adjust based on your server
    reservations:
      memory: 256M
      cpus: '0.1'
```

### Security Configuration

```bash
# Security settings
SECURITY_SCAN_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100

# Redis security (uncomment in redis.conf for production)
# requirepass your-secure-password
```

---

## 📊 Monitoring & Health Checks

### Built-in Health Checks

All services include comprehensive health checks:

```bash
# Check overall system health
./scripts/health-check.sh

# Individual service health
docker-compose -f docker-compose.production.yml ps
```

### Monitoring Commands

```bash
# Real-time system monitoring
npm run monitor

# Efficiency tracking
npm run efficiency:summary
npm run efficiency:report

# Security validation
npm run security:check

# Queue status
docker-compose -f docker-compose.production.yml exec redis redis-cli llen queue:claude-3-opus
```

### Log Management

```bash
# View all logs
docker-compose -f docker-compose.production.yml logs -f

# Service-specific logs
docker-compose -f docker-compose.production.yml logs -f dashboard
docker-compose -f docker-compose.production.yml logs -f claude

# Tail last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 -f runner
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Services Won't Start**
```bash
# Check Docker daemon
systemctl status docker

# Check available resources
df -h
free -h

# Check port conflicts
netstat -tlnp | grep :3000
netstat -tlnp | grep :6379
```

**2. API Key Issues**
```bash
# Verify environment variables are loaded
docker-compose -f docker-compose.production.yml exec claude env | grep API_KEY

# Test API connectivity
docker-compose -f docker-compose.production.yml exec claude curl -s https://api.openai.com/v1/models
```

**3. Redis Connection Issues**
```bash
# Check Redis logs
docker-compose -f docker-compose.production.yml logs redis

# Test Redis connectivity
docker-compose -f docker-compose.production.yml exec redis redis-cli ping

# Check Redis configuration
docker-compose -f docker-compose.production.yml exec redis redis-cli config get "*"
```

**4. Dashboard Not Accessible**
```bash
# Check dashboard logs
docker-compose -f docker-compose.production.yml logs dashboard

# Verify port binding
docker port ezaigent_dashboard

# Test internal connectivity
docker-compose -f docker-compose.production.yml exec dashboard curl localhost:3000
```

### Performance Optimization

**High Load Issues:**
```bash
# Scale up agents
docker-compose -f docker-compose.production.yml up -d --scale claude=3 --scale gpt=3

# Monitor resource usage
docker stats

# Check queue depths
docker-compose -f docker-compose.production.yml exec redis redis-cli llen queue:claude-3-opus
```

**Memory Issues:**
```bash
# Check memory usage
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Restart memory-heavy services
docker-compose -f docker-compose.production.yml restart claude gpt
```

---

## 🔄 Maintenance Operations

### Regular Maintenance

```bash
# Weekly: Update images and restart
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Daily: Check logs for errors
docker-compose -f docker-compose.production.yml logs | grep -i error

# Daily: Monitor disk usage
df -h
docker system df
```

### Backup Operations

```bash
# Backup Redis data
docker run --rm -v ezaigent_redis_data:/data -v $PWD/backups:/backup alpine tar czf /backup/redis_$(date +%Y%m%d).tar.gz -C /data .

# Backup efficiency data
docker run --rm -v ezaigent_efficiency_data:/data -v $PWD/backups:/backup alpine tar czf /backup/efficiency_$(date +%Y%m%d).tar.gz -C /data .

# Backup logs
tar czf backups/logs_$(date +%Y%m%d).tar.gz logs/
```

### Update Procedure

```bash
# 1. Backup current deployment
./scripts/deploy-dockge.sh

# 2. Pull latest changes
git pull origin main

# 3. Rebuild and restart
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# 4. Verify health
./scripts/health-check.sh
```

---

## 📞 Support & Resources

### Quick Reference

- **Dashboard:** http://localhost:3000
- **Redis:** localhost:6379
- **Configuration:** `.env` file
- **Logs:** `./logs/` directory
- **Backups:** `./backups/` directory

### Important Files

- `docker-compose.production.yml` - Main deployment configuration
- `.env` - Environment variables and API keys
- `config/redis.conf` - Redis configuration
- `scripts/deploy-dockge.sh` - Automated deployment
- `CLAUDE.md` - Complete system documentation

### Getting Help

1. **Check logs** for specific error messages
2. **Review health checks** for service status
3. **Consult CLAUDE.md** for detailed system information
4. **Run diagnostics** with `npm run monitor`
5. **Check AGENT_KNOWLEDGE_BASE.md** for troubleshooting patterns

---

**🎉 You're ready to deploy Ez Aigent on your development server with Dockge!**

The system will automatically scale based on load, monitor efficiency, and provide comprehensive logging and health checks. The Dockge interface gives you full control over the deployment while maintaining production-ready reliability.