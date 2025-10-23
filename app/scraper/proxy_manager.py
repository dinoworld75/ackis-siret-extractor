"""Proxy rotation manager for distributing requests across multiple proxies"""

import random
import logging
from typing import List, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class ProxyManager:
    """Manages proxy rotation for web scraping"""

    def __init__(self, proxy_list: Optional[List[str]] = None, worker_id: Optional[int] = None):
        """
        Initialize the proxy manager.

        Args:
            proxy_list: List of proxy URLs. If None, uses settings.proxy_list
            worker_id: Optional worker ID for logging and identification
        """
        self.proxy_list = proxy_list or settings.proxy_list
        self.worker_id = worker_id
        self.current_index = 0
        self.enabled = settings.proxy_rotation_enabled and len(self.proxy_list) > 0

        if self.enabled and worker_id is not None:
            logger.info(f"Worker {worker_id}: Initialized with {len(self.proxy_list)} proxies")

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


def distribute_proxies_to_workers(proxy_list: List[str], num_workers: int, proxies_per_worker: int) -> List[ProxyManager]:
    """
    Distribute proxies among workers, creating dedicated ProxyManager instances.

    Args:
        proxy_list: Complete list of proxy URLs
        num_workers: Number of workers to create
        proxies_per_worker: Number of proxies to assign to each worker

    Returns:
        List of ProxyManager instances, one per worker

    Strategy:
        - Divides proxy list into chunks
        - Each worker gets a dedicated set of proxies
        - Round-robin distribution if not enough proxies
    """
    if not proxy_list:
        logger.warning("No proxies available for distribution")
        return [ProxyManager(proxy_list=[], worker_id=i) for i in range(num_workers)]

    proxy_managers = []
    total_proxies_needed = num_workers * proxies_per_worker

    for worker_id in range(num_workers):
        start_idx = (worker_id * proxies_per_worker) % len(proxy_list)
        worker_proxies = []

        for i in range(proxies_per_worker):
            proxy_idx = (start_idx + i) % len(proxy_list)
            worker_proxies.append(proxy_list[proxy_idx])

        proxy_manager = ProxyManager(proxy_list=worker_proxies, worker_id=worker_id)
        proxy_managers.append(proxy_manager)

    logger.info(f"Distributed {len(proxy_list)} proxies among {num_workers} workers ({proxies_per_worker} proxies/worker)")
    return proxy_managers
