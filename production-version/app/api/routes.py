"""API routes for SIRET extraction endpoints"""

import time
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
from app import __version__


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
        error = None if success else "No valid identifiers found"

        return ExtractionResult(
            url=str(request.url),
            siret=identifiers.get('siret'),
            siren=identifiers.get('siren'),
            tva=identifiers.get('tva'),
            success=success,
            error=error,
            processing_time=round(processing_time, 3)
        )

    except Exception as e:
        processing_time = time.time() - start_time

        return ExtractionResult(
            url=str(request.url),
            siret=None,
            siren=None,
            tva=None,
            success=False,
            error=str(e),
            processing_time=round(processing_time, 3)
        )


@router.post("/api/extract/batch", response_model=BatchExtractionResponse, tags=["Extraction"])
async def extract_batch_urls(request: BatchExtractionRequest):
    """
    Extract SIRET, SIREN, and TVA numbers from multiple URLs concurrently.

    This endpoint processes multiple URLs in parallel using a worker pool.
    Each URL is scraped independently and results are returned for all URLs.

    Args:
        request: BatchExtractionRequest with list of URLs

    Returns:
        BatchExtractionResponse with results for all URLs
    """
    results: List[ExtractionResult] = []

    async with PlaywrightScraper() as scraper:
        for url in request.urls:
            start_time = time.time()

            try:
                identifiers = await scraper.scrape_url(str(url))
                processing_time = time.time() - start_time

                # Check if we found at least one identifier
                success = any(identifiers.values())
                error = None if success else "No valid identifiers found"

                results.append(ExtractionResult(
                    url=str(url),
                    siret=identifiers.get('siret'),
                    siren=identifiers.get('siren'),
                    tva=identifiers.get('tva'),
                    success=success,
                    error=error,
                    processing_time=round(processing_time, 3)
                ))

            except Exception as e:
                processing_time = time.time() - start_time

                results.append(ExtractionResult(
                    url=str(url),
                    siret=None,
                    siren=None,
                    tva=None,
                    success=False,
                    error=str(e),
                    processing_time=round(processing_time, 3)
                ))

    # Calculate summary statistics
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful

    return BatchExtractionResponse(
        results=results,
        total=len(results),
        successful=successful,
        failed=failed
    )
