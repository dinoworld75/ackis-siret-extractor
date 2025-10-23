"""FastAPI application entry point for SIRET Extractor API"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
import logging

from app.api.routes import router
from app.config import settings
from app import __version__
from app.scraper.proxy_loader import load_proxies_from_csv
from app.scraper.proxy_manager import ProxyManager, distribute_proxies_to_workers

logger = logging.getLogger(__name__)

# Global proxy managers for workers
proxy_managers: List[ProxyManager] = []
loaded_proxies: List[str] = []


def get_proxy_manager(worker_id: int = 0) -> Optional[ProxyManager]:
    """
    Get a proxy manager for a specific worker.

    Args:
        worker_id: Worker ID (0-based index)

    Returns:
        ProxyManager instance or None if not available
    """
    if 0 <= worker_id < len(proxy_managers):
        return proxy_managers[worker_id]
    return None


def get_proxy_stats() -> dict:
    """
    Get statistics about proxy usage.

    Returns:
        Dictionary with proxy statistics
    """
    return {
        "total_proxies": len(loaded_proxies),
        "proxies_per_worker": settings.proxies_per_worker,
        "num_workers": len(proxy_managers),
        "proxy_rotation_enabled": len(loaded_proxies) > 0
    }


# Create FastAPI app
app = FastAPI(
    title="SIRET Extractor API",
    description="Extract SIRET, SIREN, and TVA numbers from French company websites",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.debug else "An error occurred"
        }
    )


@app.on_event("startup")
async def startup_event():
    """Actions to perform on application startup"""
    global proxy_managers, loaded_proxies

    logger.info(f"Starting SIRET Extractor API v{__version__}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Max concurrent workers: {settings.max_concurrent_workers}")

    # Load proxies from proxy.csv
    try:
        loaded_proxies = load_proxies_from_csv("proxy.csv")
        if loaded_proxies:
            logger.info(f"Loaded {len(loaded_proxies)} proxies from proxy.csv")

            # Distribute proxies to workers
            proxy_managers = distribute_proxies_to_workers(
                proxy_list=loaded_proxies,
                num_workers=settings.max_concurrent_workers,
                proxies_per_worker=settings.proxies_per_worker
            )
            logger.info(f"Distributed proxies among {len(proxy_managers)} workers")
        else:
            logger.warning("No proxies loaded - running without proxy rotation")
            # Create empty proxy managers for workers
            proxy_managers = [ProxyManager(proxy_list=[], worker_id=i)
                            for i in range(settings.max_concurrent_workers)]
    except Exception as e:
        logger.error(f"Error loading proxies: {e}")
        logger.warning("Continuing without proxies")
        proxy_managers = [ProxyManager(proxy_list=[], worker_id=i)
                        for i in range(settings.max_concurrent_workers)]
        loaded_proxies = []

    logger.info(f"Proxy rotation enabled: {len(loaded_proxies) > 0}")
    logger.info("API ready to accept requests")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions to perform on application shutdown"""
    print("Shutting down SIRET Extractor API")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        workers=1 if settings.debug else settings.api_workers,
    )
