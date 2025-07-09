#!/bin/bash

# Ez Aigent Production Deployment Script
# Automated deployment with health checks and rollback capabilities

set -e

# Configuration
NAMESPACE="ez-aigent-production"
DEPLOYMENT_NAME="ez-aigent"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true
BACKUP_ENABLED=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster."
        exit 1
    fi
    
    # Check required tools
    local required_tools=("docker" "helm" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool not found. Please install $tool."
            exit 1
        fi
    done
    
    log_success "Prerequisites check passed"
}

# Validate deployment files
validate_deployment() {
    log_step "Validating deployment files..."
    
    local deployment_files=(
        "deployment/k8s/namespace.yaml"
        "deployment/k8s/orchestrator.yaml"
        "deployment/k8s/agents.yaml"
        "deployment/k8s/dashboard.yaml"
        "deployment/k8s/redis.yaml"
        "deployment/k8s/services.yaml"
        "deployment/k8s/ingress.yaml"
    )
    
    for file in "${deployment_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required deployment file not found: $file"
            exit 1
        fi
        
        # Validate YAML syntax
        if ! kubectl apply --dry-run=client -f "$file" &> /dev/null; then
            log_error "Invalid YAML syntax in: $file"
            exit 1
        fi
    done
    
    log_success "Deployment files validation passed"
}

# Create backup
create_backup() {
    if [ "$BACKUP_ENABLED" = true ]; then
        log_step "Creating backup..."
        
        local backup_dir="backups/$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup current deployment
        kubectl get all -n "$NAMESPACE" -o yaml > "$backup_dir/current-deployment.yaml"
        
        # Backup Redis data
        kubectl exec -n "$NAMESPACE" redis-master -- redis-cli --rdb /tmp/backup.rdb
        kubectl cp "$NAMESPACE/redis-master:/tmp/backup.rdb" "$backup_dir/redis-backup.rdb"
        
        # Backup PostgreSQL
        kubectl exec -n "$NAMESPACE" postgres-master -- pg_dump ez-aigent > "$backup_dir/postgres-backup.sql"
        
        echo "$backup_dir" > .last-backup
        log_success "Backup created at: $backup_dir"
    fi
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_step "Deploying infrastructure components..."
    
    # Create namespace
    kubectl apply -f deployment/k8s/namespace.yaml
    
    # Deploy secrets
    if [ -f "deployment/k8s/secrets.yaml" ]; then
        kubectl apply -f deployment/k8s/secrets.yaml
    fi
    
    # Deploy configmaps
    if [ -f "deployment/k8s/configmaps.yaml" ]; then
        kubectl apply -f deployment/k8s/configmaps.yaml
    fi
    
    # Deploy storage
    if [ -f "deployment/k8s/storage.yaml" ]; then
        kubectl apply -f deployment/k8s/storage.yaml
    fi
    
    # Deploy Redis
    kubectl apply -f deployment/k8s/redis.yaml
    
    # Wait for Redis to be ready
    kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
    
    log_success "Infrastructure components deployed"
}

# Deploy application
deploy_application() {
    log_step "Deploying application components..."
    
    # Deploy orchestrator
    kubectl apply -f deployment/k8s/orchestrator.yaml
    
    # Deploy agents
    kubectl apply -f deployment/k8s/agents.yaml
    
    # Deploy dashboard
    kubectl apply -f deployment/k8s/dashboard.yaml
    
    # Deploy services
    kubectl apply -f deployment/k8s/services.yaml
    
    # Deploy ingress
    kubectl apply -f deployment/k8s/ingress.yaml
    
    log_success "Application components deployed"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_step "Waiting for deployment to be ready..."
    
    local deployments=(
        "ez-aigent-orchestrator"
        "ez-aigent-dashboard"
        "ez-aigent-agent-claude"
        "ez-aigent-agent-gpt"
        "ez-aigent-agent-deepseek"
        "ez-aigent-agent-mistral"
        "ez-aigent-agent-gemini"
    )
    
    for deployment in "${deployments[@]}"; do
        log_info "Waiting for $deployment to be ready..."
        kubectl wait --for=condition=available deployment/"$deployment" -n "$NAMESPACE" --timeout=300s
    done
    
    log_success "All deployments are ready"
}

# Run health checks
run_health_checks() {
    log_step "Running health checks..."
    
    local start_time=$(date +%s)
    local timeout=$HEALTH_CHECK_TIMEOUT
    
    while [ $(($(date +%s) - start_time)) -lt $timeout ]; do
        log_info "Checking application health..."
        
        # Check orchestrator health
        if kubectl exec -n "$NAMESPACE" deployment/ez-aigent-orchestrator -- curl -f http://localhost:8080/health; then
            log_success "Orchestrator health check passed"
            break
        fi
        
        log_warning "Health check failed, retrying in 10 seconds..."
        sleep 10
    done
    
    if [ $(($(date +%s) - start_time)) -ge $timeout ]; then
        log_error "Health checks timed out"
        return 1
    fi
    
    # Additional health checks
    local health_endpoints=(
        "http://localhost:3000/api/health"
        "http://localhost:9090/metrics"
    )
    
    for endpoint in "${health_endpoints[@]}"; do
        if ! kubectl exec -n "$NAMESPACE" deployment/ez-aigent-dashboard -- curl -f "$endpoint" &> /dev/null; then
            log_warning "Health check failed for: $endpoint"
        fi
    done
    
    log_success "Health checks completed"
}

# Run smoke tests
run_smoke_tests() {
    log_step "Running smoke tests..."
    
    # Test basic functionality
    local test_job=$(cat <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: smoke-test
        image: curlimages/curl:latest
        command: ["/bin/sh"]
        args: ["-c", "
          curl -f http://ez-aigent-dashboard:3000/api/health &&
          curl -f http://ez-aigent-orchestrator:8080/health &&
          echo 'Smoke tests passed'
        "]
      restartPolicy: Never
EOF
)
    
    echo "$test_job" | kubectl apply -f -
    
    # Wait for test to complete
    kubectl wait --for=condition=complete job/smoke-test -n "$NAMESPACE" --timeout=120s
    
    # Check test results
    if kubectl logs job/smoke-test -n "$NAMESPACE" | grep -q "Smoke tests passed"; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed"
        return 1
    fi
    
    # Cleanup test job
    kubectl delete job smoke-test -n "$NAMESPACE"
}

# Monitor deployment
monitor_deployment() {
    log_step "Monitoring deployment..."
    
    # Check pod status
    kubectl get pods -n "$NAMESPACE"
    
    # Check service endpoints
    kubectl get endpoints -n "$NAMESPACE"
    
    # Check ingress
    kubectl get ingress -n "$NAMESPACE"
    
    # Display resource usage
    kubectl top pods -n "$NAMESPACE" || log_warning "Metrics server not available"
    
    log_success "Deployment monitoring completed"
}

# Rollback deployment
rollback_deployment() {
    log_error "Deployment failed, initiating rollback..."
    
    if [ -f ".last-backup" ]; then
        local backup_dir=$(cat .last-backup)
        
        if [ -d "$backup_dir" ]; then
            log_step "Rolling back to previous version..."
            kubectl apply -f "$backup_dir/current-deployment.yaml"
            
            # Wait for rollback to complete
            kubectl wait --for=condition=available deployment -l app=ez-aigent -n "$NAMESPACE" --timeout=300s
            
            log_success "Rollback completed"
        else
            log_error "Backup directory not found: $backup_dir"
        fi
    else
        log_error "No backup found for rollback"
    fi
}

# Cleanup failed deployment
cleanup_failed_deployment() {
    log_step "Cleaning up failed deployment..."
    
    # Delete failed pods
    kubectl delete pods --field-selector=status.phase=Failed -n "$NAMESPACE"
    
    # Clean up test resources
    kubectl delete jobs --all -n "$NAMESPACE"
    
    log_success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if webhook URL is set)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Ez Aigent Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Email notification (if configured)
    if [ -n "$EMAIL_NOTIFICATION" ]; then
        echo "$message" | mail -s "Ez Aigent Deployment $status" "$EMAIL_NOTIFICATION"
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    echo -e "${MAGENTA}╔══════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║      Ez Aigent Production Deployment       ║${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════╝${NC}"
    
    log_info "Starting deployment at $(date)"
    log_info "Namespace: $NAMESPACE"
    log_info "Deployment: $DEPLOYMENT_NAME"
    log_info "Log file: $LOG_FILE"
    
    # Set trap for cleanup on failure
    trap 'cleanup_failed_deployment' ERR
    
    # Deployment steps
    check_prerequisites
    validate_deployment
    create_backup
    deploy_infrastructure
    deploy_application
    wait_for_deployment
    
    # Health checks and testing
    if run_health_checks && run_smoke_tests; then
        log_success "Deployment successful!"
        send_notification "SUCCESS" "Deployment completed successfully"
    else
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            rollback_deployment
            send_notification "ROLLBACK" "Deployment failed, rollback completed"
        else
            log_error "Deployment failed"
            send_notification "FAILED" "Deployment failed"
            exit 1
        fi
    fi
    
    # Final monitoring
    monitor_deployment
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Deployment completed in ${duration}s"
    
    # Display access information
    echo -e "\n${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║            Access Information             ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    
    local ingress_ip=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
    if [ -n "$ingress_ip" ]; then
        echo -e "Dashboard URL: ${GREEN}http://$ingress_ip${NC}"
        echo -e "API Endpoint: ${GREEN}http://$ingress_ip/api${NC}"
        echo -e "Metrics: ${GREEN}http://$ingress_ip/metrics${NC}"
    fi
    
    echo -e "\nKubernetes commands:"
    echo -e "  View pods: ${YELLOW}kubectl get pods -n $NAMESPACE${NC}"
    echo -e "  View logs: ${YELLOW}kubectl logs -f deployment/ez-aigent-orchestrator -n $NAMESPACE${NC}"
    echo -e "  Scale agents: ${YELLOW}kubectl scale deployment ez-aigent-agent-claude --replicas=5 -n $NAMESPACE${NC}"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback_deployment
        ;;
    "health-check")
        run_health_checks
        ;;
    "smoke-test")
        run_smoke_tests
        ;;
    "cleanup")
        cleanup_failed_deployment
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health-check|smoke-test|cleanup]"
        exit 1
        ;;
esac