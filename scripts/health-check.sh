#!/bin/bash

# Ez Aigent Health Check Script
# Checks the health of all system components

set -e

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}

echo "🏥 Ez Aigent System Health Check"
echo "================================"
echo ""

# Check Redis
echo "🔍 Checking Redis..."
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
    
    # Get queue depths
    echo "📊 Queue Statistics:"
    for model in claude-3-opus gpt-4o deepseek-coder command-r-plus gemini-pro; do
        pending=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT llen "queue:$model" 2>/dev/null || echo 0)
        processing=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT llen "processing:$model" 2>/dev/null || echo 0)
        echo "  $model: $pending pending, $processing processing"
    done
else
    echo "❌ Redis is not accessible"
    exit 1
fi

echo ""

# Check Node.js processes
echo "🔍 Checking Agent Processes..."
agent_count=$(ps aux | grep -E "agent.*index.js|runner.js" | grep -v grep | wc -l || echo 0)
echo "  Found $agent_count agent processes running"

echo ""

# Check Dashboard
echo "🔍 Checking Dashboard..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Dashboard is accessible"
else
    echo "⚠️  Dashboard is not responding on port 3000"
fi

echo ""

# Check file outputs
echo "📁 Checking Output Directory..."
if [ -d "../src/output" ]; then
    file_count=$(find ../src/output -type f | wc -l || echo 0)
    echo "  Found $file_count output files"
else
    echo "⚠️  Output directory not found"
fi

echo ""

# Check Docker containers (if using Docker)
if command -v docker &> /dev/null; then
    echo "🐳 Checking Docker Containers..."
    container_count=$(docker ps --filter "name=ez-aigent" --format "table {{.Names}}\t{{.Status}}" | tail -n +2 | wc -l || echo 0)
    if [ $container_count -gt 0 ]; then
        echo "  Found $container_count Ez Aigent containers running:"
        docker ps --filter "name=ez-aigent" --format "table {{.Names}}\t{{.Status}}" | tail -n +2
    else
        echo "  No Ez Aigent containers found"
    fi
    echo ""
fi

# System resources
echo "💻 System Resources:"
echo "  CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "  Memory: $(free -h | awk '/^Mem:/ {print $3 " / " $2 " used"}')"
echo "  Disk: $(df -h . | awk 'NR==2 {print $3 " / " $2 " used (" $5 ")"}')"

echo ""
echo "✅ Health check complete!"
echo ""

# Optional: Start monitoring
read -p "Would you like to start real-time monitoring? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting monitor..."
    node ../cli/monitor-agents.js
fi