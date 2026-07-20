import smtplib
from email.mime.text import MIMEText

from app.config import settings


def send_email(to: str, subject: str, body: str, html: str | None = None) -> None:
    msg = MIMEText(html or body, "html" if html else "plain")
    msg["Subject"] = subject
    msg["From"] = f"noreply@{settings.SMTP_HOST}"
    msg["To"] = to

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
