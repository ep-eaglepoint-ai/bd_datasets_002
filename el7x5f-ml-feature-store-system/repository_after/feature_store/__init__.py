"""Feature store library package.

This package provides:
- Declarative DSL for features
- SQLAlchemy-backed registry (PostgreSQL)
- Online serving (Redis)
- Training data generation (point-in-time correct joins)
- FastAPI app for discovery and serving

Optional integrations (Spark/Faust/Great Expectations) are designed to be
importable without requiring those heavy dependencies at runtime.
"""

from .dsl import (
    Feature,
    FeatureMetadata,
    FeatureSource,
    PythonTransform,
    SQLTransform,
    feature,
)
from .registry import FeatureRegistry, RegistrySettings
from .serving import OnlineStore, RedisOnlineStore
from .pit_join import point_in_time_join_pandas

__all__ = [
    "Feature",
    "FeatureMetadata",
    "FeatureSource",
    "PythonTransform",
    "SQLTransform",
    "feature",
    "FeatureRegistry",
    "RegistrySettings",
    "OnlineStore",
    "RedisOnlineStore",
    "point_in_time_join_pandas",
]
