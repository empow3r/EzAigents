#!/bin/bash

# Generate self-signed SSL certificates for local development
# For production, use Let's Encrypt or your certificate provider

CERT_DIR="./ssl_certs"
DOMAIN="${SSL_CERT_DOMAIN:-localhost}"

echo "Generating self-signed SSL certificates for $DOMAIN..."

# Create certificate directory
mkdir -p $CERT_DIR

# Generate private key
openssl genrsa -out $CERT_DIR/key.pem 2048

# Generate certificate signing request
openssl req -new -key $CERT_DIR/key.pem -out $CERT_DIR/csr.pem \
    -subj "/C=US/ST=State/L=City/O=Ez Aigent/CN=$DOMAIN"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in $CERT_DIR/csr.pem \
    -signkey $CERT_DIR/key.pem -out $CERT_DIR/cert.pem

# Clean up CSR
rm $CERT_DIR/csr.pem

# Set proper permissions
chmod 600 $CERT_DIR/key.pem
chmod 644 $CERT_DIR/cert.pem

echo "SSL certificates generated successfully in $CERT_DIR/"
echo ""
echo "Note: These are self-signed certificates for development only."
echo "For production, use certificates from a trusted CA like Let's Encrypt."