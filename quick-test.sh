#!/bin/bash

# Quick Priority Queue System Test Script
echo "🚀 Ez Aigent Priority Queue Quick Test"
echo "======================================"

# Check if Redis is running
echo "📡 Checking Redis connection..."
if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis not running. Starting Redis in Docker..."
    
    # Try to start Redis with Docker
    if command -v docker >/dev/null 2>&1; then
        docker run -d --name ez-aigent-redis -p 6379:6379 redis:alpine >/dev/null 2>&1
        
        # Wait for Redis to start
        echo "⏳ Waiting for Redis to start..."
        for i in {1..10}; do
            if redis-cli ping >/dev/null 2>&1; then
                echo "✅ Redis started successfully"
                break
            fi
            sleep 1
        done
        
        if ! redis-cli ping >/dev/null 2>&1; then
            echo "❌ Failed to start Redis. Please install Redis or Docker first."
            echo ""
            echo "Install options:"
            echo "  macOS: brew install redis && brew services start redis"
            echo "  Ubuntu: sudo apt-get install redis-server"
            echo "  Docker: docker run -d -p 6379:6379 redis:alpine"
            exit 1
        fi
    else
        echo "❌ Docker not available. Please install Redis manually:"
        echo "  macOS: brew install redis && brew services start redis"
        echo "  Ubuntu: sudo apt-get install redis-server"
        exit 1
    fi
fi

# Check Node.js dependencies
echo ""
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⏳ Installing dependencies..."
    npm install
fi

# Set environment variables for testing
export ENABLE_PRIORITIES=true
export ENABLE_DEDUPLICATION=true
export ENABLE_ANALYTICS=true
export ENABLE_ALERTS=true
export REDIS_URL=redis://localhost:6379

echo ""
echo "🧪 Running Priority Queue System Tests..."
echo "----------------------------------------"

# Run the comprehensive test
if node test-priority-queue.js; then
    echo ""
    echo "🎉 All tests passed!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Start the enhanced enqueue system: cd cli && node enqueue.js"
    echo "  2. Start the enhanced runner: node cli/runner.js"
    echo "  3. View dashboard: cd dashboard && npm run dev"
    echo "  4. Test API: curl http://localhost:3000/api/queue-stats"
    echo ""
    echo "📚 For detailed testing: cat TESTING_GUIDE.md"
else
    echo ""
    echo "❌ Tests failed. Check the output above for errors."
    echo "📚 See TESTING_GUIDE.md for troubleshooting steps."
    exit 1
fi