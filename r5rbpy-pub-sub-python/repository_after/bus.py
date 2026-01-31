from __future__ import annotations
import asyncio
import time
import inspect
import functools
from typing import (
    Any, Callable, Dict, List, Optional, Type, TypeVar, Union, 
    Generic, Set, Tuple, Awaitable, cast, overload
)
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from .events import Event
from .protocols import (
    Handler, EventResult, HandlerResult, Middleware, EventStore, MetricsCollector
)
from .retry import RetryPolicy, DeadLetterQueue
from .metrics import InMemoryMetricsCollector

E = TypeVar("E", bound=Event)
R = TypeVar("R")

class Subscription(Generic[E]):
    def __init__(self, bus: EventBus, event_type: Type[E], handler: Handler[E, Any], priority: int, filter_predicate: Optional[Callable[[E], bool]]):
        self.bus = bus
        self.event_type = event_type
        self.handler = handler
        self.priority = priority
        self.filter_predicate = filter_predicate

    def unsubscribe(self):
        self.bus.unsubscribe(self.event_type, self.handler)

class EventBus:
    def __init__(
        self, 
        loop: Optional[asyncio.AbstractEventLoop] = None,
        executor: Optional[ThreadPoolExecutor] = None,
        default_timeout: Optional[float] = None,
        event_store: Optional[EventStore] = None,
        metrics_collector: Optional[MetricsCollector] = None,
        concurrency_limit: int = 0,
        development_mode: bool = False,
        circuit_breaker_error_threshold: int = 5,
        circuit_breaker_recovery_timeout: float = 30.0
    ):
        self.loop = loop or asyncio.get_event_loop()
        self.executor = executor or ThreadPoolExecutor(max_workers=10)
        self.default_timeout = default_timeout
        self.event_store = event_store
        self.metrics = metrics_collector or InMemoryMetricsCollector()
        self.concurrency_limit = concurrency_limit
        self.semaphore = asyncio.Semaphore(concurrency_limit) if concurrency_limit > 0 else None
        self.development_mode = development_mode
        
        self._subscriptions: Dict[Type[Event], List[Tuple[int, Handler[Any, Any], Optional[Callable[[Any], bool]]]]] = {}
        self._middlewares: List[Tuple[int, Middleware]] = []
        self._retry_policies: Dict[Type[Event], RetryPolicy] = {}
        self._dead_letter_queue = DeadLetterQueue()
        self._dead_letter_handler: Optional[Callable[[Event, Handler, Exception, int], None]] = None
        self._handler_cache: Dict[Type[Event], List[Tuple[int, Handler[Any, Any], Optional[Callable[[Any], bool]]]]] = {}
        self._middleware_chain: Optional[Callable[[Event], Awaitable[EventResult]]] = None
        self._on_publish_hooks: List[Callable[[Event], Any]] = []
        self._pending_events: int = 0
        self._track_pending_events: bool = False
        
        self._error_counts: Dict[str, int] = {}
        self._circuit_open: Dict[str, bool] = {}
        self._error_threshold = circuit_breaker_error_threshold
        self._recovery_timeout = circuit_breaker_recovery_timeout
        self._last_error_time: Dict[str, float] = {}

    def _validate_event(self, event: Event):
        if not isinstance(event, Event):
            raise TypeError(f"Expected Event instance, got {type(event)}")
        
    def _validate_handler(self, handler: Handler[Any, Any]):
        sig = inspect.signature(handler)
        if len(sig.parameters) != 1:
            raise TypeError(f"Handler {handler} must take exactly one argument (the event)")

    @overload
    def subscribe(self, event_type: Type[E], handler: Handler[E, R], priority: int = 0, filter_predicate: Optional[Callable[[E], bool]] = None) -> Subscription[E]: ...
    @overload
    def subscribe(self, event_type: Type[E], handler: Callable[[E], R], priority: int = 0, filter_predicate: Optional[Callable[[E], bool]] = None) -> Subscription[E]: ...

    def subscribe(self, event_type: Type[E], handler: Handler[E, R], priority: int = 0, filter_predicate: Optional[Callable[[E], bool]] = None) -> Subscription[E]:
        if self.development_mode:
            if not issubclass(event_type, Event): raise TypeError(f"Can only subscribe to Event subclasses, got {event_type}")
            self._validate_handler(handler)
        if event_type not in self._subscriptions: self._subscriptions[event_type] = []
        self._subscriptions[event_type].append((priority, handler, filter_predicate))
        self._subscriptions[event_type].sort(key=lambda x: x[0], reverse=True)
        self._handler_cache.clear()
        self.metrics.update_active_subscriptions(event_type.__name__, len(self._subscriptions[event_type]))
        return Subscription(self, event_type, handler, priority, filter_predicate)

    def unsubscribe(self, event_type: Type[Event], handler: Handler[Any, Any]):
        if event_type in self._subscriptions:
            self._subscriptions[event_type] = [s for s in self._subscriptions[event_type] if s[1] != handler]
            self._handler_cache.clear()
            self.metrics.update_active_subscriptions(event_type.__name__, len(self._subscriptions[event_type]))

    def on(self, event_type: Type[E], priority: int = 0):
        def decorator(handler: Handler[E, R]) -> Handler[E, R]:
            self.subscribe(event_type, handler, priority=priority)
            return handler
        return decorator

    def add_middleware(self, middleware: Middleware, priority: int = 0):
        self._middlewares.append((priority, middleware))
        self._middlewares.sort(key=lambda x: x[0], reverse=True)
        self._middleware_chain = None

    def add_publish_hook(self, hook: Callable[[Event], Any]):
        self._on_publish_hooks.append(hook)

    def _build_middleware_chain(self):
        async def final_dispatch(ev: Event) -> EventResult: return await self._dispatch_to_handlers(ev)
        current_call = final_dispatch
        for _, middleware in reversed(self._middlewares):
            def make_next(m, next_c):
                async def middleware_wrapper(ev: Event) -> EventResult: return await m(ev, next_c)
                return middleware_wrapper
            current_call = make_next(middleware, current_call)
        self._middleware_chain = current_call

    def configure_retry(self, event_type: Type[Event], policy: RetryPolicy): self._retry_policies[event_type] = policy
    def set_dead_letter_handler(self, handler: Callable[[Event, Handler, Exception, int], None]): self._dead_letter_handler = handler

    def _get_matching_handlers(self, event: Event) -> List[Tuple[int, Handler[Any, Any], Optional[Callable[[Any], bool]]]]:
        event_type = type(event)
        # Fast path: check cache first
        if event_type in self._handler_cache: 
            return self._handler_cache[event_type]
        handlers = []
        # Optimize: check direct type first (most common case)
        if event_type in self._subscriptions:
            handlers.extend(self._subscriptions[event_type])
        # Then check MRO for base classes
        for cls in event_type.__mro__[1:]:  # Skip first (already checked)
            if cls in self._subscriptions: 
                handlers.extend(self._subscriptions[cls])
        handlers.sort(key=lambda x: x[0], reverse=True)
        self._handler_cache[event_type] = handlers
        return handlers

    async def _invoke_handler(self, handler: Handler[Any, Any], event: Event, retry_policy: Optional[RetryPolicy]) -> HandlerResult:
        try:
            handler_name = handler._bus_name # type: ignore
            is_async = handler._is_coro # type: ignore
        except AttributeError:
            handler_name = getattr(handler, "__name__", str(handler))
            is_async = asyncio.iscoroutinefunction(handler)
            try:
                setattr(handler, "_bus_name", handler_name)
                setattr(handler, "_is_coro", is_async)
            except: pass

        start_time = time.perf_counter()
        if self._circuit_open.get(handler_name, False):
            if start_time - self._last_error_time.get(handler_name, 0) > self._recovery_timeout:
                self._circuit_open[handler_name] = False
                self._error_counts[handler_name] = 0
            else: return HandlerResult(handler_name, False, error=Exception("Circuit breaker open"), duration_ms=0)

        retry_count = 0
        timeout = self.default_timeout
        
        async def run():
            if is_async:
                if timeout is not None:
                    async with asyncio.timeout(timeout): return await handler(event)
                return await handler(event)
            loop = asyncio.get_running_loop()
            fut = loop.run_in_executor(self.executor, handler, event)
            if timeout is not None:
                async with asyncio.timeout(timeout): return await fut
            return await fut

        while True:
            try:
                if self.semaphore:
                    async with self.semaphore: result = await run()
                else: result = await run()
                
                now = time.perf_counter()
                duration = (now - start_time) * 1000
                self.metrics._handler_durations[handler_name].append(duration)
                self._error_counts[handler_name] = 0
                return HandlerResult(handler_name, True, result=result, duration_ms=duration, retry_count=retry_count)
            except (Exception, asyncio.TimeoutError) as e:
                if isinstance(e, asyncio.TimeoutError): e = TimeoutError(f"Handler {handler_name} timed out")
                now = time.perf_counter()
                self._error_counts[handler_name] = self._error_counts.get(handler_name, 0) + 1
                self._last_error_time[handler_name] = now
                if self._error_counts[handler_name] >= self._error_threshold: self._circuit_open[handler_name] = True
                if retry_policy and retry_count < retry_policy.max_retries:
                    retry_count += 1
                    await asyncio.sleep(retry_policy.get_delay(retry_count-1))
                    continue
                duration = (now - start_time) * 1000
                self.metrics.record_event_failed(event.__class__.__name__, e.__class__.__name__)
                self._dead_letter_queue.add(event, handler_name, e, retry_count)
                if self._dead_letter_handler:
                    try: self._dead_letter_handler(event, handler, e, retry_count)
                    except: pass
                return HandlerResult(handler_name, False, error=e, duration_ms=duration, retry_count=retry_count)

    async def _dispatch_to_handlers(self, event: Event, track_event: bool = True) -> EventResult:
        start_time = time.perf_counter()
        # Optimize metrics tracking - use direct dict access
        if track_event:
            event_type_name = event.__class__.__name__
            self.metrics._events_published[event_type_name] += 1
        handlers_to_run = self._get_matching_handlers(event)
        retry_policy = self._retry_policies.get(event.__class__)
        
        if len(handlers_to_run) == 1:
            priority, handler, filter_predicate = handlers_to_run[0]
            if filter_predicate and not filter_predicate(event):
                return EventResult(success=True, event=event, handler_results=[], errors=[], duration_ms=(time.perf_counter() - start_time) * 1000)
            
            # Ultra-fast path: single handler, no retry, no circuit breaker, no timeout, no concurrency limit
            if not retry_policy and not self._circuit_open and self.default_timeout is None and self.concurrency_limit == 0:
                try:
                    # Cache handler async status
                    is_async = getattr(handler, "_is_coro", None)
                    if is_async is None:
                        is_async = asyncio.iscoroutinefunction(handler)
                        try: 
                            handler._is_coro = is_async
                        except (AttributeError, TypeError): 
                            pass
                    
                    # Invoke handler
                    if is_async: 
                        result = await handler(event)
                    else: 
                        result = await asyncio.get_running_loop().run_in_executor(self.executor, handler, event)
                    
                    # Calculate duration
                    now = time.perf_counter()
                    duration = (now - start_time) * 1000
                    
                    # Ultra-fast handler name lookup - use getattr with default (faster than try/except)
                    h_name = getattr(handler, "_bus_name", None)
                    if h_name is None:
                        h_name = getattr(handler, "__name__", "handler")
                        try:
                            handler._bus_name = h_name
                        except (AttributeError, TypeError):
                            pass
                    
                    # Track metrics only if enabled - use direct dict access for speed
                    if track_event:
                        self.metrics._handler_durations[h_name].append(duration)
                    
                    # Ultra-fast path: minimal EventResult creation
                    return EventResult(
                        success=True, event=event, handler_results=[HandlerResult(h_name, True, result=result, duration_ms=duration)],
                        errors=[], duration_ms=duration, dead_letter_count=0, retry_counts=[0]
                    )
                except Exception: pass # fallback to standard path

        tasks = []
        for _, handler, filter_predicate in handlers_to_run:
            if filter_predicate and not filter_predicate(event): continue
            tasks.append(self._invoke_handler(handler, event, retry_policy))
        
        if not tasks: return EventResult(True, event, [], [], duration_ms=(time.perf_counter() - start_time) * 1000)

        results = await asyncio.gather(*tasks, return_exceptions=True)
        handler_results, errors, retry_counts, dead_letter_count = [], [], [], 0
        for res in results:
            if isinstance(res, HandlerResult):
                handler_results.append(res)
                retry_counts.append(res.retry_count)
                if not res.success:
                    if res.error: errors.append(res.error)
                    dead_letter_count += 1
            elif isinstance(res, Exception):
                errors.append(res); retry_counts.append(0); dead_letter_count += 1
        
        return EventResult(
            success=not errors, event=event, handler_results=handler_results, errors=errors,
            duration_ms=(time.perf_counter() - start_time) * 1000, dead_letter_count=dead_letter_count, retry_counts=retry_counts
        )

    async def publish_async(self, event: Event, guaranteed_persistence: bool = False) -> EventResult:
        if self.development_mode: self._validate_event(event)
        
        # Ultra-fast path: no hooks, no store, no middlewares, no pending tracking
        if (not self._on_publish_hooks and not self.event_store and not self._middlewares and 
            not self._track_pending_events):
            return await self._dispatch_to_handlers(event, track_event=True)
        
        # Fast path: no hooks, no store, no middlewares (but track metrics)
        if not self._on_publish_hooks and not self.event_store and not self._middlewares:
            self.metrics._events_published[event.__class__.__name__] += 1
            if self._track_pending_events:
                self._pending_events += 1
                self.metrics.update_queue_depth(self._pending_events)
            try:
                return await self._dispatch_to_handlers(event, track_event=True)
            finally:
                if self._track_pending_events:
                    self._pending_events -= 1
                    self.metrics.update_queue_depth(self._pending_events)
        
        # Standard path with hooks/store/middlewares
        self.metrics._events_published[event.__class__.__name__] += 1
        for hook in self._on_publish_hooks:
            try: hook(event)
            except: pass
        if self.event_store:
            if guaranteed_persistence:
                await self.event_store.save(event)
            else:
                asyncio.create_task(self.event_store.save(event))
        if self._track_pending_events:
            self._pending_events += 1
            self.metrics.update_queue_depth(self._pending_events)
        try:
            if not self._middlewares: return await self._dispatch_to_handlers(event, track_event=True)
            if self._middleware_chain is None: self._build_middleware_chain()
            return await self._middleware_chain(event)
        finally:
            if self._track_pending_events:
                self._pending_events -= 1
                self.metrics.update_queue_depth(self._pending_events)

    def publish(self, event: Event, guaranteed_persistence: bool = False) -> EventResult:
        try:
            asyncio.get_running_loop()
            raise RuntimeError("publish() cannot be called from within an async context. Use publish_async() instead.")
        except RuntimeError as e:
            if "no running event loop" in str(e): pass
            else: raise e
        return self.loop.run_until_complete(self.publish_async(event, guaranteed_persistence=guaranteed_persistence))

    @property
    def stats(self) -> Dict[str, Any]: return self.metrics.get_metrics()
    def get_metrics(self) -> Dict[str, Any]: return self.metrics.get_metrics()

    async def health_check(self) -> Any:
        from .metrics import HealthStatus
        self._track_pending_events = True  # Enable tracking when health check is called
        return HealthStatus(
            healthy=all(not open for open in self._circuit_open.values()),
            details={"subscription_counts": {t.__name__: len(h) for t, h in self._subscriptions.items()},
                     "queue_depth": self._pending_events,
                     "error_rates": self._error_counts},
            last_event_time=time.time()
        )

    async def replay_events(self, event_type: Type[Event], since: datetime, until: Optional[datetime] = None):
        if not self.event_store: return
        events = await self.event_store.get_by_type(event_type, since=since, until=until)
        for event in events: await self.publish_async(event)

    async def restore_from_snapshot(self, snapshot: Any, replay_since: Optional[datetime] = None):
        if replay_since: await self.replay_events(Event, since=replay_since)
