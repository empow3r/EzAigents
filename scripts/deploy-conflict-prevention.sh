#!/bin/bash

# Deploy Agent Conflict Prevention System
# This script sets up and deploys the conflict prevention system

set -e

echo "🚀 Deploying Agent Conflict Prevention System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        log_error "Redis is required but not installed"
        exit 1
    fi
    
    # Check Redis connection
    if ! redis-cli ping &> /dev/null; then
        log_error "Redis server is not running"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install CLI dependencies
    if [ -f "cli/package.json" ]; then
        cd cli
        npm install
        cd ..
    fi
    
    # Install agent dependencies
    for agent_dir in agents/*/; do
        if [ -f "${agent_dir}package.json" ]; then
            log_info "Installing dependencies for ${agent_dir}"
            cd "$agent_dir"
            npm install
            cd "../.."
        fi
    done
    
    log_info "Dependencies installed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Created .env file from .env.example"
        elif [ -f "config/env.example" ]; then
            cp config/env.example .env
            log_info "Created .env file from config/env.example"
        else
            log_warn "No .env template found. Creating minimal .env file"
            cat > .env << EOF
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Agent Configuration
AGENT_ID=\$(hostname)_\$(date +%s)
AGENT_TYPE=system
AGENT_CAPABILITIES=coordination,monitoring

# Coordination System
ENABLE_COORDINATION=true
LOCK_TIMEOUT=1800
HEARTBEAT_INTERVAL=30000

# Logging
LOG_LEVEL=info
DEBUG=coordination:*
EOF
        fi
    fi
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p examples
    mkdir -p .agent-memory
    
    log_info "Environment setup complete"
}

# Clear Redis state
clear_redis_state() {
    log_info "Clearing Redis state..."
    
    # Clear all coordination-related keys
    redis-cli DEL $(redis-cli KEYS "lock:*" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "agents" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "coordination:*" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "messages:*" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "work_queue:*" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "approval:*" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "force-lock-log" 2>/dev/null || true) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "emergency-log" 2>/dev/null || true) 2>/dev/null || true
    
    log_info "Redis state cleared"
}

# Test coordination system
test_coordination() {
    log_info "Testing coordination system..."
    
    # Test file lock manager
    if [ -f "cli/file-lock-manager.js" ]; then
        log_info "✅ File lock manager found"
    else
        log_error "❌ File lock manager not found"
        exit 1
    fi
    
    # Test agent coordination
    if [ -f "cli/agent-coordination.js" ]; then
        log_info "✅ Agent coordination found"
    else
        log_error "❌ Agent coordination not found"
        exit 1
    fi
    
    # Test Redis connection
    if redis-cli ping > /dev/null 2>&1; then
        log_info "✅ Redis connection working"
    else
        log_error "❌ Redis connection failed"
        exit 1
    fi
    
    log_info "Coordination system tests passed"
}

# Deploy agents with coordination
deploy_agents() {
    log_info "Deploying agents with coordination..."
    
    # Build Docker images if docker-compose.yml exists
    if [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ]; then
        log_info "Building Docker images..."
        docker-compose build
        
        # Start services
        log_info "Starting services..."
        docker-compose up -d
        
        # Wait for services to be ready
        sleep 10
        
        # Check service health
        if docker-compose ps | grep -q "Up"; then
            log_info "✅ Docker services are running"
        else
            log_warn "⚠️  Some Docker services may not be running properly"
        fi
    else
        log_info "No docker-compose.yml found, starting agents manually..."
        
        # Start agents manually (example)
        # This would need to be customized based on your specific setup
        log_info "Manual agent startup - please start agents individually"
    fi
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Create monitoring script
    cat > scripts/monitor-coordination.sh << 'EOF'
#!/bin/bash

# Monitor Agent Coordination System

echo "🔍 Agent Coordination System Status"
echo "=================================="

# Check active agents
echo -e "\n📊 Active Agents:"
redis-cli HGETALL agents | while read -r key; do
    read -r value
    echo "  $key: $(echo $value | jq -r '.type // .status // "unknown"')"
done

# Check active locks
echo -e "\n🔒 Active File Locks:"
redis-cli KEYS "lock:*" | grep -v "meta:" | head -10 | while read -r key; do
    if [ -n "$key" ]; then
        file=$(echo $key | sed 's/lock://')
        owner=$(redis-cli GET $key)
        ttl=$(redis-cli TTL $key)
        echo "  $file -> $owner (TTL: ${ttl}s)"
    fi
done

# Check coordination requests
echo -e "\n🤝 Coordination Requests:"
redis-cli KEYS "coordination:*" | head -5 | while read -r key; do
    if [ -n "$key" ]; then
        data=$(redis-cli HGETALL $key)
        echo "  $key: $data"
    fi
done

# Check work queues
echo -e "\n📋 Work Queues:"
redis-cli KEYS "work_queue:*" | head -5 | while read -r key; do
    if [ -n "$key" ]; then
        length=$(redis-cli LLEN $key)
        echo "  $key: $length items"
    fi
done

# Check system health
echo -e "\n💚 System Health:"
redis_status=$(redis-cli ping 2>/dev/null || echo "FAILED")
echo "  Redis: $redis_status"

agent_count=$(redis-cli HLEN agents 2>/dev/null || echo "0")
echo "  Active Agents: $agent_count"

lock_count=$(redis-cli KEYS "lock:*" 2>/dev/null | wc -l)
echo "  Active Locks: $lock_count"

echo -e "\n🔄 Real-time Monitoring (Press Ctrl+C to stop):"
redis-cli PSUBSCRIBE "agent:*" "coordination:*" "file-locks" "work:*"
EOF

    chmod +x scripts/monitor-coordination.sh
    
    log_info "Monitoring setup complete"
}

# Create systemd service (optional)
create_systemd_service() {
    if [ "$1" = "--systemd" ]; then
        log_info "Creating systemd service..."
        
        cat > /tmp/ezaigent-coordination.service << EOF
[Unit]
Description=EzAigent Coordination System
After=network.target redis.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$(pwd)
ExecStart=$(which node) cli/coordination-service.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=REDIS_URL=redis://localhost:6379

[Install]
WantedBy=multi-user.target
EOF
        
        sudo mv /tmp/ezaigent-coordination.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable ezaigent-coordination
        
        log_info "Systemd service created and enabled"
    fi
}

# Main deployment function
main() {
    log_info "Starting Agent Conflict Prevention System deployment..."
    
    # Check if running in project directory
    if [ ! -f "CLAUDE.md" ]; then
        log_error "Please run this script from the EzAigents project root directory"
        exit 1
    fi
    
    # Run deployment steps
    check_prerequisites
    install_dependencies
    setup_environment
    clear_redis_state
    test_coordination
    deploy_agents
    setup_monitoring
    create_systemd_service "$1"
    
    log_info "✅ Agent Conflict Prevention System deployed successfully!"
    
    # Show next steps
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Monitor system: ./scripts/monitor-coordination.sh"
    echo "2. Test coordination: node examples/agent-coordination-integration.js"
    echo "3. Check logs: docker-compose logs -f"
    echo "4. Dashboard: http://localhost:3000"
    echo ""
    echo "📚 Documentation: AGENT_CONFLICT_PREVENTION.md"
    echo "🔧 Configuration: .env file"
    echo "🐛 Debugging: redis-cli PSUBSCRIBE 'agent:*'"
}

# Run main function
main "$@"