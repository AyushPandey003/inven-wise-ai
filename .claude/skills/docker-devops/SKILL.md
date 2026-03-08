---
name: docker-devops
description: Provides expert Docker, Kubernetes, CI/CD, and infrastructure-as-code guidance. Use when user asks about "Dockerfile", "docker-compose", "kubernetes", "k8s", "CI/CD pipeline", "GitHub Actions", "deployment", "container", "helm chart", "infrastructure", "IaC", "terraform", "scaling", or needs to set up or optimize their deployment pipeline and container infrastructure.
metadata:
  author: Senior Dev Skills Suite
  version: 1.0.0
  category: devops
  tags: [docker, kubernetes, ci-cd, github-actions, terraform, devops, containers]
---

# Docker & DevOps Skill

Production infrastructure is code. Treat it with the same rigor: review it, test it, version it, and document it.

## Dockerfile Best Practices

### Multi-Stage Build (Node.js example)
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production image (minimal)
FROM node:20-alpine AS runner
WORKDIR /app

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER appuser

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Critical Dockerfile Rules
- Always pin base image versions: `node:20.11-alpine3.19` not `node:latest`
- Never run as root in production
- Always include HEALTHCHECK
- Use `.dockerignore` (see below)
- One process per container
- Build args for env-specific config, ENV vars for runtime config

### .dockerignore
```
node_modules
.git
.env*
*.md
coverage/
dist/
.DS_Store
Dockerfile*
docker-compose*
```

---

## docker-compose.yml (Development)

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      target: builder   # Use dev stage with devDeps
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules   # Don't mount over installed modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    command: npm run dev

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  postgres_data:
```

---

## GitHub Actions CI/CD

### Complete Pipeline
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  IMAGE_NAME: myapp
  REGISTRY: ghcr.io/${{ github.repository_owner }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - uses: codecov/codecov-action@v4

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Deploy to staging
        run: |
          # kubectl set image deployment/myapp myapp=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          echo "Deploy step here"

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production   # Requires manual approval in GitHub

    steps:
      - name: Deploy to production
        run: echo "Production deploy here"
```

---

## Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: ghcr.io/myorg/myapp:latest
          ports:
            - containerPort: 3000
          
          # Resource limits are REQUIRED in production
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          
          # Probes
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          
          # Secrets from k8s secrets (not env literals)
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
          
          # Security context
          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false

      # Spread across nodes for HA
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: myapp
```

---

## Health Check Endpoints (implement in your app)

```typescript
// /health/live — am I alive? (no external deps)
app.get('/health/live', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// /health/ready — can I serve traffic? (check deps)
app.get('/health/ready', async (req, res) => {
  try {
    await db.query('SELECT 1')
    await redis.ping()
    res.json({ status: 'ready' })
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message })
  }
})
```

---

## Secrets Management Rules

1. NEVER put secrets in Dockerfiles, docker-compose, or git
2. Development: use `.env` file (gitignored) + `.env.example` (committed)
3. CI/CD: use GitHub Actions Secrets or Vault
4. Production Kubernetes: use `kubectl create secret` or External Secrets Operator
5. Rotate secrets on: team member departure, suspected compromise, quarterly

---

## Resource Sizing Quick Reference

| Service Type | CPU Request | CPU Limit | Mem Request | Mem Limit |
|-------------|-------------|-----------|-------------|-----------|
| Node.js API | 100m | 500m | 128Mi | 512Mi |
| Python API | 100m | 500m | 256Mi | 1Gi |
| Worker (async) | 50m | 250m | 128Mi | 256Mi |
| ML inference | 500m | 2000m | 512Mi | 4Gi |

Start conservative, then tune based on actual metrics. Set alerts on >80% of limits.
