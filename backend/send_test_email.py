import argparse
import os
import importlib.util
import smtplib
import ssl
import socket
from email.message import EmailMessage


def _is_probably_valid_email(value: str) -> bool:
    value = (value or "").strip()
    return bool(value) and ("@" in value) and (" " not in value)


def send_email(to_email: str, subject: str, body: str) -> tuple[bool, str | None]:
    """Send one email using SMTP_* env vars.

    Returns:
      (True, None) on success
      (False, error_code) on failure

    Error codes mirror backend/app.py as much as possible so you can troubleshoot
    using the same vocabulary.
    """

    to_email = (to_email or "").strip()
    if not _is_probably_valid_email(to_email):
        return False, "invalid_email"

    # Dev mode: test email generation without SMTP credentials.
    # EMAIL_MODE=file  -> writes .eml files under instance/emails/
    # EMAIL_MODE=console -> prints email content to console
    email_mode = (os.getenv("EMAIL_MODE") or "").strip().lower()
    if email_mode in ("file", "console"):
        msg = EmailMessage()
        msg["From"] = (os.getenv("SMTP_FROM") or os.getenv("SMTP_USER") or "noreply@nextech.local").strip()
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body, charset="utf-8")

        if email_mode == "console":
            print("DEV EMAIL (console)\n" + msg.as_string())
            return True, None

        from pathlib import Path

        root_dir = Path(__file__).resolve().parent.parent
        out_dir = Path(os.getenv("EMAIL_FILE_DIR") or (root_dir / "instance" / "emails"))
        out_dir.mkdir(parents=True, exist_ok=True)

        import datetime
        import random
        import string

        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        safe_to = "".join(ch for ch in to_email if ch.isalnum() or ch in ("@", ".", "_", "-"))
        out_path = out_dir / f"email_{ts}_{rand}_{safe_to}.eml"
        out_path.write_text(msg.as_string(), encoding="utf-8")
        print(f"OK: email_saved_to_file: {out_path}")
        return True, None

    smtp_host = (os.getenv("SMTP_HOST") or "").strip()
    smtp_user = (os.getenv("SMTP_USER") or "").strip()
    smtp_pass = os.getenv("SMTP_PASS") or ""
    smtp_from = (os.getenv("SMTP_FROM") or smtp_user or "").strip()

    missing: list[str] = []
    if not smtp_host:
        missing.append("SMTP_HOST")
    if not smtp_user:
        missing.append("SMTP_USER")
    if not smtp_pass:
        missing.append("SMTP_PASS")
    if not smtp_from:
        missing.append("SMTP_FROM")

    if missing:
        return False, "smtp_not_configured"

    smtp_ssl = (os.getenv("SMTP_SSL", "false").lower() in ("1", "true", "yes"))
    smtp_tls = (os.getenv("SMTP_TLS", "true").lower() in ("1", "true", "yes"))

    if smtp_ssl:
        default_port = 465
    elif smtp_tls:
        default_port = 587
    else:
        default_port = 25

    try:
        smtp_port = int(os.getenv("SMTP_PORT", str(default_port)))
    except Exception:
        smtp_port = default_port

    try:
        smtp_timeout = int(os.getenv("SMTP_TIMEOUT", "10"))
    except Exception:
        smtp_timeout = 10
    smtp_timeout = max(1, min(smtp_timeout, 120))

    msg = EmailMessage()
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body, charset="utf-8")

    ssl_context = ssl.create_default_context()

    try:
        if smtp_ssl:
            with smtplib.SMTP_SSL(
                smtp_host,
                smtp_port,
                timeout=smtp_timeout,
                context=ssl_context,
            ) as server:
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=smtp_timeout) as server:
                server.ehlo()
                if smtp_tls:
                    server.starttls(context=ssl_context)
                    server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)

        return True, None

    except smtplib.SMTPAuthenticationError as e:
        # Avoid printing secrets; include only safe context to troubleshoot.
        try:
            code = getattr(e, "smtp_code", None)
            resp = getattr(e, "smtp_error", None)
            if isinstance(resp, (bytes, bytearray)):
                resp = resp.decode("utf-8", errors="replace")
            print(
                "AUTH FAILED: "
                f"code={code} resp={resp} "
                f"host={smtp_host} port={smtp_port} tls={smtp_tls} ssl={smtp_ssl} "
                f"user={smtp_user} pass_len={len(smtp_pass)}"
            )
        except Exception:
            pass
        return False, "smtp_auth_failed"
    except smtplib.SMTPRecipientsRefused:
        return False, "smtp_recipient_refused"
    except (socket.timeout, TimeoutError):
        return False, "smtp_timeout"
    except (OSError, smtplib.SMTPConnectError):
        return False, "smtp_connect_failed"
    except Exception as e:
        return False, f"smtp_failed:{type(e).__name__}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a test email using SMTP_* env vars")
    parser.add_argument("--to", required=True, help="Recipient email")
    parser.add_argument("--subject", default="[NexTech] Test email", help="Email subject")
    parser.add_argument(
        "--body",
        default="This is a test email from NexTech backend SMTP configuration.",
        help="Email body",
    )
    args = parser.parse_args()

    # Load backend/.env if python-dotenv is available (same behavior as backend/app.py)
    try:
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'env.py')
        if os.path.exists(env_path):
            spec = importlib.util.spec_from_file_location('nextech_env', env_path)
            if spec and spec.loader:
                env_mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(env_mod)
                if hasattr(env_mod, 'load_env'):
                    env_mod.load_env()
    except Exception:
        pass

    ok, err = send_email(args.to, args.subject, args.body)
    if ok:
        # send_email may print a more detailed OK message in dev mode
        if (os.getenv("EMAIL_MODE") or "").strip().lower() not in ("file", "console"):
            print("OK: email_sent")
        return 0

    if err == "smtp_auth_failed":
        print(
            "ERROR: smtp_auth_failed\n"
            "Hints:\n"
            "- Use a Gmail App Password (requires 2-Step Verification), not your normal Gmail password.\n"
            "- Paste the 16-character app password without spaces.\n"
            "- Check Gmail Inbox/Spam for a sign-in alert and verify account security settings."
        )
        return 2

    print(f"ERROR: {err}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
