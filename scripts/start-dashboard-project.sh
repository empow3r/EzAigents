#!/bin/bash

echo "🚀 Starting Dashboard Enhancement Project v2.0"
echo "============================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Redis is running
echo -e "${BLUE}Checking Redis connection...${NC}"
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Redis is not running!${NC}"
    echo "Please start Redis first: docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi
echo -e "${GREEN}✅ Redis connected${NC}"

# Check if agents are running
echo -e "${BLUE}Checking agent status...${NC}"
AGENTS=("claude" "gpt" "deepseek" "mistral" "gemini")
MISSING_AGENTS=()

for agent in "${AGENTS[@]}"; do
    AGENT_STATUS=$(redis-cli HGET "agent:$agent:status" "status" 2>/dev/null)
    if [ -z "$AGENT_STATUS" ] || [ "$AGENT_STATUS" != "active" ]; then
        MISSING_AGENTS+=("$agent")
        echo -e "${YELLOW}⚠️  $agent agent not active${NC}"
    else
        echo -e "${GREEN}✅ $agent agent active${NC}"
    fi
done

if [ ${#MISSING_AGENTS[@]} -gt 0 ]; then
    echo -e "${YELLOW}\nWarning: Some agents are not active. Continue anyway? (y/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Exiting. Please start all agents first."
        exit 1
    fi
fi

# Clear previous project data (optional)
echo -e "\n${BLUE}Clear previous project data? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Clearing previous data..."
    redis-cli DEL "dashboard:tasks" > /dev/null
    redis-cli DEL "project:dashboard-enhancement:overview" > /dev/null
    redis-cli HDEL "project:status" "dashboard-enhancement" > /dev/null
    echo -e "${GREEN}✅ Previous data cleared${NC}"
fi

# Enqueue tasks
echo -e "\n${BLUE}Enqueueing dashboard enhancement tasks...${NC}"
cd "$(dirname "$0")/../cli" || exit
node enqueue-dashboard-tasks.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tasks enqueued successfully${NC}"
else
    echo -e "${RED}❌ Failed to enqueue tasks${NC}"
    exit 1
fi

# Start monitoring in new terminal (if available)
echo -e "\n${BLUE}Starting project monitor...${NC}"

# Check which terminal emulator is available
if command -v gnome-terminal &> /dev/null; then
    gnome-terminal -- bash -c "cd '$(pwd)' && node monitor-dashboard-project.js; exec bash"
elif command -v xterm &> /dev/null; then
    xterm -e "cd '$(pwd)' && node monitor-dashboard-project.js" &
elif command -v osascript &> /dev/null; then
    # macOS
    osascript -e "tell app \"Terminal\" to do script \"cd '$(pwd)' && node monitor-dashboard-project.js\""
else
    echo -e "${YELLOW}Could not open monitor in new terminal. Run manually:${NC}"
    echo "cd cli && node monitor-dashboard-project.js"
fi

# Display status
echo -e "\n${GREEN}🎉 Dashboard Enhancement Project Started!${NC}"
echo "============================================"
echo -e "📊 Dashboard: ${BLUE}http://localhost:3000/projects/dashboard-enhancement${NC}"
echo -e "📡 Monitor: ${BLUE}redis-cli PSUBSCRIBE 'agent:*'${NC}"
echo -e "💬 Chat: ${BLUE}redis-cli SUBSCRIBE 'dashboard-enhancement'${NC}"
echo -e "📈 Progress: ${BLUE}redis-cli HGETALL 'dashboard:tasks'${NC}"
echo ""
echo -e "${YELLOW}Agents will start working on their assigned tasks.${NC}"
echo -e "${YELLOW}Check the monitor for real-time updates!${NC}"

# Optional: Show initial task distribution
echo -e "\n${BLUE}Task Distribution:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Claude${NC} → Real-time Collaboration (HIGH)"
echo -e "${GREEN}GPT${NC} → AI-Powered Analytics (HIGH)"
echo -e "${GREEN}DeepSeek${NC} → Advanced Visualizations (HIGH)"
echo -e "${GREEN}Mistral${NC} → Voice & Sound System (MEDIUM)"
echo -e "${GREEN}Gemini${NC} → Mobile PWA & Performance (HIGH)"
echo -e "${GREEN}Claude${NC} → Enhanced Gamification (MEDIUM)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"