#!/bin/bash

# Simple Agent Health Monitor
# Basic status checking for deployment readiness

echo "🤖 Ez Aigent System Status - $(date)"
echo "=================================="

# Check Redis
if docker ps --filter "name=ezaigents-redis" --filter "status=running" | grep -q ezaigents-redis; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not running"
    exit 1
fi

# Check Agents
echo ""
echo "📊 Agent Status:"
echo "----------------"

agents=("claude" "gpt" "gemini")
healthy_count=0
total_count=0

for agent in "${agents[@]}"; do
    total_count=$((total_count + 1))
    if docker ps --filter "name=ezaigents-$agent" --filter "status=running" | grep -q "ezaigents-$agent"; then
        echo "✅ $agent: Running"
        healthy_count=$((healthy_count + 1))
    else
        echo "❌ $agent: Not running"
    fi
done

echo ""
echo "📈 Summary:"
echo "  Total Agents: $total_count"
echo "  Healthy: $healthy_count"
echo "  Unhealthy: $((total_count - healthy_count))"

# Check Dashboard
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Dashboard: Accessible"
else
    echo "⚠️ Dashboard: Not accessible"
fi

# Overall Status
if [ "$healthy_count" -eq "$total_count" ] && docker ps --filter "name=ezaigents-redis" --filter "status=running" | grep -q ezaigents-redis; then
    echo ""
    echo "🎉 System Status: READY FOR DEPLOYMENT"
    exit 0
else
    echo ""
    echo "⚠️ System Status: NEEDS ATTENTION"
    exit 1
fi