#!/usr/bin/env python3
"""
Simple Agent Event Stream Viewer
No external dependencies required
"""

import json
import threading
import time
from datetime import datetime
import urllib.request
from collections import defaultdict

# ANSI color codes
COLORS = {
    "openai": "\033[92m",      # Green
    "anthropic": "\033[94m",   # Blue  
    "custom": "\033[93m",      # Yellow
    "default": "\033[97m"      # White
}
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

class SimpleAgentStream:
    def __init__(self, server_url="http://localhost:3001"):
        self.server_url = server_url
        self.running = True
        self.stats = defaultdict(int)
        
    def fetch_events(self):
        """Fetch recent events from API"""
        try:
            req = urllib.request.Request(f"{self.server_url}/events?limit=10")
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read())
                return data
        except Exception as e:
            print(f"Error fetching events: {e}")
            return []
    
    def poll_events(self):
        """Poll for new events"""
        seen_ids = set()
        
        while self.running:
            try:
                events = self.fetch_events()
                
                for event in events:
                    event_id = event.get('id')
                    if event_id not in seen_ids:
                        seen_ids.add(event_id)
                        self.display_event(event)
                        
                        # Keep only last 100 IDs
                        if len(seen_ids) > 100:
                            seen_ids.pop()
                
                time.sleep(1)  # Poll every second
                
            except KeyboardInterrupt:
                self.running = False
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(5)
    
    def display_event(self, event):
        """Display a single event"""
        # Parse event data
        timestamp = datetime.fromisoformat(event.get('timestamp', '')).strftime('%H:%M:%S')
        app = event.get('app', 'unknown')
        event_type = event.get('event_type', 'unknown')
        summary = event.get('summary', '')
        
        # Get agent type from payload
        payload = event.get('payload', {})
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except:
                payload = {}
        
        agent_type = payload.get('agent_type', 'default')
        color = COLORS.get(agent_type, COLORS['default'])
        
        # Update stats
        self.stats['total'] += 1
        self.stats[event_type] += 1
        
        # Format output
        print(f"{DIM}{timestamp}{RESET} {color}{BOLD}[{app}]{RESET} {event_type}", end='')
        if summary:
            print(f" - {DIM}{summary}{RESET}")
        else:
            print()
    
    def show_header(self):
        """Show stream header"""
        print(f"\n{BOLD}🚀 LIVE AGENT EVENT STREAM (Simple Mode){RESET}")
        print(f"{DIM}{'='*60}{RESET}")
        print(f"Server: {self.server_url}")
        print(f"Press Ctrl+C to exit")
        print(f"{DIM}{'='*60}{RESET}\n")
    
    def show_stats(self):
        """Show statistics"""
        print(f"\n{BOLD}📊 Session Statistics:{RESET}")
        print(f"Total events: {self.stats['total']}")
        print(f"\nEvent breakdown:")
        for event_type, count in sorted(self.stats.items()):
            if event_type != 'total':
                print(f"  {event_type}: {count}")
    
    def run(self):
        """Run the stream viewer"""
        self.show_header()
        
        try:
            self.poll_events()
        except KeyboardInterrupt:
            pass
        finally:
            self.show_stats()
            print(f"\n{BOLD}Stream stopped.{RESET}")


def main():
    """Main entry point"""
    import sys
    
    server_url = "http://localhost:3001"
    if len(sys.argv) > 1:
        server_url = sys.argv[1]
    
    stream = SimpleAgentStream(server_url)
    stream.run()


if __name__ == "__main__":
    main()