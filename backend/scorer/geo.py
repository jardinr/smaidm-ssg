"""
GEO Dimension Scorer — 35 points total
Evaluates Generative Engine Optimization: AI citation readiness.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
import re

from .seo import Finding, DimensionResult


# Social profile domains used for entity signal detection
SOCIAL_DOMAINS = (
    "linkedin.com", "twitter.com", "x.com", "facebook.com",
    "instagram.com", "youtube.com", "tiktok.com",
)


def score_geo(parsed: dict[str, Any]) -> DimensionResult:
    """
    Score the GEO dimension.

    Args:
        parsed: dict produced by the HTML parser containing keys:
            page_text, title, h1_tags, footer_text, is_https,
            has_about_link, has_testimonials, word_count,
            has_lists, has_tables, has_service_sections,
            all_links (list of href strings), business_name (optional)

    Returns:
        DimensionResult with score and findings.
    """
    score = 0
    findings: list[Finding] = []
    page_text = parsed.get("page_text", "").lower()
    all_links = parsed.get("all_links", [])

    # 3.1 Entity Signals (10 pts)
    entity_signals = 0
    entity_missing = []

    # Business name
    business_name = parsed.get("business_name", "")
    if business_name and business_name.lower() in page_text:
        entity_signals += 1
    elif not business_name:
        # Try to detect any proper-noun-like name in title
        title = parsed.get("title", "")
        if title:
            entity_signals += 1  # Assume title contains business name

    # Address: look for common address patterns
    address_pattern = re.search(
        r'\b\d{1,5}\s+\w[\w\s,\.]{5,50}(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|way|place|pl)\b',
        page_text, re.IGNORECASE
    )
    if address_pattern:
        entity_signals += 1
    else:
        entity_missing.append("physical address")

    # Phone number
    phone_pattern = re.search(
        r'(\+?\d[\d\s\-().]{7,15}\d)',
        page_text
    )
    if phone_pattern:
        entity_signals += 1
    else:
        entity_missing.append("phone number")

    # Email
    email_pattern = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', page_text)
    if email_pattern:
        entity_signals += 1
    else:
        entity_missing.append("email address")

    # Social profiles
    social_links = [l for l in all_links if any(d in l for d in SOCIAL_DOMAINS)]
    if social_links:
        entity_signals += 1
    else:
        entity_missing.append("social profile links")

    if entity_signals >= 4:
        score += 10
    elif entity_signals >= 2:
        score += 5
        findings.append(Finding(
            dimension="GEO",
            criterion="Entity Signals",
            issue=f"Only {entity_signals}/5 entity signals detected. Missing: {', '.join(entity_missing)}. Strong entity signals are required for AI systems to identify and cite your business.",
            severity="High",
            points_lost=5,
        ))
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="Entity Signals",
            issue=f"Weak entity presence ({entity_signals}/5 signals). Missing: {', '.join(entity_missing)}. AI engines cannot reliably identify or recommend this business.",
            severity="Critical",
            points_lost=10,
        ))

    # 3.2 Consistency Signals (5 pts)
    title = parsed.get("title", "").lower()
    h1_tags = [h.lower() for h in parsed.get("h1_tags", [])]
    footer_text = parsed.get("footer_text", "").lower()
    business_name_lower = (parsed.get("business_name") or "").lower()

    consistency_count = 0
    if business_name_lower:
        if business_name_lower in title:
            consistency_count += 1
        if any(business_name_lower in h for h in h1_tags):
            consistency_count += 1
        if business_name_lower in footer_text:
            consistency_count += 1

    if consistency_count >= 2:
        score += 5
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="Consistency Signals",
            issue="Business name is not consistently present across title, H1, and footer. Inconsistent entity naming reduces AI citation confidence.",
            severity="Medium",
            points_lost=5,
        ))

    # 3.3 Authority Indicators (10 pts)
    if parsed.get("is_https", False):
        score += 3
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="HTTPS",
            issue="Site is not served over HTTPS. This is a baseline trust signal for both users and AI systems.",
            severity="Critical",
            points_lost=3,
        ))

    if parsed.get("has_about_link", False):
        score += 3
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="About Page",
            issue="No About page link detected. An About page is a key entity authority signal for generative engines.",
            severity="High",
            points_lost=3,
        ))

    if parsed.get("has_testimonials", False):
        score += 4
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="Testimonials / Reviews",
            issue="No testimonials or reviews section detected. Social proof signals increase AI citation likelihood.",
            severity="Medium",
            points_lost=4,
        ))

    # 3.4 Content Depth (5 pts)
    word_count = parsed.get("word_count", 0)
    if word_count > 800:
        score += 5
    elif word_count >= 400:
        score += 3
        findings.append(Finding(
            dimension="GEO",
            criterion="Content Depth",
            issue=f"Homepage has {word_count} words. Aim for >800 words to provide sufficient depth for AI engines to extract and cite information.",
            severity="Medium",
            points_lost=2,
        ))
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="Content Depth",
            issue=f"Homepage has only {word_count} words. Thin content is rarely cited by generative engines.",
            severity="High",
            points_lost=5,
        ))

    # 3.5 AI Citation Readiness (5 pts)
    clarity_signals = 0
    if parsed.get("has_lists", False):
        clarity_signals += 1
    if parsed.get("has_tables", False):
        clarity_signals += 1
    if parsed.get("has_service_sections", False):
        clarity_signals += 1

    if clarity_signals >= 3:
        score += 5
    elif clarity_signals >= 1:
        score += 2
        findings.append(Finding(
            dimension="GEO",
            criterion="AI Citation Readiness",
            issue=f"Only {clarity_signals}/3 structural clarity signals detected (lists, tables, defined service sections). Add more structured content to improve AI extractability.",
            severity="Medium",
            points_lost=3,
        ))
    else:
        findings.append(Finding(
            dimension="GEO",
            criterion="AI Citation Readiness",
            issue="No structural clarity signals detected. AI engines struggle to extract and cite unstructured content.",
            severity="High",
            points_lost=5,
        ))

    return DimensionResult(score=score, max_score=35, findings=findings)
