"""Playwright-based web scraper for extracting SIRET/SIREN/TVA numbers"""

import asyncio
import random
from typing import Dict, Optional, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError, Error as PlaywrightError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

from app.config import settings, USER_AGENTS, SEARCH_SELECTORS, LEGAL_PATHS, MAX_LEGAL_PAGES_TO_CHECK
from .extractors import extract_identifiers, search_in_priority_areas
from .proxy_manager import ProxyManager
from urllib.parse import urljoin, urlparse


def should_retry_exception(exception: Exception) -> bool:
    """
    Determine if an exception is worth retrying.
    Returns False for permanent failures (404, DNS errors, connection refused).
    Returns True for temporary failures (timeouts, 5xx errors).
    """
    if not isinstance(exception, Exception):
        return True

    error_str = str(exception).lower()

    # Don't retry permanent failures
    permanent_errors = [
        'net::err_name_not_resolved',  # DNS failure
        'net::err_connection_refused',  # Connection refused
        'net::err_connection_closed',  # Connection closed
        'net::err_cert_',  # Certificate errors
        'ns_error_unknown_host',  # Firefox DNS failure
        '404',  # Page not found
        'not found',
        'dns',
        'enotfound',
        'econnrefused',
    ]

    for permanent_error in permanent_errors:
        if permanent_error in error_str:
            return False

    # Retry timeouts and other temporary errors
    return True


class PlaywrightScraper:
    """Async web scraper using Playwright for SIRET extraction"""

    def __init__(self, proxy_manager: Optional[ProxyManager] = None):
        """
        Initialize the Playwright scraper.

        Args:
            proxy_manager: ProxyManager instance for proxy rotation
        """
        self.proxy_manager = proxy_manager or ProxyManager()
        self.browser: Optional[Browser] = None
        self.playwright = None
        self.context_pool: List[BrowserContext] = []
        self.context_pool_lock = asyncio.Lock()
        self.pool_size = settings.max_concurrent_workers

    async def __aenter__(self):
        """Async context manager entry"""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()

    async def start(self) -> None:
        """Start the browser instance and initialize context pool"""
        if self.playwright is None:
            self.playwright = await async_playwright().start()

        if self.browser is None:
            browser_type = getattr(self.playwright, settings.browser_type)
            self.browser = await browser_type.launch(
                headless=settings.headless,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                ]
            )

            # Pre-create context pool for concurrent workers
            for _ in range(self.pool_size):
                context = await self._create_context_for_pool()
                self.context_pool.append(context)

    async def close(self) -> None:
        """Close all browser contexts and the browser instance"""
        # Close all contexts in the pool
        for context in self.context_pool:
            try:
                await context.close()
            except Exception:
                pass  # Ignore errors when closing contexts
        self.context_pool.clear()

        if self.browser:
            await self.browser.close()
            self.browser = None

        if self.playwright:
            await self.playwright.stop()
            self.playwright = None

    async def _create_context_for_pool(self, proxy: Optional[str] = None) -> BrowserContext:
        """
        Create a new browser context for the pool with random user agent.

        Args:
            proxy: Proxy URL to use for this context (format: http://user:pass@host:port or http://host:port)

        Returns:
            Browser context
        """
        if not self.browser:
            await self.start()

        context_options = {
            'user_agent': random.choice(USER_AGENTS),
            'viewport': {'width': 1920, 'height': 1080},
            'locale': 'fr-FR',
            'timezone_id': 'Europe/Paris',
        }

        if proxy:
            # Parse proxy URL to extract components for Playwright
            # Playwright requires separate server and credentials, not embedded in URL
            parsed = urlparse(proxy)

            # Build proxy config with server URL (without credentials)
            proxy_config = {
                'server': f'{parsed.scheme}://{parsed.hostname}:{parsed.port}'
            }

            # Add authentication credentials if present in URL
            if parsed.username and parsed.password:
                proxy_config['username'] = parsed.username
                proxy_config['password'] = parsed.password

            context_options['proxy'] = proxy_config

        return await self.browser.new_context(**context_options)

    async def _get_context_from_pool(self) -> BrowserContext:
        """
        Get an available context from the pool (round-robin).

        Returns:
            Browser context from the pool
        """
        async with self.context_pool_lock:
            # Simple round-robin: pop from front, use it, and it will be returned to the back later
            if not self.context_pool:
                # Fallback: create a new context if pool is empty
                return await self._create_context_for_pool()

            # Get next context from pool
            context = self.context_pool.pop(0)
            return context

    async def _return_context_to_pool(self, context: BrowserContext) -> None:
        """
        Return a context to the pool after use.

        Args:
            context: Browser context to return
        """
        async with self.context_pool_lock:
            # Close all pages in the context to free resources
            for page in context.pages:
                try:
                    await page.close()
                except Exception:
                    pass  # Ignore errors when closing pages

            # Return context to the back of the pool
            self.context_pool.append(context)

    async def _extract_page_content(self, page: Page) -> Dict[str, str]:
        """
        Extract text content from priority areas of the page.

        Args:
            page: Playwright page object

        Returns:
            Dictionary with section names and their content
        """
        content = {
            'full_page': await page.inner_text('body'),
            'priority_sections': []
        }

        # Extract content from priority selectors
        for selector in SEARCH_SELECTORS:
            try:
                elements = await page.query_selector_all(selector)
                for element in elements:
                    text = await element.inner_text()
                    if text and len(text.strip()) > 0:
                        content['priority_sections'].append(text)
            except Exception:
                continue

        return content

    async def _scrape_single_page(self, page: Page, url: str) -> Dict[str, Optional[str]]:
        """
        Scrape a single page and extract identifiers.

        Args:
            page: Playwright page object
            url: URL to scrape

        Returns:
            Dictionary with extracted identifiers
        """
        # Navigate to the page
        await page.goto(
            url,
            wait_until='domcontentloaded',
            timeout=settings.navigation_timeout
        )

        # Wait for page to load
        try:
            await page.wait_for_load_state('networkidle', timeout=settings.page_load_timeout)
        except PlaywrightTimeoutError:
            # Continue even if networkidle times out
            pass

        # Extract content from priority areas
        content = await self._extract_page_content(page)

        # Search in priority sections first, then fall back to full page
        identifiers = search_in_priority_areas(
            content['full_page'],
            content['priority_sections']
        )

        return identifiers

    @retry(
        stop=stop_after_attempt(settings.max_retries),
        wait=wait_exponential(multiplier=settings.retry_delay, min=2, max=10),
        retry=retry_if_exception(should_retry_exception),
        reraise=True
    )
    async def scrape_url(self, url: str, proxy: Optional[str] = None) -> Dict[str, Optional[str]]:
        """
        Scrape a URL and extract SIRET/SIREN/TVA numbers.
        Tries the main URL first, then legal pages if no identifiers found.
        Uses context pool for better performance.

        Args:
            url: URL to scrape
            proxy: Optional proxy URL to use (overrides proxy_manager)

        Returns:
            Dictionary with extracted identifiers

        Raises:
            Exception: If scraping fails after retries
        """
        # Use provided proxy, or fall back to proxy_manager
        if proxy is None and self.proxy_manager.is_enabled():
            proxy = self.proxy_manager.get_next_proxy()

        # Get context from pool instead of creating a new one
        context = await self._get_context_from_pool()

        try:
            page = await context.new_page()

            # Try the main URL first
            identifiers = await self._scrape_single_page(page, url)

            # If we found identifiers, return immediately
            if any(identifiers.values()):
                return identifiers

            # If no identifiers found, try legal pages IN PARALLEL
            parsed_url = urlparse(url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

            # Create tasks for all legal pages to scrape concurrently
            async def scrape_legal_page(legal_path: str):
                """Scrape a single legal page, return identifiers or None on error"""
                legal_url = urljoin(base_url, legal_path)
                try:
                    return await self._scrape_single_page(page, legal_url)
                except (PlaywrightTimeoutError, Exception):
                    # Page not found, timeout, or other error
                    return {'siret': None, 'siren': None, 'tva': None}

            # Limit to MAX_LEGAL_PAGES_TO_CHECK and scrape all in parallel
            legal_paths_to_check = LEGAL_PATHS[:MAX_LEGAL_PAGES_TO_CHECK]
            results = await asyncio.gather(*[scrape_legal_page(path) for path in legal_paths_to_check])

            # Return first result with identifiers found
            for result in results:
                if any(result.values()):
                    return result

            # Return empty result if nothing found
            return {
                'siret': None,
                'siren': None,
                'tva': None,
            }

        finally:
            # Return context to pool instead of closing it
            await self._return_context_to_pool(context)

    async def scrape_urls(self, urls: List[str]) -> List[Dict[str, Optional[str]]]:
        """
        Scrape multiple URLs concurrently.

        Args:
            urls: List of URLs to scrape

        Returns:
            List of dictionaries with extracted identifiers
        """
        tasks = [self.scrape_url(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to empty results
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                processed_results.append({
                    'siret': None,
                    'siren': None,
                    'tva': None,
                    'error': str(result)
                })
            else:
                processed_results.append(result)

        return processed_results
