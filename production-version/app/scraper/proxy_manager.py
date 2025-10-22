"""Proxy rotation manager for distributing requests across multiple proxies"""

import random
from typing import List, Optional
from app.config import settings


class ProxyManager:
    """Manages proxy rotation for web scraping"""

    def __init__(self, proxy_list: Optional[List[str]] = None):
        """
        Initialize the proxy manager.

        Args:
            proxy_list: List of proxy URLs. If None, uses settings.proxy_list
        """
        self.proxy_list = proxy_list or settings.proxy_list
        self.current_index = 0
        self.enabled = settings.proxy_rotation_enabled and len(self.proxy_list) > 0

    def get_next_proxy(self) -> Optional[str]:
        """
        Get the next proxy from the pool using round-robin.

        Returns:
            Proxy URL or None if no proxies available
        """
        if not self.enabled or not self.proxy_list:
            return None

        proxy = self.proxy_list[self.current_index]
        self.current_index = (self.current_index + 1) % len(self.proxy_list)
        return proxy

    def get_random_proxy(self) -> Optional[str]:
        """
        Get a random proxy from the pool.

        Returns:
            Proxy URL or None if no proxies available
        """
        if not self.enabled or not self.proxy_list:
            return None

        return random.choice(self.proxy_list)

    def add_proxy(self, proxy: str) -> None:
        """
        Add a proxy to the pool.

        Args:
            proxy: Proxy URL to add
        """
        if proxy not in self.proxy_list:
            self.proxy_list.append(proxy)
            self.enabled = True

    def remove_proxy(self, proxy: str) -> None:
        """
        Remove a proxy from the pool.

        Args:
            proxy: Proxy URL to remove
        """
        if proxy in self.proxy_list:
            self.proxy_list.remove(proxy)
            self.enabled = len(self.proxy_list) > 0
            # Reset index if needed
            if self.current_index >= len(self.proxy_list):
                self.current_index = 0

    def get_proxy_count(self) -> int:
        """
        Get the number of proxies in the pool.

        Returns:
            Number of proxies
        """
        return len(self.proxy_list)

    def is_enabled(self) -> bool:
        """
        Check if proxy rotation is enabled.

        Returns:
            True if enabled, False otherwise
        """
        return self.enabled
