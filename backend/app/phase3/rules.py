from typing import Dict, List
from .models import Flag


class Rule:
    """Base class for all rules."""
    code: str = "BASE_RULE"

    def evaluate(self, tar: Dict) -> List[Flag]:
        raise NotImplementedError


class MissingRequiredFieldRule(Rule):
    code = "MISSING_REQUIRED"

    def __init__(self, required_fields: List[str]):
        self.required_fields = required_fields

    def evaluate(self, tar: Dict) -> List[Flag]:
        flags: List[Flag] = []
        for f in self.required_fields:
            val = tar.get(f)
            if val in (None, "", [], {}):
                flags.append(
                    Flag(
                        code=self.code,
                        message=f"Missing required field: {f}",
                        severity=7,
                        field=f,
                        evidence={"field": f},
                    )
                )
        return flags


class DateOrderRule(Rule):
    code = "DATE_ORDER"

    def evaluate(self, tar: Dict) -> List[Flag]:
        start = tar.get("start_date")
        end = tar.get("end_date")
        # assuming ISO yyyy-mm-dd strings in Phase 2 output
        if start and end and start > end:
            return [
                Flag(
                    code=self.code,
                    message="End date occurs before start date",
                    severity=9,
                    field="end_date",
                    evidence={"start_date": start, "end_date": end},
                )
            ]
        return []