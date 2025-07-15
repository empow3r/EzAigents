#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# ///

import sys
import json
import os
from pathlib import Path

# Import send_event from the same directory
sys.path.insert(0, str(Path(__file__).parent))
from send_event import send_event

def main():
    # Claude Code passes hook data via stdin
    hook_data = json.loads(sys.stdin.read())
    
    # Get app name from environment or use default
    app_name = os.environ.get("CLAUDE_APP_NAME", "EzAigents")
    
    # Extract session information
    session_info = {
        "reason": hook_data.get("reason", "unknown"),
        "duration": hook_data.get("duration"),
        "tools_used": hook_data.get("tools_used", []),
        "final_state": hook_data.get("final_state", {})
    }
    
    # Send event
    send_event(
        app=app_name,
        event_type="stop",
        payload={
            "session_info": session_info,
            "hook_data": hook_data
        },
        summarize=True
    )

if __name__ == "__main__":
    main()