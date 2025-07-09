#!/bin/bash

# Ez Aigent Enhancement Implementation Script
# This script orchestrates the entire enhancement implementation process

set -e  # Exit on error

echo "🚀 Ez Aigent Enhancement Implementation Runner"
echo "============================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if Redis is running
    if ! redis-cli ping &> /dev/null; then
        echo -e "${RED}❌ Redis is not running${NC}"
        echo "Please start Redis with: redis-server or docker-compose up -d redis"
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo -e "${RED}❌ .env file not found${NC}"
        echo "Please create .env file with API keys"
        exit 1
    fi
    
    # Check if enhancement files exist
    if [ ! -f shared/enhancement-tasks.json ]; then
        echo -e "${RED}❌ enhancement-tasks.json not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Start agents if not running
start_agents() {
    echo -e "\n${BLUE}Checking agent status...${NC}"
    
    if [ -f .agent_pids ]; then
        # Check if agents are actually running
        PIDS=$(cat .agent_pids)
        ALL_RUNNING=true
        
        for PID in ${PIDS//,/ }; do
            if ! ps -p $PID > /dev/null 2>&1; then
                ALL_RUNNING=false
                break
            fi
        done
        
        if [ "$ALL_RUNNING" = true ]; then
            echo -e "${GREEN}✅ Agents are already running${NC}"
            return
        fi
    fi
    
    echo -e "${YELLOW}Starting agents...${NC}"
    ./start-agents.sh
    sleep 5  # Give agents time to initialize
}

# Display enhancement menu
show_enhancement_menu() {
    echo -e "\n${BLUE}Available Enhancements:${NC}"
    echo "1. Security Layer (Critical)"
    echo "2. Observability Stack (Critical)"
    echo "3. Distributed Queue System (High)"
    echo "4. Self-Healing Infrastructure (High)"
    echo "5. Intelligent Orchestration (Medium)"
    echo "6. Collaboration Framework (Medium)"
    echo "7. ALL - Implement all enhancements in order"
    echo "8. Exit"
}

# Get enhancement ID from number
get_enhancement_id() {
    case $1 in
        1) echo "security-layer" ;;
        2) echo "observability-stack" ;;
        3) echo "distributed-queue-system" ;;
        4) echo "self-healing-infrastructure" ;;
        5) echo "intelligent-orchestration" ;;
        6) echo "collaboration-framework" ;;
        7) echo "all" ;;
        *) echo "invalid" ;;
    esac
}

# Monitor enhancement progress
monitor_progress() {
    local enhancement_id=$1
    echo -e "\n${BLUE}Starting progress monitor...${NC}"
    echo "Press Ctrl+C to stop monitoring (enhancement will continue in background)"
    
    # Start monitor in background
    node cli/enhancement-monitor.js &
    MONITOR_PID=$!
    
    # Trap Ctrl+C to only kill monitor, not the script
    trap "kill $MONITOR_PID 2>/dev/null; echo -e '\n${YELLOW}Monitor stopped. Enhancement continues in background.${NC}'" INT
    
    wait $MONITOR_PID
    
    # Reset trap
    trap - INT
}

# Check enhancement completion
check_completion() {
    local enhancement_id=$1
    
    if [ "$enhancement_id" = "all" ]; then
        echo -e "\n${BLUE}Checking overall completion status...${NC}"
        node cli/enhancement-dispatcher.js status
    else
        echo -e "\n${BLUE}Checking completion status for $enhancement_id...${NC}"
        node cli/enhancement-dispatcher.js status $enhancement_id
    fi
}

# Generate enhancement report
generate_report() {
    local enhancement_id=$1
    local report_file="enhancement-report-$(date +%Y%m%d-%H%M%S).md"
    
    echo -e "\n${BLUE}Generating enhancement report...${NC}"
    
    cat > $report_file << EOF
# Enhancement Implementation Report
Generated: $(date)

## Enhancement: $enhancement_id

### Files Created
EOF

    # List new files created
    if [ "$enhancement_id" = "all" ]; then
        find cli dashboard config deployment -name "*.js" -o -name "*.json" -o -name "*.yaml" -newer shared/enhancement-tasks.json 2>/dev/null >> $report_file || true
    fi
    
    echo -e "\n### Queue Status" >> $report_file
    redis-cli --raw LLEN queue:claude-3-opus >> $report_file
    redis-cli --raw LLEN queue:gpt-4o >> $report_file
    
    echo -e "${GREEN}✅ Report generated: $report_file${NC}"
}

# Main menu loop
main_menu() {
    while true; do
        show_enhancement_menu
        echo -n -e "\n${YELLOW}Select enhancement to implement (1-8): ${NC}"
        read choice
        
        case $choice in
            8)
                echo -e "${BLUE}Exiting...${NC}"
                exit 0
                ;;
            [1-7])
                enhancement_id=$(get_enhancement_id $choice)
                
                echo -e "\n${GREEN}Implementing: $enhancement_id${NC}"
                
                # Dispatch enhancement
                echo -e "${BLUE}Dispatching tasks to agents...${NC}"
                node cli/enhancement-dispatcher.js dispatch $enhancement_id
                
                # Ask if user wants to monitor
                echo -n -e "\n${YELLOW}Monitor progress in real-time? (y/n): ${NC}"
                read monitor_choice
                
                if [ "$monitor_choice" = "y" ] || [ "$monitor_choice" = "Y" ]; then
                    monitor_progress $enhancement_id
                fi
                
                # Check completion
                check_completion $enhancement_id
                
                # Ask if user wants a report
                echo -n -e "\n${YELLOW}Generate implementation report? (y/n): ${NC}"
                read report_choice
                
                if [ "$report_choice" = "y" ] || [ "$report_choice" = "Y" ]; then
                    generate_report $enhancement_id
                fi
                ;;
            *)
                echo -e "${RED}Invalid choice. Please select 1-8.${NC}"
                ;;
        esac
        
        echo -n -e "\n${YELLOW}Continue with another enhancement? (y/n): ${NC}"
        read continue_choice
        
        if [ "$continue_choice" != "y" ] && [ "$continue_choice" != "Y" ]; then
            break
        fi
    done
}

# Cleanup function
cleanup() {
    echo -e "\n${BLUE}Cleaning up...${NC}"
    
    # Kill monitor if running
    if [ ! -z "$MONITOR_PID" ]; then
        kill $MONITOR_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    echo "Current directory: $(pwd)"
    
    check_prerequisites
    start_agents
    
    echo -e "\n${GREEN}✅ System ready for enhancement implementation${NC}"
    echo -e "${BLUE}This script will help you implement the 6 major enhancements${NC}"
    
    main_menu
    
    echo -e "\n${GREEN}✅ Enhancement implementation complete!${NC}"
    echo -e "${BLUE}Check the generated files and test the new functionality${NC}"
}

# Run main function
main