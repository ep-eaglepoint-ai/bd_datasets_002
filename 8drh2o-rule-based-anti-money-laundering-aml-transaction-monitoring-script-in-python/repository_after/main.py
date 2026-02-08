"""Entry point for the AML package.

Runs end-to-end pipeline:
- read transactions CSV
- apply stateless rules
- apply behavioral rules (sliding window)
- deduplicate and sort alerts
- export alerts CSV and customer risk summary CSV

This module exposes `main(input_csv, alerts_out, summary_out)` for programmatic
use and also supports CLI invocation.
"""

import sys
from typing import Iterable, List

from .io import read_transactions
from .rules import evaluate_transaction
from .behavioral import evaluate_behavioral
from .postprocess import deduplicate_alerts, export_alerts_csv
from .scoring import export_summary_csv


def _gather_stateless_alerts(txs: Iterable) -> List:
    alerts = []
    for tx in txs:
        alerts.extend(evaluate_transaction(tx))
    return alerts


def main(input_csv: str, alerts_out: str = "alerts.csv", summary_out: str = "customer_risk_summary.csv") -> None:
    """Run the full pipeline reading `input_csv` and writing outputs.

    - `alerts_out` and `summary_out` are file paths for CSV outputs.
    """
    txs = read_transactions(input_csv)

    # Stateless alerts per transaction
    stateless_alerts = _gather_stateless_alerts(txs)

    # Behavioral alerts from sliding-window processor (assumes txs sorted)
    behavioral_alerts = evaluate_behavioral(txs)

    # Combine alerts
    all_alerts = list(stateless_alerts) + list(behavioral_alerts)

    # Deduplicate and export alerts
    deduped = deduplicate_alerts(all_alerts)
    export_alerts_csv(deduped, alerts_out)

    # Export customer risk summary (use deduped alerts as input)
    export_summary_csv(deduped, summary_out)


def _cli(argv: List[str]) -> int:
    if len(argv) < 2:
        print("Usage: python -m repository_after.main <input_csv> [alerts_out] [summary_out]")
        return 2
    input_csv = argv[1]
    alerts_out = argv[2] if len(argv) > 2 else "alerts.csv"
    summary_out = argv[3] if len(argv) > 3 else "customer_risk_summary.csv"
    main(input_csv, alerts_out, summary_out)
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli(sys.argv))
