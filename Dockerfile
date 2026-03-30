# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install root deps (server)
COPY package.json package-lock.json ./
RUN npm ci

# Install frontend deps
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci

# Copy source and build everything
COPY . .
RUN npm run build:all

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled server and built frontend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web/dist ./web/dist

# Create data directory for SQLite volume mount
RUN mkdir -p /data

EXPOSE 4040

ENV FOREMAN_DB=/data/foreman.db
ENV FOREMAN_PORT=4040
ENV NODE_ENV=production

CMD ["node", "dist/index.js", "--web", "--port", "4040"]
