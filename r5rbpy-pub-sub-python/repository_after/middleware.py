from __future__ import annotations
import time
import logging
import asyncio
from typing import Any, Callable, Dict, Optional, Type
from .events import Event
from .protocols import Middleware, EventResult
from .retry import RetryPolicy

logger = logging.getLogger(__name__)

class LoggingMiddleware:
    async def __call__(self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]) -> EventResult:
        start_time = time.perf_counter()
        logger.info(f"Processing event {type(event).__name__} (id={event.event_id})")
        result = await next_handler(event)
        duration = (time.perf_counter() - start_time) * 1000
        logger.info(f"Finished processing event {type(event).__name__} in {duration:.2f}ms. Success: {result.success}")
        return result

class TimingMiddleware:
    async def __call__(self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]) -> EventResult:
        start_time = time.perf_counter()
        result = await next_handler(event)
        duration = (time.perf_counter() - start_time) * 1000
        # Add to metadata as requested
        event.metadata["dispatch_duration_ms"] = duration
        return result

class ValidationMiddleware:
    def __init__(self, schema: Optional[Dict[str, Any]] = None):
        self.schema = schema

    async def __call__(self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]) -> EventResult:
        # Simple validation: check if all required fields are present (they are, since it's a dataclass)
        # In a real app, this might use jsonschema or pydantic
        if self.schema:
            for field, field_type in self.schema.items():
                if not hasattr(event, field):
                    raise ValueError(f"Missing required field: {field}")
                if not isinstance(getattr(event, field), field_type):
                    raise TypeError(f"Field {field} must be of type {field_type}")
        
        return await next_handler(event)

class RetryMiddleware:
    def __init__(self, policy: Optional[RetryPolicy] = None):
        self.policy = policy or RetryPolicy()

    async def __call__(self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]) -> EventResult:
        retry_count = 0
        while True:
            result = await next_handler(event)
            if result.success or retry_count >= self.policy.max_retries:
                return result
            
            delay = self.policy.get_delay(retry_count)
            retry_count += 1
            logger.warning(f"Retrying event {type(event).__name__} (attempt {retry_count}/{self.policy.max_retries}) after {delay:.2f}s")
            await asyncio.sleep(delay)
