import json
import sys
import heapq
from collections import defaultdict


class StreamWindowAggregator:    
    def __init__(self, input_stream, allowed_lateness=30):
        self.input_stream = input_stream
        self.allowed_lateness = allowed_lateness
        self.window_size = 60
        self.max_timestamp = None
        self.windows = defaultdict(lambda: {'sum': 0.0, 'count': 0})
        self.window_heap = []
    
    def process(self):
        for json_line in self.input_stream:
            try:
                event = json.loads(json_line)
                timestamp = event['timestamp']
                value = event['value']
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
            
            if self.max_timestamp is None:
                self.max_timestamp = timestamp
            
            if timestamp < self.max_timestamp - self.allowed_lateness:
                continue
            
            if timestamp > self.max_timestamp:
                self.max_timestamp = timestamp
                yield from self._emit_completed_windows(self.max_timestamp)
            
            window_start = (timestamp // self.window_size) * self.window_size
            
            if window_start not in self.windows:
                window_completion_time = window_start + self.window_size + self.allowed_lateness
                heapq.heappush(self.window_heap, (window_completion_time, window_start))
            
            self.windows[window_start]['sum'] += value
            self.windows[window_start]['count'] += 1
        
        if self.max_timestamp is not None:
            yield from self._emit_all_remaining_windows()
    
    def _emit_completed_windows(self, new_watermark):
        while self.window_heap and self.window_heap[0][0] <= new_watermark:
            _, window_start = heapq.heappop(self.window_heap)
            
            if window_start in self.windows:
                window_data = self.windows[window_start]
                if window_data['count'] > 0:
                    average_value = window_data['sum'] / window_data['count']
                    yield (window_start, average_value)
                del self.windows[window_start]
    
    def _emit_all_remaining_windows(self):
        sorted_windows = sorted(self.windows.keys())
        
        for window_start in sorted_windows:
            window_data = self.windows[window_start]
            if window_data['count'] > 0:
                average_value = window_data['sum'] / window_data['count']
                yield (window_start, average_value)
            del self.windows[window_start]
        
        # Ensure the heap state is consistent with the cleared windows.
        self.window_heap.clear()


def main():
    """Run aggregator from command line, reading from stdin and writing to stdout."""
    aggregator = StreamWindowAggregator(sys.stdin, allowed_lateness=30)
    
    for window_start, average_value in aggregator.process():
        result = {
            'window_start': window_start,
            'average': average_value
        }
        print(json.dumps(result))


if __name__ == '__main__':
    main()