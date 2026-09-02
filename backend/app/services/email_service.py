import logging
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Asynchronous email delivery service using SMTP (Resend / standard SMTP).
    """

    @classmethod
    async def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Sends an HTML & plain text multipart email asynchronously.
        If SMTP_PASSWORD is not configured, logs the message safely without throwing.
        """
        if not settings.SMTP_PASSWORD or not settings.SMTP_PASSWORD.strip():
            logger.warning(
                f"[Email Dev Mode] SMTP_PASSWORD not configured. Email to <{to_email}> skipped. Subject: {subject}"
            )
            return False

        try:
            # Build multipart message
            message = MIMEMultipart("alternative")
            message["Subject"] = Header(subject, "utf-8")
            message["From"] = formataddr((str(Header(settings.SMTP_FROM_NAME, "utf-8")), settings.SMTP_FROM_EMAIL))
            message["To"] = to_email

            # Attach plain text fallback
            plain_body = text_content or "Please view this email in an HTML-compatible email client."
            message.attach(MIMEText(plain_body, "plain", "utf-8"))

            # Attach HTML content
            message.attach(MIMEText(html_content, "html", "utf-8"))

            # Dispatch via async SMTP
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD.strip(),
                start_tls=settings.SMTP_STARTTLS and not settings.SMTP_SSL,
                use_tls=settings.SMTP_SSL,
                timeout=15.0,
            )

            logger.info(f"[Email Success] Sent '{subject}' to <{to_email}> via {settings.SMTP_HOST}")
            return True

        except Exception as exc:
            logger.error(f"[Email Error] Failed to send email to <{to_email}>: {exc}", exc_info=True)
            return False

    @classmethod
    async def send_password_reset_email(
        cls,
        to_email: str,
        reset_token: str,
        user_name: Optional[str] = None,
    ) -> bool:
        """
        Constructs and delivers a styled password reset email.
        """
        frontend_base = settings.FRONTEND_URL.rstrip("/")
        reset_link = f"{frontend_base}/reset-password?token={reset_token}"
        greeting_name = user_name if user_name and user_name.strip() else "FinTrack User"

        subject = "Reset Your FinTrack Password"

        plain_text = f"""Hello {greeting_name},

We received a request to reset your password for your FinTrack account.

Please use the following link to set a new password:
{reset_link}

This link is valid for {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes.

If you did not request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
The FinTrack Team
"""

        html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your FinTrack Password</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }}
    .container {{
      max-width: 560px;
      margin: 40px auto;
      background: #131b2e;
      border: 1px solid #1e293b;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }}
    .header {{
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 32px 24px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .header p {{
      margin: 6px 0 0 0;
      color: #ecfdf5;
      font-size: 14px;
      font-weight: 500;
    }}
    .content {{
      padding: 36px 32px;
    }}
    .greeting {{
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 16px;
    }}
    .message {{
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 28px;
    }}
    .btn-wrapper {{
      text-align: center;
      margin: 32px 0;
    }}
    .btn {{
      display: inline-block;
      background: #10b981;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);
    }}
    .notice {{
      background: #1e293b;
      border-left: 4px solid #10b981;
      border-radius: 8px;
      padding: 14px 18px;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 24px;
      line-height: 1.5;
    }}
    .fallback-url {{
      word-break: break-all;
      font-size: 12px;
      color: #64748b;
      margin-top: 24px;
      line-height: 1.5;
    }}
    .fallback-url a {{
      color: #10b981;
      text-decoration: underline;
    }}
    .footer {{
      padding: 24px 32px;
      background: #0d1322;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FinTrack</h1>
      <p>Personal Expense &amp; Live Budget Tracker</p>
    </div>
    <div class="content">
      <div class="greeting">Hello {greeting_name},</div>
      <div class="message">
        We received a request to reset the password for your FinTrack account. Click the button below to choose a new, secure password:
      </div>
      <div class="btn-wrapper">
        <a href="{reset_link}" class="btn" target="_blank">Reset Password</a>
      </div>
      <div class="notice">
        <strong>Security Notice:</strong> This link is valid for <strong>{settings.RESET_TOKEN_EXPIRE_MINUTES} minutes</strong>. If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
      </div>
      <div class="fallback-url">
        If the button above does not work, copy and paste this URL into your browser:<br>
        <a href="{reset_link}">{reset_link}</a>
      </div>
    </div>
    <div class="footer">
      &copy; FinTrack. All rights reserved.<br>
      This is an automated system email, please do not reply.
    </div>
  </div>
</body>
</html>
"""

        return await cls.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_body,
            text_content=plain_text,
        )
