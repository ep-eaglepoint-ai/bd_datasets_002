from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Optional
import statistics

from aml.engine import RuleContext, RuleHit
from aml.models import TxnType
from aml.risk import Risk


def severity_from_score(score: float) -> str:
    if score >= 0.85:
        return "critical"
    if score >= 0.65:
        return "high"
    if score >= 0.45:
        return "medium"
    return "low"


def robust_zscore(x: float, median: float, mad: float) -> float:
    if mad == 0:
        return 0.0
    return 0.6745 * (x - median) / mad


@dataclass
class StructuringSmurfingRule:
    rule_id: str = "R_STRUCTURING_SMURF"
    cash_threshold: float = 10000.0
    near_ratio: float = 0.92
    min_count_24h: int = 5
    min_total_24h: float = 35000.0
    window: timedelta = timedelta(hours=24)

    def evaluate(self, ctx: RuleContext) -> Optional[RuleHit]:
        txn = ctx.txn
        if txn.txn_type not in {TxnType.CASH_OUT, TxnType.CASH_IN}:
            return None
        if txn.direction != "out":
            return None

        stats = ctx.state.get(txn.customer_id, txn.account_id, self.window)
        cutoff_amt = self.near_ratio * self.cash_threshold

        near = [
            (ts, amt, tid)
            for (ts, amt, direction, tid, _) in stats.amounts
            if direction == "out" and cutoff_amt <= amt < self.cash_threshold
        ]

        total_near = sum(a for _, a, _ in near)
        if len(near) >= self.min_count_24h and total_near >= self.min_total_24h:
            risk = max(ctx.customer.risk_score, Risk.pep_risk(ctx.customer.pep))
            score = min(1.0, 0.55 + 0.45 * risk)
            return RuleHit(
                rule_id=self.rule_id,
                severity=severity_from_score(score),
                title="Possible structuring (smurfing) near cash threshold",
                rationale=(
                    f"{len(near)} cash transactions between {cutoff_amt:.0f} and {self.cash_threshold:.0f} "
                    f"in last {self.window}. Total near-threshold={total_near:.2f}."
                ),
                evidence={
                    "window": str(self.window),
                    "threshold": self.cash_threshold,
                    "near_ratio": self.near_ratio,
                    "count_near": len(near),
                    "total_near": total_near,
                    "customer_risk": ctx.customer.risk_score,
                    "pep": ctx.customer.pep,
                },
                txn_ids=[tid for _, _, tid in near][-25:],
            )
        return None


@dataclass
class RapidInOutTurnoverRule:
    rule_id: str = "R_RAPID_TURNOVER"
    inflow_window: timedelta = timedelta(hours=24)
    outflow_window: timedelta = timedelta(hours=6)
    min_inflow: float = 25000.0
    outflow_ratio: float = 0.75
    min_outflow: float = 15000.0

    def evaluate(self, ctx: RuleContext) -> Optional[RuleHit]:
        txn = ctx.txn
        stats_in = ctx.state.get(txn.customer_id, txn.account_id, self.inflow_window)
        stats_out = ctx.state.get(txn.customer_id, txn.account_id, self.outflow_window)

        inflow = stats_in.total_in
        outflow = stats_out.total_out

        if inflow >= self.min_inflow and outflow >= self.min_outflow:
            ratio = outflow / inflow if inflow > 0 else 0.0
            if ratio >= self.outflow_ratio:
                country_r = Risk.country_risk(txn.country)
                score = min(1.0, 0.50 + 0.25 * ratio + 0.25 * max(ctx.customer.risk_score, country_r))

                txns = [tid for (_, _, _, tid, _) in list(stats_in.amounts)[-10:]] + \
                       [tid for (_, _, _, tid, _) in list(stats_out.amounts)[-10:]]

                # de-dupe while preserving order
                seen = set()
                uniq = []
                for t in txns:
                    if t not in seen:
                        seen.add(t)
                        uniq.append(t)

                return RuleHit(
                    rule_id=self.rule_id,
                    severity=severity_from_score(score),
                    title="Rapid turnover (inflows quickly sent out)",
                    rationale=(
                        f"Inflow last {self.inflow_window}: {inflow:.2f}; "
                        f"Outflow last {self.outflow_window}: {outflow:.2f} "
                        f"({ratio:.0%} of inflow)."
                    ),
                    evidence={
                        "inflow_window": str(self.inflow_window),
                        "outflow_window": str(self.outflow_window),
                        "inflow": inflow,
                        "outflow": outflow,
                        "ratio": ratio,
                        "txn_country": txn.country,
                        "country_risk": country_r,
                        "customer_risk": ctx.customer.risk_score,
                    },
                    txn_ids=uniq[:25],
                )
        return None


@dataclass
class CounterpartyDispersionRule:
    rule_id: str = "R_COUNTERPARTY_DISPERSION"
    window: timedelta = timedelta(hours=24)
    min_unique_counterparties: int = 12
    min_total_outflow: float = 20000.0

    def evaluate(self, ctx: RuleContext) -> Optional[RuleHit]:
        txn = ctx.txn
        if txn.direction != "out" or txn.counterparty_id is None:
            return None

        stats = ctx.state.get(txn.customer_id, txn.account_id, self.window)
        unique = len(stats.unique_counterparties_out)
        if unique >= self.min_unique_counterparties and stats.total_out >= self.min_total_outflow:
            score = min(1.0, 0.45 + 0.03 * unique + 0.25 * ctx.customer.risk_score)
            recent = [tid for (_, _, direction, tid, _) in list(stats.amounts)[-50:] if direction == "out"]
            return RuleHit(
                rule_id=self.rule_id,
                severity=severity_from_score(score),
                title="High counterparty dispersion (fan-out)",
                rationale=(
                    f"{unique} unique outgoing counterparties in {self.window}; "
                    f"total outflow={stats.total_out:.2f}."
                ),
                evidence={
                    "window": str(self.window),
                    "unique_counterparties_out": unique,
                    "total_outflow": stats.total_out,
                    "customer_risk": ctx.customer.risk_score,
                },
                txn_ids=recent[-25:],
            )
        return None


@dataclass
class HighRiskGeoRule:
    rule_id: str = "R_HIGH_RISK_GEO"
    min_amount: float = 5000.0

    def evaluate(self, ctx: RuleContext) -> Optional[RuleHit]:
        txn = ctx.txn
        geo_r = Risk.country_risk(txn.country)
        if geo_r < 1.0:
            return None
        if txn.amount < self.min_amount:
            return None

        base = 0.55
        pep_boost = 0.2 if ctx.customer.pep else 0.0
        score = min(1.0, base + 0.25 * ctx.customer.risk_score + 0.2 * geo_r + pep_boost)
        return RuleHit(
            rule_id=self.rule_id,
            severity=severity_from_score(score),
            title="Transaction involving high-risk geography",
            rationale=f"Txn in high-risk country {txn.country} for amount {txn.amount:.2f}.",
            evidence={
                "country": txn.country,
                "country_risk": geo_r,
                "amount": txn.amount,
                "customer_risk": ctx.customer.risk_score,
                "pep": ctx.customer.pep,
            },
            txn_ids=[txn.txn_id],
        )


@dataclass
class PeerOutflowAnomalyRule:
    rule_id: str = "R_PEER_OUTFLOW_ANOMALY"
    window: timedelta = timedelta(days=7)
    min_peer_samples: int = 200
    min_outflow: float = 20000.0
    z_threshold: float = 6.0

    def evaluate(self, ctx: RuleContext) -> Optional[RuleHit]:
        txn = ctx.txn
        stats = ctx.state.get(txn.customer_id, txn.account_id, self.window)
        outflow = stats.total_out
        if outflow < self.min_outflow:
            return None

        peer = ctx.state.segment_outflow_distribution(ctx.customer.segment, self.window)
        if len(peer) < self.min_peer_samples:
            return None

        med = statistics.median(peer)
        mad = statistics.median([abs(x - med) for x in peer]) or 0.0
        z = robust_zscore(outflow, med, mad)

        if z >= self.z_threshold:
            score = min(1.0, 0.55 + 0.05 * min(z, 12.0) + 0.2 * ctx.customer.risk_score)
            recent = [tid for (_, _, direction, tid, _) in list(stats.amounts)[-60:] if direction == "out"]
            return RuleHit(
                rule_id=self.rule_id,
                severity=severity_from_score(score),
                title="Outflow anomalous vs peer segment",
                rationale=f"7d outflow={outflow:.2f} vs peer median={med:.2f}; robust z={z:.2f}.",
                evidence={
                    "window": str(self.window),
                    "outflow": outflow,
                    "peer_median": med,
                    "peer_mad": mad,
                    "robust_z": z,
                    "segment": ctx.customer.segment,
                    "customer_risk": ctx.customer.risk_score,
                },
                txn_ids=recent[-25:],
            )

        return None
