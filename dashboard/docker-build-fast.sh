#!/bin/bash

# Fast Docker build script for dashboard
# Uses BuildKit for parallel builds and improved caching

set -e

echo "🚀 Starting optimized Docker build for Ez Aigent Dashboard..."

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Build arguments
IMAGE_NAME="ez-aigent-dashboard"
IMAGE_TAG="${1:-latest}"
DOCKERFILE="Dockerfile.optimized"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Using BuildKit with optimizations...${NC}"

# Build with all optimizations
time docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --cache-from ${IMAGE_NAME}:cache \
  --cache-from ${IMAGE_NAME}:latest \
  --target runner \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  -t ${IMAGE_NAME}:cache \
  -f ${DOCKERFILE} \
  .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    
    # Show image size
    echo -e "${BLUE}📊 Image size:${NC}"
    docker images ${IMAGE_NAME}:${IMAGE_TAG} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    
    # Option to run the container
    echo -e "${YELLOW}🏃 To run the container:${NC}"
    echo "docker run -p 3000:3000 ${IMAGE_NAME}:${IMAGE_TAG}"
else
    echo -e "${YELLOW}❌ Build failed!${NC}"
    exit 1
fi