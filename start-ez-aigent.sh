#!/bin/bash

# Ez Aigent Safe Startup Script
# This script ensures clean startup with proper port management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Ez Aigent Safe Startup${NC}"
echo "=================================="

# Check if port check script exists
if [ ! -f "scripts/port-check.sh" ]; then
    echo -e "${RED}❌ Port check script not found!${NC}"
    echo "Please ensure scripts/port-check.sh exists and is executable"
    exit 1
fi

# Run port check and start services
echo -e "${BLUE}🔍 Running pre-startup checks...${NC}"
./scripts/port-check.sh start

echo -e "${GREEN}✅ Startup complete!${NC}"
echo ""
echo -e "${BLUE}📱 Access your Ez Aigent dashboard at: http://localhost:3000${NC}"
echo -e "${BLUE}🌐 WebScraper interface included in the dashboard${NC}"
echo ""
echo "Available commands:"
echo "  ./scripts/port-check.sh status  - Check service status"
echo "  ./scripts/port-check.sh stop    - Stop all services"
echo "  ./scripts/port-check.sh restart - Restart services"