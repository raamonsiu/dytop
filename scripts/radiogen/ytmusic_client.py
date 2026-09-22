"""One YouTube Music client per thread.

ytmusicapi keeps a requests session on the instance, which is not safe to
share between the validation pool's threads, and building one per call would
re-fetch its config every time.
"""

from __future__ import annotations

import threading

_local = threading.local()


def client():
    if not hasattr(_local, "client"):
        from ytmusicapi import YTMusic

        _local.client = YTMusic()
    return _local.client
