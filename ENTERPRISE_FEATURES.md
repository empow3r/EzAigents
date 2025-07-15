# 🚀 Enterprise Observability Features

## 🌟 Latest Enhancements

Your observability stack has been upgraded to enterprise-grade with advanced features:

### 🔔 Real-Time Alert System
- **Smart Thresholds**: Configurable error rate, event rate, and response time alerts
- **Webhook Integration**: Send alerts to Slack, Discord, PagerDuty, or custom endpoints
- **Alert Rules Engine**: Create custom alert conditions
- **Alert History**: Track and manage alert lifecycle

### 📊 Advanced Analytics
- **Performance Metrics**: Agent-level performance tracking
- **Anomaly Detection**: AI-powered pattern recognition for unusual behavior
- **Distributed Tracing**: End-to-end request tracing across multi-agent workflows
- **Real-time KPIs**: Live dashboards with key performance indicators

### 🔍 Enhanced Filtering & Querying
- **Advanced Search**: Filter by time range, severity, agent type, and custom fields
- **SQL-like Queries**: Run complex analytical queries via WebSocket
- **Real-time Subscriptions**: Subscribe to specific event types or agents

### 📱 Multi-Platform Access
- **Mobile Dashboard**: Touch-optimized interface with pull-to-refresh
- **Desktop Analytics**: Rich charts and performance tables
- **API Access**: RESTful APIs for integration with existing tools

### 🔗 Standards Compliance
- **OpenTelemetry Export**: Export traces, metrics, and logs in OTLP format
- **Prometheus Metrics**: Compatible with Prometheus monitoring
- **Industry Standards**: Following observability best practices

## 🎯 Quick Start with Enhanced Features

### 1. Start the Enterprise Server
```bash
cd server
ENABLE_ALERTS=true WEBHOOK_URL=https://hooks.slack.com/your-webhook bun run enterprise-server.ts
```

### 2. Access the Dashboards

**Desktop Analytics Dashboard:**
- http://localhost:3001/analytics-dashboard.html
- Rich charts, performance tables, anomaly detection

**Mobile Dashboard:**
- http://localhost:3001/mobile-dashboard.html
- Touch-optimized, pull-to-refresh, offline-capable

**Standard Dashboard:**
- http://localhost:3001/index-enhanced.html
- Real-time events with advanced filtering

### 3. Configure Alerts
Set environment variables for alert thresholds:
```bash
ERROR_RATE_THRESHOLD=0.1      # 10% error rate
EVENT_RATE_THRESHOLD=100      # 100 events/min
RESPONSE_TIME_THRESHOLD=5000  # 5 seconds
WEBHOOK_URL=your-webhook-url
```

## 📊 Analytics Dashboard Features

### Real-Time KPIs
- Total events processed
- Active agents count
- Error rate percentage
- Average response time
- Active sessions
- Alert count

### Performance Charts
- **Event Volume**: Hourly event trends
- **Error Rate**: Error rate over time
- **Agent Performance**: Events and errors by agent
- **Response Time Distribution**: Performance buckets

### Agent Performance Table
| Agent | Events | Errors | Error Rate | Avg Response | Sessions | Status |
|-------|--------|--------|------------|--------------|----------|--------|
| GPT-Agent | 1,234 | 12 | 0.97% | 850ms | 45 | 🟢 Healthy |
| Claude-Agent | 987 | 0 | 0.00% | 420ms | 32 | 🟢 Healthy |

### Anomaly Detection
Automatically detects:
- **Event Spikes**: Unusual increases in event volume
- **Event Drops**: Unexpected decreases in activity
- **Error Spikes**: Sudden increases in error rates

## 🔔 Alert System Configuration

### Default Alert Rules
1. **High Error Rate**: Triggers when error rate > 10%
2. **High Event Rate**: Triggers when events > 100/minute
3. **Slow Response**: Triggers when response time > 5 seconds

### Custom Alert Rules
```javascript
// Add custom alert via API
POST /alerts/rules
{
  "name": "custom_rule",
  "condition": "event_count",
  "threshold": 500,
  "window": "5m",
  "enabled": true
}
```

### Webhook Payloads
```json
{
  "alert": "high_error_rate",
  "rule": {
    "condition": "error_rate",
    "threshold": 0.1,
    "window": "5m"
  },
  "event": {
    "app": "Claude-Agent",
    "event_type": "error",
    "timestamp": "2025-01-14T20:30:00Z"
  },
  "severity": "high"
}
```

## 🔗 Distributed Tracing

### Automatic Trace Generation
Agents automatically generate trace IDs for requests:
```python
# In your agent code
observer = UniversalAgentObserver("MyAgent")
trace_id = observer.start_trace("user_request", "my-service")

# Events are automatically linked to the trace
observer.observe_llm_call("openai", "gpt-4", messages)
observer.observe_tool_use("database_query", params)

observer.finish_trace(trace_id, "completed")
```

### Trace Visualization
- **Service Map**: Visual representation of service interactions
- **Timeline View**: Chronological event sequence
- **Performance Analysis**: Identify bottlenecks and slow operations

## 📈 Advanced Querying

### SQL-like Queries via WebSocket
```javascript
// Connect to WebSocket
ws.send(JSON.stringify({
  type: "query",
  sql: "SELECT app, COUNT(*) as events FROM events WHERE timestamp > datetime('now', '-1 hour') GROUP BY app",
  queryId: "my-query-1"
}));
```

### Advanced Filtering Examples
```bash
# Get events by time range
GET /events?start_time=2025-01-14T10:00:00Z&end_time=2025-01-14T20:00:00Z

# Filter by severity
GET /events?severity=3

# Search in content
GET /events?search=database+error

# Get trace events
GET /events?trace_id=abc123def456
```

## 📊 OpenTelemetry Integration

### Export Traces
```bash
# Get traces in OTLP format
GET /otlp/traces?start_time=2025-01-14T10:00:00Z

# Export to OTLP collector
curl -X POST http://otel-collector:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d @exported_traces.json
```

### Export Metrics
```bash
# Get metrics in OTLP format
GET /otlp/metrics

# Prometheus format
GET /metrics
```

### Export Logs
```bash
# Get logs in OTLP format
GET /otlp/logs?start_time=2025-01-14T10:00:00Z
```

## 📱 Mobile Features

### Touch-Optimized Interface
- **Pull-to-Refresh**: Swipe down to reload data
- **Touch-Friendly**: Large tap targets and smooth scrolling
- **Offline Support**: Caches data when connection is lost

### Real-Time Updates
- **Live Stats**: Event count, agent status, error rates
- **Push Notifications**: Alert notifications on mobile devices
- **Background Sync**: Updates when app returns to foreground

## 🔧 Configuration Options

### Environment Variables
```bash
# Server Configuration
PORT=3001
ENABLE_AUTH=true
OBSERVABILITY_API_KEY=your-secret-key

# Alert Configuration
ENABLE_ALERTS=true
WEBHOOK_URL=https://hooks.slack.com/webhook
ERROR_RATE_THRESHOLD=0.1
EVENT_RATE_THRESHOLD=100
RESPONSE_TIME_THRESHOLD=5000

# Feature Flags
ENABLE_TRACING=true
ENABLE_ANOMALY_DETECTION=true
RETENTION_DAYS=30
MAX_EVENTS_PER_QUERY=1000
```

### Database Schema Enhancements
```sql
-- Enhanced events table
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  app TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT,
  payload TEXT NOT NULL,
  trace_id TEXT,           -- For distributed tracing
  span_id TEXT,            -- OpenTelemetry span ID
  parent_span_id TEXT,     -- Parent span for nested operations
  severity INTEGER,        -- 1=INFO, 2=WARN, 3=ERROR
  tags TEXT               -- JSON tags for custom metadata
);

-- Alerts table
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY,
  rule_name TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  event_id INTEGER
);

-- Traces table
CREATE TABLE traces (
  id INTEGER PRIMARY KEY,
  trace_id TEXT NOT NULL UNIQUE,
  operation_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER,
  status TEXT DEFAULT 'active',
  service_name TEXT
);
```

## 🚀 Production Deployment

### Docker Compose with All Features
```yaml
version: '3.8'
services:
  observability:
    build: .
    ports:
      - "3001:3001"
    environment:
      - ENABLE_ALERTS=true
      - ENABLE_TRACING=true
      - ENABLE_ANOMALY_DETECTION=true
      - WEBHOOK_URL=${WEBHOOK_URL}
    volumes:
      - ./data:/app/server/db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: observability
  template:
    metadata:
      labels:
        app: observability
    spec:
      containers:
      - name: observability
        image: observability:latest
        ports:
        - containerPort: 3001
        env:
        - name: ENABLE_ALERTS
          value: "true"
        - name: WEBHOOK_URL
          valueFrom:
            secretKeyRef:
              name: webhook-secret
              key: url
```

## 📈 Performance & Scaling

### Optimization Features
- **Connection Pooling**: Efficient database connections
- **Caching**: Redis cache for frequent queries
- **Batch Processing**: Bulk event inserts
- **Compression**: Gzip compression for large payloads

### Horizontal Scaling
- **Load Balancer**: Distribute traffic across instances
- **Database Sharding**: Partition events by time or agent
- **CDN Integration**: Serve static assets from CDN

### Monitoring the Monitor
- **Health Checks**: Built-in health endpoints
- **Metrics Export**: Monitor the observability system itself
- **Auto-scaling**: Scale based on event volume

## 🔒 Security Features

### Authentication & Authorization
- **API Key Authentication**: Secure API access
- **Role-Based Access**: Different permissions for different users
- **Rate Limiting**: Prevent abuse and DoS attacks

### Data Protection
- **Encryption at Rest**: Encrypt sensitive data in database
- **Encryption in Transit**: HTTPS/WSS for all communications
- **Data Retention**: Automatic cleanup of old data

### Audit Trail
- **Access Logging**: Track who accesses what data
- **Change Tracking**: Audit configuration changes
- **Compliance**: GDPR, HIPAA, SOC2 compliance features

---

## 🎯 Next Steps

1. **Try the Analytics Dashboard**: Access http://localhost:3001/analytics-dashboard.html
2. **Configure Alerts**: Set up webhook notifications
3. **Mobile Access**: Open http://localhost:3001/mobile-dashboard.html on your phone
4. **Integration**: Connect to your existing monitoring stack
5. **Custom Queries**: Explore the advanced filtering capabilities

Your observability stack is now enterprise-ready with advanced analytics, alerting, and mobile access! 🚀