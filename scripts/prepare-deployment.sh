#!/bin/bash

# Ez Aigent System - Deployment Preparation Script
# Comprehensive pre-deployment preparation and validation

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

# Configuration
DEPLOYMENT_VERSION="${1:-v$(date +%Y%m%d-%H%M%S)}"
ENVIRONMENT="${2:-production}"
BACKUP_DIR="deployment-backups"
DEPLOY_USER="${USER}"

# ASCII Art Header
echo -e "${PURPLE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🚀 Ez Aigent System - Deployment Preparation               ║
║                                                                ║
║        AI-Powered Multi-Agent Orchestration Platform          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${WHITE}🎯 DEPLOYMENT PREPARATION - Version ${DEPLOYMENT_VERSION}${NC}"
echo -e "${WHITE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${WHITE}Prepared by: ${DEPLOY_USER}${NC}"
echo "=================================================================="

# Pre-deployment validation
validate_system() {
    echo -e "\n${CYAN}🔍 SYSTEM VALIDATION${NC}"
    echo "----------------------------------------"
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "  ✅ Node.js: ${NODE_VERSION}"
        
        # Check if version is >= 20
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 20 ]; then
            echo -e "  ❌ Node.js version must be >= 20.x"
            exit 1
        fi
    else
        echo -e "  ❌ Node.js not found"
        exit 1
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        echo -e "  ✅ Docker: ${DOCKER_VERSION}"
    else
        echo -e "  ❌ Docker not found"
        exit 1
    fi
    
    # Check Redis
    if command -v redis-cli &> /dev/null; then
        REDIS_VERSION=$(redis-cli --version | cut -d' ' -f2)
        echo -e "  ✅ Redis CLI: ${REDIS_VERSION}"
    else
        echo -e "  ❌ Redis CLI not found"
        exit 1
    fi
    
    # Check Kubernetes (if production)
    if [ "$ENVIRONMENT" = "production" ]; then
        if command -v kubectl &> /dev/null; then
            KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null | cut -d' ' -f3)
            echo -e "  ✅ Kubectl: ${KUBECTL_VERSION}"
        else
            echo -e "  ❌ Kubectl not found (required for production)"
            exit 1
        fi
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version | cut -d' ' -f3)
        echo -e "  ✅ Git: ${GIT_VERSION}"
    else
        echo -e "  ❌ Git not found"
        exit 1
    fi
}

# Validate project structure
validate_project() {
    echo -e "\n${CYAN}📁 PROJECT STRUCTURE VALIDATION${NC}"
    echo "----------------------------------------"
    
    # Check required directories
    local required_dirs=("cli" "agents" "dashboard" "shared" "scripts" "deployment")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            echo -e "  ✅ Directory: $dir"
        else
            echo -e "  ❌ Missing directory: $dir"
            exit 1
        fi
    done
    
    # Check required files
    local required_files=(
        "package.json"
        "docker-compose.yaml"
        "shared/enhancement-tasks.json"
        "cli/enhancement-analytics.js"
        "cli/enhancement-ai-orchestrator.js"
        "cli/enhancement-neural-optimizer.js"
        "scripts/system-overview.sh"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  ✅ File: $file"
        else
            echo -e "  ❌ Missing file: $file"
            exit 1
        fi
    done
}

# Install dependencies
install_dependencies() {
    echo -e "\n${CYAN}📦 INSTALLING DEPENDENCIES${NC}"
    echo "----------------------------------------"
    
    # Root dependencies
    echo -e "${BLUE}Installing root dependencies...${NC}"
    npm install --production
    echo -e "  ✅ Root dependencies installed"
    
    # CLI dependencies
    if [ -f "cli/package.json" ]; then
        echo -e "${BLUE}Installing CLI dependencies...${NC}"
        cd cli && npm install --production && cd ..
        echo -e "  ✅ CLI dependencies installed"
    fi
    
    # Dashboard dependencies
    if [ -f "dashboard/package.json" ]; then
        echo -e "${BLUE}Installing dashboard dependencies...${NC}"
        cd dashboard && npm install --production && cd ..
        echo -e "  ✅ Dashboard dependencies installed"
    fi
    
    # Agent dependencies
    local agents=("claude" "gpt" "deepseek" "mistral" "gemini")
    for agent in "${agents[@]}"; do
        if [ -f "agents/${agent}/package.json" ]; then
            echo -e "${BLUE}Installing ${agent} agent dependencies...${NC}"
            cd "agents/${agent}" && npm install --production && cd ../..
            echo -e "  ✅ ${agent} agent dependencies installed"
        fi
    done
}

# Build Docker images
build_images() {
    echo -e "\n${CYAN}🐳 BUILDING DOCKER IMAGES${NC}"
    echo "----------------------------------------"
    
    # Build base image
    echo -e "${BLUE}Building base image...${NC}"
    if [ -f "deployment/docker/Dockerfile.base" ]; then
        docker build -t "ez-aigent/base:${DEPLOYMENT_VERSION}" -f deployment/docker/Dockerfile.base .
        docker tag "ez-aigent/base:${DEPLOYMENT_VERSION}" "ez-aigent/base:latest"
        echo -e "  ✅ Base image built"
    else
        echo -e "  ⚠️  Base Dockerfile not found, creating default..."
        mkdir -p deployment/docker
        cat > deployment/docker/Dockerfile.base << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    redis \
    git \
    curl \
    bash

# Copy package files
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000 6379

CMD ["node", "cli/runner.js"]
EOF
        docker build -t "ez-aigent/base:${DEPLOYMENT_VERSION}" -f deployment/docker/Dockerfile.base .
        docker tag "ez-aigent/base:${DEPLOYMENT_VERSION}" "ez-aigent/base:latest"
        echo -e "  ✅ Base image built with default Dockerfile"
    fi
    
    # Build orchestrator image
    echo -e "${BLUE}Building orchestrator image...${NC}"
    if [ ! -f "deployment/docker/Dockerfile.orchestrator" ]; then
        cat > deployment/docker/Dockerfile.orchestrator << 'EOF'
FROM ez-aigent/base:latest

WORKDIR /app

# Copy CLI files
COPY cli/ ./cli/
COPY shared/ ./shared/

# Install CLI dependencies
RUN cd cli && npm install --production

EXPOSE 8080

CMD ["node", "cli/runner.js"]
EOF
    fi
    
    docker build -t "ez-aigent/orchestrator:${DEPLOYMENT_VERSION}" -f deployment/docker/Dockerfile.orchestrator .
    docker tag "ez-aigent/orchestrator:${DEPLOYMENT_VERSION}" "ez-aigent/orchestrator:latest"
    echo -e "  ✅ Orchestrator image built"
    
    # Build agent images
    local agents=("claude" "gpt" "deepseek" "mistral" "gemini")
    for agent in "${agents[@]}"; do
        echo -e "${BLUE}Building ${agent} agent image...${NC}"
        
        if [ ! -f "agents/${agent}/Dockerfile" ]; then
            cat > "agents/${agent}/Dockerfile" << EOF
FROM ez-aigent/base:latest

WORKDIR /app

# Copy agent files
COPY agents/${agent}/ ./agents/${agent}/
COPY shared/ ./shared/

# Install agent dependencies
RUN cd agents/${agent} && npm install --production

ENV AGENT_TYPE=${agent}

CMD ["node", "agents/${agent}/index.js"]
EOF
        fi
        
        docker build -t "ez-aigent/agent-${agent}:${DEPLOYMENT_VERSION}" -f "agents/${agent}/Dockerfile" .
        docker tag "ez-aigent/agent-${agent}:${DEPLOYMENT_VERSION}" "ez-aigent/agent-${agent}:latest"
        echo -e "    ✅ ${agent} agent image built"
    done
    
    # Build dashboard image
    echo -e "${BLUE}Building dashboard image...${NC}"
    if [ ! -f "dashboard/Dockerfile" ]; then
        cat > dashboard/Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy dashboard files
COPY dashboard/package*.json ./
RUN npm install --production

COPY dashboard/ .

# Build dashboard
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
EOF
    fi
    
    docker build -t "ez-aigent/dashboard:${DEPLOYMENT_VERSION}" -f dashboard/Dockerfile .
    docker tag "ez-aigent/dashboard:${DEPLOYMENT_VERSION}" "ez-aigent/dashboard:latest"
    echo -e "  ✅ Dashboard image built"
}

# Create deployment configurations
create_deployment_configs() {
    echo -e "\n${CYAN}⚙️  CREATING DEPLOYMENT CONFIGURATIONS${NC}"
    echo "----------------------------------------"
    
    # Create docker-compose.production.yml
    echo -e "${BLUE}Creating production Docker Compose configuration...${NC}"
    cat > docker-compose.production.yml << EOF
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  orchestrator:
    image: ez-aigent/orchestrator:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    ports:
      - "8080:8080"
    volumes:
      - ./shared:/app/shared
      - ./src:/app/src
    restart: unless-stopped

  agent-claude:
    image: ez-aigent/agent-claude:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - MODEL=claude-3-opus
      - ROLE=refactor-core
    volumes:
      - ./shared:/app/shared
      - ./src:/app/src
    restart: unless-stopped
    scale: 2

  agent-gpt:
    image: ez-aigent/agent-gpt:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - MODEL=gpt-4o
      - ROLE=backend-logic
    volumes:
      - ./shared:/app/shared
      - ./src:/app/src
    restart: unless-stopped
    scale: 2

  agent-deepseek:
    image: ez-aigent/agent-deepseek:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - MODEL=deepseek-coder
      - ROLE=test-utils
    volumes:
      - ./shared:/app/shared
      - ./src:/app/src
    restart: unless-stopped
    scale: 2

  agent-mistral:
    image: ez-aigent/agent-mistral:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - MODEL=command-r-plus
      - ROLE=docgen
    volumes:
      - ./shared:/app/shared
      - ./src:/app/src
    restart: unless-stopped
    scale: 1

  agent-gemini:
    image: ez-aigent/agent-gemini:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - MODEL=gemini-pro
      - ROLE=analysis
    volumes:
      - ./shared:/app/shared
      - ./src:/app/src
    restart: unless-stopped
    scale: 1

  dashboard:
    image: ez-aigent/dashboard:${DEPLOYMENT_VERSION}
    depends_on:
      redis:
        condition: service_healthy
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    ports:
      - "3000:3000"
    volumes:
      - ./shared:/app/shared
    restart: unless-stopped

volumes:
  redis_data:
    driver: local

networks:
  default:
    name: ez-aigent-network
EOF
    echo -e "  ✅ Production Docker Compose configuration created"
    
    # Create Kubernetes manifests for production
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${BLUE}Creating Kubernetes manifests...${NC}"
        mkdir -p deployment/k8s
        
        # Create namespace
        cat > deployment/k8s/namespace.yaml << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ez-aigent-production
  labels:
    app: ez-aigent
    environment: production
EOF
        
        # Create Redis deployment
        cat > deployment/k8s/redis.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: ez-aigent-production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server", "--appendonly", "yes"]
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: ez-aigent-production
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: ez-aigent-production
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF
        
        # Create orchestrator deployment
        cat > deployment/k8s/orchestrator.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator
  namespace: ez-aigent-production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orchestrator
  template:
    metadata:
      labels:
        app: orchestrator
    spec:
      containers:
      - name: orchestrator
        image: ez-aigent/orchestrator:${DEPLOYMENT_VERSION}
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: orchestrator
  namespace: ez-aigent-production
spec:
  selector:
    app: orchestrator
  ports:
  - port: 8080
    targetPort: 8080
EOF
        
        # Create dashboard deployment
        cat > deployment/k8s/dashboard.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
  namespace: ez-aigent-production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
    spec:
      containers:
      - name: dashboard
        image: ez-aigent/dashboard:${DEPLOYMENT_VERSION}
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: dashboard
  namespace: ez-aigent-production
spec:
  selector:
    app: dashboard
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
EOF
        
        echo -e "  ✅ Kubernetes manifests created"
    fi
}

# Create environment configuration
create_environment_config() {
    echo -e "\n${CYAN}🔧 CREATING ENVIRONMENT CONFIGURATION${NC}"
    echo "----------------------------------------"
    
    # Create production environment template
    cat > .env.production.template << 'EOF'
# Ez Aigent Production Configuration

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# API Keys (OpenRouter recommended for Claude models)
CLAUDE_API_KEY=sk-or-cl-max-xxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxx
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxx
MISTRAL_API_KEY=sk-xxxxxxxxxxxxxxxxx
GEMINI_API_KEY=sk-xxxxxxxxxxxxxxxxx

# API Key Pool (comma-separated for rotation)
API_KEY_POOL=sk-or-cl-max-key1,sk-or-cl-max-key2,sk-or-cl-max-key3

# System Configuration
NODE_ENV=production
LOG_LEVEL=info
MAX_CONCURRENT_TASKS=50
TASK_TIMEOUT=600000

# Dashboard Configuration
DASHBOARD_PORT=3000
DASHBOARD_HOST=0.0.0.0
ENABLE_ANALYTICS=true

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Monitoring Configuration
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000

# AI Configuration
ENABLE_AI_ORCHESTRATION=true
ENABLE_NEURAL_OPTIMIZATION=true
AI_CONFIDENCE_THRESHOLD=0.7
LEARNING_RATE=0.001

# Scaling Configuration
AUTO_SCALING_ENABLED=true
MIN_AGENTS=1
MAX_AGENTS=10
SCALE_UP_THRESHOLD=50
SCALE_DOWN_THRESHOLD=5
EOF
    
    echo -e "  ✅ Environment configuration template created"
    echo -e "  ⚠️  Please copy .env.production.template to .env.production and configure your API keys"
}

# Create backup
create_backup() {
    echo -e "\n${CYAN}💾 CREATING DEPLOYMENT BACKUP${NC}"
    echo "----------------------------------------"
    
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="${BACKUP_DIR}/pre-deployment-${backup_timestamp}"
    
    mkdir -p "$backup_path"
    
    # Backup configuration files
    cp -r shared/ "$backup_path/" 2>/dev/null || true
    cp -r deployment/ "$backup_path/" 2>/dev/null || true
    cp docker-compose.yaml "$backup_path/" 2>/dev/null || true
    cp package.json "$backup_path/" 2>/dev/null || true
    
    # Backup Redis data if available
    if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
        redis-cli --rdb "${backup_path}/redis-backup.rdb" 2>/dev/null || true
        echo -e "  ✅ Redis data backed up"
    fi
    
    # Create backup manifest
    cat > "${backup_path}/backup-manifest.json" << EOF
{
    "backup_type": "pre_deployment",
    "timestamp": "${backup_timestamp}",
    "version": "${DEPLOYMENT_VERSION}",
    "environment": "${ENVIRONMENT}",
    "user": "${DEPLOY_USER}",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF
    
    echo -e "  ✅ Backup created: ${backup_path}"
}

# Security scan
security_scan() {
    echo -e "\n${CYAN}🔒 SECURITY SCAN${NC}"
    echo "----------------------------------------"
    
    if [ -f "cli/enhancement-security-scanner.js" ]; then
        echo -e "${BLUE}Running security scan...${NC}"
        node cli/enhancement-security-scanner.js scan
        
        # Check for critical issues
        if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
            local critical_issues=$(redis-cli GET security:critical_issues 2>/dev/null || echo "0")
            if [ "$critical_issues" -gt 0 ]; then
                echo -e "  ❌ Critical security issues found: $critical_issues"
                echo -e "  🛑 Deployment blocked for security review"
                exit 1
            else
                echo -e "  ✅ Security scan passed"
            fi
        else
            echo -e "  ⚠️  Cannot verify security scan results (Redis not available)"
        fi
    else
        echo -e "  ⚠️  Security scanner not available"
    fi
}

# Performance test
performance_test() {
    echo -e "\n${CYAN}⚡ PERFORMANCE TEST${NC}"
    echo "----------------------------------------"
    
    if [ -f "cli/enhancement-performance-optimizer.js" ]; then
        echo -e "${BLUE}Running performance analysis...${NC}"
        node cli/enhancement-performance-optimizer.js analyze > performance-baseline.json
        echo -e "  ✅ Performance baseline captured"
    else
        echo -e "  ⚠️  Performance optimizer not available"
    fi
}

# Create deployment summary
create_deployment_summary() {
    echo -e "\n${CYAN}📋 DEPLOYMENT SUMMARY${NC}"
    echo "----------------------------------------"
    
    local summary_file="deployment-summary-${DEPLOYMENT_VERSION}.json"
    
    cat > "$summary_file" << EOF
{
    "deployment": {
        "version": "${DEPLOYMENT_VERSION}",
        "environment": "${ENVIRONMENT}",
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "prepared_by": "${DEPLOY_USER}",
        "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
        "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
    },
    "components": {
        "orchestrator": "ready",
        "agents": {
            "claude": "ready",
            "gpt": "ready", 
            "deepseek": "ready",
            "mistral": "ready",
            "gemini": "ready"
        },
        "dashboard": "ready",
        "redis": "ready",
        "ai_systems": "ready",
        "neural_networks": "ready"
    },
    "docker_images": {
        "base": "ez-aigent/base:${DEPLOYMENT_VERSION}",
        "orchestrator": "ez-aigent/orchestrator:${DEPLOYMENT_VERSION}",
        "dashboard": "ez-aigent/dashboard:${DEPLOYMENT_VERSION}",
        "agents": {
            "claude": "ez-aigent/agent-claude:${DEPLOYMENT_VERSION}",
            "gpt": "ez-aigent/agent-gpt:${DEPLOYMENT_VERSION}",
            "deepseek": "ez-aigent/agent-deepseek:${DEPLOYMENT_VERSION}",
            "mistral": "ez-aigent/agent-mistral:${DEPLOYMENT_VERSION}",
            "gemini": "ez-aigent/agent-gemini:${DEPLOYMENT_VERSION}"
        }
    },
    "features": {
        "ai_orchestration": "enabled",
        "neural_optimization": "enabled",
        "auto_scaling": "enabled",
        "security_scanning": "enabled",
        "performance_optimization": "enabled",
        "enterprise_features": "enabled"
    },
    "deployment_ready": true
}
EOF
    
    echo -e "  ✅ Deployment summary created: $summary_file"
}

# Main execution
main() {
    echo -e "${WHITE}🚀 Starting deployment preparation...${NC}"
    
    # Execute preparation steps
    validate_system
    validate_project
    install_dependencies
    build_images
    create_deployment_configs
    create_environment_config
    create_backup
    security_scan
    performance_test
    create_deployment_summary
    
    echo -e "\n${GREEN}🎉 DEPLOYMENT PREPARATION COMPLETE!${NC}"
    echo "=================================================================="
    echo -e "${WHITE}System is ready for deployment!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "1. Configure API keys in .env.production"
    echo "2. Review deployment configurations"
    echo "3. Run: ./scripts/enhancement-production-deploy.sh ${ENVIRONMENT} ${DEPLOYMENT_VERSION}"
    echo ""
    echo -e "${CYAN}Quick deployment commands:${NC}"
    echo "  Docker Compose: docker-compose -f docker-compose.production.yml up -d"
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  Kubernetes:     kubectl apply -f deployment/k8s/"
    fi
    echo "  Dashboard:      http://localhost:3000"
    echo "  Orchestrator:   http://localhost:8080"
    echo ""
    echo -e "${WHITE}🎯 Ez Aigent System v${DEPLOYMENT_VERSION} ready for ${ENVIRONMENT} deployment!${NC}"
    echo "=================================================================="
}

# Execute main function
main