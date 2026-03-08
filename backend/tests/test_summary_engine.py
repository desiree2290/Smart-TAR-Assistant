from app.phase3.summary_engine import SummaryEngine
from app.phase3.models import RiskResult, Flag


def test_summary_uses_flags_override_for_top_issues():
    tar = {
        "traveler_name": "Test Traveler",
        "start_date": "2026-03-10",
        "end_date": "2026-03-12",
        "destination_city": "San Diego",
    }

    # RiskResult can be mostly dummy because we override flags
    risk = RiskResult(
        risk_score=50,
        risk_level="MEDIUM",
        flags=[Flag(code="X", message="engine flag", severity=1)],
        confidence=0.9,
    )

    merged_flags = [
        {"code": "PH2_A", "message": "High issue", "severity": 9, "field": None, "evidence": {}},
        {"code": "PH2_B", "message": "Med issue", "severity": 6, "field": None, "evidence": {}},
    ]

    eng = SummaryEngine()
    s = eng.build_summary(tar, risk, flags_override=merged_flags)

    assert "2 issue(s) detected" in s
    assert "Recommended action" in s
    assert "High issue" in s  # proves it used merged flags, not engine flags