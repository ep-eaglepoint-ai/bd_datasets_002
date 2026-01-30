from dataclasses import dataclass
from typing import Literal, Optional
from enum import Enum

class AlgorithmType(Enum):
    FIXED = "fixed"
    SLIDING_LOG = "sliding_log"
    SLIDING_COUNTER = "sliding_counter"
    TOKEN_BUCKET = "token_bucket"

@dataclass
class RateLimiterConfig:
    algorithm: AlgorithmType
    window_size_seconds: float = 60.0
    requests_per_window: int = 100
    bucket_capacity: Optional[int] = None
    refill_rate: Optional[float] = None

    def __post_init__(self):
        if self.window_size_seconds <= 0:
            raise ValueError("window_size_seconds must be positive")
        if self.requests_per_window <= 0:
            raise ValueError("requests_per_window must be positive")
        if self.algorithm == AlgorithmType.TOKEN_BUCKET:
            if not self.bucket_capacity or self.bucket_capacity <= 0:
                raise ValueError("bucket_capacity must be positive for token_bucket")
            if not self.refill_rate or self.refill_rate <= 0:
                raise ValueError("refill_rate must be positive for token_bucket")