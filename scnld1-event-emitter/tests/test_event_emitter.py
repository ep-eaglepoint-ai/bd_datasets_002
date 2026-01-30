import pytest
from repository_after.event_emitter import EventEmitter
from unittest.mock import Mock

class TestEventEmitter:
    def test_on_and_emit(self):
        """Test basic registration and emission with arguments."""
        ee = EventEmitter()
        mock_cb = Mock()
        
        ee.on('event', mock_cb)
        assert ee.emit('event', 1, 2, a=3) is True
        
        mock_cb.assert_called_once_with(1, 2, a=3)
        assert ee.emit('non_existent') is False

    def test_emit_order(self):
        """Test multiple listeners are called in registration order."""
        ee = EventEmitter()
        call_order = []
        
        cb1 = lambda: call_order.append(1)
        cb2 = lambda: call_order.append(2)
        
        ee.on('event', cb1)
        ee.on('event', cb2)
        
        ee.emit('event')
        assert call_order == [1, 2]

    def test_once(self):
        """Test that once listeners are called only once."""
        ee = EventEmitter()
        mock_cb = Mock()
        
        ee.once('event', mock_cb)
        ee.emit('event', 'first')
        ee.emit('event', 'second')
        
        mock_cb.assert_called_once_with('first')
        assert ee.listener_count('event') == 0

    def test_off_specific(self):
        """Test removing a specific listener."""
        ee = EventEmitter()
        cb1 = Mock()
        cb2 = Mock()
        
        ee.on('event', cb1)
        ee.on('event', cb2)
        
        ee.off('event', cb1)
        ee.emit('event')
        
        cb1.assert_not_called()
        cb2.assert_called_once()
        assert ee.listener_count('event') == 1

    def test_off_once_listener(self):
        """Test removing a once listener before it fires."""
        ee = EventEmitter()
        cb = Mock()
        
        ee.once('event', cb)
        ee.off('event', cb)
        
        ee.emit('event')
        cb.assert_not_called()
        assert ee.listener_count('event') == 0

    def test_off_event_all(self):
        """Test removing all listeners for a specific event."""
        ee = EventEmitter()
        ee.on('event', lambda: None)
        ee.on('event', lambda: None)
        ee.on('other', lambda: None)
        
        ee.off('event')
        
        assert ee.listener_count('event') == 0
        assert ee.listener_count('other') == 1

    def test_remove_all_listeners(self):
        """Test clearing all events."""
        ee = EventEmitter()
        ee.on('a', lambda: None)
        ee.on('b', lambda: None)
        
        ee.remove_all_listeners()
        assert ee.event_names() == []

    def test_listeners_and_counts(self):
        """Test inspection methods."""
        ee = EventEmitter()
        cb1 = lambda: None
        cb2 = lambda: None
        
        ee.on('a', cb1)
        ee.on('a', cb2)
        
        assert ee.listener_count('a') == 2
        assert len(ee.listeners('a')) == 2
        assert ee.listeners('a') == [cb1, cb2]
        assert 'a' in ee.event_names()

    def test_listener_list_isolation(self):
        """Test that modifying the list from listeners() doesn't affect internal state."""
        ee = EventEmitter()
        ee.on('event', lambda: None)
        
        l = ee.listeners('event')
        l.append(lambda: None)
        
        assert ee.listener_count('event') == 1

    def test_emit_modification_safe(self):
        """Test that removing a listener during emission works safely."""
        ee = EventEmitter()
        
        def remove_self():
            ee.off('event', remove_self)
            
        mock_cb = Mock()
        
        ee.on('event', remove_self)
        ee.on('event', mock_cb)
        
        
        
        ee.emit('event')
        
        mock_cb.assert_called_once()
        assert ee.listener_count('event') == 1

    def test_chaining(self):
        """Verify methods return self for chaining."""
        ee = EventEmitter()
        res = ee.on('a', lambda: None).once('b', lambda: None).off('a')
        assert res is ee

    def test_events_cleared_mem_leak(self):
        """Test that removing the last listener removes the event key."""
        ee = EventEmitter()
        cb = lambda: None
        ee.on('event', cb)
        ee.off('event', cb)
        
        # Verify event key is removed from internal storage
        assert 'event' not in ee._events
        assert ee.event_names() == []
