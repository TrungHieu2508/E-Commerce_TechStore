import os
from pathlib import Path
from urllib.parse import quote_plus


def _build_mysql_uri() -> str:
	host = os.getenv("MYSQL_HOST", "localhost")
	port = os.getenv("MYSQL_PORT", "3306")
	user = os.getenv("MYSQL_USER", "root")
	password = os.getenv("MYSQL_PASSWORD", "12345")
	database = os.getenv("MYSQL_DATABASE", "nextech_db")

	# URL-encode password để tránh lỗi khi có ký tự đặc biệt
	password_enc = quote_plus(password)
	return f"mysql+pymysql://{user}:{password_enc}@{host}:{port}/{database}"


# Cấu hình database: khi đổi user/password MySQL chỉ sửa file này
# hoặc set env var SQLALCHEMY_DATABASE_URI.


USE_SQLITE = os.getenv("USE_SQLITE", "0").lower() in ("1", "true", "yes")


def _build_sqlite_uri() -> str:
	"""Return an absolute sqlite URI under repo's instance/ folder.

	Using a relative sqlite path (sqlite:///nextech.sqlite3) can create multiple DB
	files depending on the process working directory, which makes orders appear to
	"disappear" across runs.
	"""
	root_dir = Path(__file__).resolve().parent.parent
	instance_dir = root_dir / "instance"
	instance_dir.mkdir(parents=True, exist_ok=True)
	db_path = (instance_dir / "nextech.sqlite3").resolve().as_posix()
	# Absolute sqlite URI must be sqlite:///C:/... on Windows
	return f"sqlite:///{db_path}"

# Optional fallback (dev): set USE_SQLITE=1 để chạy nhanh khi MySQL chưa sẵn sàng
if USE_SQLITE:
	# Respect explicit env override; otherwise use a stable absolute DB path.
	SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI") or _build_sqlite_uri()
else:
	SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI") or _build_mysql_uri()

SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_ENGINE_OPTIONS = {
	"pool_pre_ping": True,
}

if USE_SQLITE:
	# SQLite doesn't support MySQL-specific connect args (e.g., connect_timeout)
	SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {
		"check_same_thread": False
	}
else:
	SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {
		# Tránh treo lâu nếu MySQL không reachable
		"connect_timeout": int(os.getenv("MYSQL_CONNECT_TIMEOUT", "10"))
	}
