import re # Thêm dòng này lên trên cùng file cùng với các thư viện khác
import os
import json
import hashlib
import importlib.util
import uuid
import random
import string
import smtplib
import ssl
import socket
from email.message import EmailMessage
import urllib.request
import urllib.error
from contextlib import contextmanager
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import timedelta, datetime
from werkzeug.utils import secure_filename
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError, IntegrityError, InvalidRequestError

# Load local .env (dev) before reading any os.getenv().
# Import by file path to avoid module-name conflicts (e.g., third-party "env" packages).
try:
    _env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'env.py')
    if os.path.exists(_env_path):
        _spec = importlib.util.spec_from_file_location('nextech_env', _env_path)
        if _spec and _spec.loader:
            _env_mod = importlib.util.module_from_spec(_spec)
            _spec.loader.exec_module(_env_mod)
            if hasattr(_env_mod, 'load_env'):
                _env_mod.load_env()
except Exception:
    pass


EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'


def _is_valid_email(email: str) -> bool:
    try:
        v = (email or '').strip()
    except Exception:
        return False
    if not v:
        return False
    return re.match(EMAIL_REGEX, v) is not None

app = Flask(__name__)

# --- CẤU HÌNH ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'assets', 'img')
if not os.path.exists(UPLOAD_FOLDER): 
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JWT_SECRET_KEY'] = 'nextech_secret_key_2026' 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# --- DATABASE CONFIG (backend/config.py) ---
# Toàn bộ cấu hình DB phải nằm trong backend/config.py.
config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.py')
if not os.path.exists(config_path):
    raise RuntimeError(
        "Không tìm thấy backend/config.py. Vui lòng tạo file backend/config.py và cấu hình SQLALCHEMY_DATABASE_URI."
    )

try:
    spec = importlib.util.spec_from_file_location('nextech_config', config_path)
    if not spec or not spec.loader:
        raise RuntimeError("Không thể tải backend/config.py (spec/loader không hợp lệ).")

    config_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(config_module)

    app.config['SQLALCHEMY_DATABASE_URI'] = getattr(config_module, 'SQLALCHEMY_DATABASE_URI', None)
    if not app.config['SQLALCHEMY_DATABASE_URI']:
        raise RuntimeError("Thiếu SQLALCHEMY_DATABASE_URI trong backend/config.py")

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = getattr(
        config_module, 'SQLALCHEMY_TRACK_MODIFICATIONS', False
    )

    engine_opts = getattr(config_module, 'SQLALCHEMY_ENGINE_OPTIONS', None)
    if engine_opts:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_opts
except RuntimeError:
    raise
except Exception as e:
    raise RuntimeError(f"Lỗi khi tải cấu hình database từ backend/config.py: {str(e)}")

# --- BE2 DEFAULTS ---
# Mặc định stock lớn để BE2 (đặt hàng) chạy được ngay trên bài tập.
# Có thể override bằng biến môi trường DEFAULT_PRODUCT_STOCK.
DEFAULT_PRODUCT_STOCK = int(os.getenv('DEFAULT_PRODUCT_STOCK', '999'))

try:
    db = SQLAlchemy(app)
except ModuleNotFoundError as e:
    # Thường xảy ra khi chạy sai môi trường Python (không activate .venv)
    if getattr(e, 'name', None) == 'pymysql':
        raise SystemExit(
            "Thiếu thư viện PyMySQL nên không tạo được kết nối MySQL. "
            "Hãy dùng đúng virtualenv (.venv) và cài dependencies: pip install -r backend/requirements.txt"
        ) from None
    raise
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app)


@contextmanager
def _session_begin():
    """Begin a transaction safely even if the Session already has one.

    Some endpoints call helpers that execute queries before entering a transaction.
    SQLAlchemy may auto-begin a transaction on first query; calling begin() again
    raises: 'A transaction is already begun on this Session.'

    This helper uses begin_nested() (SAVEPOINT) when a transaction is already active.
    """
    try:
        with db.session.begin():
            yield
    except InvalidRequestError:
        # A transaction may already be started implicitly by earlier queries.
        # Use a SAVEPOINT-based nested transaction in that case.
        with db.session.begin_nested():
            yield

# --- MODELS ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    role = db.Column(db.String(20), default='user')
    is_locked = db.Column(db.Boolean, default=False)
    address = db.Column(db.Text, nullable=True)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    brand = db.Column(db.String(50))
    price = db.Column(db.BigInteger, nullable=False)
    old_price = db.Column(db.BigInteger, default=0)
    img = db.Column(db.String(500), nullable=False)
    specs = db.Column(db.Text) 
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    rating = db.Column(db.Float, default=0.0) # Mặc định 0 sao để hiện màu xám
    review_count = db.Column(db.Integer, default=0)
    stock = db.Column(db.Integer, nullable=False, default=DEFAULT_PRODUCT_STOCK)

class Banner(db.Model):
    __tablename__ = 'banners'
    id = db.Column(db.Integer, primary_key=True)
    img = db.Column(db.Text, nullable=False) 
    position = db.Column(db.String(50))

class Review(db.Model):
    __tablename__ = 'reviews'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    username = db.Column(db.String(80), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

# --- BE2 MODELS ---
class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'product_id', name='uq_cart_user_product'),
    )

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(40), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(30), default='processing')
    total_amount = db.Column(db.BigInteger, nullable=False, default=0)
    payment_method = db.Column(db.String(20), nullable=True)
    customer_name = db.Column(db.String(120), nullable=False)
    customer_phone = db.Column(db.String(20), nullable=False)
    customer_address = db.Column(db.Text, nullable=False)
    customer_email = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.BigInteger, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    provider = db.Column(db.String(20), nullable=False, default='mock')
    amount = db.Column(db.BigInteger, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    payment_ref = db.Column(db.String(64), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)


class OrderIdempotency(db.Model):
    __tablename__ = 'order_idempotency'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    key = db.Column(db.String(120), nullable=False)
    request_hash = db.Column(db.String(64), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'key', name='uq_order_idem_user_key'),
    )


# --- BE2 HELPERS ---
def _get_current_user_entity():
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()
    if not user:
        return None, (jsonify({"msg": "User không tồn tại"}), 404)
    if user.is_locked:
        return None, (jsonify({"msg": "Tài khoản của bạn hiện đang bị khóa!"}), 403)
    return user, None


def _require_admin():
    user, err = _get_current_user_entity()
    if err:
        return None, err
    if (user.role or '').lower() != 'admin':
        return None, (jsonify({"msg": "Bạn không có quyền Admin"}), 403)
    return user, None


def _restock_order_items(order_id: int):
    """Hoàn kho cho 1 đơn hàng (id) dựa theo order_items.

    Must be called inside a transaction.
    """
    items = OrderItem.query.filter_by(order_id=order_id).all()
    if not items:
        return

    qty_map = {}
    for it in items:
        qty_map[it.product_id] = qty_map.get(it.product_id, 0) + int(it.quantity)

    products = (
        Product.query
        .filter(Product.id.in_(list(qty_map.keys())))
        .with_for_update()
        .all()
    )
    prod_map = {p.id: p for p in products}

    for pid, qty in qty_map.items():
        p = prod_map.get(pid)
        if not p:
            continue
        p.stock = int(p.stock) + int(qty)


def _generate_order_code():
    # ORD + yymmddHHMMSS + random
    ts = datetime.now().strftime('%y%m%d%H%M%S')
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"ORD{ts}{rand}"


def _compute_order_request_hash(
    customer_name: str,
    customer_phone: str,
    customer_address: str,
    customer_email: str,
    qty_map: dict,
    payment_method: str,
) -> str:
    items = sorted(
        [(int(pid), int(qty)) for pid, qty in (qty_map or {}).items()],
        key=lambda x: x[0],
    )
    payload = {
        "customer": {
            "name": (customer_name or '').strip(),
            "phone": (customer_phone or '').strip(),
            "address": (customer_address or '').strip(),
            "email": (customer_email or '').strip(),
        },
        "items": items,
        "payment_method": (payment_method or '').strip().lower(),
    }
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _send_email_if_configured(to_email: str, subject: str, body: str):
    """Send email via SMTP if configured.

    Returns:
        (sent: bool, error_code: str|None)

    Notes:
        - Never logs sensitive values (SMTP_PASS).
        - error_code is safe for returning to client in dev.
    """
    to_email = (to_email or '').strip()
    if not to_email or not _is_valid_email(to_email):
        return False, 'invalid_email'

    # Dev mode: allow testing email generation without external SMTP credentials.
    # EMAIL_MODE=file  -> writes .eml files under instance/emails/
    # EMAIL_MODE=console -> prints email content to logs
    email_mode = (os.getenv('EMAIL_MODE') or '').strip().lower()
    if email_mode in ('file', 'console'):
        try:
            msg = EmailMessage()
            msg['To'] = to_email
            msg['Subject'] = subject
            # From is optional in dev mode; helps readability
            msg['From'] = (os.getenv('SMTP_FROM') or os.getenv('SMTP_USER') or 'noreply@nextech.local').strip()
            msg.set_content(body, subtype='plain', charset='utf-8')

            if email_mode == 'console':
                try:
                    app.logger.info('DEV EMAIL (console)\n%s', msg.as_string())
                except Exception:
                    pass
                return True, None

            # file mode
            from pathlib import Path

            root_dir = Path(__file__).resolve().parent.parent
            out_dir = Path(os.getenv('EMAIL_FILE_DIR') or (root_dir / 'instance' / 'emails'))
            out_dir.mkdir(parents=True, exist_ok=True)

            ts = datetime.now().strftime('%Y%m%d_%H%M%S')
            rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
            safe_to = ''.join(ch for ch in to_email if ch.isalnum() or ch in ('@', '.', '_', '-'))
            filename = f"email_{ts}_{rand}_{safe_to}.eml"
            out_path = out_dir / filename
            out_path.write_text(msg.as_string(), encoding='utf-8')

            try:
                app.logger.info('DEV EMAIL (file) saved: %s', str(out_path))
            except Exception:
                pass
            return True, None
        except Exception:
            try:
                app.logger.exception('DEV EMAIL failed (mode=%s to=%s)', email_mode, to_email)
            except Exception:
                pass
            return False, 'dev_email_failed'

    smtp_host = (os.getenv('SMTP_HOST') or '').strip()
    smtp_user = (os.getenv('SMTP_USER') or '').strip()
    smtp_pass = os.getenv('SMTP_PASS') or ''
    smtp_from = (os.getenv('SMTP_FROM') or smtp_user or '').strip()

    missing = []
    if not smtp_host:
        missing.append('SMTP_HOST')
    if not smtp_user:
        missing.append('SMTP_USER')
    if not smtp_pass:
        missing.append('SMTP_PASS')
    if not smtp_from:
        # SMTP_FROM is optional, but after fallback it still can be empty if SMTP_USER missing.
        missing.append('SMTP_FROM')

    if missing:
        try:
            app.logger.warning(
                'SMTP not configured; email_mode=%s missing=%s',
                email_mode or '<empty>',
                ','.join(missing),
            )
        except Exception:
            pass
        return False, 'smtp_not_configured'

    smtp_ssl = os.getenv('SMTP_SSL', 'false').lower() in ('1', 'true', 'yes')
    smtp_tls = os.getenv('SMTP_TLS', 'true').lower() in ('1', 'true', 'yes')

    # Default ports: SSL(465), STARTTLS(587), plain(25)
    if smtp_ssl:
        default_port = 465
    elif smtp_tls:
        default_port = 587
    else:
        default_port = 25
    try:
        smtp_port = int(os.getenv('SMTP_PORT', str(default_port)))
    except Exception:
        smtp_port = default_port

    try:
        smtp_timeout = int(os.getenv('SMTP_TIMEOUT', '10'))
    except Exception:
        smtp_timeout = 10
    smtp_timeout = max(1, min(smtp_timeout, 120))

    try:
        msg = EmailMessage()
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.set_content(body, subtype='plain', charset='utf-8')

        ssl_context = ssl.create_default_context()

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
    except smtplib.SMTPAuthenticationError:
        return False, 'smtp_auth_failed'
    except smtplib.SMTPRecipientsRefused:
        return False, 'smtp_recipient_refused'
    except (socket.timeout, TimeoutError):
        return False, 'smtp_timeout'
    except (smtplib.SMTPConnectError, ConnectionRefusedError, socket.gaierror, OSError):
        return False, 'smtp_connect_failed'
    except Exception as e:
        try:
            app.logger.exception(
                'SMTP send failed (host=%s port=%s ssl=%s tls=%s user=%s from=%s to=%s)',
                smtp_host,
                smtp_port,
                smtp_ssl,
                smtp_tls,
                smtp_user,
                smtp_from,
                to_email,
            )
        except Exception:
            pass
        # Return a safe, non-sensitive code
        return False, f"smtp_failed:{type(e).__name__}"


def ensure_schema():
    """Mini-migration: đảm bảo schema có các cột cần thiết (SQLite/MySQL).

    Lưu ý: SQLAlchemy `create_all()` không tự động cập nhật schema khi table đã tồn tại.
    """

    def _column_exists(table_name: str, column_name: str) -> bool:
        try:
            insp = inspect(db.engine)
            cols = insp.get_columns(table_name)
            return any((c.get('name') == column_name) for c in (cols or []))
        except Exception:
            return False

    def _try_ddl(sql: str):
        try:
            db.session.execute(db.text(sql))
            db.session.commit()
        except Exception:
            db.session.rollback()

    # products.stock
    if not _column_exists('products', 'stock'):
        _try_ddl(
            f"ALTER TABLE products ADD COLUMN stock INT NOT NULL DEFAULT {DEFAULT_PRODUCT_STOCK}"
        )

    # orders.payment_method
    if not _column_exists('orders', 'payment_method'):
        _try_ddl("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20)")

    # Migrate legacy BE2 statuses -> new enum (idempotent)
    try:
        changed = 0
        changed += Order.query.filter(Order.status == 'paid').update({"status": "shipping"})
        changed += Order.query.filter(Order.status == 'payment_failed').update({"status": "cancelled"})
        if changed:
            db.session.commit()
    except Exception:
        db.session.rollback()


# . ĐĂNG KÝ (Bản nâng cao có kiểm tra lỗi)
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()

    # 1. Kiểm tra đầy đủ thông tin
    if not username or not password or not email:
        return jsonify({"msg": "Vui lòng nhập đầy đủ thông tin!"}), 400

    # 2. Kiểm tra trùng Username
    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "Tên đăng nhập đã tồn tại!"}), 400

    # 3. KIỂM TRA TRÙNG EMAIL (Đây là đoạn bạn đang thiếu)
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email này đã được sử dụng bởi một tài khoản khác!"}), 400

    # 4. Kiểm tra định dạng Email (Regex)
    if not _is_valid_email(email):
        return jsonify({"msg": "Định dạng Email không hợp lệ!"}), 400
    
    # 5. Nếu mọi thứ OK mới tiến hành lưu
    try:
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            username=username,
            password=hashed_password,
            email=email,
            phone=data.get('phone', ''),
            role='user'
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"msg": "Đăng ký thành công!"}), 201
    except Exception as e:
        db.session.rollback() # Hoàn tác nếu có lỗi bất ngờ
        return jsonify({"msg": "Có lỗi xảy ra trong quá trình lưu dữ liệu!"}), 500
# --- 3. SEED DATA & DATABASE INIT ---
def seed_data():
    if Product.query.first(): return 
    full_data = {
    "Iphone": [
        {
            "name": "iPhone 17 Pro Max 256GB | Chính hãng",
            "price": 37790000,
            "oldPrice": 37990000,
            "img": "../assets/img/IP1.png",
            "specs": {
                "Màn hình": "6.9 inch, LTPO Super Retina XDR",
                "Chip": "Apple A19 Bionic (3nm)",
                "RAM": "12GB",
                "Pin": "4500 mAh",
                "Camera": "48MP + 48MP + 48MP"
            },
            "description": "iPhone 17 Pro Max cao cấp AI"
        },
        {
            "name": "iPhone 17 256GB | Chính hãng",
            "price": 24590000,
            "oldPrice": 24990000,
            "img": "../assets/img/IP2.png",
            "specs": {
                "Màn hình": "6.1 inch OLED",
                "Chip": "Apple A19",
                "RAM": "8GB",
                "Bộ nhớ": "256GB",
                "Camera": "48MP Dual"
            },
            "description": "iPhone 17 tiêu chuẩn"
        },
        {
            "name": "iPhone Air 256GB | Chính hãng",
            "price": 24990000,
            "oldPrice": 31990000,
            "img": "../assets/img/IP3.png",
            "specs": {
                "Thiết kế": "Siêu mỏng (5.5mm)",
                "Chip": "Apple A18 Pro",
                "RAM": "8GB"
            },
            "description": "iPhone Air siêu mỏng"
        },
        {
            "name": "iPhone 15 128GB | Chính hãng VN/A",
            "price": 17990000,
            "oldPrice": 19990000,
            "img": "../assets/img/IP4.png",
            "specs": {
                "Chip": "A16 Bionic",
                "RAM": "6GB",
                "Cổng sạc": "USB-C"
            },
            "description": "iPhone 15 Dynamic Island"
        },
        {
            "name": "iPhone 17e 256GB | Chính hãng",
            "price": 17990000,
            "oldPrice": 0,
            "img": "../assets/img/IP5.png",
            "specs": {
                "Chip": "Apple A18",
                "RAM": "8GB"
            },
            "description": "iPhone giá rẻ"
        },
        {
            "name": "iPhone 16e 128GB | Chính hãng VN/A",
            "price": 12490000,
            "oldPrice": 16990000,
            "img": "../assets/img/IP6.png",
            "specs": {
                "Chip": "A18",
                "RAM": "8GB"
            },
            "description": "iPhone nhỏ gọn"
        },
        {
            "name": "iPhone 16 Pro 128GB | Chính hãng VN/A",
            "price": 26590000,
            "oldPrice": 28990000,
            "img": "../assets/img/IP7.png",
            "specs": {
                "Chip": "A18 Pro",
                "RAM": "8GB",
                "Màn hình": "120Hz"
            },
            "description": "iPhone 16 Pro"
        },
        {
            "name": "iPhone 16 Plus 128GB | Chính hãng VN/A",
            "price": 24790000,
            "oldPrice": 25990000,
            "img": "../assets/img/IP8.png",
            "specs": {
                "Pin": "4400 mAh",
                "Màn hình": "6.7 inch"
            },
            "description": "Pin trâu"
        }
    ],

    "SamSung": [
        {
            "name": "Samsung Galaxy S26 Ultra 12GB 256GB",
            "price": 33990000,
            "oldPrice": 36990000,
            "img": "../assets/img/SS1.png",
            "specs": {
                "Chip": "Snapdragon 8 Gen 5",
                "RAM": "12GB",
                "Camera": "200MP"
            },
            "description": "Flagship AI"
        },
        {
            "name": "Samsung Galaxy S25 Ultra 12GB 256GB",
            "price": 27490000,
            "oldPrice": 33380000,
            "img": "../assets/img/SS2.png",
            "specs": {
                "Chip": "Snapdragon 8 Gen 4",
                "RAM": "12GB"
            },
            "description": "Zoom 100x"
        },
        {
            "name": "Samsung Galaxy S26",
            "price": 22990000,
            "oldPrice": 25990000,
            "img": "../assets/img/SS3.png",
            "specs": {
                "Chip": "Exynos 2600"
            },
            "description": "Nhỏ gọn"
        },
        {
            "name": "Samsung Galaxy Z Fold7",
            "price": 41990000,
            "oldPrice": 46990000,
            "img": "../assets/img/SS4.png",
            "specs": {
                "Màn hình": "7.6 inch"
            },
            "description": "Gập cao cấp"
        },
        {
            "name": "Samsung Galaxy Z Flip7",
            "price": 23990000,
            "oldPrice": 28990000,
            "img": "../assets/img/SS5.png",
            "specs": {
                "Màn hình": "Gập"
            },
            "description": "Thời trang"
        },
        {
            "name": "Samsung Galaxy S24 Plus",
            "price": 16290000,
            "oldPrice": 18650000,
            "img": "../assets/img/SS6.png",
            "specs": {
                "RAM": "12GB"
            },
            "description": "Tầm trung"
        },
        {
            "name": "Samsung Galaxy S24 Ultra",
            "price": 25290000,
            "oldPrice": 29450000,
            "img": "../assets/img/SS7.png",
            "specs": {
                "Chip": "Snapdragon 8 Gen 3"
            },
            "description": "Titanium"
        },
        {
            "name": "Samsung Galaxy S25 Ultra 512GB",
            "price": 28810000,
            "oldPrice": 36810000,
            "img": "../assets/img/SS8.png",
            "specs": {
                "Bộ nhớ": "512GB"
            },
            "description": "Dung lượng lớn"
        }
    ],

    "Màn hình ASUS": [
        {"name": "ROG Strix XG32UQ", "price": 21990000, "oldPrice": 25990000, "img": "../assets/img/MH1.png", "specs": {"Hz": "160"}, "description": "4K"},
        {"name": "ROG Strix Hatsune", "price": 8990000, "oldPrice": 9990000, "img": "../assets/img/MH2.png", "specs": {"Hz": "260"}, "description": "Anime"},
        {"name": "ROG Swift 540Hz", "price": 31990000, "oldPrice": 39990000, "img": "../assets/img/MH3.png", "specs": {"Hz": "540"}, "description": "Siêu nhanh"}
    ],

    "Laptop DELL": [
        {"name": "Dell XPS 9350", "price": 54990000, "oldPrice": 59990000, "img": "../assets/img/DELL1.png", "specs": {"RAM": "32GB"}, "description": "Cao cấp"},
        {"name": "Dell Inspiron 5440", "price": 16990000, "oldPrice": 19990000, "img": "../assets/img/DELL2.png", "specs": {"RAM": "16GB"}, "description": "Văn phòng"},
        {"name": "Dell 15 i7", "price": 20990000, "oldPrice": 23490000, "img": "../assets/img/DELL3.png", "specs": {"CPU": "i7"}, "description": "Mạnh"}
    ],

    "Bàn Phím": [
        {"name": "VGN N75 Pro Blue Grey", "price": 1590000, "oldPrice": 1890000, "img": "../assets/img/BP1.png", "specs": {"Switch": "Akko"}, "description": "Wireless"},
        {"name": "VGN Orange Vaporware", "price": 5490000, "oldPrice": 5990000, "img": "../assets/img/BP2.png", "specs": {"Switch": "Razer"}, "description": "Gaming"},
        {"name": "VGN Orange Azure", "price": 3590000, "oldPrice": 3990000, "img": "../assets/img/BP3.png", "specs": {"Switch": "GX Brown"}, "description": "Esport"},
        {"name": "VGN Blue Grey Azure", "price": 2150000, "oldPrice": 2450000, "img": "../assets/img/BP4.png", "specs": {"Switch": "Keychron"}, "description": "Custom"}
    ],

    "SmartWatch": [
        {"name": "Amazfit T-Rex 3 Pro", "price": 6590000, "oldPrice": 7290000, "img": "../assets/img/SW1.png", "specs": {"Pin": "25 ngày"}, "description": "Outdoor"},
        {"name": "Huawei GT6 Pro HONMA", "price": 15500000, "oldPrice": 17000000, "img": "../assets/img/SW2.png", "specs": {"Golf": True}, "description": "Luxury"},
        {"name": "OPPO Watch S", "price": 3290000, "oldPrice": 3990000, "img": "../assets/img/SW3.png", "specs": {"Pin": "10 ngày"}, "description": "Trẻ"},
        {"name": "Coros Pace 4", "price": 6190000, "oldPrice": 6500000, "img": "../assets/img/SW4.png", "specs": {"Trọng lượng": "28g"}, "description": "Chạy bộ"}
    ],

    "RAM": [
        {"name": "G.Skill Royal Gold", "price": 3450000, "oldPrice": 3850000, "img": "../assets/img/RAM1.png", "specs": {"Bus": "3600"}, "description": "RGB"},
        {"name": "G.Skill Royal Silver", "price": 3350000, "oldPrice": 3750000, "img": "../assets/img/RAM2.png", "specs": {"Bus": "3600"}, "description": "Silver"},
        {"name": "Kingston Fury 32GB", "price": 2190000, "oldPrice": 2590000, "img": "../assets/img/RAM3.png", "specs": {"Dung lượng": "32GB"}, "description": "Gaming"},
        {"name": "Corsair Dominator DDR5", "price": 5890000, "oldPrice": 6200000, "img": "../assets/img/RAM4.png", "specs": {"Bus": "6000"}, "description": "DDR5"}
    ],

    "CPU": [
        {"name": "Ryzen 5 9600X", "price": 7990000, "oldPrice": 8500000, "img": "../assets/img/CPU1.png", "specs": {"Socket": "AM5"}, "description": "Zen5"},
        {"name": "Ryzen 5 8500G", "price": 4890000, "oldPrice": 5200000, "img": "../assets/img/CPU2.png", "specs": {"iGPU": "740M"}, "description": "APU"},
        {"name": "Ryzen 5 5600", "price": 3150000, "oldPrice": 3500000, "img": "../assets/img/CPU3.png", "specs": {"Socket": "AM4"}, "description": "Giá tốt"}
    ]
}
    for cat, items in full_data.items():
        for item in items:
            p = Product(name=item['name'], category=cat, price=item['price'], old_price=item['oldPrice'], img=item['img'], specs=json.dumps(item['specs']), description=item.get('description',''), created_at=datetime.now())
            db.session.add(p)
    db.session.commit()

with app.app_context():
    try:
        db.create_all()
        ensure_schema()
        seed_data()
        if not User.query.filter_by(username='admin').first():
            db.session.add(User(username='admin', password=bcrypt.generate_password_hash('admin123').decode('utf-8'), email='admin@nextech.com', role='admin'))
            db.session.commit()
    except OperationalError as e:
        uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        safe_uri = uri
        if isinstance(uri, str) and '://' in uri and '@' in uri:
            # Mask password: mysql+pymysql://user:pass@host/db -> mysql+pymysql://user:***@host/db
            try:
                prefix, rest = uri.split('://', 1)
                creds, tail = rest.split('@', 1)
                if ':' in creds:
                    user_part = creds.split(':', 1)[0]
                    safe_uri = f"{prefix}://{user_part}:***@{tail}"
            except Exception:
                safe_uri = '<unavailable>'

        msg = (
            "Không kết nối được database khi khởi động ứng dụng. "
            "Nguyên nhân thường gặp: sai user/password MySQL hoặc MySQL chưa chạy. "
            f"URI đang dùng: {safe_uri}. "
            "Hãy sửa thông tin trong backend/config.py (SQLALCHEMY_DATABASE_URI) hoặc đặt biến môi trường SQLALCHEMY_DATABASE_URI. "
            f"Chi tiết lỗi: {str(e.orig) if getattr(e, 'orig', None) else str(e)}"
        )

        # Nếu cần full traceback để debug, set SHOW_DB_TRACE=1
        if os.getenv('SHOW_DB_TRACE', '0').lower() in ('1', 'true', 'yes'):
            raise

        raise SystemExit(msg) from None

# --- API ROUTES ---

# --- FRONTEND (serve UI) ---
PAGES_DIR = os.path.join(BASE_DIR, 'pages')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
SCRIPTS_DIR = os.path.join(BASE_DIR, 'scripts')


@app.route('/', methods=['GET'])
def home():
    # Serve UI home page
    resp = send_from_directory(PAGES_DIR, 'index.html')
    return _no_cache(resp)


@app.route('/<path:filename>', methods=['GET'])
def serve_pages(filename):
    # Serve existing HTML pages at root, e.g. /login.html, /Laptop.html
    # Do not interfere with API routes (exact /api/... routes have higher priority).
    if filename.endswith('.html'):
        file_path = os.path.join(PAGES_DIR, filename)
        if os.path.isfile(file_path):
            resp = send_from_directory(PAGES_DIR, filename)
            return _no_cache(resp)
    abort(404)


@app.route('/pages/<path:filename>', methods=['GET'])
def serve_pages_compat(filename):
    # Compatibility: many HTML files link to ../pages/<file>.html
    # Serve them from the same pages/ folder to keep everything on the Flask origin.
    if filename.endswith('.html'):
        file_path = os.path.join(PAGES_DIR, filename)
        if os.path.isfile(file_path):
            resp = send_from_directory(PAGES_DIR, filename)
            return _no_cache(resp)
    abort(404)


@app.route('/assets/<path:filename>', methods=['GET'])
def serve_assets(filename):
    resp = send_from_directory(ASSETS_DIR, filename)
    # During development, CSS changes are often cached aggressively.
    if filename.lower().endswith('.css'):
        return _no_cache(resp)
    return resp


@app.route('/scripts/<path:filename>', methods=['GET'])
def serve_scripts(filename):
    resp = send_from_directory(SCRIPTS_DIR, filename)
    # JS must not be cached in dev; otherwise users keep running stale logic.
    if filename.lower().endswith('.js'):
        return _no_cache(resp)
    return resp


def _no_cache(resp):
    """Disable caching for dev-served UI assets (HTML/JS/CSS)."""
    try:
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    except Exception:
        pass
    return resp


@app.route('/api/health', methods=['GET'])
def health():
    payload = {"status": "ok"}
    if app.config.get('DEBUG'):
        try:
            payload["app_file"] = __file__
        except Exception:
            pass
        try:
            payload["has_email_debug_route"] = any(
                getattr(r, 'rule', None) == '/api/debug/email-config'
                for r in app.url_map.iter_rules()
            )
        except Exception:
            pass
    return jsonify(payload), 200


@app.route('/api/debug/email-config', methods=['GET'])
def debug_email_config():
    """Debug-only endpoint: inspect effective email configuration.

    Does not return secrets.
    Enabled when Flask debug is on OR when ENABLE_DEBUG_ROUTES=1.
    """
    if not app.config.get('DEBUG') and os.getenv('ENABLE_DEBUG_ROUTES', '0').lower() not in ('1', 'true', 'yes'):
        return jsonify({"msg": "Not Found"}), 404

    email_mode = (os.getenv('EMAIL_MODE') or '').strip().lower() or None
    smtp_host = (os.getenv('SMTP_HOST') or '').strip()
    smtp_user = (os.getenv('SMTP_USER') or '').strip()
    smtp_pass_set = bool(os.getenv('SMTP_PASS'))
    smtp_from = (os.getenv('SMTP_FROM') or smtp_user or '').strip()

    smtp_ssl = (os.getenv('SMTP_SSL', 'false').lower() in ('1', 'true', 'yes'))
    smtp_tls = (os.getenv('SMTP_TLS', 'true').lower() in ('1', 'true', 'yes'))

    if smtp_ssl:
        default_port = 465
    elif smtp_tls:
        default_port = 587
    else:
        default_port = 25

    try:
        smtp_port = int(os.getenv('SMTP_PORT', str(default_port)))
    except Exception:
        smtp_port = default_port

    try:
        smtp_timeout = int(os.getenv('SMTP_TIMEOUT', '10'))
    except Exception:
        smtp_timeout = 10

    missing = []
    if not smtp_host:
        missing.append('SMTP_HOST')
    if not smtp_user:
        missing.append('SMTP_USER')
    if not smtp_pass_set:
        missing.append('SMTP_PASS')
    if not smtp_from:
        missing.append('SMTP_FROM')

    return jsonify({
        "email_mode": email_mode,
        "smtp": {
            "host_set": bool(smtp_host),
            "user_set": bool(smtp_user),
            "pass_set": smtp_pass_set,
            "from_set": bool(smtp_from),
            "port": smtp_port,
            "tls": smtp_tls,
            "ssl": smtp_ssl,
            "timeout": smtp_timeout,
            "missing": missing,
        },
    }), 200


@app.route('/api/debug/routes', methods=['GET'])
def debug_routes():
    """Debug-only endpoint: list current Flask routes.

    Enabled when Flask debug is on OR when ENABLE_DEBUG_ROUTES=1.
    """
    if not app.config.get('DEBUG') and os.getenv('ENABLE_DEBUG_ROUTES', '0').lower() not in ('1', 'true', 'yes'):
        return jsonify({"msg": "Not Found"}), 404

    try:
        rules = sorted({getattr(r, 'rule', '') for r in app.url_map.iter_rules() if getattr(r, 'rule', None)})
    except Exception as e:
        return jsonify({"msg": "Không thể liệt kê routes", "error": str(e)}), 500

    return jsonify({"count": len(rules), "routes": rules}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    required_role = data.get('required_role') # 'admin' hoặc 'user' từ Frontend gửi lên

    user = User.query.filter_by(username=username).first()

    # KIỂM TRA CHẶT CHẼ: 
    # 1. User phải tồn tại
    # 2. Mật khẩu phải đúng
    # 3. Role trong Database phải khớp với Role mà form đăng nhập yêu cầu
    if user and bcrypt.check_password_hash(user.password, password) and user.role == required_role:
        if user.is_locked:
            return jsonify({"msg": "Tài khoản của bạn hiện đang bị khóa!"}), 403
            
        token = create_access_token(identity=user.username, additional_claims={"role": user.role})
        return jsonify({
            "access_token": token, 
            "role": user.role, 
            "username": user.username
        }), 200
    
    # Nếu sai user, sai pass HOẶC sai chỗ đăng nhập (đúng pass nhưng sai role) 
    # thì đều báo chung một lỗi để bảo mật.
    return jsonify({"msg": "Sai tài khoản hoặc mật khẩu!"}), 401

@app.route('/api/public/products', methods=['GET'])
def get_public_products():
    prods = Product.query.all()
    res = {}
    for p in prods:
        if p.category not in res: res[p.category] = []
        res[p.category].append({
            "id": p.id, "name": p.name, "price": p.price, "oldPrice": p.old_price, 
            "img": p.img, "specs": json.loads(p.specs), "description": p.description,
            "rating": p.rating, "review_count": p.review_count
        })
    return jsonify(res)


@app.route('/api/public/locations', methods=['GET'])
def get_public_locations():
    """Proxy locations API to avoid browser CORS issues.

    Source: https://provinces.open-api.vn
    """
    depth_raw = request.args.get('depth', '3')
    try:
        depth = int(depth_raw)
    except Exception:
        depth = 3
    depth = max(1, min(depth, 3))

    upstream_url = f"https://provinces.open-api.vn/api/?depth={depth}"
    try:
        req = urllib.request.Request(
            upstream_url,
            headers={
                'User-Agent': 'NexTech/1.0',
                'Accept': 'application/json',
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read()

        # Return JSON as-is (faster than json.loads + jsonify for large payload)
        response = app.response_class(body, status=200, mimetype='application/json')
        response.headers['Cache-Control'] = 'public, max-age=86400'
        return response
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as e:
        return jsonify({
            "msg": "Không thể tải locations",
            "upstream": "provinces.open-api.vn",
            "detail": str(e),
        }), 502
    except Exception as e:
        return jsonify({
            "msg": "Không thể tải locations",
            "upstream": "provinces.open-api.vn",
        }), 502

@app.route('/api/reviews/add', methods=['POST'])
@jwt_required()
def add_review():
    data = request.get_json()
    current_user = get_jwt_identity() # SỬA LỖI: Đã import ở trên cùng
    
    # 1. Lưu review mới
    new_review = Review(
        product_id=data['product_id'],
        username=current_user,
        rating=data['rating'],
        content=data['content']
    )
    db.session.add(new_review)
    
    # 2. Cập nhật rating trung bình vào bảng Product
    product = db.session.get(Product, data['product_id'])
    # Lấy tất cả review (bao gồm cả cái vừa add)
    db.session.flush() # Đẩy review mới vào session nhưng chưa commit để tính toán
    all_reviews = Review.query.filter_by(product_id=product.id).all()
    
    total_stars = sum([r.rating for r in all_reviews])
    count = len(all_reviews)
    
    product.rating = round(total_stars / count, 1)
    product.review_count = count
    
    db.session.commit()
    return jsonify({"msg": "Đã gửi đánh giá!"}), 201

@app.route('/api/reviews/<int:pid>', methods=['GET'])
def get_reviews(pid):
    revs = Review.query.filter_by(product_id=pid).order_by(Review.created_at.desc()).all()
    return jsonify([{
        "username": r.username, 
        "rating": r.rating, 
        "content": r.content, 
        "date": r.created_at.strftime("%d/%m/%Y")
    } for r in revs])
# --- PROFILE ROUTES ---
@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    return jsonify({
        "username": user.username,
        "email": user.email,
        "phone": user.phone,
        "address": user.address or ""
    })

@app.route('/api/profile/update', methods=['PUT'])
@jwt_required()
def update_profile():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    data = request.get_json()
    
    # 1. Cập nhật thông tin cơ bản
    user.phone = data.get('phone')
    user.address = data.get('address')
    
    # 2. Xử lý đổi mật khẩu (nếu người dùng có nhập mật khẩu mới)
    new_pwd = data.get('new_password')
    old_pwd = data.get('old_password')
    
    if new_pwd:
        # Kiểm tra mật khẩu hiện tại
        if not old_pwd or not bcrypt.check_password_hash(user.password, old_pwd):
            return jsonify({"msg": "Mật khẩu hiện tại không chính xác!"}), 400
        
        # Mã hóa và lưu mật khẩu mới
        user.password = bcrypt.generate_password_hash(new_pwd).decode('utf-8')
        
    db.session.commit()
    return jsonify({"msg": "Cập nhật thông tin thành công!"}), 200


# --- BE2: CART / ORDERS / PAYMENT ROUTES ---

# CART
@app.route('/api/cart', methods=['GET'])
@jwt_required()
def get_cart():
    user, err = _get_current_user_entity()
    if err:
        return err

    items = CartItem.query.filter_by(user_id=user.id).order_by(CartItem.created_at.desc()).all()
    res = []
    for it in items:
        p = db.session.get(Product, it.product_id)
        if not p:
            continue
        res.append({
            "id": it.id,
            "product_id": p.id,
            "name": p.name,
            "img": p.img,
            "price": p.price,
            "quantity": it.quantity,
            "stock": p.stock,
            "subtotal": int(p.price) * int(it.quantity)
        })
    return jsonify(res), 200


@app.route('/api/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    user, err = _get_current_user_entity()
    if err:
        return err

    data = request.get_json() or {}
    try:
        product_id = int(data.get('product_id', 0))
        quantity = int(data.get('quantity', 1))
    except Exception:
        return jsonify({"msg": "Dữ liệu không hợp lệ"}), 400

    if product_id <= 0 or quantity <= 0:
        return jsonify({"msg": "product_id/quantity không hợp lệ"}), 400

    p = db.session.get(Product, product_id)
    if not p:
        return jsonify({"msg": "Sản phẩm không tồn tại"}), 404

    item = CartItem.query.filter_by(user_id=user.id, product_id=product_id).first()
    if item:
        item.quantity = int(item.quantity) + quantity
    else:
        item = CartItem(user_id=user.id, product_id=product_id, quantity=quantity)
        db.session.add(item)

    db.session.commit()
    return jsonify({"msg": "OK", "cart_item_id": item.id}), 201


@app.route('/api/cart/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    user, err = _get_current_user_entity()
    if err:
        return err

    data = request.get_json() or {}
    try:
        quantity = int(data.get('quantity', 0))
    except Exception:
        return jsonify({"msg": "Dữ liệu không hợp lệ"}), 400

    if quantity < 1:
        return jsonify({"msg": "quantity phải >= 1"}), 400

    item = CartItem.query.filter_by(id=item_id, user_id=user.id).first()
    if not item:
        return jsonify({"msg": "Cart item không tồn tại"}), 404

    item.quantity = quantity
    db.session.commit()
    return jsonify({"msg": "OK"}), 200


@app.route('/api/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_cart_item(item_id):
    user, err = _get_current_user_entity()
    if err:
        return err

    item = CartItem.query.filter_by(id=item_id, user_id=user.id).first()
    if not item:
        return jsonify({"msg": "Cart item không tồn tại"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"msg": "OK"}), 200


# ORDERS
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    user, err = _get_current_user_entity()
    if err:
        return err

    data = request.get_json() or {}
    customer = data.get('customer') or {}
    items = data.get('items')
    used_cart = False

    if not items:
        used_cart = True
        cart_items = CartItem.query.filter_by(user_id=user.id).all()
        if not cart_items:
            return jsonify({"msg": "Giỏ hàng trống"}), 400
        items = [{"product_id": ci.product_id, "quantity": ci.quantity} for ci in cart_items]

    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"msg": "items không hợp lệ"}), 400

    qty_map = {}
    try:
        for it in items:
            pid = int(it.get('product_id', 0))
            qty = int(it.get('quantity', 0))
            if pid <= 0 or qty <= 0:
                return jsonify({"msg": "product_id/quantity không hợp lệ"}), 400
            qty_map[pid] = qty_map.get(pid, 0) + qty
    except Exception:
        return jsonify({"msg": "Dữ liệu items không hợp lệ"}), 400

    customer_name = (customer.get('name') or user.username or '').strip()
    customer_phone = (customer.get('phone') or user.phone or '').strip()
    customer_address = (customer.get('address') or user.address or '').strip()
    # Email: chỉ gửi xác nhận khi khách nhập email rõ ràng
    customer_email = (customer.get('email') or '').strip()

    if not customer_name or not customer_phone or not customer_address:
        return jsonify({"msg": "Thiếu thông tin khách hàng (name/phone/address)!"}), 400

    if customer_email and not _is_valid_email(customer_email):
        return jsonify({"msg": "Định dạng Email không hợp lệ!"}), 400

    payment_method = (data.get('payment_method') or data.get('provider') or 'cod')
    payment_method = str(payment_method or '').strip().lower()
    if payment_method not in ('cod', 'momo'):
        payment_method = 'cod'

    idem_key = ((data.get('idempotency_key') if isinstance(data, dict) else None) or request.headers.get('Idempotency-Key') or '').strip()
    idem_hash = None
    if idem_key:
        idem_hash = _compute_order_request_hash(
            customer_name,
            customer_phone,
            customer_address,
            customer_email,
            qty_map,
            payment_method,
        )

    order_code = None
    total_amount = 0

    try:
        idem_row = None
        if idem_key:
            idem_row = OrderIdempotency(
                user_id=user.id,
                key=idem_key,
                request_hash=idem_hash,
                order_id=None,
                created_at=datetime.now(),
            )
            db.session.add(idem_row)
            try:
                db.session.flush()
            except IntegrityError:
                db.session.rollback()

                existing = OrderIdempotency.query.filter_by(user_id=user.id, key=idem_key).first()
                if not existing:
                    return jsonify({"msg": "Đơn hàng đang được tạo, vui lòng thử lại"}), 409

                if existing.request_hash != idem_hash:
                    return jsonify({"msg": "Idempotency-Key đã được dùng cho yêu cầu khác"}), 409

                if existing.order_id:
                    old_order = Order.query.filter_by(id=existing.order_id, user_id=user.id).first()
                    if not old_order:
                        return jsonify({"msg": "Đơn hàng không tồn tại"}), 404

                    return jsonify({
                        "msg": "Tạo đơn hàng thành công!",
                        "order_code": old_order.order_code,
                        "total_amount": old_order.total_amount,
                        "status": old_order.status,
                        "email_sent": False,
                        "email_error": None,
                        "idempotent": True,
                    }), 200

                return jsonify({"msg": "Đơn hàng đang được tạo, vui lòng chờ...", "idempotent": True}), 409

        products = (
            Product.query
            .filter(Product.id.in_(list(qty_map.keys())))
            .with_for_update()
            .all()
        )
        prod_map = {p.id: p for p in products}

        for pid in qty_map.keys():
            if pid not in prod_map:
                raise ValueError('missing_product')

        # Check & deduct stock + compute total
        for pid, qty in qty_map.items():
            p = prod_map[pid]
            if p.stock is not None and int(p.stock) < int(qty):
                raise RuntimeError(f'out_of_stock:{pid}')

        for pid, qty in qty_map.items():
            p = prod_map[pid]
            total_amount += int(p.price) * int(qty)
            if p.stock is not None:
                p.stock = int(p.stock) - int(qty)

        # Generate unique order_code
        for _ in range(10):
            candidate = _generate_order_code()
            if not Order.query.filter_by(order_code=candidate).first():
                order_code = candidate
                break
        if not order_code:
            order_code = f"ORD{uuid.uuid4().hex[:12].upper()}"

        order = Order(
            order_code=order_code,
            user_id=user.id,
            status='processing',
            total_amount=total_amount,
            payment_method=payment_method,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_address=customer_address,
            customer_email=customer_email or None,
            created_at=datetime.now()
        )
        db.session.add(order)
        db.session.flush()

        if idem_row:
            idem_row.order_id = order.id

        for pid, qty in qty_map.items():
            p = prod_map[pid]
            db.session.add(OrderItem(
                order_id=order.id,
                product_id=p.id,
                product_name=p.name,
                price=p.price,
                quantity=int(qty)
            ))

        if used_cart and data.get('clear_cart', True):
            CartItem.query.filter_by(user_id=user.id).delete()

        db.session.commit()

        email_sent = False
        email_error = None
        if customer_email:
            subject = f"NexTech - Xác nhận đơn hàng {order_code}"
            created_at_text = order.created_at.strftime('%d/%m/%Y %H:%M:%S') if order.created_at else ''

            lines = []
            lines.append(f"Xin chào {customer_name},")
            lines.append("")
            lines.append(f"Đơn hàng {order_code} đã được tạo thành công.")
            if created_at_text:
                lines.append(f"Thời gian: {created_at_text}")
            lines.append("")
            lines.append("Thông tin giao hàng:")
            lines.append(f"- Họ tên: {customer_name}")
            lines.append(f"- SĐT: {customer_phone}")
            lines.append(f"- Địa chỉ: {customer_address}")
            lines.append(f"- Email: {customer_email}")
            lines.append("")
            lines.append("Chi tiết đơn hàng:")

            # Use deterministic ordering (by product_id) for email readability
            item_rows = []
            try:
                for pid in sorted(qty_map.keys()):
                    qty = int(qty_map.get(pid) or 0)
                    p = prod_map.get(pid)
                    if not p:
                        continue
                    unit_price = int(p.price)
                    subtotal = unit_price * qty
                    item_rows.append((p.name, qty, unit_price, subtotal))
            except Exception:
                item_rows = []

            for idx, (name, qty, unit_price, subtotal) in enumerate(item_rows, start=1):
                lines.append(
                    f"{idx}. {name} x{qty} | Đơn giá: {unit_price:,} VND | Thành tiền: {subtotal:,} VND"
                )

            lines.append("")
            lines.append(f"Tổng tiền: {total_amount:,} VND")
            lines.append("Trạng thái: processing")
            lines.append("")
            lines.append("Cảm ơn bạn đã mua hàng tại NexTech!")
            lines.append("Bạn có thể tra cứu đơn hàng trong mục 'Tra cứu đơn hàng' trên website.")

            body = "\n".join(lines)
            email_sent, email_error = _send_email_if_configured(customer_email, subject, body)

        return jsonify({
            "msg": "Tạo đơn hàng thành công!",
            "order_code": order_code,
            "total_amount": total_amount,
            "status": "processing",
            "email_sent": email_sent,
            "email_error": email_error
        }), 201

    except ValueError:
        db.session.rollback()
        return jsonify({"msg": "Sản phẩm không tồn tại"}), 404
    except RuntimeError as e:
        db.session.rollback()
        msg = str(e)
        if msg.startswith('out_of_stock:'):
            try:
                pid = int(msg.split(':', 1)[1])
            except Exception:
                pid = None
            return jsonify({"msg": "Sản phẩm không đủ tồn kho!", "product_id": pid}), 409
        return jsonify({"msg": "Lỗi xử lý đơn hàng"}), 400
    except Exception as e:
        db.session.rollback()
        try:
            app.logger.exception("BE2 create_order failed")
        except Exception:
            pass
        return jsonify({"msg": "Lỗi hệ thống: " + str(e)}), 500


@app.route('/api/orders/me', methods=['GET'])
@jwt_required()
def list_my_orders():
    user, err = _get_current_user_entity()
    if err:
        return err

    orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    return jsonify([{
        "order_code": o.order_code,
        "status": o.status,
        "total_amount": o.total_amount,
        "created_at": o.created_at.strftime('%d/%m/%Y %H:%M:%S') if o.created_at else None
    } for o in orders]), 200


@app.route('/api/orders/<string:order_code>', methods=['GET'])
@jwt_required()
def get_order_detail(order_code):
    user, err = _get_current_user_entity()
    if err:
        return err

    order = Order.query.filter_by(order_code=order_code, user_id=user.id).first()
    if not order:
        return jsonify({"msg": "Đơn hàng không tồn tại"}), 404

    items = OrderItem.query.filter_by(order_id=order.id).all()

    product_ids = sorted({int(i.product_id) for i in items if i.product_id is not None})
    prod_map = {}
    if product_ids:
        prods = Product.query.filter(Product.id.in_(product_ids)).all()
        prod_map = {int(p.id): p for p in prods}

    payments = Payment.query.filter_by(order_id=order.id).order_by(Payment.created_at.asc()).all()
    initial_payment = payments[0] if payments else None
    last_payment = payments[-1] if payments else None

    def _fmt_dt(dt):
        return dt.strftime('%d/%m/%Y %H:%M:%S') if dt else None

    def _payment_payload(p: Payment):
        if not p:
            return None
        provider = p.provider
        if provider in ('bank', 'napas', 'atm'):
            provider = 'momo'
        return {
            "provider": provider,
            "status": p.status,
            "payment_ref": p.payment_ref,
            "amount": p.amount,
            "created_at": _fmt_dt(p.created_at),
            "updated_at": _fmt_dt(p.updated_at),
        }

    def _initial_payment_from_order(method: str):
        m = str(method or '').strip().lower()
        if not m:
            return None
        if m in ('bank', 'napas', 'atm'):
            m = 'momo'
        if m not in ('cod', 'momo'):
            return None

        # Status hints for UI when there is no Payment row yet.
        if m == 'cod':
            # Chờ thanh toán (COD: thanh toán khi nhận hàng)
            status = 'pending'
        else:
            # Mô phỏng đã thanh toán ngay khi đặt hàng cho momo
            status = 'success'

        return {
            "provider": m,
            "status": status,
            "payment_ref": None,
            "amount": order.total_amount,
            "created_at": _fmt_dt(order.created_at),
            "updated_at": None,
        }

    payment_method = (order.payment_method or '').strip().lower() if hasattr(order, 'payment_method') else ''
    if payment_method in ('bank', 'napas', 'atm'):
        payment_method = 'momo'
    derived_initial = _initial_payment_from_order(payment_method) if not payments else None

    return jsonify({
        "order_code": order.order_code,
        "status": order.status,
        "total_amount": order.total_amount,
        "payment_method": payment_method or None,
        "customer": {
            "name": order.customer_name,
            "phone": order.customer_phone,
            "address": order.customer_address,
            "email": order.customer_email
        },
        "created_at": order.created_at.strftime('%d/%m/%Y %H:%M:%S') if order.created_at else None,
        "items": [{
            "product_id": i.product_id,
            "name": i.product_name,
            "img": (prod_map.get(int(i.product_id)).img if (i.product_id is not None and prod_map.get(int(i.product_id))) else None),
            "price": i.price,
            "quantity": i.quantity,
            "subtotal": int(i.price) * int(i.quantity)
        } for i in items],
        # Backward compatible: keep `payment` as the latest payment (if any)
        "payment": _payment_payload(last_payment),
        # New: expose initial + latest payment attempts (if any)
        "payment_initial": _payment_payload(initial_payment) or derived_initial,
        "payment_latest": _payment_payload(last_payment),
        "payments_count": len(payments),
    }), 200


@app.route('/api/orders/<string:order_code>/cancel', methods=['PUT'])
@jwt_required()
def cancel_my_order(order_code):
    user, err = _get_current_user_entity()
    if err:
        return err

    email_to = None
    customer_name = None
    customer_phone = None
    customer_address = None
    cancelled_at = None
    total_amount = None
    already_cancelled = False
    item_lines = []

    try:
        with _session_begin():
            order = (
                Order.query
                .filter_by(order_code=order_code, user_id=user.id)
                .with_for_update()
                .first()
            )
            if not order:
                return jsonify({"msg": "Đơn hàng không tồn tại"}), 404

            try:
                items = OrderItem.query.filter_by(order_id=order.id).all()
                item_lines = []
                for i in (items or []):
                    if not i or not i.product_name:
                        continue
                    try:
                        qty = int(i.quantity or 0)
                    except Exception:
                        qty = 0
                    try:
                        unit = int(i.price or 0)
                    except Exception:
                        unit = 0
                    sub = unit * max(qty, 0)
                    item_lines.append(f"- {i.product_name} x{qty} • {unit:,} VND • {sub:,} VND")
            except Exception:
                item_lines = []

            current = (order.status or '').lower()
            if current == 'cancelled':
                already_cancelled = True
            elif current != 'processing':
                return jsonify({"msg": "Chỉ có thể hủy đơn khi đang xử lý (processing)"}), 400

            if not already_cancelled:
                Payment.query.filter_by(order_id=order.id, status='pending').update({"status": "failed"})
                order.status = 'cancelled'
                _restock_order_items(order.id)

            email_to = order.customer_email
            customer_name = order.customer_name
            customer_phone = order.customer_phone
            customer_address = order.customer_address
            cancelled_at = datetime.now()
            total_amount = order.total_amount

        email_sent = False
        email_error = None
        if email_to:
            subject = f"NexTech - Đơn hàng {order_code} đã bị hủy"
            time_text = cancelled_at.strftime('%d/%m/%Y %H:%M:%S') if cancelled_at else ''
            lines = []
            lines.append(f"Xin chào {customer_name},")
            lines.append("")
            lines.append(f"Đơn hàng {order_code} đã được hủy.")
            if time_text:
                lines.append(f"Thời gian hủy: {time_text}")
            lines.append("")
            lines.append("Thông tin đơn hàng:")
            lines.append(f"- Mã đơn: {order_code}")
            if total_amount is not None:
                lines.append(f"- Tổng tiền: {int(total_amount):,} VND")
            if item_lines:
                lines.append("- Sản phẩm:")
                lines.extend(item_lines)
            lines.append("")
            lines.append("Thông tin giao hàng:")
            lines.append(f"- Họ tên: {customer_name}")
            lines.append(f"- SĐT: {customer_phone}")
            lines.append(f"- Địa chỉ: {customer_address}")
            lines.append("")
            lines.append("Nếu bạn cần hỗ trợ, vui lòng liên hệ NexTech.")
            body = "\n".join(lines)
            email_sent, email_error = _send_email_if_configured(email_to, subject, body)

        return jsonify({
            "msg": "OK",
            "order_code": order_code,
            "status": "cancelled",
            "email_sent": email_sent,
            "email_error": email_error,
            "already_cancelled": already_cancelled,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Lỗi hệ thống: " + str(e)}), 500


# PAYMENT (Mock)
@app.route('/api/payment/create', methods=['POST'])
@jwt_required()
def create_payment():
    user, err = _get_current_user_entity()
    if err:
        return err

    data = request.get_json() or {}
    order_code = (data.get('order_code') or '').strip()
    provider = (data.get('provider') or 'mock').strip().lower()
    if provider not in ('momo', 'zalopay', 'mock'):
        provider = 'mock'

    if not order_code:
        return jsonify({"msg": "Thiếu order_code"}), 400

    order = Order.query.filter_by(order_code=order_code, user_id=user.id).first()
    if not order:
        return jsonify({"msg": "Đơn hàng không tồn tại"}), 404

    if order.status in ('shipping', 'completed'):
        return jsonify({"msg": "Đơn hàng đã thanh toán"}), 400

    if order.status == 'cancelled':
        return jsonify({"msg": "Đơn hàng đã bị hủy"}), 400

    pending = Payment.query.filter_by(order_id=order.id, status='pending').order_by(Payment.created_at.desc()).first()
    if pending:
        return jsonify({
            "msg": "OK",
            "payment_id": pending.id,
            "payment_ref": pending.payment_ref,
            "provider": pending.provider,
            "amount": pending.amount,
            "status": pending.status,
            "redirect_url": f"/mock-payment?ref={pending.payment_ref}"
        }), 200

    payment_ref = uuid.uuid4().hex
    pay = Payment(order_id=order.id, provider=provider, amount=order.total_amount, status='pending', payment_ref=payment_ref)
    db.session.add(pay)
    db.session.commit()

    return jsonify({
        "msg": "OK",
        "payment_id": pay.id,
        "payment_ref": pay.payment_ref,
        "provider": pay.provider,
        "amount": pay.amount,
        "status": pay.status,
        "redirect_url": f"/mock-payment?ref={pay.payment_ref}"
    }), 201


@app.route('/api/payment/confirm', methods=['POST'])
@jwt_required()
def confirm_payment():
    user, err = _get_current_user_entity()
    if err:
        return err

    data = request.get_json() or {}
    payment_ref = (data.get('payment_ref') or '').strip()
    result = (data.get('result') or 'success').strip().lower()
    if result not in ('success', 'failed'):
        result = 'failed'

    if not payment_ref:
        return jsonify({"msg": "Thiếu payment_ref"}), 400

    try:
        with _session_begin():
            pay = Payment.query.filter_by(payment_ref=payment_ref).with_for_update().first()
            if not pay:
                return jsonify({"msg": "Payment không tồn tại"}), 404

            order = Order.query.filter_by(id=pay.order_id).with_for_update().first()
            if not order or order.user_id != user.id:
                return jsonify({"msg": "Không có quyền thao tác"}), 403

            if pay.status != 'pending':
                return jsonify({"msg": "Payment đã được xử lý", "status": pay.status}), 200

            prev_status = order.status

            if result == 'success':
                pay.status = 'success'
                # COD/mock payment success -> chuyển sang shipping
                if order.status == 'processing':
                    order.status = 'shipping'
            else:
                pay.status = 'failed'
                # Payment fail -> cancel + restock (vì stock đã bị trừ khi create_order)
                if order.status not in ('completed', 'cancelled'):
                    order.status = 'cancelled'
                    if prev_status != 'cancelled':
                        _restock_order_items(order.id)

        return jsonify({"msg": "OK", "order_status": order.status, "payment_status": pay.status}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Lỗi hệ thống: " + str(e)}), 500


# --- ADMIN ROUTES ---
# Route xóa người dùng (Thêm mới để fix lỗi 404)
@app.route('/admin/users/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_user(id):
    admin, err = _require_admin()
    if err:
        return err
    u = db.session.get(User, id)
    if not u:
        return jsonify({"msg": "Người dùng không tồn tại"}), 404
    if u.role == 'admin':
        return jsonify({"msg": "Không thể xóa tài khoản Admin"}), 400
        
    db.session.delete(u)
    db.session.commit()
    return jsonify({"msg": "OK"}), 200
@app.route('/admin/products/add', methods=['POST'])
@jwt_required()
def add_product():
    admin, err = _require_admin()
    if err:
        return err
    data = request.get_json()
    db.session.add(Product(name=data['name'], category=data['category'], price=data['price'], old_price=data.get('old_price', 0), img=data['img'], specs=json.dumps(data['specs']), description=data.get('description', ''), created_at=datetime.now()))
    db.session.commit()
    return jsonify({"msg": "OK"})

@app.route('/admin/products/update/<int:id>', methods=['PUT'])
@jwt_required()
def update_product(id):
    admin, err = _require_admin()
    if err:
        return err
    p = db.session.get(Product, id)
    data = request.get_json()
    p.name=data['name']; p.category=data['category']; p.price=data['price']; p.old_price=data.get('old_price', 0); p.img=data['img']; p.specs=json.dumps(data['specs']); p.description=data.get('description', '')
    db.session.commit()
    return jsonify({"msg": "OK"})

@app.route('/admin/products/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_product(id):
    admin, err = _require_admin()
    if err:
        return err
    # 1. Tìm sản phẩm
    p = db.session.get(Product, id)
    if not p:
        return jsonify({"msg": "Sản phẩm không tồn tại"}), 404
        
    try:
        # 2. Xóa tất cả bình luận liên quan đến sản phẩm này trước
        Review.query.filter_by(product_id=id).delete()
        
        # 3. Sau đó mới xóa sản phẩm
        db.session.delete(p)
        
        # 4. Lưu thay đổi vào Database
        db.session.commit()
        return jsonify({"msg": "Đã xóa sản phẩm và các bình luận liên quan!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Lỗi hệ thống: " + str(e)}), 500
@app.route('/admin/users', methods=['GET'])
@jwt_required()
def list_users():
    admin, err = _require_admin()
    if err:
        return err
    users = User.query.all()
    return jsonify([{"id":u.id, "username":u.username, "phone":u.phone, "email":u.email, "role":u.role, "is_locked":u.is_locked} for u in users])

@app.route('/admin/users/toggle-lock/<int:id>', methods=['PUT'])
@jwt_required()
def toggle_lock(id):
    admin, err = _require_admin()
    if err:
        return err
    u = db.session.get(User, id)
    if u and u.role != 'admin':
        u.is_locked = not u.is_locked
        db.session.commit()
        return jsonify({"msg": "OK"})
    return jsonify({"msg": "Lỗi"}), 400

@app.route('/admin/upload', methods=['POST'])
@jwt_required()
def upload_file():
    admin, err = _require_admin()
    if err:
        return err
    if 'file' not in request.files: return jsonify({"msg": "No file"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    return jsonify({"url": f"../assets/img/{filename}"}), 200

@app.route('/api/public/banners', methods=['GET'])
def get_banners():
    banners = Banner.query.all()
    return jsonify([{"id": b.id, "img": b.img, "position": b.position} for b in banners])

@app.route('/admin/banners/add', methods=['POST'])
@jwt_required()
def add_banner():
    admin, err = _require_admin()
    if err:
        return err
    data = request.get_json()
    db.session.add(Banner(img=data['img'], position=data['position']))
    db.session.commit()
    return jsonify({"msg": "OK"})

@app.route('/admin/banners/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_banner(id):
    admin, err = _require_admin()
    if err:
        return err
    b = db.session.get(Banner, id); db.session.delete(b); db.session.commit()
    return jsonify({"msg": "OK"})


# --- ADMIN: ORDER MANAGEMENT ---
@app.route('/admin/orders', methods=['GET'])
@jwt_required()
def admin_list_orders():
    admin, err = _require_admin()
    if err:
        return err

    try:
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
    except Exception:
        limit, offset = 100, 0

    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    orders = (
        Order.query
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return jsonify([{
        "order_code": o.order_code,
        "status": o.status,
        "total_amount": o.total_amount,
        "customer_name": o.customer_name,
        "customer_phone": o.customer_phone,
        "created_at": o.created_at.strftime('%d/%m/%Y %H:%M:%S') if o.created_at else None
    } for o in orders]), 200


@app.route('/admin/orders/<string:order_code>', methods=['GET'])
@jwt_required()
def admin_get_order_detail(order_code):
    admin, err = _require_admin()
    if err:
        return err

    order = Order.query.filter_by(order_code=order_code).first()
    if not order:
        return jsonify({"msg": "Đơn hàng không tồn tại"}), 404

    items = OrderItem.query.filter_by(order_id=order.id).all()
    last_payment = Payment.query.filter_by(order_id=order.id).order_by(Payment.created_at.desc()).first()

    return jsonify({
        "order_code": order.order_code,
        "status": order.status,
        "total_amount": order.total_amount,
        "customer": {
            "name": order.customer_name,
            "phone": order.customer_phone,
            "address": order.customer_address,
            "email": order.customer_email
        },
        "created_at": order.created_at.strftime('%d/%m/%Y %H:%M:%S') if order.created_at else None,
        "items": [{
            "product_id": i.product_id,
            "name": i.product_name,
            "price": i.price,
            "quantity": i.quantity,
            "subtotal": int(i.price) * int(i.quantity)
        } for i in items],
        "payment": None if not last_payment else {
            "provider": last_payment.provider,
            "status": last_payment.status,
            "payment_ref": last_payment.payment_ref,
            "amount": last_payment.amount
        }
    }), 200


@app.route('/admin/orders/<string:order_code>/status', methods=['PUT'])
@jwt_required()
def admin_update_order_status(order_code):
    admin, err = _require_admin()
    if err:
        return err

    data = request.get_json() or {}
    new_status = (data.get('status') or '').strip().lower()
    allowed = {'processing', 'shipping', 'completed', 'cancelled'}
    if new_status not in allowed:
        return jsonify({"msg": "status không hợp lệ"}), 400

    email_to = None
    customer_name = None
    customer_phone = None
    customer_address = None
    total_amount = None
    should_send_cancel_email = False
    item_lines = []

    try:
        with _session_begin():
            order = Order.query.filter_by(order_code=order_code).with_for_update().first()
            if not order:
                return jsonify({"msg": "Đơn hàng không tồn tại"}), 404

            current = (order.status or '').lower()
            if current == 'completed' and new_status != 'completed':
                return jsonify({"msg": "Không thể đổi trạng thái từ completed"}), 400

            # Basic transition rules
            if new_status == 'processing' and current != 'processing':
                return jsonify({"msg": "Không thể chuyển về processing"}), 400
            if new_status == 'shipping' and current not in ('processing', 'shipping'):
                return jsonify({"msg": "Chỉ có thể chuyển sang shipping từ processing"}), 400
            if new_status == 'completed' and current not in ('shipping', 'completed'):
                return jsonify({"msg": "Chỉ có thể completed khi đang shipping"}), 400

            prev_status = current
            if new_status == prev_status:
                return jsonify({"msg": "OK", "status": order.status}), 200

            if new_status == 'cancelled':
                # Cancel: fail any pending payments and restock once
                Payment.query.filter_by(order_id=order.id, status='pending').update({"status": "failed"})
                order.status = 'cancelled'
                if prev_status != 'cancelled':
                    _restock_order_items(order.id)
                    should_send_cancel_email = True
                    email_to = order.customer_email
                    customer_name = order.customer_name
                    customer_phone = order.customer_phone
                    customer_address = order.customer_address
                    total_amount = order.total_amount
                    try:
                        items = OrderItem.query.filter_by(order_id=order.id).all()
                        item_lines = []
                        for i in (items or []):
                            if not i or not i.product_name:
                                continue
                            try:
                                qty = int(i.quantity or 0)
                            except Exception:
                                qty = 0
                            try:
                                unit = int(i.price or 0)
                            except Exception:
                                unit = 0
                            sub = unit * max(qty, 0)
                            item_lines.append(f"- {i.product_name} x{qty} • {unit:,} VND • {sub:,} VND")
                    except Exception:
                        item_lines = []
            else:
                order.status = new_status

        email_sent = False
        email_error = None
        if should_send_cancel_email and email_to:
            subject = f"NexTech - Đơn hàng {order_code} đã bị hủy"
            time_text = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
            lines = []
            lines.append(f"Xin chào {customer_name},")
            lines.append("")
            lines.append(f"Đơn hàng {order_code} đã được hủy bởi hệ thống quản trị.")
            lines.append(f"Thời gian hủy: {time_text}")
            lines.append("")
            lines.append("Thông tin đơn hàng:")
            lines.append(f"- Mã đơn: {order_code}")
            if total_amount is not None:
                lines.append(f"- Tổng tiền: {int(total_amount):,} VND")
            if item_lines:
                lines.append("- Sản phẩm:")
                lines.extend(item_lines)
            lines.append("")
            lines.append("Thông tin giao hàng:")
            lines.append(f"- Họ tên: {customer_name}")
            lines.append(f"- SĐT: {customer_phone}")
            lines.append(f"- Địa chỉ: {customer_address}")
            lines.append("")
            lines.append("Nếu bạn cần hỗ trợ, vui lòng liên hệ NexTech.")
            body = "\n".join(lines)
            email_sent, email_error = _send_email_if_configured(email_to, subject, body)

        return jsonify({
            "msg": "OK",
            "status": new_status,
            "email_sent": email_sent,
            "email_error": email_error,
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Lỗi hệ thống: " + str(e)}), 500

if __name__ == '__main__':
    # Thêm use_reloader=False để server không tự khởi động lại khi có ảnh mới
    app.run(debug=True, port=5000, use_reloader=False)