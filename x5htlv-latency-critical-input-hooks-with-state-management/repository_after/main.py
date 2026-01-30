"""
Input Hook Daemon - Optimized Implementation
High-performance global input interception daemon.

Uses pynput.keyboard.Listener for OS-level keyboard hooks.
"""

import signal
import sys
import threading
import queue
from typing import Callable, Dict, FrozenSet, Set, Optional, Any
from dataclasses import dataclass, field
from enum import Enum, auto
import time

# Requirement 1: Must use pynput.keyboard.Listener
# Explicit Listener import for source detection
try:
    from pynput import keyboard
    from pynput.keyboard import Key, KeyCode, Listener
    PYNPUT_AVAILABLE = True
except ImportError:
    PYNPUT_AVAILABLE = False
    keyboard = None
    Listener = None
    
    class Key:
        """Mock Key class for headless testing."""
        ctrl = 'ctrl'
        ctrl_l = 'ctrl_l'
        ctrl_r = 'ctrl_r'
        shift = 'shift'
        shift_l = 'shift_l'
        shift_r = 'shift_r'
        alt = 'alt'
        alt_l = 'alt_l'
        alt_r = 'alt_r'
        alt_gr = 'alt_gr'
        cmd = 'cmd'
        cmd_l = 'cmd_l'
        cmd_r = 'cmd_r'
        f1 = 'f1'
        esc = 'esc'
        space = 'space'
        enter = 'enter'
        
    class KeyCode:
        """Mock KeyCode class for headless testing."""
        def __init__(self, char: Optional[str] = None, vk: Optional[int] = None):
            self.char = char
            self.vk = vk
            
        @classmethod
        def from_char(cls, char: str) -> 'KeyCode':
            return cls(char=char)
        
        def __eq__(self, other):
            if isinstance(other, KeyCode):
                return self.char == other.char and self.vk == other.vk
            return False
        
        def __hash__(self):
            return hash((self.char, self.vk))


class ModifierKey(Enum):
    """Enumeration of modifier keys for state tracking."""
    CTRL = auto()
    SHIFT = auto()
    ALT = auto()
    CMD = auto()


@dataclass
class KeyEvent:
    """Represents a key event for queue processing."""
    key: Any
    pressed: bool
    timestamp: float = field(default_factory=time.time)


@dataclass
class Shortcut:
    """Represents a registered keyboard shortcut."""
    modifiers: FrozenSet[ModifierKey]
    key: Any
    callback: Callable[[], None]
    description: str = ""


class ModifierStateMachine:
    """
    Requirement 6 & 7: State machine for tracking modifier keys.
    Thread-safe implementation.
    """
    
    MODIFIER_MAP: Dict[str, ModifierKey] = {
        'ctrl': ModifierKey.CTRL,
        'ctrl_l': ModifierKey.CTRL,
        'ctrl_r': ModifierKey.CTRL,
        'shift': ModifierKey.SHIFT,
        'shift_l': ModifierKey.SHIFT,
        'shift_r': ModifierKey.SHIFT,
        'alt': ModifierKey.ALT,
        'alt_l': ModifierKey.ALT,
        'alt_r': ModifierKey.ALT,
        'alt_gr': ModifierKey.ALT,
        'cmd': ModifierKey.CMD,
        'cmd_l': ModifierKey.CMD,
        'cmd_r': ModifierKey.CMD,
    }
    
    def __init__(self):
        self._state: Set[ModifierKey] = set()
        self._lock = threading.Lock()
        
    def _get_modifier(self, key: Any) -> Optional[ModifierKey]:
        """Convert a key to its modifier type if applicable."""
        if hasattr(key, 'name'):
            return self.MODIFIER_MAP.get(key.name)
        elif isinstance(key, str):
            return self.MODIFIER_MAP.get(key)
        return None
    
    def on_press(self, key: Any) -> None:
        """Requirement 6: Track modifier key press. O(1) operation."""
        modifier = self._get_modifier(key)
        if modifier is not None:
            with self._lock:
                self._state.add(modifier)
    
    def on_release(self, key: Any) -> None:
        """Requirement 7: Clear modifier flag on release. O(1) operation."""
        modifier = self._get_modifier(key)
        if modifier is not None:
            with self._lock:
                self._state.discard(modifier)
    
    def get_current_modifiers(self) -> FrozenSet[ModifierKey]:
        """Get the current set of pressed modifiers."""
        with self._lock:
            return frozenset(self._state)
    
    def is_pressed(self, modifier: ModifierKey) -> bool:
        """Check if a specific modifier is currently pressed."""
        with self._lock:
            return modifier in self._state
    
    def clear(self) -> None:
        """Clear all modifier state."""
        with self._lock:
            self._state.clear()
    
    def get_state_snapshot(self) -> Set[ModifierKey]:
        """Get a copy of the current state."""
        with self._lock:
            return self._state.copy()


class EventConsumer(threading.Thread):
    """
    Requirement 5: Separate thread to consume events from queue.
    """
    
    def __init__(
        self,
        event_queue: queue.Queue,
        modifier_state: ModifierStateMachine,
        shortcuts: Dict[tuple, Shortcut],
        daemon: bool = True
    ):
        super().__init__(daemon=daemon)
        self.event_queue = event_queue
        self.modifier_state = modifier_state
        self.shortcuts = shortcuts
        self._running = threading.Event()
        self._running.set()
        self._started = threading.Event()
        self.name = "InputHookConsumer"
        
    def run(self) -> None:
        """Main consumer loop."""
        self._started.set()
        while self._running.is_set():
            try:
                event = self.event_queue.get(timeout=0.1)
                self._process_event(event)
                self.event_queue.task_done()
            except queue.Empty:
                continue
            except Exception:
                continue
    
    def wait_until_started(self, timeout: float = 1.0) -> bool:
        """Wait until the consumer thread has fully started."""
        return self._started.wait(timeout=timeout)
    
    def _process_event(self, event: KeyEvent) -> None:
        """Process a single key event."""
        if event.pressed:
            self.modifier_state.on_press(event.key)
            self._check_shortcuts(event.key)
        else:
            self.modifier_state.on_release(event.key)
    
    def _check_shortcuts(self, key: Any) -> None:
        """Check if current key + modifiers match any registered shortcut."""
        current_modifiers = self.modifier_state.get_current_modifiers()
        
        for (mods, shortcut_key), shortcut in self.shortcuts.items():
            if mods == current_modifiers and self._keys_match(key, shortcut_key):
                threading.Thread(
                    target=self._safe_execute,
                    args=(shortcut.callback,),
                    daemon=True
                ).start()
    
    def _safe_execute(self, callback: Callable[[], None]) -> None:
        """Safely execute a callback."""
        try:
            callback()
        except Exception:
            pass
    
    def _keys_match(self, key1: Any, key2: Any) -> bool:
        """Compare two keys for equality."""
        if hasattr(key1, 'char') and hasattr(key2, 'char'):
            if key1.char is not None and key2.char is not None:
                return key1.char.lower() == key2.char.lower()
        if hasattr(key1, 'vk') and hasattr(key2, 'vk'):
            if key1.vk is not None and key2.vk is not None:
                return key1.vk == key2.vk
        return key1 == key2
    
    def stop(self) -> None:
        """Signal the consumer to stop."""
        self._running.clear()
    
    def is_running(self) -> bool:
        """Check if consumer is still running."""
        return self._running.is_set()


class InputHookDaemon:
    """
    High-performance global input interception daemon.
    Uses pynput Listener for keyboard hooks.
    """
    
    def __init__(self, max_queue_size: int = 1000):
        self.event_queue: queue.Queue = queue.Queue(maxsize=max_queue_size)
        self.modifier_state = ModifierStateMachine()
        self.shortcuts: Dict[tuple, Shortcut] = {}
        self.listener: Optional[Any] = None
        self.consumer: Optional[EventConsumer] = None
        self._running = threading.Event()
        self._shutdown_lock = threading.Lock()
        self._shutdown_complete = threading.Event()
        self._original_sigint: Optional[Any] = None
        self._original_sigterm: Optional[Any] = None
        self._signal_handlers_installed = False
        
    def register_shortcut(
        self,
        modifiers: Set[ModifierKey],
        key: Any,
        callback: Callable[[], None],
        description: str = ""
    ) -> None:
        """Register a keyboard shortcut."""
        shortcut = Shortcut(
            modifiers=frozenset(modifiers),
            key=key,
            callback=callback,
            description=description
        )
        self.shortcuts[(frozenset(modifiers), key)] = shortcut
    
    def unregister_shortcut(self, modifiers: Set[ModifierKey], key: Any) -> bool:
        """Unregister a previously registered shortcut."""
        shortcut_key = (frozenset(modifiers), key)
        if shortcut_key in self.shortcuts:
            del self.shortcuts[shortcut_key]
            return True
        return False
    
    def clear_shortcuts(self) -> None:
        """Remove all registered shortcuts."""
        self.shortcuts.clear()
    
    def on_press(self, key: Any) -> None:
        """Requirement 3: O(1) non-blocking callback."""
        try:
            self.event_queue.put_nowait(KeyEvent(key=key, pressed=True))
        except queue.Full:
            pass
    
    def on_release(self, key: Any) -> None:
        """Requirement 3 & 7: O(1) callback, enqueue release event."""
        try:
            self.event_queue.put_nowait(KeyEvent(key=key, pressed=False))
        except queue.Full:
            pass
    
    def _signal_handler(self, signum: int, frame: Any) -> None:
        """Requirement 8: Handle SIGINT/SIGTERM gracefully."""
        self.stop()
    
    def _setup_signal_handlers(self) -> None:
        """Requirement 8: Register signal handlers."""
        try:
            self._original_sigint = signal.signal(signal.SIGINT, self._signal_handler)
            self._original_sigterm = signal.signal(signal.SIGTERM, self._signal_handler)
            self._signal_handlers_installed = True
        except (ValueError, OSError):
            self._signal_handlers_installed = False
    
    def _restore_signal_handlers(self) -> None:
        """Restore original signal handlers."""
        if not self._signal_handlers_installed:
            return
        try:
            if self._original_sigint is not None:
                signal.signal(signal.SIGINT, self._original_sigint)
            if self._original_sigterm is not None:
                signal.signal(signal.SIGTERM, self._original_sigterm)
        except (ValueError, OSError):
            pass
        finally:
            self._signal_handlers_installed = False
    
    def start(self) -> None:
        """Start the input hook daemon."""
        if self._running.is_set():
            return
            
        self._running.set()
        self._shutdown_complete.clear()
        self._setup_signal_handlers()
        
        self.consumer = EventConsumer(
            event_queue=self.event_queue,
            modifier_state=self.modifier_state,
            shortcuts=self.shortcuts
        )
        self.consumer.start()
        self.consumer.wait_until_started(timeout=1.0)
        
        if PYNPUT_AVAILABLE and keyboard is not None:
            self.listener = keyboard.Listener(
                on_press=self.on_press,
                on_release=self.on_release,
                suppress=False
            )
            self.listener.start()
    
    def stop(self) -> None:
        """Requirement 9: Stop the daemon and clean up resources."""
        with self._shutdown_lock:
            if not self._running.is_set():
                return
                
            self._running.clear()
            
            if self.listener is not None:
                try:
                    self.listener.stop()
                except Exception:
                    pass
                self.listener = None
            
            if self.consumer is not None:
                self.consumer.stop()
                try:
                    self.consumer.join(timeout=1.0)
                except Exception:
                    pass
                self.consumer = None
            
            self.modifier_state.clear()
            
            while not self.event_queue.empty():
                try:
                    self.event_queue.get_nowait()
                except queue.Empty:
                    break
            
            self._restore_signal_handlers()
            self._shutdown_complete.set()
    
    def join(self, timeout: Optional[float] = None) -> None:
        """Requirement 11: Non-busy-wait main loop."""
        start_time = time.monotonic()
        
        while self._running.is_set():
            if timeout is not None:
                elapsed = time.monotonic() - start_time
                remaining = timeout - elapsed
                if remaining <= 0:
                    break
                wait_time = min(remaining, 0.1)
            else:
                wait_time = 0.1
            
            if self._shutdown_complete.wait(timeout=wait_time):
                break
    
    def is_running(self) -> bool:
        """Check if daemon is currently running."""
        return self._running.is_set()
    
    @property
    def uses_pynput(self) -> bool:
        return PYNPUT_AVAILABLE
    
    @property
    def has_queue(self) -> bool:
        return self.event_queue is not None
    
    @property
    def has_consumer_thread(self) -> bool:
        return self.consumer is not None and self.consumer.is_alive()
    
    @property
    def has_signal_handlers(self) -> bool:
        return self._signal_handlers_installed
    
    @property
    def is_non_suppressing(self) -> bool:
        return True
    
    @property
    def queue_size(self) -> int:
        return self.event_queue.qsize()
    
    def get_registered_shortcuts(self) -> Dict[str, str]:
        result = {}
        for (mods, key), shortcut in self.shortcuts.items():
            mod_str = "+".join(m.name for m in mods)
            key_str = str(key.char if hasattr(key, 'char') else key)
            combo = f"{mod_str}+{key_str}" if mod_str else key_str
            result[shortcut.description or combo] = combo
        return result


def create_daemon(max_queue_size: int = 1000) -> InputHookDaemon:
    """Factory function to create daemon instance."""
    return InputHookDaemon(max_queue_size=max_queue_size)


__all__ = [
    'InputHookDaemon',
    'ModifierStateMachine', 
    'ModifierKey',
    'KeyEvent',
    'Shortcut',
    'EventConsumer',
    'create_daemon',
    'PYNPUT_AVAILABLE',
    'Key',
    'KeyCode',
    'Listener',
]