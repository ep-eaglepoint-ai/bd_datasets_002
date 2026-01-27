import json
from collections import defaultdict


class StreamWindowAggregator:
    """
    Watermark-based tumbling window aggregator for infinite streams.
    Implements 60-second windows with event-time semantics and memory-efficient cleanup.
    """
    
    def __init__(self, input_stream, allowed_lateness=30):
        """
        Args:
            input_stream: Iterator of JSON strings with 'timestamp' and 'value' fields
            allowed_lateness: Maximum seconds an event can lag behind watermark
        """
        self.input_stream = input_stream
        self.allowed_lateness = allowed_lateness
        self.max_timestamp = None
        self.windows = defaultdict(list)
        self.WINDOW_SIZE = 60
    
    def process(self):
        """
        Process stream and yield (window_start, average_value) tuples.
        Windows are emitted when watermark passes their end time.
        """
        for json_line in self.input_stream:
            try:
                event = json.loads(json_line)
                timestamp = event['timestamp']
                value = event['value']
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
            
            if self.max_timestamp is None:
                self.max_timestamp = timestamp
            
            # Drop late events
            if timestamp < self.max_timestamp - self.allowed_lateness:
                continue
            
            # Update watermark and emit completed windows
            if timestamp > self.max_timestamp:
                old_watermark = self.max_timestamp
                self.max_timestamp = timestamp
                yield from self._emit_completed_windows(old_watermark, self.max_timestamp)
            
            # Assign to tumbling window
            window_start = (timestamp // self.WINDOW_SIZE) * self.WINDOW_SIZE
            self.windows[window_start].append(value)
        
        # Emit remaining windows
        if self.max_timestamp is not None:
            yield from self._emit_all_remaining_windows()
    
    def _emit_completed_windows(self, old_watermark, new_watermark):
        """Emit and delete windows completed by watermark advancement."""
        windows_to_emit = []
        
        for window_start in list(self.windows.keys()):
            window_end = window_start + self.WINDOW_SIZE
            if window_end <= new_watermark:
                windows_to_emit.append(window_start)
        
        windows_to_emit.sort()
        
        for window_start in windows_to_emit:
            values = self.windows[window_start]
            if values:
                average_value = sum(values) / len(values)
                yield (window_start, average_value)
            del self.windows[window_start]
    
    def _emit_all_remaining_windows(self):
        """Flush remaining windows when stream ends."""
        sorted_windows = sorted(self.windows.keys())
        
        for window_start in sorted_windows:
            values = self.windows[window_start]
            if values:
                average_value = sum(values) / len(values)
                yield (window_start, average_value)
            del self.windows[window_start]
