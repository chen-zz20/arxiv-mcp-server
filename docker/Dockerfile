FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY build/ ./build/
COPY prompts/ ./prompts/

# Create directories for storage and logs
RUN mkdir -p /app/storage /app/logs

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the stdio interface
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Run the server
CMD ["node", "build/index.js"]
