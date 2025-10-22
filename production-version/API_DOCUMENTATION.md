# SIRET Extractor API Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Base URL and Authentication](#base-url-and-authentication)
3. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Single URL Extraction](#single-url-extraction)
   - [Batch URL Extraction](#batch-url-extraction)
4. [Request/Response Schemas](#requestresponse-schemas)
5. [Error Codes and Handling](#error-codes-and-handling)
6. [Rate Limiting](#rate-limiting)
7. [Client Examples](#client-examples)
   - [cURL Examples](#curl-examples)
   - [Python Client](#python-client-example)
   - [JavaScript/Node.js Client](#javascriptnodejs-client-example)

---

## API Overview

The SIRET Extractor API is a production-ready FastAPI service designed to extract French company identifiers (SIRET, SIREN, and TVA numbers) from company websites. The API uses Playwright for intelligent web scraping, targeting legal pages and footer sections where these identifiers are typically displayed.

**Key Features:**
- Asynchronous web scraping with Playwright
- Concurrent processing for batch requests
- Luhn algorithm validation for SIRET/SIREN numbers
- Support for proxy rotation
- Comprehensive error handling
- OpenAPI/Swagger documentation

**What Each Identifier Represents:**
- **SIRET**: 14-digit unique establishment identifier (business location)
- **SIREN**: 9-digit unique company identifier (first 9 digits of SIRET)
- **TVA**: French VAT number (FR + 11 digits)

---

## Base URL and Authentication

### Base URL

```
http://localhost:8000
```

For production deployments, replace with your actual domain:
```
https://api.yourdomain.com
```

### Authentication

The current version does not require authentication. All endpoints are publicly accessible.

**Note:** For production deployments, it is recommended to implement:
- API key authentication
- JWT tokens
- IP whitelisting
- OAuth 2.0

### CORS Policy

The API accepts requests from all origins (`*`). In production, configure specific allowed origins in the CORS middleware settings.

---

## Endpoints

### Health Check

Check the API service status and version.

**Endpoint:** `GET /health`

**Tags:** `Health`

#### Request

No request body required.

#### Response

**Status Code:** `200 OK`

**Response Schema:**

```json
{
  "status": "string",
  "version": "string"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Service status (e.g., "healthy") |
| `version` | string | API version number |

#### Example Response

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

### Single URL Extraction

Extract SIRET, SIREN, and TVA numbers from a single URL.

**Endpoint:** `POST /api/extract`

**Tags:** `Extraction`

#### Request

**Content-Type:** `application/json`

**Request Schema:**

```json
{
  "url": "string (HttpUrl)"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | HttpUrl | Yes | Valid HTTP/HTTPS URL to scrape |

**Validation Rules:**
- URL must be a valid HTTP or HTTPS URL
- URL must include protocol (http:// or https://)

#### Request Example

```json
{
  "url": "https://www.legifrance.gouv.fr"
}
```

#### Response

**Status Code:** `200 OK`

**Response Schema:**

```json
{
  "url": "string",
  "siret": "string | null",
  "siren": "string | null",
  "tva": "string | null",
  "success": "boolean",
  "error": "string | null",
  "processing_time": "number"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | The URL that was processed |
| `siret` | string \| null | Extracted SIRET number (14 digits), or null if not found |
| `siren` | string \| null | Extracted SIREN number (9 digits), or null if not found |
| `tva` | string \| null | Extracted TVA number (FR + 11 digits), or null if not found |
| `success` | boolean | `true` if at least one identifier was found, `false` otherwise |
| `error` | string \| null | Error message if extraction failed, null otherwise |
| `processing_time` | number | Processing time in seconds (rounded to 3 decimal places) |

#### Success Response Example

```json
{
  "url": "https://www.legifrance.gouv.fr",
  "siret": "13002603200013",
  "siren": "130026032",
  "tva": "FR26130026032",
  "success": true,
  "error": null,
  "processing_time": 2.145
}
```

#### No Identifiers Found Example

```json
{
  "url": "https://example.com",
  "siret": null,
  "siren": null,
  "tva": null,
  "success": false,
  "error": "No valid identifiers found",
  "processing_time": 1.823
}
```

#### Error Response Example

```json
{
  "url": "https://nonexistent-domain-xyz.fr",
  "siret": null,
  "siren": null,
  "tva": null,
  "success": false,
  "error": "Navigation timeout of 60000 ms exceeded",
  "processing_time": 60.012
}
```

---

### Batch URL Extraction

Extract SIRET, SIREN, and TVA numbers from multiple URLs concurrently.

**Endpoint:** `POST /api/extract/batch`

**Tags:** `Extraction`

#### Request

**Content-Type:** `application/json`

**Request Schema:**

```json
{
  "urls": ["string (HttpUrl)"]
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `urls` | Array<HttpUrl> | Yes | List of valid HTTP/HTTPS URLs to scrape |

**Validation Rules:**
- Minimum 1 URL required
- Maximum 100 URLs per request
- All URLs must be valid HTTP or HTTPS URLs
- URLs must be unique (no duplicates)

#### Request Example

```json
{
  "urls": [
    "https://www.legifrance.gouv.fr",
    "https://www.service-public.fr",
    "https://www.example.com"
  ]
}
```

#### Response

**Status Code:** `200 OK`

**Response Schema:**

```json
{
  "results": [
    {
      "url": "string",
      "siret": "string | null",
      "siren": "string | null",
      "tva": "string | null",
      "success": "boolean",
      "error": "string | null",
      "processing_time": "number"
    }
  ],
  "total": "number",
  "successful": "number",
  "failed": "number"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `results` | Array<ExtractionResult> | List of extraction results, one per URL |
| `total` | number | Total number of URLs processed |
| `successful` | number | Number of URLs where at least one identifier was found |
| `failed` | number | Number of URLs where no identifiers were found or errors occurred |

#### Response Example

```json
{
  "results": [
    {
      "url": "https://www.legifrance.gouv.fr",
      "siret": "13002603200013",
      "siren": "130026032",
      "tva": "FR26130026032",
      "success": true,
      "error": null,
      "processing_time": 2.145
    },
    {
      "url": "https://www.service-public.fr",
      "siret": "13002526200013",
      "siren": "130025262",
      "tva": "FR81130025262",
      "success": true,
      "error": null,
      "processing_time": 1.892
    },
    {
      "url": "https://www.example.com",
      "siret": null,
      "siren": null,
      "tva": null,
      "success": false,
      "error": "No valid identifiers found",
      "processing_time": 1.534
    }
  ],
  "total": 3,
  "successful": 2,
  "failed": 1
}
```

---

## Request/Response Schemas

### ExtractionRequest

Single URL extraction request schema.

```json
{
  "url": "https://example.fr"
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "format": "uri",
      "description": "URL to extract SIRET/SIREN/TVA from"
    }
  },
  "required": ["url"]
}
```

---

### BatchExtractionRequest

Batch URL extraction request schema.

```json
{
  "urls": [
    "https://example1.fr",
    "https://example2.fr"
  ]
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "urls": {
      "type": "array",
      "items": {
        "type": "string",
        "format": "uri"
      },
      "minItems": 1,
      "maxItems": 100,
      "description": "List of URLs to process"
    }
  },
  "required": ["urls"]
}
```

---

### ExtractionResult

Single extraction result schema.

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

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The URL that was processed"
    },
    "siret": {
      "type": "string",
      "nullable": true,
      "description": "Extracted SIRET number (14 digits)"
    },
    "siren": {
      "type": "string",
      "nullable": true,
      "description": "Extracted SIREN number (9 digits)"
    },
    "tva": {
      "type": "string",
      "nullable": true,
      "description": "Extracted TVA number (FR + 11 digits)"
    },
    "success": {
      "type": "boolean",
      "description": "Whether extraction was successful"
    },
    "error": {
      "type": "string",
      "nullable": true,
      "description": "Error message if extraction failed"
    },
    "processing_time": {
      "type": "number",
      "description": "Processing time in seconds"
    }
  },
  "required": ["url", "success", "processing_time"]
}
```

---

### BatchExtractionResponse

Batch extraction response schema.

```json
{
  "results": [...],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/ExtractionResult"
      },
      "description": "List of extraction results"
    },
    "total": {
      "type": "integer",
      "description": "Total number of URLs processed"
    },
    "successful": {
      "type": "integer",
      "description": "Number of successful extractions"
    },
    "failed": {
      "type": "integer",
      "description": "Number of failed extractions"
    }
  },
  "required": ["results", "total", "successful", "failed"]
}
```

---

### HealthResponse

Health check response schema.

```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

**JSON Schema:**

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Service status"
    },
    "version": {
      "type": "string",
      "description": "API version"
    }
  },
  "required": ["status", "version"]
}
```

---

## Error Codes and Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request successful |
| `422 Unprocessable Entity` | Request validation failed |
| `500 Internal Server Error` | Server error occurred |

### Validation Errors

When request validation fails, the API returns a `422 Unprocessable Entity` status with detailed error information.

**Example: Invalid URL Format**

Request:
```json
{
  "url": "not-a-valid-url"
}
```

Response (`422 Unprocessable Entity`):
```json
{
  "detail": [
    {
      "loc": ["body", "url"],
      "msg": "invalid or missing URL scheme",
      "type": "value_error.url.scheme"
    }
  ]
}
```

**Example: Duplicate URLs in Batch Request**

Request:
```json
{
  "urls": [
    "https://example.fr",
    "https://example.fr"
  ]
}
```

Response (`422 Unprocessable Entity`):
```json
{
  "detail": [
    {
      "loc": ["body", "urls"],
      "msg": "URLs must be unique",
      "type": "value_error"
    }
  ]
}
```

**Example: Too Many URLs**

Request:
```json
{
  "urls": ["https://example1.fr", "https://example2.fr", ...]  // 101 URLs
}
```

Response (`422 Unprocessable Entity`):
```json
{
  "detail": [
    {
      "loc": ["body", "urls"],
      "msg": "ensure this value has at most 100 items",
      "type": "value_error.list.max_items"
    }
  ]
}
```

### Application Errors

Application errors are returned within the `ExtractionResult` object with `success: false` and an `error` message.

**Common Error Messages:**

| Error Message | Cause | HTTP Status |
|---------------|-------|-------------|
| `No valid identifiers found` | No SIRET/SIREN/TVA found on the page | `200 OK` |
| `Navigation timeout of 60000 ms exceeded` | Page took too long to load | `200 OK` |
| `net::ERR_NAME_NOT_RESOLVED` | Domain does not exist | `200 OK` |
| `net::ERR_CONNECTION_REFUSED` | Server refused connection | `200 OK` |
| `net::ERR_CONNECTION_TIMED_OUT` | Connection timed out | `200 OK` |
| `Internal server error` | Unhandled server error | `500` |

**Note:** Even when extraction fails for specific URLs, the API returns `200 OK`. Check the `success` field in each result to determine if extraction was successful.

### Server Errors

**Example: Internal Server Error**

Response (`500 Internal Server Error`):
```json
{
  "detail": "Internal server error",
  "error": "An error occurred"
}
```

In debug mode (`DEBUG=True`), detailed error messages are included:
```json
{
  "detail": "Internal server error",
  "error": "Detailed error traceback..."
}
```

---

## Rate Limiting

### Default Rate Limits

The API uses configurable rate limiting to prevent abuse:

- **Default:** 100 requests per 60 seconds (per IP address)
- Configurable via environment variables: `RATE_LIMIT_REQUESTS` and `RATE_LIMIT_WINDOW`

### Rate Limit Headers

Currently, rate limit headers are not included in responses. This feature can be implemented using middleware.

### Recommended Headers (Future Implementation)

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

### Best Practices

1. **Batch Requests**: Use `/api/extract/batch` to process multiple URLs in a single request
2. **Retry Logic**: Implement exponential backoff for failed requests
3. **Cache Results**: Cache extracted identifiers to avoid redundant requests
4. **Monitor Rate Limits**: Track your usage to avoid hitting limits

---

## Client Examples

### cURL Examples

#### Health Check

```bash
curl -X GET "http://localhost:8000/health" \
  -H "Accept: application/json"
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

#### Single URL Extraction

```bash
curl -X POST "http://localhost:8000/api/extract" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "url": "https://www.legifrance.gouv.fr"
  }'
```

Response:
```json
{
  "url": "https://www.legifrance.gouv.fr",
  "siret": "13002603200013",
  "siren": "130026032",
  "tva": "FR26130026032",
  "success": true,
  "error": null,
  "processing_time": 2.145
}
```

---

#### Batch URL Extraction

```bash
curl -X POST "http://localhost:8000/api/extract/batch" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "urls": [
      "https://www.legifrance.gouv.fr",
      "https://www.service-public.fr"
    ]
  }'
```

Response:
```json
{
  "results": [
    {
      "url": "https://www.legifrance.gouv.fr",
      "siret": "13002603200013",
      "siren": "130026032",
      "tva": "FR26130026032",
      "success": true,
      "error": null,
      "processing_time": 2.145
    },
    {
      "url": "https://www.service-public.fr",
      "siret": "13002526200013",
      "siren": "130025262",
      "tva": "FR81130025262",
      "success": true,
      "error": null,
      "processing_time": 1.892
    }
  ],
  "total": 2,
  "successful": 2,
  "failed": 0
}
```

---

#### Save Response to File

```bash
curl -X POST "http://localhost:8000/api/extract/batch" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "urls": [
      "https://www.legifrance.gouv.fr",
      "https://www.service-public.fr"
    ]
  }' \
  -o results.json
```

---

### Python Client Example

#### Installation

```bash
pip install requests
```

#### Basic Usage

```python
import requests
import json
from typing import Optional, List, Dict

class SiretExtractorClient:
    """Python client for SIRET Extractor API"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        """
        Initialize the client.

        Args:
            base_url: Base URL of the API (default: http://localhost:8000)
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def health_check(self) -> Dict:
        """
        Check API health status.

        Returns:
            Health status response
        """
        response = self.session.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def extract_single(self, url: str) -> Dict:
        """
        Extract identifiers from a single URL.

        Args:
            url: URL to extract from

        Returns:
            Extraction result
        """
        payload = {"url": url}
        response = self.session.post(
            f"{self.base_url}/api/extract",
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def extract_batch(self, urls: List[str]) -> Dict:
        """
        Extract identifiers from multiple URLs.

        Args:
            urls: List of URLs to extract from (max 100)

        Returns:
            Batch extraction response
        """
        if len(urls) > 100:
            raise ValueError("Maximum 100 URLs per batch request")

        payload = {"urls": urls}
        response = self.session.post(
            f"{self.base_url}/api/extract/batch",
            json=payload
        )
        response.raise_for_status()
        return response.json()

    def close(self):
        """Close the session"""
        self.session.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


# Example usage
if __name__ == "__main__":
    # Using context manager
    with SiretExtractorClient(base_url="http://localhost:8000") as client:
        # Health check
        health = client.health_check()
        print(f"API Status: {health['status']}, Version: {health['version']}")

        # Extract from single URL
        print("\n=== Single URL Extraction ===")
        result = client.extract_single("https://www.legifrance.gouv.fr")
        print(f"URL: {result['url']}")
        print(f"SIRET: {result['siret']}")
        print(f"SIREN: {result['siren']}")
        print(f"TVA: {result['tva']}")
        print(f"Success: {result['success']}")
        print(f"Processing time: {result['processing_time']}s")

        # Extract from multiple URLs
        print("\n=== Batch Extraction ===")
        urls = [
            "https://www.legifrance.gouv.fr",
            "https://www.service-public.fr"
        ]
        batch_result = client.extract_batch(urls)
        print(f"Total: {batch_result['total']}")
        print(f"Successful: {batch_result['successful']}")
        print(f"Failed: {batch_result['failed']}")

        for result in batch_result['results']:
            print(f"\n  URL: {result['url']}")
            print(f"  SIRET: {result['siret']}")
            print(f"  Success: {result['success']}")
```

#### Advanced Usage with Error Handling

```python
import requests
from typing import List, Dict, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SiretExtractorClientAdvanced:
    """Advanced Python client with error handling and retries"""

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        timeout: int = 120,
        max_retries: int = 3
    ):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def _make_request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict] = None
    ) -> Dict:
        """
        Make HTTP request with retry logic.

        Args:
            method: HTTP method (GET, POST)
            endpoint: API endpoint
            json_data: JSON payload for POST requests

        Returns:
            Response JSON

        Raises:
            requests.exceptions.RequestException: If request fails
        """
        url = f"{self.base_url}{endpoint}"

        for attempt in range(self.max_retries):
            try:
                if method == "GET":
                    response = self.session.get(url, timeout=self.timeout)
                elif method == "POST":
                    response = self.session.post(
                        url,
                        json=json_data,
                        timeout=self.timeout
                    )
                else:
                    raise ValueError(f"Unsupported method: {method}")

                response.raise_for_status()
                return response.json()

            except requests.exceptions.Timeout:
                logger.warning(f"Request timeout (attempt {attempt + 1}/{self.max_retries})")
                if attempt == self.max_retries - 1:
                    raise

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}")
                if attempt == self.max_retries - 1:
                    raise

    def extract_single(self, url: str) -> Dict:
        """Extract identifiers from a single URL with error handling"""
        try:
            result = self._make_request(
                "POST",
                "/api/extract",
                json_data={"url": url}
            )

            if result['success']:
                logger.info(f"Successfully extracted identifiers from {url}")
            else:
                logger.warning(f"No identifiers found for {url}: {result['error']}")

            return result

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to extract from {url}: {e}")
            raise

    def extract_batch(self, urls: List[str], chunk_size: int = 50) -> Dict:
        """
        Extract from multiple URLs with chunking for large batches.

        Args:
            urls: List of URLs
            chunk_size: Maximum URLs per request (max 100)

        Returns:
            Combined batch extraction response
        """
        if chunk_size > 100:
            raise ValueError("chunk_size cannot exceed 100")

        all_results = []

        # Process in chunks
        for i in range(0, len(urls), chunk_size):
            chunk = urls[i:i + chunk_size]
            logger.info(f"Processing chunk {i//chunk_size + 1} ({len(chunk)} URLs)")

            try:
                response = self._make_request(
                    "POST",
                    "/api/extract/batch",
                    json_data={"urls": chunk}
                )
                all_results.extend(response['results'])

            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to process chunk: {e}")
                # Continue with next chunk
                continue

        # Calculate summary
        successful = sum(1 for r in all_results if r['success'])
        failed = len(all_results) - successful

        return {
            'results': all_results,
            'total': len(all_results),
            'successful': successful,
            'failed': failed
        }


# Example usage with error handling
if __name__ == "__main__":
    client = SiretExtractorClientAdvanced(
        base_url="http://localhost:8000",
        timeout=120,
        max_retries=3
    )

    try:
        # Process large batch with chunking
        urls = [
            "https://www.legifrance.gouv.fr",
            "https://www.service-public.fr",
            # ... add up to 1000+ URLs
        ]

        result = client.extract_batch(urls, chunk_size=50)

        print(f"Processed {result['total']} URLs")
        print(f"Success rate: {result['successful']/result['total']*100:.1f}%")

        # Export results to JSON
        import json
        with open('extraction_results.json', 'w') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print("Results saved to extraction_results.json")

    except Exception as e:
        logger.error(f"Extraction failed: {e}")
```

---

### JavaScript/Node.js Client Example

#### Installation

```bash
npm install axios
```

#### Basic Usage

```javascript
const axios = require('axios');

class SiretExtractorClient {
  /**
   * Initialize the client
   * @param {string} baseUrl - Base URL of the API
   */
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 120000 // 120 seconds
    });
  }

  /**
   * Check API health status
   * @returns {Promise<Object>} Health status response
   */
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Extract identifiers from a single URL
   * @param {string} url - URL to extract from
   * @returns {Promise<Object>} Extraction result
   */
  async extractSingle(url) {
    const response = await this.client.post('/api/extract', { url });
    return response.data;
  }

  /**
   * Extract identifiers from multiple URLs
   * @param {string[]} urls - Array of URLs to extract from (max 100)
   * @returns {Promise<Object>} Batch extraction response
   */
  async extractBatch(urls) {
    if (urls.length > 100) {
      throw new Error('Maximum 100 URLs per batch request');
    }

    const response = await this.client.post('/api/extract/batch', { urls });
    return response.data;
  }
}

// Example usage
(async () => {
  const client = new SiretExtractorClient('http://localhost:8000');

  try {
    // Health check
    const health = await client.healthCheck();
    console.log(`API Status: ${health.status}, Version: ${health.version}`);

    // Extract from single URL
    console.log('\n=== Single URL Extraction ===');
    const result = await client.extractSingle('https://www.legifrance.gouv.fr');
    console.log(`URL: ${result.url}`);
    console.log(`SIRET: ${result.siret}`);
    console.log(`SIREN: ${result.siren}`);
    console.log(`TVA: ${result.tva}`);
    console.log(`Success: ${result.success}`);
    console.log(`Processing time: ${result.processing_time}s`);

    // Extract from multiple URLs
    console.log('\n=== Batch Extraction ===');
    const urls = [
      'https://www.legifrance.gouv.fr',
      'https://www.service-public.fr'
    ];
    const batchResult = await client.extractBatch(urls);
    console.log(`Total: ${batchResult.total}`);
    console.log(`Successful: ${batchResult.successful}`);
    console.log(`Failed: ${batchResult.failed}`);

    batchResult.results.forEach(result => {
      console.log(`\n  URL: ${result.url}`);
      console.log(`  SIRET: ${result.siret}`);
      console.log(`  Success: ${result.success}`);
    });

  } catch (error) {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status);
      console.error('Details:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
    } else {
      // Error setting up request
      console.error('Error:', error.message);
    }
  }
})();
```

#### Advanced Usage with TypeScript

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

interface HealthResponse {
  status: string;
  version: string;
}

interface ExtractionRequest {
  url: string;
}

interface BatchExtractionRequest {
  urls: string[];
}

interface ExtractionResult {
  url: string;
  siret: string | null;
  siren: string | null;
  tva: string | null;
  success: boolean;
  error: string | null;
  processing_time: number;
}

interface BatchExtractionResponse {
  results: ExtractionResult[];
  total: number;
  successful: number;
  failed: number;
}

class SiretExtractorClient {
  private client: AxiosInstance;
  private maxRetries: number;

  constructor(
    baseUrl: string = 'http://localhost:8000',
    timeout: number = 120000,
    maxRetries: number = 3
  ) {
    this.maxRetries = maxRetries;
    this.client = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout
    });
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  /**
   * Extract identifiers from a single URL with retry logic
   */
  async extractSingle(url: string): Promise<ExtractionResult> {
    return this.withRetry(async () => {
      const response = await this.client.post<ExtractionResult>(
        '/api/extract',
        { url }
      );
      return response.data;
    });
  }

  /**
   * Extract identifiers from multiple URLs
   */
  async extractBatch(urls: string[]): Promise<BatchExtractionResponse> {
    if (urls.length > 100) {
      throw new Error('Maximum 100 URLs per batch request');
    }

    return this.withRetry(async () => {
      const response = await this.client.post<BatchExtractionResponse>(
        '/api/extract/batch',
        { urls }
      );
      return response.data;
    });
  }

  /**
   * Extract from multiple URLs with automatic chunking
   */
  async extractBatchChunked(
    urls: string[],
    chunkSize: number = 50
  ): Promise<BatchExtractionResponse> {
    if (chunkSize > 100) {
      throw new Error('Chunk size cannot exceed 100');
    }

    const allResults: ExtractionResult[] = [];

    // Process in chunks
    for (let i = 0; i < urls.length; i += chunkSize) {
      const chunk = urls.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} URLs)`);

      try {
        const response = await this.extractBatch(chunk);
        allResults.push(...response.results);
      } catch (error) {
        console.error(`Failed to process chunk:`, error);
        // Continue with next chunk
      }
    }

    // Calculate summary
    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.length - successful;

    return {
      results: allResults,
      total: allResults.length,
      successful,
      failed
    };
  }

  /**
   * Retry wrapper for requests
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        console.log(`Retrying... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
        await this.delay(1000 * (this.maxRetries - retries + 1)); // Exponential backoff
        return this.withRetry(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: any): boolean {
    if (!axios.isAxiosError(error)) return false;

    // Retry on network errors or 5xx status codes
    return !error.response || (error.response.status >= 500);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage
(async () => {
  const client = new SiretExtractorClient('http://localhost:8000');

  try {
    // Health check
    const health = await client.healthCheck();
    console.log(`API Status: ${health.status}, Version: ${health.version}`);

    // Extract from single URL
    const result = await client.extractSingle('https://www.legifrance.gouv.fr');
    console.log('Extraction result:', result);

    // Extract from multiple URLs with chunking
    const urls = Array.from({ length: 150 }, (_, i) => `https://example${i}.fr`);
    const batchResult = await client.extractBatchChunked(urls, 50);

    console.log(`\nProcessed ${batchResult.total} URLs`);
    console.log(`Success rate: ${(batchResult.successful / batchResult.total * 100).toFixed(1)}%`);

    // Export results
    const fs = require('fs');
    fs.writeFileSync(
      'extraction_results.json',
      JSON.stringify(batchResult, null, 2)
    );
    console.log('Results saved to extraction_results.json');

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.status);
      console.error('Details:', error.response?.data);
    } else {
      console.error('Error:', error);
    }
  }
})();
```

---

## Additional Resources

### Interactive API Documentation

FastAPI provides interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These interfaces allow you to:
- Explore all endpoints
- View request/response schemas
- Test API calls directly from the browser
- Download OpenAPI specification

### OpenAPI Specification

Download the OpenAPI (Swagger) specification:

```bash
curl http://localhost:8000/openapi.json > openapi.json
```

### Configuration

Key environment variables for API configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `API_HOST` | API server host | `0.0.0.0` |
| `API_PORT` | API server port | `8000` |
| `API_WORKERS` | Number of worker processes | `4` |
| `DEBUG` | Enable debug mode | `False` |
| `MAX_CONCURRENT_WORKERS` | Max concurrent scraping workers | `10` |
| `REQUEST_TIMEOUT` | Request timeout (ms) | `30000` |
| `NAVIGATION_TIMEOUT` | Navigation timeout (ms) | `60000` |
| `RATE_LIMIT_REQUESTS` | Rate limit requests | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit window (seconds) | `60` |

### Support

For issues, questions, or feature requests:
- Open a GitHub issue
- Check the project README for updates
- Review the interactive API documentation

---

## Version History

### v1.0.0 (Current)
- Initial production release
- Single and batch URL extraction
- Playwright-based scraping
- Luhn algorithm validation
- Health check endpoint
- Error handling and logging

---

**Last Updated:** 2025-10-23
**API Version:** 1.0.0
