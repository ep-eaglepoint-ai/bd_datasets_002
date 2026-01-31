from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import uuid
from typing import Any, Dict, Type, TypeVar, Optional, cast, Generic

E = TypeVar("E", bound="Event")
T = TypeVar("T")

_uuid4 = uuid.uuid4
_now = datetime.now
_utc = timezone.utc

@dataclass(frozen=True, kw_only=True)
class Event(Generic[T]):
    event_id: str = field(default_factory=lambda: _uuid4().hex)
    timestamp: datetime = field(default_factory=lambda: _now(_utc))
    source: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    payload: Optional[T] = None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["__type__"] = self.__class__.__name__
        return data

    @classmethod
    def from_dict(cls: Type[E], data: Dict[str, Any]) -> E:
        # Shallow copy to avoid modifying input
        data = data.copy()
        type_name = data.pop("__type__", None)
        
        # Handle timestamp conversion if it's a string
        if isinstance(data.get("timestamp"), str):
            data["timestamp"] = datetime.fromisoformat(data["timestamp"])
            
        # Find the correct subclass if type_name is provided
        target_cls = cls
        if type_name and type_name != cls.__name__:
            # Search in subclasses
            for subclass in cls.__subclasses__():
                if subclass.__name__ == type_name:
                    target_cls = subclass
                    break
            # Recursive search for deeper subclasses
            if target_cls == cls:
                def find_subclass(current_cls, name):
                    for sub in current_cls.__subclasses__():
                        if sub.__name__ == name:
                            return sub
                        res = find_subclass(sub, name)
                        if res:
                            return res
                    return None
                found = find_subclass(cls, type_name)
                if found:
                    target_cls = found

        return target_cls(**data)

    def __str__(self) -> str:
        return f"{self.__class__.__name__}(id={self.event_id}, source='{self.source}', timestamp={self.timestamp})"

@dataclass(frozen=True, kw_only=True)
class UserEvent(Event):
    user_id: str

@dataclass(frozen=True, kw_only=True)
class UserCreatedEvent(UserEvent):
    email: str
