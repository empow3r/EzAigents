#!/bin/bash

# Ez Aigent Multi-Agent Stop Script
echo "🛑 Stopping Ez Aigent Multi-Agent System..."

if [ -f .agent_pids ]; then
    PIDS=$(cat .agent_pids)
    IFS=',' read -ra PID_ARRAY <<< "$PIDS"
    
    for PID in "${PID_ARRAY[@]}"; do
        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping process $PID..."
            kill "$PID"
        fi
    done
    
    # Clean up PID file
    rm .agent_pids
    echo "✅ All agents stopped"
else
    echo "No PID file found. Attempting to stop by process name..."
    pkill -f "node.*agent"
    pkill -f "node.*runner"
    pkill -f "npm.*dev"
fi

# Stop Redis if it was started by the script
redis-cli shutdown > /dev/null 2>&1

echo "🎯 Ez Aigent system stopped"