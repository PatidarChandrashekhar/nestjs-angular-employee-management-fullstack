# Built from the repo root (see docker-compose.yml `context: .`) because this
# is an npm-workspaces monorepo: `npm ci` needs the root lockfile plus every
# workspace's package.json to resolve correctly, even when only this service
# is being built.

# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json nx.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci
COPY frontend ./frontend
# frontend/.env (git-ignored) is only present when a developer created it
# locally per the README; the `generate-env` prebuild step reads it to
# produce environment.ts. In CI/CD, write a real frontend/.env before this
# build step, or extend scripts/generate-env.js to take --build-arg overrides.
RUN npx nx build frontend

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/frontend/dist/web/browser /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
