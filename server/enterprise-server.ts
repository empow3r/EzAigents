import { Database } from "bun:sqlite";
import { Server } from "bun";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";

// Enhanced configuration
const config = {
  port: parseInt(process.env.PORT || "3001"),
  enableAuth: process.env.ENABLE_AUTH === "true",
  apiKey: process.env.OBSERVABILITY_API_KEY || "",
  retentionDays: parseInt(process.env.RETENTION_DAYS || "30"),
  maxEventsPerQuery: parseInt(process.env.MAX_EVENTS_PER_QUERY || "1000"),
  enableAlerts: process.env.ENABLE_ALERTS !== "false",
  webhookUrl: process.env.WEBHOOK_URL || "",
  enableTracing: process.env.ENABLE_TRACING !== "false",
  enableAnomalyDetection: process.env.ENABLE_ANOMALY_DETECTION === "true",
  alertThresholds: {
    errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD || "0.1"), // 10%
    eventRate: parseInt(process.env.EVENT_RATE_THRESHOLD || "100"), // events/min
    responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD || "5000") // 5s
  }
};

// Enhanced database schema
const db = new Database("./db/events.db", { create: true });

// Events table with enhanced fields
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    app TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    summary TEXT,
    payload TEXT NOT NULL,
    trace_id TEXT,
    span_id TEXT,
    parent_span_id TEXT,
    severity INTEGER DEFAULT 0,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Alerts table
db.run(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    condition_type TEXT NOT NULL,
    condition_value TEXT NOT NULL,
    triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    status TEXT DEFAULT 'active',
    event_id INTEGER,
    webhook_sent BOOLEAN DEFAULT 0,
    FOREIGN KEY (event_id) REFERENCES events (id)
  )
`);

// Traces table for distributed tracing
db.run(`
  CREATE TABLE IF NOT EXISTS traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trace_id TEXT NOT NULL UNIQUE,
    operation_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration INTEGER,
    status TEXT DEFAULT 'active',
    service_name TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Analytics cache table
db.run(`
  CREATE TABLE IF NOT EXISTS analytics_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    cache_value TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Enhanced indexes
db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_events_app ON events(app)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_events_trace_id ON events(trace_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_traces_trace_id ON traces(trace_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)`);

// Prepared statements
const insertEvent = db.prepare(`
  INSERT INTO events (timestamp, app, session_id, event_type, summary, payload, trace_id, span_id, parent_span_id, severity, tags)
  VALUES ($timestamp, $app, $session_id, $event_type, $summary, $payload, $trace_id, $span_id, $parent_span_id, $severity, $tags)
`);

const insertTrace = db.prepare(`
  INSERT OR REPLACE INTO traces (trace_id, operation_name, start_time, end_time, duration, status, service_name, tags)
  VALUES ($trace_id, $operation_name, $start_time, $end_time, $duration, $status, $service_name, $tags)
`);

const insertAlert = db.prepare(`
  INSERT INTO alerts (rule_name, condition_type, condition_value, event_id)
  VALUES ($rule_name, $condition_type, $condition_value, $event_id)
`);

// Advanced analytics queries
const getEventStats = db.prepare(`
  SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT app) as unique_apps,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT event_type) as unique_event_types,
    COUNT(CASE WHEN event_type = 'error' THEN 1 END) as error_count,
    AVG(CASE WHEN payload LIKE '%duration%' THEN 
      CAST(json_extract(payload, '$.duration') AS REAL) END) as avg_duration
  FROM events
  WHERE timestamp > datetime('now', '-24 hours')
`);

const getPerformanceMetrics = db.prepare(`
  SELECT 
    app,
    COUNT(*) as event_count,
    COUNT(CASE WHEN event_type = 'error' THEN 1 END) as error_count,
    AVG(CASE WHEN payload LIKE '%duration%' THEN 
      CAST(json_extract(payload, '$.duration') AS REAL) END) as avg_response_time,
    COUNT(DISTINCT session_id) as active_sessions
  FROM events
  WHERE timestamp > datetime('now', '-1 hour')
  GROUP BY app
  ORDER BY event_count DESC
`);

const getAnomalyDetection = db.prepare(`
  WITH hourly_stats AS (
    SELECT 
      strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
      app,
      COUNT(*) as event_count,
      COUNT(CASE WHEN event_type = 'error' THEN 1 END) as error_count
    FROM events
    WHERE timestamp > datetime('now', '-7 days')
    GROUP BY hour, app
  ),
  stats AS (
    SELECT 
      app,
      AVG(event_count) as avg_events,
      AVG(error_count) as avg_errors,
      MAX(event_count) as max_events,
      MIN(event_count) as min_events
    FROM hourly_stats
    GROUP BY app
  )
  SELECT 
    h.app,
    h.hour,
    h.event_count,
    h.error_count,
    s.avg_events,
    s.avg_errors,
    CASE 
      WHEN h.event_count > s.avg_events * 2 THEN 'spike'
      WHEN h.event_count < s.avg_events * 0.5 THEN 'drop'
      WHEN h.error_count > s.avg_errors * 3 THEN 'error_spike'
      ELSE 'normal'
    END as anomaly_type
  FROM hourly_stats h
  JOIN stats s ON h.app = s.app
  WHERE h.hour > datetime('now', '-24 hours')
    AND anomaly_type != 'normal'
  ORDER BY h.hour DESC
`);

// Real-time metrics
const metrics = {
  eventsReceived: 0,
  eventsProcessed: 0,
  wsConnections: 0,
  apiRequests: 0,
  errors: 0,
  alertsTriggered: 0,
  tracesActive: 0
};

// WebSocket clients with enhanced tracking
const wsClients = new Map<any, {
  id: string,
  connectedAt: Date,
  filters?: any,
  subscriptions: Set<string>
}>();

// Alert system
class AlertSystem {
  private rules: Map<string, any> = new Map();
  
  constructor() {
    this.setupDefaultRules();
  }
  
  setupDefaultRules() {
    this.addRule("high_error_rate", {
      condition: "error_rate",
      threshold: config.alertThresholds.errorRate,
      window: "5m",
      enabled: true
    });
    
    this.addRule("high_event_rate", {
      condition: "event_rate", 
      threshold: config.alertThresholds.eventRate,
      window: "1m",
      enabled: true
    });
    
    this.addRule("slow_response", {
      condition: "response_time",
      threshold: config.alertThresholds.responseTime,
      window: "5m",
      enabled: true
    });
  }
  
  addRule(name: string, rule: any) {
    this.rules.set(name, rule);
  }
  
  async checkAlerts(event: any) {
    if (!config.enableAlerts) return;
    
    for (const [ruleName, rule] of this.rules) {
      if (!rule.enabled) continue;
      
      const shouldAlert = await this.evaluateRule(rule, event);
      if (shouldAlert) {
        await this.triggerAlert(ruleName, rule, event);
      }
    }
  }
  
  private async evaluateRule(rule: any, event: any): Promise<boolean> {
    switch (rule.condition) {
      case "error_rate":
        const errorRate = await this.calculateErrorRate();
        return errorRate > rule.threshold;
        
      case "event_rate":
        const eventRate = await this.calculateEventRate();
        return eventRate > rule.threshold;
        
      case "response_time":
        const responseTime = event.payload?.duration;
        return responseTime && responseTime > rule.threshold;
        
      default:
        return false;
    }
  }
  
  private async calculateErrorRate(): Promise<number> {
    const stats = getEventStats.get() as any;
    return stats.total_events > 0 ? stats.error_count / stats.total_events : 0;
  }
  
  private async calculateEventRate(): Promise<number> {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM events 
      WHERE timestamp > datetime('now', '-1 minute')
    `).get() as any;
    return result.count;
  }
  
  private async triggerAlert(ruleName: string, rule: any, event: any) {
    metrics.alertsTriggered++;
    
    // Insert alert record
    insertAlert.run({
      $rule_name: ruleName,
      $condition_type: rule.condition,
      $condition_value: JSON.stringify(rule),
      $event_id: event.id
    });
    
    // Send webhook if configured
    if (config.webhookUrl) {
      await this.sendWebhook(ruleName, rule, event);
    }
    
    // Broadcast to WebSocket clients
    this.broadcastAlert(ruleName, rule, event);
  }
  
  private async sendWebhook(ruleName: string, rule: any, event: any) {
    try {
      const payload = {
        alert: ruleName,
        rule,
        event,
        timestamp: new Date().toISOString(),
        severity: this.getSeverity(rule.condition)
      };
      
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    }
  }
  
  private broadcastAlert(ruleName: string, rule: any, event: any) {
    const alertData = {
      type: 'alert',
      data: {
        rule: ruleName,
        condition: rule.condition,
        event,
        timestamp: new Date().toISOString()
      }
    };
    
    for (const [client, info] of wsClients) {
      if (info.subscriptions.has('alerts')) {
        client.send(JSON.stringify(alertData));
      }
    }
  }
  
  private getSeverity(condition: string): string {
    switch (condition) {
      case "error_rate": return "high";
      case "response_time": return "medium";
      default: return "low";
    }
  }
}

// Distributed tracing system
class TracingSystem {
  generateTraceId(): string {
    return createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex').substring(0, 16);
  }
  
  generateSpanId(): string {
    return createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex').substring(0, 8);
  }
  
  startTrace(operationName: string, serviceName: string, tags: any = {}) {
    const traceId = this.generateTraceId();
    
    insertTrace.run({
      $trace_id: traceId,
      $operation_name: operationName,
      $start_time: new Date().toISOString(),
      $end_time: null,
      $duration: null,
      $status: 'active',
      $service_name: serviceName,
      $tags: JSON.stringify(tags)
    });
    
    return traceId;
  }
  
  finishTrace(traceId: string, status: string = 'completed') {
    const trace = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(traceId) as any;
    if (!trace) return;
    
    const duration = Date.now() - new Date(trace.start_time).getTime();
    
    db.prepare(`
      UPDATE traces 
      SET end_time = ?, duration = ?, status = ?
      WHERE trace_id = ?
    `).run(new Date().toISOString(), duration, status, traceId);
  }
  
  getTraceEvents(traceId: string) {
    return db.prepare(`
      SELECT * FROM events 
      WHERE trace_id = ? 
      ORDER BY timestamp ASC
    `).all(traceId);
  }
}

// Initialize systems
const alertSystem = new AlertSystem();
const tracingSystem = new TracingSystem();

// Path to client files
const CLIENT_DIR = join(import.meta.dir, "..", "client");

// MIME types
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// Enhanced server
const server = Bun.serve({
  port: config.port,
  
  async fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    metrics.apiRequests++;
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check with enhanced metrics
    if (url.pathname === "/health") {
      const stats = getEventStats.get();
      return new Response(JSON.stringify({
        status: "healthy",
        mode: "enterprise",
        uptime: process.uptime(),
        metrics,
        database: { connected: true, events: stats },
        features: {
          alerts: config.enableAlerts,
          tracing: config.enableTracing,
          anomalyDetection: config.enableAnomalyDetection
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Enhanced metrics endpoint (Prometheus compatible)
    if (url.pathname === "/metrics") {
      const stats = getEventStats.get() as any;
      const performance = getPerformanceMetrics.all();
      
      const promMetrics = [
        `# HELP observability_events_total Total events received`,
        `# TYPE observability_events_total counter`,
        `observability_events_total ${metrics.eventsReceived}`,
        ``,
        `# HELP observability_events_by_app Events by application`,
        `# TYPE observability_events_by_app gauge`,
        ...performance.map((p: any) => `observability_events_by_app{app="${p.app}"} ${p.event_count}`),
        ``,
        `# HELP observability_error_rate Error rate`,
        `# TYPE observability_error_rate gauge`,
        `observability_error_rate ${stats.total_events > 0 ? stats.error_count / stats.total_events : 0}`,
        ``,
        `# HELP observability_alerts_triggered Alerts triggered`,
        `# TYPE observability_alerts_triggered counter`,
        `observability_alerts_triggered ${metrics.alertsTriggered}`
      ].join("\n");
      
      return new Response(promMetrics, {
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }
    
    // Analytics endpoint
    if (url.pathname === "/analytics") {
      const stats = getEventStats.get();
      const performance = getPerformanceMetrics.all();
      const anomalies = config.enableAnomalyDetection ? getAnomalyDetection.all() : [];
      
      return new Response(JSON.stringify({
        overview: stats,
        performance,
        anomalies,
        generated_at: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Traces endpoint
    if (url.pathname === "/traces") {
      const traces = db.prepare(`
        SELECT * FROM traces 
        ORDER BY start_time DESC 
        LIMIT 100
      `).all();
      
      return new Response(JSON.stringify(traces), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Trace details endpoint
    if (url.pathname.startsWith("/traces/")) {
      const traceId = url.pathname.split("/")[2];
      const trace = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(traceId);
      const events = tracingSystem.getTraceEvents(traceId);
      
      return new Response(JSON.stringify({ trace, events }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    
    // Enhanced events endpoint
    if (url.pathname === "/events" && req.method === "POST") {
      try {
        metrics.eventsReceived++;
        const event = await req.json();
        
        if (!event.app || !event.event_type || !event.payload) {
          return new Response("Invalid event structure", { status: 400 });
        }
        
        // Generate tracing info if not provided
        if (config.enableTracing && !event.trace_id) {
          event.trace_id = tracingSystem.generateTraceId();
          event.span_id = tracingSystem.generateSpanId();
        }
        
        // Determine severity
        const severity = event.event_type === 'error' ? 3 : 
                        event.event_type === 'warning' ? 2 : 1;
        
        // Insert event with enhanced fields
        const result = insertEvent.run({
          $timestamp: event.timestamp || new Date().toISOString(),
          $app: event.app,
          $session_id: event.session_id || "default",
          $event_type: event.event_type,
          $summary: event.summary || null,
          $payload: JSON.stringify(event.payload),
          $trace_id: event.trace_id || null,
          $span_id: event.span_id || null,
          $parent_span_id: event.parent_span_id || null,
          $severity: severity,
          $tags: event.tags ? JSON.stringify(event.tags) : null
        });
        
        metrics.eventsProcessed++;
        
        // Check alerts
        const eventWithId = { ...event, id: result.lastInsertRowid };
        await alertSystem.checkAlerts(eventWithId);
        
        // Broadcast to WebSocket clients
        const broadcastEvent = {
          ...eventWithId,
          severity
        };
        
        for (const [client, info] of wsClients) {
          if (this.matchesClientFilters(broadcastEvent, info.filters)) {
            client.send(JSON.stringify({
              type: "event",
              data: broadcastEvent
            }));
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          id: result.lastInsertRowid,
          trace_id: event.trace_id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
        
      } catch (error) {
        metrics.errors++;
        console.error("Error processing event:", error);
        return new Response("Internal server error", { status: 500 });
      }
    }
    
    // Enhanced events query endpoint
    if (url.pathname === "/events" && req.method === "GET") {
      const params = url.searchParams;
      const limit = Math.min(parseInt(params.get("limit") || "100"), config.maxEventsPerQuery);
      
      let query = `SELECT * FROM events WHERE 1=1`;
      const queryParams: any = {};
      
      // Advanced filtering
      if (params.has("app")) {
        query += ` AND app = $app`;
        queryParams.$app = params.get("app");
      }
      
      if (params.has("event_type")) {
        query += ` AND event_type = $event_type`;
        queryParams.$event_type = params.get("event_type");
      }
      
      if (params.has("severity")) {
        query += ` AND severity >= $severity`;
        queryParams.$severity = parseInt(params.get("severity") || "1");
      }
      
      if (params.has("trace_id")) {
        query += ` AND trace_id = $trace_id`;
        queryParams.$trace_id = params.get("trace_id");
      }
      
      if (params.has("start_time")) {
        query += ` AND timestamp >= $start_time`;
        queryParams.$start_time = params.get("start_time");
      }
      
      if (params.has("end_time")) {
        query += ` AND timestamp <= $end_time`;
        queryParams.$end_time = params.get("end_time");
      }
      
      if (params.has("search")) {
        query += ` AND (summary LIKE $search OR payload LIKE $search)`;
        queryParams.$search = `%${params.get("search")}%`;
      }
      
      query += ` ORDER BY timestamp DESC LIMIT ${limit}`;
      
      const events = db.prepare(query).all(queryParams);
      
      // Parse JSON fields
      const parsedEvents = events.map((e: any) => ({
        ...e,
        payload: JSON.parse(e.payload),
        tags: e.tags ? JSON.parse(e.tags) : null
      }));
      
      return new Response(JSON.stringify(parsedEvents), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Static file serving
    let pathname = url.pathname;
    if (pathname === "/" || pathname === "/dashboard") {
      pathname = "/index-enhanced.html";
    }
    
    if (pathname.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }
    
    const filePath = join(CLIENT_DIR, pathname);
    if (existsSync(filePath)) {
      try {
        const file = readFileSync(filePath);
        const ext = pathname.substring(pathname.lastIndexOf("."));
        const mimeType = MIME_TYPES[ext] || "application/octet-stream";
        
        return new Response(file, {
          headers: {
            ...corsHeaders,
            "Content-Type": mimeType,
            "Cache-Control": "no-cache"
          }
        });
      } catch (error) {
        console.error(`Error serving ${pathname}:`, error);
      }
    }
    
    return new Response("Not found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      wsClients.set(ws, {
        id: clientId,
        connectedAt: new Date(),
        subscriptions: new Set(['events', 'alerts'])
      });
      metrics.wsConnections++;
      
      console.log(`Enhanced WebSocket client connected: ${clientId}`);
      
      // Send initial data
      const recent = db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 50').all();
      const stats = getEventStats.get();
      const performance = getPerformanceMetrics.all();
      
      ws.send(JSON.stringify({ 
        type: "init",
        clientId,
        events: recent.map((e: any) => ({
          ...e,
          payload: JSON.parse(e.payload),
          tags: e.tags ? JSON.parse(e.tags) : null
        })),
        stats,
        performance
      }));
    },
    
    close(ws) {
      const client = wsClients.get(ws);
      if (client) {
        console.log(`WebSocket client disconnected: ${client.id}`);
        wsClients.delete(ws);
        metrics.wsConnections--;
      }
    },
    
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        const client = wsClients.get(ws);
        
        if (!client) return;
        
        switch (data.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            break;
            
          case "subscribe":
            if (data.channels) {
              data.channels.forEach((channel: string) => {
                client.subscriptions.add(channel);
              });
            }
            break;
            
          case "unsubscribe":
            if (data.channels) {
              data.channels.forEach((channel: string) => {
                client.subscriptions.delete(channel);
              });
            }
            break;
            
          case "set_filters":
            client.filters = data.filters;
            break;
            
          case "query":
            // Execute custom analytical queries
            if (data.sql && data.sql.toLowerCase().startsWith("select")) {
              try {
                const result = db.prepare(data.sql).all(data.params || {});
                ws.send(JSON.stringify({ 
                  type: "query_result", 
                  queryId: data.queryId,
                  result 
                }));
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: "error", 
                  queryId: data.queryId,
                  message: error.message 
                }));
              }
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    }
  },
  
  // Helper method for client filtering
  matchesClientFilters(event: any, filters: any): boolean {
    if (!filters) return true;
    
    if (filters.app && event.app !== filters.app) return false;
    if (filters.event_type && event.event_type !== filters.event_type) return false;
    if (filters.severity && event.severity < filters.severity) return false;
    
    return true;
  }
});

// Periodic maintenance tasks
setInterval(() => {
  // Clean up old events
  const deleted = db.run(`
    DELETE FROM events 
    WHERE created_at < datetime('now', '-${config.retentionDays} days')
  `);
  
  if (deleted.changes > 0) {
    console.log(`Cleaned up ${deleted.changes} old events`);
  }
  
  // Clean up old traces
  db.run(`
    DELETE FROM traces 
    WHERE created_at < datetime('now', '-7 days')
  `);
  
  // Clean up resolved alerts
  db.run(`
    DELETE FROM alerts 
    WHERE status = 'resolved' AND triggered_at < datetime('now', '-30 days')
  `);
  
}, 24 * 60 * 60 * 1000); // Daily

// Get local IP for display
function getLocalIP(): string {
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    // Fallback
  }
  return "your-ip";
}

const localIP = getLocalIP();

console.log(`
🚀 Enterprise Observability Server
==================================
📡 API Endpoints:
   - POST   http://localhost:${config.port}/events
   - GET    http://localhost:${config.port}/events (enhanced filtering)
   - GET    http://localhost:${config.port}/analytics
   - GET    http://localhost:${config.port}/traces
   - GET    http://localhost:${config.port}/health
   - GET    http://localhost:${config.port}/metrics

🌐 Dashboard Access:
   - http://localhost:${config.port}/
   - http://${localIP}:${config.port}/

🔧 Features Enabled:
   - Alerts: ${config.enableAlerts}
   - Tracing: ${config.enableTracing} 
   - Anomaly Detection: ${config.enableAnomalyDetection}
   - Webhook URL: ${config.webhookUrl || 'Not configured'}

💾 Database: ./db/events.db
📊 Retention: ${config.retentionDays} days

Press Ctrl+C to stop
`);