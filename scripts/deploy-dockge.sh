#!/bin/bash

# 🚀 Ez Aigent Dockge Deployment Script
# Automated deployment to development server with Dockge

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="ez-aigent"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🚀 Ez Aigent Dockge Deployment Script${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# Check if running as root (required for Docker operations)
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}⚠️  Running as root. Ensure this is intended for production deployment.${NC}"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}1. Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists docker-compose; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Check environment file
echo -e "${BLUE}2. Checking environment configuration...${NC}"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env.production" ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Copying from .env.production template...${NC}"
        cp .env.production .env
        echo -e "${YELLOW}📝 Please edit .env file with your actual API keys before continuing.${NC}"
        echo -e "${YELLOW}Press Enter when ready to continue...${NC}"
        read -r
    else
        echo -e "${RED}❌ No environment file found. Please create .env file with API keys.${NC}"
        exit 1
    fi
fi

# Validate critical environment variables
if ! grep -q "CLAUDE_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  CLAUDE_API_KEY not set in .env file${NC}"
fi

if ! grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set in .env file${NC}"
fi

echo -e "${GREEN}✅ Environment configuration checked${NC}"

# Create necessary directories
echo -e "${BLUE}3. Creating deployment directories...${NC}"

mkdir -p logs reports src/output shared config efficiency_data
mkdir -p "$BACKUP_DIR"

# Set proper permissions
chmod 755 logs reports src shared config
chmod 644 shared/filemap.json 2>/dev/null || echo "filemap.json will be created on first run"
chmod 644 shared/tokenpool.json 2>/dev/null || echo "tokenpool.json will be created on first run"

echo -e "${GREEN}✅ Directories created and permissions set${NC}"

# Backup existing deployment if it exists
echo -e "${BLUE}4. Backing up existing deployment...${NC}"

if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${YELLOW}📦 Backing up current deployment...${NC}"
    
    # Backup volumes
    docker run --rm -v ezaigent_redis_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
    docker run --rm -v ezaigent_efficiency_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf /backup/efficiency_data.tar.gz -C /data .
    
    # Backup logs
    cp -r logs "$BACKUP_DIR/" 2>/dev/null || echo "No logs to backup"
    cp -r reports "$BACKUP_DIR/" 2>/dev/null || echo "No reports to backup"
    
    echo -e "${GREEN}✅ Backup completed: $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}ℹ️  No existing deployment found to backup${NC}"
fi

# Build images
echo -e "${BLUE}5. Building Docker images...${NC}"

echo -e "${YELLOW}📦 Building images (this may take a few minutes)...${NC}"
if docker-compose -f "$COMPOSE_FILE" build --parallel; then
    echo -e "${GREEN}✅ Images built successfully${NC}"
else
    echo -e "${RED}❌ Image build failed${NC}"
    exit 1
fi

# Stop existing services
echo -e "${BLUE}6. Stopping existing services...${NC}"

docker-compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || echo "No existing services to stop"

echo -e "${GREEN}✅ Existing services stopped${NC}"

# Start services
echo -e "${BLUE}7. Starting Ez Aigent services...${NC}"

echo -e "${YELLOW}🚀 Starting services in order...${NC}"

# Start Redis first
echo -e "${YELLOW}   Starting Redis...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d redis

# Wait for Redis to be healthy
echo -e "${YELLOW}   Waiting for Redis to be ready...${NC}"
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "healthy"; then
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -eq 0 ]; then
    echo -e "${RED}❌ Redis failed to start within 60 seconds${NC}"
    docker-compose -f "$COMPOSE_FILE" logs redis
    exit 1
fi

echo -e "${GREEN}   ✅ Redis is ready${NC}"

# Start core services
echo -e "${YELLOW}   Starting core services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d runner autoscaler dashboard

# Start agents
echo -e "${YELLOW}   Starting AI agents...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d claude gpt deepseek mistral gemini

# Start monitoring services
echo -e "${YELLOW}   Starting monitoring services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d monitor efficiency

echo -e "${GREEN}✅ All services started${NC}"

# Health check
echo -e "${BLUE}8. Running health checks...${NC}"

sleep 10  # Give services time to initialize

echo -e "${YELLOW}🏥 Checking service health...${NC}"

# Check Redis
if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}   ✅ Redis: Healthy${NC}"
else
    echo -e "${RED}   ❌ Redis: Unhealthy${NC}"
fi

# Check Dashboard
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Dashboard: Healthy${NC}"
else
    echo -e "${YELLOW}   ⚠️  Dashboard: Starting up (may take a moment)${NC}"
fi

# Check agents
for agent in claude gpt deepseek mistral gemini; do
    if docker-compose -f "$COMPOSE_FILE" ps "$agent" | grep -q "Up"; then
        echo -e "${GREEN}   ✅ $agent agent: Running${NC}"
    else
        echo -e "${RED}   ❌ $agent agent: Not running${NC}"
    fi
done

# Display service status
echo -e "${BLUE}9. Service Status Summary${NC}"
echo -e "${BLUE}========================${NC}"

docker-compose -f "$COMPOSE_FILE" ps

# Display access information
echo ""
echo -e "${PURPLE}🎉 Deployment Complete!${NC}"
echo -e "${PURPLE}=====================${NC}"
echo ""
echo -e "${GREEN}📊 Dashboard URL: ${NC}http://localhost:3000"
echo -e "${GREEN}🔧 Dockge Management: ${NC}Access via your Dockge interface"
echo -e "${GREEN}📁 Project Name: ${NC}$PROJECT_NAME"
echo ""
echo -e "${BLUE}📋 Quick Commands:${NC}"
echo -e "${BLUE}==================${NC}"
echo -e "View logs:       ${YELLOW}docker-compose -f $COMPOSE_FILE logs -f [service]${NC}"
echo -e "Stop services:   ${YELLOW}docker-compose -f $COMPOSE_FILE down${NC}"
echo -e "Restart service: ${YELLOW}docker-compose -f $COMPOSE_FILE restart [service]${NC}"
echo -e "Scale agents:    ${YELLOW}docker-compose -f $COMPOSE_FILE up -d --scale claude=3${NC}"
echo -e "System status:   ${YELLOW}./scripts/health-check.sh${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo -e "${BLUE}=============${NC}"
echo -e "Queue status:    ${YELLOW}npm run monitor${NC}"
echo -e "Efficiency:      ${YELLOW}npm run efficiency:report${NC}"
echo -e "Security check:  ${YELLOW}npm run security:check${NC}"
echo ""

# Final health check and recommendations
echo -e "${BLUE}🔍 Final System Check${NC}"
echo -e "${BLUE}====================${NC}"

# Check if dashboard is accessible
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ System is ready! Dashboard accessible at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard is starting up. Please wait 1-2 minutes and check http://localhost:3000${NC}"
fi

# Show resource usage
echo ""
echo -e "${BLUE}💾 Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10

echo ""
echo -e "${GREEN}🚀 Ez Aigent is now running on your development server!${NC}"
echo -e "${GREEN}📚 Check CLAUDE.md for usage instructions and API documentation.${NC}"
echo ""