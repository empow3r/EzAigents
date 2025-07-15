#!/bin/bash

# Ez Aigents Coordinated Startup Script
echo "🚀 Starting Ez Aigents with Coordination System..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Redis
if ! pgrep -f "redis-server" > /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not running. Starting Redis...${NC}"
    redis-server --daemonize yes
    sleep 2
fi

# Create logs directory
mkdir -p logs

echo -e "${BLUE}🤖 Starting AI Agents with Coordination...${NC}"

# Start Claude Agent (Architecture & Analysis)
echo -e "${GREEN}→ Starting Claude Agent...${NC}"
cd agents/claude
if [ -f "enhanced-coordinated-index.js" ]; then
    node enhanced-coordinated-index.js > ../../logs/claude.log 2>&1 &
else
    node enhanced-index.js > ../../logs/claude.log 2>&1 &
fi
CLAUDE_PID=$!
echo "  Claude PID: $CLAUDE_PID"
cd ../..

# Start GPT Agent (Backend Development)
echo -e "${GREEN}→ Starting GPT Agent...${NC}"
cd agents/gpt
node enhanced-index.js > ../../logs/gpt.log 2>&1 &
GPT_PID=$!
echo "  GPT PID: $GPT_PID"
cd ../..

# Start DeepSeek Agent (Testing)
echo -e "${GREEN}→ Starting DeepSeek Agent...${NC}"
cd agents/deepseek
node enhanced-index.js > ../../logs/deepseek.log 2>&1 &
DEEPSEEK_PID=$!
echo "  DeepSeek PID: $DEEPSEEK_PID"
cd ../..

# Start WebScraper Agent
echo -e "${GREEN}→ Starting WebScraper Agent...${NC}"
cd agents/webscraper
if [ -f "enhanced-coordinated-index.js" ]; then
    node enhanced-coordinated-index.js > ../../logs/webscraper.log 2>&1 &
else
    node enhanced-index.js > ../../logs/webscraper.log 2>&1 &
fi
WEBSCRAPER_PID=$!
echo "  WebScraper PID: $WEBSCRAPER_PID"
cd ../..

# Wait for agents to initialize
echo -e "${YELLOW}⏳ Waiting for agents to initialize...${NC}"
sleep 5

# Check agent status
echo -e "${BLUE}📊 Checking agent status...${NC}"
if [ -f "scripts/agent-health-monitor.sh" ]; then
    ./scripts/agent-health-monitor.sh status
fi

echo ""
echo -e "${GREEN}✅ Ez Aigents System Started!${NC}"
echo ""
echo -e "${BLUE}📊 Dashboard:${NC} http://localhost:3000"
echo -e "${BLUE}🔄 Refresh dashboard to see agents${NC}"
echo ""
echo "PIDs:"
echo "  Claude: $CLAUDE_PID"
echo "  GPT: $GPT_PID"
echo "  DeepSeek: $DEEPSEEK_PID"
echo "  WebScraper: $WEBSCRAPER_PID"
echo ""
echo "Monitor logs:"
echo "  tail -f logs/claude.log"
echo "  tail -f logs/gpt.log"
echo "  tail -f logs/deepseek.log"
echo "  tail -f logs/webscraper.log"
echo ""
echo "To stop all agents: pkill -f 'node.*enhanced.*index.js'"