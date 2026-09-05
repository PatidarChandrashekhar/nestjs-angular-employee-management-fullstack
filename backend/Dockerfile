# Built from the repo root (see docker-compose.yml `context: .`) because this
# is an npm-workspaces monorepo: `npm ci` needs the root lockfile plus every
# workspace's package.json to resolve correctly, even when only this service
# is being built.

# ---------- Dependencies stage (full tree, for the Nx build) ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json nx.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

# ---------- Build stage ----------
FROM deps AS builder
WORKDIR /app
COPY backend ./backend
RUN npx nx build backend

# ---------- Production dependencies stage (backend workspace only) ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --omit=dev --workspace=backend

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY backend/package.json ./package.json
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health/live || exit 1
CMD ["node", "dist/main.js"]
