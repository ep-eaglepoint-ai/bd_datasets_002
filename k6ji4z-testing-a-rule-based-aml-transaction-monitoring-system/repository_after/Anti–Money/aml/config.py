from dataclasses import dataclass, field
from datetime import timedelta


@dataclass
class MonitoringConfig:
    base_currency: str = "USD"
    windows: list[timedelta] = field(
        default_factory=lambda: [
            timedelta(hours=6),
            timedelta(hours=24),
            timedelta(days=7),
        ]
    )
