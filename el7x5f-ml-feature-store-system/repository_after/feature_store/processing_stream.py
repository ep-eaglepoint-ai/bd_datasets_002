from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence


@dataclass(frozen=True)
class StreamSettings:
    app_id: str = "feature-store"


class FaustStreamProcessor:
    """Kafka + Faust streaming feature computation.

    This is a scaffolding layer suitable for production extension.
    The project keeps Faust optional so the library can be installed without Kafka.
    """

    def __init__(self, settings: StreamSettings):
        self._settings = settings

    def build_app(self):
        try:
            import faust
        except Exception as e:  # pragma: no cover
            raise RuntimeError("Faust is required for FaustStreamProcessor") from e

        return faust.App(self._settings.app_id)
