# SIRET Extractor API - Production Docker Image
# Python 3.11 slim base image
FROM python:3.11-slim

# Metadata
LABEL maintainer="SIRET Extractor Team"
LABEL version="1.0.0"
LABEL description="SIRET/SIREN/TVA Extractor API"

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Set working directory
WORKDIR /app

# Install system dependencies required for Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    # Playwright dependencies
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
    libatspi2.0-0 \
    libxshmfence1 \
    # Additional useful tools
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright and browsers
RUN playwright install chromium && \
    playwright install-deps chromium

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /ms-playwright

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default environment variables (can be overridden)
ENV API_HOST=0.0.0.0 \
    API_PORT=8000 \
    API_WORKERS=4 \
    DEBUG=False \
    HEADLESS=True \
    BROWSER_TYPE=chromium \
    MAX_CONCURRENT_WORKERS=10

# Run the application with Uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host ${API_HOST} --port ${API_PORT} --workers ${API_WORKERS}"]
