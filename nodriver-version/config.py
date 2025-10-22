"""
Configuration for nodriver SIRET extractor
"""

# ============================================================================
# MAIN CONFIG
# ============================================================================

CONFIG = {
    'input_csv': '/home/yesouicom/github/ackis-siret-extractor-1/test-website-723.csv',
    'output_csv': '/home/yesouicom/github/ackis-siret-extractor-1/nodriver-version/results-nodriver.csv',
    'max_sites': 10,  # Test with 10 sites first (same as v1.0 baseline)
    'timeout': 20,  # seconds
    'delay_between_requests': 1.0,  # seconds (faster with workers)
    'max_legal_pages_to_check': 7,
    'column_index': 16,  # Column 17 in CSV (0-indexed)

    # Worker configuration
    'max_workers': 3,  # Parallel workers (3x speed)
    'headless': True,  # Start with headless
    'fallback_to_non_headless': True,  # Fallback if antibot detected

    # Proxy configuration (set to None if no proxy)
    'use_proxy': False,
    'proxy_list': [
        # Format: 'http://user:pass@host:port'
        # 'http://user:pass@proxy1.example.com:8080',
        # 'http://user:pass@proxy2.example.com:8080',
    ],
}

# ============================================================================
# BLACKLIST HÉBERGEURS
# ============================================================================

BLACKLIST_SIRENS = [
    '797876562',  # Gestixi
    '423646512',  # OVH
    '537407926',  # Gandi
    '443061841',  # O2Switch
]

# ============================================================================
# LEGAL KEYWORDS (FRENCH)
# ============================================================================

LEGAL_KEYWORDS = [
    'mention', 'legal', 'legale', 'légale',
    'cgu', 'cgv', 'condition', 'utilisation', 'vente',
    'propos', 'sommes', 'siret', 'siren',
    'politique', 'confidentialite', 'confidentialité',
    'cookie', 'donnees', 'données', 'information',
    'about', 'contact', 'company', 'imprint',
]

# ============================================================================
# LEGAL PATHS TO TEST
# ============================================================================

LEGAL_PATHS = [
    '/mentions-legales', '/mentions-legales/',
    '/mentions', '/mentions/',
    '/mentions-légales', '/mentions-légales/',
    '/cgv', '/cgv/',
    '/cgu', '/cgu/',
    '/legal', '/legal/',
    '/conditions-generales-de-vente', '/conditions-generales-de-vente/',
    '/conditions-generales', '/conditions-generales/',
    '/politique-de-confidentialite', '/politique-de-confidentialite/',
    '/fr/mentions-legales', '/fr/mentions',
    '/fr/conditions-generales', '/fr/legal',
    '/about', '/about/', '/a-propos', '/qui-sommes-nous',
    '/contact', '/contact/', '/nous-contacter',
]

# ============================================================================
# USER AGENTS POOL
# ============================================================================

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
]
