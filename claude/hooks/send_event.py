#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "httpx",
#     "anthropic",
# ]
# ///

import json
import os
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx
import anthropic

# Configuration
SERVER_URL = os.environ.get("OBSERVABILITY_SERVER_URL", "http://localhost:3001")
CLAUDE_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
SESSION_ID = os.environ.get("CLAUDE_SESSION_ID", "default")

def generate_summary(event_type: str, payload: Dict[str, Any]) -> Optional[str]:
    """Generate a concise summary using Claude Haiku."""
    if not CLAUDE_API_KEY:
        return None
    
    try:
        client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
        
        prompt = f"""Summarize this Claude Code event in one sentence:
Event Type: {event_type}
Payload: {json.dumps(payload, indent=2)}

Summary:"""
        
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text.strip()
    except Exception as e:
        print(f"Summary generation failed: {e}", file=sys.stderr)
        return None

def send_event(
    app: str,
    event_type: str,
    payload: Dict[str, Any],
    summarize: bool = True
) -> bool:
    """Send an event to the observability server."""
    
    # Build event
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "app": app,
        "session_id": SESSION_ID,
        "event_type": event_type,
        "summary": None,
        "payload": payload
    }
    
    # Generate summary if requested
    if summarize:
        event["summary"] = generate_summary(event_type, payload)
    
    # Send to server
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(f"{SERVER_URL}/events", json=event)
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Failed to send event: {e}", file=sys.stderr)
        return False

# CLI usage
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: send_event.py <app> <event_type> <payload_json> [--no-summary]")
        sys.exit(1)
    
    app = sys.argv[1]
    event_type = sys.argv[2]
    payload = json.loads(sys.argv[3])
    summarize = "--no-summary" not in sys.argv
    
    success = send_event(app, event_type, payload, summarize)
    sys.exit(0 if success else 1)