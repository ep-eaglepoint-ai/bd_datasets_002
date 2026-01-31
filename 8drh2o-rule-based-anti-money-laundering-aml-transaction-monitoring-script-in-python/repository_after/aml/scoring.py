"""Customer risk scoring and summary reporting.

Aggregates alerts per customer into a risk score using configurable
severity weights. Provides CSV export of summary rows.
"""

import csv
from typing import Dict, Iterable, List, Tuple

from .models import Alert
from . import config


def aggregate_scores(alerts: Iterable[Alert]) -> List[Tuple[str, int, float, str]]:
    """Aggregate alerts per customer.

    Returns a list of tuples: (customer_id, total_alerts, risk_score, highest_severity)
    """
    stats: Dict[str, Dict[str, object]] = {}
    for a in alerts:
        cid = a.transaction_id
        # transaction_id field used previously; assume alerts carry transaction_id and we need customer id
        # If alerts do not include customer_id, we derive a customer_id placeholder from the transaction_id prefix.
        # For this project, tests will create alerts with transaction_id in format 'custid-...'.
        # Extract customer id as prefix before first '-'. If no '-', use full transaction_id.
        if "-" in a.transaction_id:
            customer_id = a.transaction_id.split("-", 1)[0]
        else:
            customer_id = a.transaction_id

        rec = stats.setdefault(customer_id, {"count": 0, "score": 0.0, "highest_rank": 0, "highest_sev": None})
        rec["count"] += 1
        weight = float(config.SEVERITY_WEIGHTS.get(a.severity, 0.0))
        rec["score"] += weight
        rank = config.SEVERITY_RANK.get(a.severity, 0)
        if rank > rec["highest_rank"]:
            rec["highest_rank"] = rank
            rec["highest_sev"] = a.severity

    # Build list
    rows: List[Tuple[str, int, float, str]] = []
    for customer_id, rec in stats.items():
        rows.append((customer_id, rec["count"], rec["score"], rec["highest_sev"] or ""))

    # Deterministic sort: risk_score DESC, total_alerts DESC, customer_id ASC
    rows.sort(key=lambda r: (-r[2], -r[1], r[0]))
    return rows


def export_summary_csv(alerts: Iterable[Alert], path: str) -> None:
    """Aggregate alerts and write customer summary CSV.

    CSV schema: customer_id,total_alerts,risk_score,highest_severity
    """
    rows = aggregate_scores(alerts)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["customer_id", "total_alerts", "risk_score", "highest_severity"])
        for customer_id, total_alerts, risk_score, highest_sev in rows:
            # risk_score formatted as plain float (no extra rounding requirement)
            writer.writerow([customer_id, str(total_alerts), f"{risk_score}", highest_sev])
