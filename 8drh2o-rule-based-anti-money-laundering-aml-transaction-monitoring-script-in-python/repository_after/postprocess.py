"""Alert post-processing and export utilities.

Functions:
- `deduplicate_alerts` removes duplicate alerts defined by
  (rule_id, transaction_id, timestamp).
- `sort_alerts` orders alerts by severity DESC then timestamp ASC.
- `export_alerts_csv` writes alerts to CSV with fixed schema.
"""

import csv
from datetime import timezone
from typing import Iterable, List

from .models import Alert
from . import config


def _ts_to_key(ts) -> str:
    # Normalize timestamp to UTC with second precision, append Z
    ts_utc = ts.astimezone(timezone.utc).replace(microsecond=0)
    return ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def deduplicate_alerts(alerts: Iterable[Alert]) -> List[Alert]:
    """Remove duplicates preserving first occurrence.

    Duplicates are defined by the tuple (rule_id, transaction_id, timestamp).
    Timestamp normalization uses UTC second precision.
    """
    seen = set()
    out: List[Alert] = []
    for a in alerts:
        key = (a.rule_id, a.transaction_id, _ts_to_key(a.timestamp))
        if key in seen:
            continue
        seen.add(key)
        out.append(a)
    return out


def sort_alerts(alerts: Iterable[Alert]) -> List[Alert]:
    """Sort alerts by severity DESC (HIGH first) then timestamp ASC.

    Sorting is stable for ties.
    """
    def sort_key(a: Alert):
        rank = config.SEVERITY_RANK.get(a.severity, 0)
        # negative rank for descending severity
        return (-rank, a.timestamp)

    return sorted(list(alerts), key=sort_key)


def export_alerts_csv(alerts: Iterable[Alert], path: str) -> None:
    """Write alerts to CSV at `path` using fixed schema.

    Schema: rule_id,severity,timestamp,transaction_id,details
    Timestamp is ISO Z (UTC) without microseconds.
    """
    alerts_list = deduplicate_alerts(alerts)
    alerts_list = sort_alerts(alerts_list)

    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["rule_id", "severity", "timestamp", "transaction_id", "details"])
        for a in alerts_list:
            writer.writerow([a.rule_id, a.severity, _ts_to_key(a.timestamp), a.transaction_id, a.details])
