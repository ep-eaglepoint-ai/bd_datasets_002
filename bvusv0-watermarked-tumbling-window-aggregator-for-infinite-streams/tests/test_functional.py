from streamAggregator.stream_aggregator import StreamWindowAggregator

def test_basic_tumbling_windows():
    """Test basic 60-second tumbling window aggregation."""
    def stream():
        yield '{"timestamp": 100, "value": 10.0}'
        yield '{"timestamp": 110, "value": 20.0}'
        yield '{"timestamp": 115, "value": 30.0}'
        yield '{"timestamp": 180, "value": 40.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    assert len(results) >= 1
    assert results[0] == (60, 20.0)


def test_out_of_order_events():
    """Test handling of out-of-order events within allowed lateness."""
    def stream():
        yield '{"timestamp": 100, "value": 10.0}'
        yield '{"timestamp": 150, "value": 20.0}'
        yield '{"timestamp": 130, "value": 15.0}'
        yield '{"timestamp": 200, "value": 30.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=50)
    results = list(aggregator.process())
    
    assert len(results) >= 2
    window_120_result = [r for r in results if r[0] == 120]
    if window_120_result:
        assert window_120_result[0][1] == (20.0 + 15.0) / 2


def test_late_data_rejection():
    """Test that events exceeding allowed_lateness are dropped."""
    def stream():
        yield '{"timestamp": 100, "value": 10.0}'
        yield '{"timestamp": 200, "value": 20.0}'
        yield '{"timestamp": 50, "value": 999.0}'
        yield '{"timestamp": 260, "value": 30.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    window_0 = [r for r in results if r[0] == 0]
    if window_0:
        assert window_0[0][1] != 999.0


def test_allowed_lateness_prevents_premature_emission():
    """Test that windows aren't emitted prematurely before allowed_lateness expires."""
    def stream():
        yield '{"timestamp": 200, "value": 100.0}'
        yield '{"timestamp": 150, "value": 50.0}'
        yield '{"timestamp": 310, "value": 200.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=100)
    results = list(aggregator.process())
    
    window_120 = [r for r in results if r[0] == 120]
    assert len(window_120) == 1
    assert window_120[0][1] == 50.0
    
    window_180 = [r for r in results if r[0] == 180]
    assert len(window_180) == 1
    assert window_180[0][1] == 100.0


def test_malformed_json_handling():
    """Test graceful handling of malformed JSON and missing fields."""
    def stream():
        yield '{"timestamp": 100, "value": 10.0}'
        yield 'invalid json string'
        yield '{"timestamp": 110}'
        yield '{"value": 20.0}'
        yield '{"timestamp": 115, "value": 20.0}'
        yield '{"timestamp": 180, "value": 30.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    assert len(results) >= 1
    assert results[0] == (60, 15.0)


def test_arithmetic_mean_float_division():
    """Test that averages use proper float division."""
    def stream():
        yield '{"timestamp": 100, "value": 5.0}'
        yield '{"timestamp": 110, "value": 6.0}'
        yield '{"timestamp": 180, "value": 10.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    assert results[0][1] == 5.5


def test_empty_stream():
    """Test handling of empty stream."""
    def stream():
        return
        yield
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    assert results == []


def test_single_event():
    """Test handling of stream with single event."""
    def stream():
        yield '{"timestamp": 100, "value": 42.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    assert len(results) == 1
    assert results[0] == (60, 42.0)


def test_window_boundary_precision():
    """Test precise window boundary calculations using timestamp // 60."""
    def stream():
        yield '{"timestamp": 59, "value": 1.0}'
        yield '{"timestamp": 60, "value": 2.0}'
        yield '{"timestamp": 119, "value": 3.0}'
        yield '{"timestamp": 120, "value": 4.0}'
        yield '{"timestamp": 200, "value": 5.0}'
    
    aggregator = StreamWindowAggregator(stream(), allowed_lateness=30)
    results = list(aggregator.process())
    
    window_results = {r[0]: r[1] for r in results}
    assert window_results.get(0) == 1.0
    assert window_results.get(60) == 2.5
    assert window_results.get(120) == 4.0
