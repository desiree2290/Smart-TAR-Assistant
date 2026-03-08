from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class Flag:
    code: str                 # stable identifier e.g. "PER_DIEM_OVER"
    message: str              # human-readable
    severity: int             # 1-10
    field: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None


@dataclass(frozen=True)
class RiskResult:
    risk_score: int
    risk_level: str           # LOW / MEDIUM / HIGH
    flags: List[Flag]
    confidence: float         # 0.0 - 1.0 (simple heuristic for now)