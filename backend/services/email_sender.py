import os
import httpx


async def send_email(to_email: str, subject: str, body: str) -> dict:
    api_key    = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("SENDGRID_FROM_EMAIL")

    if not api_key:
        return {"ok": False, "error": "SENDGRID_API_KEY not set in .env"}
    if not from_email:
        return {"ok": False, "error": "SENDGRID_FROM_EMAIL not set in .env"}

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from":    {"email": from_email},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type":  "application/json",
                },
                json=payload,
            )
        if r.status_code == 202:
            return {"ok": True}
        return {"ok": False, "error": f"SendGrid returned {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
