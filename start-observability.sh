#!/bin/bash

# Observability Stack Starter
# Multiple options for hosting the dashboard

echo "🔍 Claude Code Observability Stack"
echo "=================================="
echo ""
echo "Choose how to start:"
echo "1) All-in-one server (API + Dashboard on port 3001)"
echo "2) Separate servers (API on 3001, Dashboard on 8080)"
echo "3) Dashboard only (port 8080)"
echo "4) Custom configuration"
echo ""

read -p "Select option (1-4): " choice

case $choice in
    1)
        echo "🚀 Starting all-in-one server..."
        cd server
        if command -v bun &> /dev/null; then
            bun run all-in-one-server.ts
        else
            echo "❌ Bun is required. Install from: https://bun.sh"
            exit 1
        fi
        ;;
        
    2)
        echo "🚀 Starting separate servers..."
        
        # Start API server in background
        cd server
        if command -v bun &> /dev/null; then
            echo "Starting API server on port 3001..."
            bun run app-enhanced.ts &
            API_PID=$!
            cd ..
            
            # Start dashboard server
            echo "Starting dashboard server on port 8080..."
            ./start-dashboard.sh
            
            # Kill API server when dashboard exits
            kill $API_PID 2>/dev/null
        else
            echo "❌ Bun is required. Install from: https://bun.sh"
            exit 1
        fi
        ;;
        
    3)
        echo "🚀 Starting dashboard only..."
        ./start-dashboard.sh
        ;;
        
    4)
        echo "Custom configuration:"
        read -p "API port (default 3001): " api_port
        read -p "Dashboard port (default 8080): " dash_port
        read -p "Host to bind (default 0.0.0.0): " host
        
        api_port=${api_port:-3001}
        dash_port=${dash_port:-8080}
        host=${host:-0.0.0.0}
        
        export PORT=$api_port
        export DASHBOARD_PORT=$dash_port
        export DASHBOARD_HOST=$host
        
        echo "Starting with custom config..."
        echo "API: $host:$api_port"
        echo "Dashboard: $host:$dash_port"
        
        cd server
        bun run all-in-one-server.ts
        ;;
        
    *)
        echo "Invalid option"
        exit 1
        ;;
esac