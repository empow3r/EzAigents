#!/bin/bash

# SSL Setup Script for Ez Aigent Docker Deployment
# This script sets up SSL certificates for HTTPS access

set -e

# Configuration
DOMAIN="${SSL_CERT_DOMAIN:-localhost}"
DOCKER_COMPOSE_FILE="${1:-dockge-ez-aigent.yml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Ez Aigent SSL Docker Setup${NC}"
echo "=============================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Create SSL certificates directory
echo -e "${YELLOW}📁 Creating SSL certificates directory...${NC}"
mkdir -p ./ssl

# Generate SSL certificates
echo -e "${YELLOW}🔑 Generating SSL certificates...${NC}"
./scripts/generate-ssl-cert.sh ./ssl

# Create Docker volume for SSL certificates
echo -e "${YELLOW}📦 Creating Docker volume for SSL certificates...${NC}"
docker volume create ssl_certs || true

# Copy certificates to Docker volume
echo -e "${YELLOW}📋 Copying certificates to Docker volume...${NC}"
docker run --rm -v ssl_certs:/data -v $(pwd)/ssl:/ssl alpine:latest sh -c "cp /ssl/* /data/"

# Set proper permissions in Docker volume
echo -e "${YELLOW}🔒 Setting proper permissions...${NC}"
docker run --rm -v ssl_certs:/data alpine:latest sh -c "chmod 600 /data/key.pem && chmod 644 /data/cert.pem"

# Update environment variables
echo -e "${YELLOW}⚙️  Updating environment variables...${NC}"
if [ ! -f .env ]; then
    echo -e "${BLUE}📝 Creating .env file...${NC}"
    cat > .env << EOF
# SSL Configuration
SSL_CERT_DOMAIN=$DOMAIN
ENABLE_HTTPS=true
HTTPS_PORT=3443
SSL_CERT_PATH=/app/ssl/cert.pem
SSL_KEY_PATH=/app/ssl/key.pem
EOF
else
    echo -e "${BLUE}📝 Updating existing .env file...${NC}"
    # Remove existing SSL config
    sed -i.bak '/^SSL_CERT_DOMAIN=/d' .env
    sed -i.bak '/^ENABLE_HTTPS=/d' .env
    sed -i.bak '/^HTTPS_PORT=/d' .env
    sed -i.bak '/^SSL_CERT_PATH=/d' .env
    sed -i.bak '/^SSL_KEY_PATH=/d' .env
    
    # Add new SSL config
    echo "" >> .env
    echo "# SSL Configuration" >> .env
    echo "SSL_CERT_DOMAIN=$DOMAIN" >> .env
    echo "ENABLE_HTTPS=true" >> .env
    echo "HTTPS_PORT=3443" >> .env
    echo "SSL_CERT_PATH=/app/ssl/cert.pem" >> .env
    echo "SSL_KEY_PATH=/app/ssl/key.pem" >> .env
fi

# Display setup completion
echo -e "${GREEN}✅ SSL Docker Setup Complete!${NC}"
echo "=============================="
echo "SSL Certificates: ./ssl/"
echo "Docker Volume: ssl_certs"
echo "HTTPS Port: 3443"
echo "Domain: $DOMAIN"
echo ""
echo -e "${YELLOW}🚀 To start your Ez Aigent system with SSL:${NC}"
echo "  docker-compose -f $DOCKER_COMPOSE_FILE up -d"
echo ""
echo -e "${GREEN}🌐 Your dashboard will be available at:${NC}"
echo "  https://$DOMAIN:3443"
echo ""
echo -e "${YELLOW}⚠️  Certificate Information:${NC}"
echo "  - Self-signed certificate (browsers will show warning)"
echo "  - Valid for 365 days"
echo "  - For production, replace with CA-signed certificate"
echo ""
echo -e "${BLUE}📋 To view certificate details:${NC}"
echo "  openssl x509 -in ./ssl/cert.pem -text -noout"
echo ""
echo -e "${GREEN}🎉 SSL setup complete! Your Ez Aigent system is ready for HTTPS.${NC}"