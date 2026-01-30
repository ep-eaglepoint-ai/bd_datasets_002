from datetime import datetime, timedelta, timezone

from aml.config import MonitoringConfig
from aml.engine import TransactionMonitor
from aml.models import CustomerProfile, Transaction, TxnType
from aml.rules import (
    StructuringSmurfingRule,
    RapidInOutTurnoverRule,
    CounterpartyDispersionRule,
    HighRiskGeoRule,
    PeerOutflowAnomalyRule,
)


def main():
    cfg = MonitoringConfig()
    monitor = TransactionMonitor(
        config=cfg,
        rules=[
            StructuringSmurfingRule(),
            RapidInOutTurnoverRule(),
            CounterpartyDispersionRule(),
            HighRiskGeoRule(),
            PeerOutflowAnomalyRule(),
        ],
    )

    cust = CustomerProfile(
        customer_id="C001",
        risk_score=0.72,
        segment="retail",
        residence_country="US",
        pep=False,
        expected_monthly_volume=8000.0,
    )

    now = datetime.now(timezone.utc).replace(microsecond=0)

    # Seed peer distribution (needed for PeerOutflowAnomalyRule)
    for i in range(260):
        fake = CustomerProfile(
            customer_id=f"P{i}",
            risk_score=0.2,
            segment="retail",
            residence_country="US",
            pep=False,
            expected_monthly_volume=5000.0,
        )
        t = Transaction(
            txn_id=f"T_peer_{i}",
            ts=now - timedelta(days=1, hours=i % 5),
            customer_id=fake.customer_id,
            account_id=f"A_peer_{i}",
            counterparty_id=f"X{i}",
            amount=200 + (i % 50) * 30,
            currency="USD",
            txn_type=TxnType.TRANSFER,
            channel="api",
            direction="out",
            country="US",
        )
        monitor.process(t, fake)

    alerts_all = []

    # Structuring pattern: 6 cash-outs just under 10k
    for k in range(6):
        t = Transaction(
            txn_id=f"T_struct_{k}",
            ts=now - timedelta(hours=1, minutes=10 * k),
            customer_id=cust.customer_id,
            account_id="A001",
            counterparty_id=None,
            amount=9800.0,
            currency="USD",
            txn_type=TxnType.CASH_OUT,
            channel="branch",
            direction="out",
            country="US",
        )
        alerts_all.extend(monitor.process(t, cust))

    # Rapid turnover: big inflow then outflow quickly
    t_in = Transaction(
        txn_id="T_in_big",
        ts=now - timedelta(hours=5),
        customer_id=cust.customer_id,
        account_id="A001",
        counterparty_id="SENDER1",
        amount=60000.0,
        currency="USD",
        txn_type=TxnType.TRANSFER,
        channel="api",
        direction="in",
        country="US",
    )
    alerts_all.extend(monitor.process(t_in, cust))

    for j in range(4):
        t_out = Transaction(
            txn_id=f"T_out_{j}",
            ts=now - timedelta(hours=1, minutes=20 * j),
            customer_id=cust.customer_id,
            account_id="A001",
            counterparty_id=f"BEN{j}",
            amount=14000.0,
            currency="USD",
            txn_type=TxnType.TRANSFER,
            channel="api",
            direction="out",
            country="US",
        )
        alerts_all.extend(monitor.process(t_out, cust))

    # High-risk geo example
    t_geo = Transaction(
        txn_id="T_geo",
        ts=now,
        customer_id=cust.customer_id,
        account_id="A001",
        counterparty_id="FOREIGN1",
        amount=9000.0,
        currency="USD",
        txn_type=TxnType.TRANSFER,
        channel="api",
        direction="out",
        country="IR",
    )
    alerts_all.extend(monitor.process(t_geo, cust))

    # Print alerts
    for a in alerts_all:
        print(f"[{a.severity.upper()}] {a.rule_id} — {a.title}")
        print(" ", a.rationale)
        print("  evidence:", a.evidence)
        print("  txns:", a.transactions)
        print("-" * 70)


if __name__ == "__main__":
    main()
