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
    concurrent_workers: int = Field(10, ge=1, le=20, description="Number of concurrent workers (1-20)")
    proxies: Optional[List[ProxyConfig]] = Field(None, description="Optional list of proxies for rotation")

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
    error: Optional[str] = Field(None, description="Error message if extraction failed")
    processing_time: float = Field(..., description="Processing time in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.fr",
                "siret": "12345678901234",
                "siren": "123456789",
                "tva": "FR12345678901",
                "success": True,
                "error": None,
                "processing_time": 1.234
            }
        }


class BatchExtractionResponse(BaseModel):
    """Batch extraction response"""
    results: List[ExtractionResult] = Field(..., description="List of extraction results")
    total: int = Field(..., description="Total number of URLs processed")
    successful: int = Field(..., description="Number of successful extractions")
    failed: int = Field(..., description="Number of failed extractions")

    class Config:
        json_schema_extra = {
            "example": {
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
