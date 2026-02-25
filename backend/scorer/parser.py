"""
HTML Parser — extracts all signals needed by the scoring engine.
Produces a single parsed dict consumed by all three dimension scorers.
"""
from __future__ import annotations
import json
import re
from urllib.parse import urlparse, urljoin
from typing import Any

import requests
from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; SMAIDM-SSG-Audit/1.0; "
        "+https://smaidm.com/ssg-audit)"
    )
}
TIMEOUT = 15


def fetch_and_parse(url: str, business_name: str = "") -> dict[str, Any]:
    """
    Fetch a URL and extract all signals required by the scoring engine.

    Returns a dict with all parsed signals, or raises on fetch failure.
    """
    # Normalise URL
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
    response.raise_for_status()

    final_url = response.url
    parsed_url = urlparse(final_url)
    base_domain = parsed_url.netloc.lower()
    is_https = final_url.startswith("https://")

    soup = BeautifulSoup(response.text, "html.parser")

    # ── Basic SEO signals ──────────────────────────────────────────────────────
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    meta_desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_description = meta_desc_tag.get("content", "").strip() if meta_desc_tag else ""

    h1_tags = [h.get_text(strip=True) for h in soup.find_all("h1")]

    canonical_tag = soup.find("link", rel=lambda r: r and "canonical" in r)
    canonical = canonical_tag.get("href", "") if canonical_tag else ""

    # Internal links (same domain)
    all_links_raw = [a.get("href", "") for a in soup.find_all("a", href=True)]
    all_links_abs = []
    for href in all_links_raw:
        if href.startswith("http"):
            all_links_abs.append(href)
        elif href.startswith("/"):
            all_links_abs.append(urljoin(final_url, href))

    internal_links = [l for l in all_links_abs if base_domain in urlparse(l).netloc]

    # Robots meta
    robots_meta = soup.find("meta", attrs={"name": re.compile(r"^robots$", re.I)})
    robots_content = robots_meta.get("content", "").lower() if robots_meta else ""
    robots_blocked = "noindex" in robots_content or "nofollow" in robots_content

    # Sitemap — check /sitemap.xml
    sitemap_found = False
    try:
        sitemap_url = f"{parsed_url.scheme}://{base_domain}/sitemap.xml"
        r = requests.head(sitemap_url, headers=HEADERS, timeout=5)
        sitemap_found = r.status_code == 200
    except Exception:
        pass

    # ── SGO signals ───────────────────────────────────────────────────────────
    headings = []
    for level in ("h1", "h2", "h3", "h4"):
        for tag in soup.find_all(level):
            headings.append({"level": level, "text": tag.get_text(strip=True)})

    # Atomic answer blocks: heading followed immediately by a paragraph
    heading_paragraphs = []
    for tag in soup.find_all(["h1", "h2", "h3", "h4"]):
        next_sib = tag.find_next_sibling()
        if next_sib and next_sib.name == "p":
            heading_paragraphs.append({
                "heading": tag.get_text(strip=True),
                "next_paragraph": next_sib.get_text(strip=True),
            })

    # JSON-LD schemas
    json_ld_schemas = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                json_ld_schemas.extend(data)
            elif isinstance(data, dict):
                json_ld_schemas.append(data)
        except (json.JSONDecodeError, TypeError):
            pass

    # Full page text
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    page_text = soup.get_text(separator=" ", strip=True)
    word_count = len(re.findall(r'\b\w+\b', page_text))

    # ── GEO signals ───────────────────────────────────────────────────────────
    footer = soup.find("footer")
    footer_text = footer.get_text(separator=" ", strip=True) if footer else ""

    # About page link
    about_links = [
        l for l in all_links_abs
        if re.search(r'/about', l, re.I)
    ]
    has_about_link = len(about_links) > 0

    # Testimonials / reviews section
    testimonial_keywords = re.compile(
        r'(testimonial|review|what\s+our\s+client|what\s+people\s+say|feedback|rating)',
        re.I
    )
    has_testimonials = bool(testimonial_keywords.search(page_text))

    # Structural clarity signals
    has_lists = bool(soup.find(["ul", "ol"]))
    has_tables = bool(soup.find("table"))

    # Service sections: heading + short paragraph pattern in service-like context
    service_keywords = re.compile(r'(service|solution|offer|package|what\s+we\s+do)', re.I)
    has_service_sections = bool(service_keywords.search(page_text))

    return {
        # SEO
        "url": final_url,
        "title": title,
        "meta_description": meta_description,
        "h1_tags": h1_tags,
        "canonical": canonical,
        "internal_links": internal_links,
        "robots_blocked": robots_blocked,
        "sitemap_found": sitemap_found,
        # SGO
        "headings": headings,
        "heading_paragraphs": heading_paragraphs,
        "json_ld_schemas": json_ld_schemas,
        "page_text": page_text,
        # GEO
        "word_count": word_count,
        "footer_text": footer_text,
        "is_https": is_https,
        "has_about_link": has_about_link,
        "has_testimonials": has_testimonials,
        "has_lists": has_lists,
        "has_tables": has_tables,
        "has_service_sections": has_service_sections,
        "all_links": all_links_abs,
        "business_name": business_name,
    }
