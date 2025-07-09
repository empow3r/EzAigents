#!/bin/bash

# Ez Aigent Dashboard Deployment Script for Dockge
# This script builds and deploys the enhanced dashboard to Dockge

set -e

echo "🚀 Starting Ez Aigent Dashboard Deployment to Dockge..."

# Configuration
REGISTRY=${REGISTRY:-"ezaigent"}
TAG=${TAG:-"latest"}
DASHBOARD_IMAGE="${REGISTRY}/dashboard:${TAG}"

# Build function
build_image() {
    local context=$1
    local image=$2
    local dockerfile=${3:-"Dockerfile"}
    
    echo "📦 Building $image..."
    
    if [ -f "$context/$dockerfile" ]; then
        docker build -t "$image" -f "$context/$dockerfile" "$context"
        echo "✅ Successfully built $image"
    else
        echo "❌ Dockerfile not found: $context/$dockerfile"
        exit 1
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if required environment variables are set
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "⚠️  CLAUDE_API_KEY not set, using placeholder"
    export CLAUDE_API_KEY="your-claude-api-key"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  OPENAI_API_KEY not set, using placeholder"
    export OPENAI_API_KEY="your-openai-api-key"
fi

if [ -z "$DEEPSEEK_API_KEYS" ]; then
    echo "⚠️  DEEPSEEK_API_KEYS not set, using placeholder"
    export DEEPSEEK_API_KEYS="your-deepseek-api-keys"
fi

echo "🏗️  Building Docker images..."

# Build Dashboard
build_image "dashboard" "$DASHBOARD_IMAGE"

echo "🐳 Docker images built successfully!"

# Create .env file for Dockge
echo "📝 Creating .env file for Dockge..."
cat > .env.dockge << EOF
# Ez Aigent Environment Variables for Dockge
CLAUDE_API_KEY=${CLAUDE_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
DEEPSEEK_API_KEYS=${DEEPSEEK_API_KEYS}
GEMINI_API_KEY=${GEMINI_API_KEY:-your-gemini-api-key}
MISTRAL_API_KEY=${MISTRAL_API_KEY:-your-mistral-api-key}

# Dashboard Configuration
DASHBOARD_PORT=3000
DASHBOARD_HOST=0.0.0.0
REDIS_URL=redis://ez-aigent-redis:6379

# Agent Configuration
MAX_AGENTS=10
SCALE_UP_THRESHOLD=20
SCALE_DOWN_THRESHOLD=5
AGENT_TIMEOUT=300000

# Feature Flags
ENABLE_MONITORING=true
ENABLE_CHAT=true
ENABLE_3D_WORKSPACE=true
ENABLE_VOICE_COMMANDS=false
ENABLE_AUTO_DOCUMENTATION=true
ENABLE_SECURITY_SCANNING=true

# Environment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF

echo "✅ .env.dockge created!"

echo "🎉 Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy 'dockge-dashboard-stack.yml' to your Dockge server"
echo "2. Copy '.env.dockge' to your Dockge server"
echo "3. Deploy via Dockge web interface"
echo "4. Update environment variables with your actual API keys"
echo "5. Access dashboard at http://your-server:3000"