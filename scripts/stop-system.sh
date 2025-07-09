#!/bin/bash

echo "🛑 Stopping Ez Aigent System..."

# Stop Node.js processes
pkill -f "cli/runner.js" || true
pkill -f "agents/" || true
pkill -f "dashboard/" || true

# Clean up PID files
rm -rf .pids

echo "✅ System stopped"
