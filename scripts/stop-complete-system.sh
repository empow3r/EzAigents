#!/bin/bash

# Complete EzAigents System Shutdown Script
# This script stops all components of the system

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

log_header "🛑 Stopping Complete EzAigents System"

# Check if running from project root
if [ ! -f "CLAUDE.md" ]; then
    log_error "Please run this script from the EzAigents project root directory"
    exit 1
fi

# Stop master controller
log_info "Stopping Master Agent Controller..."

if [ -f ".master-controller.pid" ]; then
    MASTER_PID=$(cat .master-controller.pid)
    
    if kill -0 $MASTER_PID 2>/dev/null; then
        # Send SIGTERM for graceful shutdown
        kill -TERM $MASTER_PID
        
        # Wait for graceful shutdown
        sleep 10
        
        # Force kill if still running
        if kill -0 $MASTER_PID 2>/dev/null; then
            log_warn "Master Controller didn't shutdown gracefully, force killing..."
            kill -KILL $MASTER_PID 2>/dev/null || true
        fi
        
        log_info "✅ Master Agent Controller stopped"
    else
        log_warn "Master Controller PID $MASTER_PID not running"
    fi
    
    rm -f .master-controller.pid
else
    log_warn "No master controller PID file found"
fi

# Stop dashboard
log_info "Stopping Dashboard..."

if [ -f ".dashboard.pid" ]; then
    DASHBOARD_PID=$(cat .dashboard.pid)
    
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        kill -TERM $DASHBOARD_PID
        sleep 5
        
        if kill -0 $DASHBOARD_PID 2>/dev/null; then
            kill -KILL $DASHBOARD_PID 2>/dev/null || true
        fi
        
        log_info "✅ Dashboard stopped"
    else
        log_warn "Dashboard PID $DASHBOARD_PID not running"
    fi
    
    rm -f .dashboard.pid
else
    log_warn "No dashboard PID file found"
fi

# Stop any remaining agent processes
log_info "Stopping any remaining agent processes..."

# Kill processes by name pattern
pkill -f "enhanced-claude-agent" 2>/dev/null || true
pkill -f "agent.*index.js" 2>/dev/null || true
pkill -f "workload-balancer" 2>/dev/null || true
pkill -f "agent-auto-scaler" 2>/dev/null || true

log_info "✅ Agent processes stopped"

# Clean up Redis state
log_info "Cleaning up Redis state..."

if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
    # Graceful shutdown messages
    redis-cli PUBLISH system_shutdown '{"type":"graceful_shutdown","timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' >/dev/null 2>&1 || true
    
    # Wait for agents to shutdown gracefully
    sleep 5
    
    # Clean up coordination state
    redis-cli DEL $(redis-cli KEYS "lock:*" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "command_lock:*" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "agents" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "master_controller" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "balancer" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "scaler" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "assistance_providers:*" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "assistance_session:*" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "coordination:*" 2>/dev/null) 2>/dev/null || true
    redis-cli DEL $(redis-cli KEYS "command_meta:*" 2>/dev/null) 2>/dev/null || true
    
    log_info "✅ Redis state cleaned up"
else
    log_warn "Redis not available for cleanup"
fi

# Clean up temporary files
log_info "Cleaning up temporary files..."

rm -f /tmp/start_master_controller.js
rm -f .master-controller.pid
rm -f .dashboard.pid

log_info "✅ Temporary files cleaned up"

# Show final system status
log_header "📊 Final System Status"

# Check if any processes are still running
REMAINING_PROCESSES=$(ps aux | grep -E "(enhanced-claude-agent|agent.*index.js|workload-balancer|agent-auto-scaler|master-agent-controller)" | grep -v grep | wc -l)

if [ $REMAINING_PROCESSES -gt 0 ]; then
    log_warn "Some processes may still be running:"
    ps aux | grep -E "(enhanced-claude-agent|agent.*index.js|workload-balancer|agent-auto-scaler|master-agent-controller)" | grep -v grep
else
    log_info "All agent processes stopped"
fi

# Check Redis state
if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
    ACTIVE_AGENTS=$(redis-cli HLEN agents 2>/dev/null || echo "0")
    ACTIVE_LOCKS=$(redis-cli KEYS "lock:*" 2>/dev/null | wc -l)
    ACTIVE_COMMANDS=$(redis-cli KEYS "command_lock:*" 2>/dev/null | wc -l)
    
    log_info "Redis State:"
    log_info "  Active Agents: $ACTIVE_AGENTS"
    log_info "  Active Locks: $ACTIVE_LOCKS"
    log_info "  Active Commands: $ACTIVE_COMMANDS"
    
    if [ $ACTIVE_AGENTS -eq 0 ] && [ $ACTIVE_LOCKS -eq 0 ] && [ $ACTIVE_COMMANDS -eq 0 ]; then
        log_info "✅ Redis state is clean"
    else
        log_warn "Some Redis state may remain"
    fi
else
    log_warn "Redis not available for status check"
fi

# Log rotation
log_info "Rotating logs..."

if [ -f "logs/master-controller.log" ]; then
    mv logs/master-controller.log logs/master-controller.log.$(date +%Y%m%d_%H%M%S)
fi

if [ -f "logs/dashboard.log" ]; then
    mv logs/dashboard.log logs/dashboard.log.$(date +%Y%m%d_%H%M%S)
fi

log_info "✅ Logs rotated"

# Show restart instructions
log_header "🔄 System Restart Instructions"
echo "To restart the system:"
echo "  ./scripts/start-complete-system.sh"
echo ""
echo "To restart with test tasks:"
echo "  ./scripts/start-complete-system.sh --test"
echo ""
echo "To start individual components:"
echo "  node cli/master-agent-controller.js"
echo "  node cli/workload-balancer.js"
echo "  node cli/agent-auto-scaler.js"

log_header "🎉 Complete EzAigents System Stopped Successfully!"
log_info "All components have been shut down gracefully"
log_info "System is ready for restart when needed"

# Success
exit 0