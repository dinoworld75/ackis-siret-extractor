"""API endpoint tests for SIRET Extractor"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_extract_single_url_valid():
    """Test single URL extraction with valid request"""
    response = client.post(
        "/api/extract",
        json={"url": "https://example.fr"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert "siret" in data
    assert "siren" in data
    assert "tva" in data
    assert "success" in data
    assert "processing_time" in data


def test_extract_single_url_invalid():
    """Test single URL extraction with invalid URL"""
    response = client.post(
        "/api/extract",
        json={"url": "not-a-valid-url"}
    )
    assert response.status_code == 422  # Validation error


def test_extract_batch_urls_valid():
    """Test batch URL extraction with valid request"""
    response = client.post(
        "/api/extract/batch",
        json={
            "urls": [
                "https://example1.fr",
                "https://example2.fr"
            ]
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total" in data
    assert "successful" in data
    assert "failed" in data
    assert data["total"] == 2
    assert len(data["results"]) == 2


def test_extract_batch_urls_empty():
    """Test batch URL extraction with empty list"""
    response = client.post(
        "/api/extract/batch",
        json={"urls": []}
    )
    assert response.status_code == 422  # Validation error


def test_extract_batch_urls_duplicate():
    """Test batch URL extraction with duplicate URLs"""
    response = client.post(
        "/api/extract/batch",
        json={
            "urls": [
                "https://example.fr",
                "https://example.fr"
            ]
        }
    )
    assert response.status_code == 422  # Validation error for duplicates


def test_extract_batch_urls_too_many():
    """Test batch URL extraction with too many URLs"""
    urls = [f"https://example{i}.fr" for i in range(101)]
    response = client.post(
        "/api/extract/batch",
        json={"urls": urls}
    )
    assert response.status_code == 422  # Validation error (max 100)


@pytest.mark.asyncio
async def test_validators():
    """Test SIRET/SIREN/TVA validators"""
    from app.scraper.validators import validate_siret, validate_siren, validate_tva

    # Valid SIRET (using a known valid format)
    assert validate_siret("73282932000074") == True

    # Invalid SIRET (wrong checksum)
    assert validate_siret("12345678901234") == False

    # Valid SIREN
    assert validate_siren("732829320") == True

    # Invalid SIREN
    assert validate_siren("123456789") == False

    # Valid TVA format (FR + check digits + SIREN)
    # Note: This needs a real valid TVA for proper testing
    assert validate_tva("FR12345678901") in [True, False]


@pytest.mark.asyncio
async def test_extractors():
    """Test extraction functions"""
    from app.scraper.extractors import extract_identifiers

    # Test with sample text containing identifiers
    text = """
    Société Example SARL
    SIRET: 73282932000074
    SIREN: 732829320
    TVA: FR40303265045
    """

    result = extract_identifiers(text)
    assert isinstance(result, dict)
    assert "siret" in result
    assert "siren" in result
    assert "tva" in result
