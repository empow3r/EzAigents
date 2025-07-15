import { Database } from "bun:sqlite";
import { Server } from "bun";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

// Configuration
const config = {
  port: parseInt(process.env.PORT || "3001"),
  dashboardPort: parseInt(process.env.DASHBOARD_PORT || "8080"),
  apiKey: process.env.OBSERVABILITY_API_KEY || "",
  enableAuth: process.env.ENABLE_AUTH === "true",
  serveStatic: process.env.SERVE_STATIC !== "false" // Default true
};

// Path to client files
const CLIENT_DIR = join(import.meta.dir, "..", "client");

// Initialize SQLite database
const db = new Database("./db/events.db", { create: true });

// Create tables
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

// Create indexes
db.run(`CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_app ON events(app)`);

// Prepared statements
const insertEvent = db.prepare(`
  INSERT INTO events (timestamp, app, session_id, event_type, summary, payload)
  VALUES ($timestamp, $app, $session_id, $event_type, $summary, $payload)
`);

const getRecentEvents = db.prepare(`
  SELECT * FROM events ORDER BY id DESC LIMIT ?
`);

// WebSocket clients
const wsClients = new Set<any>();

// MIME types for static files
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

// Create all-in-one server
const server = Bun.serve({
  port: config.port,
  
  async fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    
    // Handle OPTIONS
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    
    // API ENDPOINTS
    
    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "healthy",
        mode: "all-in-one",
        staticServing: config.serveStatic,
        uptime: process.uptime()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
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
        const event = await req.json();
        
        if (!event.app || !event.event_type || !event.payload) {
          return new Response("Invalid event structure", { status: 400 });
        }
        
        const result = insertEvent.run({
          $timestamp: event.timestamp || new Date().toISOString(),
          $app: event.app,
          $session_id: event.session_id || "default",
          $event_type: event.event_type,
          $summary: event.summary || null,
          $payload: JSON.stringify(event.payload)
        });
        
        // Broadcast to WebSocket clients
        const broadcastEvent = {
          ...event,
          id: result.lastInsertRowid
        };
        
        for (const client of wsClients) {
          client.send(JSON.stringify({
            type: "event",
            data: broadcastEvent
          }));
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          id: result.lastInsertRowid
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error("Error processing event:", error);
        return new Response("Internal server error", { status: 500 });
      }
    }
    
    // GET /events
    if (url.pathname === "/events" && req.method === "GET") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
      const events = getRecentEvents.all(limit);
      
      // Parse payload JSON
      const parsedEvents = events.map((e: any) => ({
        ...e,
        payload: JSON.parse(e.payload)
      }));
      
      return new Response(JSON.stringify(parsedEvents), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Export CSV
    if (url.pathname === "/export/csv") {
      const events = getRecentEvents.all(1000);
      const csv = [
        "id,timestamp,app,session_id,event_type,summary",
        ...events.map((e: any) => 
          `${e.id},"${e.timestamp}","${e.app}","${e.session_id}","${e.event_type}","${e.summary || ''}"`
        )
      ].join("\n");
      
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="events-${Date.now()}.csv"`
        }
      });
    }
    
    // STATIC FILE SERVING (Dashboard)
    if (config.serveStatic) {
      let pathname = url.pathname;
      
      // Default routes
      if (pathname === "/" || pathname === "/dashboard") {
        pathname = "/index.html";
      }
      
      // Security check
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
    }
    
    return new Response("Not found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      console.log("WebSocket client connected");
      wsClients.add(ws);
      
      // Send recent events on connect
      const recent = getRecentEvents.all(50);
      ws.send(JSON.stringify({ 
        type: "init",
        events: recent.map((e: any) => ({
          ...e,
          payload: JSON.parse(e.payload)
        }))
      }));
    },
    
    close(ws) {
      console.log("WebSocket client disconnected");
      wsClients.delete(ws);
    },
    
    message(ws, message) {
      if (message === "ping") {
        ws.send("pong");
      }
    }
  }
});

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
🚀 All-in-One Observability Server
==================================
📡 API Endpoints:
   - POST   http://localhost:${config.port}/events
   - GET    http://localhost:${config.port}/events
   - GET    http://localhost:${config.port}/export/csv
   - WS     ws://localhost:${config.port}/ws

🌐 Dashboard Access:
   - http://localhost:${config.port}/
   - http://localhost:${config.port}/index-enhanced.html
   - http://${localIP}:${config.port}/

💾 Database: ./db/events.db

Press Ctrl+C to stop
`);