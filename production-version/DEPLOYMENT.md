# SIRET Extractor API - Production Deployment Guide

Version: 1.0.0

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Environment Variables](#environment-variables)
4. [Running the Server](#running-the-server)
5. [Docker Deployment](#docker-deployment)
6. [Systemd Service](#systemd-service)
7. [Nginx Reverse Proxy](#nginx-reverse-proxy)
8. [Health Checks & Monitoring](#health-checks--monitoring)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 2 GB
- Disk: 2 GB free space

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 4+ GB
- Disk: 10 GB free space
- SSD storage for better I/O performance

### Software Requirements

- **Operating System**: Linux (Ubuntu 20.04+, Debian 10+, CentOS 8+) or macOS
- **Python**: 3.9 or higher
- **pip**: Latest version
- **System Dependencies**:
  - libglib2.0-0
  - libnss3
  - libnspr4
  - libdbus-1-3
  - libatk1.0-0
  - libatk-bridge2.0-0
  - libcups2
  - libdrm2
  - libxkbcommon0
  - libxcomposite1
  - libxdamage1
  - libxfixes3
  - libxrandr2
  - libgbm1
  - libpango-1.0-0
  - libcairo2
  - libasound2

### Network Requirements

- Outbound HTTPS (443) access for web scraping
- Inbound access on configured API port (default: 8000)
- DNS resolution capability

---

## Installation

### Step 1: System Dependencies

#### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2
```

#### CentOS/RHEL

```bash
sudo yum install -y \
    python3 \
    python3-pip \
    glib2 \
    nss \
    nspr \
    dbus-libs \
    atk \
    at-spi2-atk \
    cups-libs \
    libdrm \
    libxkbcommon \
    libXcomposite \
    libXdamage \
    libXfixes \
    libXrandr \
    mesa-libgbm \
    pango \
    cairo \
    alsa-lib
```

#### macOS

```bash
brew install python@3.9
```

### Step 2: Clone Repository

```bash
cd /opt
sudo git clone <repository-url> siret-extractor
cd siret-extractor/production-version
sudo chown -R $USER:$USER .
```

### Step 3: Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 4: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**requirements.txt contents:**
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
playwright==1.41.0
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
aiohttp==3.9.1
asyncio==3.4.3
tenacity==8.2.3
```

### Step 5: Install Playwright Browsers

```bash
playwright install chromium
```

**Note**: This downloads Chromium browser binaries (~300MB). For production, install only required browser:

```bash
# For Chromium only (default)
playwright install chromium

# For Firefox
playwright install firefox

# For WebKit
playwright install webkit

# Install system dependencies (if needed)
playwright install-deps chromium
```

### Step 6: Verify Installation

```bash
python -c "from playwright.sync_api import sync_playwright; print('Playwright OK')"
python -c "import fastapi; print(f'FastAPI {fastapi.__version__} OK')"
```

---

## Environment Variables

### Configuration File

Create a `.env` file in the `production-version` directory:

```bash
cp .env.example .env
nano .env
```

### Complete Environment Variables Reference

```bash
# API Configuration
API_HOST=0.0.0.0                    # Server bind address (0.0.0.0 for all interfaces)
API_PORT=8000                       # Server port
API_WORKERS=4                       # Number of Uvicorn worker processes
DEBUG=False                         # Enable debug mode (True/False)

# Scraper Configuration
MAX_CONCURRENT_WORKERS=10           # Maximum concurrent scraping workers
REQUEST_TIMEOUT=30000               # HTTP request timeout in milliseconds
NAVIGATION_TIMEOUT=60000            # Page navigation timeout in milliseconds
PAGE_LOAD_TIMEOUT=30000             # Page load timeout in milliseconds

# Browser Configuration
HEADLESS=True                       # Run browser in headless mode (True/False)
BROWSER_TYPE=chromium               # Browser type (chromium/firefox/webkit)

# Proxy Configuration
PROXY_ROTATION_ENABLED=False        # Enable proxy rotation (True/False)
PROXY_LIST=                         # Comma-separated proxy list (e.g., "http://proxy1:8080,http://proxy2:8080")

# Rate Limiting
RATE_LIMIT_REQUESTS=100             # Number of requests allowed per window
RATE_LIMIT_WINDOW=60                # Rate limit time window in seconds

# Retry Configuration
MAX_RETRIES=3                       # Maximum number of retries for failed requests
RETRY_DELAY=2                       # Delay between retries in seconds
```

### Environment Variable Details

#### API Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `API_HOST` | string | `0.0.0.0` | Bind address. Use `0.0.0.0` for all interfaces, `127.0.0.1` for localhost only |
| `API_PORT` | integer | `8000` | Server port number |
| `API_WORKERS` | integer | `4` | Number of Uvicorn worker processes (recommended: CPU cores) |
| `DEBUG` | boolean | `False` | Enable debug mode with detailed error messages |

#### Scraper Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MAX_CONCURRENT_WORKERS` | integer | `10` | Maximum concurrent browser instances |
| `REQUEST_TIMEOUT` | integer | `30000` | HTTP request timeout (milliseconds) |
| `NAVIGATION_TIMEOUT` | integer | `60000` | Page navigation timeout (milliseconds) |
| `PAGE_LOAD_TIMEOUT` | integer | `30000` | Page load timeout (milliseconds) |

#### Browser Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HEADLESS` | boolean | `True` | Run browser without GUI (recommended for production) |
| `BROWSER_TYPE` | string | `chromium` | Browser engine: `chromium`, `firefox`, or `webkit` |

#### Proxy Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PROXY_ROTATION_ENABLED` | boolean | `True` | Enable rotating through proxy list |
| `PROXY_LIST` | string | `` | Comma-separated proxy URLs |

**Proxy List Example:**
```bash
PROXY_LIST=http://proxy1.example.com:8080,http://proxy2.example.com:8080,socks5://proxy3.example.com:1080
```

#### Rate Limiting

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RATE_LIMIT_REQUESTS` | integer | `100` | Requests allowed per time window |
| `RATE_LIMIT_WINDOW` | integer | `60` | Time window in seconds |

#### Retry Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MAX_RETRIES` | integer | `3` | Maximum retry attempts for failed requests |
| `RETRY_DELAY` | integer | `2` | Delay between retries (seconds) |

### Production Environment Example

```bash
# Production .env
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=8
DEBUG=False

MAX_CONCURRENT_WORKERS=20
REQUEST_TIMEOUT=30000
NAVIGATION_TIMEOUT=60000

HEADLESS=True
BROWSER_TYPE=chromium

PROXY_ROTATION_ENABLED=False
PROXY_LIST=

RATE_LIMIT_REQUESTS=200
RATE_LIMIT_WINDOW=60

MAX_RETRIES=3
RETRY_DELAY=2
```

---

## Running the Server

### Development Mode

For development with auto-reload:

```bash
# Activate virtual environment
source venv/bin/activate

# Run with uvicorn directly
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Or using the Python script:

```bash
# Set DEBUG mode
export DEBUG=True

# Run main.py
python -m app.main
```

### Production Mode (Direct)

For production without Docker:

```bash
# Activate virtual environment
source venv/bin/activate

# Set production environment
export DEBUG=False
export API_WORKERS=4

# Run with Uvicorn
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --no-access-log \
    --proxy-headers \
    --forwarded-allow-ips='*'
```

### Production Mode with Gunicorn

For better production performance, use Gunicorn with Uvicorn workers:

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --log-level info \
    --access-logfile - \
    --error-logfile -
```

### Running in Background

Using `nohup`:

```bash
nohup uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    > /var/log/siret-extractor.log 2>&1 &
```

Using `screen`:

```bash
screen -S siret-api
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
# Press Ctrl+A, then D to detach
# screen -r siret-api to reattach
```

### Stopping the Server

```bash
# Find process
ps aux | grep uvicorn

# Kill process
kill <PID>

# Or force kill
kill -9 <PID>
```

---

## Docker Deployment

### Dockerfile

The `Dockerfile` is included in the repository:

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### Build Docker Image

```bash
cd production-version

# Build image
docker build -t siret-extractor:1.0.0 .

# Tag as latest
docker tag siret-extractor:1.0.0 siret-extractor:latest
```

### Run Docker Container

```bash
# Basic run
docker run -d \
    --name siret-extractor \
    -p 8000:8000 \
    siret-extractor:latest

# Run with environment variables
docker run -d \
    --name siret-extractor \
    -p 8000:8000 \
    -e DEBUG=False \
    -e API_WORKERS=8 \
    -e MAX_CONCURRENT_WORKERS=20 \
    siret-extractor:latest

# Run with .env file
docker run -d \
    --name siret-extractor \
    -p 8000:8000 \
    --env-file .env \
    siret-extractor:latest

# Run with custom network
docker run -d \
    --name siret-extractor \
    --network=host \
    siret-extractor:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  siret-extractor:
    build: .
    container_name: siret-extractor
    ports:
      - "8000:8000"
    environment:
      - API_HOST=0.0.0.0
      - API_PORT=8000
      - API_WORKERS=4
      - DEBUG=False
      - MAX_CONCURRENT_WORKERS=20
      - HEADLESS=True
      - BROWSER_TYPE=chromium
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Run with Docker Compose:**

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart
```

### Docker Management Commands

```bash
# View running containers
docker ps

# View logs
docker logs siret-extractor
docker logs -f siret-extractor  # Follow logs

# Execute commands in container
docker exec -it siret-extractor bash

# Stop container
docker stop siret-extractor

# Start container
docker start siret-extractor

# Remove container
docker rm siret-extractor

# Remove image
docker rmi siret-extractor:latest
```

---

## Systemd Service

### Create Service File

Create `/etc/systemd/system/siret-extractor.service`:

```ini
[Unit]
Description=SIRET Extractor API Service
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/siret-extractor/production-version
Environment="PATH=/opt/siret-extractor/production-version/venv/bin"
EnvironmentFile=/opt/siret-extractor/production-version/.env
ExecStart=/opt/siret-extractor/production-version/venv/bin/uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --proxy-headers \
    --forwarded-allow-ips='*'

# Restart policy
Restart=always
RestartSec=10

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Security
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=siret-extractor

[Install]
WantedBy=multi-user.target
```

### Service Management

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable siret-extractor

# Start service
sudo systemctl start siret-extractor

# Check status
sudo systemctl status siret-extractor

# View logs
sudo journalctl -u siret-extractor -f

# Restart service
sudo systemctl restart siret-extractor

# Stop service
sudo systemctl stop siret-extractor

# Disable service
sudo systemctl disable siret-extractor
```

### Alternative: Using Gunicorn with Systemd

```ini
[Unit]
Description=SIRET Extractor API (Gunicorn)
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/siret-extractor/production-version
Environment="PATH=/opt/siret-extractor/production-version/venv/bin"
EnvironmentFile=/opt/siret-extractor/production-version/.env
ExecStart=/opt/siret-extractor/production-version/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Nginx Reverse Proxy

### Why Use Nginx?

- SSL/TLS termination
- Load balancing
- Static file serving
- Rate limiting
- Caching
- Better security

### Install Nginx

```bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

### Nginx Configuration

Create `/etc/nginx/sites-available/siret-extractor`:

```nginx
# Upstream backend
upstream siret_backend {
    # Multiple workers for load balancing
    server 127.0.0.1:8000 max_fails=3 fail_timeout=30s;
    # Add more workers if needed:
    # server 127.0.0.1:8001 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:8002 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/siret-extractor-access.log;
    error_log /var/log/nginx/siret-extractor-error.log;

    # Client settings
    client_max_body_size 10M;
    client_body_timeout 120s;

    # Proxy settings
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;

        # Proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Pass to backend
        proxy_pass http://siret_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    # Health check endpoint (no rate limit)
    location /health {
        proxy_pass http://siret_backend;
        proxy_set_header Host $host;
        access_log off;
    }

    # API documentation
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://siret_backend;
        proxy_set_header Host $host;
    }
}
```

### Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/siret-extractor /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

### SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

### Load Balancing Multiple Workers

If running multiple Uvicorn instances:

```nginx
upstream siret_backend {
    least_conn;  # Use least connections algorithm

    server 127.0.0.1:8000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8002 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8003 weight=1 max_fails=3 fail_timeout=30s;

    keepalive 64;
}
```

---

## Health Checks & Monitoring

### Health Check Endpoint

The API provides a health check endpoint:

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Monitoring Script

Create `/opt/siret-extractor/health-check.sh`:

```bash
#!/bin/bash

# Health check script
URL="http://localhost:8000/health"
TIMEOUT=10

# Make request
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json --max-time $TIMEOUT "$URL")
HTTP_CODE=${RESPONSE: -3}

# Check status code
if [ "$HTTP_CODE" = "200" ]; then
    STATUS=$(cat /tmp/health_response.json | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")

    if [ "$STATUS" = "healthy" ]; then
        echo "OK: Service is healthy"
        exit 0
    else
        echo "CRITICAL: Service status is $STATUS"
        exit 2
    fi
else
    echo "CRITICAL: HTTP $HTTP_CODE"
    exit 2
fi
```

Make executable:
```bash
chmod +x /opt/siret-extractor/health-check.sh
```

### Cron Health Checks

Add to crontab:

```bash
# Check every 5 minutes
*/5 * * * * /opt/siret-extractor/health-check.sh >> /var/log/siret-health.log 2>&1
```

### Prometheus Metrics (Optional)

Install `prometheus-fastapi-instrumentator`:

```bash
pip install prometheus-fastapi-instrumentator
```

Add to `app/main.py`:

```python
from prometheus_fastapi_instrumentator import Instrumentator

# After app creation
Instrumentator().instrument(app).expose(app)
```

Metrics available at: `http://localhost:8000/metrics`

### Logging

Configure logging in production:

```python
# app/logging_config.py
import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('/var/log/siret-extractor/app.log')
        ]
    )
```

### Log Rotation

Create `/etc/logrotate.d/siret-extractor`:

```
/var/log/siret-extractor/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload siret-extractor > /dev/null 2>&1 || true
    endscript
}
```

---

## Performance Tuning

### Uvicorn Workers

Recommended formula: `(2 x CPU_CORES) + 1`

```bash
# For 4-core CPU
API_WORKERS=9

# For 8-core CPU
API_WORKERS=17
```

### Concurrent Workers

Adjust based on RAM and load:

```bash
# Low RAM (2GB)
MAX_CONCURRENT_WORKERS=5

# Medium RAM (4GB)
MAX_CONCURRENT_WORKERS=10

# High RAM (8GB+)
MAX_CONCURRENT_WORKERS=20
```

### Timeout Configuration

Adjust timeouts based on target websites:

```bash
# Fast websites
REQUEST_TIMEOUT=15000
NAVIGATION_TIMEOUT=30000

# Slow websites
REQUEST_TIMEOUT=45000
NAVIGATION_TIMEOUT=90000
```

### Browser Pool Optimization

Reuse browser instances:

```bash
# Keep browser instances alive
BROWSER_POOL_SIZE=5
BROWSER_POOL_TIMEOUT=300  # 5 minutes
```

### System Limits

Increase file descriptor limits:

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

### Kernel Parameters

Optimize for high concurrent connections:

```bash
# /etc/sysctl.conf
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
```

Apply:
```bash
sudo sysctl -p
```

### Memory Management

Monitor and optimize memory:

```bash
# Check memory usage
free -h
docker stats  # For Docker deployments

# Python memory profiling
pip install memory-profiler
```

### Database Caching (Optional)

For frequently accessed URLs, implement Redis caching:

```bash
# Install Redis
sudo apt-get install redis-server

# Install Python client
pip install redis
```

---

## Troubleshooting

### Common Issues

#### 1. Playwright Installation Fails

**Problem**: Playwright browser download fails

**Solution**:
```bash
# Manual browser installation
playwright install chromium

# Install system dependencies
playwright install-deps chromium

# Use specific version
pip install playwright==1.41.0
playwright install chromium
```

#### 2. Permission Denied Errors

**Problem**: `/root/.cache/ms-playwright` permission denied

**Solution**:
```bash
# Set correct permissions
sudo chown -R $USER:$USER ~/.cache/ms-playwright

# Or set PLAYWRIGHT_BROWSERS_PATH
export PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
```

#### 3. Port Already in Use

**Problem**: `Address already in use`

**Solution**:
```bash
# Find process using port
sudo lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
uvicorn app.main:app --port 8001
```

#### 4. Browser Launch Timeout

**Problem**: Browser fails to launch

**Solution**:
```bash
# Increase timeout
export PLAYWRIGHT_TIMEOUT=60000

# Check system dependencies
playwright install-deps

# Check available memory
free -h
```

#### 5. Memory Issues

**Problem**: Out of memory errors

**Solution**:
```bash
# Reduce concurrent workers
MAX_CONCURRENT_WORKERS=5

# Reduce API workers
API_WORKERS=2

# Monitor memory
watch -n 1 free -h
```

#### 6. Slow Performance

**Problem**: API responds slowly

**Solution**:
```bash
# Enable caching
# Increase workers
API_WORKERS=8
MAX_CONCURRENT_WORKERS=15

# Use faster browser
BROWSER_TYPE=chromium

# Reduce timeouts
NAVIGATION_TIMEOUT=30000
```

#### 7. SSL Certificate Issues

**Problem**: SSL verification fails

**Solution**:
```bash
# Update CA certificates
sudo update-ca-certificates

# Install certifi
pip install --upgrade certifi

# Disable SSL verification (not recommended)
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

### Debug Mode

Enable detailed logging:

```bash
# Enable debug mode
export DEBUG=True
export PLAYWRIGHT_DEBUG=1

# Run with verbose logging
uvicorn app.main:app --log-level debug
```

### Testing Endpoints

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test extraction
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.fr"}'

# Check API docs
curl http://localhost:8000/docs
```

### Log Analysis

```bash
# View systemd logs
sudo journalctl -u siret-extractor -f

# View Nginx logs
sudo tail -f /var/log/nginx/siret-extractor-error.log
sudo tail -f /var/log/nginx/siret-extractor-access.log

# Search for errors
sudo journalctl -u siret-extractor | grep ERROR
```

### Performance Profiling

```bash
# Install profiling tools
pip install py-spy

# Profile running process
py-spy top --pid <PID>

# Generate flamegraph
py-spy record -o profile.svg --pid <PID>
```

### Docker Issues

```bash
# View container logs
docker logs siret-extractor

# Check container health
docker inspect siret-extractor | grep Health

# Access container shell
docker exec -it siret-extractor bash

# Rebuild image
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Security Checklist

- [ ] Change default ports if needed
- [ ] Configure firewall (UFW/iptables)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Implement API authentication
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Run as non-root user
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Regular security audits
- [ ] Backup configuration files
- [ ] Use environment variables for secrets
- [ ] Disable debug mode in production
- [ ] Implement IP whitelisting if needed

---

## Backup & Recovery

### Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/siret-extractor"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup files
tar -czf "$BACKUP_DIR/siret-extractor-$DATE.tar.gz" \
    /opt/siret-extractor/production-version \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc'

# Keep only last 7 backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/siret-extractor-$DATE.tar.gz"
```

### Restore

```bash
# Extract backup
tar -xzf siret-extractor-20251023_120000.tar.gz -C /

# Reinstall dependencies
cd /opt/siret-extractor/production-version
source venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Restart service
sudo systemctl restart siret-extractor
```

---

## Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Check logs for errors
- Monitor disk space
- Review performance metrics

**Monthly:**
- Update Python packages
- Update system packages
- Review security advisories
- Rotate logs

**Quarterly:**
- Full backup
- Performance audit
- Security audit
- Capacity planning

### Update Dependencies

```bash
# Activate virtualenv
source venv/bin/activate

# Update packages
pip install --upgrade pip
pip install --upgrade -r requirements.txt

# Update Playwright
playwright install chromium

# Test after update
python -m pytest tests/

# Restart service
sudo systemctl restart siret-extractor
```

---

**Last Updated:** 2025-10-23
**Version:** 1.0.0
