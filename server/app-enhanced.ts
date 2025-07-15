import { Database } from "bun:sqlite";
import { Server } from "bun";
import { createHash } from "crypto";

// Configuration
const config = {
  port: parseInt(process.env.PORT || "3001"),
  apiKey: process.env.OBSERVABILITY_API_KEY || "",
  retentionDays: parseInt(process.env.RETENTION_DAYS || "30"),
  maxEventsPerQuery: 1000,
  enableAuth: process.env.ENABLE_AUTH === "true"
};

// Initialize SQLite database
const db = new Database("./db/events.db", { create: true });

// Create enhanced events table
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    app TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    summary TEXT,
    payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create indexes for performance
db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_app ON events(app)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_session_id ON events(session_id)`);

// Create metrics table
db.run(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value REAL NOT NULL,
    labels TEXT
  )
`);

// Prepared statements
const insertEvent = db.prepare(`
  INSERT INTO events (timestamp, app, session_id, event_type, summary, payload)
  VALUES ($timestamp, $app, $session_id, $event_type, $summary, $payload)
`);

const getRecentEvents = db.prepare(`
  SELECT * FROM events ORDER BY id DESC LIMIT ?
`);

const getEventStats = db.prepare(`
  SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT app) as unique_apps,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT event_type) as unique_event_types
  FROM events
  WHERE timestamp > datetime('now', '-24 hours')
`);

const getEventsByTimeRange = db.prepare(`
  SELECT * FROM events 
  WHERE timestamp >= $start AND timestamp <= $end
  ORDER BY timestamp DESC
  LIMIT $limit
`);

const searchEvents = db.prepare(`
  SELECT * FROM events 
  WHERE (app LIKE $search OR event_type LIKE $search OR summary LIKE $search OR payload LIKE $search)
  AND ($app IS NULL OR app = $app)
  AND ($event_type IS NULL OR event_type = $event_type)
  ORDER BY id DESC
  LIMIT $limit
`);

// WebSocket clients
const wsClients = new Map<any, { id: string, filters?: any }>();
let clientIdCounter = 0;

// Metrics tracking
const metrics = {
  eventsReceived: 0,
  eventsProcessed: 0,
  wsConnections: 0,
  apiRequests: 0,
  errors: 0
};

// Helper functions
function validateApiKey(req: Request): boolean {
  if (!config.enableAuth) return true;
  
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  
  const [type, key] = authHeader.split(" ");
  return type === "Bearer" && key === config.apiKey;
}

function generateEventId(event: any): string {
  const hash = createHash("md5");
  hash.update(JSON.stringify(event));
  return hash.digest("hex").substring(0, 8);
}

// Periodic cleanup
setInterval(() => {
  const deleted = db.run(`
    DELETE FROM events 
    WHERE created_at < datetime('now', '-${config.retentionDays} days')
  `);
  console.log(`Cleaned up ${deleted.changes} old events`);
}, 24 * 60 * 60 * 1000); // Daily

// Create server
const server = Bun.serve({
  port: config.port,
  
  async fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    metrics.apiRequests++;
    
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }
    
    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        uptime: process.uptime(),
        metrics,
        database: {
          connected: true,
          events: db.prepare("SELECT COUNT(*) as count FROM events").get()
        }
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Metrics endpoint (Prometheus format)
    if (url.pathname === "/metrics") {
      const promMetrics = [
        `# HELP observability_events_total Total events received`,
        `# TYPE observability_events_total counter`,
        `observability_events_total ${metrics.eventsReceived}`,
        `# HELP observability_ws_connections Active WebSocket connections`,
        `# TYPE observability_ws_connections gauge`,
        `observability_ws_connections ${metrics.wsConnections}`,
        `# HELP observability_api_requests_total Total API requests`,
        `# TYPE observability_api_requests_total counter`,
        `observability_api_requests_total ${metrics.apiRequests}`
      ].join("\n");
      
      return new Response(promMetrics, {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    // API key validation for protected endpoints
    if (config.enableAuth && !validateApiKey(req)) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    // Stats endpoint
    if (url.pathname === "/stats") {
      const stats = getEventStats.get();
      const appStats = db.prepare(`
        SELECT app, COUNT(*) as count 
        FROM events 
        GROUP BY app 
        ORDER BY count DESC 
        LIMIT 10
      `).all();
      
      return new Response(JSON.stringify({
        last24Hours: stats,
        topApps: appStats,
        metrics
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    
    // POST /events
    if (url.pathname === "/events" && req.method === "POST") {
      try {
        metrics.eventsReceived++;
        const event = await req.json();
        
        // Validate event
        if (!event.app || !event.event_type || !event.payload) {
          return new Response("Invalid event structure", { status: 400 });
        }
        
        // Insert into database
        const result = insertEvent.run({
          $timestamp: event.timestamp || new Date().toISOString(),
          $app: event.app,
          $session_id: event.session_id || "default",
          $event_type: event.event_type,
          $summary: event.summary || null,
          $payload: JSON.stringify(event.payload)
        });
        
        metrics.eventsProcessed++;
        
        // Broadcast to WebSocket clients
        const broadcastEvent = {
          ...event,
          id: result.lastInsertRowid,
          eventId: generateEventId(event)
        };
        
        for (const [client, info] of wsClients) {
          // Apply client filters if any
          if (info.filters) {
            const { app, event_type, session_id } = info.filters;
            if (app && event.app !== app) continue;
            if (event_type && event.event_type !== event_type) continue;
            if (session_id && event.session_id !== session_id) continue;
          }
          
          client.send(JSON.stringify({
            type: "event",
            data: broadcastEvent
          }));
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          id: result.lastInsertRowid,
          eventId: broadcastEvent.eventId
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        metrics.errors++;
        console.error("Error processing event:", error);
        return new Response("Internal server error", { status: 500 });
      }
    }
    
    // GET /events with advanced filtering
    if (url.pathname === "/events" && req.method === "GET") {
      const params = url.searchParams;
      const limit = Math.min(parseInt(params.get("limit") || "100"), config.maxEventsPerQuery);
      
      let events;
      
      // Time range query
      if (params.has("start") || params.has("end")) {
        events = getEventsByTimeRange.all({
          $start: params.get("start") || "1970-01-01",
          $end: params.get("end") || new Date().toISOString(),
          $limit: limit
        });
      }
      // Search query
      else if (params.has("search")) {
        events = searchEvents.all({
          $search: `%${params.get("search")}%`,
          $app: params.get("app"),
          $event_type: params.get("event_type"),
          $limit: limit
        });
      }
      // Default recent events
      else {
        events = getRecentEvents.all(limit);
      }
      
      // Parse payload JSON
      events = events.map(e => ({
        ...e,
        payload: JSON.parse(e.payload)
      }));
      
      return new Response(JSON.stringify(events), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Export endpoints
    if (url.pathname === "/export/csv" && req.method === "GET") {
      const events = getRecentEvents.all(1000);
      
      const csv = [
        "id,timestamp,app,session_id,event_type,summary",
        ...events.map(e => 
          `${e.id},"${e.timestamp}","${e.app}","${e.session_id}","${e.event_type}","${e.summary || ''}"`
        )
      ].join("\n");
      
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="events-${Date.now()}.csv"`
        }
      });
    }
    
    return new Response("Not found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      const clientId = `client-${++clientIdCounter}`;
      wsClients.set(ws, { id: clientId });
      metrics.wsConnections++;
      
      console.log(`WebSocket client connected: ${clientId}`);
      
      // Send recent events and stats
      const recent = getRecentEvents.all(50);
      const stats = getEventStats.get();
      
      ws.send(JSON.stringify({ 
        type: "init",
        clientId,
        events: recent.map(e => ({
          ...e,
          payload: JSON.parse(e.payload)
        })),
        stats
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
        
        // Handle client commands
        switch (data.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            break;
            
          case "subscribe":
            // Update client filters
            const client = wsClients.get(ws);
            if (client) {
              client.filters = data.filters || {};
              ws.send(JSON.stringify({ 
                type: "subscribed", 
                filters: client.filters 
              }));
            }
            break;
            
          case "query":
            // Execute custom query
            const { sql, params } = data;
            if (sql && sql.toLowerCase().startsWith("select")) {
              try {
                const result = db.prepare(sql).all(params || {});
                ws.send(JSON.stringify({ 
                  type: "query_result", 
                  result 
                }));
              } catch (error) {
                ws.send(JSON.stringify({ 
                  type: "error", 
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
  }
});

// Enhanced startup message
console.log(`
🚀 Enhanced Observability Server
================================
📡 API: http://localhost:${config.port}
🔌 WebSocket: ws://localhost:${config.port}/ws
💾 Database: ./db/events.db
🔐 Auth: ${config.enableAuth ? "Enabled" : "Disabled"}
📊 Retention: ${config.retentionDays} days

Endpoints:
- POST   /events      - Submit events
- GET    /events      - Query events (with filters)
- GET    /stats       - Event statistics
- GET    /health      - Health check
- GET    /metrics     - Prometheus metrics
- GET    /export/csv  - Export as CSV
- WS     /ws          - Real-time updates
`);