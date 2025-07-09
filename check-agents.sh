#!/bin/bash

# Ez Aigent Agent Status Check Script
echo "🔍 Checking Ez Aigent Agent Status..."

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not running"
fi

# Check if PID file exists
if [ -f .agent_pids ]; then
    PIDS=$(cat .agent_pids)
    IFS=',' read -ra PID_ARRAY <<< "$PIDS"
    
    SERVICES=("Runner" "Claude" "GPT" "DeepSeek" "Mistral" "Gemini" "Dashboard")
    
    for i in "${!PID_ARRAY[@]}"; do
        PID=${PID_ARRAY[i]}
        SERVICE=${SERVICES[i]}
        
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ $SERVICE: Running (PID: $PID)"
        else
            echo "❌ $SERVICE: Not running"
        fi
    done
else
    echo "❌ No PID file found - agents may not be running"
fi

# Check Redis queue status
echo ""
echo "📊 Redis Queue Status:"
redis-cli -c "LLEN queue:claude-3-opus" 2>/dev/null && echo "Claude queue: $(redis-cli LLEN queue:claude-3-opus) tasks" || echo "Claude queue: 0 tasks"
redis-cli -c "LLEN queue:gpt-4o" 2>/dev/null && echo "GPT queue: $(redis-cli LLEN queue:gpt-4o) tasks" || echo "GPT queue: 0 tasks"
redis-cli -c "LLEN queue:deepseek-coder" 2>/dev/null && echo "DeepSeek queue: $(redis-cli LLEN queue:deepseek-coder) tasks" || echo "DeepSeek queue: 0 tasks"
redis-cli -c "LLEN queue:command-r-plus" 2>/dev/null && echo "Mistral queue: $(redis-cli LLEN queue:command-r-plus) tasks" || echo "Mistral queue: 0 tasks"