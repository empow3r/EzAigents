#!/bin/bash

# Complete EzAigents System Startup Script
# This script starts the complete system with auto-scaling and workload balancing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_header() {
    echo -e "${BLUE}[SYSTEM]${NC} $1"
}

# Check if running from project root
if [ ! -f "CLAUDE.md" ]; then
    log_error "Please run this script from the EzAigents project root directory"
    exit 1
fi

log_header "🚀 Starting Complete EzAigents System with Auto-Scaling"

# Check prerequisites
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
    log_error "Redis server is not running. Please start Redis first."
    log_info "You can start Redis with: redis-server"
    log_info "Or using Docker: docker run -d -p 6379:6379 redis:alpine"
    exit 1
fi

log_info "✅ Prerequisites check passed"

# Setup environment
log_info "Setting up environment..."

# Create necessary directories
mkdir -p logs
mkdir -p .agent-memory
mkdir -p .queue-context

# Check .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warn "Created .env file from .env.example. Please configure your API keys."
    else
        log_error "No .env file found. Please create one with your API keys."
        exit 1
    fi
fi

# Source environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

# Check critical environment variables
if [ -z "$REDIS_URL" ]; then
    export REDIS_URL="redis://localhost:6379"
    log_info "Using default Redis URL: $REDIS_URL"
fi

log_info "✅ Environment setup complete"

# Clear any existing state
log_info "Clearing previous system state..."
redis-cli DEL $(redis-cli KEYS "lock:*" 2>/dev/null) 2>/dev/null || true
redis-cli DEL $(redis-cli KEYS "command_lock:*" 2>/dev/null) 2>/dev/null || true
redis-cli DEL $(redis-cli KEYS "agents" 2>/dev/null) 2>/dev/null || true
redis-cli DEL $(redis-cli KEYS "master_controller" 2>/dev/null) 2>/dev/null || true
redis-cli DEL $(redis-cli KEYS "balancer" 2>/dev/null) 2>/dev/null || true
redis-cli DEL $(redis-cli KEYS "scaler" 2>/dev/null) 2>/dev/null || true

log_info "✅ System state cleared"

# Start the master controller
log_header "🎛️  Starting Master Agent Controller..."

# Create start script
cat > /tmp/start_master_controller.js << 'EOF'
const MasterAgentController = require('./cli/master-agent-controller');

const controller = new MasterAgentController();

controller.start().catch(error => {
    console.error('Failed to start Master Agent Controller:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Master Agent Controller...');
    await controller.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down Master Agent Controller...');
    await controller.shutdown();
    process.exit(0);
});
EOF

# Start master controller in background
nohup node /tmp/start_master_controller.js > logs/master-controller.log 2>&1 &
MASTER_PID=$!

log_info "✅ Master Agent Controller started (PID: $MASTER_PID)"

# Wait for master controller to initialize
log_info "Waiting for system initialization..."
sleep 10

# Check if master controller is running
if ! kill -0 $MASTER_PID 2>/dev/null; then
    log_error "Master Agent Controller failed to start. Check logs/master-controller.log"
    exit 1
fi

# Start dashboard
log_header "🖥️  Starting Dashboard..."

cd dashboard
nohup npm run dev > ../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..

log_info "✅ Dashboard started (PID: $DASHBOARD_PID)"

# Give system time to fully initialize
log_info "Waiting for full system initialization..."
sleep 15

# Check system status
log_header "📊 System Status Check"

# Check Redis connections
REDIS_STATUS=$(redis-cli ping 2>/dev/null || echo "FAILED")
log_info "Redis Status: $REDIS_STATUS"

# Check active agents
AGENT_COUNT=$(redis-cli HLEN agents 2>/dev/null || echo "0")
log_info "Active Agents: $AGENT_COUNT"

# Check queue status
TOTAL_TASKS=0
for queue in "queue:claude-3-opus" "queue:gpt-4o" "queue:deepseek-coder" "queue:command-r-plus" "queue:gemini-pro"; do
    QUEUE_SIZE=$(redis-cli LLEN $queue 2>/dev/null || echo "0")
    TOTAL_TASKS=$((TOTAL_TASKS + QUEUE_SIZE))
done

log_info "Total Tasks in Queues: $TOTAL_TASKS"

# Check if master controller is registered
MASTER_REGISTERED=$(redis-cli HLEN master_controller 2>/dev/null || echo "0")
log_info "Master Controller Registered: $MASTER_REGISTERED"

# Display system information
log_header "🎯 System Information"
echo "Dashboard: http://localhost:3000"
echo "Redis: $REDIS_URL"
echo "Master Controller PID: $MASTER_PID"
echo "Dashboard PID: $DASHBOARD_PID"
echo "Log Files:"
echo "  - Master Controller: logs/master-controller.log"
echo "  - Dashboard: logs/dashboard.log"

# Create PID file for easy management
echo "$MASTER_PID" > .master-controller.pid
echo "$DASHBOARD_PID" > .dashboard.pid

log_header "🎮 System Control Commands"
echo "Monitor system:"
echo "  - redis-cli HGETALL master_controller"
echo "  - redis-cli LRANGE system_status_log 0 5"
echo "  - redis-cli LRANGE performance_reports 0 3"
echo ""
echo "Stop system:"
echo "  - ./scripts/stop-complete-system.sh"
echo ""
echo "Manual scaling:"
echo "  - redis-cli PUBLISH emergency_scaling '{\"type\":\"emergency\",\"action\":\"scale_up_emergency\",\"target_agents\":5}'"
echo ""
echo "View logs:"
echo "  - tail -f logs/master-controller.log"
echo "  - tail -f logs/dashboard.log"

# Show initial performance report
log_header "📈 Initial Performance Report"
sleep 5

# Get initial stats
SYSTEM_UTILIZATION=$(redis-cli HGET master_controller system_utilization 2>/dev/null || echo "0")
ACTIVE_AGENTS=$(redis-cli HLEN agents 2>/dev/null || echo "0")
QUEUE_DEPTH=$(redis-cli EVAL "local total=0; for i,queue in ipairs({'queue:claude-3-opus','queue:gpt-4o','queue:deepseek-coder','queue:command-r-plus','queue:gemini-pro'}) do total=total+redis.call('llen',queue) end; return total" 0 2>/dev/null || echo "0")

echo "System Utilization: $SYSTEM_UTILIZATION"
echo "Active Agents: $ACTIVE_AGENTS"
echo "Queue Depth: $QUEUE_DEPTH"

# Enqueue some sample tasks to test the system
log_header "🧪 Testing System with Sample Tasks"

if [ "$1" = "--test" ]; then
    log_info "Enqueueing sample tasks for testing..."
    
    # Create sample tasks
    redis-cli LPUSH "queue:claude-3-opus" '{"file":"test/sample.js","prompt":"Refactor this JavaScript code for better performance","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' >/dev/null
    redis-cli LPUSH "queue:gpt-4o" '{"file":"test/api.js","prompt":"Create REST API endpoints for user management","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' >/dev/null
    redis-cli LPUSH "queue:deepseek-coder" '{"file":"test/test.js","prompt":"Write unit tests for the authentication module","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' >/dev/null
    redis-cli LPUSH "queue:command-r-plus" '{"file":"README.md","prompt":"Create comprehensive documentation for the API","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' >/dev/null
    redis-cli LPUSH "queue:gemini-pro" '{"file":"src/optimization.js","prompt":"Analyze and optimize performance bottlenecks","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' >/dev/null
    
    log_info "✅ Sample tasks enqueued"
    
    # Wait for system to process tasks
    log_info "Waiting for system to process tasks..."
    sleep 30
    
    # Check results
    PROCESSED_TASKS=$(redis-cli EVAL "local total=0; for i,queue in ipairs({'processing:claude-3-opus','processing:gpt-4o','processing:deepseek-coder','processing:command-r-plus','processing:gemini-pro'}) do total=total+redis.call('llen',queue) end; return total" 0 2>/dev/null || echo "0")
    
    log_info "Tasks being processed: $PROCESSED_TASKS"
    
    # Show agent activity
    log_info "Agent activity:"
    redis-cli HGETALL agents 2>/dev/null | while read -r key; do
        read -r value
        echo "  $key: $(echo $value | jq -r '.type // .status // "unknown"' 2>/dev/null || echo "unknown")"
    done
fi

log_header "🎉 Complete EzAigents System Started Successfully!"
log_info "System is now running with auto-scaling and workload balancing"
log_info "Dashboard available at: http://localhost:3000"
log_info "Use 'tail -f logs/master-controller.log' to monitor system activity"
log_info "Use './scripts/stop-complete-system.sh' to stop the system"

# Clean up temporary files
rm -f /tmp/start_master_controller.js

# Success
exit 0