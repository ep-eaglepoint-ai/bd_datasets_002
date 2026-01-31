from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class ValidationResult:
    success: bool
    details: Dict[str, Any]


class GreatExpectationsValidator:
    """Great Expectations integration (optional).

    The intent is:
    - automatic profiling
    - schema + statistical validation
    - drift checks between training/serving

    This is kept minimal for portability.
    """

    def __init__(self):
        try:
            import great_expectations as ge  # noqa: F401
        except Exception as e:  # pragma: no cover
            raise RuntimeError("great_expectations is required for validation") from e

    def validate_dataframe(self, df, expectation_suite=None) -> ValidationResult:
        # Minimal stub; real implementation should build a DataContext.
        return ValidationResult(success=True, details={"note": "validation stub"})
