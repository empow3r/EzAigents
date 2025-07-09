#!/bin/bash

echo "🚀 Ez Aigent System Status"
echo "========================="
echo "Timestamp: $(date)"
echo ""

# Check Redis
if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not running"
fi

# Check if orchestrator is running
if pgrep -f "cli/runner.js" > /dev/null; then
    echo "✅ Orchestrator: Running"
else
    echo "❌ Orchestrator: Not running"
fi

# Check queue status
if redis-cli ping &> /dev/null; then
    echo ""
    echo "Queue Status:"
    for model in claude-3-opus gpt-4o deepseek-coder; do
        count=$(redis-cli LLEN "queue:$model" 2>/dev/null || echo "0")
        echo "  $model: $count tasks"
    done
fi

echo ""
echo "System ready for AI-powered orchestration! 🧠✨"
