#!/bin/bash

echo "🚀 Starting EzAigents System (Local Mode)..."

# Kill any existing Next.js processes
echo "🧹 Cleaning up existing processes..."
pkill -f "next dev" 2>/dev/null

# Check if Redis is running
if ! pgrep -f "redis-server" > /dev/null; then
    echo "⚠️  Redis not detected. Please start Redis first:"
    echo "    redis-server --port 6379"
    echo ""
    echo "Or with Docker:"
    echo "    docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi

echo "✅ Redis detected"

# Start dashboard
echo "🌐 Starting Dashboard..."
cd dashboard
npm run dev &
DASHBOARD_PID=$!

echo ""
echo "⏳ Waiting for dashboard to start..."
sleep 5

# Test if dashboard is accessible
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dashboard is running!"
else
    echo "❌ Dashboard failed to start. Check logs."
fi

echo ""
echo "🎉 EzAigents System Started!"
echo ""
echo "📊 Access Dashboard: http://localhost:3000"
echo "🩺 Health Check: http://localhost:3000/claude-doctor"
echo ""
echo "Dashboard PID: $DASHBOARD_PID"
echo ""
echo "To stop: kill $DASHBOARD_PID"