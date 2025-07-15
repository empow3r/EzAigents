FROM oven/bun:latest

WORKDIR /app

# Copy server files
COPY server/app-enhanced.ts ./server/
COPY server/package.json ./server/

# Install dependencies if any
WORKDIR /app/server
RUN bun install || true

# Create db directory
RUN mkdir -p /app/server/db

# Expose port
EXPOSE 3001

# Run the enhanced server
CMD ["bun", "run", "app-enhanced.ts"]