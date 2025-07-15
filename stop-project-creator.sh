#!/bin/bash

# Ez Aigent Project Creator Stop Script
# This script cleanly stops all Project Creator services

echo "🛑 Stopping Ez Aigent Project Creator System..."
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop dashboard
if [ -f .dashboard.pid ]; then
    DASHBOARD_PID=$(cat .dashboard.pid)
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        echo -e "${YELLOW}Stopping dashboard (PID: $DASHBOARD_PID)...${NC}"
        kill $DASHBOARD_PID
        rm .dashboard.pid
        echo -e "${GREEN}✓ Dashboard stopped${NC}"
    else
        echo -e "${YELLOW}Dashboard not running${NC}"
        rm .dashboard.pid
    fi
else
    echo -e "${YELLOW}No dashboard PID file found${NC}"
fi

# Stop API Key Manager
if [ -f .api-key-manager.pid ]; then
    API_KEY_PID=$(cat .api-key-manager.pid)
    if kill -0 $API_KEY_PID 2>/dev/null; then
        echo -e "${YELLOW}Stopping API Key Manager (PID: $API_KEY_PID)...${NC}"
        kill $API_KEY_PID
        rm .api-key-manager.pid
        echo -e "${GREEN}✓ API Key Manager stopped${NC}"
    else
        echo -e "${YELLOW}API Key Manager not running${NC}"
        rm .api-key-manager.pid
    fi
fi

# Stop all agents
echo -e "\n${YELLOW}Stopping all running agents...${NC}"
for agent_type in claude gpt deepseek mistral gemini; do
    pids=$(pgrep -f "agents/${agent_type}/wrapped-index.js")
    if [ ! -z "$pids" ]; then
        echo -e "Stopping ${agent_type} agents: $pids"
        kill $pids 2>/dev/null
    fi
done
echo -e "${GREEN}✓ All agents stopped${NC}"

# Optionally stop Redis (commented out by default)
# echo -e "\n${YELLOW}Stopping Redis...${NC}"
# if command -v docker &> /dev/null; then
#     docker stop ezaigents-redis 2>/dev/null
#     docker rm ezaigents-redis 2>/dev/null
# else
#     redis-cli shutdown 2>/dev/null
# fi
# echo -e "${GREEN}✓ Redis stopped${NC}"

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ All services stopped successfully${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "\n💡 To restart, run: ${YELLOW}./start-project-creator.sh${NC}\n"