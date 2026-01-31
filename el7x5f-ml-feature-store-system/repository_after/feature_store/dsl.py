from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence, Set, Tuple, Union


@dataclass(frozen=True)
class FeatureMetadata:
    description: str
    owner: str
    tags: Tuple[str, ...] = ()
    version: str = "v1"


@dataclass(frozen=True)
class FeatureSource:
    """Binding to a data source.

    In production you can back this by:
    - a SQL table/view (offline)
    - a Kafka topic (streaming)

    This class is intentionally lightweight; richer connectors can wrap it.
    """

    name: str
    kind: str  # "sql" | "kafka" | "custom"
    identifier: str  # table name, topic name, etc.


class Transform:
    kind: str


@dataclass(frozen=True)
class SQLTransform(Transform):
    sql: str
    kind: str = "sql"


@dataclass(frozen=True)
class PythonTransform(Transform):
    func: Callable[[Any], Any]
    kind: str = "python"


@dataclass
class Feature:
    """Declarative feature definition.

    A Feature may depend on other Features. Dependencies are used for lineage.

    Minimal fields to support training-serving consistency:
    - entity_keys: the join keys (e.g. user_id)
    - event_timestamp: column name used for point-in-time joins
    """

    name: str
    entity_keys: Tuple[str, ...]
    event_timestamp: str
    source: FeatureSource
    transform: Union[SQLTransform, PythonTransform]
    metadata: FeatureMetadata
    depends_on: Tuple[str, ...] = ()
    default_value: Optional[Any] = None

    def dependency_set(self) -> Set[str]:
        return set(self.depends_on)


def feature(
    *,
    name: str,
    entity_keys: Sequence[str],
    event_timestamp: str,
    source: FeatureSource,
    transform: Union[SQLTransform, PythonTransform],
    description: str,
    owner: str,
    tags: Sequence[str] = (),
    version: str = "v1",
    depends_on: Sequence[str] = (),
    default_value: Optional[Any] = None,
) -> Feature:
    """Convenience constructor for Feature definitions."""

    return Feature(
        name=name,
        entity_keys=tuple(entity_keys),
        event_timestamp=event_timestamp,
        source=source,
        transform=transform,
        metadata=FeatureMetadata(
            description=description,
            owner=owner,
            tags=tuple(tags),
            version=version,
        ),
        depends_on=tuple(depends_on),
        default_value=default_value,
    )
