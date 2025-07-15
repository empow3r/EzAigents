#!/bin/bash

# Production Docker Deployment Script for Ez Aigent
# This script deploys the complete Ez Aigent system to Docker with full coordination

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
DATA_DIR="./data"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        print_status $RED "❌ Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        print_status $RED "❌ Docker Compose is not available"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_status $RED "❌ Docker daemon is not running"
        exit 1
    fi
    
    print_status $GREEN "✅ All prerequisites met"
}

# Function to prepare environment
prepare_environment() {
    print_status $BLUE "📋 Preparing deployment environment..."
    
    # Create data directories
    mkdir -p "${DATA_DIR}"/{redis,agent-memory,shared-state,logs}
    print_status $GREEN "✅ Data directories created"
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        print_status $YELLOW "⚠️  Production environment file not found"
        print_status $BLUE "Creating template environment file..."
        
        # Create basic env file if it doesn't exist
        cat > "$ENV_FILE" << EOF
NODE_ENV=production
REDIS_PASSWORD=ezaigent123
CLAUDE_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEYS=your-deepseek-keys
AGENT_AUTO_RESTART=true
EOF
        
        print_status $YELLOW "⚠️  Please update $ENV_FILE with your API keys before continuing"
        read -p "Press Enter when you've updated the environment file..."
    fi
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        print_status $GREEN "✅ Environment variables loaded"
    fi
}

# Function to check API keys
check_api_keys() {
    print_status $BLUE "🔑 Checking API keys..."
    
    local missing_keys=()
    
    if [[ -z "$CLAUDE_API_KEY" || "$CLAUDE_API_KEY" == "your-claude-api-key-here" ]]; then
        missing_keys+=("CLAUDE_API_KEY")
    fi
    
    if [[ -z "$OPENAI_API_KEY" || "$OPENAI_API_KEY" == "your-openai-api-key-here" ]]; then
        missing_keys+=("OPENAI_API_KEY")
    fi
    
    if [ ${#missing_keys[@]} -gt 0 ]; then
        print_status $YELLOW "⚠️  Missing or placeholder API keys: ${missing_keys[*]}"
        print_status $BLUE "The system will start but these agents won't function without valid keys"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_status $GREEN "✅ API keys configured"
    fi
}

# Function to build containers
build_containers() {
    print_status $BLUE "🏗️  Building Docker containers..."
    
    # Build all containers
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" build --parallel
    else
        docker compose -f "$COMPOSE_FILE" build --parallel
    fi
    
    print_status $GREEN "✅ Containers built successfully"
}

# Function to start services
start_services() {
    print_status $BLUE "🚀 Starting Ez Aigent services..."
    
    # Start services
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        docker compose -f "$COMPOSE_FILE" up -d
    fi
    
    print_status $GREEN "✅ Services started"
}

# Function to wait for services
wait_for_services() {
    print_status $BLUE "⏳ Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local healthy_services=0
        local total_services=0
        
        # Count healthy services
        if command -v docker-compose >/dev/null 2>&1; then
            local services=$(docker-compose -f "$COMPOSE_FILE" ps --services)
        else
            local services=$(docker compose -f "$COMPOSE_FILE" ps --services)
        fi
        
        for service in $services; do
            total_services=$((total_services + 1))
            local health=$(docker inspect --format='{{.State.Health.Status}}' "ezaigents-${service}" 2>/dev/null || echo "no-health-check")
            
            if [[ "$health" == "healthy" ]] || [[ "$health" == "no-health-check" && $(docker inspect --format='{{.State.Status}}' "ezaigents-${service}" 2>/dev/null) == "running" ]]; then
                healthy_services=$((healthy_services + 1))
            fi
        done
        
        if [ $healthy_services -eq $total_services ]; then
            print_status $GREEN "✅ All services are healthy"
            return 0
        fi
        
        print_status $YELLOW "⏳ Waiting for services... ($healthy_services/$total_services healthy) - Attempt $attempt/$max_attempts"
        sleep 5
        attempt=$((attempt + 1))
    done
    
    print_status $YELLOW "⚠️  Some services may not be fully ready yet"
    return 1
}

# Function to show service status
show_status() {
    print_status $BLUE "📊 Service Status:"
    echo "=================================="
    
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" ps
    else
        docker compose -f "$COMPOSE_FILE" ps
    fi
    
    echo
    print_status $BLUE "🏥 Agent Health Status:"
    
    # Check if health monitor is available
    if docker exec ezaigents-health-monitor ./scripts/agent-health-monitor.sh status 2>/dev/null; then
        print_status $GREEN "✅ Health monitoring active"
    else
        print_status $YELLOW "⚠️  Health monitor starting up..."
    fi
}

# Function to show access information
show_access_info() {
    print_status $BLUE "🌐 Access Information:"
    echo "=================================="
    
    local dashboard_port=${DASHBOARD_PORT:-3000}
    local redis_port=${REDIS_PORT:-6379}
    
    print_status $GREEN "🎛️  Dashboard: http://localhost:${dashboard_port}"
    print_status $GREEN "📊 WebScraper Interface: http://localhost:${dashboard_port} (integrated)"
    print_status $BLUE "🔧 Redis: localhost:${redis_port} (password: ${REDIS_PASSWORD:-ezaigent123})"
    
    echo
    print_status $BLUE "🔧 Management Commands:"
    echo "  View logs:           docker-compose -f $COMPOSE_FILE logs -f"
    echo "  Stop services:       docker-compose -f $COMPOSE_FILE down"
    echo "  Restart services:    docker-compose -f $COMPOSE_FILE restart"
    echo "  Scale agents:        docker-compose -f $COMPOSE_FILE up -d --scale claude-agent=2"
    echo "  Health monitor:      docker exec ezaigents-health-monitor ./scripts/agent-health-monitor.sh status"
    echo "  Agent coordination:  docker exec ezaigents-redis redis-cli -a ${REDIS_PASSWORD:-ezaigent123} HGETALL agents:registry"
}

# Function to run tests
run_tests() {
    print_status $BLUE "🧪 Running deployment tests..."
    
    # Test Redis connectivity
    if docker exec ezaigents-redis redis-cli -a "${REDIS_PASSWORD:-ezaigent123}" ping >/dev/null 2>&1; then
        print_status $GREEN "✅ Redis connectivity test passed"
    else
        print_status $RED "❌ Redis connectivity test failed"
        return 1
    fi
    
    # Test dashboard accessibility
    if curl -f "http://localhost:${DASHBOARD_PORT:-3000}/api/health" >/dev/null 2>&1; then
        print_status $GREEN "✅ Dashboard accessibility test passed"
    else
        print_status $YELLOW "⚠️  Dashboard may still be starting up"
    fi
    
    # Test agent coordination
    sleep 10  # Wait for agents to register
    
    local agent_count=$(docker exec ezaigents-redis redis-cli -a "${REDIS_PASSWORD:-ezaigent123}" HLEN agents:registry 2>/dev/null || echo "0")
    if [ "$agent_count" -gt "0" ]; then
        print_status $GREEN "✅ Agent coordination test passed ($agent_count agents registered)"
    else
        print_status $YELLOW "⚠️  Agents may still be starting up"
    fi
    
    print_status $GREEN "✅ Deployment tests completed"
}

# Function to cleanup on failure
cleanup_on_failure() {
    print_status $RED "❌ Deployment failed. Cleaning up..."
    
    if command -v docker-compose >/dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    else
        docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    fi
    
    print_status $BLUE "🔧 Troubleshooting tips:"
    echo "  1. Check Docker daemon: docker info"
    echo "  2. Check logs: docker-compose -f $COMPOSE_FILE logs"
    echo "  3. Check environment: cat $ENV_FILE"
    echo "  4. Check API keys in environment file"
    echo "  5. Ensure ports 3000 and 6379 are available"
}

# Main deployment function
main() {
    print_status $PURPLE "🐳 Ez Aigent Production Docker Deployment"
    print_status $PURPLE "==========================================="
    
    # Trap errors for cleanup
    trap cleanup_on_failure ERR
    
    # Run deployment steps
    check_prerequisites
    prepare_environment
    check_api_keys
    build_containers
    start_services
    wait_for_services
    
    # Show status and access info
    show_status
    show_access_info
    
    # Run tests
    run_tests
    
    print_status $GREEN "🎉 Ez Aigent deployment completed successfully!"
    print_status $BLUE "🔄 The system includes:"
    print_status $BLUE "   ✅ Universal Agent Coordination System"
    print_status $BLUE "   ✅ Automatic Port Management"
    print_status $BLUE "   ✅ File Locking & Resource Management"
    print_status $BLUE "   ✅ Health Monitoring & Auto-Restart"
    print_status $BLUE "   ✅ WebScraper with AI Integration"
    print_status $BLUE "   ✅ Production-Ready Dashboard"
    
    echo
    print_status $GREEN "🌟 Your Ez Aigent multi-agent system is now running!"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        print_status $BLUE "🛑 Stopping Ez Aigent services..."
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose -f "$COMPOSE_FILE" down
        else
            docker compose -f "$COMPOSE_FILE" down
        fi
        print_status $GREEN "✅ Services stopped"
        ;;
    "restart")
        print_status $BLUE "🔄 Restarting Ez Aigent services..."
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose -f "$COMPOSE_FILE" restart
        else
            docker compose -f "$COMPOSE_FILE" restart
        fi
        print_status $GREEN "✅ Services restarted"
        ;;
    "status")
        show_status
        ;;
    "logs")
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose -f "$COMPOSE_FILE" logs -f
        else
            docker compose -f "$COMPOSE_FILE" logs -f
        fi
        ;;
    "help")
        echo "Ez Aigent Production Docker Deployment"
        echo ""
        echo "Usage: $0 {deploy|stop|restart|status|logs|help}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy the complete Ez Aigent system"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status"
        echo "  logs     - Show and follow service logs"
        echo "  help     - Show this help message"
        ;;
    *)
        print_status $RED "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac