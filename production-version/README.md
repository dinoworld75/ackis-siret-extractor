# SIRET Extractor API

Production-ready FastAPI service for extracting SIRET, SIREN, and TVA numbers from French company websites using Playwright.

## Features

- Fast async web scraping with Playwright
- Worker pool for concurrent processing
- Proxy rotation support
- Luhn algorithm validation for SIRET/SIREN
- Rate limiting and retry mechanisms
- RESTful API with FastAPI
- Production-ready error handling

## Installation

### Prerequisites

- Python 3.9+
- pip

### Setup

1. Clone the repository and navigate to the production version:

```bash
cd production-version
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Install Playwright browsers:

```bash
playwright install chromium
```

5. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Edit the `.env` file to configure:

- **API Settings**: Host, port, workers
- **Scraper Settings**: Concurrent workers, timeouts
- **Proxy Settings**: Proxy list, rotation
- **Rate Limiting**: Request limits
- **Browser Settings**: Headless mode, browser type

## Usage

### Start the API server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

For production:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### API Endpoints

#### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

#### Extract Single URL

```bash
POST /api/extract
Content-Type: application/json

{
  "url": "https://example.fr"
}
```

Response:
```json
{
  "url": "https://example.fr",
  "siret": "12345678901234",
  "siren": "123456789",
  "tva": "FR12345678901",
  "success": true,
  "error": null,
  "processing_time": 1.234
}
```

#### Extract Multiple URLs

```bash
POST /api/extract/batch
Content-Type: application/json

{
  "urls": [
    "https://example1.fr",
    "https://example2.fr"
  ]
}
```

Response:
```json
{
  "results": [
    {
      "url": "https://example1.fr",
      "siret": "12345678901234",
      "siren": "123456789",
      "tva": "FR12345678901",
      "success": true,
      "error": null,
      "processing_time": 1.234
    },
    {
      "url": "https://example2.fr",
      "siret": null,
      "siren": null,
      "tva": null,
      "success": false,
      "error": "No valid identifiers found",
      "processing_time": 0.856
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

## Architecture

```
production-version/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management
│   ├── models.py            # Pydantic models
│   ├── scraper/             # Scraping logic
│   │   ├── playwright_scraper.py  # Playwright scraper
│   │   ├── worker_pool.py         # Worker pool manager
│   │   ├── proxy_manager.py       # Proxy rotation
│   │   ├── extractors.py          # SIRET/SIREN/TVA extraction
│   │   └── validators.py          # Luhn validation
│   └── api/                 # API routes
│       └── routes.py        # API endpoints
├── tests/                   # Unit tests
└── requirements.txt         # Python dependencies
```

## Development

### Run Tests

```bash
pytest tests/
```

### Code Style

```bash
# Install dev dependencies
pip install black flake8 mypy

# Format code
black app/ tests/

# Lint
flake8 app/ tests/

# Type check
mypy app/
```

## Production Deployment

### Docker (Recommended)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Systemd Service

Create `/etc/systemd/system/siret-extractor.service`:

```ini
[Unit]
Description=SIRET Extractor API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/production-version
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

## Performance Tips

1. **Use proxy rotation** to avoid rate limiting
2. **Adjust MAX_CONCURRENT_WORKERS** based on your server capacity
3. **Enable caching** for frequently accessed URLs
4. **Use headless mode** in production for better performance
5. **Monitor memory usage** with worker pools

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
