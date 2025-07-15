FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY cli/package*.json ./cli/
RUN npm ci --legacy-peer-deps

# Copy necessary files
COPY shared ./shared
COPY cli ./cli

# Create logs directory
RUN mkdir -p cli/logs

# Set environment variables
ENV NODE_ENV=production

# Default command (can be overridden)
CMD ["node", "cli/api-key-manager.js", "start"]