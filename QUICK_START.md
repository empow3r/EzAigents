# 🚀 Ez Aigent System - Quick Start Guide

## Prerequisites
- Node.js 20+ installed
- Redis server running
- API keys for AI services

## 1. Start Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

## 2. Configure API Keys
Edit the `.env` file with your API keys:
```bash
REDIS_URL=redis://localhost:6379
CLAUDE_API_KEY=sk-or-cl-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
DEEPSEEK_API_KEY=sk-your-key-here
```

## 3. Start System
```bash
# Install dependencies
npm install

# Start orchestrator
npm start
```

## 4. Access Dashboard
Open http://localhost:3000 in your browser

## 5. Test AI Features
```bash
# Run analytics
npm run analytics

# Test AI orchestrator
node cli/enhancement-ai-orchestrator.js init

# Test neural optimizer
node cli/enhancement-neural-optimizer.js init
```

## 🎯 Key Features Ready
- ✅ AI-powered task routing
- ✅ Neural network optimization
- ✅ Security scanning
- ✅ Performance analysis
- ✅ Enterprise management
- ✅ Auto-scaling capabilities

## 📊 Monitoring
- View real-time metrics in dashboard
- Check queue status via Redis CLI
- Monitor system logs in logs/ directory

## 🔧 Management
```bash
# Monitor system
npm run monitor

# Stop system
npm run stop

# View analytics
npm run analytics
```

**System is ready for AI-powered development orchestration!** 🧠✨
