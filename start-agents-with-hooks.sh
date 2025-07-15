#!/bin/bash

# Start agents with hooks enabled
# This script demonstrates how to run agents with the new hooks system

echo "🚀 Starting Ez Aigent with Hooks System Enabled"
echo "=============================================="

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi

echo "✅ Redis is running"

# Set environment variables
export HOOKS_ENABLED=true
export HOOK_LOG_LEVEL=info
export NODE_ENV=development

# Create necessary directories
mkdir -p hooks/logs
mkdir -p .agent-memory/{claude,gpt,deepseek,mistral,gemini}

echo ""
echo "📋 Hook System Configuration:"
echo "   - Safety hooks: Enabled"
echo "   - Performance logging: Enabled"
echo "   - Predictive routing: Enabled"
echo "   - Analytics: Enabled"
echo ""

# Function to start an agent with hooks
start_agent_with_hooks() {
    local agent_type=$1
    local agent_id=$2
    local script_path=$3
    
    echo "Starting ${agent_type} agent (${agent_id}) with hooks..."
    
    # Check if enhanced hooks version exists
    if [ -f "agents/${agent_type}/enhanced-index-hooks.js" ]; then
        node "agents/${agent_type}/enhanced-index-hooks.js" &
        echo "✅ Started ${agent_type} with enhanced hooks support"
    elif [ -f "${script_path}" ]; then
        # Fallback to wrapped version with hooks environment variable
        HOOKS_ENABLED=true node "${script_path}" &
        echo "✅ Started ${agent_type} with basic hooks support"
    else
        echo "❌ Could not find agent script for ${agent_type}"
    fi
}

# Start orchestrator
echo "Starting orchestrator..."
node cli/runner.js &
ORCHESTRATOR_PID=$!
echo "✅ Orchestrator started (PID: $ORCHESTRATOR_PID)"

sleep 2

# Start agents with hooks
start_agent_with_hooks "claude" "claude_001" "agents/claude/wrapped-index.js"
sleep 1

start_agent_with_hooks "gpt" "gpt_001" "agents/gpt/wrapped-index.js"
sleep 1

start_agent_with_hooks "deepseek" "deepseek_001" "agents/deepseek/wrapped-index.js"
sleep 1

start_agent_with_hooks "mistral" "mistral_001" "agents/mistral/wrapped-index.js"
sleep 1

start_agent_with_hooks "gemini" "gemini_001" "agents/gemini/wrapped-index.js"

echo ""
echo "✅ All agents started with hooks enabled!"
echo ""
echo "📊 Monitoring Commands:"
echo "   - View hook executions: redis-cli PSUBSCRIBE 'hooks:*'"
echo "   - View security alerts: redis-cli PSUBSCRIBE 'security:alerts'"
echo "   - View agent logs: redis-cli PSUBSCRIBE 'logs:*'"
echo "   - View hook metrics: redis-cli HGETALL 'hook:metrics:*'"
echo ""
echo "🛑 To stop all agents: pkill -f 'node.*agent' && kill $ORCHESTRATOR_PID"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open dashboard at http://localhost:3000"
echo "   2. Monitor hook executions in real-time"
echo "   3. Configure hooks via dashboard or hooks/config/hooks.json"
echo "   4. View hook analytics and performance metrics"
echo ""

# Keep script running
echo "Press Ctrl+C to stop all agents..."
wait