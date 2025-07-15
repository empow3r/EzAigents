# 🌐 Ez Aigent WebScraper Usage Guide

## 🚀 Quick Start

### 1. **Check for Port Conflicts**
```bash
# Check if ports are available
./scripts/port-check.sh check

# If conflicts exist, stop conflicting services
./scripts/port-check.sh free
```

### 2. **Start Ez Aigent (Safe Method)**
```bash
# This script checks ports and starts services safely
./start-ez-aigent.sh

# OR manually start with port checking
./scripts/port-check.sh start
```

### 3. **Access the Web Interface**
Open your browser: **http://localhost:3000**

## 🔧 Port Management Commands

```bash
# Check service status and ports
./scripts/port-check.sh status

# Check if ports are free
./scripts/port-check.sh check

# Free Ez Aigent ports (kills conflicting processes)
./scripts/port-check.sh free

# Stop all Ez Aigent services
./scripts/port-check.sh stop

# Start services with port checks
./scripts/port-check.sh start

# Restart services
./scripts/port-check.sh restart
```

## 🎯 Web Interface Usage

### **Dashboard Access**
1. Start services: `./start-ez-aigent.sh`
2. Open: http://localhost:3000
3. Navigate to WebScraper section

### **Scraping Features**
- **Simple Scraping**: Any website with custom rules
- **LinkedIn Scraping**: Profiles, jobs, company pages, feed
- **Gmail Scraping**: Email extraction and management
- **Authentication**: Persistent login sessions
- **AI Analysis**: Send results to Claude for insights
- **Screenshots**: Visual page capture

## 📋 Usage Examples

### **Example 1: Basic Website Scraping**
1. Go to "New Scrape" tab
2. Enter URL: `https://news.ycombinator.com`
3. Extraction rules:
```json
{
  "headlines": {
    "selector": ".titleline a",
    "multiple": true
  },
  "points": {
    "selector": ".score",
    "multiple": true
  }
}
```
4. Enable "Capture Screenshot"
5. Click "Start Scraping"

### **Example 2: LinkedIn Profile Scraping**
1. Select "LinkedIn" scraper type
2. Enable "Requires Authentication"
3. Enter LinkedIn credentials
4. URL: `https://linkedin.com/in/username`
5. Enable "Analyze with Claude"
6. Analysis prompt: "Extract key skills and summarize experience"

### **Example 3: Gmail Email Analysis**
1. Select "Gmail" scraper type
2. Enable authentication with Gmail credentials
3. Extraction rules:
```json
{
  "extractEmails": true,
  "emailCount": 20,
  "extractLabels": true
}
```
4. Enable Claude analysis: "Summarize important emails and flag urgent items"

## 🔍 Troubleshooting

### **Port Conflicts**
```bash
# Error: "Unable to connect, verify there are no other services using that port"

# Solution 1: Check what's using the ports
./scripts/port-check.sh status

# Solution 2: Free the ports
./scripts/port-check.sh free

# Solution 3: Start safely
./scripts/port-check.sh start
```

### **Docker Issues**
```bash
# Check Docker status
docker info

# Start Docker if needed
# macOS: Open Docker Desktop
# Linux: sudo systemctl start docker

# Check containers
docker ps
```

### **Service Status**
```bash
# Check all services
./scripts/port-check.sh status

# View logs
docker-compose logs -f webscraper-agent
docker-compose logs -f dashboard
```

## 📱 Mobile Access

The web interface is mobile-responsive:
- **URL**: http://localhost:3000 (from your network)
- **Features**: Touch-optimized scraping controls
- **Monitoring**: Real-time task status updates

## 🔒 Security Features

- **Encrypted Sessions**: All login data encrypted locally
- **No Credential Exposure**: Credentials never leave your system
- **Session Expiration**: Automatic cleanup after 7 days
- **Sandboxed Execution**: Docker container isolation

## 📊 Monitoring & Analytics

### **Real-time Dashboard**
- Queue depth monitoring
- Agent status tracking
- Task completion rates
- Error tracking

### **Session Management**
- View saved authentication sessions
- Monitor session age and expiration
- Delete expired or unwanted sessions

## 🔗 API Usage (Advanced)

### **Direct API Calls**
```bash
# Start scraping task
curl -X POST http://localhost:3000/api/webscraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "scraperType": "generic",
    "extractionRules": {
      "title": "h1",
      "content": ".main-content"
    },
    "captureScreenshot": true
  }'

# Check task status
curl "http://localhost:3000/api/webscraper/task-status?taskId=TASK_ID"

# View queue stats
curl "http://localhost:3000/api/webscraper/queue-stats"
```

## 🆘 Common Issues

1. **Port 3000 in use**: Run `./scripts/port-check.sh free`
2. **Redis connection failed**: Check `docker ps` for Redis container
3. **WebScraper agent offline**: Check `docker logs ezaigents-webscraper`
4. **Session expired**: Re-authenticate in the Sessions tab
5. **JavaScript timeout**: Increase wait time in extraction rules

## 🎉 Success Indicators

✅ **Working correctly when you see:**
- Dashboard accessible at http://localhost:3000
- WebScraper agent shows "active" status
- Tasks complete with "completed" status
- Screenshots saved in `.agent-memory/webscraper/screenshots/`
- Sessions saved in `.agent-memory/webscraper/sessions/`

---

**Need help?** Check the logs:
```bash
docker-compose logs -f webscraper-agent
./scripts/port-check.sh status
```