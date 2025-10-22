"""
SIRET/SIREN/TVA extraction logic
"""
import re
from typing import List, Dict, Set
from validators import is_siret_valid, is_siren_valid, clean_number
from config import BLACKLIST_SIRENS

# Regex patterns
SIRET_REGEX = re.compile(r'\b(?:\d{3}\s*){2}\d{3}\s*\d{5}\b')
SIREN_REGEX = re.compile(r'\b(?:\d{3}\s*){3}\b')
TVA_REGEX = re.compile(r'\bFR[\s]?\d{2}[\s]?(?:\d{3}\s*){3}\b', re.IGNORECASE)
RCS_REGEX = re.compile(r'RCS\s+([A-ZÀ-Ÿ]+)\s+((?:\d{3}\s*){3})', re.IGNORECASE)

class Identifier:
    def __init__(self, siret: str = None, siren: str = None, tva: str = None):
        self.siret = siret
        self.siren = siren
        self.tva = tva
        self.valid = True

    def to_dict(self) -> Dict:
        return {
            'siret': self.siret,
            'siren': self.siren,
            'tva': self.tva,
            'valid': self.valid
        }

def extract_identifiers(text: str) -> List[Identifier]:
    """
    Extract SIRET/SIREN/TVA from text
    Returns list of Identifier objects
    """
    results: List[Identifier] = []
    seen: Set[str] = set()

    # 1. Extract SIRET (14 digits)
    for match in SIRET_REGEX.finditer(text):
        siret = clean_number(match.group(0))
        if siret not in seen and is_siret_valid(siret):
            siren = siret[:9]
            if siren not in BLACKLIST_SIRENS:
                results.append(Identifier(siret=siret, siren=siren))
                seen.add(siret)

    # 2. Extract TVA intracommunautaire
    for match in TVA_REGEX.finditer(text):
        tva = clean_number(match.group(0)).upper()
        siren = tva[4:13]  # FR + 2 digits + 9 digits SIREN
        if tva not in seen and is_siren_valid(siren):
            if siren not in BLACKLIST_SIRENS:
                results.append(Identifier(tva=tva, siren=siren))
                seen.add(tva)

    # 3. Extract standalone SIREN (9 digits)
    for match in SIREN_REGEX.finditer(text):
        siren = clean_number(match.group(0))
        # Don't add if already in SIRET or TVA
        already_have = any(r.siren == siren for r in results)
        if not already_have and siren not in seen and is_siren_valid(siren):
            if siren not in BLACKLIST_SIRENS:
                results.append(Identifier(siren=siren))
                seen.add(siren)

    # 4. Extract via RCS format (e.g., "RCS MARSEILLE 388 318 313")
    for match in RCS_REGEX.finditer(text):
        siren = clean_number(match.group(2))
        already_have = any(r.siren == siren for r in results)
        if not already_have and siren not in seen and is_siren_valid(siren):
            if siren not in BLACKLIST_SIRENS:
                results.append(Identifier(siren=siren))
                seen.add(siren)

    return results

def deduplicate_identifiers(identifiers: List[Identifier]) -> List[Identifier]:
    """Remove duplicate identifiers"""
    unique_map: Dict[str, Identifier] = {}

    for identifier in identifiers:
        key = identifier.siret or identifier.siren or identifier.tva or ''
        if key and key not in unique_map:
            unique_map[key] = identifier

    return list(unique_map.values())
