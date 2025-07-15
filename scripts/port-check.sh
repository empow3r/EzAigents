#!/bin/bash

# Port Check and Service Management Script for Ez Aigent
# This script checks for port conflicts and manages services safely

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ez Aigent service ports (using arrays for compatibility)
REDIS_PORTS="6379"
DASHBOARD_PORTS="3000"
NGINX_PORTS="80,443"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        print_status $RED "❌ Port $port is in use by PID $pid ($process)"
        
        # Get more details about the process
        if command -v lsof >/dev/null 2>&1; then
            local details=$(lsof -Pi :$port -sTCP:LISTEN)
            echo "   Details: $details"
        fi
        
        return 1
    else
        print_status $GREEN "✅ Port $port is available for $service_name"
        return 0
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    print_status $YELLOW "🔄 Attempting to free port $port..."
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pids=$(lsof -Pi :$port -sTCP:LISTEN -t)
        for pid in $pids; do
            local process=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
            print_status $YELLOW "   Killing PID $pid ($process)"
            kill -TERM $pid 2>/dev/null || kill -KILL $pid 2>/dev/null
        done
        
        # Wait a moment and check again
        sleep 2
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_status $GREEN "✅ Port $port freed successfully"
            return 0
        else
            print_status $RED "❌ Failed to free port $port"
            return 1
        fi
    else
        print_status $GREEN "✅ Port $port was already free"
        return 0
    fi
}

# Function to check Docker status
check_docker() {
    print_status $BLUE "🐳 Checking Docker status..."
    
    if ! command -v docker >/dev/null 2>&1; then
        print_status $RED "❌ Docker is not installed"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_status $RED "❌ Docker daemon is not running"
        return 1
    fi
    
    print_status $GREEN "✅ Docker is running"
    return 0
}

# Function to check Docker Compose status
check_docker_compose() {
    print_status $BLUE "🐳 Checking Docker Compose..."
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        if ! docker compose version >/dev/null 2>&1; then
            print_status $RED "❌ Docker Compose is not available"
            return 1
        else
            print_status $GREEN "✅ Docker Compose (plugin) is available"
            return 0
        fi
    else
        print_status $GREEN "✅ Docker Compose is available"
        return 0
    fi
}

# Function to list running Ez Aigent containers
list_containers() {
    print_status $BLUE "📦 Checking Ez Aigent containers..."
    
    local containers=$(docker ps --filter "name=ezaigents" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
    
    if [ -n "$containers" ] && [ "$containers" != "NAMES	STATUS	PORTS" ]; then
        echo "$containers"
        return 0
    else
        print_status $YELLOW "⚠️  No Ez Aigent containers running"
        return 1
    fi
}

# Function to stop all Ez Aigent services
stop_services() {
    print_status $BLUE "🛑 Stopping Ez Aigent services..."
    
    # Try docker-compose first
    if [ -f "docker-compose.yml" ]; then
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose down 2>/dev/null || true
        else
            docker compose down 2>/dev/null || true
        fi
    fi
    
    # Stop individual containers if they exist
    local containers=$(docker ps -q --filter "name=ezaigents")
    if [ -n "$containers" ]; then
        print_status $YELLOW "🔄 Stopping remaining containers..."
        docker stop $containers >/dev/null 2>&1 || true
        docker rm $containers >/dev/null 2>&1 || true
    fi
    
    print_status $GREEN "✅ All Ez Aigent services stopped"
}

# Function to check all ports
check_all_ports() {
    print_status $BLUE "🔍 Checking all required ports..."
    
    local all_clear=true
    
    # Check Redis ports
    IFS=',' read -ra port_array <<< "$REDIS_PORTS"
    for port in "${port_array[@]}"; do
        if ! check_port $port "redis"; then
            all_clear=false
        fi
    done
    
    # Check Dashboard ports
    IFS=',' read -ra port_array <<< "$DASHBOARD_PORTS"
    for port in "${port_array[@]}"; do
        if ! check_port $port "dashboard"; then
            all_clear=false
        fi
    done
    
    # Check Nginx ports
    IFS=',' read -ra port_array <<< "$NGINX_PORTS"
    for port in "${port_array[@]}"; do
        if ! check_port $port "nginx"; then
            all_clear=false
        fi
    done
    
    if $all_clear; then
        print_status $GREEN "🎉 All ports are available!"
        return 0
    else
        print_status $RED "⚠️  Some ports are in use"
        return 1
    fi
}

# Function to free all Ez Aigent ports
free_ports() {
    print_status $BLUE "🧹 Freeing Ez Aigent ports..."
    
    # Free Redis ports
    IFS=',' read -ra port_array <<< "$REDIS_PORTS"
    for port in "${port_array[@]}"; do
        kill_port $port
    done
    
    # Free Dashboard ports
    IFS=',' read -ra port_array <<< "$DASHBOARD_PORTS"
    for port in "${port_array[@]}"; do
        kill_port $port
    done
    
    # Free Nginx ports
    IFS=',' read -ra port_array <<< "$NGINX_PORTS"
    for port in "${port_array[@]}"; do
        kill_port $port
    done
}

# Function to start services safely
start_services() {
    print_status $BLUE "🚀 Starting Ez Aigent services..."
    
    # Check prerequisites
    if ! check_docker; then
        print_status $RED "❌ Cannot start services - Docker issues"
        return 1
    fi
    
    if ! check_docker_compose; then
        print_status $RED "❌ Cannot start services - Docker Compose issues"
        return 1
    fi
    
    # Check ports
    if ! check_all_ports; then
        print_status $YELLOW "⚠️  Port conflicts detected"
        read -p "Do you want to stop conflicting services? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            free_ports
            sleep 2
            if ! check_all_ports; then
                print_status $RED "❌ Still have port conflicts after cleanup"
                return 1
            fi
        else
            print_status $RED "❌ Cannot start with port conflicts"
            return 1
        fi
    fi
    
    # Start services
    if [ -f "docker-compose.yml" ]; then
        print_status $BLUE "🏗️  Building and starting services..."
        
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose up -d --build
        else
            docker compose up -d --build
        fi
        
        # Wait a moment for services to start
        sleep 5
        
        # Check if services started successfully
        list_containers
        
        print_status $GREEN "🎉 Ez Aigent services started successfully!"
        print_status $BLUE "📱 Dashboard: http://localhost:3000"
        print_status $BLUE "📊 Redis: localhost:6379"
        
    else
        print_status $RED "❌ docker-compose.yml not found"
        return 1
    fi
}

# Function to show service status
show_status() {
    print_status $BLUE "📊 Ez Aigent Service Status"
    echo "=================================="
    
    check_docker
    check_docker_compose
    echo
    
    check_all_ports
    echo
    
    list_containers
    echo
    
    # Check logs if services are running
    if docker ps -q --filter "name=ezaigents" >/dev/null 2>&1; then
        print_status $BLUE "📝 Recent logs (last 5 lines per service):"
        local containers=$(docker ps --filter "name=ezaigents" --format "{{.Names}}")
        for container in $containers; do
            echo "--- $container ---"
            docker logs --tail 5 $container 2>/dev/null || echo "No logs available"
            echo
        done
    fi
}

# Main script logic
case "${1:-status}" in
    "check")
        check_all_ports
        ;;
    "free")
        free_ports
        ;;
    "stop")
        stop_services
        ;;
    "start")
        start_services
        ;;
    "restart")
        stop_services
        sleep 3
        start_services
        ;;
    "status")
        show_status
        ;;
    "help")
        echo "Usage: $0 {check|free|stop|start|restart|status|help}"
        echo ""
        echo "Commands:"
        echo "  check    - Check if required ports are available"
        echo "  free     - Kill processes using Ez Aigent ports"
        echo "  stop     - Stop all Ez Aigent services"
        echo "  start    - Start Ez Aigent services (with port checks)"
        echo "  restart  - Stop and start services"
        echo "  status   - Show complete service status"
        echo "  help     - Show this help message"
        ;;
    *)
        print_status $RED "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac