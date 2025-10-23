"""Webshare API client for proxy management"""

import httpx
import logging
from typing import List, Dict, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class WebshareClient:
    """Client for interacting with Webshare proxy API"""

    def __init__(self, api_key: Optional[str] = None, api_url: Optional[str] = None):
        """
        Initialize Webshare client.

        Args:
            api_key: Webshare API key. If None, uses settings.webshare_api_key
            api_url: Webshare API base URL. If None, uses settings.webshare_api_url
        """
        self.api_key = api_key or settings.webshare_api_key
        self.api_url = (api_url or settings.webshare_api_url).rstrip("/")

        if not self.api_key:
            raise ValueError("Webshare API key is required")

        self.headers = {"Authorization": f"Token {self.api_key}"}

    async def fetch_proxy_list(self, page_size: int = 100) -> List[Dict[str, str]]:
        """
        Fetch list of proxies from Webshare API.

        Args:
            page_size: Number of proxies to fetch per page (max 100)

        Returns:
            List of proxy dictionaries with format:
            [
                {
                    'host': '123.45.67.89',
                    'port': '9000',
                    'username': 'user123',
                    'password': 'pass123'
                },
                ...
            ]

        Raises:
            httpx.HTTPError: If API request fails
        """
        all_proxies = []
        page = 1

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                url = f"{self.api_url}/proxy/list/?mode=direct&page={page}&page_size={page_size}"

                try:
                    response = await client.get(url, headers=self.headers)
                    response.raise_for_status()

                    data = response.json()
                    proxies = data.get("results", [])

                    if not proxies:
                        break

                    # Extract relevant fields
                    for proxy in proxies:
                        all_proxies.append({
                            "host": proxy["proxy_address"],
                            "port": str(proxy["port"]),
                            "username": proxy.get("username", ""),
                            "password": proxy.get("password", ""),
                        })

                    # Check if there's a next page
                    if not data.get("next"):
                        break

                    page += 1

                except httpx.HTTPError as e:
                    logger.error(f"Failed to fetch proxies from Webshare: {e}")
                    raise

        logger.info(f"Fetched {len(all_proxies)} proxies from Webshare")
        return all_proxies

    def format_proxy_url(self, proxy: Dict[str, str]) -> str:
        """
        Format proxy dictionary as URL string.

        Args:
            proxy: Dictionary with host, port, username, password

        Returns:
            Proxy URL in format: http://username:password@host:port
        """
        if proxy.get("username") and proxy.get("password"):
            return f"http://{proxy['username']}:{proxy['password']}@{proxy['host']}:{proxy['port']}"
        else:
            return f"http://{proxy['host']}:{proxy['port']}"

    async def get_proxy_urls(self, limit: Optional[int] = None) -> List[str]:
        """
        Fetch proxies and return as formatted URL strings.

        Args:
            limit: Maximum number of proxies to return. If None, returns all.

        Returns:
            List of proxy URLs

        Raises:
            httpx.HTTPError: If API request fails
        """
        proxies = await self.fetch_proxy_list()

        if limit:
            proxies = proxies[:limit]

        return [self.format_proxy_url(proxy) for proxy in proxies]

    async def get_proxy_count(self) -> int:
        """
        Get the total number of available proxies.

        Returns:
            Number of proxies available

        Raises:
            httpx.HTTPError: If API request fails
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.api_url}/proxy/list/?mode=direct&page=1&page_size=1"

            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                data = response.json()
                return data.get("count", 0)

            except httpx.HTTPError as e:
                logger.error(f"Failed to get proxy count from Webshare: {e}")
                raise


async def initialize_webshare_proxies() -> List[str]:
    """
    Initialize and fetch proxies from Webshare API.

    Returns:
        List of proxy URLs ready to use

    Raises:
        ValueError: If Webshare is not properly configured
        httpx.HTTPError: If API request fails
    """
    if not settings.webshare_enabled:
        logger.info("Webshare integration is disabled")
        return []

    if not settings.webshare_api_key:
        raise ValueError("WEBSHARE_API_KEY environment variable is required when Webshare is enabled")

    try:
        client = WebshareClient()
        proxy_urls = await client.get_proxy_urls()
        logger.info(f"Successfully initialized {len(proxy_urls)} Webshare proxies")
        return proxy_urls

    except Exception as e:
        logger.error(f"Failed to initialize Webshare proxies: {e}")
        raise
