from typing import Dict, List
from .models import Flag, RiskResult
from .rules import Rule


def _risk_level(score: int) -> str:
    if score >= 70:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


class RiskEngine:
    def __init__(self, rules: List[Rule]):
        self.rules = rules

    def run(self, tar: Dict) -> RiskResult:
        flags: List[Flag] = []
        for rule in self.rules:
            flags.extend(rule.evaluate(tar))

        # Simple scoring: sum severity, cap at 100
        score = min(100, sum(f.severity for f in flags))

        # Simple confidence heuristic:
        # start at 1.0, reduce slightly per missing field flag
        missing_count = sum(1 for f in flags if f.code == "MISSING_REQUIRED")
        confidence = max(0.5, 1.0 - (missing_count * 0.1))

        return RiskResult(
            risk_score=score,
            risk_level=_risk_level(score),
            flags=flags,
            confidence=round(confidence, 2),
        )