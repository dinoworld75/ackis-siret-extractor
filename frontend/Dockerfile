# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build arguments with default values
ARG VITE_API_BASE_URL=/api
ARG VITE_MAX_FILE_SIZE=10485760
ARG VITE_BATCH_SIZE=100

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build production bundle
RUN pnpm run build

# Stage 2: Production with Nginx
FROM nginx:1.25-alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
