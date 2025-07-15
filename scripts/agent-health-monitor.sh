#!/bin/bash

# Ez Aigent Health Monitor Script
# Monitors agent health and provides auto-restart functionality

REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}
CHECK_INTERVAL=${AGENT_HEALTH_CHECK_INTERVAL:-30}
ALERT_THRESHOLD=${AGENT_ALERT_THRESHOLD:-120}
AUTO_RESTART=${AGENT_AUTO_RESTART:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Redis is available
check_redis() {
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Get agent status from Redis
get_agent_status() {
    if check_redis; then
        redis-cli -u "$REDIS_URL" HGETALL agents:heartbeats 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Get agent registry
get_agent_registry() {
    if check_redis; then
        redis-cli -u "$REDIS_URL" HGETALL agents:registry 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Check Docker container status via API or healthcheck
check_docker_container() {
    local container_name="$1"
    if command -v docker >/dev/null 2>&1; then
        docker ps --filter "name=$container_name" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null | grep -v "NAMES"
    else
        # Fallback: check via health endpoints when docker CLI not available
        case "$container_name" in
            "ezaigents-dashboard")
                if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
                    echo "$container_name   Healthy (via API)"
                fi
                ;;
            "ezaigents-redis")
                if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
                    echo "$container_name   Healthy (via ping)"
                fi
                ;;
            *)
                echo "$container_name   Status unknown (no docker CLI)"
                ;;
        esac
    fi
}

# Status command
status() {
    log "🔍 Ez Aigent System Health Status"
    echo "=================================="
    
    # Check Redis connectivity
    if check_redis; then
        success "✅ Redis connection: OK"
    else
        error "❌ Redis connection: FAILED"
        return 1
    fi
    
    # Get agent heartbeats
    local heartbeats=$(get_agent_status)
    local registry=$(get_agent_registry)
    
    if [ -z "$heartbeats" ]; then
        warn "⚠️  No agent heartbeats found"
    else
        success "📋 Agent Heartbeats:"
        echo "$heartbeats" | while read -r line; do
            if [ -n "$line" ]; then
                echo "  • $line"
            fi
        done
    fi
    
    # Check Docker containers
    log "🐳 Docker Container Status:"
    for container in ezaigents-redis ezaigents-dashboard ezaigents-claude ezaigents-webscraper; do
        local status=$(check_docker_container "$container")
        if [ -n "$status" ]; then
            success "  ✅ $status"
        else
            warn "  ⚠️  $container: Not running"
        fi
    done
}

# Monitor command - continuous monitoring
monitor() {
    log "🔄 Starting continuous health monitoring (interval: ${CHECK_INTERVAL}s)"
    log "Press Ctrl+C to stop"
    
    while true; do
        echo ""
        status
        sleep "$CHECK_INTERVAL"
    done
}

# Auto-restart unhealthy agents
auto_restart() {
    log "🔧 Checking for unhealthy agents..."
    
    if ! check_redis; then
        error "Cannot connect to Redis - unable to perform health checks"
        return 1
    fi
    
    local current_time=$(date +%s)
    local heartbeats=$(get_agent_status)
    
    if [ -z "$heartbeats" ]; then
        warn "No agent heartbeats found"
        return 0
    fi
    
    # Check each agent's last heartbeat
    echo "$heartbeats" | while read -r agent_id last_seen; do
        if [ -n "$agent_id" ] && [ -n "$last_seen" ]; then
            local time_diff=$((current_time - last_seen))
            
            if [ "$time_diff" -gt "$ALERT_THRESHOLD" ]; then
                warn "Agent $agent_id is unhealthy (last seen: ${time_diff}s ago)"
                
                if [ "$AUTO_RESTART" = "true" ]; then
                    log "Attempting to restart agent $agent_id..."
                    # Try Docker restart
                    if command -v docker >/dev/null 2>&1; then
                        docker restart "ezaigents-${agent_id}" 2>/dev/null && \
                            success "Restarted container ezaigents-${agent_id}" || \
                            error "Failed to restart container ezaigents-${agent_id}"
                    fi
                fi
            else
                success "Agent $agent_id is healthy (last seen: ${time_diff}s ago)"
            fi
        fi
    done
}

# Report command
report() {
    log "📊 Generating health report..."
    
    local report_file="health-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Ez Aigent Health Report"
        echo "Generated: $(date)"
        echo "========================"
        echo ""
        
        status
        
        echo ""
        echo "System Information:"
        echo "- Redis URL: $REDIS_URL"
        echo "- Check Interval: ${CHECK_INTERVAL}s"
        echo "- Alert Threshold: ${ALERT_THRESHOLD}s"
        echo "- Auto Restart: $AUTO_RESTART"
        
    } > "$report_file"
    
    success "Health report saved to: $report_file"
}

# Main script logic
case "${1:-status}" in
    "status")
        status
        ;;
    "monitor")
        monitor
        ;;
    "auto-restart")
        auto_restart
        ;;
    "report")
        report
        ;;
    *)
        echo "Usage: $0 {status|monitor|auto-restart|report}"
        echo ""
        echo "Commands:"
        echo "  status      - Show current system health status"
        echo "  monitor     - Start continuous health monitoring"
        echo "  auto-restart - Check and restart unhealthy agents"
        echo "  report      - Generate detailed health report"
        exit 1
        ;;
esac