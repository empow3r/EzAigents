#!/bin/bash

# Ez Aigent Project Creator Startup Script
# This script ensures all necessary services are running for the Project Creator

echo "🚀 Starting Ez Aigent Project Creator System..."
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Redis is running
echo -e "\n${YELLOW}1. Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running. Starting Redis...${NC}"
    if command -v docker &> /dev/null; then
        docker run -d -p 6379:6379 --name ezaigents-redis redis:alpine
    else
        redis-server --daemonize yes
    fi
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis started successfully${NC}"
    else
        echo -e "${RED}✗ Failed to start Redis. Please install Redis manually.${NC}"
        exit 1
    fi
fi

# Check if .env file exists
echo -e "\n${YELLOW}2. Checking environment configuration...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
    # Check for required API keys
    if grep -q "CLAUDE_API_KEY=" .env && grep -q "OPENAI_API_KEY=" .env; then
        echo -e "${GREEN}✓ API keys configured${NC}"
    else
        echo -e "${RED}✗ Missing API keys in .env file${NC}"
        echo "Please add your API keys to the .env file"
    fi
else
    echo -e "${RED}✗ .env file not found${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Created .env from .env.example - please add your API keys${NC}"
    fi
fi

# Create necessary directories
echo -e "\n${YELLOW}3. Creating project directories...${NC}"
mkdir -p projects
mkdir -p .agent-memory/{claude,gpt,deepseek,mistral,gemini}
mkdir -p agents/{claude,gpt,deepseek,mistral,gemini}/logs
echo -e "${GREEN}✓ Directories created${NC}"

# Install dependencies if needed
echo -e "\n${YELLOW}4. Checking dashboard dependencies...${NC}"
cd dashboard
if [ ! -d "node_modules" ]; then
    echo "Installing dashboard dependencies..."
    npm install --legacy-peer-deps
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"

# Start the dashboard
echo -e "\n${YELLOW}5. Starting dashboard...${NC}"
npm run dev &
DASHBOARD_PID=$!
sleep 5

# Check if dashboard is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Dashboard is running at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠ Dashboard may still be starting up...${NC}"
fi

# Start API Key Manager (optional)
echo -e "\n${YELLOW}6. Starting API Key Manager...${NC}"
cd ../cli
if [ -f "api-key-manager.js" ]; then
    node api-key-manager.js &
    API_KEY_PID=$!
    echo -e "${GREEN}✓ API Key Manager started${NC}"
else
    echo -e "${YELLOW}⚠ API Key Manager not found (optional)${NC}"
fi

# Display status
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Ez Aigent Project Creator is ready!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n📌 Quick Start Guide:"
echo -e "   1. Open ${GREEN}http://localhost:3000${NC} in your browser"
echo -e "   2. Click on ${GREEN}'Project Creator'${NC} button"
echo -e "   3. Fill in your project details"
echo -e "   4. Generate and execute your project!"
echo -e "\n📊 Monitoring:"
echo -e "   - Redis: ${GREEN}redis-cli monitor${NC}"
echo -e "   - Logs: ${GREEN}tail -f agents/*/logs/*.log${NC}"
echo -e "   - Dashboard: ${GREEN}http://localhost:3000${NC}"
echo -e "\n🛑 To stop all services:"
echo -e "   ${YELLOW}./stop-project-creator.sh${NC}"
echo -e "\n"

# Save PIDs for cleanup
echo $DASHBOARD_PID > .dashboard.pid
[ ! -z "$API_KEY_PID" ] && echo $API_KEY_PID > .api-key-manager.pid

# Keep script running
echo "Press Ctrl+C to stop all services..."
wait