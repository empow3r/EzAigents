#!/bin/bash

# Update all AI agents dependencies

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🤖 Updating All AI Agents Dependencies${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Base package.json template for all agents
create_agent_package() {
    local agent_name=$1
    local agent_description=$2
    
    cat > "agents/$agent_name/package.json" << EOF
{
  "name": "ez-aigent-$agent_name-agent",
  "version": "1.0.0",
  "description": "$agent_description",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node test.js",
    "health": "node health-check.js"
  },
  "dependencies": {
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "ioredis": "^5.4.2",
    "winston": "^3.17.0",
    "uuid": "^11.0.5",
    "p-retry": "^4.6.2",
    "node-fetch": "^2.7.0",
    "chalk": "^4.1.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.5",
    "eslint": "^9.18.0"
  },
  "engines": {
    "node": ">=18.17.0"
  }
}
EOF
}

# Update each agent
agents=("claude" "gpt" "deepseek" "mistral" "gemini")
descriptions=(
    "Claude agent for architecture and refactoring"
    "GPT agent for backend logic and API development"
    "DeepSeek agent for testing and validation"
    "Mistral agent for documentation generation"
    "Gemini agent for code analysis and mobile development"
)

for i in "${!agents[@]}"; do
    agent="${agents[$i]}"
    description="${descriptions[$i]}"
    
    echo -e "${BLUE}📦 Updating $agent agent...${NC}"
    
    # Create updated package.json
    create_agent_package "$agent" "$description"
    
    # Install dependencies
    cd "agents/$agent"
    rm -rf node_modules package-lock.json
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $agent agent updated successfully${NC}"
    else
        echo -e "${RED}❌ Failed to update $agent agent${NC}"
        exit 1
    fi
    
    cd ../..
    echo ""
done

echo -e "${GREEN}🎉 All agents updated successfully!${NC}"
echo ""

# Create a simple test to verify Redis connectivity
echo -e "${BLUE}🧪 Creating Redis connectivity test...${NC}"

cat > test-redis-connection.js << 'EOF'
const Redis = require('ioredis');

async function testRedis() {
    const redis = new Redis({
        host: 'localhost',
        port: 6379,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    try {
        await redis.ping();
        console.log('✅ Redis connection successful');
        
        // Test basic operations
        await redis.set('test:key', 'test-value');
        const value = await redis.get('test:key');
        console.log('✅ Redis operations working:', value);
        
        await redis.del('test:key');
        redis.disconnect();
        return true;
    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        redis.disconnect();
        return false;
    }
}

testRedis();
EOF

echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Start Redis: docker run -d -p 6379:6379 redis:alpine"
echo "2. Test Redis: node test-redis-connection.js"
echo "3. Rebuild Docker images: docker-compose build"
echo "4. Start system: docker-compose up"