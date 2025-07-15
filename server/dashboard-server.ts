import { serve } from "bun";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const PORT = parseInt(process.env.DASHBOARD_PORT || "8080");
const HOST = process.env.DASHBOARD_HOST || "0.0.0.0";

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

console.log(`
🚀 Observability Dashboard Server
=================================
📁 Serving: ${CLIENT_DIR}
🌐 Host: ${HOST}:${PORT}

Access the dashboard at:
- http://localhost:${PORT}
- http://localhost:${PORT}/index-enhanced.html (Enhanced version)
${HOST === "0.0.0.0" ? `- http://<your-ip>:${PORT}` : ""}

Press Ctrl+C to stop
`);

serve({
  port: PORT,
  hostname: HOST,
  
  fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // Default to index.html
    if (pathname === "/") {
      pathname = "/index.html";
    }
    
    // Security: prevent directory traversal
    if (pathname.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }
    
    // Construct file path
    const filePath = join(CLIENT_DIR, pathname);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new Response("Not Found", { status: 404 });
    }
    
    try {
      // Read file
      const file = readFileSync(filePath);
      
      // Get MIME type
      const ext = pathname.substring(pathname.lastIndexOf("."));
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      
      // Return file with appropriate headers
      return new Response(file, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      console.error(`Error serving ${pathname}:`, error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
});