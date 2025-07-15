#!/bin/bash

# Stop Bulletproof Queue System Script

echo "🛑 Stopping Bulletproof Queue System..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to stop a service
stop_service() {
    local name=$1
    local pid_file=".${name}.pid"
    
    if [ -f "$pid_file" ]; then
        pid=$(cat $pid_file)
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}Stopping ${name} (PID: $pid)...${NC}"
            kill -TERM $pid
            
            # Wait for graceful shutdown
            sleep 2
            
            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                echo -e "${YELLOW}Force stopping ${name}...${NC}"
                kill -KILL $pid
            fi
            
            echo -e "${GREEN}✓ ${name} stopped${NC}"
        else
            echo -e "${YELLOW}${name} not running${NC}"
        fi
        rm -f $pid_file
    else
        echo -e "${YELLOW}No PID file for ${name}${NC}"
    fi
}

# Stop all services
stop_service "orchestrator"
stop_service "health-monitor"
stop_service "dlq-manager"
stop_service "transaction-logger"
stop_service "claude-agent"
stop_service "gpt-agent"
stop_service "dashboard"

# Clean up
rm -f .bulletproof-queue-started

echo -e "\n${GREEN}✓ All services stopped${NC}"