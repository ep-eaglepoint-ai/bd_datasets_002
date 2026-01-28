from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx


async def deliver_webhook(
    webhook_url: str,
    *,
    job_id: str,
    status: str,
    rows_processed: int,
    rows_failed: int,
    completed_at: datetime,
) -> None:
    payload = {
        "job_id": job_id,
        "status": status,
        "rows_processed": rows_processed,
        "rows_failed": rows_failed,
        "completed_at": completed_at.astimezone(timezone.utc).isoformat(),
    }

    delays = [0.5, 1.0, 2.0]
    last_exc: Exception | None = None

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(2.0)) as client:
                resp = await client.post(webhook_url, json=payload)
                resp.raise_for_status()
                return
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < 2:
                await asyncio.sleep(delays[attempt])

    if last_exc:
        raise last_exc
