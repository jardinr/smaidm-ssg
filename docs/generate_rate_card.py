#!/usr/bin/env python3
"""
SMAIDM SSG Platform — Branded Rate Card PDF Generator
Produces a professional, print-ready rate card for the 5 score-based ZAR pricing tiers.
Run: python3 docs/generate_rate_card.py
Output: docs/SMAIDM_Rate_Card_2026.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import KeepTogether
import os

# ── Colour palette (Visibility Engine design system) ──────────────────────────
NAVY       = HexColor("#0B1426")
NAVY_MID   = HexColor("#1A2744")
NAVY_CARD  = HexColor("#0D1F3C")
TEAL       = HexColor("#14B8A6")
TEAL_DARK  = HexColor("#0D9488")
AMBER      = HexColor("#F59E0B")
ROSE       = HexColor("#F43F5E")
ORANGE     = HexColor("#F97316")
VIOLET     = HexColor("#A78BFA")
BLUE       = HexColor("#60A5FA")
WHITE      = HexColor("#FFFFFF")
SLATE_100  = HexColor("#F1F5F9")
SLATE_300  = HexColor("#CBD5E1")
SLATE_400  = HexColor("#94A3B8")
SLATE_500  = HexColor("#64748B")
SLATE_600  = HexColor("#475569")
SLATE_700  = HexColor("#334155")
SLATE_800  = HexColor("#1E293B")
SLATE_900  = HexColor("#0F172A")

# ── Tier definitions ──────────────────────────────────────────────────────────
TIERS = [
    {
        "id": "critical",
        "grade": "F",
        "label": "Critical",
        "range": "0 – 24",
        "description": "Effectively invisible to AI search engines. ChatGPT, Perplexity, and Google SGE cannot identify, cite, or recommend this business.",
        "target": "50+",
        "once_off": "R 12,500",
        "monthly": "R 1,500/mo",
        "urgency": "R 10,000",
        "color": ROSE,
        "bg": HexColor("#1F0A0E"),
        "border": HexColor("#7F1D1D"),
        "fixes": [
            "Page title, meta description, H1 — all missing or broken",
            "Zero structured data / schema markup",
            "No canonical tag — duplicate content risk",
            "Image alt tags missing across entire site",
            "Word count below AI citation threshold (< 300 words)",
        ],
    },
    {
        "id": "poor",
        "grade": "D",
        "label": "Poor",
        "range": "25 – 49",
        "description": "AI engines can find the site but cannot reliably understand, categorise, or recommend the business. High risk of being replaced by competitors in AI results.",
        "target": "75+",
        "once_off": "R 9,500",
        "monthly": "R 1,200/mo",
        "urgency": "R 7,600",
        "color": ORANGE,
        "bg": HexColor("#1C0F05"),
        "border": HexColor("#7C2D12"),
        "fixes": [
            "Meta description present but too short or keyword-poor",
            "Schema markup present but broken @id or missing FAQPage",
            "Canonical tag missing",
            "Partial image alt tag coverage (< 50%)",
            "Content below 600-word AI citation threshold",
        ],
    },
    {
        "id": "moderate",
        "grade": "C",
        "label": "Moderate",
        "range": "50 – 74",
        "description": "Visible to AI engines but not being recommended or cited. Competitors with better structured data and FAQ content will consistently outrank this site.",
        "target": "90+",
        "once_off": "R 6,500",
        "monthly": "R 1,200/mo",
        "urgency": "R 5,200",
        "color": AMBER,
        "bg": HexColor("#1C1505"),
        "border": HexColor("#78350F"),
        "fixes": [
            "FAQPage schema missing — highest AI citation ROI",
            "Person schema missing — no founder/owner entity signal",
            "Service schema not implemented",
            "Content lacks question-based answer structure",
            "Social sameAs links not in schema",
        ],
    },
    {
        "id": "good",
        "grade": "B",
        "label": "Good",
        "range": "75 – 89",
        "description": "AI engines can identify and sometimes recommend this business. Minor structural gaps prevent consistent citation. One or two targeted fixes will push into the AI-ready tier.",
        "target": "95+",
        "once_off": "R 3,500",
        "monthly": "R 1,200/mo",
        "urgency": "R 2,800",
        "color": TEAL,
        "bg": HexColor("#051412"),
        "border": HexColor("#134E4A"),
        "fixes": [
            "Fine-tune FAQ content for specific AI answer patterns",
            "Add Review/Rating schema for trust signals",
            "Expand content to 1000+ words for deeper AI indexing",
            "Add BreadcrumbList schema for site structure",
        ],
    },
    {
        "id": "excellent",
        "grade": "A",
        "label": "AI-Ready",
        "range": "90 – 100",
        "description": "Eligible for citation by ChatGPT, Perplexity, and Google SGE. The business appears in AI-generated answers, summaries, and recommendations.",
        "target": "Maintain",
        "once_off": "—",
        "monthly": "R 1,200/mo",
        "urgency": "R 960/mo",
        "color": VIOLET,
        "bg": HexColor("#0D0B1A"),
        "border": HexColor("#4C1D95"),
        "fixes": [
            "Monthly monitoring to maintain score as AI algorithms evolve",
            "Competitor gap analysis to stay ahead",
            "New page / content schema as site grows",
        ],
    },
]

# ── Output path ───────────────────────────────────────────────────────────────
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "SMAIDM_Rate_Card_2026.pdf")

def build_rate_card():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=18*mm,
        rightMargin=18*mm,
        topMargin=14*mm,
        bottomMargin=14*mm,
        title="SMAIDM SSG Platform — AI Visibility Rate Card 2026",
        author="Jardin Roestorff · SMAIDM Digital Services",
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Helper styles ─────────────────────────────────────────────────────────
    def ps(name, **kw):
        return ParagraphStyle(name, **kw)

    mono = "Courier"
    sans = "Helvetica"
    bold = "Helvetica-Bold"

    header_style = ps("Header", fontName=bold, fontSize=22, textColor=WHITE,
                      leading=28, alignment=TA_LEFT)
    subheader_style = ps("SubHeader", fontName=sans, fontSize=10, textColor=TEAL,
                         leading=14, alignment=TA_LEFT, spaceAfter=2)
    body_style = ps("Body", fontName=sans, fontSize=8.5, textColor=SLATE_300,
                    leading=13, alignment=TA_LEFT)
    mono_style = ps("Mono", fontName=mono, fontSize=8, textColor=SLATE_400,
                    leading=12, alignment=TA_LEFT)
    label_style = ps("Label", fontName=bold, fontSize=7, textColor=SLATE_400,
                     leading=10, alignment=TA_LEFT,
                     textTransform="uppercase", letterSpacing=1)
    center_style = ps("Center", fontName=sans, fontSize=8, textColor=SLATE_400,
                      leading=12, alignment=TA_CENTER)
    footer_style = ps("Footer", fontName=sans, fontSize=7, textColor=SLATE_600,
                      leading=10, alignment=TA_CENTER)
    tier_label_style = ps("TierLabel", fontName=bold, fontSize=13, leading=16,
                          alignment=TA_LEFT)
    tier_desc_style = ps("TierDesc", fontName=sans, fontSize=8, textColor=SLATE_300,
                         leading=12, alignment=TA_LEFT)
    fix_style = ps("Fix", fontName=sans, fontSize=7.5, textColor=SLATE_400,
                   leading=11, alignment=TA_LEFT, leftIndent=8)
    price_style = ps("Price", fontName=bold, fontSize=14, textColor=TEAL,
                     leading=18, alignment=TA_RIGHT)
    urgency_style = ps("Urgency", fontName=bold, fontSize=10, textColor=AMBER,
                       leading=14, alignment=TA_RIGHT)

    # ── Page header ───────────────────────────────────────────────────────────
    header_table = Table(
        [[
            Paragraph("SMAIDM", header_style),
            Paragraph("AI Search Visibility Rate Card 2026", ps("RightHead",
                fontName=sans, fontSize=9, textColor=SLATE_400, leading=12,
                alignment=TA_RIGHT)),
        ]],
        colWidths=["55%", "45%"],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY_CARD),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (0, -1), 14),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 14),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4*mm))

    # Sub-header row
    sub_table = Table(
        [[
            Paragraph("Score-Based Pricing for AI Visibility Optimisation", ps("Sub",
                fontName=sans, fontSize=9, textColor=TEAL, leading=12, alignment=TA_LEFT)),
            Paragraph("smaidmsagency@outlook.com  ·  082 266 0899  ·  smaidm.co.za", ps("Contact",
                fontName=mono, fontSize=7.5, textColor=SLATE_500, leading=11, alignment=TA_RIGHT)),
        ]],
        colWidths=["60%", "40%"],
    )
    sub_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(sub_table)
    story.append(Spacer(1, 3*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL_DARK, spaceAfter=4*mm))

    # ── Intro paragraph ───────────────────────────────────────────────────────
    intro = (
        "Your AI Visibility Score determines how well ChatGPT, Perplexity, Google SGE, and other AI engines "
        "can find, understand, and recommend your business. The five tiers below define exactly where your "
        "site sits today, what it costs to reach the next level, and the specific fixes included in each package. "
        "<b>All prices in South African Rand (ZAR) · VAT excluded · International clients billed in USD/EUR via Wise or Stripe.</b>"
    )
    story.append(Paragraph(intro, ps("Intro", fontName=sans, fontSize=8.5, textColor=SLATE_300,
                                     leading=13, alignment=TA_LEFT, spaceAfter=4*mm)))

    # ── Tier cards ────────────────────────────────────────────────────────────
    for tier in TIERS:
        color = tier["color"]
        bg = tier["bg"]

        # Grade badge + label
        grade_cell = Table(
            [[Paragraph(f"Grade {tier['grade']}", ps("Grade", fontName=bold, fontSize=11,
                        textColor=color, leading=14, alignment=TA_CENTER))]],
            colWidths=[18*mm],
        )
        grade_cell.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("BOX", (0, 0), (-1, -1), 0.5, tier["border"]),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
        ]))

        label_para = Paragraph(
            f'<font color="#{color.hexval()[2:]}"><b>{tier["label"]}</b></font>  '
            f'<font color="#64748B">Score {tier["range"]}</font>',
            ps("TL", fontName=bold, fontSize=13, leading=16, alignment=TA_LEFT)
        )
        desc_para = Paragraph(tier["description"], tier_desc_style)

        fixes_text = "<br/>".join(f"▸  {f}" for f in tier["fixes"])
        fixes_para = Paragraph(fixes_text, fix_style)

        # Price column
        price_para = Paragraph(tier["once_off"], ps("PP", fontName=bold, fontSize=15,
                               textColor=color, leading=18, alignment=TA_RIGHT))
        monthly_para = Paragraph(tier["monthly"], ps("MP", fontName=mono, fontSize=9,
                                 textColor=SLATE_400, leading=12, alignment=TA_RIGHT))
        urgency_label = Paragraph("24-hr rate:", ps("UL", fontName=sans, fontSize=7,
                                  textColor=AMBER, leading=10, alignment=TA_RIGHT))
        urgency_para = Paragraph(tier["urgency"], ps("UP", fontName=bold, fontSize=11,
                                 textColor=AMBER, leading=14, alignment=TA_RIGHT))
        target_para = Paragraph(f"Target: {tier['target']}", ps("TP", fontName=mono,
                                fontSize=7.5, textColor=SLATE_500, leading=10, alignment=TA_RIGHT))

        price_block = [price_para, monthly_para, Spacer(1, 3), urgency_label, urgency_para, target_para]

        # Inner layout: [grade_badge | label+desc+fixes | price]
        inner = Table(
            [[grade_cell,
              [label_para, Spacer(1, 3), desc_para, Spacer(1, 5), fixes_para],
              price_block]],
            colWidths=[20*mm, None, 38*mm],
        )
        inner.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (1, 0), (1, -1), 10),
            ("RIGHTPADDING", (2, 0), (2, -1), 0),
        ]))

        # Outer card
        card = Table([[inner]], colWidths=["100%"])
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg),
            ("BOX", (0, 0), (-1, -1), 0.75, tier["border"]),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ]))
        story.append(KeepTogether([card, Spacer(1, 3*mm)]))

    story.append(Spacer(1, 2*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_700, spaceAfter=3*mm))

    # ── Summary rate table ────────────────────────────────────────────────────
    story.append(Paragraph("Rate Card Summary", ps("SummaryHead", fontName=bold, fontSize=9,
                            textColor=TEAL, leading=12, alignment=TA_LEFT, spaceAfter=3*mm)))

    table_data = [
        [
            Paragraph("Grade", label_style),
            Paragraph("Tier", label_style),
            Paragraph("Score Band", label_style),
            Paragraph("Target", label_style),
            Paragraph("Once-off (ZAR)", ps("LR", fontName=bold, fontSize=7,
                      textColor=SLATE_400, leading=10, alignment=TA_RIGHT,
                      textTransform="uppercase", letterSpacing=1)),
            Paragraph("Monthly (ZAR)", ps("LR2", fontName=bold, fontSize=7,
                      textColor=SLATE_400, leading=10, alignment=TA_RIGHT,
                      textTransform="uppercase", letterSpacing=1)),
            Paragraph("24-hr Rate", ps("LR3", fontName=bold, fontSize=7,
                      textColor=AMBER, leading=10, alignment=TA_RIGHT,
                      textTransform="uppercase", letterSpacing=1)),
        ]
    ]
    for tier in TIERS:
        color = tier["color"]
        table_data.append([
            Paragraph(f'<font color="#{color.hexval()[2:]}"><b>{tier["grade"]}</b></font>',
                      ps("TG", fontName=bold, fontSize=9, leading=12, alignment=TA_CENTER)),
            Paragraph(f'<font color="#{color.hexval()[2:]}">{tier["label"]}</font>',
                      ps("TN", fontName=bold, fontSize=9, leading=12, alignment=TA_LEFT)),
            Paragraph(tier["range"], ps("TR", fontName=mono, fontSize=8,
                      textColor=SLATE_400, leading=12, alignment=TA_LEFT)),
            Paragraph(tier["target"], ps("TT", fontName=mono, fontSize=8,
                      textColor=SLATE_400, leading=12, alignment=TA_LEFT)),
            Paragraph(tier["once_off"], ps("TO", fontName=bold, fontSize=9,
                      textColor=WHITE, leading=12, alignment=TA_RIGHT)),
            Paragraph(tier["monthly"], ps("TM", fontName=mono, fontSize=8,
                      textColor=SLATE_400, leading=12, alignment=TA_RIGHT)),
            Paragraph(tier["urgency"], ps("TU", fontName=bold, fontSize=9,
                      textColor=AMBER, leading=12, alignment=TA_RIGHT)),
        ])

    summary_table = Table(table_data, colWidths=[14*mm, 24*mm, 22*mm, 18*mm, 32*mm, 32*mm, 28*mm])
    row_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), SLATE_800),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, SLATE_700),
        ("BOX", (0, 0), (-1, -1), 0.5, SLATE_700),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]
    for i, tier in enumerate(TIERS, start=1):
        row_styles.append(("BACKGROUND", (0, i), (-1, i), tier["bg"]))
    summary_table.setStyle(TableStyle(row_styles))
    story.append(summary_table)
    story.append(Spacer(1, 4*mm))

    # ── Payment methods note ──────────────────────────────────────────────────
    payment_note = (
        "<b>Payment Methods:</b>  EFT (South African clients) · Wise (international USD/EUR) · "
        "Stripe (card payments) · PayFast (ZAR card/EFT) · Crypto accepted on request.  "
        "<b>50% deposit on project start · balance on delivery.</b>"
    )
    story.append(Paragraph(payment_note, ps("PayNote", fontName=sans, fontSize=7.5,
                           textColor=SLATE_400, leading=11, alignment=TA_CENTER,
                           spaceAfter=3*mm)))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.3, color=SLATE_700, spaceAfter=3*mm))
    story.append(Paragraph(
        "Jardin Roestorff · Founder, SMAIDM Digital Services · AI Search Visibility Specialist  ·  "
        "smaidmsagency@outlook.com  ·  082 266 0899  ·  smaidm.co.za  ·  © 2026 SMAIDM",
        footer_style
    ))

    doc.build(story)
    print(f"[OK] Rate card generated: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_rate_card()
