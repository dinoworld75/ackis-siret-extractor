"""Playwright-based web scraper for extracting SIRET/SIREN/TVA numbers"""

import asyncio
import random
from typing import Dict, Optional, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception, AsyncRetrying

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

    def __init__(self, proxy_manager: Optional[ProxyManager] = None,
                 navigation_timeout: Optional[int] = None,
                 page_load_timeout: Optional[int] = None,
                 max_retries: Optional[int] = None,
                 retry_delay: Optional[int] = None):
        """
        Initialize the Playwright scraper.

        Args:
            proxy_manager: ProxyManager instance for proxy rotation
            navigation_timeout: Custom navigation timeout in ms (overrides settings)
            page_load_timeout: Custom page load timeout in ms (overrides settings)
            max_retries: Custom max retry attempts (overrides settings)
            retry_delay: Custom retry delay in seconds (overrides settings)
        """
        self.proxy_manager = proxy_manager or ProxyManager()
        self.browser: Optional[Browser] = None
        self.playwright = None

        # Store custom settings or use defaults from config
        self.navigation_timeout = navigation_timeout if navigation_timeout is not None else settings.navigation_timeout
        self.page_load_timeout = page_load_timeout if page_load_timeout is not None else settings.page_load_timeout
        self.max_retries = max_retries if max_retries is not None else settings.max_retries
        self.retry_delay = retry_delay if retry_delay is not None else settings.retry_delay

    async def __aenter__(self):
        """Async context manager entry"""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()

    async def start(self) -> None:
        """Start the browser instance"""
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

    async def close(self) -> None:
        """Close the browser instance"""
        if self.browser:
            await self.browser.close()
            self.browser = None

        if self.playwright:
            await self.playwright.stop()
            self.playwright = None

    async def _create_context(self, proxy: Optional[str] = None) -> BrowserContext:
        """
        Create a new browser context with random user agent.

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
            timeout=self.navigation_timeout
        )

        # Wait for page to load
        try:
            await page.wait_for_load_state('networkidle', timeout=self.page_load_timeout)
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

    async def scrape_url(self, url: str, proxy: Optional[str] = None) -> Dict[str, Optional[str]]:
        """
        Scrape a URL and extract SIRET/SIREN/TVA numbers.
        Tries the main URL first, then legal pages if no identifiers found.

        Args:
            url: URL to scrape
            proxy: Optional proxy URL to use (overrides proxy_manager)

        Returns:
            Dictionary with extracted identifiers

        Raises:
            Exception: If scraping fails after retries
        """
        # Use AsyncRetrying for runtime retry configuration with instance variables
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=self.retry_delay, min=2, max=10),
            retry=retry_if_exception(should_retry_exception),
            reraise=True
        ):
            with attempt:
                # Use provided proxy, or fall back to proxy_manager
                if proxy is None and self.proxy_manager.is_enabled():
                    proxy = self.proxy_manager.get_next_proxy()

                context = await self._create_context(proxy=proxy)

                try:
                    page = await context.new_page()

                    # Try the main URL first
                    identifiers = await self._scrape_single_page(page, url)

                    # If we found identifiers, return immediately
                    if any(identifiers.values()):
                        return identifiers

                    # If no identifiers found, try legal pages sequentially
                    parsed_url = urlparse(url)
                    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

                    pages_checked = 1
                    for legal_path in LEGAL_PATHS:
                        if pages_checked >= MAX_LEGAL_PAGES_TO_CHECK:
                            break

                        legal_url = urljoin(base_url, legal_path)

                        try:
                            identifiers = await self._scrape_single_page(page, legal_url)
                            pages_checked += 1

                            # If we found identifiers, return immediately
                            if any(identifiers.values()):
                                return identifiers

                        except PlaywrightTimeoutError:
                            # Page not found or timeout, continue to next
                            pages_checked += 1
                            continue
                        except Exception:
                            # Other error, continue to next
                            pages_checked += 1
                            continue

                    # Return empty result if nothing found
                    return {
                        'siret': None,
                        'siren': None,
                        'tva': None,
                    }

                finally:
                    await context.close()

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
