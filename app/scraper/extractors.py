"""Extractors for SIRET, SIREN, and TVA numbers from text content"""

import re
from typing import Dict, Optional, List
from app.config import SIRET_PATTERN, SIREN_PATTERN, TVA_PATTERN, BLACKLIST_SIRENS
from .validators import validate_siret, validate_siren, validate_tva, extract_siren_from_siret


def extract_siret_candidates(text: str) -> List[str]:
    """
    Extract all potential SIRET numbers from text.

    Args:
        text: Text content to search

    Returns:
        List of potential SIRET numbers (spaces removed)
    """
    if not text:
        return []

    candidates = re.findall(SIRET_PATTERN, text)
    # Remove all whitespace for validation
    return [re.sub(r'\s+', '', c) for c in candidates]


def extract_siren_candidates(text: str) -> List[str]:
    """
    Extract all potential SIREN numbers from text.

    Args:
        text: Text content to search

    Returns:
        List of potential SIREN numbers (spaces removed)
    """
    if not text:
        return []

    candidates = re.findall(SIREN_PATTERN, text)
    # Remove all whitespace for validation
    return [re.sub(r'\s+', '', c) for c in candidates]


def extract_tva_candidates(text: str) -> List[str]:
    """
    Extract all potential TVA numbers from text.

    Args:
        text: Text content to search

    Returns:
        List of potential TVA numbers (spaces removed, uppercase)
    """
    if not text:
        return []

    # Find TVA numbers (pattern allows spaces)
    candidates = re.findall(TVA_PATTERN, text, re.IGNORECASE)

    # Clean up candidates: remove spaces and uppercase
    cleaned = []
    for tva in candidates:
        tva_clean = re.sub(r'\s+', '', tva).upper()
        cleaned.append(tva_clean)

    return cleaned


def extract_identifiers(text: str) -> Dict[str, Optional[str]]:
    """
    Extract and validate SIRET, SIREN, and TVA numbers from text.

    This function searches for all three identifier types and validates them
    using the Luhn algorithm and other checks. It prioritizes SIRET over SIREN
    since SIRET contains SIREN information.

    Args:
        text: Text content to search (usually page content)

    Returns:
        Dictionary with keys 'siret', 'siren', 'tva' containing validated numbers or None
    """
    result = {
        "siret": None,
        "siren": None,
        "tva": None,
    }

    if not text:
        return result

    # Extract and validate SIRET
    siret_candidates = extract_siret_candidates(text)
    for candidate in siret_candidates:
        if validate_siret(candidate):
            # Check if SIREN is blacklisted
            siren_from_siret = extract_siren_from_siret(candidate)
            if siren_from_siret in BLACKLIST_SIRENS:
                continue  # Skip blacklisted hosting/agency

            result["siret"] = candidate
            # Extract SIREN from SIRET if not found separately
            if not result["siren"]:
                result["siren"] = siren_from_siret
            break

    # Extract and validate SIREN (if not already extracted from SIRET)
    if not result["siren"]:
        siren_candidates = extract_siren_candidates(text)
        for candidate in siren_candidates:
            # Skip if blacklisted
            if candidate in BLACKLIST_SIRENS:
                continue

            # Skip if it's part of a SIRET
            if any(candidate in siret for siret in siret_candidates):
                continue

            if validate_siren(candidate):
                result["siren"] = candidate
                break

    # Extract and validate TVA
    tva_candidates = extract_tva_candidates(text)
    for candidate in tva_candidates:
        if validate_tva(candidate):
            # Extract SIREN from TVA and check if blacklisted
            if len(candidate) >= 11:
                tva_siren = candidate[-9:]  # Last 9 digits
                if tva_siren in BLACKLIST_SIRENS:
                    continue  # Skip blacklisted hosting/agency

            result["tva"] = candidate
            # If we have TVA but no SIREN, extract SIREN from TVA
            if not result["siren"] and len(candidate) >= 11:
                tva_siren = candidate[-9:]  # Last 9 digits
                if validate_siren(tva_siren) and tva_siren not in BLACKLIST_SIRENS:
                    result["siren"] = tva_siren
            break

    return result


def search_in_priority_areas(page_content: str, priority_sections: List[str]) -> Dict[str, Optional[str]]:
    """
    Search for identifiers in priority sections of the page.

    This function searches in specific sections (like footer, legal mentions)
    before falling back to the full page content.

    Args:
        page_content: Full page content
        priority_sections: List of section contents ordered by priority

    Returns:
        Dictionary with extracted identifiers
    """
    # Try priority sections first
    for section in priority_sections:
        if section:
            identifiers = extract_identifiers(section)
            # If we found at least one identifier, return
            if any(identifiers.values()):
                return identifiers

    # Fall back to full page content
    return extract_identifiers(page_content)
