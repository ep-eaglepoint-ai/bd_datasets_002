class EventEmitter:
    def __init__(self):
        self._events = {}

    def on(self, event_name, callback):
        if event_name not in self._events:
            self._events[event_name] = []
        self._events[event_name].append(callback)
        return self

    def emit(self, event_name, *args, **kwargs):
        listeners = self._events.get(event_name, [])
        if not listeners:
            return False
        
        for listener in listeners[:]:
            try:
                listener(*args, **kwargs)
            except Exception:
                raise 
        return True

    def once(self, event_name, callback):
        def wrapper(*args, **kwargs):
            self.off(event_name, wrapper)
            return callback(*args, **kwargs)
        
        wrapper._original_callback = callback
        return self.on(event_name, wrapper)

    def off(self, event_name, callback=None):
        if event_name not in self._events:
            return self
        
        if callback is None:
            del self._events[event_name]
            return self
        
        listeners = self._events[event_name]
        
        for i, listener in enumerate(listeners):
            if listener == callback or getattr(listener, '_original_callback', None) == callback:
                listeners.pop(i)
                if not listeners:
                    del self._events[event_name]
                break
        
        return self

    def remove_all_listeners(self):
        self._events.clear()
        return self

    def listeners(self, event_name):
        return self._events.get(event_name, [])[:]

    def listener_count(self, event_name):
        return len(self._events.get(event_name, []))

    def event_names(self):
        return list(self._events.keys())
