"""
Scoring Engine Orchestrator
Runs all three dimension scorers and produces the final audit result.
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

from .seo import score_seo, Finding
from .sgo import score_sgo
from .geo import score_geo
from .parser import fetch_and_parse


GRADE_THRESHOLDS = [
    (90, "AI Ready"),
    (75, "Competitive"),
    (60, "At Risk"),
    (40, "Weak Structure"),
    (0,  "Invisible to AI"),
]

SEVERITY_ORDER = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def _grade(total: int) -> str:
    for threshold, label in GRADE_THRESHOLDS:
        if total >= threshold:
            return label
    return "Invisible to AI"


def _top_gaps(findings: list[Finding], n: int = 3) -> list[str]:
    """Return the top N most impactful findings as plain strings."""
    sorted_findings = sorted(
        findings,
        key=lambda f: (SEVERITY_ORDER.get(f.severity, 9), -f.points_lost)
    )
    return [f.issue for f in sorted_findings[:n]]


@dataclass
class AuditResult:
    url: str
    total_score: int
    grade: str
    seo_score: int
    sgo_score: int
    geo_score: int
    findings: list[dict]
    top_gaps: list[str]
    audit_timestamp: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def run_audit(url: str, business_name: str = "") -> AuditResult:
    """
    Full audit pipeline: fetch → parse → score → result.

    Args:
        url: The website URL to audit.
        business_name: Optional business name for entity consistency checks.

    Returns:
        AuditResult dataclass.

    Raises:
        requests.RequestException: On network or HTTP errors.
    """
    parsed = fetch_and_parse(url, business_name=business_name)

    seo_result = score_seo(parsed)
    sgo_result = score_sgo(parsed)
    geo_result = score_geo(parsed)

    all_findings: list[Finding] = (
        seo_result.findings + sgo_result.findings + geo_result.findings
    )

    total = seo_result.score + sgo_result.score + geo_result.score

    return AuditResult(
        url=parsed["url"],
        total_score=total,
        grade=_grade(total),
        seo_score=seo_result.score,
        sgo_score=sgo_result.score,
        geo_score=geo_result.score,
        findings=[
            {
                "dimension": f.dimension,
                "criterion": f.criterion,
                "issue": f.issue,
                "severity": f.severity,
                "points_lost": f.points_lost,
            }
            for f in sorted(all_findings, key=lambda f: SEVERITY_ORDER.get(f.severity, 9))
        ],
        top_gaps=_top_gaps(all_findings),
        audit_timestamp=datetime.now(timezone.utc).isoformat(),
    )
