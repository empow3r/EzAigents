#!/bin/bash

# 🚀 Ez Aigent Dockge Deployment Helper
# Prepares and deploys Ez Aigent to a local Dockge server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Ez Aigent Dockge Deployment Helper${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Configuration
DOCKGE_STACKS_DIR="${DOCKGE_STACKS_DIR:-/opt/dockge/stacks}"
STACK_NAME="ez-aigent"
COMPOSE_FILE="dockge-stack.yml"

# Step 1: Check prerequisites
echo -e "${BLUE}1. Checking prerequisites...${NC}"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ $COMPOSE_FILE not found${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your API keys!${NC}"
    echo -e "${YELLOW}Required keys:${NC}"
    echo "  - CLAUDE_API_KEY"
    echo "  - OPENAI_API_KEY" 
    echo "  - DEEPSEEK_API_KEYS"
    echo "  - MISTRAL_API_KEY"
    echo "  - GEMINI_API_KEY"
    echo ""
    echo -e "${YELLOW}Edit .env then run this script again.${NC}"
    exit 1
fi

# Check if API keys are set
if grep -q "sk-or-cl-max-xxxxxxxxx" .env; then
    echo -e "${RED}❌ API keys not configured in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Step 2: Prepare deployment package
echo -e "${BLUE}2. Preparing deployment package...${NC}"

# Create temp directory
TEMP_DIR="/tmp/ez-aigent-deploy-$(date +%s)"
mkdir -p "$TEMP_DIR"

# Copy necessary files
cp "$COMPOSE_FILE" "$TEMP_DIR/docker-compose.yml"
cp .env "$TEMP_DIR/.env"

# Copy configuration files
mkdir -p "$TEMP_DIR/shared"
[ -f "shared/filemap.json" ] && cp shared/filemap.json "$TEMP_DIR/shared/"
[ -f "shared/tokenpool.json" ] && cp shared/tokenpool.json "$TEMP_DIR/shared/"

# Create required directories
mkdir -p "$TEMP_DIR/src" "$TEMP_DIR/logs" "$TEMP_DIR/config"

echo -e "${GREEN}✅ Deployment package prepared${NC}"

# Step 3: Deploy to Dockge
echo -e "${BLUE}3. Deployment options:${NC}"
echo ""
echo -e "${YELLOW}Option A: Manual Dockge Import (Recommended)${NC}"
echo "1. Open your Dockge web interface"
echo "2. Click 'Create Stack' or '+' button"
echo "3. Stack name: ${STACK_NAME}"
echo "4. Copy contents from: $COMPOSE_FILE"
echo "5. Upload .env file or paste environment variables"
echo "6. Click 'Deploy'"
echo ""
echo -e "${YELLOW}Option B: Copy to Dockge Stacks Directory${NC}"
echo "If you have SSH access to Dockge server:"
echo ""
echo "scp -r $TEMP_DIR/* user@dockge-server:$DOCKGE_STACKS_DIR/$STACK_NAME/"
echo ""
echo -e "${YELLOW}Option C: Using Dockge API (if available)${NC}"
echo "curl -X POST http://dockge-server:5001/api/stack/create \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d @dockge-deploy.json"
echo ""

# Create deployment JSON for API
cat > "$TEMP_DIR/dockge-deploy.json" <<EOF
{
  "name": "$STACK_NAME",
  "compose": $(cat "$COMPOSE_FILE" | jq -Rs .),
  "env": $(cat .env | jq -Rs .),
  "autostart": true
}
EOF

echo -e "${GREEN}✅ Deployment package ready at: $TEMP_DIR${NC}"
echo ""

# Step 4: Post-deployment steps
echo -e "${BLUE}4. Post-deployment steps:${NC}"
echo "After deploying in Dockge:"
echo ""
echo "1. ${YELLOW}Start the stack${NC} from Dockge interface"
echo "2. ${YELLOW}Monitor logs${NC} in Dockge console"
echo "3. ${YELLOW}Access dashboard${NC} at http://dockge-server:3000"
echo "4. ${YELLOW}Configure alerts${NC} in Dockge settings"
echo ""

# Step 5: Dockge-specific optimizations
echo -e "${BLUE}5. Dockge Configuration Tips:${NC}"
echo ""
echo "• ${GREEN}Resource Limits:${NC} Set in Dockge UI per container"
echo "• ${GREEN}Health Checks:${NC} Already configured in stack"
echo "• ${GREEN}Auto-restart:${NC} Enable in Dockge settings"
echo "• ${GREEN}Notifications:${NC} Configure webhooks for alerts"
echo "• ${GREEN}Backups:${NC} Enable volume backups in Dockge"
echo ""

# Create quick reference
cat > "$TEMP_DIR/DOCKGE_QUICK_REFERENCE.md" <<EOF
# Ez Aigent Dockge Quick Reference

## Access Points
- Dashboard: http://localhost:3000
- Redis: localhost:6379 (internal)

## Managing Agents
- Scale up: Use Dockge UI to increase replicas
- View logs: Click container → Logs in Dockge
- Restart: Click container → Restart

## Monitoring
- Queue depth: Dashboard → Queue Stats
- Agent health: Dashboard → Agents tab
- Token usage: Dashboard → Analytics

## Common Tasks
1. Enqueue work: Dashboard → Command Center
2. View progress: Dashboard → Project Status
3. Chat with agents: Dashboard → Agent Chat

## Troubleshooting
- Check logs in Dockge for each container
- Verify Redis connectivity
- Ensure API keys are valid
- Monitor resource usage in Dockge
EOF

echo -e "${GREEN}✅ Quick reference created: $TEMP_DIR/DOCKGE_QUICK_REFERENCE.md${NC}"
echo ""
echo -e "${PURPLE}🎉 Ready for Dockge deployment!${NC}"
echo -e "${PURPLE}Deployment package: $TEMP_DIR${NC}"