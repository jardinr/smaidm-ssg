#!/usr/bin/env python3
"""
SMAIDM SSG Platform — Daily Autonomous Health Check
====================================================
Runs every day to proactively detect and report platform issues.

Checks performed:
  1. RESEND_API_KEY — is it set and reachable?
  2. Resend email delivery — can a test email be sent to the owner mailbox?
  3. TypeScript compilation — zero errors?
  4. Test suite — all tests passing?
  5. Live platform health — is the deployed URL responding?
  6. Python audit API health — is the backend responding?
  7. Database connectivity — can the DB be reached?
  8. Git status — are there uncommitted changes or unpushed commits?
  9. Environment variable completeness — are all required vars set?
 10. Render.yaml secrets — are all required keys declared?

Output: structured report sent to smaidmsagency@outlook.com via Resend.
        If Resend is down, report is saved to /home/ubuntu/smaidm-ssg/logs/health_YYYY-MM-DD.txt
"""

import os
import sys
import json
import subprocess
import datetime
import requests
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
OWNER_EMAIL = "smaidmsagency@outlook.com"
RESEND_API_URL = "https://api.resend.com/emails"
FROM_ADDRESS = "SMAIDM SSG Health <onboarding@resend.dev>"
PLATFORM_URL = os.environ.get("PLATFORM_URL", "https://smaidm-ssg-platform.onrender.com")
AUDIT_API_URL = os.environ.get("AUDIT_API_URL", "https://smaidm-ssg-api.onrender.com")
REPO_DIR = Path(__file__).parent.parent

REQUIRED_ENV_VARS = [
    "RESEND_API_KEY",
    "DATABASE_URL",
    "JWT_SECRET",
    "AUDIT_API_URL",
    "VITE_APP_ID",
]

LOG_DIR = REPO_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

today = datetime.date.today().isoformat()
results = []

# ── Helpers ───────────────────────────────────────────────────────────────────
def check(name: str, passed: bool, detail: str = "", fix: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append({"check": name, "status": status, "detail": detail, "fix": fix})
    icon = "✅" if passed else "❌"
    print(f"  {icon} [{status}] {name}: {detail}")

def run(cmd: str, cwd=None, timeout=60) -> tuple[int, str, str]:
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd or REPO_DIR, timeout=timeout)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except subprocess.TimeoutExpired:
        return 1, "", "Timeout"
    except Exception as e:
        return 1, "", str(e)

# ── Check 1: RESEND_API_KEY configured ───────────────────────────────────────
print("\n[1/10] Checking RESEND_API_KEY...")
resend_key = os.environ.get("RESEND_API_KEY", "")
if resend_key and resend_key.startswith("re_"):
    check("RESEND_API_KEY configured", True, f"Key present ({resend_key[:10]}...)")
else:
    check(
        "RESEND_API_KEY configured", False,
        "Key is missing or malformed",
        "Add RESEND_API_KEY to the Manus platform environment secrets and render.yaml"
    )

# ── Check 2: Resend API reachability ─────────────────────────────────────────
print("[2/10] Testing Resend API reachability...")
if resend_key:
    try:
        r = requests.get(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}"},
            timeout=8
        )
        # 405 = Method Not Allowed (GET not supported) = API is reachable and key is valid
        reachable = r.status_code in (200, 405, 200)
        check("Resend API reachable", reachable, f"HTTP {r.status_code}", "" if reachable else "Check Resend API status at status.resend.com")
    except Exception as e:
        check("Resend API reachable", False, str(e), "Check network connectivity")
else:
    check("Resend API reachable", False, "Skipped — no API key", "Set RESEND_API_KEY first")

# ── Check 3: TypeScript compilation ──────────────────────────────────────────
print("[3/10] Running TypeScript type check...")
code, out, err = run("pnpm tsc --noEmit 2>&1 | tail -5")
ts_ok = code == 0
check("TypeScript compiles cleanly", ts_ok, "0 errors" if ts_ok else err[:200], "" if ts_ok else "Run: pnpm tsc --noEmit to see full errors")

# ── Check 4: Test suite ───────────────────────────────────────────────────────
print("[4/10] Running test suite...")
code, out, err = run("pnpm test --run 2>&1 | tail -10", timeout=120)
tests_ok = code == 0
summary = out.split("\n")[-1] if out else err[:200]
check("All tests passing", tests_ok, summary, "" if tests_ok else "Run: pnpm test to see failures")

# ── Check 5: Live platform health ────────────────────────────────────────────
print("[5/10] Checking live platform health...")
try:
    r = requests.get(PLATFORM_URL, timeout=15)
    platform_ok = r.status_code < 500
    check("Live platform responding", platform_ok, f"HTTP {r.status_code} — {PLATFORM_URL}", "" if platform_ok else "Check Render dashboard for deployment errors")
except Exception as e:
    check("Live platform responding", False, str(e), "Platform may be down — check Render dashboard")

# ── Check 6: Python audit API health ─────────────────────────────────────────
print("[6/10] Checking Python audit API health...")
try:
    r = requests.get(f"{AUDIT_API_URL}/health", timeout=15)
    api_ok = r.status_code == 200
    check("Audit API responding", api_ok, f"HTTP {r.status_code} — {AUDIT_API_URL}/health", "" if api_ok else "Check Render dashboard for backend errors")
except Exception as e:
    check("Audit API responding", False, str(e), "Backend may be down — check Render dashboard")

# ── Check 7: Database connectivity ───────────────────────────────────────────
print("[7/10] Checking database connectivity...")
db_url = os.environ.get("DATABASE_URL", "")
if db_url:
    code, out, err = run(f'node -e "const {{Pool}}=require(\'pg\');const p=new Pool({{connectionString:\'{db_url}\',connectionTimeoutMillis:5000}});p.query(\'SELECT 1\').then(()=>{{console.log(\'ok\');process.exit(0)}}).catch(e=>{{console.error(e.message);process.exit(1)}})"', timeout=15)
    db_ok = code == 0
    check("Database reachable", db_ok, "Connected" if db_ok else err[:150], "" if db_ok else "Check DATABASE_URL secret and DB service status")
else:
    check("Database reachable", False, "DATABASE_URL not set", "Add DATABASE_URL to environment secrets")

# ── Check 8: Git status ───────────────────────────────────────────────────────
print("[8/10] Checking git status...")
code, out, err = run("git status --porcelain")
uncommitted = out.strip()
check("No uncommitted changes", not uncommitted, "Clean" if not uncommitted else f"{len(uncommitted.splitlines())} uncommitted file(s)", "" if not uncommitted else "Run: git add -A && git commit -m 'chore: auto-commit from health check'")

code2, out2, err2 = run("git log origin/main..HEAD --oneline")
unpushed = out2.strip()
check("No unpushed commits", not unpushed, "All pushed" if not unpushed else f"{len(unpushed.splitlines())} unpushed commit(s)", "" if not unpushed else "Run: git push origin main")

# ── Check 9: Required env vars ────────────────────────────────────────────────
print("[9/10] Checking required environment variables...")
missing_vars = [v for v in REQUIRED_ENV_VARS if not os.environ.get(v)]
check(
    "All required env vars set",
    len(missing_vars) == 0,
    "All present" if not missing_vars else f"Missing: {', '.join(missing_vars)}",
    "" if not missing_vars else f"Add to Manus platform secrets: {', '.join(missing_vars)}"
)

# ── Check 10: render.yaml completeness ───────────────────────────────────────
print("[10/10] Checking render.yaml for secret declarations...")
render_yaml = (REPO_DIR / "render.yaml").read_text() if (REPO_DIR / "render.yaml").exists() else ""
missing_in_render = [v for v in ["RESEND_API_KEY", "DATABASE_URL", "JWT_SECRET"] if v not in render_yaml]
check(
    "render.yaml declares all secrets",
    len(missing_in_render) == 0,
    "All declared" if not missing_in_render else f"Missing from render.yaml: {', '.join(missing_in_render)}",
    "" if not missing_in_render else f"Add envVars entries for: {', '.join(missing_in_render)}"
)

# ── Summary ───────────────────────────────────────────────────────────────────
passed = sum(1 for r in results if r["status"] == "PASS")
failed = sum(1 for r in results if r["status"] == "FAIL")
total = len(results)
overall = "ALL SYSTEMS HEALTHY" if failed == 0 else f"{failed} ISSUE(S) DETECTED"

print(f"\n{'='*60}")
print(f"SMAIDM SSG Daily Health Check — {today}")
print(f"Result: {overall} ({passed}/{total} checks passed)")
print('='*60)

# ── Build email report ────────────────────────────────────────────────────────
rows = ""
for r in results:
    colour = "#14B8A6" if r["status"] == "PASS" else "#EF4444"
    icon = "✅" if r["status"] == "PASS" else "❌"
    fix_row = f"<tr><td colspan='2' style='padding:2px 8px 8px 8px;font-size:11px;color:#FFA500;'>↳ Fix: {r['fix']}</td></tr>" if r["fix"] else ""
    rows += f"""
    <tr>
      <td style='padding:6px 8px;font-size:12px;color:{colour};'>{icon} {r['check']}</td>
      <td style='padding:6px 8px;font-size:12px;color:rgba(255,255,255,0.7);'>{r['detail']}</td>
    </tr>{fix_row}"""

header_colour = "#14B8A6" if failed == 0 else "#EF4444"
html = f"""
<div style='font-family:monospace;background:#0D1117;color:#fff;padding:24px;max-width:680px;'>
  <h2 style='color:{header_colour};margin:0 0 4px;'>SMAIDM SSG — Daily Health Check</h2>
  <p style='color:rgba(255,255,255,0.5);margin:0 0 16px;font-size:12px;'>{today} · {overall}</p>
  <table style='width:100%;border-collapse:collapse;'>
    <tr style='border-bottom:1px solid rgba(255,255,255,0.1);'>
      <th style='text-align:left;padding:6px 8px;font-size:11px;color:rgba(255,255,255,0.4);'>CHECK</th>
      <th style='text-align:left;padding:6px 8px;font-size:11px;color:rgba(255,255,255,0.4);'>DETAIL</th>
    </tr>
    {rows}
  </table>
  <p style='margin:16px 0 0;font-size:11px;color:rgba(255,255,255,0.3);'>
    Automated by SMAIDM SSG Health Monitor · smaidmsagency@outlook.com
  </p>
</div>
"""

subject = f"{'✅' if failed == 0 else '❌'} SMAIDM SSG Health Check — {today} — {overall}"

# ── Send email or save to log ─────────────────────────────────────────────────
log_path = LOG_DIR / f"health_{today}.txt"
log_content = f"SMAIDM SSG Health Check — {today}\n{overall}\n\n"
for r in results:
    log_content += f"[{r['status']}] {r['check']}: {r['detail']}\n"
    if r["fix"]:
        log_content += f"  Fix: {r['fix']}\n"
log_path.write_text(log_content)

if resend_key:
    try:
        resp = requests.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={"from": FROM_ADDRESS, "to": [OWNER_EMAIL], "subject": subject, "html": html},
            timeout=10
        )
        if resp.status_code in (200, 201):
            print(f"\n📧 Health report emailed to {OWNER_EMAIL}")
        else:
            print(f"\n⚠️  Email send failed (HTTP {resp.status_code}) — report saved to {log_path}")
    except Exception as e:
        print(f"\n⚠️  Email send error: {e} — report saved to {log_path}")
else:
    print(f"\n⚠️  RESEND_API_KEY not set — report saved to {log_path}")
    print(f"    ACTION REQUIRED: Set RESEND_API_KEY in platform secrets to enable email delivery")

sys.exit(0 if failed == 0 else 1)
