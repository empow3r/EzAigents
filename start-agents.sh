#!/bin/bash

# Ez Aigents Startup Script
echo "🚀 Starting Ez Aigents System..."

# Check if Redis is running
if ! pgrep -f "redis-server" > /dev/null; then
    echo "⚠️  Redis not detected. Starting Redis..."
    redis-server --daemonize yes --port 6379
    sleep 2
fi

# Start agents in background
echo "🤖 Starting AI Agents..."

# Start Claude Agent
echo "  → Starting Claude Agent..."
cd agents/claude && node wrapped-index.js > logs/claude.log 2>&1 &
CLAUDE_PID=$!
echo "    Claude PID: $CLAUDE_PID"

# Start GPT Agent  
echo "  → Starting GPT Agent..."
cd ../gpt && node wrapped-index.js > logs/gpt.log 2>&1 &
GPT_PID=$!
echo "    GPT PID: $GPT_PID"

# Start DeepSeek Agent
echo "  → Starting DeepSeek Agent..."
cd ../deepseek && node wrapped-index.js > logs/deepseek.log 2>&1 &
DEEPSEEK_PID=$!
echo "    DeepSeek PID: $DEEPSEEK_PID"

# Back to root
cd ../../

# Start API Key Manager
echo "🔑 Starting API Key Manager..."
node cli/api-key-manager.js start > cli/logs/api-key-manager.log 2>&1 &
API_MANAGER_PID=$!
echo "    API Manager PID: $API_MANAGER_PID"

# Start Dashboard
echo "🌐 Starting Dashboard..."
cd dashboard && npm run dev > logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo "    Dashboard PID: $DASHBOARD_PID"

echo ""
echo "✅ Ez Aigents System Started!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🩺 Health Check: http://localhost:3000/claude-doctor"
echo "📈 Queue Stats: http://localhost:3000/api/queue-stats"
echo ""
echo "PIDs:"
echo "  Claude: $CLAUDE_PID"
echo "  GPT: $GPT_PID" 
echo "  DeepSeek: $DEEPSEEK_PID"
echo "  API Manager: $API_MANAGER_PID"
echo "  Dashboard: $DASHBOARD_PID"
echo ""
echo "To stop all services: pkill -f 'node.*wrapped-index.js'"