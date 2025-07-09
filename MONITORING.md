# Ez Aigent Monitoring Guide

## 🚀 Quick Start

### 1. Real-time Agent Monitor
```bash
# Start the monitor with default 30-second interval
node cli/monitor-agents.js

# Custom interval (e.g., 10 seconds)
node cli/monitor-agents.js 10
```

### 2. System Health Check
```bash
# Run comprehensive health check
./scripts/health-check.sh
```

### 3. Dashboard Monitoring
Visit http://localhost:3000 and navigate to:
- **Project Status** - Overall progress tracking
- **Enhancements** - System enhancement progress
- **Enhanced Dashboard** - Real-time agent activity

## 📊 Monitoring Components

### Agent Monitor (`cli/monitor-agents.js`)
Real-time monitoring of:
- Queue depths for all models
- Agent health status (active/idle/unresponsive)
- Enhancement queue progress
- Task completion tracking
- System resource usage

Output includes:
```
=== Ez Aigent Agent Monitor Report ===
📊 Queue Statistics:
  claude-3-opus: 5 pending, 2 processing, 0 failed
  gpt-4o: 8 pending, 1 processing, 0 failed
  ...

💚 Agent Health:
  🟢 claude-agent-1: active (5s ago)
  🟡 gpt-agent-2: idle (120s ago)
  ...

📊 Progress:
  Enhancement Progress:
    security-layer: [███░░░░░░░] 30%
    observability-stack: [█░░░░░░░░░] 10%
```

### Health Check Script (`scripts/health-check.sh`)
Comprehensive system check:
- Redis connectivity and queue stats
- Running agent processes
- Dashboard accessibility
- Output file generation
- Docker container status (if applicable)
- System resource usage

### Dashboard Pages

#### Project Status (`/project`)
- Overall enhancement progress
- Task completion metrics
- Timeline visualization
- Priority-based tracking

#### Enhancement Dashboard (`/enhancements`)
- Real-time component status
- Progress bars for each enhancement
- Activity logs
- Auto-refresh capability

## 📈 Metrics Tracked

### Queue Metrics
- `queue:{model}` - Pending tasks per model
- `processing:{model}` - Currently processing tasks
- `queue:{model}:failed` - Failed task tracking
- `queue:enhancement:{name}` - Enhancement-specific queues

### Agent Metrics
- `agent:heartbeat:{id}` - Last heartbeat timestamp
- `agent:log:{name}` - Activity logs
- `enhancement:progress:{name}` - Progress percentage

### System Metrics
- Total pending/processing/failed tasks
- Active agent count
- Completed file count
- Queue depth trends

## 🔧 Configuration

### Environment Variables
```bash
REDIS_URL=redis://localhost:6379
MONITOR_INTERVAL=30000  # milliseconds
LOG_LEVEL=info
```

### Monitoring Reports
Reports are saved to:
- `monitoring/latest-report.json` - Latest snapshot
- Redis list `monitoring:reports` - Historical data (last 100)

## 🚨 Alerts and Thresholds

### Agent Health
- **Active**: Heartbeat < 60 seconds
- **Idle**: Heartbeat 60-300 seconds  
- **Unresponsive**: Heartbeat > 300 seconds

### Queue Alerts
- High queue depth: > 50 tasks pending
- Stuck processing: Task in processing > 10 minutes
- High failure rate: > 10% tasks failing

## 📝 Troubleshooting

### No Agent Activity
1. Check Redis connection: `redis-cli ping`
2. Verify agents are running: `ps aux | grep agent`
3. Check agent logs: `docker logs ez-aigent-{agent}`

### High Queue Depth
1. Scale up agents: `docker-compose up --scale agent_claude=5`
2. Check for failing tasks: `redis-cli lrange queue:failures 0 -1`
3. Review agent performance in monitor

### Dashboard Not Loading
1. Check Next.js process: `lsof -i :3000`
2. Review dashboard logs: `npm run dev`
3. Verify API endpoints: `curl http://localhost:3000/api/agent-stats`

## 🔄 Continuous Monitoring

### Production Setup
```bash
# Use PM2 for process management
pm2 start cli/monitor-agents.js --name "agent-monitor"
pm2 start scripts/health-check.sh --name "health-check" --cron "*/5 * * * *"

# View logs
pm2 logs agent-monitor
```

### Grafana Integration
1. Configure Prometheus to scrape `/api/metrics`
2. Import dashboard template from `monitoring/grafana-dashboard.json`
3. Set up alerts for critical thresholds

## 📊 Performance Optimization

### Monitor Insights
- Identify bottleneck agents
- Balance queue distribution
- Optimize task routing
- Track enhancement velocity

### Scaling Decisions
Based on monitoring data:
- Queue depth > 100: Scale horizontally
- Processing time > 5min: Optimize prompts
- Failure rate > 5%: Review error patterns
- Memory > 80%: Increase resources