# Cloud Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Foreman AI into a Docker container and deploy it to Fly.io with a persistent SQLite volume, so the dashboard is accessible from anywhere.

**Architecture:** A multi-stage Dockerfile builds the TypeScript server and React frontend, then produces a minimal runtime image. Fly.io hosts the container with a mounted volume at `/data` for SQLite persistence. The `FOREMAN_DB` env var points to `/data/foreman.db`. A `fly.toml` config file handles deployment settings, health checks, and volume mounts.

**Tech Stack:** Docker (multi-stage), Fly.io (`flyctl`), Node.js 20-alpine, SQLite persistent volume

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Read | `src/index.ts` | Verify FOREMAN_DB env var is respected |
| Create | `Dockerfile` | Multi-stage build + runtime image |
| Create | `.dockerignore` | Exclude dev files from image |
| Create | `fly.toml` | Fly.io app configuration |
| Create | `.env.example` | Document all env vars |
| Modify | `README.md` | Add Deploy section + screenshot placeholder |

---

## Task 1: Verify FOREMAN_DB env var support in index.ts

The DB path must respect `FOREMAN_DB` env var for Docker deployments. Before writing the Dockerfile, confirm this works.

- [ ] **Step 1: Read `src/index.ts` and check DB path handling**

```bash
cat src/index.ts
```

Look for how `--db` flag and/or `FOREMAN_DB` env var are handled. The pattern should be:

```typescript
const dbPath = args.db || process.env.FOREMAN_DB || path.join(os.homedir(), ".foreman", "foreman.db");
```

- [ ] **Step 2: If `FOREMAN_DB` env var is NOT already read, add it**

Find the argument parsing block in `src/index.ts`. Add `FOREMAN_DB` env var fallback. The final line that calls `initDb` should look like:

```typescript
const dbPath = args.db
  || process.env.FOREMAN_DB
  || path.join(os.homedir(), ".foreman", "foreman.db");
```

If it already reads `FOREMAN_DB`, skip this step.

- [ ] **Step 3: If modified, rebuild and verify**

```bash
npm run build
FOREMAN_DB=/tmp/test-foreman.db node dist/index.js --web --port 4041 &
sleep 2
curl http://localhost:4041/api/health
kill %1
rm -f /tmp/test-foreman.db
```

Expected: `{"status":"ok","version":"2.0.0"}`

- [ ] **Step 4: Commit if modified**

```bash
git add src/index.ts
git commit -m "feat: respect FOREMAN_DB env var for database path"
```

---

## Task 2: Create Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
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
```

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
web/node_modules
dist
web/dist
.git
.claude
*.log
.env
.env.*
!.env.example
docs/superpowers
```

- [ ] **Step 3: Build the image locally**

```bash
docker build -t foreman-ai:local .
```

Expected: Build completes successfully. The output should show:
```
=> [runtime] COPY --from=builder /app/web/dist ./web/dist
=> exporting to image
```

- [ ] **Step 4: Test the container runs**

```bash
docker run --rm -p 4042:4040 -e FOREMAN_DB=/data/foreman.db foreman-ai:local &
sleep 3
curl http://localhost:4042/api/health
docker stop $(docker ps -q --filter ancestor=foreman-ai:local)
```

Expected: `{"status":"ok","version":"2.0.0"}`

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add multi-stage Dockerfile for production deployment"
```

---

## Task 3: Create fly.toml

**Files:**
- Create: `fly.toml`

- [ ] **Step 1: Install flyctl if not already installed**

```bash
fly version 2>/dev/null || curl -L https://fly.io/install.sh | sh
```

Expected: `fly v0.x.x` printed, or install runs successfully.

- [ ] **Step 2: Create `fly.toml`**

Replace `foreman-ai-YOUR-NAME` with your unique app name (Fly.io app names must be globally unique).

```toml
app = "foreman-ai-YOUR-NAME"
primary_region = "ord"

[build]

[env]
  PORT = "4040"
  NODE_ENV = "production"
  FOREMAN_DB = "/data/foreman.db"

[http_service]
  internal_port = 4040
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [http_service.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

[[mounts]]
  source = "foreman_data"
  destination = "/data"
  initial_size = "1gb"
```

- [ ] **Step 3: Commit**

```bash
git add fly.toml
git commit -m "feat: add fly.toml for Fly.io deployment"
```

---

## Task 4: Create .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

```bash
# Foreman AI environment variables
# Copy this to .env for local development

# Path to SQLite database file
# Default: ~/.foreman/foreman.db
# In Docker/Fly.io: /data/foreman.db
FOREMAN_DB=~/.foreman/foreman.db

# HTTP port for web dashboard
# Default: 4040
FOREMAN_PORT=4040

# Optional API key to protect the REST API
# If unset, all requests are allowed (safe for local use)
# Generate one with: openssl rand -hex 32
FOREMAN_API_KEY=
```

- [ ] **Step 2: Verify .gitignore excludes .env but not .env.example**

```bash
grep -n "\.env" .gitignore 2>/dev/null || echo "No .gitignore entry"
```

If `.env` is not in `.gitignore`, add it:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "docs: add .env.example and ensure .env is gitignored"
```

---

## Task 5: Add Deploy section + screenshot placeholder to README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add screenshot placeholder and Deploy section to README**

Find the line `## Install` in `README.md` and insert the screenshot placeholder directly above it. Then find the `## License` section and insert the Deploy section before it.

**After the badges block, before `## Install`, add:**

```markdown
<!-- TODO: add dashboard screenshot — run `npm run dashboard` then take a screenshot of http://localhost:4040 -->
<!-- ![Foreman AI Dashboard](docs/screenshots/dashboard.png) -->

```

**Before `## License`, add:**

```markdown
## Deploy to Fly.io

Run the dashboard in the cloud so it's accessible from anywhere (and your phone).

**Prerequisites:** [flyctl installed](https://fly.io/docs/hands-on/install-flyctl/) and logged in.

**First deploy:**

```bash
# 1. Edit fly.toml — set a unique app name
#    app = "foreman-ai-your-name"

# 2. Launch (creates the app + volume on Fly.io)
fly launch --no-deploy

# 3. Create the SQLite volume
fly volumes create foreman_data --size 1 --region ord

# 4. Set an API key (optional but recommended for cloud)
fly secrets set FOREMAN_API_KEY=$(openssl rand -hex 32)

# 5. Deploy
fly deploy
```

Your dashboard is now live at `https://foreman-ai-your-name.fly.dev`.

**Subsequent deploys:**

```bash
fly deploy
```

**View logs:**

```bash
fly logs
```

**Access your database:**

```bash
fly ssh console
sqlite3 /data/foreman.db ".tables"
```

### Run with Docker locally

```bash
docker run -p 4040:4040 \
  -v ~/.foreman:/data \
  -e FOREMAN_DB=/data/foreman.db \
  ghcr.io/YOUR-USERNAME/foreman-ai:latest
```

```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add screenshot placeholder and Fly.io deploy section to README"
```

---

## Task 6: Deploy to Fly.io

> **Prerequisites:** `fly auth login` must be complete before running these steps.

- [ ] **Step 1: Set your app name in fly.toml**

Edit `fly.toml` line 1. Replace `foreman-ai-YOUR-NAME` with a globally unique name, e.g. `foreman-ai-mitch`:

```toml
app = "foreman-ai-mitch"
```

```bash
git add fly.toml
git commit -m "chore: set Fly.io app name"
```

- [ ] **Step 2: Create the Fly app (no deploy yet)**

```bash
fly launch --no-deploy
```

Expected: App created on Fly.io. You'll see `App foreman-ai-mitch created`.

- [ ] **Step 3: Create the persistent volume**

```bash
fly volumes create foreman_data --size 1 --region ord
```

Expected:
```
ID: vol_xxxx
Name: foreman_data
...
```

- [ ] **Step 4: Set API key secret**

```bash
fly secrets set FOREMAN_API_KEY=$(openssl rand -hex 32)
```

Expected: `Secrets are staged for the first deployment`

- [ ] **Step 5: Deploy**

```bash
fly deploy
```

Expected: Build completes, machine starts, health check passes:
```
--> v1 deployed successfully
```

- [ ] **Step 6: Verify the deployment**

```bash
fly status
```

Expected: `Machines: 1 started`

```bash
fly open
```

Expected: Dashboard opens in browser at `https://foreman-ai-mitch.fly.dev`.

```bash
curl https://foreman-ai-mitch.fly.dev/api/health
```

Expected: `{"status":"ok","version":"2.0.0"}`

- [ ] **Step 7: Update README with your actual deployment URL**

In `README.md`, find the Deploy section and add the live URL:

```markdown
## Deploy to Fly.io

**Live demo:** https://foreman-ai-mitch.fly.dev *(replace with your URL)*
```

```bash
git add README.md
git commit -m "docs: add live deployment URL to README"
```
