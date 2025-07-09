#!/bin/bash

# Ez Aigent Quick Docker Deployment Script

echo "🚀 Ez Aigent Docker Deployment"
echo "=============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys!"
    echo "Required keys:"
    echo "  - CLAUDE_API_KEY"
    echo "  - OPENAI_API_KEY"
    echo "  - DEEPSEEK_API_KEYS"
    echo "  - MISTRAL_API_KEY"
    echo "  - GEMINI_API_KEY"
    exit 1
fi

# Check if API keys are configured
if grep -q "sk-or-cl-max-xxxxxxxxx" .env; then
    echo "⚠️  API keys not configured in .env file!"
    echo "Please edit .env and add your actual API keys."
    exit 1
fi

echo "✅ Environment configured"

# Build and start containers
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

# Show access information
echo ""
echo "✅ Deployment Complete!"
echo "======================"
echo "🌐 Dashboard: http://localhost:3000"
echo "🔴 Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  View agent logs:  docker logs ai_claude -f"
echo "  Monitor queues:   redis-cli KEYS 'queue:*'"
echo ""
echo "🚀 To enqueue tasks: cd cli && node enqueue.js"