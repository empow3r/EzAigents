# Simple Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]