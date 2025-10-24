"""API routes for SIRET extraction endpoints"""

import time
import asyncio
import logging
import uuid
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from collections import deque
from fastapi import APIRouter, HTTPException, status, BackgroundTasks

from app.models import (
    ExtractionRequest,
    BatchExtractionRequest,
    ExtractionResult,
    BatchExtractionResponse,
    BatchStartResponse,
    HealthResponse,
    BatchProgress,
    LogEntry,
)
from app.scraper import PlaywrightScraper
from app.scraper.proxy_manager import ProxyManager
from app import __version__

logger = logging.getLogger(__name__)


router = APIRouter()


@dataclass
class BatchState:
    """Internal state for tracking batch processing"""
    batch_id: str
    total_urls: int
    completed: int = 0
    success: int = 0
    failed: int = 0
    in_progress: bool = True
    start_time: float = field(default_factory=time.time)
    results: List[ExtractionResult] = field(default_factory=list)
    recent_logs: deque = field(default_factory=lambda: deque(maxlen=50))


# In-memory storage for batch progress and results
# In production, use Redis or similar
batch_store: Dict[str, BatchState] = {}


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check_internal():
    """
    Internal health check endpoint for Docker healthcheck.

    Returns service status and version information.
    """
    return HealthResponse(
        status="healthy",
        version=__version__
    )


@router.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    External health check endpoint accessible via /api/health.

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
    if batch_id not in batch_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch ID {batch_id} not found"
        )

    state = batch_store[batch_id]
    current_time = time.time()
    elapsed = current_time - state.start_time

    # Calculate estimated time remaining using throughput-based formula
    # This accounts for parallel processing by measuring actual URLs/second rate
    estimated_remaining = None
    if state.completed > 0 and state.in_progress:
        throughput = state.completed / elapsed  # URLs processed per second
        remaining_urls = state.total_urls - state.completed
        estimated_remaining = remaining_urls / throughput if throughput > 0 else None

    return BatchProgress(
        batch_id=state.batch_id,
        total_urls=state.total_urls,
        completed=state.completed,
        success=state.success,
        failed=state.failed,
        in_progress=state.in_progress,
        start_time=state.start_time,
        elapsed_time=elapsed,
        estimated_time_remaining=estimated_remaining,
        recent_logs=list(state.recent_logs)  # Convert deque to list for JSON serialization
    )


async def process_batch_background(
    batch_id: str,
    urls: List[str],
    concurrent_workers: int,
    proxy_manager: Optional[ProxyManager]
):
    """Background task to process batch URLs"""
    state = batch_store[batch_id]

    # Create semaphore to limit concurrent workers
    semaphore = asyncio.Semaphore(concurrent_workers)

    # Create a SINGLE shared scraper for the entire batch (reuses browser)
    scraper = PlaywrightScraper()
    await scraper.start()

    # Pre-assign proxies to workers for consistent distribution
    worker_proxies = {}
    if proxy_manager and proxy_manager.proxy_list:
        for worker_id in range(concurrent_workers):
            proxy_idx = worker_id % len(proxy_manager.proxy_list)
            worker_proxies[worker_id] = proxy_manager.proxy_list[proxy_idx]
            logger.info(f"[Worker {worker_id}] Assigned proxy: {worker_proxies[worker_id][:50]}")

    async def process_url_with_semaphore(url: str, index: int) -> ExtractionResult:
        """Process a single URL with semaphore to limit concurrency"""
        async with semaphore:
            worker_id = index % concurrent_workers
            start_time = time.time()

            # Get assigned proxy for this worker
            proxy_used = worker_proxies.get(worker_id) if worker_proxies else None
            proxy_display = f"Proxy: {proxy_used[:20]}..." if proxy_used else "No proxy"
            logger.info(f"[Worker {worker_id}] Processing URL {index + 1}/{len(urls)}: {url} ({proxy_display})")

            # Add log entry for real-time streaming
            state.recent_logs.append(LogEntry(
                timestamp=time.time(),
                url=url,
                status="processing",
                message=f"Worker {worker_id} processing ({proxy_display})",
                worker_id=worker_id
            ))

            try:
                # Use shared scraper with assigned proxy (no browser launch overhead)
                identifiers = await scraper.scrape_url(url, proxy=proxy_used)

                processing_time = time.time() - start_time

                # Check if we found at least one identifier
                success = any(identifiers.values())
                has_data = any(identifiers.values())
                error = None if has_data else "No valid identifiers found"
                status_str = "success" if success else ("no_data" if not has_data else "error")

                result = ExtractionResult(
                    url=url,
                    siret=identifiers.get('siret'),
                    siren=identifiers.get('siren'),
                    tva=identifiers.get('tva'),
                    success=success,
                    status=status_str,
                    error=error,
                    processing_time=round(processing_time, 3),
                    worker_id=worker_id,
                    proxy_used=proxy_used[:50] if proxy_used else None  # Truncate for display
                )

                status_emoji = "✓" if success else ("⚠" if status_str == "no_data" else "✗")
                logger.info(f"[Worker {worker_id}] {status_emoji} Completed {url} in {processing_time:.2f}s")

                # Add completion log entry
                state.recent_logs.append(LogEntry(
                    timestamp=time.time(),
                    url=url,
                    status=status_str,
                    message=f"{status_emoji} Completed in {processing_time:.2f}s",
                    worker_id=worker_id
                ))

                # Update progress
                state.completed += 1
                state.results.append(result)
                if success:
                    state.success += 1
                else:
                    state.failed += 1

                return result

            except Exception as e:
                processing_time = time.time() - start_time
                error_msg = str(e)
                logger.error(f"[Worker {worker_id}] ✗ Error processing {url}: {error_msg}")

                # Add error log entry
                state.recent_logs.append(LogEntry(
                    timestamp=time.time(),
                    url=url,
                    status="error",
                    message=f"✗ Error: {error_msg[:100]}",  # Truncate long errors
                    worker_id=worker_id
                ))

                # Update progress
                state.completed += 1
                state.failed += 1

                result = ExtractionResult(
                    url=url,
                    siret=None,
                    siren=None,
                    tva=None,
                    success=False,
                    status="error",
                    error=error_msg,
                    processing_time=round(processing_time, 3),
                    worker_id=worker_id,
                    proxy_used=proxy_used[:50] if proxy_used else None
                )
                state.results.append(result)
                return result

    try:
        # Process all URLs concurrently with limited workers
        tasks = [process_url_with_semaphore(url, i) for i, url in enumerate(urls)]
        await asyncio.gather(*tasks)

        # Mark batch as complete
        state.in_progress = False

        batch_duration = time.time() - state.start_time
        logger.info(f"[Batch Extract] Completed {len(urls)} URLs in {batch_duration:.2f}s ({batch_duration/len(urls):.2f}s per URL avg) (Batch ID: {batch_id})")
        logger.info(f"[Batch Extract] Results: {state.success} success, {state.failed} failed")
    finally:
        # Always close the shared scraper to clean up browser resources
        await scraper.close()
        logger.info(f"[Batch Extract] Cleaned up browser resources for batch {batch_id}")


@router.post("/api/extract/batch", response_model=BatchStartResponse, tags=["Extraction"])
async def extract_batch_urls(request: BatchExtractionRequest, background_tasks: BackgroundTasks):
    """
    Start batch extraction of SIRET, SIREN, and TVA numbers from multiple URLs.

    This endpoint starts background processing and returns immediately with a batch_id.
    Use the batch_id to:
    - Poll /api/extract/batch/{batch_id}/progress for real-time progress
    - Retrieve /api/extract/batch/{batch_id}/results when complete

    Args:
        request: BatchExtractionRequest with list of URLs, concurrent_workers, and optional proxies
        background_tasks: FastAPI BackgroundTasks for async processing

    Returns:
        BatchStartResponse with batch_id for tracking
    """
    urls = [str(url) for url in request.urls]
    concurrent_workers = request.concurrent_workers

    # Generate unique batch ID
    batch_id = str(uuid.uuid4())

    # Initialize batch state
    batch_store[batch_id] = BatchState(
        batch_id=batch_id,
        total_urls=len(urls)
    )

    logger.info(f"[Batch Extract] Starting batch {batch_id}: {len(urls)} URLs with {concurrent_workers} concurrent workers")

    # Setup proxy manager if proxies provided
    proxy_manager = None
    if request.proxies and len(request.proxies) > 0:
        proxy_list = [proxy.to_url() for proxy in request.proxies]
        proxy_manager = ProxyManager(proxy_list=proxy_list)
        logger.info(f"[Batch Extract] Using {len(proxy_list)} proxies for rotation")
    else:
        logger.info("[Batch Extract] No proxies configured, using direct connection")

    # Start background processing
    background_tasks.add_task(
        process_batch_background,
        batch_id,
        urls,
        concurrent_workers,
        proxy_manager
    )

    return BatchStartResponse(
        batch_id=batch_id,
        message="Batch processing started",
        total_urls=len(urls)
    )


@router.get("/api/extract/batch/{batch_id}/results", response_model=BatchExtractionResponse, tags=["Extraction"])
async def get_batch_results(batch_id: str):
    """
    Get the results of a completed batch extraction job.

    Args:
        batch_id: Unique batch ID returned from batch extraction request

    Returns:
        BatchExtractionResponse with all extraction results

    Raises:
        HTTPException: If batch_id not found or batch still in progress
    """
    if batch_id not in batch_store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch ID {batch_id} not found"
        )

    state = batch_store[batch_id]

    if state.in_progress:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch {batch_id} is still in progress. Use /progress endpoint to check status."
        )

    return BatchExtractionResponse(
        batch_id=state.batch_id,
        results=state.results,
        total=len(state.results),
        successful=state.success,
        failed=state.failed
    )
