#!/bin/bash

# Dashboard Server Launcher
# Hosts the observability dashboard on localhost:8080

echo "🚀 Claude Code Observability Dashboard Launcher"
echo "=============================================="
echo ""

# Default values
PORT=8080
HOST="0.0.0.0"  # Bind to all interfaces

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -p, --port PORT    Port to serve on (default: 8080)"
            echo "  -h, --host HOST    Host to bind to (default: 0.0.0.0)"
            echo ""
            echo "Examples:"
            echo "  $0                 # Serve on 0.0.0.0:8080"
            echo "  $0 -p 3000         # Serve on 0.0.0.0:3000"
            echo "  $0 -h localhost    # Serve on localhost only"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "📡 Starting dashboard server..."
    echo "   Host: $HOST"
    echo "   Port: $PORT"
    echo ""
    echo "🌐 Access the dashboard at:"
    echo "   - http://localhost:$PORT"
    if [ "$HOST" = "0.0.0.0" ]; then
        # Get local IP address
        if command -v ifconfig &> /dev/null; then
            LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
            if [ ! -z "$LOCAL_IP" ]; then
                echo "   - http://$LOCAL_IP:$PORT"
            fi
        fi
    fi
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    # Change to client directory and start server
    cd client
    python3 -m http.server $PORT --bind $HOST
else
    echo "❌ Python 3 is required but not found"
    echo "   Please install Python 3 to continue"
    exit 1
fi