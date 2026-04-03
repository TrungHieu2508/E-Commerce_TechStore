# NexTech Store (E-Commerce TechStore)

Backend: **Flask + SQLAlchemy + JWT**  
Frontend: **HTML/CSS/JS** (được backend serve trực tiếp)

Mục tiêu README này: hướng dẫn **người mới** có thể _clone về và chạy được ngay_ (khuyến nghị dùng **SQLite**), và tuỳ chọn cấu hình **MySQL** + **SMTP email**.

---

## 1) Tổng quan repo

- `backend/` — Flask API + serve UI
- `pages/` — các trang HTML
- `assets/` — CSS + hình ảnh
- `scripts/` — JavaScript frontend
- `instance/` — dữ liệu local (SQLite DB, email .eml ở DEV mode)

Frontend đã có cơ chế tự lấy API base theo **same-origin** (khi chạy qua Flask) trong `scripts/api-config.js`.

---

## 2) Yêu cầu hệ thống

### Bắt buộc

- **Python 3.x** (khuyên dùng 3.10+)
- **Git** (để clone)

### Tuỳ chọn

- **MySQL** (chỉ khi bạn muốn chạy MySQL; nếu không dùng SQLite)
- Tài khoản SMTP (Gmail/Outlook/...) nếu muốn **gửi email thật**

---

## 3) Cài thư viện (dependencies)

Toàn bộ thư viện Python cần thiết đã được liệt kê trong `backend/requirements.txt`. Bạn **không phải cài từng thư viện**, chỉ cần 1 lệnh.

### Windows (PowerShell)

Chạy ở thư mục gốc repo:

```powershell
# 1) tạo virtual environment
python -m venv .venv

# 2) kích hoạt venv
.\.venv\Scripts\Activate.ps1

# 3) cài dependencies
pip install -r backend\requirements.txt
```

Nếu PowerShell chặn chạy script Activate, có thể chạy một lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

---

## 4) Chạy nhanh nhất (khuyến nghị): SQLite + DEV email

Mặc định backend có thể dùng MySQL. Để “clone về chạy ngay” cho người mới, hãy bật **SQLite** bằng env `USE_SQLITE=1`.

### Cách A (khuyên dùng): chạy script cấu hình DEV

Script này sẽ tạo/cập nhật `backend/.env` và set:

- `USE_SQLITE=1`
- `EMAIL_MODE=file` (email được lưu ra file `.eml`, không cần password)

Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File backend\setup_email_dev.ps1
```

> Lưu ý: `backend/.env` đã được ignore trong `.gitignore` (không commit lên git).

### Chạy backend

```powershell
.\.venv\Scripts\python.exe backend\app.py
```

Mở web:

- http://127.0.0.1:5000/

Khuyến nghị dùng **127.0.0.1** nhất quán (đừng lúc `localhost` lúc `127.0.0.1`) để tránh lệch origin gây lỗi token.

### Kiểm tra nhanh backend sống

- http://127.0.0.1:5000/api/health

---

## 5) Chạy với MySQL (tuỳ chọn)

Cấu hình DB nằm trong `backend/config.py`. Có 2 cách:

### Cách A: set biến môi trường MySQL

Backend tự build URI từ các biến sau (có default):

- `MYSQL_HOST` (default `localhost`)
- `MYSQL_PORT` (default `3306`)
- `MYSQL_USER` (default `root`)
- `MYSQL_PASSWORD` (default `12345`)
- `MYSQL_DATABASE` (default `nextech_db`)

Đảm bảo **không** bật SQLite:

- `USE_SQLITE=0` (hoặc bỏ dòng này khỏi `.env`)

Tạo file `backend/.env` (nếu chưa có) và set ví dụ:

```env
USE_SQLITE=0
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=nextech_db
```

Sau đó chạy lại:

```powershell
.\.venv\Scripts\python.exe backend\app.py
```

### Cách B: set trực tiếp SQLAlchemy URI

```env
SQLALCHEMY_DATABASE_URI=mysql+pymysql://user:pass@host:3306/dbname
```

---

## 6) Email xác nhận đơn hàng (tuỳ chọn)

Backend chỉ gửi email khi request đặt hàng có `customer.email` hợp lệ.

Tài liệu chi tiết: `backend/EMAIL_SETUP.md`

### DEV mode (không cần mật khẩu)

- `EMAIL_MODE=file` sẽ lưu email ra `instance/emails/*.eml`

Test tạo email file:

```powershell
.\.venv\Scripts\python.exe backend\send_test_email.py --to any@example.com
```

### Gmail SMTP (gửi email thật)

Script Gmail sẽ hỏi:

- `SMTP_USER` (email Gmail)
- `SMTP_PASS` (Gmail App Password — 16 ký tự)

Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File backend\setup_gmail_smtp.ps1
```

Test SMTP:

```powershell
.\.venv\Scripts\python.exe backend\send_test_email.py --to your_receiver@example.com
```

---

## 7) Tài khoản mặc định

Khi app khởi động lần đầu, backend sẽ seed dữ liệu và tạo admin nếu chưa có:

- Username: `admin`
- Password: `admin123`

---

## 8) Một số API/luồng chính (tóm tắt)

- Auth:
  - `POST /register`
  - `POST /login`
- Public:
  - `GET /api/public/products`
  - `GET /api/public/banners`
  - `GET /api/public/locations`
- Cart / Orders / Payment (cần JWT):
  - `GET/POST /api/cart`
  - `PUT/DELETE /api/cart/<item_id>`
  - `POST /api/orders`
  - `GET /api/orders/me`
  - `GET /api/orders/<order_code>`
  - `POST /api/payment/create`
  - `POST /api/payment/confirm` (mock)

---

## 9) Troubleshooting

### 1) Thiếu thư viện / lỗi import

- Đảm bảo bạn đang chạy đúng Python trong `.venv`:

```powershell
where python
python -c "import sys; print(sys.executable)"
```

- Cài lại dependencies:

```powershell
pip install -r backend\requirements.txt
```

### 2) Không kết nối được MySQL

- Chạy nhanh bằng SQLite trước: set `USE_SQLITE=1` (hoặc chạy `backend/setup_email_dev.ps1`).

### 3) Port 5000 đang bị chiếm

- Tắt tiến trình đang dùng port 5000 hoặc đổi port trong `backend/app.py`.

### 4) Email không gửi được

- Nếu backend trả `email_sent=false`, xem `email_error`.
- Đọc `backend/EMAIL_SETUP.md` mục troubleshooting.

---

## 10) Gợi ý cho người chấm bài / demo

- Chạy backend bằng SQLite để demo nhanh.
- Mở UI tại: http://127.0.0.1:5000/
- Dùng endpoint health: http://127.0.0.1:5000/api/health
