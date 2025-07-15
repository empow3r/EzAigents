#!/usr/bin/env python3
import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

def send_event(app, event_type, payload):
    """Send event using only standard library."""
    url = "http://localhost:3001/events"
    
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "app": app,
        "session_id": "test-session",
        "event_type": event_type,
        "payload": payload
    }
    
    data = json.dumps(event).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json'
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read())
            print(f"✅ Event sent: {result}")
            return True
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False

# Send test events
print("📤 Sending test events...")

send_event("Claude-Agent-1", "pre_tool_use", {
    "tool": "Bash",
    "params": {"command": "npm install", "timeout": 60000}
})

send_event("Claude-Agent-1", "post_tool_use", {
    "tool": "Bash",
    "success": True,
    "result": "All dependencies installed successfully"
})

send_event("GPT-Agent-2", "pre_tool_use", {
    "tool": "Edit",
    "params": {"file_path": "/src/api.js", "changes": "Added authentication"}
})

send_event("Claude-Agent-1", "stop", {
    "reason": "Task completed",
    "duration": 120,
    "files_modified": 5
})

print("✅ Test events sent!")