"""
SMAIDM SSG Platform — FastAPI Backend
POST /audit  — Run an AI visibility audit on a given URL
GET  /health — Health check
"""
from __future__ import annotations
import sys
import os

# Ensure the backend package is importable when running from any directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, field_validator
import requests

from scorer.engine import run_audit


# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SMAIDM SSG Platform API",
    description="AI Search Visibility Diagnostic Engine — audits websites for SEO, SGO, and GEO readiness.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class AuditRequest(BaseModel):
    url: str
    business_name: Optional[str] = ""
    email: Optional[str] = ""
    industry: Optional[str] = ""

    @field_validator("url")
    @classmethod
    def normalise_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            v = "https://" + v
        return v


class FindingOut(BaseModel):
    dimension: str
    criterion: str
    issue: str
    severity: str
    points_lost: int


class AuditResponse(BaseModel):
    url: str
    total_score: int
    grade: str
    seo_score: int
    sgo_score: int
    geo_score: int
    findings: list[FindingOut]
    top_gaps: list[str]
    audit_timestamp: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """Returns API health status."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
    )


@app.post("/audit", response_model=AuditResponse, tags=["Audit"])
def audit_website(request: AuditRequest):
    """
    Run an AI Search Visibility audit on the provided URL.

    Returns a scored diagnostic report across SEO, SGO, and GEO dimensions.
    """
    try:
        result = run_audit(
            url=request.url,
            business_name=request.business_name or "",
        )
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=422,
            detail=f"Could not connect to '{request.url}'. Please check the URL and try again.",
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=408,
            detail=f"Request to '{request.url}' timed out. The site may be slow or unavailable.",
        )
    except requests.exceptions.HTTPError as e:
        raise HTTPException(
            status_code=422,
            detail=f"HTTP error fetching '{request.url}': {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Audit failed: {str(e)}",
        )

    return AuditResponse(
        url=result.url,
        total_score=result.total_score,
        grade=result.grade,
        seo_score=result.seo_score,
        sgo_score=result.sgo_score,
        geo_score=result.geo_score,
        findings=[FindingOut(**f) for f in result.findings],
        top_gaps=result.top_gaps,
        audit_timestamp=result.audit_timestamp,
    )
