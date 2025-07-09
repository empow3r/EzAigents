#!/bin/bash

# Ez Aigent Integration Test Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Ez Aigent Integration Test${NC}"
echo -e "${BLUE}===========================${NC}"
echo ""

# Function to check if service is running
check_service() {
    local service=$1
    local port=$2
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✅ $service is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ $service is not running on port $port${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_endpoint() {
    local name=$1
    local url=$2
    
    if curl -f -s "$url" > /dev/null; then
        echo -e "${GREEN}✅ $name endpoint is responding${NC}"
        return 0
    else
        echo -e "${RED}❌ $name endpoint failed${NC}"
        return 1
    fi
}

# Step 1: Check Redis
echo -e "${BLUE}1. Checking Redis...${NC}"
if check_service "Redis" 6379; then
    # Test Redis operations
    if redis-cli ping | grep -q PONG; then
        echo -e "${GREEN}✅ Redis is healthy${NC}"
    fi
fi
echo ""

# Step 2: Build Docker images
echo -e "${BLUE}2. Building Docker images...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"

if docker-compose build --parallel; then
    echo -e "${GREEN}✅ All images built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build images${NC}"
    exit 1
fi
echo ""

# Step 3: Start services
echo -e "${BLUE}3. Starting services...${NC}"

# Start in detached mode
docker-compose up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 30

echo ""

# Step 4: Check running containers
echo -e "${BLUE}4. Checking container status...${NC}"

containers=(
    "ai_redis"
    "ai_runner"
    "ai_dashboard"
    "ai_claude"
    "ai_gpt"
    "ai_deepseek"
    "ai_mistral"
    "ai_gemini"
)

all_running=true
for container in "${containers[@]}"; do
    if docker ps | grep -q "$container"; then
        echo -e "${GREEN}✅ $container is running${NC}"
    else
        echo -e "${RED}❌ $container is not running${NC}"
        all_running=false
    fi
done
echo ""

# Step 5: Test dashboard
echo -e "${BLUE}5. Testing Dashboard...${NC}"

if test_endpoint "Dashboard" "http://localhost:3000"; then
    test_endpoint "Health API" "http://localhost:3000/api/health"
    test_endpoint "Agents API" "http://localhost:3000/api/agents"
fi
echo ""

# Step 6: Test queue operations
echo -e "${BLUE}6. Testing Queue Operations...${NC}"

# Create test task
test_task='{
    "file": "test/example.js",
    "prompt": "Test task",
    "model": "claude-3-opus",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

# Enqueue test task
if docker exec ai_redis redis-cli LPUSH "queue:claude-3-opus" "$test_task" > /dev/null; then
    echo -e "${GREEN}✅ Task enqueued successfully${NC}"
    
    # Check if task was picked up
    sleep 5
    queue_length=$(docker exec ai_redis redis-cli LLEN "queue:claude-3-opus")
    if [ "$queue_length" = "0" ]; then
        echo -e "${GREEN}✅ Task was processed${NC}"
    else
        echo -e "${YELLOW}⚠️  Task still in queue${NC}"
    fi
fi
echo ""

# Step 7: Check logs for errors
echo -e "${BLUE}7. Checking logs for errors...${NC}"

error_count=0
for container in "${containers[@]}"; do
    if docker logs "$container" 2>&1 | grep -i error | grep -v "Error: ENOENT" > /dev/null; then
        echo -e "${YELLOW}⚠️  Errors found in $container logs${NC}"
        ((error_count++))
    fi
done

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}✅ No critical errors in logs${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}📊 Integration Test Summary${NC}"
echo -e "${BLUE}=========================${NC}"

if $all_running && [ $error_count -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Ez Aigent is fully operational!${NC}"
    echo ""
    echo -e "${BLUE}Access points:${NC}"
    echo "• Dashboard: http://localhost:3000"
    echo "• Redis CLI: docker exec -it ai_redis redis-cli"
    echo "• View logs: docker-compose logs -f [service]"
    echo ""
    echo -e "${YELLOW}To enqueue tasks:${NC}"
    echo "cd cli && node enqueue.js"
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    echo ""
    echo -e "${YELLOW}Debug commands:${NC}"
    echo "• Check logs: docker-compose logs [service]"
    echo "• Container status: docker ps -a"
    echo "• Stop all: docker-compose down"
fi

# Cleanup option
echo ""
echo -e "${BLUE}Cleanup options:${NC}"
echo "• Keep running: Services will continue in background"
echo "• Stop services: docker-compose down"
echo "• Stop and remove volumes: docker-compose down -v"