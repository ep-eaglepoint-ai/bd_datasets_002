"""URL reachability validation."""

import httpx

REACHABILITY_TIMEOUT = 5.0


async def is_url_reachable(url: str, timeout: float = REACHABILITY_TIMEOUT) -> bool:
    """Check if a URL is reachable via HEAD request. Returns False on any error or non-2xx."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.head(url, timeout=timeout, follow_redirects=True)
            return 200 <= response.status_code < 400
    except Exception:
        return False
