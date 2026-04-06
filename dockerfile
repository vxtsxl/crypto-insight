# ============================================
# STAGE 1: Install Dependencies
# ============================================
# Start from Node.js 20 Alpine (small Linux)
FROM node:20-alpine AS deps

# Set working directory inside container
WORKDIR /app

# Copy only package files first (Docker caching optimization)
COPY package.json package-lock.json ./

# Install dependencies
# npm ci = clean install (faster, more reliable than npm install)
RUN npm ci

# ============================================
# STAGE 2: Build Application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Build Next.js app
# This creates optimized production files
RUN npm run build

# ============================================
# STAGE 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set to production mode
ENV NODE_ENV=production

# Create a non-root user for security
# Running as root inside container is dangerous
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the built files we need
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port 3000 (doesn't actually open it, just documentation)
EXPOSE 3000

# Tell Docker how to run the app
CMD ["node", "server.js"]
