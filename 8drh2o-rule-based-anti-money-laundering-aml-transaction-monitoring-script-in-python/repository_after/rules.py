"""Stateless rule evaluation for AML transactions.

Each rule returns zero or more `Alert` objects defined in
`repository_after.aml.models`. Rules are deterministic and use
configuration values from `repository_after.aml.config`.
"""

from typing import List

from .models import Alert, Transaction
from . import config


def evaluate_transaction(tx: Transaction) -> List[Alert]:
    """Evaluate all stateless rules against a single transaction.

    Returns a list of `Alert` instances. Multiple alerts per
    transaction are allowed. The alert `timestamp` uses the
    transaction timestamp for determinism.
    """
    alerts: List[Alert] = []

    # LARGE_CASH_TX: large amounts on cash channels
    try:
        if (
            tx.amount >= config.LARGE_CASH_TX_THRESHOLD
            and tx.channel.lower() in [c.lower() for c in config.CASH_CHANNELS]
        ):
            alerts.append(
                Alert(
                    rule_id="LARGE_CASH_TX",
                    severity=config.SEVERITY_HIGH,
                    timestamp=tx.timestamp,
                    transaction_id=tx.transaction_id,
                    details=f"amount={tx.amount} on channel={tx.channel}",
                )
            )
    except Exception:
        # defensively avoid throwing from rule evaluation
        pass

    # ROUND_AMOUNT: exact multiples of configured modulo
    try:
        modulo = float(config.ROUND_AMOUNT_MODULO)
        if modulo > 0 and (abs(tx.amount % modulo) < 1e-9 or abs(modulo - (tx.amount % modulo)) < 1e-9):
            alerts.append(
                Alert(
                    rule_id="ROUND_AMOUNT",
                    severity=config.SEVERITY_MEDIUM,
                    timestamp=tx.timestamp,
                    transaction_id=tx.transaction_id,
                    details=f"amount={tx.amount} is multiple of {modulo}",
                )
            )
    except Exception:
        pass

    # HIGH_RISK_GEO: either origin or destination in high risk list
    try:
        if (
            tx.origin_country and tx.origin_country.upper() in [c.upper() for c in config.HIGH_RISK_COUNTRIES]
        ) or (
            tx.destination_country and tx.destination_country.upper() in [c.upper() for c in config.HIGH_RISK_COUNTRIES]
        ):
            alerts.append(
                Alert(
                    rule_id="HIGH_RISK_GEO",
                    severity=config.SEVERITY_HIGH,
                    timestamp=tx.timestamp,
                    transaction_id=tx.transaction_id,
                    details=f"origin={tx.origin_country} dest={tx.destination_country}",
                )
            )
    except Exception:
        pass

    # HIGH_RISK_CHANNEL: channel matches configured high-risk channels
    try:
        if tx.channel and tx.channel.lower() in [c.lower() for c in config.HIGH_RISK_CHANNELS]:
            alerts.append(
                Alert(
                    rule_id="HIGH_RISK_CHANNEL",
                    severity=config.SEVERITY_MEDIUM,
                    timestamp=tx.timestamp,
                    transaction_id=tx.transaction_id,
                    details=f"channel={tx.channel}",
                )
            )
    except Exception:
        pass

    return alerts
