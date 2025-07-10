const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Ez Aigents Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; background: #111827; color: white; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #3b82f6; text-align: center; }
    .status { background: #1f2937; padding: 20px; border-radius: 10px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Ez Aigents Dashboard</h1>
    <div class="status">
      <h2>✅ Server is Working!</h2>
      <p>This is a test page to verify the server is accessible.</p>
      <p>Next.js dashboard will be restored once this basic connection is confirmed.</p>
    </div>
  </div>
</body>
</html>`);
});

server.listen(9999, 'localhost', () => {
  console.log('Test server running on http://localhost:9999');
});