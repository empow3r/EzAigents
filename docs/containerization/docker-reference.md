# Docker Reference Guide

## Overview
Docker is used throughout the Ez Aigent system for containerizing agents, services, and the dashboard.

## Installation

### Docker Desktop
- **Windows/Mac**: Download from https://www.docker.com/products/docker-desktop
- **Linux**: Follow distribution-specific instructions

### Docker Engine (Linux)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
```

## Core Commands

### Images
```bash
# Build image
docker build -t ez-aigent-claude .

# List images
docker images

# Remove image
docker rmi ez-aigent-claude

# Pull image
docker pull redis:alpine

# Tag image
docker tag ez-aigent-claude:latest ez-aigent-claude:v1.0
```

### Containers
```bash
# Run container
docker run -d --name claude-agent ez-aigent-claude

# List containers
docker ps
docker ps -a  # Include stopped containers

# Stop container
docker stop claude-agent

# Remove container
docker rm claude-agent

# Execute command in container
docker exec -it claude-agent bash

# View logs
docker logs claude-agent
docker logs -f claude-agent  # Follow logs
```

### Networks
```bash
# Create network
docker network create ez-aigent-network

# List networks
docker network ls

# Connect container to network
docker network connect ez-aigent-network claude-agent

# Inspect network
docker network inspect ez-aigent-network
```

### Volumes
```bash
# Create volume
docker volume create ez-aigent-data

# List volumes
docker volume ls

# Remove volume
docker volume rm ez-aigent-data

# Mount volume
docker run -v ez-aigent-data:/app/data ez-aigent-claude
```

## Dockerfile

### Basic Structure
```dockerfile
# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set user (security)
USER node

# Start command
CMD ["node", "index.js"]
```

### Multi-stage Build
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Ez Aigent Agent Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S claude -u 1001

# Change ownership
RUN chown -R claude:nodejs /app

USER claude

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

EXPOSE 3000
CMD ["node", "index.js"]
```

## Docker Compose

### Basic Compose File
```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  claude-agent:
    build: ./agents/claude
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    restart: unless-stopped

volumes:
  redis-data:
```

### Ez Aigent Compose Configuration
```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  claude-agent:
    build: ./agents/claude
    container_name: ai_claude
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - AGENT_ID=claude_001
    volumes:
      - ./src:/app/src
      - ./.agent-memory/claude:/app/.agent-memory
    restart: unless-stopped

  gpt-agent:
    build: ./agents/gpt
    container_name: ai_gpt
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - AGENT_ID=gpt_001
    volumes:
      - ./src:/app/src
      - ./.agent-memory/gpt:/app/.agent-memory
    restart: unless-stopped

  deepseek-agent:
    build: ./agents/deepseek
    container_name: ai_deepseek
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - AGENT_ID=deepseek_001
    volumes:
      - ./src:/app/src
      - ./.agent-memory/deepseek:/app/.agent-memory
    restart: unless-stopped

  dashboard:
    build: ./dashboard
    container_name: ai_dashboard
    ports:
      - "3000:3000"
    depends_on:
      - redis
    environment:
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    volumes:
      - ./dashboard/src:/app/src
    restart: unless-stopped

volumes:
  redis-data:

networks:
  default:
    name: ez-aigent-network
```

### Development Compose
```yaml
version: '3.8'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  claude-agent:
    build: 
      context: ./agents/claude
      dockerfile: Dockerfile.dev
    volumes:
      - ./agents/claude:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

volumes:
  redis-data:
```

## Environment Variables

### .env File
```bash
# .env
REDIS_URL=redis://localhost:6379
CLAUDE_API_KEY=your-claude-key
OPENAI_API_KEY=your-openai-key
DEEPSEEK_API_KEY=your-deepseek-key
MISTRAL_API_KEY=your-mistral-key
GEMINI_API_KEY=your-gemini-key
```

### Environment in Compose
```yaml
services:
  app:
    image: my-app
    environment:
      - NODE_ENV=production
      - API_KEY=${API_KEY}
    env_file:
      - .env
      - .env.production
```

## Networking

### Bridge Network (Default)
```bash
# Containers can communicate by name
docker run --name app1 my-app
docker run --name app2 my-app

# app1 can reach app2 at hostname "app2"
```

### Custom Network
```bash
# Create network
docker network create --driver bridge ez-aigent-net

# Run containers in network
docker run --network ez-aigent-net --name redis redis:alpine
docker run --network ez-aigent-net --name app my-app
```

### Port Mapping
```bash
# Map container port to host port
docker run -p 3000:3000 my-app
docker run -p 127.0.0.1:3000:3000 my-app  # Bind to specific interface
```

## Volume Management

### Bind Mounts
```bash
# Mount host directory to container
docker run -v /host/path:/container/path my-app

# Mount current directory
docker run -v $(pwd):/app my-app
```

### Named Volumes
```bash
# Create volume
docker volume create my-data

# Use volume
docker run -v my-data:/app/data my-app

# Inspect volume
docker volume inspect my-data
```

### tmpfs Mounts
```bash
# Mount tmpfs (memory-based filesystem)
docker run --tmpfs /tmp my-app
```

## Security Best Practices

### User Management
```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Switch to user
USER nodejs
```

### Image Security
```dockerfile
# Use specific version tags
FROM node:18.19.0-alpine

# Update packages
RUN apk update && apk upgrade

# Remove unnecessary packages
RUN apk del build-dependencies

# Use multi-stage builds
FROM node:18-alpine AS builder
# ... build stage
FROM node:18-alpine AS production
# ... production stage
```

### Secret Management
```bash
# Use Docker secrets (Swarm mode)
echo "my-secret" | docker secret create my-secret -

# Use secrets in compose
services:
  app:
    secrets:
      - my-secret
secrets:
  my-secret:
    external: true
```

## Health Checks

### Dockerfile Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Compose Health Check
```yaml
services:
  app:
    image: my-app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Monitoring & Logging

### Log Configuration
```yaml
services:
  app:
    image: my-app
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

### Resource Limits
```yaml
services:
  app:
    image: my-app
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## Troubleshooting

### Common Commands
```bash
# Check container logs
docker logs -f container-name

# Execute shell in container
docker exec -it container-name sh

# Inspect container
docker inspect container-name

# Check resource usage
docker stats

# System information
docker system df
docker system info
```

### Debugging Build Issues
```bash
# Build with no cache
docker build --no-cache -t my-app .

# Build with progress
docker build --progress=plain -t my-app .

# Multi-stage build debugging
docker build --target=builder -t my-app:debug .
```

## Best Practices

### Image Optimization
1. Use specific version tags
2. Use multi-stage builds
3. Minimize layers
4. Use .dockerignore
5. Run as non-root user

### Container Management
1. Use health checks
2. Set resource limits
3. Use proper restart policies
4. Handle signals gracefully
5. Store data in volumes

### Development Workflow
1. Use docker-compose for local development
2. Use bind mounts for hot reload
3. Separate development and production configs
4. Use environment variables for configuration