"""
Simulated AI provider with configurable latency and failure rate.
"""

import asyncio
import random


async def call_ai_provider(chunk: str) -> str:
    """Simulate external AI API call with latency and flakiness."""
    await asyncio.sleep(random.uniform(0.05, 0.15))
    if random.random() < 0.18:
        raise Exception("Upstream AI Provider: Connection Reset")
    return f"Summary: {chunk[:50]}..."
