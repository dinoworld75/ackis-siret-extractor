"""API routes for SIRET extraction endpoints"""

import time
import asyncio
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status

from app.models import (
    ExtractionRequest,
    BatchExtractionRequest,
    ExtractionResult,
    BatchExtractionResponse,
    HealthResponse,
)
from app.scraper import PlaywrightScraper
from app.scraper.proxy_manager import ProxyManager
from app import __version__

logger = logging.getLogger(__name__)


router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns service status and version information.
    """
    return HealthResponse(
        status="healthy",
        version=__version__
    )


@router.post("/api/extract", response_model=ExtractionResult, tags=["Extraction"])
async def extract_single_url(request: ExtractionRequest):
    """
    Extract SIRET, SIREN, and TVA numbers from a single URL.

    This endpoint scrapes the provided URL and searches for French company
    identifiers using Playwright. It validates all numbers using the Luhn
    algorithm and other checks.

    Args:
        request: ExtractionRequest with URL to process

    Returns:
        ExtractionResult with found identifiers

    Raises:
        HTTPException: If scraping fails
    """
    start_time = time.time()

    try:
        async with PlaywrightScraper() as scraper:
            identifiers = await scraper.scrape_url(str(request.url))

        processing_time = time.time() - start_time

        # Check if we found at least one identifier
        success = any(identifiers.values())
        has_data = any(identifiers.values())
        error = None if has_data else "No valid identifiers found"
        status = "success" if success else ("no_data" if not has_data else "error")

        return ExtractionResult(
            url=str(request.url),
            siret=identifiers.get('siret'),
            siren=identifiers.get('siren'),
            tva=identifiers.get('tva'),
            success=success,
            status=status,
            error=error,
            processing_time=round(processing_time, 3),
            worker_id=None,  # Single URL doesn't use workers
            proxy_used=None  # Single URL endpoint doesn't use proxies
        )

    except Exception as e:
        processing_time = time.time() - start_time

        return ExtractionResult(
            url=str(request.url),
            siret=None,
            siren=None,
            tva=None,
            success=False,
            status="error",
            error=str(e),
            processing_time=round(processing_time, 3),
            worker_id=None,
            proxy_used=None
        )


@router.post("/api/extract/batch", response_model=BatchExtractionResponse, tags=["Extraction"])
async def extract_batch_urls(request: BatchExtractionRequest):
    """
    Extract SIRET, SIREN, and TVA numbers from multiple URLs concurrently.

    This endpoint processes multiple URLs in parallel using a worker pool.
    Each URL is scraped independently and results are returned for all URLs.

    Args:
        request: BatchExtractionRequest with list of URLs, concurrent_workers, and optional proxies

    Returns:
        BatchExtractionResponse with results for all URLs
    """
    urls = [str(url) for url in request.urls]
    concurrent_workers = request.concurrent_workers

    logger.info(f"[Batch Extract] Processing {len(urls)} URLs with {concurrent_workers} concurrent workers")

    # Setup proxy manager if proxies provided
    proxy_manager = None
    if request.proxies and len(request.proxies) > 0:
        proxy_list = [proxy.to_url() for proxy in request.proxies]
        proxy_manager = ProxyManager(proxy_list=proxy_list)
        logger.info(f"[Batch Extract] Using {len(proxy_list)} proxies for rotation")
    else:
        logger.info("[Batch Extract] No proxies configured, using direct connection")

    # Create semaphore to limit concurrent workers
    semaphore = asyncio.Semaphore(concurrent_workers)

    async def process_url_with_semaphore(url: str, index: int) -> ExtractionResult:
        """Process a single URL with semaphore to limit concurrency"""
        async with semaphore:
            worker_id = index % concurrent_workers
            start_time = time.time()

            # Get proxy to use for this request
            proxy_used = None
            if proxy_manager:
                proxy_used = proxy_manager.get_next_proxy()
                logger.info(f"[Worker {worker_id}] Processing URL {index + 1}/{len(urls)}: {url} (Proxy: {proxy_used[:20] if proxy_used else 'None'}...)")
            else:
                logger.info(f"[Worker {worker_id}] Processing URL {index + 1}/{len(urls)}: {url} (No proxy)")

            try:
                # Create scraper instance with proxy manager for this worker
                async with PlaywrightScraper(proxy_manager=proxy_manager) as scraper:
                    identifiers = await scraper.scrape_url(url)

                processing_time = time.time() - start_time

                # Check if we found at least one identifier
                success = any(identifiers.values())
                has_data = any(identifiers.values())
                error = None if has_data else "No valid identifiers found"
                status = "success" if success else ("no_data" if not has_data else "error")

                result = ExtractionResult(
                    url=url,
                    siret=identifiers.get('siret'),
                    siren=identifiers.get('siren'),
                    tva=identifiers.get('tva'),
                    success=success,
                    status=status,
                    error=error,
                    processing_time=round(processing_time, 3),
                    worker_id=worker_id,
                    proxy_used=proxy_used[:50] if proxy_used else None  # Truncate for display
                )

                status_emoji = "✓" if success else ("⚠" if status == "no_data" else "✗")
                logger.info(f"[Worker {worker_id}] {status_emoji} Completed {url} in {processing_time:.2f}s")

                return result

            except Exception as e:
                processing_time = time.time() - start_time
                logger.error(f"[Worker {worker_id}] ✗ Error processing {url}: {str(e)}")

                return ExtractionResult(
                    url=url,
                    siret=None,
                    siren=None,
                    tva=None,
                    success=False,
                    status="error",
                    error=str(e),
                    processing_time=round(processing_time, 3),
                    worker_id=worker_id,
                    proxy_used=proxy_used[:50] if proxy_used else None
                )

    # Process all URLs concurrently with limited workers
    batch_start_time = time.time()
    tasks = [process_url_with_semaphore(url, i) for i, url in enumerate(urls)]
    results = await asyncio.gather(*tasks)
    batch_duration = time.time() - batch_start_time

    # Calculate summary statistics
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful

    logger.info(f"[Batch Extract] Completed {len(urls)} URLs in {batch_duration:.2f}s ({batch_duration/len(urls):.2f}s per URL avg)")
    logger.info(f"[Batch Extract] Results: {successful} success, {failed} failed")

    return BatchExtractionResponse(
        results=results,
        total=len(results),
        successful=successful,
        failed=failed
    )
