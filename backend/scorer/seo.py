"""
SEO Dimension Scorer — 30 points total
Evaluates traditional SEO fundamentals.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
import re


@dataclass
class Finding:
    dimension: str
    criterion: str
    issue: str
    severity: str  # Critical | High | Medium | Low
    points_lost: int


@dataclass
class DimensionResult:
    score: int
    max_score: int
    findings: list[Finding] = field(default_factory=list)


def score_seo(parsed: dict[str, Any]) -> DimensionResult:
    """
    Score the SEO dimension.

    Args:
        parsed: dict produced by the HTML parser containing keys:
            title, meta_description, h1_tags, canonical, internal_links,
            robots_blocked, sitemap_found, soup (BeautifulSoup object)

    Returns:
        DimensionResult with score and findings.
    """
    score = 0
    findings: list[Finding] = []

    # 1.1 Title Tag (5 pts)
    title = parsed.get("title", "")
    if title:
        score += 3
        if 30 <= len(title) <= 65:
            score += 2
        else:
            findings.append(Finding(
                dimension="SEO",
                criterion="Title Tag Length",
                issue=f"Title is {len(title)} characters. Optimal range is 30–65 characters.",
                severity="Medium",
                points_lost=2,
            ))
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="Title Tag",
            issue="No title tag found. This is a fundamental SEO requirement.",
            severity="Critical",
            points_lost=5,
        ))

    # 1.2 Meta Description (5 pts)
    meta_desc = parsed.get("meta_description", "")
    if meta_desc:
        score += 3
        if 70 <= len(meta_desc) <= 160:
            score += 2
        else:
            findings.append(Finding(
                dimension="SEO",
                criterion="Meta Description Length",
                issue=f"Meta description is {len(meta_desc)} characters. Optimal range is 70–160 characters.",
                severity="Medium",
                points_lost=2,
            ))
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="Meta Description",
            issue="No meta description found. This reduces click-through rates from search results.",
            severity="High",
            points_lost=5,
        ))

    # 1.3 H1 Structure (5 pts)
    h1_tags = parsed.get("h1_tags", [])
    h1_count = len(h1_tags)
    if h1_count == 1:
        score += 5
    elif h1_count > 1:
        score += 2
        findings.append(Finding(
            dimension="SEO",
            criterion="H1 Structure",
            issue=f"Multiple H1 tags found ({h1_count}). There should be exactly one H1 per page.",
            severity="Medium",
            points_lost=3,
        ))
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="H1 Structure",
            issue="No H1 tag found. The page lacks a primary heading signal.",
            severity="Critical",
            points_lost=5,
        ))

    # 1.4 Canonical Tag (5 pts)
    if parsed.get("canonical"):
        score += 5
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="Canonical Tag",
            issue="No canonical tag found. Duplicate content issues may affect indexing.",
            severity="High",
            points_lost=5,
        ))

    # 1.5 Internal Linking (5 pts)
    internal_links = parsed.get("internal_links", [])
    link_count = len(internal_links)
    if link_count >= 5:
        score += 5
    elif link_count >= 1:
        score += 2
        findings.append(Finding(
            dimension="SEO",
            criterion="Internal Linking",
            issue=f"Only {link_count} internal link(s) found. At least 5 internal links are recommended.",
            severity="Medium",
            points_lost=3,
        ))
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="Internal Linking",
            issue="No internal links found. Internal linking is critical for crawlability and authority distribution.",
            severity="High",
            points_lost=5,
        ))

    # 1.6 Crawlability (5 pts)
    if not parsed.get("robots_blocked", False):
        score += 3
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="Robots Crawlability",
            issue="Page appears to be blocked by robots meta tag or X-Robots-Tag.",
            severity="Critical",
            points_lost=3,
        ))
    if parsed.get("sitemap_found", False):
        score += 2
    else:
        findings.append(Finding(
            dimension="SEO",
            criterion="Sitemap",
            issue="No sitemap.xml detected. A sitemap helps search engines discover and index content.",
            severity="Low",
            points_lost=2,
        ))

    return DimensionResult(score=score, max_score=30, findings=findings)
