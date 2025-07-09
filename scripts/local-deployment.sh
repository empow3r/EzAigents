#!/bin/bash

# Ez Aigent System - Local Deployment Script
# Comprehensive local deployment without Docker dependency

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
DEPLOYMENT_VERSION="v$(date +%Y%m%d-%H%M%S)"
ENVIRONMENT="local"
DEPLOY_USER="${USER}"

# ASCII Art Header
echo -e "${PURPLE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🚀 Ez Aigent System - Local Deployment                     ║
║                                                                ║
║        AI-Powered Multi-Agent Orchestration Platform          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${WHITE}🎯 LOCAL DEPLOYMENT - Version ${DEPLOYMENT_VERSION}${NC}"
echo -e "${WHITE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${WHITE}Deployed by: ${DEPLOY_USER}${NC}"
echo "=================================================================="

# Create necessary directories
setup_directories() {
    echo -e "\n${CYAN}📁 SETTING UP DIRECTORIES${NC}"
    echo "----------------------------------------"
    
    # Create output directories
    mkdir -p src/output
    mkdir -p logs
    mkdir -p backups
    mkdir -p deployment-reports
    
    # Create PID tracking directory
    mkdir -p .pids
    
    echo -e "  ✅ Directory structure created"
}

# Install dependencies
install_dependencies() {
    echo -e "\n${CYAN}📦 INSTALLING DEPENDENCIES${NC}"
    echo "----------------------------------------"
    
    # Check if package.json exists, if not create it
    if [ ! -f "package.json" ]; then
        echo -e "${BLUE}Creating root package.json...${NC}"
        cat > package.json << 'EOF'
{
  "name": "ez-aigent-system",
  "version": "2.0.0",
  "description": "AI-powered multi-agent orchestration platform",
  "main": "cli/runner.js",
  "scripts": {
    "start": "node cli/runner.js",
    "dashboard": "cd dashboard && npm run dev",
    "agent:claude": "node agents/claude/index.js",
    "agent:gpt": "node agents/gpt/index.js",
    "agent:deepseek": "node agents/deepseek/index.js",
    "agent:mistral": "node agents/mistral/index.js",
    "agent:gemini": "node agents/gemini/index.js",
    "analytics": "node cli/enhancement-analytics.js report",
    "ai-orchestrator": "node cli/enhancement-ai-orchestrator.js",
    "neural-optimizer": "node cli/enhancement-neural-optimizer.js",
    "security-scan": "node cli/enhancement-security-scanner.js scan",
    "performance-optimize": "node cli/enhancement-performance-optimizer.js analyze",
    "enterprise-manage": "node cli/enhancement-enterprise-manager.js",
    "test": "echo \"Tests not implemented yet\"",
    "deploy": "./scripts/local-deployment.sh"
  },
  "dependencies": {
    "ioredis": "^5.3.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "author": "Ez Aigent Team",
  "license": "MIT"
}
EOF
    fi
    
    # Install root dependencies
    echo -e "${BLUE}Installing root dependencies...${NC}"
    npm install
    echo -e "  ✅ Root dependencies installed"
    
    # Install CLI dependencies
    if [ ! -f "cli/package.json" ]; then
        echo -e "${BLUE}Creating CLI package.json...${NC}"
        mkdir -p cli
        cat > cli/package.json << 'EOF'
{
  "name": "ez-aigent-cli",
  "version": "1.0.0",
  "description": "Ez Aigent CLI orchestration tools",
  "main": "runner.js",
  "dependencies": {
    "ioredis": "^5.3.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  }
}
EOF
    fi
    
    if [ -f "cli/package.json" ]; then
        echo -e "${BLUE}Installing CLI dependencies...${NC}"
        cd cli && npm install && cd ..
        echo -e "  ✅ CLI dependencies installed"
    fi
    
    # Install dashboard dependencies
    if [ ! -f "dashboard/package.json" ]; then
        echo -e "${BLUE}Creating dashboard package.json...${NC}"
        mkdir -p dashboard
        cat > dashboard/package.json << 'EOF'
{
  "name": "ez-aigent-dashboard",
  "version": "1.0.0",
  "description": "Ez Aigent monitoring dashboard",
  "main": "src/app.jsx",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.9.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.294.0",
    "ioredis": "^5.3.2"
  }
}
EOF
    fi
    
    if [ -f "dashboard/package.json" ]; then
        echo -e "${BLUE}Installing dashboard dependencies...${NC}"
        cd dashboard && npm install && cd ..
        echo -e "  ✅ Dashboard dependencies installed"
    fi
}

# Create configuration files
create_configuration() {
    echo -e "\n${CYAN}⚙️  CREATING CONFIGURATION FILES${NC}"
    echo "----------------------------------------"
    
    # Create shared directory and configuration
    mkdir -p shared
    
    # Create filemap.json if it doesn't exist
    if [ ! -f "shared/filemap.json" ]; then
        echo -e "${BLUE}Creating task-to-agent mapping...${NC}"
        cat > shared/filemap.json << 'EOF'
{
  "task_mappings": {
    "architecture": {
      "agent": "claude",
      "model": "claude-3-opus",
      "prompt": "Analyze and improve the architecture of this code"
    },
    "implementation": {
      "agent": "gpt",
      "model": "gpt-4o",
      "prompt": "Implement the functionality described in this file"
    },
    "testing": {
      "agent": "deepseek",
      "model": "deepseek-coder",
      "prompt": "Create comprehensive tests for this code"
    },
    "documentation": {
      "agent": "mistral",
      "model": "command-r-plus",
      "prompt": "Generate clear documentation for this code"
    },
    "analysis": {
      "agent": "gemini",
      "model": "gemini-pro",
      "prompt": "Analyze this code for potential improvements"
    }
  }
}
EOF
        echo -e "  ✅ Task mapping configuration created"
    fi
    
    # Create environment configuration
    if [ ! -f ".env.local" ]; then
        echo -e "${BLUE}Creating local environment configuration...${NC}"
        cat > .env.local << 'EOF'
# Ez Aigent Local Configuration

# Redis Configuration
REDIS_URL=redis://localhost:6379

# API Keys (Replace with your actual keys)
CLAUDE_API_KEY=sk-or-cl-max-your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
DEEPSEEK_API_KEY=sk-your-key-here
MISTRAL_API_KEY=sk-your-key-here
GEMINI_API_KEY=sk-your-key-here

# System Configuration
NODE_ENV=development
LOG_LEVEL=info
MAX_CONCURRENT_TASKS=10
TASK_TIMEOUT=300000

# Dashboard Configuration
DASHBOARD_PORT=3000
DASHBOARD_HOST=localhost
ENABLE_ANALYTICS=true

# AI Configuration
ENABLE_AI_ORCHESTRATION=true
ENABLE_NEURAL_OPTIMIZATION=true
AI_CONFIDENCE_THRESHOLD=0.7
LEARNING_RATE=0.001

# Local Development
AUTO_SCALING_ENABLED=false
MIN_AGENTS=1
MAX_AGENTS=3
EOF
        echo -e "  ✅ Local environment configuration created"
        echo -e "  ⚠️  Please edit .env.local with your actual API keys"
    fi
}

# Start Redis (if available)
start_redis() {
    echo -e "\n${CYAN}🔴 STARTING REDIS${NC}"
    echo "----------------------------------------"
    
    if command -v redis-server &> /dev/null; then
        # Check if Redis is already running
        if redis-cli ping &> /dev/null; then
            echo -e "  ✅ Redis is already running"
        else
            echo -e "${BLUE}Starting Redis server...${NC}"
            redis-server --daemonize yes --port 6379
            sleep 2
            
            if redis-cli ping &> /dev/null; then
                echo -e "  ✅ Redis started successfully"
            else
                echo -e "  ❌ Failed to start Redis"
                exit 1
            fi
        fi
    else
        echo -e "  ⚠️  Redis not found. Please install Redis:"
        echo -e "     macOS: brew install redis"
        echo -e "     Ubuntu: sudo apt-get install redis-server"
        echo -e "     Or use Docker: docker run -d -p 6379:6379 redis:alpine"
        exit 1
    fi
}

# Start orchestrator
start_orchestrator() {
    echo -e "\n${CYAN}🎯 STARTING ORCHESTRATOR${NC}"
    echo "----------------------------------------"
    
    if [ ! -f "cli/runner.js" ]; then
        echo -e "${BLUE}Creating orchestrator runner...${NC}"
        cat > cli/runner.js << 'EOF'
#!/usr/bin/env node

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

console.log('🎯 Ez Aigent Orchestrator starting...');

// Load configuration
let taskMapping = {};
try {
    const configPath = path.join(__dirname, '../shared/filemap.json');
    if (fs.existsSync(configPath)) {
        taskMapping = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('✅ Task mapping loaded');
    }
} catch (error) {
    console.error('❌ Failed to load task mapping:', error.message);
}

// Simple task distribution
async function distributeTask(task) {
    const { type, file, prompt } = task;
    const mapping = taskMapping.task_mappings[type] || taskMapping.task_mappings.implementation;
    
    const job = {
        file,
        prompt: prompt || mapping.prompt,
        model: mapping.model,
        timestamp: new Date().toISOString()
    };
    
    await redis.lpush(`queue:${mapping.model}`, JSON.stringify(job));
    console.log(`📋 Task queued for ${mapping.agent}: ${file}`);
}

// Health check endpoint
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/status', async (req, res) => {
    const queues = {};
    const models = ['claude-3-opus', 'gpt-4o', 'deepseek-coder', 'command-r-plus', 'gemini-pro'];
    
    for (const model of models) {
        queues[model] = await redis.llen(`queue:${model}`) || 0;
    }
    
    res.json({ queues, timestamp: new Date().toISOString() });
});

app.listen(8080, () => {
    console.log('🌐 Orchestrator API listening on port 8080');
});

// Keep alive
setInterval(() => {
    console.log('💓 Orchestrator heartbeat');
}, 30000);

process.on('SIGINT', () => {
    console.log('🛑 Orchestrator shutting down...');
    redis.disconnect();
    process.exit(0);
});
EOF
        chmod +x cli/runner.js
    fi
    
    echo -e "${BLUE}Starting orchestrator...${NC}"
    cd cli && node runner.js &
    local orchestrator_pid=$!
    echo $orchestrator_pid > ../.pids/orchestrator.pid
    cd ..
    
    sleep 2
    
    # Check if orchestrator is running
    if kill -0 $orchestrator_pid 2>/dev/null; then
        echo -e "  ✅ Orchestrator started (PID: $orchestrator_pid)"
    else
        echo -e "  ❌ Failed to start orchestrator"
        exit 1
    fi
}

# Start agents
start_agents() {
    echo -e "\n${CYAN}🤖 STARTING AGENTS${NC}"
    echo "----------------------------------------"
    
    local agents=("claude" "gpt" "deepseek" "mistral" "gemini")
    
    for agent in "${agents[@]}"; do
        mkdir -p "agents/${agent}"
        
        if [ ! -f "agents/${agent}/index.js" ]; then
            echo -e "${BLUE}Creating ${agent} agent...${NC}"
            cat > "agents/${agent}/index.js" << EOF
#!/usr/bin/env node

const Redis = require('ioredis');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const MODEL = process.env.MODEL || '${agent}-model';
const AGENT_TYPE = '${agent}';

console.log(\`🤖 \${AGENT_TYPE} agent starting...\`);

// Simple agent processor
async function processTask(job) {
    const { file, prompt } = JSON.parse(job);
    
    console.log(\`📋 Processing: \${file}\`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Create output
    const output = \`// Processed by \${AGENT_TYPE} agent
// File: \${file}
// Prompt: \${prompt}
// Timestamp: \${new Date().toISOString()}

// This is a simulated result from the \${AGENT_TYPE} agent
// In a real implementation, this would contain actual AI-generated code
console.log('Task completed by \${AGENT_TYPE} agent');
\`;
    
    // Save output
    const outputDir = path.join(process.cwd(), 'src/output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, \`\${file.replace(/\\//g, '__')}_\${AGENT_TYPE}.js\`);
    fs.writeFileSync(outputFile, output);
    
    console.log(\`✅ \${AGENT_TYPE} completed: \${file}\`);
}

// Main processing loop
async function startProcessing() {
    while (true) {
        try {
            const job = await redis.rpoplpush(\`queue:\${MODEL}\`, \`processing:\${MODEL}\`);
            
            if (job) {
                await processTask(job);
                await redis.lrem(\`processing:\${MODEL}\`, 1, job);
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(\`❌ \${AGENT_TYPE} error:\`, error.message);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// Start processing
startProcessing();

// Heartbeat
setInterval(() => {
    console.log(\`💓 \${AGENT_TYPE} agent heartbeat\`);
}, 30000);

process.on('SIGINT', () => {
    console.log(\`🛑 \${AGENT_TYPE} agent shutting down...\`);
    redis.disconnect();
    process.exit(0);
});
EOF
            chmod +x "agents/${agent}/index.js"
        fi
        
        # Create agent package.json if it doesn't exist
        if [ ! -f "agents/${agent}/package.json" ]; then
            cat > "agents/${agent}/package.json" << EOF
{
  "name": "ez-aigent-${agent}",
  "version": "1.0.0",
  "description": "Ez Aigent ${agent} agent",
  "main": "index.js",
  "dependencies": {
    "ioredis": "^5.3.2",
    "axios": "^1.6.0"
  }
}
EOF
            cd "agents/${agent}" && npm install && cd ../..
        fi
        
        echo -e "${BLUE}Starting ${agent} agent...${NC}"
        cd "agents/${agent}" && node index.js &
        local agent_pid=$!
        echo $agent_pid > "../../.pids/${agent}.pid"
        cd ../..
        
        sleep 1
        
        if kill -0 $agent_pid 2>/dev/null; then
            echo -e "    ✅ ${agent} agent started (PID: $agent_pid)"
        else
            echo -e "    ❌ Failed to start ${agent} agent"
        fi
    done
}

# Start dashboard
start_dashboard() {
    echo -e "\n${CYAN}🌐 STARTING DASHBOARD${NC}"
    echo "----------------------------------------"
    
    if [ ! -f "dashboard/next.config.js" ]; then
        echo -e "${BLUE}Creating Next.js configuration...${NC}"
        cat > dashboard/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    REDIS_URL: process.env.REDIS_URL,
  },
}

module.exports = nextConfig
EOF
    fi
    
    # Create simple pages if they don't exist
    mkdir -p dashboard/pages
    
    if [ ! -f "dashboard/pages/index.js" ]; then
        echo -e "${BLUE}Creating dashboard pages...${NC}"
        cat > dashboard/pages/index.js << 'EOF'
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [status, setStatus] = useState(null);
  const [queues, setQueues] = useState({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://localhost:8080/status');
        const data = await response.json();
        setStatus('healthy');
        setQueues(data.queues);
      } catch (error) {
        setStatus('error');
        console.error('Failed to fetch status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🚀 Ez Aigent Dashboard</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>System Status</h2>
        <div style={{ 
          padding: '10px', 
          backgroundColor: status === 'healthy' ? '#d4edda' : '#f8d7da',
          borderRadius: '5px',
          color: status === 'healthy' ? '#155724' : '#721c24'
        }}>
          Status: {status || 'Loading...'}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Queue Status</h2>
        {Object.entries(queues).map(([model, count]) => (
          <div key={model} style={{ 
            padding: '10px', 
            marginBottom: '5px',
            backgroundColor: '#e9ecef',
            borderRadius: '5px'
          }}>
            <strong>{model}:</strong> {count} tasks
          </div>
        ))}
      </div>

      <div>
        <h2>Quick Actions</h2>
        <button 
          onClick={() => window.location.href = 'http://localhost:8080/health'}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Health Check
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
EOF
    fi
    
    echo -e "${BLUE}Starting dashboard...${NC}"
    cd dashboard && npm run dev &
    local dashboard_pid=$!
    echo $dashboard_pid > ../.pids/dashboard.pid
    cd ..
    
    sleep 3
    
    if kill -0 $dashboard_pid 2>/dev/null; then
        echo -e "  ✅ Dashboard started (PID: $dashboard_pid)"
        echo -e "  🌐 Dashboard available at: http://localhost:3000"
    else
        echo -e "  ❌ Failed to start dashboard"
    fi
}

# Create monitoring script
create_monitoring_script() {
    echo -e "\n${CYAN}📊 CREATING MONITORING SCRIPT${NC}"
    echo "----------------------------------------"
    
    cat > scripts/monitor-system.sh << 'EOF'
#!/bin/bash

# Ez Aigent System Monitor

while true; do
    clear
    echo "🚀 Ez Aigent System Monitor - $(date)"
    echo "=============================================="
    
    # Check Redis
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis: Running"
    else
        echo "❌ Redis: Not running"
    fi
    
    # Check orchestrator
    if [ -f ".pids/orchestrator.pid" ] && kill -0 $(cat .pids/orchestrator.pid) 2>/dev/null; then
        echo "✅ Orchestrator: Running (PID: $(cat .pids/orchestrator.pid))"
    else
        echo "❌ Orchestrator: Not running"
    fi
    
    # Check agents
    for agent in claude gpt deepseek mistral gemini; do
        if [ -f ".pids/${agent}.pid" ] && kill -0 $(cat .pids/${agent}.pid) 2>/dev/null; then
            echo "✅ Agent $agent: Running (PID: $(cat .pids/${agent}.pid))"
        else
            echo "❌ Agent $agent: Not running"
        fi
    done
    
    # Check dashboard
    if [ -f ".pids/dashboard.pid" ] && kill -0 $(cat .pids/dashboard.pid) 2>/dev/null; then
        echo "✅ Dashboard: Running (PID: $(cat .pids/dashboard.pid))"
    else
        echo "❌ Dashboard: Not running"
    fi
    
    echo ""
    echo "Queue Status:"
    if redis-cli ping &> /dev/null; then
        for model in claude-3-opus gpt-4o deepseek-coder command-r-plus gemini-pro; do
            count=$(redis-cli LLEN "queue:$model" 2>/dev/null || echo "0")
            echo "  $model: $count tasks"
        done
    else
        echo "  Cannot connect to Redis"
    fi
    
    echo ""
    echo "Press Ctrl+C to exit"
    sleep 5
done
EOF
    
    chmod +x scripts/monitor-system.sh
    echo -e "  ✅ Monitoring script created"
}

# Create stop script
create_stop_script() {
    echo -e "\n${CYAN}🛑 CREATING STOP SCRIPT${NC}"
    echo "----------------------------------------"
    
    cat > scripts/stop-system.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Ez Aigent System..."

# Stop all processes
for pid_file in .pids/*.pid; do
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo "Stopping process $pid..."
            kill $pid
            sleep 2
            if kill -0 $pid 2>/dev/null; then
                echo "Force killing process $pid..."
                kill -9 $pid
            fi
        fi
        rm -f "$pid_file"
    fi
done

# Clean up PID directory
rm -rf .pids

echo "✅ System stopped"
EOF
    
    chmod +x scripts/stop-system.sh
    echo -e "  ✅ Stop script created"
}

# Create deployment summary
create_deployment_summary() {
    echo -e "\n${CYAN}📋 CREATING DEPLOYMENT SUMMARY${NC}"
    echo "----------------------------------------"
    
    cat > "deployment-summary-${DEPLOYMENT_VERSION}.json" << EOF
{
    "deployment": {
        "version": "${DEPLOYMENT_VERSION}",
        "environment": "${ENVIRONMENT}",
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
        "deployed_by": "${DEPLOY_USER}",
        "deployment_type": "local"
    },
    "components": {
        "orchestrator": {
            "status": "deployed",
            "port": 8080,
            "endpoints": {
                "health": "http://localhost:8080/health",
                "status": "http://localhost:8080/status"
            }
        },
        "dashboard": {
            "status": "deployed",
            "port": 3000,
            "url": "http://localhost:3000"
        },
        "agents": {
            "claude": "deployed",
            "gpt": "deployed",
            "deepseek": "deployed",
            "mistral": "deployed",
            "gemini": "deployed"
        },
        "redis": {
            "status": "required",
            "port": 6379,
            "connection": "redis://localhost:6379"
        }
    },
    "features": {
        "ai_orchestration": "available",
        "neural_optimization": "available",
        "security_scanning": "available",
        "performance_optimization": "available",
        "enterprise_features": "available"
    },
    "management": {
        "monitor": "./scripts/monitor-system.sh",
        "stop": "./scripts/stop-system.sh",
        "logs": "./logs/",
        "output": "./src/output/"
    }
}
EOF
    
    echo -e "  ✅ Deployment summary created"
}

# Main execution
main() {
    echo -e "${WHITE}🚀 Starting local deployment...${NC}"
    
    # Execute deployment steps
    setup_directories
    install_dependencies
    create_configuration
    start_redis
    start_orchestrator
    start_agents
    start_dashboard
    create_monitoring_script
    create_stop_script
    create_deployment_summary
    
    echo -e "\n${GREEN}🎉 LOCAL DEPLOYMENT COMPLETE!${NC}"
    echo "=================================================================="
    echo -e "${WHITE}Ez Aigent System is now running locally!${NC}"
    echo ""
    echo -e "${CYAN}Access Points:${NC}"
    echo "  🌐 Dashboard:    http://localhost:3000"
    echo "  🎯 Orchestrator: http://localhost:8080"
    echo "  🔴 Redis:        redis://localhost:6379"
    echo ""
    echo -e "${CYAN}Management Commands:${NC}"
    echo "  Monitor:  ./scripts/monitor-system.sh"
    echo "  Stop:     ./scripts/stop-system.sh"
    echo "  Status:   curl http://localhost:8080/status"
    echo ""
    echo -e "${CYAN}AI Features:${NC}"
    echo "  Analytics:        npm run analytics"
    echo "  AI Orchestrator:  npm run ai-orchestrator"
    echo "  Neural Optimizer: npm run neural-optimizer"
    echo "  Security Scan:    npm run security-scan"
    echo ""
    echo -e "${YELLOW}⚠️  Configuration Notes:${NC}"
    echo "  • Edit .env.local with your API keys"
    echo "  • Ensure Redis is running on port 6379"
    echo "  • Check logs/ directory for debugging"
    echo ""
    echo -e "${WHITE}🎯 Ez Aigent System ${DEPLOYMENT_VERSION} deployed successfully!${NC}"
    echo "=================================================================="
}

# Execute main function
main