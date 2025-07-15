#!/bin/bash

# EzAigents Docker Setup Script
# This script prepares your machine to run EzAigents with Docker

set -e

echo "🔧 EzAigents Docker Setup"
echo "========================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "   Linux: https://docs.docker.com/engine/install/"
    echo "   Windows: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is installed and running"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys:"
    echo "   - CLAUDE_API_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - DEEPSEEK_API_KEYS"
    echo "   - MISTRAL_API_KEY"
    echo "   - GEMINI_API_KEY"
    echo ""
    echo "Press Enter to continue after editing .env..."
    read
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p .agent-memory/{claude,gpt,deepseek,mistral,gemini}
mkdir -p agents/{claude,gpt,deepseek,mistral,gemini}/logs
mkdir -p cli/logs
mkdir -p src/output
mkdir -p logs

# Set permissions
chmod -R 755 .agent-memory 2>/dev/null || true
chmod -R 755 agents/*/logs 2>/dev/null || true
chmod -R 755 cli/logs 2>/dev/null || true
chmod -R 755 logs 2>/dev/null || true

echo "✅ Directory structure created"

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x docker-start.sh 2>/dev/null || true
chmod +x start-local.sh 2>/dev/null || true
chmod +x stop-agents.sh 2>/dev/null || true

echo "✅ Scripts are now executable"

# Test Docker setup
echo "🧪 Testing Docker setup..."
if docker run --rm hello-world > /dev/null 2>&1; then
    echo "✅ Docker test passed"
else
    echo "❌ Docker test failed"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Edit .env file with your API keys"
echo "2. Start the system: ./docker-start.sh"
echo "3. Access dashboard: http://localhost:3000"
echo ""
echo "Quick commands:"
echo "  Start system: ./docker-start.sh"
echo "  Stop system: docker-compose down"
echo "  View logs: docker-compose logs -f"
echo "  Restart service: docker-compose restart <service-name>"
echo ""
echo "✅ EzAigents is ready to run with Docker!"