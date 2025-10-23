"""API routes for SIRET extraction endpoints"""

import time
import asyncio
import logging
import uuid
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, status

from app.models import (
    ExtractionRequest,
    BatchExtractionRequest,
    ExtractionResult,
    BatchExtractionResponse,
    HealthResponse,
    BatchProgress,
)
from app.scraper import PlaywrightScraper
from app.scraper.proxy_manager import ProxyManager
from app import __version__

logger = logging.getLogger(__name__)


router = APIRouter()

# In-memory storage for batch progress
# In production, use Redis or similar
batch_progress_store: Dict[str, BatchProgress] = {}


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


@router.get("/api/extract/batch/{batch_id}/progress", response_model=BatchProgress, tags=["Extraction"])
async def get_batch_progress(batch_id: str):
    """
    Get real-time progress for a batch extraction job.

    Args:
        batch_id: Unique batch ID returned from batch extraction request

    Returns:
        BatchProgress with current progress information

    Raises:
        HTTPException: If batch_id not found
    """
    if batch_id not in batch_progress_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch ID {batch_id} not found"
        )

    progress = batch_progress_store[batch_id]
    current_time = time.time()
    elapsed = current_time - progress.start_time

    # Calculate estimated time remaining
    estimated_remaining = None
    if progress.completed > 0 and progress.in_progress:
        avg_time_per_url = elapsed / progress.completed
        remaining_urls = progress.total_urls - progress.completed
        estimated_remaining = avg_time_per_url * remaining_urls

    # Update elapsed time and estimate
    progress.elapsed_time = elapsed
    progress.estimated_time_remaining = estimated_remaining

    return progress


@router.post("/api/extract/batch", response_model=BatchExtractionResponse, tags=["Extraction"])
async def extract_batch_urls(request: BatchExtractionRequest):
    """
    Extract SIRET, SIREN, and TVA numbers from multiple URLs concurrently.

    This endpoint processes multiple URLs in parallel using a worker pool.
    Each URL is scraped independently and results are returned for all URLs.

    Args:
        request: BatchExtractionRequest with list of URLs, concurrent_workers, and optional proxies

    Returns:
        BatchExtractionResponse with results for all URLs, including batch_id for progress tracking
    """
    urls = [str(url) for url in request.urls]
    concurrent_workers = request.concurrent_workers

    # Generate unique batch ID
    batch_id = str(uuid.uuid4())
    batch_start_time = time.time()

    # Initialize progress tracking
    batch_progress_store[batch_id] = BatchProgress(
        batch_id=batch_id,
        total_urls=len(urls),
        completed=0,
        success=0,
        failed=0,
        in_progress=True,
        start_time=batch_start_time,
        elapsed_time=0.0,
        estimated_time_remaining=None
    )

    logger.info(f"[Batch Extract] Processing {len(urls)} URLs with {concurrent_workers} concurrent workers (Batch ID: {batch_id})")

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

                # Update progress
                progress = batch_progress_store[batch_id]
                progress.completed += 1
                if success:
                    progress.success += 1
                else:
                    progress.failed += 1

                return result

            except Exception as e:
                processing_time = time.time() - start_time
                logger.error(f"[Worker {worker_id}] ✗ Error processing {url}: {str(e)}")

                # Update progress
                progress = batch_progress_store[batch_id]
                progress.completed += 1
                progress.failed += 1

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
    tasks = [process_url_with_semaphore(url, i) for i, url in enumerate(urls)]
    results = await asyncio.gather(*tasks)
    batch_duration = time.time() - batch_start_time

    # Mark batch as complete
    progress = batch_progress_store[batch_id]
    progress.in_progress = False
    progress.elapsed_time = batch_duration

    # Calculate summary statistics
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful

    logger.info(f"[Batch Extract] Completed {len(urls)} URLs in {batch_duration:.2f}s ({batch_duration/len(urls):.2f}s per URL avg) (Batch ID: {batch_id})")
    logger.info(f"[Batch Extract] Results: {successful} success, {failed} failed")

    return BatchExtractionResponse(
        batch_id=batch_id,
        results=results,
        total=len(results),
        successful=successful,
        failed=failed
    )
