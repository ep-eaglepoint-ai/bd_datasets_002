from app.stream_aggregator import StreamWindowAggregator

def test_memory_cleanup():
    """Test that windows are deleted after emission to prevent memory leaks."""
    def stream():
        for i in range(0, 600, 60):
            yield f'{{"timestamp": {i + 30}, "value": 10.0}}'
        yield '{"timestamp": 10000, "value": 5.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    list(aggregator.process())
    
    assert len(aggregator.windows) <= 1


def test_class_structure():
    """Test that StreamWindowAggregator has required methods."""
    assert hasattr(StreamWindowAggregator, 'process')
    assert hasattr(StreamWindowAggregator, '_emit_completed_windows')
    assert hasattr(StreamWindowAggregator, '_emit_all_remaining_windows')


def test_window_size_constant():
    """Test that window_size is set to 60 seconds."""
    def stream():
        yield '{"timestamp": 100, "value": 1.0}'
    
    aggregator = StreamWindowAggregator(stream())
    assert aggregator.window_size == 60


def test_iterator_based_processing():
    """Test that process method returns a generator."""
    def stream():
        yield '{"timestamp": 100, "value": 1.0}'
    
    aggregator = StreamWindowAggregator(stream())
    result = aggregator.process()
    
    import types
    assert isinstance(result, types.GeneratorType)
