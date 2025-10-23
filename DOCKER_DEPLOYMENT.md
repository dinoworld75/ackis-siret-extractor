# SIRET Extractor - Deployment Guide

Complete guide for deploying the SIRET Extractor application using Docker and Docker Compose.

## Table of Contents

1. [Docker Deployment (Local/Server)](#docker-deployment-localserver)
2. [Coolify Deployment](#coolify-deployment)
3. [Environment Variables](#environment-variables)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring](#monitoring)

---

## Docker Deployment (Local/Server)

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM available
- 10GB+ disk space

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ackis-siret-extractor-1

# Build Docker images
./build-docker.sh

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Access

Once services are running:

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost/health

### Service Architecture

```
                    ┌─────────────────┐
                    │   User Browser  │
                    └────────┬────────┘
                             │
                             │ Port 80
                             ▼
                    ┌─────────────────┐
                    │    Frontend     │
                    │  (Nginx + SPA)  │
                    └────────┬────────┘
                             │
                             │ /api/* → backend:8000
                             ▼
                    ┌─────────────────┐
                    │    Backend      │
                    │  (FastAPI)      │
                    └─────────────────┘
```

### Docker Commands

#### Build Commands

```bash
# Build all images
./build-docker.sh

# Build backend only
docker build -t siret-extractor-backend:latest .

# Build frontend only
cd frontend
docker build -t siret-extractor-frontend:latest .
```

#### Service Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Stop and remove volumes
docker-compose down -v

# Force rebuild
docker-compose up -d --build
```

#### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100

# Check container status
docker-compose ps
```

#### Inspect Services

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend health
curl http://localhost/health

# Inspect backend container
docker exec -it siret-extractor-backend sh

# Inspect frontend container
docker exec -it siret-extractor-frontend sh
```

### Configuration

#### docker-compose.yml

The main orchestration file located at the root of the project:

```yaml
services:
  backend:
    - Builds from root Dockerfile
    - Exposes port 8000
    - Health check: /health endpoint
    - Resource limits: 2GB RAM, 2 CPUs

  frontend:
    - Builds from frontend/Dockerfile
    - Exposes port 80
    - Depends on backend health
    - Proxies /api/* to backend
```

#### Frontend Dockerfile

Multi-stage build:
1. **Builder stage**: Node 20 Alpine, pnpm, build production bundle
2. **Production stage**: Nginx Alpine, serve static files, proxy API

#### Backend Dockerfile

Single-stage build:
- Python 3.11 slim
- Playwright with Chromium browser
- FastAPI + Uvicorn
- Non-root user for security

---

## Coolify Deployment

### Prerequisites

- Coolify instance running
- GitHub repository access
- Domain names configured (optional but recommended)

### Step 1: Create New Project

1. Log in to Coolify dashboard
2. Navigate to Projects
3. Click "Create New Project"
4. Name: "SIRET Extractor"

### Step 2: Add Backend Service

1. **Create New Resource** → Docker Compose
2. **Source Configuration:**
   - Source: GitHub repository
   - Repository URL: `<your-repo-url>`
   - Branch: `main`
   - Build Pack: Dockerfile
   - Dockerfile Path: `./Dockerfile`

3. **Service Configuration:**
   - Service Name: `siret-backend`
   - Port: `8000`
   - Health Check Path: `/health`
   - Health Check Interval: 30s

4. **Environment Variables:**
   ```bash
   API_HOST=0.0.0.0
   API_PORT=8000
   API_WORKERS=4
   DEBUG=False
   HEADLESS=True
   BROWSER_TYPE=chromium
   MAX_CONCURRENT_WORKERS=10
   ```

5. **Resource Limits:**
   - CPU: 2 cores
   - Memory: 2GB
   - Storage: 10GB

### Step 3: Add Frontend Service

1. **Create New Resource** → Docker Compose
2. **Source Configuration:**
   - Source: Same GitHub repository
   - Branch: `main`
   - Working Directory: `frontend`
   - Build Pack: Dockerfile
   - Dockerfile Path: `./frontend/Dockerfile`

3. **Service Configuration:**
   - Service Name: `siret-frontend`
   - Port: `80`
   - Health Check Path: `/health`
   - Health Check Interval: 30s
   - Depends On: `siret-backend`

4. **Environment Variables:**
   ```bash
   # For internal communication (if same network)
   VITE_API_BASE_URL=http://siret-backend:8000

   # OR for external communication (if different domains)
   VITE_API_BASE_URL=https://api.your-domain.com
   ```

### Step 4: Configure Domains

#### Option A: Separate Domains (Recommended)

- Frontend: `https://siret.your-domain.com`
- Backend: `https://api-siret.your-domain.com`

In Coolify:
1. Go to frontend service → Domains
2. Add domain: `siret.your-domain.com`
3. Enable HTTPS/SSL
4. Go to backend service → Domains
5. Add domain: `api-siret.your-domain.com`
6. Enable HTTPS/SSL

Update frontend environment:
```bash
VITE_API_BASE_URL=https://api-siret.your-domain.com
```

#### Option B: Single Domain with Path

- Frontend: `https://your-domain.com`
- Backend: `https://your-domain.com/api`

Requires custom Nginx configuration in Coolify.

### Step 5: Deploy

1. Click "Deploy" on both services
2. Wait for build completion (5-10 minutes)
3. Check logs for any errors
4. Verify health checks are passing

### Step 6: Verify Deployment

```bash
# Check frontend
curl https://siret.your-domain.com/health

# Check backend
curl https://api-siret.your-domain.com/health

# Test API
curl https://api-siret.your-domain.com/docs
```

---

## Environment Variables

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_HOST` | `0.0.0.0` | Host to bind the API |
| `API_PORT` | `8000` | Port for the API |
| `API_WORKERS` | `4` | Number of Uvicorn workers |
| `DEBUG` | `False` | Enable debug mode |
| `HEADLESS` | `True` | Run browser in headless mode |
| `BROWSER_TYPE` | `chromium` | Browser to use (chromium/firefox/webkit) |
| `MAX_CONCURRENT_WORKERS` | `10` | Max concurrent scraping tasks |
| `REQUEST_TIMEOUT` | `30000` | Request timeout in milliseconds |
| `NAVIGATION_TIMEOUT` | `60000` | Navigation timeout in milliseconds |
| `PAGE_LOAD_TIMEOUT` | `30000` | Page load timeout in milliseconds |
| `PROXY_ROTATION_ENABLED` | `False` | Enable proxy rotation |
| `PROXY_LIST` | `` | Comma-separated list of proxies |
| `RATE_LIMIT_REQUESTS` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW` | `60` | Rate limit window in seconds |
| `MAX_RETRIES` | `3` | Max retry attempts |
| `RETRY_DELAY` | `2` | Delay between retries in seconds |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_MAX_FILE_SIZE` | `10485760` | Max file upload size (10MB) |
| `VITE_BATCH_SIZE` | `100` | URLs per batch request |

### Environment Files

#### Development (.env)

```bash
# Backend
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
HEADLESS=False

# Frontend (frontend/.env)
VITE_API_BASE_URL=http://localhost:8000
```

#### Docker (.env)

```bash
# Backend
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False
HEADLESS=True

# Frontend (frontend/.env)
VITE_API_BASE_URL=http://backend:8000
```

#### Production (.env)

```bash
# Backend
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=8
DEBUG=False
HEADLESS=True
MAX_CONCURRENT_WORKERS=20

# Frontend (frontend/.env)
VITE_API_BASE_URL=https://api.your-domain.com
```

---

## Troubleshooting

### Frontend Can't Connect to Backend

**Symptoms:**
- Network errors in browser console
- "Failed to fetch" errors
- CORS errors

**Solutions:**

1. Check backend is running:
   ```bash
   docker-compose ps
   curl http://localhost:8000/health
   ```

2. Verify API URL in frontend:
   ```bash
   # Check frontend environment
   docker exec siret-extractor-frontend sh -c "cat /etc/nginx/conf.d/default.conf"
   ```

3. Check Docker network:
   ```bash
   docker network inspect ackis-siret-extractor-1_siret-network
   ```

4. Verify CORS settings in backend (should allow all origins in development)

### File Upload Fails

**Symptoms:**
- 413 Payload Too Large
- Upload stops at certain percentage

**Solutions:**

1. Increase Nginx client_max_body_size:
   ```nginx
   # In frontend/nginx.conf
   client_max_body_size 20M;
   ```

2. Rebuild frontend:
   ```bash
   docker-compose up -d --build frontend
   ```

3. Check file size limits:
   ```bash
   # Frontend environment
   VITE_MAX_FILE_SIZE=10485760  # 10MB
   ```

### Backend Processing Timeout

**Symptoms:**
- 504 Gateway Timeout
- Processing stops mid-batch

**Solutions:**

1. Increase Nginx proxy timeouts (already set to 300s in nginx.conf)

2. Reduce batch size:
   ```bash
   # frontend/.env
   VITE_BATCH_SIZE=50  # Reduce from 100
   ```

3. Increase backend workers:
   ```bash
   # docker-compose.yml
   API_WORKERS=8
   ```

### Container Memory Issues

**Symptoms:**
- Container restarts frequently
- OOM (Out of Memory) errors

**Solutions:**

1. Increase Docker memory limits:
   ```yaml
   # docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G
   ```

2. Reduce concurrent workers:
   ```bash
   MAX_CONCURRENT_WORKERS=5
   ```

3. Monitor memory usage:
   ```bash
   docker stats
   ```

### Browser/Playwright Issues

**Symptoms:**
- "Browser not found" errors
- Chromium launch failures

**Solutions:**

1. Reinstall Playwright browsers:
   ```bash
   docker exec siret-extractor-backend playwright install chromium
   ```

2. Check browser dependencies:
   ```bash
   docker exec siret-extractor-backend playwright install-deps chromium
   ```

3. Verify Playwright path:
   ```bash
   docker exec siret-extractor-backend env | grep PLAYWRIGHT
   ```

### Logs and Debugging

```bash
# Enable debug logging
# docker-compose.yml
environment:
  - DEBUG=True
  - LOG_LEVEL=DEBUG

# Restart with debug
docker-compose up -d

# View detailed logs
docker-compose logs -f --tail=1000

# Check specific container logs
docker logs siret-extractor-backend -f
docker logs siret-extractor-frontend -f

# Inspect container
docker exec -it siret-extractor-backend sh
docker exec -it siret-extractor-frontend sh
```

---

## Monitoring

### Docker Stats

```bash
# Real-time resource usage
docker stats

# Specific container
docker stats siret-extractor-backend
```

### Health Checks

```bash
# Frontend health
curl http://localhost/health

# Backend health
curl http://localhost:8000/health

# Full backend status (includes API info)
curl http://localhost:8000/docs
```

### Logs Monitoring

```bash
# Follow all logs
docker-compose logs -f

# Search logs for errors
docker-compose logs | grep -i error

# Count errors
docker-compose logs | grep -i error | wc -l

# Backend errors only
docker-compose logs backend | grep -i error
```

### Coolify Monitoring

In Coolify dashboard:

1. **Resource Usage:**
   - CPU usage graph
   - Memory usage graph
   - Network I/O
   - Disk usage

2. **Service Health:**
   - Health check status
   - Uptime percentage
   - Response times

3. **Alerts:**
   - Configure alerts for:
     - Service downtime
     - High CPU usage (>80%)
     - High memory usage (>90%)
     - Health check failures

4. **Logs:**
   - Real-time log streaming
   - Log search and filtering
   - Export logs for analysis

### Prometheus/Grafana (Advanced)

For production monitoring:

```yaml
# docker-compose.yml - Add monitoring services
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## Backup and Recovery

### Database/Storage Backup

```bash
# No persistent database required
# History stored in browser IndexedDB

# Backup logs
docker cp siret-extractor-backend:/app/logs ./backup/logs-$(date +%Y%m%d)
```

### Configuration Backup

```bash
# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  .env \
  frontend/.env \
  frontend/nginx.conf
```

### Image Backup

```bash
# Save Docker images
docker save siret-extractor-backend:latest | gzip > backend-image.tar.gz
docker save siret-extractor-frontend:latest | gzip > frontend-image.tar.gz

# Restore Docker images
docker load < backend-image.tar.gz
docker load < frontend-image.tar.gz
```

---

## Security Best Practices

1. **Use HTTPS in Production:**
   - Configure SSL certificates in Nginx or Coolify
   - Redirect HTTP to HTTPS

2. **Environment Variables:**
   - Never commit .env files to Git
   - Use secrets management in production
   - Rotate credentials regularly

3. **Network Security:**
   - Use private Docker networks
   - Expose only necessary ports
   - Configure firewall rules

4. **Container Security:**
   - Run as non-root user (already configured)
   - Keep images updated
   - Scan for vulnerabilities

5. **Rate Limiting:**
   - Configure backend rate limits
   - Use Nginx rate limiting if needed

---

## Performance Optimization

### Backend Optimization

```yaml
# Increase workers for high load
API_WORKERS=8

# Adjust concurrent workers
MAX_CONCURRENT_WORKERS=20

# Optimize timeouts
REQUEST_TIMEOUT=20000
NAVIGATION_TIMEOUT=45000
```

### Frontend Optimization

```nginx
# Enable compression (already configured)
gzip on;
gzip_types text/plain text/css application/javascript;

# Cache static assets (already configured)
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Docker Optimization

```yaml
# Use build cache
docker-compose build --parallel

# Optimize image size (already using Alpine)
# Multi-stage builds (already implemented)
```

---

## Scaling

### Horizontal Scaling

Use Docker Swarm or Kubernetes:

```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.yml siret

# Scale services
docker service scale siret_backend=3
docker service scale siret_frontend=2
```

### Load Balancing

Use Nginx or Traefik as reverse proxy:

```nginx
upstream backend {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

upstream frontend {
    server frontend1:80;
    server frontend2:80;
}
```

---

## Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
./build-docker.sh

# Restart services
docker-compose up -d --build

# Verify
docker-compose ps
docker-compose logs -f
```

### Update Dependencies

```bash
# Backend
pip freeze > requirements.txt
docker-compose build backend

# Frontend
cd frontend
pnpm update
docker-compose build frontend
```

### Rollback

```bash
# Stop current version
docker-compose down

# Revert code
git checkout <previous-commit>

# Rebuild and restart
docker-compose up -d --build
```

---

## Support

For issues and questions:

- GitHub Issues: `<repository-url>/issues`
- Documentation: See README.md
- API Docs: http://localhost:8000/docs

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
