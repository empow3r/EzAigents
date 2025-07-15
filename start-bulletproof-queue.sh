#!/bin/bash

# Bulletproof Queue System Startup Script
# Starts all components of the enhanced queue system

set -e

echo "🚀 Starting Bulletproof Queue System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Redis
echo -e "${YELLOW}Checking Redis connection...${NC}"
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${RED}❌ Redis is not running. Please start Redis first.${NC}"
    echo "Run: docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi
echo -e "${GREEN}✓ Redis is running${NC}"

# Create necessary directories
mkdir -p logs/transactions
mkdir -p .agent-memory

# Function to start a service
start_service() {
    local name=$1
    local command=$2
    local log_file="logs/${name}.log"
    
    echo -e "${YELLOW}Starting ${name}...${NC}"
    
    if [ -f ".${name}.pid" ]; then
        old_pid=$(cat .${name}.pid)
        if kill -0 $old_pid 2>/dev/null; then
            echo -e "${YELLOW}${name} is already running (PID: $old_pid)${NC}"
            return
        fi
    fi
    
    nohup $command > "$log_file" 2>&1 &
    pid=$!
    echo $pid > .${name}.pid
    
    # Wait a moment to check if process started successfully
    sleep 2
    
    if kill -0 $pid 2>/dev/null; then
        echo -e "${GREEN}✓ ${name} started (PID: $pid)${NC}"
    else
        echo -e "${RED}❌ Failed to start ${name}${NC}"
        tail -n 20 "$log_file"
        exit 1
    fi
}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Clear old logs
echo -e "${YELLOW}Clearing old logs...${NC}"
find logs -name "*.log" -mtime +7 -delete 2>/dev/null || true

# Start core services
echo -e "\n${YELLOW}Starting Core Services...${NC}"

# 1. Orchestrator Agent
start_service "orchestrator" "node agents/orchestrator/index.js"

# 2. Queue Health Monitor
start_service "health-monitor" "node cli/queue-health-monitor.js"

# 3. DLQ Manager
start_service "dlq-manager" "node cli/dlq-manager.js"

# 4. Transaction Logger
start_service "transaction-logger" "node cli/transaction-logger.js"

# Wait for core services to initialize
echo -e "\n${YELLOW}Waiting for services to initialize...${NC}"
sleep 5

# Start agents (if requested)
if [ "$1" == "--with-agents" ]; then
    echo -e "\n${YELLOW}Starting Agents...${NC}"
    
    # Enhanced Claude Agent
    AGENT_ID=claude_001 CLAUDE_API_KEY=$CLAUDE_API_KEY \
        start_service "claude-agent" "node agents/claude/enhanced-index.js"
    
    # You can add more agents here
    # AGENT_ID=gpt_001 OPENAI_API_KEY=$OPENAI_API_KEY \
    #     start_service "gpt-agent" "node agents/gpt/enhanced-index.js"
fi

# Start dashboard (if requested)
if [ "$1" == "--with-dashboard" ] || [ "$2" == "--with-dashboard" ]; then
    echo -e "\n${YELLOW}Starting Dashboard...${NC}"
    cd dashboard
    npm run dev > ../logs/dashboard.log 2>&1 &
    dashboard_pid=$!
    echo $dashboard_pid > ../.dashboard.pid
    cd ..
    echo -e "${GREEN}✓ Dashboard starting on http://localhost:3000${NC}"
fi

# Health check
echo -e "\n${YELLOW}Performing health check...${NC}"
sleep 3

# Check if orchestrator is healthy
if redis-cli get "orchestrator:status" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Orchestrator is healthy${NC}"
else
    echo -e "${RED}❌ Orchestrator health check failed${NC}"
fi

# Display status
echo -e "\n${GREEN}🎉 Bulletproof Queue System Started Successfully!${NC}"
echo -e "\nRunning Services:"
echo -e "  • Orchestrator Agent"
echo -e "  • Queue Health Monitor"
echo -e "  • DLQ Manager"
echo -e "  • Transaction Logger"

if [ "$1" == "--with-agents" ]; then
    echo -e "  • Claude Agent"
fi

if [ "$1" == "--with-dashboard" ] || [ "$2" == "--with-dashboard" ]; then
    echo -e "  • Dashboard (http://localhost:3000)"
fi

echo -e "\n${YELLOW}Monitoring:${NC}"
echo -e "  • Logs: tail -f logs/*.log"
echo -e "  • Redis: redis-cli monitor"
echo -e "  • Dashboard: http://localhost:3000/orchestrator"

echo -e "\n${YELLOW}Commands:${NC}"
echo -e "  • Stop all: ./stop-bulletproof-queue.sh"
echo -e "  • Test: node test-bulletproof-queue.js"
echo -e "  • Status: ./status-bulletproof-queue.sh"

# Save startup time
date > .bulletproof-queue-started

echo -e "\n${GREEN}Ready for bulletproof queue operations!${NC}"