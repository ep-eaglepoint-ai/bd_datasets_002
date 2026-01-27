import sys
import os
from repository_after.app.stream_aggregator import StreamWindowAggregator

"""
Score and performance tests for StreamWindowAggregator.
Validates correctness metrics and edge case handling.
"""

def test_watermark_correctness():
    """Test that watermark is correctly maintained."""
    def stream():
        yield '{"timestamp": 100, "value": 1.0}'
        yield '{"timestamp": 200, "value": 2.0}'
        yield '{"timestamp": 150, "value": 3.0}'
    
    aggregator = StreamWindowAggregator(stream())
    list(aggregator.process())
    
    assert aggregator.max_timestamp == 200


def test_tumbling_window_assignment():
    """Test that events are assigned to correct windows."""
    def stream():
        yield '{"timestamp": 0, "value": 1.0}'
        yield '{"timestamp": 59, "value": 2.0}'
        yield '{"timestamp": 60, "value": 3.0}'
        yield '{"timestamp": 119, "value": 4.0}'
        yield '{"timestamp": 200, "value": 5.0}'
    
    aggregator = StreamWindowAggregator(stream())
    results = list(aggregator.process())
    
    windows = [r[0] for r in results]
    assert 0 in windows
    assert 60 in windows


def test_allowed_lateness_configuration():
    """Test that allowed_lateness parameter is respected."""
    def stream():
        yield '{"timestamp": 100, "value": 1.0}'
        yield '{"timestamp": 200, "value": 2.0}'
        yield '{"timestamp": 140, "value": 999.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=10)
    results = list(aggregator.process())
    
    all_values = [r[1] for r in results]
    for avg in all_values:
        assert avg != 999.0


def test_multiple_values_per_window():
    """Test correct aggregation of multiple values in same window."""
    def stream():
        for i in range(100, 120, 5):
            yield f'{{"timestamp": {i}, "value": {i}.0}}'
        yield '{"timestamp": 200, "value": 1.0}'
    
    aggregator = StreamWindowAggregator(stream())
    results = list(aggregator.process())
    
    window_60 = [r for r in results if r[0] == 60]
    assert len(window_60) == 1
    assert window_60[0][1] == sum(range(100, 120, 5)) / 4


def test_chronological_emission():
    """Test that windows are emitted in chronological order."""
    def stream():
        yield '{"timestamp": 250, "value": 1.0}'
        yield '{"timestamp": 100, "value": 2.0}'
        yield '{"timestamp": 500, "value": 3.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=200)
    results = list(aggregator.process())
    
    window_starts = [r[0] for r in results]
    assert window_starts == sorted(window_starts)
