"""Configuration management for SIRET Extractor API"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # API Configuration
    api_host: str = Field(default="0.0.0.0", env="API_HOST")
    api_port: int = Field(default=8000, env="API_PORT")
    api_workers: int = Field(default=4, env="API_WORKERS")
    debug: bool = Field(default=False, env="DEBUG")
    allowed_origins: str = Field(default="*", env="ALLOWED_ORIGINS")

    # Scraper Configuration
    max_concurrent_workers: int = Field(default=10, env="MAX_CONCURRENT_WORKERS")
    request_timeout: int = Field(default=30000, env="REQUEST_TIMEOUT")
    navigation_timeout: int = Field(default=60000, env="NAVIGATION_TIMEOUT")
    page_load_timeout: int = Field(default=30000, env="PAGE_LOAD_TIMEOUT")

    # Proxy Configuration
    proxy_list: List[str] = Field(default_factory=list, env="PROXY_LIST")
    proxy_rotation_enabled: bool = Field(default=True, env="PROXY_ROTATION_ENABLED")

    # Webshare Integration
    webshare_api_key: Optional[str] = Field(default=None, env="WEBSHARE_API_KEY")
    webshare_api_url: str = Field(default="https://proxy.webshare.io/api/v2/", env="WEBSHARE_API_URL")
    webshare_enabled: bool = Field(default=False, env="WEBSHARE_ENABLED")
    proxies_per_worker: int = Field(default=5, env="PROXIES_PER_WORKER")

    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")

    # Retry Configuration
    max_retries: int = Field(default=3, env="MAX_RETRIES")
    retry_delay: int = Field(default=2, env="RETRY_DELAY")

    # Browser Configuration
    headless: bool = Field(default=True, env="HEADLESS")
    browser_type: str = Field(default="chromium", env="BROWSER_TYPE")

    @validator("allowed_origins", pre=True)
    def parse_allowed_origins(cls, v):
        """Parse comma-separated allowed origins from environment variable"""
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            if not v.strip():
                return ["*"]
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v if isinstance(v, list) else ["*"]

    @validator("proxy_list", pre=True)
    def parse_proxy_list(cls, v):
        """Parse comma-separated proxy list from environment variable"""
        if isinstance(v, str):
            if not v.strip():
                return []
            return [proxy.strip() for proxy in v.split(",") if proxy.strip()]
        return v

    @validator("browser_type")
    def validate_browser_type(cls, v):
        """Validate browser type"""
        valid_types = ["chromium", "firefox", "webkit"]
        if v not in valid_types:
            raise ValueError(f"Browser type must be one of {valid_types}")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()


# Extraction Patterns (allow spaces/nbsp between digit groups)
# Examples: "423 757 418 00011" or "423757418" or "423&nbsp;757&nbsp;418"
SIRET_PATTERN = r'\b(?:\d{3}\s*){2}\d{3}\s*\d{5}\b'
SIREN_PATTERN = r'\b(?:\d{3}\s*){3}\b'
TVA_PATTERN = r'\bFR\s*\d{2}\s*\d{9}\b'

# Validation
SIRET_LENGTH = 14
SIREN_LENGTH = 9
TVA_PREFIX = "FR"
TVA_LENGTH = 13  # FR + 11 digits

# User Agents Pool
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
]

# Search Selectors (ordered by priority)
SEARCH_SELECTORS = [
    "footer",
    "[class*='footer']",
    "[id*='footer']",
    "[class*='legal']",
    "[id*='legal']",
    "[class*='mentions']",
    "[id*='mentions']",
    "[class*='contact']",
    "[id*='contact']",
    "body",
]

# Common French Legal Terms
LEGAL_KEYWORDS = [
    "siret",
    "siren",
    "tva",
    "mentions légales",
    "informations légales",
    "données légales",
    "rcs",
    "immatriculation",
]

# Legal Pages to Check (ordered by priority)
LEGAL_PATHS = [
    "/mentions-legales",
    "/mentions-legales/",
    "/mentions",
    "/mentions/",
    "/mentions-légales",
    "/mentions-légales/",
    "/cgv",
    "/cgv/",
    "/cgu",
    "/cgu/",
    "/conditions-generales-de-vente",
    "/conditions-generales-de-vente/",
    "/conditions-generales",
    "/conditions-generales/",
    "/politique-de-confidentialite",
    "/politique-de-confidentialite/",
    "/fr/mentions-legales",
    "/fr/mentions",
    "/fr/conditions-generales",
    "/legal",
    "/legal/",
]

# Maximum number of legal pages to check per site
MAX_LEGAL_PAGES_TO_CHECK = 5

# Blacklist of hosting/agency SIRENs to exclude
BLACKLIST_SIRENS = [
    "797876562",  # Gestixi (site builder)
    "423646512",  # OVH (hosting)
    "537407926",  # Gandi (domain/hosting)
    "443061841",  # O2Switch (hosting)
    "424761419",  # Ionos (1&1, hosting)
    "518518460",  # Wix (site builder)
    "814776647",  # Shopify (e-commerce platform)
    "890176703",  # WordPress.com (Automattic)
    "433115904",  # Adobe (Creative Cloud)
    "732829320",  # Hostinger
]
