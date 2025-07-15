# 🌐 Hosting the Observability Dashboard

## Quick Start Options

### Option 1: All-in-One Server (Recommended)
Serves both API and dashboard on a single port:

```bash
# Default (port 3001)
cd server
bun run all-in-one-server.ts

# Custom port
PORT=8080 bun run all-in-one-server.ts
```

**Access at:**
- http://localhost:3001
- http://localhost:3001/index-enhanced.html
- http://192.168.50.113:3001 (from other devices)

### Option 2: Simple Python Server
Just for the dashboard (requires API running separately):

```bash
# Default (port 8080)
./start-dashboard.sh

# Custom port
./start-dashboard.sh -p 3000

# Bind to localhost only
./start-dashboard.sh -h localhost -p 8080
```

### Option 3: Interactive Launcher
Choose your setup interactively:

```bash
./start-observability.sh
```

Options:
1. All-in-one server (easiest)
2. Separate servers
3. Dashboard only
4. Custom configuration

## 📱 Access from Other Devices

### Local Network Access
1. Find your IP address:
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Linux
   ip addr show | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig | findstr IPv4
   ```

2. Access from any device on same network:
   ```
   http://YOUR_IP:3001
   ```

### Remote Access Options

#### Option A: Port Forwarding
1. Configure router to forward port 3001
2. Access via public IP: `http://YOUR_PUBLIC_IP:3001`

#### Option B: Ngrok (Easy Tunneling)
```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Expose local server
ngrok http 3001

# You'll get a URL like: https://abc123.ngrok.io
```

#### Option C: Cloudflare Tunnel
```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Create tunnel
cloudflared tunnel --url http://localhost:3001
```

## 🐳 Docker Hosting

### Build and Run
```bash
cd observability
docker-compose up -d
```

Access at:
- API: http://localhost:3001
- Dashboard: http://localhost:3002

### Custom Ports
```yaml
# docker-compose.yml
services:
  observability-server:
    ports:
      - "8080:3001"  # API on 8080
  dashboard:
    ports:
      - "8081:80"    # Dashboard on 8081
```

## 🔒 Production Deployment

### Using Nginx
1. Copy nginx config:
   ```bash
   sudo cp nginx/observability.conf /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/observability.conf /etc/nginx/sites-enabled/
   ```

2. Update the config with your paths and domain

3. Restart nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Using PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server/all-in-one-server.ts --name observability

# Save config
pm2 save
pm2 startup
```

### Systemd Service
Create `/etc/systemd/system/observability.service`:

```ini
[Unit]
Description=Claude Code Observability
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/EzAigents/server
ExecStart=/usr/local/bin/bun run all-in-one-server.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable observability
sudo systemctl start observability
```

## 🔧 Configuration

### Environment Variables
```bash
# Port configuration
PORT=3001                    # API/All-in-one port
DASHBOARD_PORT=8080          # Dashboard port (separate mode)
DASHBOARD_HOST=0.0.0.0       # Bind address

# Features
SERVE_STATIC=true            # Serve dashboard from API
ENABLE_AUTH=true             # Enable API authentication
OBSERVABILITY_API_KEY=secret # API key for auth

# Data retention
RETENTION_DAYS=30            # Keep events for 30 days
```

### Security Considerations

1. **Authentication**: Enable for production
   ```bash
   ENABLE_AUTH=true OBSERVABILITY_API_KEY=your-secret-key bun run all-in-one-server.ts
   ```

2. **HTTPS**: Use nginx or reverse proxy with SSL

3. **Firewall**: Restrict access to trusted IPs
   ```bash
   # Allow only specific IP
   sudo ufw allow from 192.168.1.100 to any port 3001
   ```

4. **Rate Limiting**: Configure in nginx
   ```nginx
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   limit_req zone=api burst=20 nodelay;
   ```

## 🌍 Cloud Deployment

### Vercel
```bash
# Deploy dashboard only
vercel client/
```

### Netlify
```bash
# Deploy dashboard
netlify deploy --dir=client
```

### AWS/GCP/Azure
Use the Docker image with their container services:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances

## 📱 Mobile Access

The dashboard is fully responsive and works on:
- iOS Safari
- Android Chrome
- Tablets
- Any modern mobile browser

Just navigate to `http://YOUR_IP:PORT` from your mobile device.

## 🚨 Troubleshooting

### Can't access from other devices
1. Check firewall: `sudo ufw status`
2. Ensure binding to `0.0.0.0` not `localhost`
3. Verify port is open: `netstat -an | grep 3001`

### Connection refused
1. Check server is running: `lsof -i:3001`
2. Verify no conflicts: `kill $(lsof -ti:3001)`
3. Check logs for errors

### Slow performance
1. Increase SQLite cache
2. Add indexes to database
3. Use production build of dashboard
4. Enable gzip compression in nginx

---

For more help, check the main README or open an issue!