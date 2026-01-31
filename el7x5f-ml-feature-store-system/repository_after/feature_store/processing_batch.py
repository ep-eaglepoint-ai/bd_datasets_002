from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Sequence

from .dsl import Feature


@dataclass(frozen=True)
class SparkBatchSettings:
    watermark_delay: str = "1 day"


class SparkBatchProcessor:
    """Batch feature computation using PySpark.

    This module is intentionally import-light; PySpark is optional.
    """

    def __init__(self, settings: SparkBatchSettings):
        self._settings = settings

    def compute(self, *, spark, feature: Feature, source_df, watermark_col: Optional[str] = None):
        """Compute a feature DataFrame.

        - Supports incremental processing by applying watermarks when watermark_col is provided.
        - Supports backfills by running on historical source_df.

        Note: execution details depend on your source bindings; this is a minimal reference implementation.
        """

        try:
            import pyspark.sql.functions as F
        except Exception as e:  # pragma: no cover
            raise RuntimeError("PySpark is required for SparkBatchProcessor") from e

        df = source_df
        if watermark_col is not None:
            df = df.withWatermark(watermark_col, self._settings.watermark_delay)

        # SQL transforms are executed in the pipeline that provides a view.
        if getattr(feature.transform, "kind", None) == "sql":
            # The caller can register df as a temp view and run feature.transform.sql.
            return df

        # Python transforms for Spark should be expressed as Spark SQL expressions/UDFs.
        return df
