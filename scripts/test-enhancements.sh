#!/bin/bash

# Ez Aigent Enhancement Testing Script
# Comprehensive testing for all enhancement implementations

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test results tracking
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test report file
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).md"

# Initialize report
init_report() {
    cat > $REPORT_FILE << EOF
# Enhancement Test Report
Generated: $(date)

## Summary
- Total Tests: 0
- Passed: 0
- Failed: 0
- Skipped: 0

## Test Results
EOF
}

# Log test result
log_test() {
    local test_name=$1
    local status=$2
    local message=$3
    local duration=$4
    
    echo "" >> $REPORT_FILE
    echo "### $test_name" >> $REPORT_FILE
    echo "- **Status**: $status" >> $REPORT_FILE
    echo "- **Duration**: ${duration}s" >> $REPORT_FILE
    if [ ! -z "$message" ]; then
        echo "- **Message**: $message" >> $REPORT_FILE
    fi
    
    case $status in
        "PASSED")
            echo -e "${GREEN}✓${NC} $test_name"
            ((PASSED_TESTS++))
            ;;
        "FAILED")
            echo -e "${RED}✗${NC} $test_name - $message"
            ((FAILED_TESTS++))
            ;;
        "SKIPPED")
            echo -e "${YELLOW}⊖${NC} $test_name - $message"
            ((SKIPPED_TESTS++))
            ;;
    esac
}

# Test Redis connection
test_redis() {
    local start_time=$(date +%s)
    local test_name="Redis Connection"
    
    if redis-cli ping &> /dev/null; then
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "PASSED" "" "$duration"
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "FAILED" "Redis not running" "$duration"
        return 1
    fi
}

# Test agent status
test_agents() {
    local start_time=$(date +%s)
    local test_name="Agent Status Check"
    
    if [ -f .agent_pids ]; then
        local all_running=true
        local failed_agents=""
        
        PIDS=$(cat .agent_pids)
        for PID in ${PIDS//,/ }; do
            if ! ps -p $PID > /dev/null 2>&1; then
                all_running=false
                failed_agents="$failed_agents $PID"
            fi
        done
        
        local duration=$(($(date +%s) - start_time))
        if [ "$all_running" = true ]; then
            log_test "$test_name" "PASSED" "" "$duration"
        else
            log_test "$test_name" "FAILED" "Agents not running: $failed_agents" "$duration"
        fi
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "No agents started" "$duration"
    fi
}

# Test enhancement files exist
test_enhancement_files() {
    local enhancement=$1
    local files=$2
    local start_time=$(date +%s)
    local test_name="File Creation Test - $enhancement"
    
    local all_exist=true
    local missing_files=""
    
    IFS=',' read -ra FILE_ARRAY <<< "$files"
    for file in "${FILE_ARRAY[@]}"; do
        if [ ! -f "$file" ]; then
            all_exist=false
            missing_files="$missing_files $file"
        fi
    done
    
    local duration=$(($(date +%s) - start_time))
    if [ "$all_exist" = true ]; then
        log_test "$test_name" "PASSED" "" "$duration"
    else
        log_test "$test_name" "FAILED" "Missing files: $missing_files" "$duration"
    fi
}

# Test security enhancement
test_security_enhancement() {
    echo -e "\n${CYAN}Testing Security Enhancement...${NC}"
    
    # Test file existence
    test_enhancement_files "Security" "cli/vault-client.js,cli/auth-service.js,cli/rbac-manager.js,cli/encryption-service.js"
    
    # Test Vault client
    local start_time=$(date +%s)
    local test_name="Vault Client Test"
    if [ -f "cli/vault-client.js" ]; then
        if node -e "require('./cli/vault-client.js')" &> /dev/null; then
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "PASSED" "" "$duration"
        else
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "FAILED" "Module load error" "$duration"
        fi
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "File not found" "$duration"
    fi
}

# Test observability enhancement
test_observability_enhancement() {
    echo -e "\n${CYAN}Testing Observability Enhancement...${NC}"
    
    # Test file existence
    test_enhancement_files "Observability" "cli/telemetry.js,cli/logger.js,cli/metrics-collector.js"
    
    # Test metrics endpoint
    local start_time=$(date +%s)
    local test_name="Metrics Endpoint Test"
    if curl -s http://localhost:3000/metrics &> /dev/null; then
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "PASSED" "" "$duration"
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "Dashboard not running" "$duration"
    fi
}

# Test queue enhancement
test_queue_enhancement() {
    echo -e "\n${CYAN}Testing Queue Enhancement...${NC}"
    
    # Test file existence
    test_enhancement_files "Queue System" "cli/queue-manager.js,cli/kafka-adapter.js,cli/rabbitmq-adapter.js"
    
    # Test queue manager
    local start_time=$(date +%s)
    local test_name="Queue Manager Test"
    if [ -f "cli/queue-manager.js" ]; then
        # Create simple test
        cat > /tmp/queue-test.js << 'EOF'
const QueueManager = require('./cli/queue-manager.js');
const qm = new QueueManager({ primary: 'redis' });
console.log('Queue manager loaded successfully');
EOF
        
        if node /tmp/queue-test.js &> /dev/null; then
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "PASSED" "" "$duration"
        else
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "FAILED" "Queue manager error" "$duration"
        fi
        
        rm -f /tmp/queue-test.js
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "File not found" "$duration"
    fi
}

# Test orchestration enhancement
test_orchestration_enhancement() {
    echo -e "\n${CYAN}Testing Orchestration Enhancement...${NC}"
    
    # Test file existence
    test_enhancement_files "Orchestration" "cli/orchestration-engine.js,cli/ml-agent-selector.js"
    
    # Test DAG functionality
    local start_time=$(date +%s)
    local test_name="DAG Engine Test"
    if [ -f "cli/orchestration-engine.js" ]; then
        if grep -q "topological" cli/orchestration-engine.js; then
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "PASSED" "" "$duration"
        else
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "FAILED" "Missing DAG implementation" "$duration"
        fi
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "File not found" "$duration"
    fi
}

# Test collaboration enhancement
test_collaboration_enhancement() {
    echo -e "\n${CYAN}Testing Collaboration Enhancement...${NC}"
    
    # Test file existence
    test_enhancement_files "Collaboration" "cli/consensus-protocol.js,cli/knowledge-graph.js,cli/task-negotiation.js"
}

# Test self-healing enhancement
test_selfhealing_enhancement() {
    echo -e "\n${CYAN}Testing Self-Healing Enhancement...${NC}"
    
    # Test file existence
    test_enhancement_files "Self-Healing" "cli/health-checker.js,cli/circuit-breaker.js,deployment/k8s/operator/agent-operator.yaml"
    
    # Test health checker
    local start_time=$(date +%s)
    local test_name="Health Checker Test"
    if [ -f "cli/health-checker.js" ]; then
        if grep -q "liveness" cli/health-checker.js && grep -q "readiness" cli/health-checker.js; then
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "PASSED" "" "$duration"
        else
            local duration=$(($(date +%s) - start_time))
            log_test "$test_name" "FAILED" "Missing health check types" "$duration"
        fi
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "File not found" "$duration"
    fi
}

# Performance test
test_performance() {
    echo -e "\n${CYAN}Running Performance Tests...${NC}"
    
    local start_time=$(date +%s)
    local test_name="Queue Performance Test"
    
    # Simple Redis performance test
    if redis-cli ping &> /dev/null; then
        # Test SET/GET performance
        local ops_count=1000
        local bench_start=$(date +%s.%N)
        
        for i in $(seq 1 $ops_count); do
            redis-cli SET test:key:$i "value$i" &> /dev/null
        done
        
        local bench_end=$(date +%s.%N)
        local bench_duration=$(echo "$bench_end - $bench_start" | bc)
        local ops_per_sec=$(echo "scale=2; $ops_count / $bench_duration" | bc)
        
        # Cleanup
        redis-cli --scan --pattern test:key:* | xargs redis-cli DEL &> /dev/null
        
        local duration=$(($(date +%s) - start_time))
        if (( $(echo "$ops_per_sec > 5000" | bc -l) )); then
            log_test "$test_name" "PASSED" "$ops_per_sec ops/sec" "$duration"
        else
            log_test "$test_name" "FAILED" "Low performance: $ops_per_sec ops/sec" "$duration"
        fi
    else
        local duration=$(($(date +%s) - start_time))
        log_test "$test_name" "SKIPPED" "Redis not available" "$duration"
    fi
}

# Integration test
test_integration() {
    echo -e "\n${CYAN}Running Integration Tests...${NC}"
    
    local start_time=$(date +%s)
    local test_name="Enhancement Integration Test"
    
    # Test if enhancements can work together
    local integration_passed=true
    
    # Check if security can protect observability endpoints
    if [ -f "cli/auth-service.js" ] && [ -f "cli/metrics-collector.js" ]; then
        # Simple check for auth middleware in metrics
        if grep -q "auth" cli/metrics-collector.js || grep -q "Auth" cli/metrics-collector.js; then
            log_test "Security-Observability Integration" "PASSED" "" "1"
        else
            log_test "Security-Observability Integration" "FAILED" "No auth in metrics" "1"
            integration_passed=false
        fi
    fi
    
    local duration=$(($(date +%s) - start_time))
    if [ "$integration_passed" = true ]; then
        log_test "$test_name" "PASSED" "" "$duration"
    else
        log_test "$test_name" "FAILED" "Integration issues found" "$duration"
    fi
}

# Update report summary
update_report_summary() {
    local total_tests=$((PASSED_TESTS + FAILED_TESTS + SKIPPED_TESTS))
    
    # Update summary in report
    sed -i.bak "s/Total Tests: 0/Total Tests: $total_tests/" $REPORT_FILE
    sed -i.bak "s/Passed: 0/Passed: $PASSED_TESTS/" $REPORT_FILE
    sed -i.bak "s/Failed: 0/Failed: $FAILED_TESTS/" $REPORT_FILE
    sed -i.bak "s/Skipped: 0/Skipped: $SKIPPED_TESTS/" $REPORT_FILE
    rm -f ${REPORT_FILE}.bak
    
    # Add test completion time
    echo "" >> $REPORT_FILE
    echo "## Test Execution" >> $REPORT_FILE
    echo "- **Completed**: $(date)" >> $REPORT_FILE
    echo "- **Duration**: ${TOTAL_DURATION}s" >> $REPORT_FILE
    
    # Add recommendations
    echo "" >> $REPORT_FILE
    echo "## Recommendations" >> $REPORT_FILE
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo "- ❌ Fix failing tests before proceeding to production" >> $REPORT_FILE
    fi
    
    if [ $SKIPPED_TESTS -gt 0 ]; then
        echo "- ⚠️  Complete skipped tests for full coverage" >> $REPORT_FILE
    fi
    
    if [ $FAILED_TESTS -eq 0 ] && [ $SKIPPED_TESTS -eq 0 ]; then
        echo "- ✅ All tests passed! Ready for production deployment" >> $REPORT_FILE
    fi
}

# Main test execution
main() {
    local start_time=$(date +%s)
    
    echo -e "${MAGENTA}╔══════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║    Ez Aigent Enhancement Test Suite       ║${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════╝${NC}"
    
    init_report
    
    # Core system tests
    echo -e "\n${CYAN}Running Core System Tests...${NC}"
    test_redis
    test_agents
    
    # Enhancement-specific tests
    test_security_enhancement
    test_observability_enhancement
    test_queue_enhancement
    test_orchestration_enhancement
    test_collaboration_enhancement
    test_selfhealing_enhancement
    
    # Advanced tests
    test_performance
    test_integration
    
    # Calculate total duration
    TOTAL_DURATION=$(($(date +%s) - start_time))
    
    # Update report
    update_report_summary
    
    # Display summary
    echo -e "\n${MAGENTA}╔══════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║           Test Summary                   ║${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════╝${NC}"
    
    local total_tests=$((PASSED_TESTS + FAILED_TESTS + SKIPPED_TESTS))
    echo -e "Total Tests: ${total_tests}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
    echo -e "${YELLOW}Skipped: ${SKIPPED_TESTS}${NC}"
    echo -e "Duration: ${TOTAL_DURATION}s"
    
    echo -e "\n${BLUE}Report saved to: ${REPORT_FILE}${NC}"
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main