from __future__ import annotations
import time
import logging
import asyncio
from typing import Any, Callable, Dict, Optional, Type
from .events import Event
from .protocols import Middleware, EventResult
from .retry import RetryPolicy

logger = logging.getLogger(__name__)

# Optional OpenTelemetry support
try:
    from opentelemetry import trace
    from opentelemetry.trace import Status, StatusCode
    from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    OPENTELEMETRY_AVAILABLE = False
    trace = None  # type: ignore
    Status = None  # type: ignore
    StatusCode = None  # type: ignore
    TraceContextTextMapPropagator = None  # type: ignore

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
        """
        Initialize ValidationMiddleware with a schema.
        
        Schema format:
        {
            "field_name": {
                "type": type,  # Required: expected type
                "required": bool,  # Optional: defaults to True
                "validator": Callable[[Any], bool]  # Optional: custom validator function
            }
        }
        Or simplified format:
        {
            "field_name": type  # Shorthand for {"type": type, "required": True}
        }
        """
        self.schema = schema

    def _validate_field(self, event: Event, field_name: str, field_spec: Any) -> None:
        """Validate a single field against its schema specification."""
        # Handle simplified format: field_name -> type
        if isinstance(field_spec, type):
            field_spec = {"type": field_spec, "required": True}
        elif not isinstance(field_spec, dict):
            raise ValueError(f"Invalid schema specification for field '{field_name}': {field_spec}")
        
        field_type = field_spec.get("type")
        required = field_spec.get("required", True)
        validator = field_spec.get("validator")
        
        if not hasattr(event, field_name):
            if required:
                raise ValueError(f"Missing required field: {field_name}")
            return  # Optional field missing is OK
        
        value = getattr(event, field_name)
        
        if field_type is not None:
            # Handle Optional types
            import typing
            origin = getattr(typing, "get_origin", None)
            if origin:
                origin_type = origin(field_type)
                if origin_type is typing.Union:
                    args = typing.get_args(field_type)
                    if type(None) in args:
                        # It's Optional, check if None or one of the other types
                        other_types = [t for t in args if t is not type(None)]
                        if value is None:
                            return  # None is valid for Optional
                        if not any(isinstance(value, t) for t in other_types):
                            raise TypeError(f"Field {field_name} must be of type {field_type}, got {type(value)}")
                    else:
                        # Union of non-None types
                        if not any(isinstance(value, t) for t in args):
                            raise TypeError(f"Field {field_name} must be one of {args}, got {type(value)}")
                elif not isinstance(value, field_type):
                    raise TypeError(f"Field {field_name} must be of type {field_type}, got {type(value)}")
            elif not isinstance(value, field_type):
                raise TypeError(f"Field {field_name} must be of type {field_type}, got {type(value)}")
        
        if validator is not None:
            if not validator(value):
                raise ValueError(f"Field {field_name} failed custom validation")

    async def __call__(self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]) -> EventResult:
        """Validate event against schema before processing."""
        if self.schema:
            for field_name, field_spec in self.schema.items():
                self._validate_field(event, field_name, field_spec)
        
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


class TracingMiddleware:
    """Middleware for distributed tracing with OpenTelemetry support."""
    
    def __init__(self, tracer_name: str = "event_bus"):
        self.tracer_name = tracer_name
        if OPENTELEMETRY_AVAILABLE:
            self.tracer = trace.get_tracer(tracer_name)
            self.propagator = TraceContextTextMapPropagator()
        else:
            self.tracer = None
            self.propagator = None
    
    def _extract_trace_context(self, event: Event) -> Optional[Dict[str, str]]:
        """Extract trace context from event metadata."""
        trace_context = event.metadata.get("trace_context")
        if isinstance(trace_context, dict):
            return trace_context
        return None
    
    def _inject_trace_context(self, event: Event, context: Any) -> None:
        """Inject trace context into event metadata."""
        if self.propagator and context:
            carrier = {}
            self.propagator.inject(carrier, context=context)
            event.metadata["trace_context"] = carrier
    
    async def __call__(self, event: Event, next_handler: Callable[[Event], Awaitable[EventResult]]) -> EventResult:
        """Create OpenTelemetry span for event processing."""
        if not OPENTELEMETRY_AVAILABLE or not self.tracer:
            # If OpenTelemetry not available, just propagate trace_context if present
            return await next_handler(event)
        
        # Extract trace context from event metadata
        trace_context_dict = self._extract_trace_context(event)
        context = None
        if trace_context_dict:
            context = self.propagator.extract(carrier=trace_context_dict)
        
        # Create span
        span_name = f"event_bus.process.{type(event).__name__}"
        with self.tracer.start_as_current_span(span_name, context=context) as span:
            span.set_attribute("event.id", event.event_id)
            span.set_attribute("event.type", type(event).__name__)
            span.set_attribute("event.source", event.source)
            
            try:
                result = await next_handler(event)
                
                if result.success:
                    span.set_status(Status(StatusCode.OK))
                else:
                    span.set_status(Status(StatusCode.ERROR, f"Event processing failed: {result.errors}"))
                    if result.errors:
                        span.record_exception(result.errors[0])
                
                span.set_attribute("event.duration_ms", result.duration_ms)
                span.set_attribute("event.handler_count", len(result.handler_results))
                
                # Inject updated trace context back into event metadata
                if OPENTELEMETRY_AVAILABLE:
                    from opentelemetry import context as trace_context
                    current_context = trace_context.get_current()
                    self._inject_trace_context(event, current_context)
                
                return result
            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                raise
