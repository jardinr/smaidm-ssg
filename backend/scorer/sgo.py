"""
SGO Dimension Scorer — 35 points total
Evaluates Search Generative Optimization: readiness for answer engines.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
import re
import json

from .seo import Finding, DimensionResult


def _flesch_approximation(text: str) -> float:
    """
    Approximate Flesch Reading Ease score.
    Formula: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
    Syllable count is approximated by vowel groups.
    """
    sentences = max(1, len(re.findall(r'[.!?]+', text)))
    words_list = re.findall(r'\b\w+\b', text)
    words = max(1, len(words_list))
    # Approximate syllables: count vowel groups per word
    syllables = sum(
        max(1, len(re.findall(r'[aeiouAEIOU]+', w)))
        for w in words_list
    )
    asl = words / sentences
    asw = syllables / words
    return 206.835 - (1.015 * asl) - (84.6 * asw)


def score_sgo(parsed: dict[str, Any]) -> DimensionResult:
    """
    Score the SGO dimension.

    Args:
        parsed: dict produced by the HTML parser containing keys:
            headings (list of dicts with 'level' and 'text'),
            heading_paragraphs (list of dicts with 'heading' and 'next_paragraph'),
            json_ld_schemas (list of dicts),
            page_text (full visible text of the page)

    Returns:
        DimensionResult with score and findings.
    """
    score = 0
    findings: list[Finding] = []

    # 2.1 Question-Based Headings (10 pts)
    headings = parsed.get("headings", [])
    question_headings = [
        h for h in headings
        if h.get("level") in ("h2", "h3") and h.get("text", "").strip().endswith("?")
    ]
    q_count = len(question_headings)
    if q_count >= 3:
        score += 10
    elif q_count >= 1:
        score += 5
        findings.append(Finding(
            dimension="SGO",
            criterion="Question-Based Headings",
            issue=f"Only {q_count} question-based heading(s) found. Answer engines prioritize pages with ≥3 question headings.",
            severity="High",
            points_lost=5,
        ))
    else:
        findings.append(Finding(
            dimension="SGO",
            criterion="Question-Based Headings",
            issue="No question-based headings (H2/H3 ending in '?') found. This significantly reduces answer engine visibility.",
            severity="Critical",
            points_lost=10,
        ))

    # 2.2 Atomic Answer Structure (10 pts)
    heading_paragraphs = parsed.get("heading_paragraphs", [])
    atomic_blocks = [
        hp for hp in heading_paragraphs
        if hp.get("next_paragraph") and
        20 <= len(re.findall(r'\b\w+\b', hp["next_paragraph"])) <= 120
    ]
    atomic_count = len(atomic_blocks)
    if atomic_count >= 3:
        score += 10
    elif atomic_count >= 1:
        score += 5
        findings.append(Finding(
            dimension="SGO",
            criterion="Atomic Answer Structure",
            issue=f"Only {atomic_count} atomic answer block(s) detected. Aim for ≥3 heading + concise answer pairs (30–100 words).",
            severity="High",
            points_lost=5,
        ))
    else:
        findings.append(Finding(
            dimension="SGO",
            criterion="Atomic Answer Structure",
            issue="No atomic answer blocks detected. Pages without concise heading-answer pairs are rarely featured in AI-generated responses.",
            severity="Critical",
            points_lost=10,
        ))

    # 2.3 Structured Data Clarity (10 pts)
    schemas = parsed.get("json_ld_schemas", [])
    business_types = {
        "localbusiness", "organization", "product", "service",
        "professionalservice", "restaurant", "hotel", "store"
    }
    has_any_schema = len(schemas) > 0
    has_business_schema = any(
        str(s.get("@type", "")).lower() in business_types
        for s in schemas
    )
    if has_any_schema:
        score += 5
    else:
        findings.append(Finding(
            dimension="SGO",
            criterion="Structured Data Presence",
            issue="No JSON-LD structured data found. Structured data is essential for AI systems to understand and cite your content.",
            severity="Critical",
            points_lost=5,
        ))
    if has_business_schema:
        score += 5
    else:
        findings.append(Finding(
            dimension="SGO",
            criterion="Business Schema Type",
            issue="No business-related schema type found (LocalBusiness, Organization, Product, Service). Add a relevant schema type to improve AI citation readiness.",
            severity="High",
            points_lost=5,
        ))

    # 2.4 Readability (5 pts)
    page_text = parsed.get("page_text", "")
    if page_text.strip():
        flesch = _flesch_approximation(page_text)
        if 50 <= flesch <= 70:
            score += 5
        elif 30 <= flesch < 50:
            score += 2
            findings.append(Finding(
                dimension="SGO",
                criterion="Readability",
                issue=f"Readability score is approximately {flesch:.0f}. Content may be too complex for AI systems to extract clear answers.",
                severity="Medium",
                points_lost=3,
            ))
        else:
            findings.append(Finding(
                dimension="SGO",
                criterion="Readability",
                issue=f"Readability score is approximately {flesch:.0f}. Content is either too complex or too simple for optimal AI extraction.",
                severity="Medium",
                points_lost=5,
            ))
    else:
        findings.append(Finding(
            dimension="SGO",
            criterion="Readability",
            issue="Insufficient text content to evaluate readability.",
            severity="Medium",
            points_lost=5,
        ))

    return DimensionResult(score=score, max_score=35, findings=findings)
