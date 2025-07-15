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
    
    # Extract relevant information
    tool_name = hook_data.get("tool", {}).get("name", "unknown")
    tool_params = hook_data.get("tool", {}).get("params", {})
    
    # Get app name from environment or use default
    app_name = os.environ.get("CLAUDE_APP_NAME", "EzAigents")
    
    # Send event
    send_event(
        app=app_name,
        event_type="pre_tool_use",
        payload={
            "tool": tool_name,
            "params": tool_params,
            "hook_data": hook_data
        },
        summarize=True
    )

if __name__ == "__main__":
    main()