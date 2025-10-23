"""Proxy loader for reading proxies from CSV file"""

import csv
import logging
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)


def load_proxies_from_csv(csv_path: str = "proxy.csv") -> List[str]:
    """
    Load proxies from CSV file.

    CSV format (with or without header):
    - Single column: proxy_url
    - Multiple columns: host,port,username,password

    Examples:
        http://user:pass@host:port
        OR
        host,port,user,pass

    Args:
        csv_path: Path to CSV file (default: proxy.csv in project root)

    Returns:
        List of proxy URLs in format: http://username:password@host:port

    Raises:
        FileNotFoundError: If CSV file doesn't exist
        ValueError: If CSV format is invalid
    """
    csv_file = Path(csv_path)

    if not csv_file.exists():
        logger.warning(f"Proxy CSV file not found: {csv_path}")
        return []

    proxies = []

    try:
        with open(csv_file, 'r', encoding='utf-8-sig') as f:
            # Try to detect CSV format
            sample = f.read(1024)
            f.seek(0)

            # Detect delimiter
            delimiter = ',' if ',' in sample else ';'

            reader = csv.DictReader(f, delimiter=delimiter)

            # Check if it's a multi-column format (host, port, username, password)
            first_row = next(reader, None)
            if first_row is None:
                logger.warning(f"Empty CSV file: {csv_path}")
                return []

            f.seek(0)
            reader = csv.DictReader(f, delimiter=delimiter)

            # Detect format based on column names
            fieldnames = reader.fieldnames
            if fieldnames and any(field in ['host', 'port', 'username', 'password'] for field in fieldnames):
                # Multi-column format
                for row in reader:
                    try:
                        host = row.get('host', '').strip()
                        port = row.get('port', '').strip()
                        username = row.get('username', '').strip()
                        password = row.get('password', '').strip()

                        if not host or not port:
                            continue

                        if username and password:
                            proxy_url = f"http://{username}:{password}@{host}:{port}"
                        else:
                            proxy_url = f"http://{host}:{port}"

                        proxies.append(proxy_url)

                    except Exception as e:
                        logger.warning(f"Skipping invalid proxy row: {row} - {e}")
                        continue

            else:
                # Single column format (full URL)
                f.seek(0)
                # Skip header if present
                first_line = f.readline().strip()
                if not (first_line.startswith('http://') or first_line.startswith('https://')):
                    # This was a header, continue with next lines
                    pass
                else:
                    # This was data, add it
                    if first_line:
                        proxies.append(first_line)

                # Read remaining lines
                for line in f:
                    proxy_url = line.strip()
                    if proxy_url and (proxy_url.startswith('http://') or proxy_url.startswith('https://')):
                        proxies.append(proxy_url)

        logger.info(f"Loaded {len(proxies)} proxies from {csv_path}")
        return proxies

    except Exception as e:
        logger.error(f"Error loading proxies from CSV: {e}")
        raise


def create_example_proxy_csv(csv_path: str = "proxy.csv"):
    """
    Create an example proxy.csv file with documentation.

    Args:
        csv_path: Path where to create the example file
    """
    example_content = """# Proxy CSV File
# Format 1 (Multi-column): host,port,username,password
# Format 2 (Single column): http://username:password@host:port

# Examples:
# 123.45.67.89,8000,user1,pass1
# 98.76.54.32,8001,user2,pass2
# http://user3:pass3@11.22.33.44:8002
"""

    csv_file = Path(csv_path)
    if csv_file.exists():
        logger.info(f"Proxy CSV already exists: {csv_path}")
        return

    try:
        with open(csv_file, 'w', encoding='utf-8') as f:
            f.write(example_content)
        logger.info(f"Created example proxy CSV: {csv_path}")
    except Exception as e:
        logger.error(f"Error creating example proxy CSV: {e}")
        raise
