from __future__ import annotations

from typing import List, Sequence

import pandas as pd


def point_in_time_join_pandas(
    *,
    labels: pd.DataFrame,
    features: pd.DataFrame,
    entity_keys: Sequence[str],
    label_time_col: str,
    feature_time_col: str,
    feature_cols: Sequence[str],
) -> pd.DataFrame:
    """Point-in-time correct join (pandas).

    For each label row, picks the latest feature row for the same entity where
    feature_time <= label_time.

    This prevents leakage by construction.
    """

    if labels.empty:
        return labels.copy()

    for col in list(entity_keys) + [label_time_col]:
        if col not in labels.columns:
            raise KeyError(f"labels missing column: {col}")
    for col in list(entity_keys) + [feature_time_col] + list(feature_cols):
        if col not in features.columns:
            raise KeyError(f"features missing column: {col}")

    left = labels.copy()
    right = features.copy()

    left[label_time_col] = pd.to_datetime(left[label_time_col], utc=True)
    right[feature_time_col] = pd.to_datetime(right[feature_time_col], utc=True)

    # Sort for merge_asof
    left = left.sort_values(list(entity_keys) + [label_time_col])
    right = right.sort_values(list(entity_keys) + [feature_time_col])

    joined = left
    # merge_asof supports a single "by" list for exact match on entity keys
    joined = pd.merge_asof(
        joined,
        right[list(entity_keys) + [feature_time_col] + list(feature_cols)],
        left_on=label_time_col,
        right_on=feature_time_col,
        by=list(entity_keys),
        direction="backward",
        allow_exact_matches=True,
    )

    # Drop the feature timestamp unless user explicitly needs it
    return joined.drop(columns=[feature_time_col])
