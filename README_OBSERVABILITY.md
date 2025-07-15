# 🔍 Claude Code Local Observability Stack

A complete local-first observability system for Claude Code agents that captures all hook events, persists them to SQLite, and displays them in real-time via a WebSocket dashboard.

## 🚀 Features

- **Local-First**: Everything runs on your machine, no cloud dependencies
- **Real-Time Updates**: WebSocket connection for instant event streaming
- **Persistent Storage**: SQLite database stores all events locally
- **Smart Summaries**: Optional AI-generated event summaries using Claude Haiku
- **Rich Dashboard**: Filter, search, and export events with ease
- **Multi-Agent Support**: Track events from multiple Claude agents simultaneously

## 📦 Installation

### Prerequisites

- Python 3.8+ with UV
- Bun runtime (for the server)
- Claude API key (for event summaries)

### Quick Setup

1. **Install dependencies**:
   ```bash
   # Install UV if not already installed
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # Install Bun if not already installed
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Set environment variables**:
   ```bash
   export ANTHROPIC_API_KEY="your-claude-api-key"
   export CLAUDE_SESSION_ID="your-session-name"
   export CLAUDE_APP_NAME="EzAigents"
   ```

## 🏃 Running the Stack

### 1. Start the Observability Server

```bash
cd server
bun run app.ts
```

The server will:
- Start on http://localhost:3001
- Create SQLite database at `./db/events.db`
- Accept WebSocket connections at ws://localhost:3001/ws

### 2. Configure Claude Code Hooks

Add to your Claude Code settings:

```json
{
  "hooks": {
    "pre_tool_use": "python /path/to/claude/hooks/pre_tool_use.py",
    "post_tool_use": "python /path/to/claude/hooks/post_tool_use.py",
    "stop": "python /path/to/claude/hooks/stop.py"
  }
}
```

### 3. Open the Dashboard

Open `client/index.html` in your browser:

```bash
open client/index.html
```

## 🧪 Testing the System

### Manual Event Test

Send a test event directly:

```bash
cd claude/hooks
python send_event.py "TestApp" "pre_tool_use" '{"tool": "Bash", "params": {"command": "ls -la"}}'
```

### Verify Database

Check events in SQLite:

```bash
sqlite3 server/db/events.db "SELECT * FROM events ORDER BY id DESC LIMIT 5;"
```

## 📊 Dashboard Features

### Event Display
- **Real-time streaming**: New events appear instantly
- **Event badges**: App name, session ID, event type
- **Expandable payloads**: Click to view full event data
- **AI summaries**: One-line descriptions of each event

### Filtering & Search
- **Text search**: Search across all event fields
- **App filter**: Filter by specific applications
- **Type filter**: Filter by event type
- **Auto-scroll**: Toggle automatic scrolling to new events

### Data Export
- **JSON export**: Download all events as JSON
- **Clear events**: Remove all events from view (not database)

## 🔧 API Endpoints

### POST /events
Send a new event:
```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d '{
    "app": "MyApp",
    "event_type": "custom",
    "payload": {"data": "test"}
  }'
```

### GET /events
Retrieve recent events:
```bash
curl http://localhost:3001/events
```

## 🛠 Customization

### Adding Custom Hooks

Create a new hook file:

```python
#!/usr/bin/env python3
import sys
sys.path.insert(0, str(Path(__file__).parent))
from send_event import send_event

# Your hook logic here
send_event(
    app="YourApp",
    event_type="custom_event",
    payload={"your": "data"},
    summarize=True
)
```

### Modifying Event Schema

Update the SQLite schema in `server/app.ts`:

```typescript
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    timestamp TEXT,
    app TEXT,
    // Add your fields here
  )
`);
```

## 🐛 Troubleshooting

### WebSocket Won't Connect
- Check server is running: `lsof -i :3001`
- Verify no firewall blocking
- Check browser console for errors

### Events Not Appearing
- Verify hooks are executable: `chmod +x claude/hooks/*.py`
- Check Claude Code hooks config
- Test with manual event send

### Database Issues
- Check permissions: `ls -la server/db/`
- Verify Bun has write access
- Delete and recreate if corrupted

## 🔒 Security Notes

- Keep your API keys secure
- The server binds to localhost only by default
- No authentication on endpoints (add if needed for production)
- SQLite database is unencrypted

## 📈 Performance

- SQLite can handle millions of events
- WebSocket broadcasts are throttled for large payloads
- Dashboard renders up to 1000 events efficiently
- Consider archiving old events for long-running systems

## 🎯 Next Steps

- Add authentication to the server
- Implement event retention policies
- Create aggregation views
- Add metric calculations
- Export to monitoring platforms

---

Built with ❤️ for the Claude Code community