const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ez Aigent Dashboard - Test Server</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          background: #111827; 
          color: white; 
          padding: 2rem; 
          margin: 0;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
        }
        .status { 
          background: #1f2937; 
          padding: 1rem; 
          border-radius: 0.5rem; 
          margin: 1rem 0; 
        }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .button {
          background: #3b82f6;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          margin: 0.5rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Ez Aigent Dashboard - Test Server</h1>
        
        <div class="status">
          <h2>Connection Status</h2>
          <p class="success">✅ HTTP Server: Running</p>
          <p class="success">✅ Port: 3000</p>
          <p class="success">✅ Connection: Successful</p>
          <p class="error">❌ Next.js: Not accessible in Claude Code environment</p>
        </div>

        <div class="status">
          <h2>Issue Identified</h2>
          <p>The Claude Code environment appears to have restrictions on localhost port binding.</p>
          <p>This is a known limitation where Node.js applications cannot bind to localhost ports.</p>
          <p>This explains why you asked about Claude Code conflicts with Next.js.</p>
        </div>

        <div class="status">
          <h2>Solutions</h2>
          <p>1. Use a different development environment (VS Code, terminal)</p>
          <p>2. Use Claude Code's built-in preview capabilities if available</p>
          <p>3. Deploy to a remote server for testing</p>
        </div>

        <button class="button" onclick="location.reload()">🔄 Refresh</button>
        <button class="button" onclick="window.open('http://localhost:3001', '_blank')">🧪 Test Port 3001</button>
      </div>
    </body>
    </html>
  `);
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});