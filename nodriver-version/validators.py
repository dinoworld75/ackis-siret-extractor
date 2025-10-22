"""
SIRET/SIREN validation using Luhn algorithm
"""
import re
from typing import Optional

def is_siret_valid(siret: str) -> bool:
    """
    Validate SIRET using Luhn algorithm
    Special case for La Poste (356000000)
    """
    cleaned = siret.replace(' ', '')
    if len(cleaned) != 14 or not cleaned.isdigit():
        return False

    # Special case: La Poste
    if cleaned[:9] == '356000000':
        total = sum(int(char) for char in cleaned)
        return total % 5 == 0

    # Standard Luhn algorithm
    total = 0
    for i, char in enumerate(cleaned):
        digit = int(char)
        if i % 2 == 0:  # Even index
            mult = digit * 2
            total += mult - 9 if mult > 9 else mult
        else:
            total += digit

    return total % 10 == 0

def is_siren_valid(siren: str) -> bool:
    """
    Validate SIREN using Luhn algorithm
    """
    cleaned = siren.replace(' ', '')
    if len(cleaned) != 9 or not cleaned.isdigit():
        return False

    total = 0
    for i, char in enumerate(cleaned):
        digit = int(char)
        if i % 2 == 1:  # Odd index (different from SIRET!)
            tmp = digit * 2
            total += tmp - 9 if tmp > 9 else tmp
        else:
            total += digit

    return total % 10 == 0

def clean_number(text: str) -> str:
    """Remove spaces from number"""
    return text.replace(' ', '').replace('\u00a0', '')  # Also remove non-breaking spaces
