from __future__ import annotations

from pathlib import Path


def load_env() -> None:
    """Load environment variables from .env files (dev convenience).

    Priority:
      1) backend/.env
      2) repo-root .env (optional fallback)

    Real OS environment variables always win (override=False).
    """

    try:
        from dotenv import load_dotenv
    except Exception:
        # Dependency not installed; treat as optional.
        return

    backend_dir = Path(__file__).resolve().parent
    repo_root = backend_dir.parent

    load_dotenv(backend_dir / ".env", override=False)
    load_dotenv(repo_root / ".env", override=False)
