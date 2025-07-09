#!/bin/bash

# Update Next.js Dashboard Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Updating Ez Aigent Dashboard to Latest Next.js${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d. -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18.17.0 or higher required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Navigate to dashboard directory
cd dashboard

# Backup current package.json
echo -e "${BLUE}📦 Backing up package.json...${NC}"
cp package.json package.json.backup

# Clean install
echo -e "${BLUE}🧹 Cleaning node_modules and lock files...${NC}"
rm -rf node_modules package-lock.json

# Install dependencies
echo -e "${BLUE}📦 Installing updated dependencies...${NC}"
npm install

# Update React 19 specific features
echo -e "${BLUE}🔧 Checking for React 19 compatibility...${NC}"

# Create a simple test file to verify React 19
cat > test-react-19.js << 'EOF'
const pkg = require('./package.json');
const reactVersion = pkg.dependencies.react;
const nextVersion = pkg.dependencies.next;

console.log(`React Version: ${reactVersion}`);
console.log(`Next.js Version: ${nextVersion}`);

if (reactVersion.includes('19.')) {
    console.log('✅ React 19 installed');
} else {
    console.log('⚠️  React 19 not installed');
}

if (nextVersion.includes('15.')) {
    console.log('✅ Next.js 15 installed');
} else {
    console.log('⚠️  Next.js 15 not installed');
}
EOF

node test-react-19.js
rm test-react-19.js

# Build test
echo -e "${BLUE}🔨 Testing build...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed. Rolling back...${NC}"
    mv package.json.backup package.json
    npm install
    exit 1
fi

# Success message
echo ""
echo -e "${GREEN}🎉 Dashboard updated successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Key Updates:${NC}"
echo "• Next.js 15.3.5 (latest)"
echo "• React 19.0.0"
echo "• Updated all dependencies to latest versions"
echo "• Added TypeScript dev dependencies"
echo "• Enabled Next.js 15 optimizations"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test the dashboard: npm run dev"
echo "2. Check for any deprecation warnings"
echo "3. Update components if needed for React 19"
echo "4. Deploy with: docker-compose build dashboard"
echo ""
echo -e "${BLUE}Breaking Changes to Check:${NC}"
echo "• React 19: New concurrent features"
echo "• Next.js 15: App Router is now stable"
echo "• Radix UI: Updated to v1+ with new APIs"
echo "• Framer Motion: v11 has new animation syntax"

cd ..