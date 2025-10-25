"""Pydantic models for request/response validation"""

from typing import List, Optional
from pydantic import BaseModel, HttpUrl, Field, validator


class ExtractionRequest(BaseModel):
    """Single URL extraction request"""
    url: HttpUrl = Field(..., description="URL to extract SIRET/SIREN/TVA from")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.fr"
            }
        }


class ProxyConfig(BaseModel):
    """Proxy configuration"""
    host: str = Field(..., description="Proxy host")
    port: int = Field(..., description="Proxy port")
    username: Optional[str] = Field(None, description="Proxy username")
    password: Optional[str] = Field(None, description="Proxy password")

    def to_playwright_format(self) -> dict:
        """Convert to Playwright proxy format"""
        proxy_dict = {
            "server": f"http://{self.host}:{self.port}"
        }
        if self.username and self.password:
            proxy_dict["username"] = self.username
            proxy_dict["password"] = self.password
        return proxy_dict

    def to_url(self) -> str:
        """Convert to URL format for ProxyManager"""
        if self.username and self.password:
            return f"http://{self.username}:{self.password}@{self.host}:{self.port}"
        return f"http://{self.host}:{self.port}"


class BatchExtractionRequest(BaseModel):
    """Batch URL extraction request"""
    urls: List[HttpUrl] = Field(..., min_length=1, max_length=100, description="List of URLs to process")
    concurrent_workers: int = Field(10, ge=1, le=50, description="Number of concurrent workers (1-50)")
    proxies: Optional[List[ProxyConfig]] = Field(None, description="Optional list of proxies for rotation")

    # Configurable timeouts (in milliseconds)
    navigation_timeout: Optional[int] = Field(20000, ge=5000, le=120000, description="Navigation timeout in ms (5s-120s, default 20s)")
    page_load_timeout: Optional[int] = Field(10000, ge=3000, le=60000, description="Page load timeout in ms (3s-60s, default 10s)")

    # Configurable retry settings
    max_retries: Optional[int] = Field(3, ge=0, le=10, description="Maximum retry attempts (0-10, default 3)")
    retry_delay: Optional[int] = Field(2, ge=1, le=10, description="Delay between retries in seconds (1-10s, default 2s)")

    @validator("urls")
    def validate_unique_urls(cls, v):
        """Ensure URLs are unique"""
        if len(v) != len(set(str(url) for url in v)):
            raise ValueError("URLs must be unique")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "urls": [
                    "https://example1.fr",
                    "https://example2.fr"
                ],
                "concurrent_workers": 10,
                "navigation_timeout": 20000,
                "page_load_timeout": 10000,
                "max_retries": 3,
                "retry_delay": 2,
                "proxies": [
                    {
                        "host": "142.111.48.253",
                        "port": 7030,
                        "username": "fxypiwva",
                        "password": "1bc04c2cd1mc"
                    }
                ]
            }
        }


class ExtractionResult(BaseModel):
    """Extraction result for a single URL"""
    url: str = Field(..., description="The URL that was processed")
    siret: Optional[str] = Field(None, description="Extracted SIRET number (14 digits)")
    siren: Optional[str] = Field(None, description="Extracted SIREN number (9 digits)")
    tva: Optional[str] = Field(None, description="Extracted TVA number (FR + 11 digits)")
    success: bool = Field(..., description="Whether extraction was successful")
    status: str = Field(..., description="Status: 'success', 'no_data', or 'error'")
    error: Optional[str] = Field(None, description="Error message if extraction failed")
    processing_time: float = Field(..., description="Processing time in seconds")
    worker_id: Optional[int] = Field(None, description="Worker ID that processed this URL")
    proxy_used: Optional[str] = Field(None, description="Proxy used for this request")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.fr",
                "siret": "12345678901234",
                "siren": "123456789",
                "tva": "FR12345678901",
                "success": True,
                "status": "success",
                "error": None,
                "processing_time": 1.234,
                "worker_id": 0,
                "proxy_used": "142.111.48.253:7030"
            }
        }


class BatchStartResponse(BaseModel):
    """Immediate response when batch starts"""
    batch_id: str = Field(..., description="Unique batch ID for progress tracking")
    message: str = Field(..., description="Status message")
    total_urls: int = Field(..., description="Total number of URLs to process")

    class Config:
        json_schema_extra = {
            "example": {
                "batch_id": "550e8400-e29b-41d4-a716-446655440000",
                "message": "Batch processing started",
                "total_urls": 10
            }
        }


class BatchExtractionResponse(BaseModel):
    """Batch extraction response with results"""
    batch_id: str = Field(..., description="Unique batch ID for progress tracking")
    results: List[ExtractionResult] = Field(..., description="List of extraction results")
    total: int = Field(..., description="Total number of URLs processed")
    successful: int = Field(..., description="Number of successful extractions")
    failed: int = Field(..., description="Number of failed extractions")

    class Config:
        json_schema_extra = {
            "example": {
                "batch_id": "550e8400-e29b-41d4-a716-446655440000",
                "results": [
                    {
                        "url": "https://example1.fr",
                        "siret": "12345678901234",
                        "siren": "123456789",
                        "tva": "FR12345678901",
                        "success": True,
                        "error": None,
                        "processing_time": 1.234
                    },
                    {
                        "url": "https://example2.fr",
                        "siret": None,
                        "siren": None,
                        "tva": None,
                        "success": False,
                        "error": "No valid identifiers found",
                        "processing_time": 0.856
                    }
                ],
                "total": 2,
                "successful": 1,
                "failed": 1
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "version": "1.0.0"
            }
        }


class LogEntry(BaseModel):
    """A single log entry for real-time processing logs"""
    timestamp: float = Field(..., description="Unix timestamp when log was created")
    url: str = Field(..., description="URL being processed")
    status: str = Field(..., description="Status: processing, success, no_data, error")
    message: str = Field(..., description="Log message")
    worker_id: Optional[int] = Field(None, description="Worker ID that processed this URL")


class BatchProgress(BaseModel):
    """Real-time progress tracking for batch extraction"""
    batch_id: str = Field(..., description="Unique batch ID")
    total_urls: int = Field(..., description="Total number of URLs to process")
    completed: int = Field(..., description="Number of URLs completed")
    success: int = Field(..., description="Number of successful extractions")
    failed: int = Field(..., description="Number of failed extractions")
    in_progress: bool = Field(..., description="Whether batch is still processing")
    start_time: float = Field(..., description="Start time (Unix timestamp)")
    elapsed_time: float = Field(..., description="Elapsed time in seconds")
    estimated_time_remaining: Optional[float] = Field(None, description="Estimated time remaining in seconds")
    recent_logs: List[LogEntry] = Field(default_factory=list, description="Recent processing logs (last 50)")

    class Config:
        json_schema_extra = {
            "example": {
                "batch_id": "550e8400-e29b-41d4-a716-446655440000",
                "total_urls": 10,
                "completed": 5,
                "success": 4,
                "failed": 1,
                "in_progress": True,
                "start_time": 1234567890.123,
                "elapsed_time": 15.5,
                "estimated_time_remaining": 15.5
            }
        }
