"""Validators for SIRET, SIREN, and TVA numbers using Luhn algorithm"""

import re
from typing import Optional
from app.config import SIRET_LENGTH, SIREN_LENGTH, TVA_PREFIX, TVA_LENGTH


def luhn_checksum(number: str) -> bool:
    """
    Validate a number using the Luhn algorithm.

    Args:
        number: String of digits to validate

    Returns:
        True if the number passes Luhn validation, False otherwise
    """
    def digits_of(n: str) -> list:
        return [int(d) for d in n]

    digits = digits_of(number)
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]

    checksum = sum(odd_digits)
    for d in even_digits:
        checksum += sum(digits_of(str(d * 2)))

    return checksum % 10 == 0


def validate_siret(siret: str) -> bool:
    """
    Validate a SIRET number.

    A SIRET number is 14 digits and must pass Luhn validation.

    Args:
        siret: SIRET number to validate

    Returns:
        True if valid, False otherwise
    """
    if not siret:
        return False

    # Remove any spaces or dashes
    siret = re.sub(r'[\s-]', '', siret)

    # Check length
    if len(siret) != SIRET_LENGTH:
        return False

    # Check if all characters are digits
    if not siret.isdigit():
        return False

    # Validate with Luhn algorithm
    return luhn_checksum(siret)


def validate_siren(siren: str) -> bool:
    """
    Validate a SIREN number.

    A SIREN number is 9 digits and must pass Luhn validation.

    Args:
        siren: SIREN number to validate

    Returns:
        True if valid, False otherwise
    """
    if not siren:
        return False

    # Remove any spaces or dashes
    siren = re.sub(r'[\s-]', '', siren)

    # Check length
    if len(siren) != SIREN_LENGTH:
        return False

    # Check if all characters are digits
    if not siren.isdigit():
        return False

    # Validate with Luhn algorithm
    return luhn_checksum(siren)


def validate_tva(tva: str) -> bool:
    """
    Validate a French TVA (VAT) number.

    A French TVA number starts with FR followed by 11 digits.
    The format is: FR + 2 check digits + 9 digit SIREN

    Args:
        tva: TVA number to validate

    Returns:
        True if valid, False otherwise
    """
    if not tva:
        return False

    # Remove any spaces or dashes
    tva = re.sub(r'[\s-]', '', tva).upper()

    # Check length
    if len(tva) != TVA_LENGTH:
        return False

    # Check prefix
    if not tva.startswith(TVA_PREFIX):
        return False

    # Extract the numeric part (11 digits)
    numeric_part = tva[2:]

    # Check if all characters are digits
    if not numeric_part.isdigit():
        return False

    # Extract SIREN (last 9 digits)
    siren = numeric_part[2:]

    # Validate SIREN with Luhn
    if not validate_siren(siren):
        return False

    # Validate TVA check digits
    check_digits = int(numeric_part[:2])
    siren_int = int(siren)

    # TVA check formula: (12 + 3 * (SIREN % 97)) % 97 == check_digits
    calculated_check = (12 + 3 * (siren_int % 97)) % 97

    return calculated_check == check_digits


def extract_siren_from_siret(siret: str) -> Optional[str]:
    """
    Extract SIREN from SIRET number.

    SIREN is the first 9 digits of a SIRET.

    Args:
        siret: Valid SIRET number

    Returns:
        SIREN number or None if SIRET is invalid
    """
    if not validate_siret(siret):
        return None

    siret = re.sub(r'[\s-]', '', siret)
    return siret[:SIREN_LENGTH]
