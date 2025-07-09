#!/bin/bash

# 🔒 Security Check Script for EzAigent Multi-Agent System
# This script runs comprehensive security checks on the codebase

echo "🔒 Starting Security Check for EzAigent..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track findings
SECURITY_ISSUES=0
WARNINGS=0

echo -e "${BLUE}1. Running npm audit for dependency vulnerabilities...${NC}"
if npm audit --audit-level=moderate; then
    echo -e "${GREEN}✓ No critical dependency vulnerabilities found${NC}"
else
    echo -e "${RED}✗ Dependency vulnerabilities detected${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

echo ""
echo -e "${BLUE}2. Checking for hardcoded secrets and API keys...${NC}"

# Check for potential hardcoded secrets
if grep -r -i --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" \
    -E "(api[_-]?key|secret|password|token.*=|bearer|auth.*=)" . | \
    grep -v -E "(API_KEY|SECRET|PASSWORD|TOKEN)" | \
    grep -v -E "(.md:|.sh:|.example)" | \
    head -10; then
    echo -e "${RED}✗ Potential hardcoded secrets found (review above)${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e "${GREEN}✓ No hardcoded secrets detected${NC}"
fi

echo ""
echo -e "${BLUE}3. Checking for insecure file permissions...${NC}"

# Check for world-writable files
WRITABLE_FILES=$(find . -type f -perm /o+w -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null)
if [ -n "$WRITABLE_FILES" ]; then
    echo -e "${YELLOW}⚠ World-writable files found:${NC}"
    echo "$WRITABLE_FILES"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No world-writable files found${NC}"
fi

echo ""
echo -e "${BLUE}4. Checking .env and config files...${NC}"

# Check if .env files are properly gitignored
if [ -f ".env" ] && git check-ignore .env >/dev/null 2>&1; then
    echo -e "${GREEN}✓ .env file is properly gitignored${NC}"
elif [ -f ".env" ]; then
    echo -e "${RED}✗ .env file exists but is not gitignored${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e "${YELLOW}⚠ No .env file found${NC}"
fi

# Check for example files with real secrets
if grep -r --include="*.example" --include="*.env.*" -E "(sk-|AIza|ya29)" . 2>/dev/null; then
    echo -e "${RED}✗ Real API keys found in example files${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e "${GREEN}✓ No real secrets in example files${NC}"
fi

echo ""
echo -e "${BLUE}5. Checking Redis security configuration...${NC}"

# Check if Redis AUTH is configured
if docker ps | grep redis >/dev/null 2>&1; then
    if docker exec -it $(docker ps | grep redis | awk '{print $1}') redis-cli ping 2>/dev/null | grep -q PONG; then
        echo -e "${YELLOW}⚠ Redis is accessible without AUTH${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓ Redis appears to have AUTH configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Redis container not running for security check${NC}"
fi

echo ""
echo -e "${BLUE}6. Checking Docker security...${NC}"

# Check for privileged containers
if [ -f "docker-compose.yaml" ]; then
    if grep -q "privileged.*true" docker-compose.yaml; then
        echo -e "${RED}✗ Privileged containers found in docker-compose${NC}"
        SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
    else
        echo -e "${GREEN}✓ No privileged containers in docker-compose${NC}"
    fi
    
    # Check for host network mode
    if grep -q "network_mode.*host" docker-compose.yaml; then
        echo -e "${YELLOW}⚠ Host network mode found (potential security risk)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓ No host network mode found${NC}"
    fi
fi

echo ""
echo -e "${BLUE}7. Checking for input validation in API endpoints...${NC}"

# Basic check for input validation patterns
API_FILES=$(find . -name "*.js" -path "*/api/*" -not -path "./node_modules/*")
if [ -n "$API_FILES" ]; then
    UNVALIDATED_INPUTS=0
    for file in $API_FILES; do
        if ! grep -q -E "(joi|yup|validator|sanitize|escape)" "$file"; then
            UNVALIDATED_INPUTS=$((UNVALIDATED_INPUTS + 1))
        fi
    done
    
    if [ $UNVALIDATED_INPUTS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $UNVALIDATED_INPUTS API files may lack input validation${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓ API files appear to have input validation${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No API files found to check${NC}"
fi

echo ""
echo "========================================"
echo -e "${BLUE}Security Check Summary:${NC}"
echo "========================================"

if [ $SECURITY_ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🛡️  EXCELLENT: No security issues or warnings found!${NC}"
    exit 0
elif [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  GOOD: No critical issues, but $WARNINGS warning(s) found${NC}"
    echo -e "${YELLOW}Please review the warnings above${NC}"
    exit 0
else
    echo -e "${RED}🚨 CRITICAL: $SECURITY_ISSUES security issue(s) and $WARNINGS warning(s) found${NC}"
    echo -e "${RED}Please fix all security issues before deployment${NC}"
    exit 1
fi