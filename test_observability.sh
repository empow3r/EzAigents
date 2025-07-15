#!/bin/bash

echo "🧪 Testing Claude Code Observability Stack"
echo "========================================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Start the server in background
echo "📡 Starting observability server..."
cd server && bun run app.ts &
SERVER_PID=$!
cd ..

# Wait for server to start
sleep 2

# Check if server is running
if ! curl -s http://localhost:3001/events > /dev/null 2>&1; then
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server started successfully"

# Send test events
echo "📤 Sending test events..."

# Test event 1
python3 claude/hooks/send_event.py "TestApp" "pre_tool_use" '{"tool": "Bash", "params": {"command": "ls -la"}}' --no-summary

# Test event 2
python3 claude/hooks/send_event.py "TestApp" "post_tool_use" '{"tool": "Bash", "success": true, "result": "Files listed successfully"}' --no-summary

# Test event 3
python3 claude/hooks/send_event.py "AnotherApp" "stop" '{"reason": "completed", "duration": 120}' --no-summary

# Check events were stored
echo "📊 Checking database..."
EVENT_COUNT=$(sqlite3 server/db/events.db "SELECT COUNT(*) FROM events;" 2>/dev/null)

if [ "$EVENT_COUNT" -ge 3 ]; then
    echo "✅ Events stored successfully ($EVENT_COUNT events)"
else
    echo "❌ Events not stored properly (found $EVENT_COUNT events)"
fi

# Display recent events
echo ""
echo "📝 Recent events:"
sqlite3 -header -column server/db/events.db "SELECT id, timestamp, app, event_type FROM events ORDER BY id DESC LIMIT 5;" 2>/dev/null

# Instructions
echo ""
echo "🎯 Next steps:"
echo "1. Open client/index.html in your browser"
echo "2. You should see the test events in real-time"
echo "3. Try filtering and searching events"
echo ""
echo "Press Ctrl+C to stop the server..."

# Keep server running
wait $SERVER_PID