/* ============================================================
   mockAudit — Demo mode response when no backend is reachable
   Used when VITE_API_BASE is not set or backend is unavailable
   ============================================================ */

export interface Finding {
  dimension: string;
  criterion: string;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  points_lost: number;
}

export interface AuditData {
  url: string;
  total_score: number;
  grade: string;
  seo_score: number;
  sgo_score: number;
  geo_score: number;
  findings: Finding[];
  top_gaps: string[];
  audit_timestamp: string;
}

export function generateMockAudit(url: string): AuditData {
  // Deterministically vary the score based on URL length so different URLs
  // produce different demo results, making the demo feel realistic.
  const seed = url.length % 4;
  const profiles = [
    { total: 28, grade: "Invisible to AI", seo: 12, sgo: 8, geo: 8 },
    { total: 47, grade: "Low Visibility",  seo: 18, sgo: 14, geo: 15 },
    { total: 61, grade: "At Risk",         seo: 22, sgo: 20, geo: 19 },
    { total: 74, grade: "Developing",      seo: 26, sgo: 24, geo: 24 },
  ];
  const p = profiles[seed];

  const findings: Finding[] = ([
    {
      dimension: "SEO",
      criterion: "Title Tag",
      issue: "Title tag is missing or empty. This is a fundamental SEO signal that AI engines use to understand page topic.",
      severity: "Critical",
      points_lost: 5,
    },
    {
      dimension: "SEO",
      criterion: "Meta Description",
      issue: "No meta description found. AI summarisation engines frequently use meta descriptions as candidate answer text.",
      severity: "High",
      points_lost: 4,
    },
    {
      dimension: "SEO",
      criterion: "Canonical URL",
      issue: "No canonical tag detected. Without a canonical, AI crawlers may index duplicate content and dilute entity signals.",
      severity: "Medium",
      points_lost: 3,
    },
    {
      dimension: "SGO",
      criterion: "Question-Based Headings",
      issue: "No question-based H2/H3 headings found. AI engines prioritise pages that directly answer questions users ask.",
      severity: "Critical",
      points_lost: 8,
    },
    {
      dimension: "SGO",
      criterion: "Atomic Answer Blocks",
      issue: "No concise answer paragraphs (20–100 words) detected below question headings. This is the primary SGO gap.",
      severity: "Critical",
      points_lost: 7,
    },
    {
      dimension: "SGO",
      criterion: "Structured Data",
      issue: "No JSON-LD schema markup found. FAQPage, HowTo, and Organization schema significantly improve AI citation rates.",
      severity: "High",
      points_lost: 6,
    },
    {
      dimension: "SGO",
      criterion: "Readability",
      issue: "Content readability score is below the recommended Flesch range (50–70). Complex text is rarely cited by AI engines.",
      severity: "Medium",
      points_lost: 4,
    },
    {
      dimension: "GEO",
      criterion: "Entity Consistency",
      issue: "Business name, address, and contact details are inconsistent or absent across the page. Entity disambiguation is critical for AI knowledge graphs.",
      severity: "High",
      points_lost: 6,
    },
    {
      dimension: "GEO",
      criterion: "Author / Publisher Signals",
      issue: "No author bylines, About page links, or publisher schema detected. AI engines weight content from identifiable entities more heavily.",
      severity: "High",
      points_lost: 5,
    },
    {
      dimension: "GEO",
      criterion: "External Authority Links",
      issue: "No outbound links to authoritative external sources found. Citing credible sources increases AI citation confidence.",
      severity: "Medium",
      points_lost: 4,
    },
  ] as Finding[]).slice(0, 6 + seed * 2); // More findings for lower scores

  return {
    url,
    total_score: p.total,
    grade: p.grade,
    seo_score: p.seo,
    sgo_score: p.sgo,
    geo_score: p.geo,
    findings,
    top_gaps: [
      "Add question-based H2/H3 headings that mirror how your customers search (e.g. 'What is...?', 'How does...?')",
      "Write 30–80 word atomic answer paragraphs directly below each question heading — this is the #1 SGO fix",
      "Implement JSON-LD FAQPage and Organization schema to give AI engines structured, citable data about your business",
    ],
    audit_timestamp: new Date().toISOString(),
  };
}
