#!/usr/bin/env python3
import requests, json, datetime, os

KEY = os.environ.get("RESEND_API_KEY", "re_CdtMCStJ_Lby6qcjxwWQPjp1repyYgWeM")
today = datetime.date.today().isoformat()

resp = requests.post(
    "https://api.resend.com/emails",
    headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
    json={
        "from": "SMAIDM SSG Platform <onboarding@resend.dev>",
        "to": ["smaidmsagency@outlook.com"],
        "subject": f"✅ SMAIDM SSG — Email Delivery Restored {today}",
        "html": f"""
        <div style="font-family:monospace;background:#0D1117;color:#fff;padding:24px;max-width:600px;">
          <h2 style="color:#14B8A6;margin:0 0 8px;">✅ Email Delivery Restored</h2>
          <p style="margin:0 0 16px;">The RESEND_API_KEY has been successfully configured on the SMAIDM SSG Platform. All audit notifications and client report emails will now deliver correctly.</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:rgba(255,255,255,0.5);font-size:12px;">Key name</td><td style="padding:4px 0;font-size:12px;">SMAIDM SSG Platform (re_CdtMCStJ...)</td></tr>
            <tr><td style="padding:4px 0;color:rgba(255,255,255,0.5);font-size:12px;">Restored</td><td style="padding:4px 0;font-size:12px;">{today}</td></tr>
            <tr><td style="padding:4px 0;color:rgba(255,255,255,0.5);font-size:12px;">Daily health checks</td><td style="padding:4px 0;font-size:12px;color:#14B8A6;">Active — runs every morning at 07:00 SAST</td></tr>
          </table>
        </div>
        """
    },
    timeout=10
)
print(f"Status: {resp.status_code}")
print(json.dumps(resp.json(), indent=2))
