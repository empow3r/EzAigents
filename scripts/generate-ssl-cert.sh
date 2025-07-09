#!/bin/bash

# SSL Certificate Generation Script for Ez Aigent Dashboard
# This script generates self-signed SSL certificates for HTTPS

set -e

# Configuration
CERT_DIR="${1:-./ssl}"
DOMAIN="${SSL_CERT_DOMAIN:-localhost}"
COUNTRY="${SSL_COUNTRY:-US}"
STATE="${SSL_STATE:-California}"
CITY="${SSL_CITY:-San Francisco}"
ORG="${SSL_ORG:-Ez Aigent}"
UNIT="${SSL_UNIT:-IT Department}"
EMAIL="${SSL_EMAIL:-admin@ezaigent.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Ez Aigent SSL Certificate Generator${NC}"
echo "======================================"

# Create certificate directory
mkdir -p "$CERT_DIR"

# Generate private key
echo -e "${YELLOW}📝 Generating private key...${NC}"
openssl genrsa -out "$CERT_DIR/key.pem" 2048

# Generate certificate signing request
echo -e "${YELLOW}📝 Generating certificate signing request...${NC}"
openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/csr.pem" -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$UNIT/CN=$DOMAIN/emailAddress=$EMAIL"

# Generate self-signed certificate
echo -e "${YELLOW}📝 Generating self-signed certificate...${NC}"
openssl x509 -req -days 365 -in "$CERT_DIR/csr.pem" -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem"

# Create certificate chain (for compatibility)
cp "$CERT_DIR/cert.pem" "$CERT_DIR/chain.pem"

# Set proper permissions
chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"
chmod 644 "$CERT_DIR/chain.pem"

# Display certificate information
echo -e "${GREEN}✅ SSL Certificate Generated Successfully!${NC}"
echo "======================================"
echo "Certificate Details:"
echo "Domain: $DOMAIN"
echo "Certificate: $CERT_DIR/cert.pem"
echo "Private Key: $CERT_DIR/key.pem"
echo "Certificate Chain: $CERT_DIR/chain.pem"
echo ""
echo -e "${YELLOW}⚠️  Note: This is a self-signed certificate.${NC}"
echo "   Browsers will show a security warning."
echo "   For production, use certificates from a trusted CA."
echo ""
echo "Certificate expires in 365 days."
echo "To view certificate details:"
echo "  openssl x509 -in $CERT_DIR/cert.pem -text -noout"
echo ""
echo -e "${GREEN}🚀 Your Ez Aigent dashboard will be available at:${NC}"
echo "  https://$DOMAIN:3443"

# Clean up CSR file
rm -f "$CERT_DIR/csr.pem"

echo -e "${GREEN}🎉 SSL setup complete!${NC}"