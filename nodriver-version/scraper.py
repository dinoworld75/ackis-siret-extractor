"""
Main scraper using nodriver with fallback and worker support
"""
import asyncio
import nodriver as uc
from typing import Optional, List, Dict, Tuple
from urllib.parse import urljoin, urlparse
import time
import random

from config import CONFIG, LEGAL_KEYWORDS, LEGAL_PATHS, USER_AGENTS
from extractors import extract_identifiers, deduplicate_identifiers, Identifier

class ScrapeResult:
    def __init__(self, url: str):
        self.url = url
        self.final_url: Optional[str] = None
        self.status = 'error'  # success, no_data, error, timeout, antibot
        self.identifiers: List[Identifier] = []
        self.found_on_page: Optional[str] = None
        self.legal_pages_checked: List[str] = []
        self.error: Optional[str] = None
        self.duration: float = 0
        self.worker_id: Optional[int] = None
        self.used_headless: bool = True

    def to_dict(self) -> Dict:
        return {
            'url': self.url,
            'final_url': self.final_url or self.url,
            'status': self.status,
            'sirets': ', '.join([i.siret for i in self.identifiers if i.siret]),
            'sirens': ', '.join([i.siren for i in self.identifiers if i.siren and not i.siret]),
            'tvas': ', '.join([i.tva for i in self.identifiers if i.tva]),
            'found_on_page': self.found_on_page or '',
            'legal_pages_checked': len(self.legal_pages_checked),
            'error': self.error or '',
            'duration_ms': int(self.duration * 1000),
            'worker_id': self.worker_id,
            'headless': self.used_headless,
        }

async def extract_page_content(tab: uc.Tab) -> str:
    """Extract text content from page (remove scripts, styles, etc.)"""
    try:
        # Get text content directly - MUST use IIFE and return_by_value=True
        text = await tab.evaluate("(() => document.body?.innerText || '')()", return_by_value=True)
        return text if text else ""
    except Exception as e:
        return ""

async def find_legal_links(tab: uc.Tab, base_url: str) -> List[str]:
    """Find legal page links in footer/header/nav"""
    try:
        # Use JSON.stringify to pass keywords safely as string, then parse in JS
        keywords_json = str(LEGAL_KEYWORDS).replace("'", '"')
        links_js = f"""
            (() => {{
                const keywords = {keywords_json};
                const containers = document.querySelectorAll(
                    'footer, [role="contentinfo"], .footer, header, nav, .legal-links'
                );
                const allLinks = [];

                containers.forEach(container => {{
                    const anchors = container.querySelectorAll('a[href]');
                    anchors.forEach(a => {{
                        const href = a.href;
                        const text = (a.textContent || '').toLowerCase();
                        const combined = href.toLowerCase() + ' ' + text;

                        if (keywords.some(kw => combined.includes(kw))) {{
                            allLinks.push(href);
                        }}
                    }});
                }});

                return [...new Set(allLinks)];
            }})()
        """

        links = await tab.evaluate(links_js, return_by_value=True)

        # Handle None return
        if not links or not isinstance(links, list):
            return []

        # Filter same domain only
        base_hostname = urlparse(base_url).hostname
        filtered = []
        for link in links:
            try:
                link_hostname = urlparse(link).hostname
                if link_hostname == base_hostname:
                    filtered.append(link)
            except:
                continue

        return filtered
    except Exception as e:
        return []

async def detect_antibot(tab: uc.Tab) -> bool:
    """Detect if page has anti-bot challenge"""
    try:
        text = await tab.evaluate("(() => document.body?.textContent?.toLowerCase() || '')()", return_by_value=True)

        # Handle None return
        if not text:
            return False

        # Cloudflare patterns
        cloudflare = [
            'checking your browser',
            'just a moment',
            'cloudflare ray id',
            'cf-browser-verification',
        ]

        # Generic antibot
        antibot = [
            'access denied',
            'you have been blocked',
            'verify you are human',
            'security check',
        ]

        if any(p in text for p in cloudflare + antibot):
            return True

        # Check for captcha iframes
        has_captcha = await tab.evaluate("""
            (() => {
                return !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], form#challenge-form');
            })()
        """, return_by_value=True)

        return bool(has_captcha)
    except:
        return False

async def scrape_site(
    url: str,
    worker_id: int,
    proxy: Optional[str] = None,
    headless: bool = True,
    retry_non_headless: bool = True
) -> ScrapeResult:
    """
    Scrape a single site using nodriver

    Features:
    - Cross-domain redirect tracking
    - Headless/non-headless fallback
    - Multi-page strategy (homepage → paths → footer links)
    - Anti-bot detection with retry
    """
    start_time = time.time()
    result = ScrapeResult(url)
    result.worker_id = worker_id
    result.used_headless = headless

    browser: Optional[uc.Browser] = None

    try:
        print(f"[Worker {worker_id}] Scraping: {url} (headless={headless})")

        # Launch browser with nodriver
        browser_config = {
            'headless': headless,
            'user_data_dir': None,  # Fresh profile each time
        }

        if proxy:
            browser_config['proxy'] = proxy
            print(f"[Worker {worker_id}] Using proxy: {proxy}")

        browser = await uc.start(**browser_config)
        tab = await browser.get(url, new_tab=False)

        # Wait for page load (nodriver handles this better than Playwright)
        await asyncio.sleep(2)  # Small wait for SPA rendering

        # Track final URL (cross-domain redirects)
        final_url = tab.url
        initial_hostname = urlparse(url).hostname
        final_hostname = urlparse(final_url).hostname

        if initial_hostname != final_hostname:
            print(f"[Worker {worker_id}]   → Cross-domain redirect: {initial_hostname} → {final_hostname}")
            result.final_url = final_url

        # Detect anti-bot
        is_antibot = await detect_antibot(tab)
        if is_antibot:
            print(f"[Worker {worker_id}]   ✗ Anti-bot detected")

            # Fallback to non-headless if enabled and we were in headless
            if headless and retry_non_headless:
                print(f"[Worker {worker_id}]   → Retrying in non-headless mode...")
                await browser.stop()
                return await scrape_site(url, worker_id, proxy, headless=False, retry_non_headless=False)

            result.status = 'antibot'
            result.error = 'Anti-bot challenge detected'
            return result

        base_url = final_url

        # 1. Check homepage
        homepage_content = await extract_page_content(tab)
        homepage_ids = extract_identifiers(homepage_content)

        if homepage_ids:
            result.identifiers.extend(homepage_ids)
            result.found_on_page = base_url
            result.legal_pages_checked.append(base_url)

        # 2. Try standard legal paths
        if not result.identifiers:
            for path in LEGAL_PATHS[:CONFIG['max_legal_pages_to_check']]:
                try:
                    legal_url = urljoin(base_url, path)
                    await tab.get(legal_url)
                    await asyncio.sleep(1)

                    # Check if page exists (not 404)
                    status_check = await tab.evaluate("(() => (document.title || '').toLowerCase())()", return_by_value=True)
                    if status_check and ('404' in status_check or 'not found' in status_check):
                        continue

                    result.legal_pages_checked.append(legal_url)
                    content = await extract_page_content(tab)
                    ids = extract_identifiers(content)

                    if ids:
                        result.identifiers.extend(ids)
                        result.found_on_page = legal_url
                        break
                except:
                    continue

        # 3. Find links in footer/header
        if not result.identifiers:
            await tab.get(base_url)
            await asyncio.sleep(1)

            footer_links = await find_legal_links(tab, base_url)
            print(f"[Worker {worker_id}]   → Found {len(footer_links)} potential legal links")

            for link in footer_links[:CONFIG['max_legal_pages_to_check']]:
                try:
                    await tab.get(link)
                    await asyncio.sleep(1)

                    result.legal_pages_checked.append(link)
                    content = await extract_page_content(tab)
                    ids = extract_identifiers(content)

                    if ids:
                        result.identifiers.extend(ids)
                        result.found_on_page = link
                        break
                except:
                    continue

        # Deduplicate
        result.identifiers = deduplicate_identifiers(result.identifiers)
        result.status = 'success' if result.identifiers else 'no_data'

        # Display result
        if result.status == 'success':
            summary_parts = []
            for id in result.identifiers:
                if id.siret:
                    summary_parts.append(f"SIRET: {id.siret}")
                if id.siren and not id.siret:
                    summary_parts.append(f"SIREN: {id.siren}")
                if id.tva:
                    summary_parts.append(f"TVA: {id.tva}")
            summary = ' | '.join(summary_parts)
            print(f"[Worker {worker_id}]   ✓ {summary}")
        else:
            print(f"[Worker {worker_id}]   ⚠ No data (checked {len(result.legal_pages_checked)} pages)")

    except asyncio.TimeoutError:
        result.status = 'timeout'
        result.error = 'Page timeout'
        print(f"[Worker {worker_id}]   ✗ Timeout")

    except Exception as e:
        result.status = 'error'
        result.error = str(e)
        print(f"[Worker {worker_id}]   ✗ Error: {e}")

    finally:
        if browser:
            try:
                await browser.stop()
            except:
                pass

        result.duration = time.time() - start_time

    return result
