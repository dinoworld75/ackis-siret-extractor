"""Worker pool manager for concurrent scraping operations"""

import asyncio
from typing import List, Callable, Any, Dict
from concurrent.futures import ThreadPoolExecutor
from app.config import settings


class WorkerPool:
    """Manages a pool of workers for concurrent task execution"""

    def __init__(self, max_workers: Optional[int] = None):
        """
        Initialize the worker pool.

        Args:
            max_workers: Maximum number of concurrent workers. If None, uses settings.
        """
        self.max_workers = max_workers or settings.max_concurrent_workers
        self.semaphore = asyncio.Semaphore(self.max_workers)

    async def execute_task(self, task_func: Callable, *args, **kwargs) -> Any:
        """
        Execute a single task with semaphore control.

        Args:
            task_func: Async function to execute
            *args: Positional arguments for the task
            **kwargs: Keyword arguments for the task

        Returns:
            Result from the task function
        """
        async with self.semaphore:
            return await task_func(*args, **kwargs)

    async def execute_tasks(
        self,
        task_func: Callable,
        items: List[Any],
        *args,
        **kwargs
    ) -> List[Any]:
        """
        Execute multiple tasks concurrently.

        Args:
            task_func: Async function to execute for each item
            items: List of items to process
            *args: Additional positional arguments for task_func
            **kwargs: Additional keyword arguments for task_func

        Returns:
            List of results from all tasks
        """
        tasks = [
            self.execute_task(task_func, item, *args, **kwargs)
            for item in items
        ]
        return await asyncio.gather(*tasks, return_exceptions=True)

    async def execute_with_timeout(
        self,
        task_func: Callable,
        timeout: float,
        *args,
        **kwargs
    ) -> Any:
        """
        Execute a task with a timeout.

        Args:
            task_func: Async function to execute
            timeout: Timeout in seconds
            *args: Positional arguments for the task
            **kwargs: Keyword arguments for the task

        Returns:
            Result from the task function

        Raises:
            asyncio.TimeoutError: If task exceeds timeout
        """
        async with self.semaphore:
            return await asyncio.wait_for(
                task_func(*args, **kwargs),
                timeout=timeout
            )

    def get_max_workers(self) -> int:
        """
        Get the maximum number of workers.

        Returns:
            Maximum number of concurrent workers
        """
        return self.max_workers

    def set_max_workers(self, max_workers: int) -> None:
        """
        Update the maximum number of workers.

        Args:
            max_workers: New maximum number of workers
        """
        if max_workers < 1:
            raise ValueError("max_workers must be at least 1")

        self.max_workers = max_workers
        self.semaphore = asyncio.Semaphore(max_workers)


class RateLimiter:
    """Rate limiter for controlling request frequency"""

    def __init__(
        self,
        max_requests: Optional[int] = None,
        window_seconds: Optional[int] = None
    ):
        """
        Initialize the rate limiter.

        Args:
            max_requests: Maximum requests allowed in the window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests or settings.rate_limit_requests
        self.window_seconds = window_seconds or settings.rate_limit_window
        self.requests: List[float] = []
        self.lock = asyncio.Lock()

    async def acquire(self) -> None:
        """
        Acquire permission to make a request.

        This method blocks until a request slot is available.
        """
        async with self.lock:
            import time
            now = time.time()

            # Remove requests outside the window
            cutoff = now - self.window_seconds
            self.requests = [req_time for req_time in self.requests if req_time > cutoff]

            # If we're at the limit, wait
            if len(self.requests) >= self.max_requests:
                sleep_time = self.requests[0] + self.window_seconds - now
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    # Recursively try again
                    return await self.acquire()

            # Add current request
            self.requests.append(now)

    def get_current_rate(self) -> int:
        """
        Get the current number of requests in the window.

        Returns:
            Number of active requests
        """
        import time
        now = time.time()
        cutoff = now - self.window_seconds
        return sum(1 for req_time in self.requests if req_time > cutoff)


# Import for type hints
from typing import Optional
