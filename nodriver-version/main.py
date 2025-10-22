"""
Main entry point for nodriver SIRET extractor

Features:
- Worker pool with async queue
- Proxy rotation per worker
- Headless/non-headless fallback
- CSV export with stats
"""
import asyncio
import csv
import random
import time
from typing import List, Optional
from pathlib import Path

from config import CONFIG
from scraper import scrape_site, ScrapeResult

class WorkerPool:
    """
    Manages a pool of workers that process URLs from a queue
    Each worker can have its own proxy
    """
    def __init__(self, max_workers: int, proxy_list: Optional[List[str]] = None):
        self.max_workers = max_workers
        self.proxy_list = proxy_list or []
        self.queue: asyncio.Queue = asyncio.Queue()
        self.results: List[ScrapeResult] = []
        self.workers: List[asyncio.Task] = []

    def get_proxy_for_worker(self, worker_id: int) -> Optional[str]:
        """
        Assign proxy to worker (round-robin)
        If no proxies configured, returns None
        """
        if not self.proxy_list or not CONFIG['use_proxy']:
            return None

        # Round-robin: worker 0 → proxy 0, worker 1 → proxy 1, etc.
        proxy_index = worker_id % len(self.proxy_list)
        return self.proxy_list[proxy_index]

    async def worker(self, worker_id: int):
        """
        Worker coroutine that processes URLs from queue
        """
        proxy = self.get_proxy_for_worker(worker_id)

        if proxy:
            print(f"[Worker {worker_id}] Started with proxy: {proxy}")
        else:
            print(f"[Worker {worker_id}] Started (no proxy)")

        while True:
            try:
                # Get URL from queue (non-blocking with timeout)
                url = await asyncio.wait_for(self.queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                # Queue is empty, check if done
                if self.queue.empty():
                    break
                continue

            try:
                # Scrape the site
                result = await scrape_site(
                    url=url,
                    worker_id=worker_id,
                    proxy=proxy,
                    headless=CONFIG['headless'],
                    retry_non_headless=CONFIG['fallback_to_non_headless']
                )

                self.results.append(result)

                # Rate limiting between requests
                await asyncio.sleep(CONFIG['delay_between_requests'])

            except Exception as e:
                print(f"[Worker {worker_id}] Fatal error on {url}: {e}")
                result = ScrapeResult(url)
                result.status = 'error'
                result.error = str(e)
                result.worker_id = worker_id
                self.results.append(result)

            finally:
                self.queue.task_done()

        print(f"[Worker {worker_id}] Finished")

    async def run(self, urls: List[str]):
        """
        Start worker pool and process all URLs
        """
        # Fill queue
        for url in urls:
            await self.queue.put(url)

        # Start workers
        self.workers = [
            asyncio.create_task(self.worker(i))
            for i in range(self.max_workers)
        ]

        # Wait for all workers to finish
        await self.queue.join()

        # Cancel remaining workers
        for worker in self.workers:
            worker.cancel()

        # Wait for cancellation
        await asyncio.gather(*self.workers, return_exceptions=True)

def read_csv_urls(file_path: str, max_sites: int, column_index: int) -> List[str]:
    """Read URLs from CSV file"""
    urls = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter=';')
        next(reader)  # Skip header

        for row in reader:
            if len(row) > column_index:
                url = row[column_index].strip()
                if url:
                    urls.append(url)
                    if len(urls) >= max_sites:
                        break

    return urls

def export_to_csv(results: List[ScrapeResult], output_path: str):
    """Export results to CSV"""
    fieldnames = [
        'url', 'final_url', 'status', 'sirets', 'sirens', 'tvas',
        'found_on_page', 'legal_pages_checked', 'error', 'duration_ms',
        'worker_id', 'headless'
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
        writer.writeheader()

        for result in results:
            writer.writerow(result.to_dict())

    print(f"\n✓ Results exported to: {output_path}")

def display_stats(results: List[ScrapeResult]):
    """Display scraping statistics"""
    total = len(results)
    if total == 0:
        return

    success = sum(1 for r in results if r.status == 'success')
    no_data = sum(1 for r in results if r.status == 'no_data')
    errors = sum(1 for r in results if r.status == 'error')
    timeouts = sum(1 for r in results if r.status == 'timeout')
    antibots = sum(1 for r in results if r.status == 'antibot')

    with_siret = sum(1 for r in results if any(i.siret for i in r.identifiers))
    with_siren = sum(1 for r in results if any(i.siren for i in r.identifiers))
    with_tva = sum(1 for r in results if any(i.tva for i in r.identifiers))

    redirects = sum(1 for r in results if r.final_url and r.final_url != r.url)
    non_headless = sum(1 for r in results if not r.used_headless)

    avg_duration = sum(r.duration for r in results) / total
    total_duration = sum(r.duration for r in results)
    total_pages = sum(len(r.legal_pages_checked) for r in results)
    avg_pages = total_pages / total

    print("\n" + "━" * 50)
    print("    NODRIVER SCRAPING STATISTICS")
    print("━" * 50)
    print(f"Total sites scraped:       {total}")
    print(f"Success (with data):       {success} ({success*100//total}%)")
    print(f"No data found:             {no_data} ({no_data*100//total}%)")
    print(f"Cross-domain redirects:    {redirects}")
    print(f"Fallback to non-headless:  {non_headless}")
    print()
    print(f"Sites with SIRET:          {with_siret} ({with_siret*100//total}%)")
    print(f"Sites with SIREN:          {with_siren} ({with_siren*100//total}%)")
    print(f"Sites with TVA:            {with_tva} ({with_tva*100//total}%)")
    print()
    print(f"Errors:                    {errors}")
    print(f"Timeouts:                  {timeouts}")
    print(f"Anti-bot blocks:           {antibots}")
    print()
    print(f"Avg pages checked/site:    {avg_pages:.1f}")
    print(f"Avg duration per site:     {avg_duration:.1f}s")
    print(f"Total duration:            {total_duration:.0f}s")
    print(f"Workers used:              {CONFIG['max_workers']}")
    print("━" * 50 + "\n")

async def main():
    """Main entry point"""
    print("━" * 50)
    print("  NODRIVER SIRET EXTRACTOR v3.0")
    print("━" * 50)
    print()

    # 1. Read CSV
    print(f"Reading CSV: {CONFIG['input_csv']}")
    urls = read_csv_urls(
        CONFIG['input_csv'],
        CONFIG['max_sites'],
        CONFIG['column_index']
    )
    print(f"✓ Loaded {len(urls)} URLs\n")

    if not urls:
        print("Error: No URLs found in CSV")
        return

    # 2. Display configuration
    print(f"Configuration:")
    print(f"  Workers:        {CONFIG['max_workers']}")
    print(f"  Headless:       {CONFIG['headless']}")
    print(f"  Fallback:       {CONFIG['fallback_to_non_headless']}")
    print(f"  Proxy enabled:  {CONFIG['use_proxy']}")
    if CONFIG['use_proxy']:
        print(f"  Proxies:        {len(CONFIG['proxy_list'])}")
    print()

    # 3. Create worker pool and run
    start_time = time.time()

    pool = WorkerPool(
        max_workers=CONFIG['max_workers'],
        proxy_list=CONFIG['proxy_list'] if CONFIG['use_proxy'] else None
    )

    await pool.run(urls)

    elapsed = time.time() - start_time
    print(f"\n✓ All workers finished in {elapsed:.1f}s")

    # 4. Export results
    export_to_csv(pool.results, CONFIG['output_csv'])

    # 5. Display stats
    display_stats(pool.results)

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\nFatal error: {e}")
        raise
