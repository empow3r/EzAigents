#!/bin/bash

# Ez Aigent Project Creator Health Check
# This script verifies all components are properly configured and running

echo "🏥 Ez Aigent Project Creator Health Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Function to check service
check_service() {
    local service_name=$1
    local check_command=$2
    local required=$3
    
    echo -n "Checking $service_name... "
    
    if eval $check_command > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗ FAILED${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ WARNING${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# Check Redis
check_service "Redis" "redis-cli ping" "required"

# Check Dashboard
check_service "Dashboard" "curl -s http://localhost:3000/api/health" "required"

# Check API endpoints
echo ""
echo "Checking API Endpoints:"
check_service "  - Agent Control API" "curl -s http://localhost:3000/api/agent-control" "required"
check_service "  - Project Masterplan API" "curl -s http://localhost:3000/api/project-masterplan" "required"
check_service "  - Project Execution API" "curl -s http://localhost:3000/api/project-execution" "required"

# Check environment configuration
echo ""
echo "Checking Environment Configuration:"

check_env_var() {
    local var_name=$1
    local required=$2
    
    echo -n "  - $var_name... "
    
    if [ -f .env ] && grep -q "^${var_name}=" .env; then
        value=$(grep "^${var_name}=" .env | cut -d'=' -f2)
        if [ ! -z "$value" ] && [ "$value" != "your-key-here" ]; then
            echo -e "${GREEN}✓ Configured${NC}"
        else
            if [ "$required" = "required" ]; then
                echo -e "${RED}✗ Not configured${NC}"
                ((ERRORS++))
            else
                echo -e "${YELLOW}⚠ Not configured${NC}"
                ((WARNINGS++))
            fi
        fi
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}✗ Missing${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠ Missing${NC}"
            ((WARNINGS++))
        fi
    fi
}

if [ -f .env ]; then
    check_env_var "REDIS_URL" "optional"
    check_env_var "CLAUDE_API_KEY" "required"
    check_env_var "OPENAI_API_KEY" "required"
    check_env_var "DEEPSEEK_API_KEYS" "optional"
    check_env_var "MISTRAL_API_KEY" "optional"
    check_env_var "GEMINI_API_KEY" "optional"
else
    echo -e "  ${RED}✗ .env file not found${NC}"
    ((ERRORS++))
fi

# Check directories
echo ""
echo "Checking Directory Structure:"

check_directory() {
    local dir_path=$1
    local dir_name=$2
    
    echo -n "  - $dir_name... "
    
    if [ -d "$dir_path" ]; then
        echo -e "${GREEN}✓ Exists${NC}"
    else
        echo -e "${YELLOW}⚠ Missing (will be created)${NC}"
        ((WARNINGS++))
    fi
}

check_directory "projects" "Projects directory"
check_directory ".agent-memory" "Agent memory"
check_directory "agents/claude/logs" "Agent logs"

# Check Node.js version
echo ""
echo -n "Checking Node.js version... "
node_version=$(node -v 2>/dev/null)
if [ $? -eq 0 ]; then
    major_version=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
    if [ $major_version -ge 18 ]; then
        echo -e "${GREEN}✓ $node_version${NC}"
    else
        echo -e "${YELLOW}⚠ $node_version (18+ recommended)${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗ Not installed${NC}"
    ((ERRORS++))
fi

# Check running agents
echo ""
echo "Checking Running Agents:"
agent_count=0
for agent in claude gpt deepseek mistral gemini; do
    count=$(pgrep -f "agents/$agent/wrapped-index.js" | wc -l)
    if [ $count -gt 0 ]; then
        echo -e "  - $agent: ${GREEN}$count running${NC}"
        ((agent_count += count))
    fi
done

if [ $agent_count -eq 0 ]; then
    echo -e "  ${YELLOW}⚠ No agents currently running${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "Health Check Summary:"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is ready.${NC}"
    echo ""
    echo "🚀 Start creating projects at http://localhost:3000"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ System is functional with $WARNINGS warnings.${NC}"
    echo ""
    echo "The system will work but some features may be limited."
else
    echo -e "${RED}❌ Found $ERRORS errors and $WARNINGS warnings.${NC}"
    echo ""
    echo "Please fix the errors before using Project Creator."
fi

echo ""

# Provide next steps based on results
if [ $ERRORS -gt 0 ]; then
    echo "Next steps to fix errors:"
    
    if ! redis-cli ping > /dev/null 2>&1; then
        echo "  1. Start Redis: redis-server or docker run -d -p 6379:6379 redis"
    fi
    
    if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "  2. Start dashboard: cd dashboard && npm run dev"
    fi
    
    if [ ! -f .env ]; then
        echo "  3. Create .env file: cp .env.example .env"
    fi
    
    echo "  4. Add your API keys to .env file"
fi

exit $ERRORS