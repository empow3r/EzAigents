#!/bin/bash

# Ez Aigent Full System Test Script
# This script demonstrates the complete agent communication system

echo "🚀 Ez Aigent Full System Test Starting..."
echo "================================================="

# Check if Redis is running
echo "🔍 Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   redis-server"
    echo "   OR"
    echo "   docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi
echo "✅ Redis is running"

# Function to start background process and track PID
start_process() {
    local name=$1
    local command=$2
    echo "🚀 Starting $name..."
    $command > /tmp/ez-aigent_$name.log 2>&1 &
    local pid=$!
    echo "$pid" > /tmp/ez-aigent_$name.pid
    echo "   PID: $pid"
    sleep 2
}

# Function to stop background process
stop_process() {
    local name=$1
    if [ -f /tmp/ez-aigent_$name.pid ]; then
        local pid=$(cat /tmp/ez-aigent_$name.pid)
        if kill -0 $pid 2>/dev/null; then
            echo "🛑 Stopping $name (PID: $pid)"
            kill $pid
            rm -f /tmp/ez-aigent_$name.pid
        fi
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up processes..."
    stop_process "dashboard"
    stop_process "claude_agent"
    stop_process "gpt_agent"
    stop_process "monitor"
    
    # Clean up Redis test data
    redis-cli DEL "agent:claude-test-001" > /dev/null 2>&1
    redis-cli DEL "agent:gpt-test-001" > /dev/null 2>&1
    redis-cli DEL "lock:*" > /dev/null 2>&1
    
    echo "✅ Cleanup complete"
}

# Set up trap for cleanup on exit
trap cleanup EXIT

echo ""
echo "📋 Step 1: Starting Core Services"
echo "================================="

# Start the dashboard
echo "🌐 Starting Dashboard..."
cd dashboard
npm run dev > /tmp/ez-aigent_dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "$DASHBOARD_PID" > /tmp/ez-aigent_dashboard.pid
echo "   Dashboard PID: $DASHBOARD_PID"
echo "   Dashboard URL: http://localhost:3001"
cd ..

# Wait for dashboard to start
sleep 5

echo ""
echo "🤖 Step 2: Starting AI Agents"
echo "=============================="

# Start Claude agent
echo "🧠 Starting Claude Agent..."
AGENT_ID="claude-test-001" MODEL="claude-3-opus" ROLE="refactor-core" node agents/claude/index.js > /tmp/ez-aigent_claude.log 2>&1 &
CLAUDE_PID=$!
echo "$CLAUDE_PID" > /tmp/ez-aigent_claude_agent.pid
echo "   Claude Agent PID: $CLAUDE_PID"

# Start GPT agent
echo "🤖 Starting GPT Agent..."
AGENT_ID="gpt-test-001" MODEL="gpt-4o" ROLE="backend-logic" node agents/gpt/index.js > /tmp/ez-aigent_gpt.log 2>&1 &
GPT_PID=$!
echo "$GPT_PID" > /tmp/ez-aigent_gpt_agent.pid
echo "   GPT Agent PID: $GPT_PID"

# Wait for agents to initialize
echo "⏳ Waiting for agents to initialize..."
sleep 5

echo ""
echo "📡 Step 3: Starting Monitor"
echo "=========================="

# Start the monitor in background
echo "📊 Starting Agent Monitor..."
node cli/agent-monitor-chat.js > /tmp/ez-aigent_monitor.log 2>&1 &
MONITOR_PID=$!
echo "$MONITOR_PID" > /tmp/ez-aigent_monitor.pid
echo "   Monitor PID: $MONITOR_PID"

sleep 2

echo ""
echo "🎭 Step 4: Running Demo Communications"
echo "===================================="

# Run the demo
echo "🎬 Running Agent Communication Demo..."
node cli/demo-agent-chat.js

echo ""
echo "✅ Demo completed!"

echo ""
echo "🎯 Step 5: Testing Direct Chat"
echo "=============================="

# Test direct chat functionality
echo "💬 Testing direct chat with agents..."

# Send a test message to Claude
echo "📤 Sending test message to Claude agent..."
redis-cli LPUSH "messages:claude-test-001" '{"type":"chat","from":"test-user","message":"Hello Claude! Can you help me with architecture design?","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}' > /dev/null

# Send a test message to GPT
echo "📤 Sending test message to GPT agent..."
redis-cli LPUSH "messages:gpt-test-001" '{"type":"chat","from":"test-user","message":"Hello GPT! I need help with backend API development.","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"}' > /dev/null

# Wait for responses
echo "⏳ Waiting for agent responses..."
sleep 3

echo ""
echo "📊 Step 6: System Status"
echo "======================"

# Check system status
echo "🔍 System Status:"
echo "   Redis: $(redis-cli ping 2>/dev/null || echo 'OFFLINE')"
echo "   Dashboard: http://localhost:3001"

# Check agent statuses
echo ""
echo "🤖 Agent Status:"
CLAUDE_STATUS=$(redis-cli HGET "agent:claude-test-001" "status" 2>/dev/null || echo "OFFLINE")
GPT_STATUS=$(redis-cli HGET "agent:gpt-test-001" "status" 2>/dev/null || echo "OFFLINE")
echo "   Claude Agent: $CLAUDE_STATUS"
echo "   GPT Agent: $GPT_STATUS"

# Check queue depths
echo ""
echo "📋 Queue Status:"
CLAUDE_QUEUE=$(redis-cli LLEN "queue:claude-3-opus" 2>/dev/null || echo "0")
GPT_QUEUE=$(redis-cli LLEN "queue:gpt-4o" 2>/dev/null || echo "0")
echo "   Claude Queue: $CLAUDE_QUEUE tasks"
echo "   GPT Queue: $GPT_QUEUE tasks"

# Check active locks
echo ""
echo "🔒 Active Locks:"
LOCKS=$(redis-cli KEYS "lock:*" 2>/dev/null | wc -l)
echo "   Active File Locks: $LOCKS"

echo ""
echo "🎉 Full System Test Complete!"
echo "=============================="
echo ""
echo "🌐 Access Points:"
echo "   Dashboard: http://localhost:3001"
echo "   Chat Tab: http://localhost:3001 (click 'Agent Chat' tab)"
echo ""
echo "💬 Test the Chat System:"
echo "   1. Open the dashboard in your browser"
echo "   2. Click on the 'Agent Chat' tab"
echo "   3. Select an agent and send messages"
echo "   4. Watch real-time agent communications"
echo ""
echo "🖥️  CLI Commands:"
echo "   npm run chat           # Simple chat interface"
echo "   npm run chat:monitor   # Advanced monitoring"
echo "   npm run chat:demo      # Run demo scenarios"
echo ""
echo "📊 Monitor Files:"
echo "   Dashboard logs: /tmp/ez-aigent_dashboard.log"
echo "   Claude logs: /tmp/ez-aigent_claude.log"
echo "   GPT logs: /tmp/ez-aigent_gpt.log"
echo "   Monitor logs: /tmp/ez-aigent_monitor.log"
echo ""
echo "Press Ctrl+C to stop all services and cleanup"
echo ""

# Keep the script running until interrupted
while true; do
    sleep 60
    
    # Check if processes are still running
    if ! kill -0 $DASHBOARD_PID 2>/dev/null; then
        echo "⚠️  Dashboard process died, restarting..."
        cd dashboard
        npm run dev > /tmp/ez-aigent_dashboard.log 2>&1 &
        DASHBOARD_PID=$!
        echo "$DASHBOARD_PID" > /tmp/ez-aigent_dashboard.pid
        cd ..
    fi
    
    if ! kill -0 $CLAUDE_PID 2>/dev/null; then
        echo "⚠️  Claude agent died, restarting..."
        AGENT_ID="claude-test-001" MODEL="claude-3-opus" ROLE="refactor-core" node agents/claude/index.js > /tmp/ez-aigent_claude.log 2>&1 &
        CLAUDE_PID=$!
        echo "$CLAUDE_PID" > /tmp/ez-aigent_claude_agent.pid
    fi
    
    if ! kill -0 $GPT_PID 2>/dev/null; then
        echo "⚠️  GPT agent died, restarting..."
        AGENT_ID="gpt-test-001" MODEL="gpt-4o" ROLE="backend-logic" node agents/gpt/index.js > /tmp/ez-aigent_gpt.log 2>&1 &
        GPT_PID=$!
        echo "$GPT_PID" > /tmp/ez-aigent_gpt_agent.pid
    fi
done