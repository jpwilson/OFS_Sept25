"""
Small in-memory sliding-window rate limiter.

State lives in the serverless instance, so the limit applies per warm instance, not
globally: enough to stop one client hammering an endpoint, not a hard quota. Use a
database counter where the limit has to hold across instances.
"""
import time
from collections import deque
from threading import Lock


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: float, max_keys: int = 10_000):
        self.limit = limit
        self.window = window_seconds
        self.max_keys = max_keys
        self._hits: dict = {}
        self._lock = Lock()

    def allow(self, key) -> bool:
        """Record a request for key; False when key is over the limit for the window."""
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            if len(self._hits) > self.max_keys:
                self._prune(cutoff)
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            return True

    def reset(self):
        with self._lock:
            self._hits.clear()

    def _prune(self, cutoff):
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
            del self._hits[key]
