#!/usr/bin/env python3
"""
Live Agent Event Stream - Terminal UI
Real-time visualization of all agent activities
"""

import asyncio
import websockets
import json
import sys
import os
from datetime import datetime
from collections import defaultdict
import curses
from typing import List, Dict, Any
import argparse
import threading
import queue

# ANSI color codes for different agent types
AGENT_COLORS = {
    "openai": "\033[92m",      # Green
    "anthropic": "\033[94m",   # Blue
    "google": "\033[93m",      # Yellow
    "cohere": "\033[95m",      # Magenta
    "mistral": "\033[96m",     # Cyan
    "deepseek": "\033[91m",    # Red
    "langchain": "\033[97m",   # White
    "custom": "\033[90m",      # Gray
    "unknown": "\033[37m"      # Default
}

EVENT_TYPE_ICONS = {
    "llm_request": "🤖",
    "llm_response": "💬",
    "tool_use": "🔧",
    "function_call_start": "▶️",
    "function_call_complete": "✅",
    "function_call_error": "❌",
    "error": "🚨",
    "token_usage": "🪙",
    "test": "🧪",
    "pre_tool_use": "🔨",
    "post_tool_use": "✔️",
    "stop": "🛑",
    "custom": "📌"
}

RESET_COLOR = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"


class AgentEventStream:
    def __init__(self, server_url: str = "ws://localhost:3001/ws"):
        self.server_url = server_url
        self.events = []
        self.stats = defaultdict(int)
        self.agent_stats = defaultdict(lambda: defaultdict(int))
        self.event_queue = queue.Queue()
        self.running = True
        self.filter_app = None
        self.filter_type = None
        self.show_details = False
        self.pause = False
        
    async def connect_and_stream(self):
        """Connect to WebSocket and stream events"""
        while self.running:
            try:
                async with websockets.connect(self.server_url) as websocket:
                    print(f"{BOLD}🌐 Connected to observability server{RESET_COLOR}")
                    
                    # Handle incoming messages
                    async for message in websocket:
                        if not self.running:
                            break
                            
                        try:
                            data = json.loads(message)
                            self.handle_message(data)
                        except json.JSONDecodeError:
                            print(f"{AGENT_COLORS['unknown']}Invalid message received{RESET_COLOR}")
                            
            except websockets.exceptions.ConnectionClosed:
                print(f"{AGENT_COLORS['unknown']}Connection lost. Reconnecting...{RESET_COLOR}")
                await asyncio.sleep(2)
            except Exception as e:
                print(f"{AGENT_COLORS['unknown']}Error: {e}{RESET_COLOR}")
                await asyncio.sleep(5)
    
    def handle_message(self, data: Dict[str, Any]):
        """Handle incoming WebSocket message"""
        if data.get("type") == "init":
            # Initial data load
            for event in data.get("events", []):
                self.process_event(event)
        elif data.get("type") == "event":
            # New event
            self.process_event(data.get("data", {}))
    
    def process_event(self, event: Dict[str, Any]):
        """Process and display an event"""
        if self.pause:
            return
            
        # Apply filters
        if self.filter_app and event.get("app") != self.filter_app:
            return
        if self.filter_type and event.get("event_type") != self.filter_type:
            return
        
        # Update stats
        self.stats["total"] += 1
        self.stats[event.get("event_type", "unknown")] += 1
        
        agent_type = event.get("payload", {}).get("agent_type", "unknown")
        self.agent_stats[event.get("app", "unknown")][agent_type] += 1
        
        # Add to queue for display
        self.event_queue.put(event)
        
        # Keep only last 1000 events in memory
        self.events.append(event)
        if len(self.events) > 1000:
            self.events.pop(0)
    
    def format_event(self, event: Dict[str, Any]) -> str:
        """Format event for terminal display"""
        timestamp = datetime.fromisoformat(event.get("timestamp", "")).strftime("%H:%M:%S")
        app = event.get("app", "unknown")
        event_type = event.get("event_type", "unknown")
        summary = event.get("summary", "")
        
        # Get agent type and color
        agent_type = event.get("payload", {}).get("agent_type", "unknown")
        color = AGENT_COLORS.get(agent_type, AGENT_COLORS["unknown"])
        
        # Get event icon
        icon = EVENT_TYPE_ICONS.get(event_type, "📍")
        
        # Build formatted line
        line = f"{DIM}{timestamp}{RESET_COLOR} "
        line += f"{color}{BOLD}[{app}]{RESET_COLOR} "
        line += f"{icon} {event_type}"
        
        if summary:
            line += f" - {DIM}{summary}{RESET_COLOR}"
        
        if self.show_details and event.get("payload"):
            # Show first level of payload
            payload = event.get("payload", {})
            details = []
            for key, value in list(payload.items())[:3]:  # Show first 3 items
                if key != "agent_type":
                    details.append(f"{key}={str(value)[:50]}")
            if details:
                line += f"\n    {DIM}{' | '.join(details)}{RESET_COLOR}"
        
        return line
    
    def print_header(self):
        """Print stream header"""
        print(f"\n{BOLD}🚀 LIVE AGENT EVENT STREAM{RESET_COLOR}")
        print(f"{DIM}{'=' * 80}{RESET_COLOR}")
        print(f"Server: {self.server_url}")
        print(f"Press Ctrl+C to exit | 'd' for details | 'p' to pause | 'f' to filter")
        print(f"{DIM}{'=' * 80}{RESET_COLOR}\n")
    
    def print_stats(self):
        """Print statistics summary"""
        print(f"\n{BOLD}📊 Statistics:{RESET_COLOR}")
        print(f"Total events: {self.stats['total']}")
        
        # Event type breakdown
        print(f"\n{BOLD}Event Types:{RESET_COLOR}")
        for event_type, count in sorted(self.stats.items()):
            if event_type != "total":
                icon = EVENT_TYPE_ICONS.get(event_type, "📍")
                print(f"  {icon} {event_type}: {count}")
        
        # Agent breakdown
        print(f"\n{BOLD}Active Agents:{RESET_COLOR}")
        for app, types in self.agent_stats.items():
            total = sum(types.values())
            print(f"  {app}: {total} events")
            for agent_type, count in types.items():
                color = AGENT_COLORS.get(agent_type, AGENT_COLORS["unknown"])
                print(f"    {color}└─ {agent_type}: {count}{RESET_COLOR}")
    
    def run_display_thread(self):
        """Run the display thread"""
        while self.running:
            try:
                # Get event from queue (timeout to check running status)
                event = self.event_queue.get(timeout=0.1)
                print(self.format_event(event))
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Display error: {e}")
    
    async def run_interactive(self):
        """Run with interactive controls"""
        # Start display thread
        display_thread = threading.Thread(target=self.run_display_thread)
        display_thread.daemon = True
        display_thread.start()
        
        # Start WebSocket connection
        stream_task = asyncio.create_task(self.connect_and_stream())
        
        # Handle user input
        try:
            while self.running:
                await asyncio.sleep(0.1)
                # In a real implementation, you'd handle keyboard input here
                # For now, just keep running
        except KeyboardInterrupt:
            print(f"\n\n{BOLD}Shutting down...{RESET_COLOR}")
            self.running = False
            await stream_task
            self.print_stats()


class CursesAgentStream:
    """Advanced curses-based UI for agent event streaming"""
    
    def __init__(self, server_url: str = "ws://localhost:3001/ws"):
        self.server_url = server_url
        self.events = []
        self.stats = defaultdict(int)
        self.agent_stats = defaultdict(lambda: defaultdict(int))
        self.running = True
        self.filter_app = None
        self.filter_type = None
        self.show_details = False
        self.pause = False
        self.selected_index = 0
        
    def run(self, stdscr):
        """Run the curses UI"""
        # Setup
        curses.curs_set(0)  # Hide cursor
        stdscr.nodelay(1)   # Non-blocking input
        stdscr.timeout(100) # Refresh every 100ms
        
        # Define color pairs
        curses.start_color()
        curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)
        curses.init_pair(2, curses.COLOR_BLUE, curses.COLOR_BLACK)
        curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK)
        curses.init_pair(4, curses.COLOR_MAGENTA, curses.COLOR_BLACK)
        curses.init_pair(5, curses.COLOR_CYAN, curses.COLOR_BLACK)
        curses.init_pair(6, curses.COLOR_RED, curses.COLOR_BLACK)
        curses.init_pair(7, curses.COLOR_WHITE, curses.COLOR_BLACK)
        
        # Start async event loop in thread
        loop = asyncio.new_event_loop()
        async_thread = threading.Thread(
            target=self._run_async_loop,
            args=(loop,)
        )
        async_thread.daemon = True
        async_thread.start()
        
        # Main UI loop
        while self.running:
            try:
                self.draw_ui(stdscr)
                self.handle_input(stdscr)
            except KeyboardInterrupt:
                self.running = False
            except Exception as e:
                # Log error but continue
                pass
    
    def _run_async_loop(self, loop):
        """Run async event loop in thread"""
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.connect_and_stream())
    
    async def connect_and_stream(self):
        """Connect to WebSocket and stream events"""
        while self.running:
            try:
                async with websockets.connect(self.server_url) as websocket:
                    async for message in websocket:
                        if not self.running:
                            break
                        try:
                            data = json.loads(message)
                            if data.get("type") == "event":
                                event = data.get("data", {})
                                self.events.append(event)
                                self.update_stats(event)
                                # Keep only last 500 events
                                if len(self.events) > 500:
                                    self.events.pop(0)
                        except:
                            pass
            except:
                await asyncio.sleep(2)
    
    def update_stats(self, event):
        """Update statistics"""
        self.stats["total"] += 1
        self.stats[event.get("event_type", "unknown")] += 1
        agent_type = event.get("payload", {}).get("agent_type", "unknown")
        self.agent_stats[event.get("app", "unknown")][agent_type] += 1
    
    def draw_ui(self, stdscr):
        """Draw the UI"""
        height, width = stdscr.getmaxyx()
        stdscr.clear()
        
        # Header
        header = "🚀 LIVE AGENT EVENT STREAM"
        stdscr.addstr(0, (width - len(header)) // 2, header, curses.A_BOLD)
        
        # Stats bar
        stats_line = f"Total: {self.stats['total']} | "
        stats_line += f"Agents: {len(self.agent_stats)} | "
        if self.pause:
            stats_line += "PAUSED"
        stdscr.addstr(1, 0, stats_line)
        
        # Events area
        event_start_y = 3
        event_height = height - event_start_y - 3
        
        # Display events
        visible_events = self.events[-event_height:]
        for i, event in enumerate(visible_events):
            y = event_start_y + i
            if y >= height - 3:
                break
            
            # Format event line
            timestamp = datetime.fromisoformat(event.get("timestamp", "")).strftime("%H:%M:%S")
            app = event.get("app", "unknown")[:20]
            event_type = event.get("event_type", "unknown")
            icon = EVENT_TYPE_ICONS.get(event_type, "📍")
            
            line = f"{timestamp} [{app}] {icon} {event_type}"
            
            # Add summary if available
            summary = event.get("summary", "")
            if summary:
                remaining_width = width - len(line) - 3
                if len(summary) > remaining_width:
                    summary = summary[:remaining_width-3] + "..."
                line += f" - {summary}"
            
            # Truncate if too long
            if len(line) > width - 1:
                line = line[:width-4] + "..."
            
            # Get color based on agent type
            agent_type = event.get("payload", {}).get("agent_type", "unknown")
            color_map = {
                "openai": 1, "anthropic": 2, "google": 3,
                "cohere": 4, "mistral": 5, "deepseek": 6,
                "langchain": 7, "custom": 7, "unknown": 7
            }
            color = curses.color_pair(color_map.get(agent_type, 7))
            
            stdscr.addstr(y, 0, line, color)
        
        # Footer
        footer = "q:Quit | p:Pause | d:Details | f:Filter | s:Stats"
        stdscr.addstr(height-1, 0, footer, curses.A_DIM)
        
        stdscr.refresh()
    
    def handle_input(self, stdscr):
        """Handle keyboard input"""
        key = stdscr.getch()
        
        if key == ord('q'):
            self.running = False
        elif key == ord('p'):
            self.pause = not self.pause
        elif key == ord('d'):
            self.show_details = not self.show_details
        elif key == ord('s'):
            self.show_stats_window(stdscr)
    
    def show_stats_window(self, stdscr):
        """Show statistics in a popup window"""
        height, width = stdscr.getmaxyx()
        
        # Create window
        win_height = min(20, height - 4)
        win_width = min(60, width - 4)
        win = curses.newwin(win_height, win_width, 2, 2)
        win.box()
        
        # Title
        win.addstr(0, 2, " Statistics ", curses.A_BOLD)
        
        # Content
        y = 2
        win.addstr(y, 2, f"Total Events: {self.stats['total']}")
        y += 2
        
        # Event types
        win.addstr(y, 2, "Event Types:", curses.A_BOLD)
        y += 1
        for event_type, count in sorted(self.stats.items())[:8]:
            if event_type != "total":
                win.addstr(y, 4, f"{event_type}: {count}")
                y += 1
        
        y += 1
        # Agents
        win.addstr(y, 2, "Active Agents:", curses.A_BOLD)
        y += 1
        for app, types in list(self.agent_stats.items())[:5]:
            total = sum(types.values())
            win.addstr(y, 4, f"{app}: {total}")
            y += 1
        
        win.addstr(win_height-2, 2, "Press any key to close")
        win.refresh()
        win.getch()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Live Agent Event Stream")
    parser.add_argument("--server", default="ws://localhost:3001/ws",
                       help="WebSocket server URL")
    parser.add_argument("--curses", action="store_true",
                       help="Use advanced curses UI")
    parser.add_argument("--filter-app", help="Filter by app name")
    parser.add_argument("--filter-type", help="Filter by event type")
    
    args = parser.parse_args()
    
    if args.curses:
        # Run curses UI
        stream = CursesAgentStream(args.server)
        curses.wrapper(stream.run)
    else:
        # Run simple terminal UI
        stream = AgentEventStream(args.server)
        stream.filter_app = args.filter_app
        stream.filter_type = args.filter_type
        stream.print_header()
        
        try:
            asyncio.run(stream.run_interactive())
        except KeyboardInterrupt:
            print(f"\n\n{BOLD}Stream stopped.{RESET_COLOR}")


if __name__ == "__main__":
    main()