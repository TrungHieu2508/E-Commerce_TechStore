# Cấu hình gửi email (SMTP)

Backend có chức năng gửi email xác nhận đơn hàng (best-effort). Nếu SMTP chưa cấu hình, API vẫn tạo đơn bình thường nhưng trả về `email_sent=false` và `email_error` (ví dụ: `smtp_not_configured`).

## 1) Quick start (Windows, 1 lệnh) — Gmail

Lưu ý quan trọng: để **GỬI** email, backend phải đăng nhập vào một **tài khoản gửi** (SMTP). Script Gmail sẽ hỏi `SMTP_USER/SMTP_PASS` của **tài khoản gửi** (không phải password của email người nhận).

Nếu bạn không muốn nhập password khi test, xem mục **"Quick start (không cần password)"** bên dưới.

Bạn của bạn clone repo về chỉ cần chạy 1 lệnh sau (script sẽ tự tạo/cập nhật `backend/.env`, set Gmail SMTP chuẩn, và bật `USE_SQLITE=1` để chạy local không cần MySQL):

```powershell
powershell -ExecutionPolicy Bypass -File backend\setup_gmail_smtp.ps1
```

Script này cũng sẽ set `EMAIL_MODE=smtp` để đảm bảo backend **gửi email thật** qua SMTP (không bị kẹt ở chế độ DEV lưu file `.eml`).

Sau khi script chạy xong, test gửi mail ngay:

```powershell
.\.venv\Scripts\python.exe backend\send_test_email.py --to your_test_receiver@example.com
```

Nếu thấy `OK: email_sent` là cấu hình Gmail SMTP đã chạy.

## 2) Quick start (không cần password) — DEV mode (lưu email ra file)

Chế độ này **không gửi ra Internet**, nhưng vẫn test được đầy đủ luồng tạo email/nội dung email. Email sẽ được lưu thành file `.eml` trong `instance/emails/`.

DEV mode sẽ set `EMAIL_MODE=file`. Khi bạn muốn quay lại gửi email thật qua Gmail, chỉ cần chạy lại script Gmail để chuyển `EMAIL_MODE=smtp`.

```powershell
powershell -ExecutionPolicy Bypass -File backend\setup_email_dev.ps1
```

Test tạo email file:

```powershell
.\.venv\Scripts\python.exe backend\send_test_email.py --to any@example.com
```

Mở thư mục `instance/emails/` để xem file `.eml`.

## 3) Quick start (thủ công)

1. Copy file mẫu:
   - Copy `backend/.env.example` → `backend/.env`
2. Mở `backend/.env` và điền SMTP:
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
   - (khuyến nghị) `SMTP_FROM`, `SMTP_PORT`, `SMTP_TLS`/`SMTP_SSL`, `SMTP_TIMEOUT`
3. (Tuỳ chọn) Nếu bạn chưa có MySQL, chạy nhanh local bằng SQLite:
   - set `USE_SQLITE=1` trong `backend/.env`
4. Test SMTP độc lập:

```powershell
.\.venv\Scripts\python.exe backend\send_test_email.py --to your_test_receiver@example.com
```

## 4) Biến môi trường SMTP

Backend dùng các biến sau:

- `SMTP_HOST` (bắt buộc) — ví dụ `smtp.gmail.com`
- `SMTP_PORT` (khuyến nghị) — thường là `587` (STARTTLS) hoặc `465` (SSL)
- `SMTP_TLS` (mặc định `true`) — dùng STARTTLS (phổ biến khi port 587)
- `SMTP_SSL` (mặc định `false`) — dùng SSL trực tiếp (phổ biến khi port 465)
- `SMTP_USER` (bắt buộc) — user đăng nhập SMTP (thường là email)
- `SMTP_PASS` (bắt buộc) — mật khẩu SMTP / App Password
- `SMTP_FROM` (khuyến nghị) — email hiển thị ở From. Nếu bỏ trống sẽ fallback về `SMTP_USER`
- `SMTP_TIMEOUT` (tuỳ chọn) — timeout kết nối SMTP (giây), mặc định 10

Gợi ý cấu hình phổ biến:

### Gmail

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_TLS=true`
- `SMTP_SSL=false`

Lưu ý: Gmail thường yêu cầu **App Password** (không dùng password đăng nhập bình thường).

### Outlook / Office365

- `SMTP_HOST=smtp.office365.com`
- `SMTP_PORT=587`
- `SMTP_TLS=true`
- `SMTP_SSL=false`

## 5) Gmail App Password (thường gặp nhất)

Nếu bạn dùng Gmail:

1. Bật xác minh 2 bước (2-Step Verification) cho tài khoản Google.
2. Tạo **App Password** (mật khẩu ứng dụng).
3. Dùng App Password đó làm `SMTP_PASS`.

Nếu `SMTP_PASS` sai hoặc bị chặn, backend sẽ trả `email_error=smtp_auth_failed`.

## 6) Lưu ý luồng đặt hàng

Backend **chỉ gửi email khi request đặt hàng có `customer.email`** (email người nhận) và email hợp lệ.

- Nếu không có `customer.email`, backend sẽ **không thử gửi** và `email_error` sẽ là `null`.

## 7) Troubleshooting theo `email_error`

- `smtp_not_configured`: thiếu `SMTP_HOST` hoặc `SMTP_USER` hoặc `SMTP_PASS` (hoặc `SMTP_FROM` rỗng sau fallback).
- `invalid_email`: email người nhận rỗng / không hợp lệ.
- `smtp_auth_failed`: sai user/pass, thiếu App Password, hoặc provider chặn đăng nhập.
- `smtp_recipient_refused`: SMTP server từ chối người nhận (địa chỉ sai hoặc bị policy).
- `smtp_timeout`: timeout mạng (firewall, DNS, proxy, provider chậm).
- `smtp_connect_failed`: không kết nối được host/port (sai host/port hoặc chặn mạng).
- `smtp_failed:<ExceptionType>`: lỗi khác; xem log console của backend để biết thêm.

### Gmail: lỗi `535 5.7.8 BadCredentials` (phổ biến)

Nếu test bằng `backend/send_test_email.py` hoặc đặt hàng mà gặp `smtp_auth_failed` kèm thông báo kiểu:

`5.7.8 Username and Password not accepted (BadCredentials)`

thì gần như chắc chắn là **Gmail không chấp nhận mật khẩu**. Checklist nhanh:

1. **Bắt buộc dùng App Password**
   - Bật **2-Step Verification** cho tài khoản Google.
   - Tạo **App Password** mới (Mail / Windows), dùng nó làm `SMTP_PASS`.

2. **App Password phải đúng và đủ 16 ký tự**
   - Google thường hiển thị dạng có dấu cách: `abcd efgh ijkl mnop`.
   - Khi nhập, có thể paste có/không có dấu cách; script đã tự bỏ khoảng trắng.
   - Nếu bạn lỡ nhập mật khẩu thường hoặc nhập nhầm, hãy tạo App Password mới và thử lại.

3. **Tài khoản Google Workspace có thể bị chặn**
   - Một số domain công ty/trường học không cho dùng App Password/SMTP basic auth.
   - Nếu vậy, hãy dùng Gmail cá nhân hoặc provider SMTP khác.

4. **Đảm bảo backend đã restart sau khi đổi `.env`**
   - Nếu bạn vừa chạy script và backend vẫn dùng cấu hình cũ, hãy stop process cũ và chạy lại `backend/app.py`.
   - Khi chạy ở chế độ debug, bạn có thể kiểm tra `GET /api/debug/email-config` (không trả secrets) để biết server đang thấy `EMAIL_MODE` và các cờ SMTP.

Nếu bạn thấy email vẫn được lưu ra file `.eml` thay vì gửi thật, kiểm tra `backend/.env`:

- Gửi thật: `EMAIL_MODE=smtp`
- DEV lưu file: `EMAIL_MODE=file`
- DEV in console: `EMAIL_MODE=console`

## 8) Bảo mật

- Không commit `backend/.env` lên git.
- Không chia sẻ `SMTP_PASS`.
