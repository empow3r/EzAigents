#!/bin/bash

# Ultra-fast startup script for EzAigents
echo "🚀 Starting EzAigents with performance optimizations..."

# Parallel service startup
start_service() {
    local service=$1
    local port=$2
    echo "Starting $service on port $port..."
    
    case $service in
        "redis")
            redis-server --daemonize yes --port $port &
            ;;
        "dashboard")
            cd dashboard && npm run build && npm start &
            ;;
        "agents")
            ./start-agents.sh &
            ;;
    esac
}

# Check and free ports in parallel
echo "🔧 Optimizing system resources..."
./scripts/port-check.sh free &
wait

# Start services in parallel
echo "🚀 Starting services..."
start_service "redis" 6379 &
sleep 2  # Give Redis time to start

start_service "dashboard" 3000 &
start_service "agents" &

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 5

# Health check
echo "🏥 Performing health checks..."
./scripts/agent-health-monitor.sh status

echo "✅ EzAigents started successfully!"
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 Monitor: ./scripts/agent-health-monitor.sh monitor"