import { Database } from "bun:sqlite";
import { Server } from "bun";

// Initialize SQLite database
const db = new Database("./db/events.db", { create: true });

// Create events table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    app TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    summary TEXT,
    payload TEXT NOT NULL
  )
`);

// Prepare statements
const insertEvent = db.prepare(`
  INSERT INTO events (timestamp, app, session_id, event_type, summary, payload)
  VALUES ($timestamp, $app, $session_id, $event_type, $summary, $payload)
`);

const getRecentEvents = db.prepare(`
  SELECT * FROM events ORDER BY id DESC LIMIT 100
`);

// WebSocket clients
const wsClients = new Set<any>();

// Create server
const server = Bun.serve({
  port: 3001,
  
  async fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    
    // Handle WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    
    // Handle POST /events
    if (url.pathname === "/events" && req.method === "POST") {
      try {
        const event = await req.json();
        
        // Validate event structure
        if (!event.app || !event.event_type || !event.payload) {
          return new Response("Invalid event structure", { status: 400 });
        }
        
        // Insert into database
        insertEvent.run({
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
          id: db.lastInsertRowid
        };
        
        for (const client of wsClients) {
          client.send(JSON.stringify(broadcastEvent));
        }
        
        return new Response(JSON.stringify({ success: true, id: db.lastInsertRowid }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error("Error processing event:", error);
        return new Response("Internal server error", { status: 500 });
      }
    }
    
    // Handle GET /events (for debugging/API access)
    if (url.pathname === "/events" && req.method === "GET") {
      const events = getRecentEvents.all();
      return new Response(JSON.stringify(events), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    return new Response("Not found", { status: 404 });
  },
  
  websocket: {
    open(ws) {
      console.log("WebSocket client connected");
      wsClients.add(ws);
      
      // Send recent events on connect
      const recent = getRecentEvents.all();
      ws.send(JSON.stringify({ type: "history", events: recent }));
    },
    
    close(ws) {
      console.log("WebSocket client disconnected");
      wsClients.delete(ws);
    },
    
    message(ws, message) {
      // Handle ping/pong or other client messages if needed
      if (message === "ping") {
        ws.send("pong");
      }
    }
  }
});

// Add CORS headers to all responses
const originalFetch = server.fetch.bind(server);
server.fetch = async (req: Request, server: Server) => {
  const response = await originalFetch(req, server);
  if (response && !(response instanceof WebSocket)) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  }
  return response;
};

console.log(`🚀 Observability server running on http://localhost:3001`);
console.log(`📊 WebSocket endpoint: ws://localhost:3001/ws`);
console.log(`💾 Database: ./db/events.db`);