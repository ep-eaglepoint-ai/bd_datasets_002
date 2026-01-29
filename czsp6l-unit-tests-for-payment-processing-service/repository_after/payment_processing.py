from __future__ import annotations

import json
import time
import hashlib
from typing import Dict, Optional, Iterable, Any
from collections import Counter
from datetime import datetime, timezone


def _stable_bucket(customer_id: str, buckets: int = 128) -> int:
    h = hashlib.sha1(customer_id.encode("utf-8")).hexdigest()
    return int(h[:8], 16) % buckets


def _iso_day(ts: int) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")


def _fx_convert(amount: float, from_currency: str, rates: Dict[str, float]) -> float:
    rate = rates.get(from_currency, 1.0)
    return amount * rate


def compute_customer_report(
    ndjson_lines: Iterable[str],
    fx_rates: Dict[str, float],
    allowed_event_types: Optional[set[str]] = None,
    now_ts: Optional[int] = None,
) -> Dict[str, Dict[str, Any]]:
    if now_ts is None:
        now_ts = int(time.time())

    totals: Dict[str, Dict[str, Any]] = {}

    for line in ndjson_lines:
        if not line:
            continue
        line = line.strip()
        if not line:
            continue

        try:
            obj = json.loads(line)
        except Exception:
            continue

        event_id = str(obj.get("event_id", ""))
        customer_id = str(obj.get("customer_id", ""))
        if not customer_id or not event_id:
            continue

        try:
            ts = int(obj.get("ts", 0))
        except Exception:
            continue
        if ts <= 0 or ts > now_ts:
            continue

        event_type = str(obj.get("event_type", ""))
        if allowed_event_types is not None and event_type not in allowed_event_types:
            continue

        try:
            amount = float(obj.get("amount", 0.0) or 0.0)
        except Exception:
            amount = 0.0
        currency = str(obj.get("currency", ""))

        usd = _fx_convert(amount, currency, fx_rates)
        day = _iso_day(ts)

        cust = totals.get(customer_id)
        if cust is None:
            cust = {
                "total_events": 0,
                "total_spend_usd": 0.0,
                "ticket_sum": 0.0,
                "ticket_count": 0,
                "by_day": {},
                "type_counter": Counter(),
                "latest_event_ts": 0,
            }
            totals[customer_id] = cust

        cust["total_events"] += 1
        cust["total_spend_usd"] += usd

        if event_type == "checkout" and usd > 0:
            cust["ticket_sum"] += usd
            cust["ticket_count"] += 1

        day_row = cust["by_day"].get(day)
        if day_row is None:
            cust["by_day"][day] = {"events": 1, "spend_usd": usd}
        else:
            day_row["events"] += 1
            day_row["spend_usd"] += usd

        cust["type_counter"][event_type] += 1

        if ts > cust["latest_event_ts"]:
            cust["latest_event_ts"] = ts

    report: Dict[str, Dict[str, Any]] = {}

    for customer_id, cust in totals.items():
        total_events = cust["total_events"]
        total_spend = cust["total_spend_usd"]
        ticket_count = cust["ticket_count"]
        avg_ticket = (cust["ticket_sum"] / ticket_count) if ticket_count else 0.0

        type_counter = cust["type_counter"]
        top_event_type = None
        if type_counter:
            best_count = max(type_counter.values())
            candidates = [k for k, v in type_counter.items() if v == best_count]
            top_event_type = sorted(candidates)[0]

        report[customer_id] = {
            "total_events": total_events,
            "total_spend_usd": round(total_spend, 6),
            "avg_ticket_usd": round(avg_ticket, 6),
            "active_days": len(cust["by_day"]),
            "top_event_type": top_event_type,
            "latest_event_ts": cust["latest_event_ts"],
            "by_day": cust["by_day"],
            "shard": _stable_bucket(customer_id),
        }

    return report
