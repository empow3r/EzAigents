#!/bin/bash

# Ez Aigent Quick Setup Script
# Creates commonly used agents

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Ez Aigent Quick Setup${NC}"
echo "=================================="
echo

# Make create-agent.js executable
chmod +x scripts/create-agent.js

echo -e "${BLUE}Creating commonly used agents...${NC}"
echo

# Function to create agent with progress
create_agent() {
    local name=$1
    local template=$2
    local description=$3
    
    echo -e "${YELLOW}📦 Creating $name agent ($description)...${NC}"
    
    if [ -d "agents/$name" ]; then
        echo -e "${YELLOW}⚠️  Agent '$name' already exists, skipping...${NC}"
        return
    fi
    
    node scripts/create-agent.js create "$name" "$template" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Created $name agent${NC}"
        
        # Install dependencies
        cd "agents/$name"
        npm install > /dev/null 2>&1
        cd "../.."
        
        echo -e "${GREEN}   📦 Dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to create $name agent${NC}"
    fi
    echo
}

# Create popular agents
echo -e "${BLUE}Creating AI agents...${NC}"
create_agent "ollama" "ai-agent" "Local privacy-focused AI"
create_agent "perplexity" "ai-agent" "Web search and research"

echo -e "${BLUE}Creating specialized agents...${NC}"
create_agent "database" "database-agent" "Database management"
create_agent "security" "security-agent" "Security scanning"
create_agent "devops" "devops-agent" "Infrastructure automation"
create_agent "frontend" "frontend-agent" "Frontend development"
create_agent "mobile" "mobile-agent" "Mobile development"
create_agent "analytics" "analytics-agent" "Data analysis"

echo -e "${BLUE}Creating tool agents...${NC}"
create_agent "translator" "tool-agent" "Language translation"
create_agent "designer" "tool-agent" "Design and mockups"
create_agent "qa" "tool-agent" "Quality assurance"

echo -e "${GREEN}🎉 Agent setup complete!${NC}"
echo
echo "Available agents:"
ls -1 agents/ | grep -v "base-agent\|mock-agent\|enhanced-token\|example-integrations\|universal_agent" | while read agent; do
    if [ -d "agents/$agent" ]; then
        echo "  - $agent"
    fi
done

echo
echo -e "${BLUE}Next steps:${NC}"
echo "1. Configure environment variables for agents that need API keys"
echo "2. Start agents individually:"
echo "   docker-compose up -d redis dashboard claude-agent gpt-agent"
echo "3. Or start with specific profiles:"
echo "   docker-compose --profile development up -d"
echo "   docker-compose --profile security up -d"
echo "   docker-compose --profile mobile up -d"
echo "4. Monitor agents:"
echo "   ./scripts/port-check.sh status"
echo "   ./scripts/agent-health-monitor.sh status"
echo
echo -e "${BLUE}🔧 To create custom agents:${NC}"
echo "   node scripts/create-agent.js"
echo
echo -e "${BLUE}📚 See CLAUDE.md for detailed setup instructions${NC}"