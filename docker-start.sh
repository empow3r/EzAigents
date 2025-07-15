#!/bin/bash

echo "🚀 Starting EzAigents Docker Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env file from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your API keys before continuing."
    echo "   Required keys: CLAUDE_API_KEY, OPENAI_API_KEY, etc."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p .agent-memory/{claude,gpt,deepseek,mistral,gemini}
mkdir -p agents/{claude,gpt,deepseek,mistral,gemini}/logs
mkdir -p cli/logs
mkdir -p dashboard/logs
mkdir -p src

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service status..."
docker-compose ps

echo ""
echo "✅ EzAigents Docker Environment Started!"
echo ""
echo "📊 Access Points:"
echo "  Dashboard: http://localhost:3000"
echo "  Health Check: http://localhost:3000/claude-doctor"
echo "  Redis: localhost:6379"
echo ""
echo "🛠️ Useful Commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop all: docker-compose down"
echo "  Restart service: docker-compose restart <service-name>"
echo "  Shell access: docker exec -it <container-name> sh"
echo ""
echo "📋 Running Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"