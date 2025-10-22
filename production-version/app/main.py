"""FastAPI application entry point for SIRET Extractor API"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import settings
from app import __version__


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
    allow_origins=["*"],  # In production, specify exact origins
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
    print(f"Starting SIRET Extractor API v{__version__}")
    print(f"Debug mode: {settings.debug}")
    print(f"Max concurrent workers: {settings.max_concurrent_workers}")
    print(f"Proxy rotation enabled: {settings.proxy_rotation_enabled}")
    if settings.proxy_rotation_enabled:
        print(f"Number of proxies: {len(settings.proxy_list)}")


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
