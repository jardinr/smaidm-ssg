"""
Unit tests for the SMAIDM SSG scoring engine.
Tests each scoring rule in isolation using mock parsed data.
"""
import pytest
import sys
import os

# Allow running from backend/ directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from scorer.seo import score_seo
from scorer.sgo import score_sgo, _flesch_approximation
from scorer.geo import score_geo


# ── SEO Tests ─────────────────────────────────────────────────────────────────

class TestSEO:
    def _base(self, **overrides):
        base = {
            "title": "SMAIDM Digital Services | AI Visibility",
            "meta_description": "We help businesses become visible to AI-powered search engines through structured audits and optimization.",
            "h1_tags": ["AI Search Visibility for Modern Businesses"],
            "canonical": "https://smaidm.com/",
            "internal_links": ["/about", "/services", "/contact", "/blog", "/pricing"],
            "robots_blocked": False,
            "sitemap_found": True,
        }
        base.update(overrides)
        return base

    def test_perfect_seo_score(self):
        result = score_seo(self._base())
        assert result.score == 30
        assert result.findings == []

    def test_missing_title(self):
        result = score_seo(self._base(title=""))
        assert result.score <= 25
        assert any("title" in f.criterion.lower() for f in result.findings)

    def test_title_too_short(self):
        result = score_seo(self._base(title="Short"))
        assert result.score == 28  # Gets 3 for existence, loses 2 for length
        assert any("Length" in f.criterion for f in result.findings)

    def test_missing_meta_description(self):
        result = score_seo(self._base(meta_description=""))
        assert result.score <= 25
        assert any("Meta Description" in f.criterion for f in result.findings)

    def test_multiple_h1(self):
        result = score_seo(self._base(h1_tags=["Title One", "Title Two"]))
        assert result.score == 27  # Loses 3 for multiple H1
        assert any("H1" in f.criterion for f in result.findings)

    def test_no_h1(self):
        result = score_seo(self._base(h1_tags=[]))
        assert result.score <= 25
        assert any("H1" in f.criterion for f in result.findings)

    def test_no_canonical(self):
        result = score_seo(self._base(canonical=""))
        assert result.score == 25
        assert any("Canonical" in f.criterion for f in result.findings)

    def test_few_internal_links(self):
        result = score_seo(self._base(internal_links=["/about", "/contact"]))
        assert result.score == 27
        assert any("Internal" in f.criterion for f in result.findings)

    def test_no_internal_links(self):
        result = score_seo(self._base(internal_links=[]))
        assert result.score <= 25
        assert any("Internal" in f.criterion for f in result.findings)

    def test_robots_blocked(self):
        result = score_seo(self._base(robots_blocked=True))
        assert result.score <= 27
        assert any("Robots" in f.criterion for f in result.findings)

    def test_no_sitemap(self):
        result = score_seo(self._base(sitemap_found=False))
        assert result.score == 28
        assert any("Sitemap" in f.criterion for f in result.findings)

    def test_max_score_is_30(self):
        result = score_seo(self._base())
        assert result.max_score == 30


# ── SGO Tests ─────────────────────────────────────────────────────────────────

class TestSGO:
    def _base(self, **overrides):
        base = {
            "headings": [
                {"level": "h2", "text": "What is AI Search Visibility?"},
                {"level": "h2", "text": "How does structured data help?"},
                {"level": "h3", "text": "Why do businesses fail AI audits?"},
            ],
            "heading_paragraphs": [
                {"heading": "What is AI Search Visibility?", "next_paragraph": "AI search visibility is how well a business is positioned to be cited by generative AI systems like ChatGPT and Perplexity. It depends on structured content and clear entity signals on your website."},
                {"heading": "How does structured data help?", "next_paragraph": "Structured data gives AI engines machine-readable context to understand your business. Without JSON-LD schema markup, your content remains invisible to automated recommendation and citation systems."},
                {"heading": "Why do businesses fail AI audits?", "next_paragraph": "Most businesses fail because their sites were built for human readers, not machine parsers. They lack atomic answer blocks, question-based headings, and consistent entity data across their pages."},
            ],
            "json_ld_schemas": [
                {"@type": "Organization", "@context": "https://schema.org", "name": "SMAIDM"},
            ],
            "page_text": "We help businesses rank in AI search results. Our audits find critical gaps quickly. You receive clear, actionable results. We fix the issues and your score improves. Clients see more leads from AI-powered search engines. " * 15,
        }
        base.update(overrides)
        return base

    def test_perfect_sgo_score(self):
        result = score_sgo(self._base())
        assert result.score == 35

    def test_no_question_headings(self):
        data = self._base(headings=[{"level": "h2", "text": "About Us"}, {"level": "h2", "text": "Services"}])
        result = score_sgo(data)
        assert any("Question" in f.criterion for f in result.findings)

    def test_one_question_heading(self):
        data = self._base(headings=[{"level": "h2", "text": "What is AI Search?"}])
        result = score_sgo(data)
        # Should get 5 not 10
        question_score = 5
        assert result.score <= 30  # loses 5

    def test_no_atomic_blocks(self):
        data = self._base(heading_paragraphs=[])
        result = score_sgo(data)
        assert any("Atomic" in f.criterion for f in result.findings)

    def test_no_structured_data(self):
        data = self._base(json_ld_schemas=[])
        result = score_sgo(data)
        assert any("Structured Data" in f.criterion for f in result.findings)

    def test_no_business_schema(self):
        data = self._base(json_ld_schemas=[{"@type": "WebPage"}])
        result = score_sgo(data)
        assert any("Business Schema" in f.criterion for f in result.findings)

    def test_max_score_is_35(self):
        result = score_sgo(self._base())
        assert result.max_score == 35

    def test_flesch_approximation_returns_float(self):
        score = _flesch_approximation("The quick brown fox jumps over the lazy dog.")
        assert isinstance(score, float)


# ── GEO Tests ─────────────────────────────────────────────────────────────────

class TestGEO:
    def _base(self, **overrides):
        base = {
            "page_text": (
                "SMAIDM Digital Services. "
                "123 Business Street, Cape Town. "
                "Call us at +27 21 555 0100. "
                "Email: hello@smaidm.com. "
                "We offer AI visibility services, SEO audits, and structured data optimization. "
                "Our clients love the results. Testimonials from satisfied clients. "
                "Check our services and solutions. "
            ) * 10,
            "title": "SMAIDM Digital Services | AI Visibility",
            "h1_tags": ["SMAIDM Digital Services"],
            "footer_text": "© 2025 SMAIDM Digital Services. All rights reserved.",
            "is_https": True,
            "has_about_link": True,
            "has_testimonials": True,
            "word_count": 900,
            "has_lists": True,
            "has_tables": True,
            "has_service_sections": True,
            "all_links": [
                "https://linkedin.com/company/smaidm",
                "https://smaidm.com/about",
                "https://smaidm.com/services",
            ],
            "business_name": "SMAIDM Digital Services",
        }
        base.update(overrides)
        return base

    def test_perfect_geo_score(self):
        result = score_geo(self._base())
        assert result.score == 35

    def test_no_https(self):
        result = score_geo(self._base(is_https=False))
        assert any("HTTPS" in f.criterion for f in result.findings)

    def test_no_about_link(self):
        result = score_geo(self._base(has_about_link=False))
        assert any("About" in f.criterion for f in result.findings)

    def test_no_testimonials(self):
        result = score_geo(self._base(has_testimonials=False))
        assert any("Testimonial" in f.criterion for f in result.findings)

    def test_low_word_count(self):
        result = score_geo(self._base(word_count=200))
        assert any("Content Depth" in f.criterion for f in result.findings)

    def test_no_structural_signals(self):
        result = score_geo(self._base(has_lists=False, has_tables=False, has_service_sections=False))
        assert any("Citation Readiness" in f.criterion for f in result.findings)

    def test_max_score_is_35(self):
        result = score_geo(self._base())
        assert result.max_score == 35

    def test_weak_entity_signals(self):
        result = score_geo(self._base(
            page_text="Welcome to our website. We provide services.",
            all_links=[],
            business_name=""
        ))
        assert any("Entity" in f.criterion for f in result.findings)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
