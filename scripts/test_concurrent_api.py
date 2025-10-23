#!/usr/bin/env python3
"""Test script for concurrent workers and proxy support"""

import requests
import json
import time

API_URL = "http://localhost:8000/api/extract/batch"

# Test URLs
test_urls = [
    "https://www.societe.com",
    "https://www.infogreffe.fr",
    "https://www.pappers.fr",
    "https://www.verif.com",
    "https://www.lesechoscreation.fr",
]

# Test 1: Without concurrent workers (default)
print("=" * 80)
print("TEST 1: Default processing (10 workers, no proxies)")
print("=" * 80)

payload1 = {
    "urls": test_urls,
    "concurrent_workers": 10
}

start_time = time.time()
response1 = requests.post(API_URL, json=payload1, timeout=300)
duration1 = time.time() - start_time

print(f"Status Code: {response1.status_code}")
print(f"Duration: {duration1:.2f}s")
print(f"Results:")
data1 = response1.json()
print(f"  Total: {data1['total']}")
print(f"  Successful: {data1['successful']}")
print(f"  Failed: {data1['failed']}")
print(f"  Avg time per URL: {duration1 / len(test_urls):.2f}s")

# Test 2: With 5 concurrent workers
print("\n" + "=" * 80)
print("TEST 2: 5 concurrent workers (no proxies)")
print("=" * 80)

payload2 = {
    "urls": test_urls,
    "concurrent_workers": 5
}

start_time = time.time()
response2 = requests.post(API_URL, json=payload2, timeout=300)
duration2 = time.time() - start_time

print(f"Status Code: {response2.status_code}")
print(f"Duration: {duration2:.2f}s")
print(f"Results:")
data2 = response2.json()
print(f"  Total: {data2['total']}")
print(f"  Successful: {data2['successful']}")
print(f"  Failed: {data2['failed']}")
print(f"  Avg time per URL: {duration2 / len(test_urls):.2f}s")

# Test 3: With proxy (if provided)
print("\n" + "=" * 80)
print("TEST 3: 10 workers with proxy (if configured)")
print("=" * 80)

# Example proxy format - uncomment and modify if you have proxies
# proxies = [
#     {
#         "host": "142.111.48.253",
#         "port": 7030,
#         "username": "fxypiwva",
#         "password": "1bc04c2cd1mc"
#     }
# ]

payload3 = {
    "urls": test_urls,
    "concurrent_workers": 10,
    # "proxies": proxies  # Uncomment if you have proxies
}

start_time = time.time()
response3 = requests.post(API_URL, json=payload3, timeout=300)
duration3 = time.time() - start_time

print(f"Status Code: {response3.status_code}")
print(f"Duration: {duration3:.2f}s")
print(f"Results:")
data3 = response3.json()
print(f"  Total: {data3['total']}")
print(f"  Successful: {data3['successful']}")
print(f"  Failed: {data3['failed']}")
print(f"  Avg time per URL: {duration3 / len(test_urls):.2f}s")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Test 1 (10 workers): {duration1:.2f}s")
print(f"Test 2 (5 workers):  {duration2:.2f}s")
print(f"Test 3 (10 workers): {duration3:.2f}s")
print(f"\nSpeedup with 10 vs 5 workers: {duration2 / duration1:.2f}x")
