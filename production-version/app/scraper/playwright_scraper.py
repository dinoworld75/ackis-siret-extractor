"""Playwright-based web scraper for extracting SIRET/SIREN/TVA numbers"""

import asyncio
import random
from typing import Dict, Optional, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings, USER_AGENTS, SEARCH_SELECTORS, LEGAL_PATHS, MAX_LEGAL_PAGES_TO_CHECK
from .extractors import extract_identifiers, search_in_priority_areas
from .proxy_manager import ProxyManager
from urllib.parse import urljoin, urlparse


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
            proxy: Proxy URL to use for this context

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
            context_options['proxy'] = {'server': proxy}

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
        reraise=True
    )
    async def scrape_url(self, url: str) -> Dict[str, Optional[str]]:
        """
        Scrape a URL and extract SIRET/SIREN/TVA numbers.
        Tries the main URL first, then legal pages if no identifiers found.

        Args:
            url: URL to scrape

        Returns:
            Dictionary with extracted identifiers

        Raises:
            Exception: If scraping fails after retries
        """
        proxy = self.proxy_manager.get_next_proxy() if self.proxy_manager.is_enabled() else None
        context = await self._create_context(proxy=proxy)

        try:
            page = await context.new_page()

            # Try the main URL first
            identifiers = await self._scrape_single_page(page, url)

            # If we found identifiers, return immediately
            if any(identifiers.values()):
                return identifiers

            # If no identifiers found, try legal pages
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
