#!/bin/bash

# Enhanced System Overview Script
# Provides comprehensive status of the Ez Aigent system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║    ███████╗███████╗ █████╗ ██╗   ██╗ ██████╗ ███████╗███╗   ██╗████████╗║
║    ██╔════╝╚══███╔╝██╔══██╗██║   ██║██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝║
║    █████╗    ███╔╝ ███████║██║   ██║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ║
║    ██╔══╝   ███╔╝  ██╔══██║██║   ██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ║
║    ███████╗███████╗██║  ██║╚██████╔╝╚██████╔╝███████╗██║ ╚████║   ██║   ║
║    ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ║
║                                                               ║
║              🤖 AI Multi-Agent Orchestration Platform         ║
║                      System Status Overview                   ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${WHITE}📊 SYSTEM OVERVIEW - $(date)${NC}"
echo "=================================================================="

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local description=$3
    
    if nc -z localhost $port 2>/dev/null; then
        echo -e "  ✅ ${GREEN}$service_name${NC} - $description (Port $port)"
        return 0
    else
        echo -e "  ❌ ${RED}$service_name${NC} - $description (Port $port) - OFFLINE"
        return 1
    fi
}

# Function to check Redis queues
check_redis_queues() {
    if command -v redis-cli &> /dev/null; then
        echo -e "\n${CYAN}📋 REDIS QUEUE STATUS${NC}"
        echo "----------------------------------------"
        
        models=("claude-3-opus" "gpt-4o" "deepseek-coder" "command-r-plus" "gemini-pro")
        total_queued=0
        total_processing=0
        
        for model in "${models[@]}"; do
            queued=$(redis-cli LLEN "queue:$model" 2>/dev/null || echo "0")
            processing=$(redis-cli LLEN "processing:$model" 2>/dev/null || echo "0")
            
            total_queued=$((total_queued + queued))
            total_processing=$((total_processing + processing))
            
            if [ "$queued" -gt 20 ]; then
                status_color=$RED
                status="HIGH LOAD"
            elif [ "$queued" -gt 5 ]; then
                status_color=$YELLOW
                status="MODERATE"
            else
                status_color=$GREEN
                status="NORMAL"
            fi
            
            echo -e "  ${status_color}$model${NC}: $queued queued, $processing processing - $status"
        done
        
        echo "----------------------------------------"
        echo -e "  ${WHITE}TOTALS:${NC} $total_queued queued, $total_processing processing"
        
        # Check for failures
        failed=$(redis-cli LLEN "queue:failures" 2>/dev/null || echo "0")
        if [ "$failed" -gt 0 ]; then
            echo -e "  ${RED}⚠️  FAILURES:${NC} $failed failed tasks"
        fi
    else
        echo -e "  ${RED}❌ Redis CLI not available${NC}"
    fi
}

# Function to check enhancement progress
check_enhancement_progress() {
    echo -e "\n${BLUE}🚀 ENHANCEMENT PROGRESS${NC}"
    echo "----------------------------------------"
    
    if [ -f "../shared/enhancement-tasks.json" ]; then
        # Run analytics if available
        if [ -f "../cli/enhancement-analytics.js" ]; then
            node ../cli/enhancement-analytics.js overview 2>/dev/null | grep -E "(totalTasks|completedTasks|overallProgress)" || echo "  📊 Analytics data not available"
        else
            echo "  📋 Enhancement analytics engine available"
        fi
    else
        echo -e "  ${YELLOW}⚠️  Enhancement configuration not found${NC}"
    fi
}

# Function to check agent processes
check_agent_processes() {
    echo -e "\n${GREEN}🤖 AGENT PROCESSES${NC}"
    echo "----------------------------------------"
    
    agents=("claude" "gpt" "deepseek" "mistral" "gemini")
    
    for agent in "${agents[@]}"; do
        # Check if agent process is running
        if pgrep -f "agents/$agent" > /dev/null; then
            echo -e "  ✅ ${GREEN}$agent${NC} agent - RUNNING"
        else
            echo -e "  ❌ ${RED}$agent${NC} agent - STOPPED"
        fi
    done
    
    # Check orchestrator
    if pgrep -f "cli/runner.js" > /dev/null; then
        echo -e "  ✅ ${GREEN}Orchestrator${NC} - RUNNING"
    else
        echo -e "  ❌ ${RED}Orchestrator${NC} - STOPPED"
    fi
}

# Function to check system resources
check_system_resources() {
    echo -e "\n${CYAN}💻 SYSTEM RESOURCES${NC}"
    echo "----------------------------------------"
    
    # Memory usage
    if command -v free &> /dev/null; then
        memory_info=$(free -h | grep ^Mem)
        echo -e "  💾 Memory: $memory_info"
    elif command -v vm_stat &> /dev/null; then
        # macOS memory info
        memory_info=$(vm_stat | head -5 | tr '\n' ' ')
        echo -e "  💾 Memory: $memory_info"
    fi
    
    # Disk usage
    disk_usage=$(df -h . | tail -1 | awk '{print $5 " used of " $2}')
    echo -e "  💽 Disk: $disk_usage"
    
    # Load average
    if command -v uptime &> /dev/null; then
        load_avg=$(uptime | awk -F'load average:' '{print $2}')
        echo -e "  ⚡ Load Average:$load_avg"
    fi
    
    # Node.js version
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        echo -e "  🟢 Node.js: $node_version"
    fi
}

# Function to check Docker containers
check_docker_containers() {
    if command -v docker &> /dev/null; then
        echo -e "\n${PURPLE}🐳 DOCKER CONTAINERS${NC}"
        echo "----------------------------------------"
        
        containers=$(docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep -E "(ai_|ez-aigent)" || echo "No AI containers running")
        
        if [ "$containers" != "No AI containers running" ]; then
            echo "$containers"
        else
            echo -e "  ${YELLOW}⚠️  No Ez Aigent containers running${NC}"
        fi
    fi
}

# Function to show recent activity
show_recent_activity() {
    echo -e "\n${WHITE}📈 RECENT ACTIVITY${NC}"
    echo "----------------------------------------"
    
    if command -v redis-cli &> /dev/null; then
        # Get recent completions
        recent_activity=$(redis-cli LRANGE "agent:activity" 0 4 2>/dev/null || echo "No recent activity")
        if [ "$recent_activity" != "No recent activity" ]; then
            echo "$recent_activity" | head -5
        else
            echo -e "  ${YELLOW}No recent activity recorded${NC}"
        fi
    else
        echo -e "  ${YELLOW}Activity log not available${NC}"
    fi
}

# Function to show quick commands
show_quick_commands() {
    echo -e "\n${WHITE}⚡ QUICK COMMANDS${NC}"
    echo "----------------------------------------"
    echo -e "  ${GREEN}Start System:${NC}     ./start-agents.sh"
    echo -e "  ${GREEN}Stop System:${NC}      ./stop-agents.sh"
    echo -e "  ${GREEN}Check Agents:${NC}     ./check-agents.sh"
    echo -e "  ${GREEN}Dashboard:${NC}        npm run dashboard"
    echo -e "  ${GREEN}Analytics:${NC}        node cli/enhancement-analytics.js report"
    echo -e "  ${GREEN}Enqueue Task:${NC}     node cli/enqueue.js"
    echo -e "  ${GREEN}Monitor Logs:${NC}     docker-compose logs -f"
}

# Main execution
main() {
    # Core Services
    echo -e "\n${YELLOW}🔧 CORE SERVICES${NC}"
    echo "----------------------------------------"
    check_service "Redis" 6379 "Message Queue & Cache"
    check_service "Dashboard" 3000 "Web Interface"
    
    # System Components
    check_redis_queues
    check_enhancement_progress
    check_agent_processes
    check_system_resources
    check_docker_containers
    show_recent_activity
    show_quick_commands
    
    echo ""
    echo "=================================================================="
    echo -e "${WHITE}📊 System overview complete!${NC}"
    echo -e "${CYAN}💡 Run with 'watch' for continuous monitoring: watch -n 5 ./system-overview.sh${NC}"
    echo "=================================================================="
}

# Run main function
main