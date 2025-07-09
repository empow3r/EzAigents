#!/bin/bash

# Ez Aigent Multi-Agent Startup Script
echo "🚀 Starting Ez Aigent Multi-Agent System..."

# Load environment variables
export $(cat .env | xargs)

# Start Redis server
echo "📦 Starting Redis server..."
redis-server --daemonize yes --port 6379

# Wait for Redis to be ready
sleep 2

# Test Redis connection
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis server is running"
else
    echo "❌ Redis server failed to start"
    exit 1
fi

# Start the orchestrator/runner
echo "🎯 Starting orchestrator..."
cd cli
node runner.js &
RUNNER_PID=$!
echo "Orchestrator PID: $RUNNER_PID"
cd ..

# Start agents in background
echo "🤖 Starting Claude agent..."
cd agents/claude
node index.js &
CLAUDE_PID=$!
echo "Claude agent PID: $CLAUDE_PID"
cd ../..

echo "🤖 Starting GPT agent..."
cd agents/gpt
node index.js &
GPT_PID=$!
echo "GPT agent PID: $GPT_PID"
cd ../..

echo "🤖 Starting DeepSeek agent..."
cd agents/deepseek
node index.js &
DEEPSEEK_PID=$!
echo "DeepSeek agent PID: $DEEPSEEK_PID"
cd ../..

echo "🤖 Starting Mistral agent..."
cd agents/mistral
node index.js &
MISTRAL_PID=$!
echo "Mistral agent PID: $MISTRAL_PID"
cd ../..

echo "🤖 Starting Gemini agent..."
cd agents/gemini
node index.js &
GEMINI_PID=$!
echo "Gemini agent PID: $GEMINI_PID"
cd ../..

# Start dashboard
echo "📊 Starting dashboard..."
cd dashboard
npm run dev &
DASHBOARD_PID=$!
echo "Dashboard PID: $DASHBOARD_PID"
cd ..

# Save PIDs for cleanup
echo "$RUNNER_PID,$CLAUDE_PID,$GPT_PID,$DEEPSEEK_PID,$MISTRAL_PID,$GEMINI_PID,$DASHBOARD_PID" > .agent_pids

echo ""
echo "🎉 Ez Aigent system started successfully!"
echo "📊 Dashboard: http://localhost:3000"
echo "📦 Redis: localhost:6379"
echo ""
echo "To stop all agents, run: ./stop-agents.sh"
echo "To check agent status: ./check-agents.sh"
echo "To enqueue tasks: cd cli && node enqueue.js"
echo ""
echo "Agent PIDs saved to .agent_pids"