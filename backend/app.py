import re # Thêm dòng này lên trên cùng file cùng với các thư viện khác
import os
import json
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import timedelta, datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)

# --- CẤU HÌNH ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'assets', 'img')
if not os.path.exists(UPLOAD_FOLDER): 
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:1234@localhost/nextech_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'nextech_secret_key_2026' 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app)

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
    import re
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
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
    db.create_all()
    seed_data()
    if not User.query.filter_by(username='admin').first():
        db.session.add(User(username='admin', password=bcrypt.generate_password_hash('admin123').decode('utf-8'), email='admin@nextech.com', role='admin'))
        db.session.commit()

# --- API ROUTES ---

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
# --- ADMIN ROUTES ---
# Route xóa người dùng (Thêm mới để fix lỗi 404)
@app.route('/admin/users/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_user(id):
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
    data = request.get_json()
    db.session.add(Product(name=data['name'], category=data['category'], price=data['price'], old_price=data.get('old_price', 0), img=data['img'], specs=json.dumps(data['specs']), description=data.get('description', ''), created_at=datetime.now()))
    db.session.commit()
    return jsonify({"msg": "OK"})

@app.route('/admin/products/update/<int:id>', methods=['PUT'])
@jwt_required()
def update_product(id):
    p = db.session.get(Product, id)
    data = request.get_json()
    p.name=data['name']; p.category=data['category']; p.price=data['price']; p.old_price=data.get('old_price', 0); p.img=data['img']; p.specs=json.dumps(data['specs']); p.description=data.get('description', '')
    db.session.commit()
    return jsonify({"msg": "OK"})

@app.route('/admin/products/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_product(id):
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
    users = User.query.all()
    return jsonify([{"id":u.id, "username":u.username, "phone":u.phone, "email":u.email, "role":u.role, "is_locked":u.is_locked} for u in users])

@app.route('/admin/users/toggle-lock/<int:id>', methods=['PUT'])
@jwt_required()
def toggle_lock(id):
    u = db.session.get(User, id)
    if u and u.role != 'admin':
        u.is_locked = not u.is_locked
        db.session.commit()
        return jsonify({"msg": "OK"})
    return jsonify({"msg": "Lỗi"}), 400

@app.route('/admin/upload', methods=['POST'])
@jwt_required()
def upload_file():
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
    data = request.get_json()
    db.session.add(Banner(img=data['img'], position=data['position']))
    db.session.commit()
    return jsonify({"msg": "OK"})

@app.route('/admin/banners/delete/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_banner(id):
    b = db.session.get(Banner, id); db.session.delete(b); db.session.commit()
    return jsonify({"msg": "OK"})

if __name__ == '__main__':
    # Thêm use_reloader=False để server không tự khởi động lại khi có ảnh mới
    app.run(debug=True, port=5000, use_reloader=False)