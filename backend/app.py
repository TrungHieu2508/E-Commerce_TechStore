from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from datetime import timedelta

app = Flask(__name__)

# --- 1. CẤU HÌNH HỆ THỐNG ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nextech.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'nextech_secret_key_2026' 
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app)

# --- 2. MÔ HÌNH DATABASE ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    role = db.Column(db.String(20), default='user') 
    is_locked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class Product(db.Model):
    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100))
    price = db.Column(db.Float, default=0)
    stock = db.Column(db.Integer, default=0)
    sold = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='active')
    image = db.Column(db.String(500))
    details = db.Column(db.Text) # JSON string for technical specs

class Order(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    customer_name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    total_price = db.Column(db.Float)
    payment_method = db.Column(db.String(50))
    shipping_method = db.Column(db.String(50))
    status = db.Column(db.String(50), default='processing')
    address = db.Column(db.Text)
    created_at = db.Column(db.String(50))

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(50), db.ForeignKey('order.id'))
    product_id = db.Column(db.String(20), db.ForeignKey('product.id'))
    quantity = db.Column(db.Integer)
    price = db.Column(db.Float)

class Content(db.Model):
    id = db.Column(db.String(20), primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), default='news')
    status = db.Column(db.String(50), default='draft')
    publish_at = db.Column(db.String(50))
    author = db.Column(db.String(100))
    thumbnail = db.Column(db.String(500))
    body = db.Column(db.Text)

class SupportRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    subject = db.Column(db.String(200))
    message = db.Column(db.Text)
    status = db.Column(db.String(50), default='pending') # pending, resolved
    response = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    responded_at = db.Column(db.DateTime)

class Banner(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image = db.Column(db.String(500))
    link = db.Column(db.String(500))
    title = db.Column(db.String(200))
    status = db.Column(db.String(50), default='active') # active, hidden
    position = db.Column(db.String(50), default='main') # main, sub

# Khởi tạo database và dữ liệu mặc định
with app.app_context():
    db.create_all()
    
    # 1. Thêm Admin và Users mẫu
    if not User.query.filter_by(username='admin@nextech.vn').first():
        pw_admin = bcrypt.generate_password_hash('Admin@123').decode('utf-8')
        pw_user = bcrypt.generate_password_hash('123456').decode('utf-8')
        
        users = [
            User(username='admin@nextech.vn', password=pw_admin, email='admin@nextech.vn', phone='0999999999', role='admin'),
            User(username='minh.nguyen@gmail.com', password=pw_user, email='minh.nguyen@gmail.com', phone='0901122334', role='user'),
            User(username='linh.tran@gmail.com', password=pw_user, email='linh.tran@gmail.com', phone='0912233445', role='user'),
            User(username='ha.pham@nextech.vn', password=pw_user, email='ha.pham@nextech.vn', phone='0988123456', role='staff')
        ]
        db.session.bulk_save_objects(users)
        db.session.commit()
        print(">>> Admin & Sample Users added")
    
    # 2. Thêm dữ liệu sản phẩm mẫu (Full)
    if not Product.query.first():
        sample_prods = [
            Product(id="P-1001", name="iPhone 17 Pro Max 256GB", category="Điện thoại", price=37790000, stock=24, status="active", sold=196, image="../../assets/img/IP1.png"),
            Product(id="P-1002", name="Samsung Galaxy S26 Ultra", category="Điện thoại", price=33990000, stock=7, status="active", sold=122, image="../../assets/img/SS1.png"),
            Product(id="P-1003", name="Laptop Dell XPS 9350", category="Laptop", price=54990000, stock=4, status="active", sold=55, image="../../assets/img/DELL1.png"),
            Product(id="P-1004", name="Màn hình Asus ROG XG32UQ", category="Màn hình", price=21990000, stock=3, status="active", sold=73, image="../../assets/img/MH1.png"),
            Product(id="P-1005", name="Bàn phím cơ VGN N75 Pro", category="Phụ kiện", price=1590000, stock=58, status="active", sold=310, image="../../assets/img/BP1.png"),
            Product(id="P-1006", name="RAM Corsair Dominator 32GB", category="Linh kiện", price=5890000, stock=10, status="active", sold=88, image="../../assets/img/RAM4.png"),
            Product(id="P-1007", name="AMD Ryzen 5 9600X", category="Linh kiện", price=7990000, stock=19, status="active", sold=145, image="../../assets/img/CPU1.png")
        ]
        db.session.bulk_save_objects(sample_prods)
        db.session.commit()
        print(">>> Full sample products added")

    # 3. Thêm tin tức / nội dung mẫu
    if not Content.query.first():
        sample_content = [
            Content(id="N-201", title="Hot Deal Laptop RTX", type="promotion", status="published", publish_at="2026-03-25 09:00", author="Admin", thumbnail="../../assets/img/ads-deal.png", body="Nội dung khuyến mãi hấp dẫn..."),
            Content(id="N-204", title="Review iPhone 17 Pro Max", type="news", status="published", publish_at="2026-03-21 11:30", author="Admin", thumbnail="../../assets/img/IP1.png", body="Đánh giá chi tiết siêu phẩm mới của Apple...")
        ]
        db.session.bulk_save_objects(sample_content)
        db.session.commit()

    # 4. Thêm đơn hàng mẫu
    if not Order.query.first():
        u = User.query.filter_by(username='minh.nguyen@gmail.com').first()
        if u:
            sample_orders = [
                Order(id="ORD-240321-1001", user_id=u.id, customer_name="Nguyen Hoang Minh", phone="0901122334", total_price=37790000, payment_method="COD", shipping_method="GHN", status="processing", address="31 Le Loi, Q1, TP.HCM", created_at="2026-03-21 10:12"),
                Order(id="ORD-240322-1003", user_id=u.id, customer_name="Nguyen Hoang Minh", phone="0901122334", total_price=1590000, payment_method="COD", shipping_method="Viettel Post", status="completed", address="112 Tran Phu, Da Nang", created_at="2026-03-22 09:45")
            ]
            db.session.bulk_save_objects(sample_orders)
            db.session.commit()

# --- 3. CÁC API CHỨC NĂNG ---

# API ĐĂNG KÝ
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"msg": "Tên đăng nhập đã tồn tại"}), 400
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"msg": "Email này đã được sử dụng"}), 400
        hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        new_user = User(
            username=data['username'], 
            password=hashed_pw, 
            email=data['email'],
            phone=data.get('phone'),
            role='user'
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"msg": "Đăng ký tài khoản thành công"}), 201
    except Exception as e:
        return jsonify({"msg": "Lỗi hệ thống", "error": str(e)}), 500

# API ĐĂNG NHẬP
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username')
    password = data.get('password')
    required_role = data.get('required_role') 

    # Kiểm tra cả username và email
    user = User.query.filter((User.username == username_or_email) | (User.email == username_or_email)).first()
    
    if user and bcrypt.check_password_hash(user.password, password):
        if user.is_locked:
            return jsonify({"msg": "Tài khoản của bạn đã bị khóa!"}), 403
        
        if required_role and user.role != required_role:
            return jsonify({"msg": "Sai tài khoản hoặc mật khẩu"}), 401
        
        token = create_access_token(identity=user.username, additional_claims={"role": user.role})
        return jsonify({
            "access_token": token, 
            "role": user.role,
            "username": user.username
        }), 200
    
    return jsonify({"msg": "Sai tài khoản hoặc mật khẩu"}), 401

# --- 4. CÁC API QUẢN TRỊ (ADMIN) ---

# --- API NGƯỜI DÙNG ---
@app.route('/admin/users', methods=['GET'])
@jwt_required()
def list_users():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Quyền admin yêu cầu"}), 403
    users = User.query.all()
    result = []
    for u in users:
        # Tính toán thông tin bổ sung cho mỗi user
        order_count = Order.query.filter_by(user_id=u.id).count()
        total_spent = db.session.query(db.func.sum(Order.total_price)).filter_by(user_id=u.id).scalar() or 0
        
        result.append({
            "id": u.id,
            "username": u.username,
            "name": u.username, # Hiện tại dùng username làm tên hiển thị
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "status": "locked" if u.is_locked else "active",
            "orders": order_count,
            "totalSpent": total_spent,
            "joinedAt": u.created_at.strftime("%Y-%m-%d") if u.created_at else "N/A"
        })
    return jsonify(result)

@app.route('/admin/users/toggle-lock/<int:user_id>', methods=['PUT'])
@jwt_required()
def toggle_lock(user_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Quyền admin yêu cầu"}), 403
    user = db.session.get(User, user_id)
    if user:
        if user.username == 'admin': return jsonify({"msg": "Không thể khóa Admin"}), 400
        user.is_locked = not user.is_locked
        db.session.commit()
        return jsonify({"msg": "Thành công"})
    return jsonify({"msg": "Không tìm thấy"}), 404

@app.route('/admin/users/delete/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Quyền admin yêu cầu"}), 403
    user = db.session.get(User, user_id)
    if not user: return jsonify({"msg": "Người dùng không tồn tại"}), 404
    if user.username == 'admin': return jsonify({"msg": "Không thể xóa tài khoản Admin tối cao!"}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": f"Đã xóa vĩnh viễn người dùng {user.username}"})

@app.route('/admin/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Quyền admin yêu cầu"}), 403
    user = db.session.get(User, user_id)
    if not user: return jsonify({"msg": "Không tìm thấy"}), 404
    if user.username == 'admin': return jsonify({"msg": "Không thể đổi role Admin"}), 400
    data = request.get_json()
    user.role = data.get('role', user.role)
    db.session.commit()
    return jsonify({"msg": "Đã cập nhật role"})

@app.route('/admin/users/<int:user_id>/orders', methods=['GET'])
@jwt_required()
def list_user_orders(user_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Quyền admin yêu cầu"}), 403
    orders = Order.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "id": o.id, "total": o.total_price, "status": o.status, "createdAt": o.created_at
    } for o in orders])

# --- API SẢN PHẨM ---
@app.route('/products', methods=['GET'])
def list_products():
    category = request.args.get('category')
    status = request.args.get('status')
    query = Product.query
    if category and category != 'all': query = query.filter_by(category=category)
    if status and status != 'all': query = query.filter_by(status=status)
    products = query.all()
    return jsonify([{
        "id": p.id, "name": p.name, "category": p.category, 
        "price": p.price, "stock": p.stock, "sold": p.sold, 
        "status": p.status, "image": p.image, "details": p.details
    } for p in products])

@app.route('/admin/products', methods=['POST'])
@jwt_required()
def add_product():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    data = request.get_json()
    new_p = Product(
        id=data.get('id'), name=data.get('name'), category=data.get('category'),
        price=data.get('price'), stock=data.get('stock'), status=data.get('status'),
        image=data.get('image', '../../assets/img/LOGO1.png'),
        details=data.get('details')
    )
    db.session.add(new_p)
    db.session.commit()
    return jsonify({"msg": "Product added"}), 201

@app.route('/admin/products/<string:p_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_product(p_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    product = Product.query.get(p_id)
    if not product: return jsonify({"msg": "Not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify({"msg": "Deleted"})
    data = request.get_json()
    product.name = data.get('name', product.name)
    product.category = data.get('category', product.category)
    product.price = data.get('price', product.price)
    product.stock = data.get('stock', product.stock)
    product.status = data.get('status', product.status)
    product.details = data.get('details', product.details)
    db.session.commit()
    return jsonify({"msg": "Updated"})

@app.route('/admin/products/<string:p_id>/stock', methods=['PUT'])
@jwt_required()
def import_product_stock(p_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    product = Product.query.get(p_id)
    if not product: return jsonify({"msg": "Not found"}), 404
    data = request.get_json()
    new_stock = data.get('stock', 0)
    product.stock += int(new_stock) # Incremental addition
    db.session.commit()
    return jsonify({"msg": f"Đã nhập thêm {new_stock} sản phẩmvào kho", "currentStock": product.stock})

# --- API BANNER ---
@app.route('/admin/banners', methods=['GET', 'POST'])
@jwt_required()
def manage_banners():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    if request.method == 'POST':
        data = request.get_json()
        new_b = Banner(
            image=data.get('image'), title=data.get('title'),
            link=data.get('link'), status=data.get('status'), position=data.get('position')
        )
        db.session.add(new_b)
        db.session.commit()
        return jsonify({"msg": "Banner created"}), 201
    
    banners = Banner.query.all()
    return jsonify([{
        "id": b.id, "image": b.image, "title": b.title, "link": b.link, 
        "status": b.status, "position": b.position
    } for b in banners])

@app.route('/admin/banners/<int:b_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_single_banner(b_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    banner = db.session.get(Banner, b_id)
    if not banner: return jsonify({"msg": "Not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(banner)
        db.session.commit()
        return jsonify({"msg": "Deleted"})
    data = request.get_json()
    banner.image = data.get('image', banner.image)
    banner.title = data.get('title', banner.title)
    banner.link = data.get('link', banner.link)
    banner.status = data.get('status', banner.status)
    banner.position = data.get('position', banner.position)
    db.session.commit()
    return jsonify({"msg": "Banner updated"})

# --- API ĐƠN HÀNG ---
@app.route('/admin/orders', methods=['GET'])
@jwt_required()
def list_orders():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    orders = Order.query.all()
    return jsonify([{
        "id": o.id, "customer": o.customer_name, "phone": o.phone,
        "total": o.total_price, "payment": o.payment_method, 
        "shipping": o.shipping_method, "status": o.status, 
        "createdAt": o.created_at, "address": o.address
    } for o in orders])

@app.route('/admin/orders/<string:o_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(o_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    order = Order.query.get(o_id)
    if not order: return jsonify({"msg": "Not found"}), 404
    data = request.get_json()
    order.status = data.get('status', order.status)
    db.session.commit()
    return jsonify({"msg": "Order status updated"})

# --- API TIN TỨC / CONTENT (FULL CRUD) ---
@app.route('/admin/content', methods=['GET', 'POST'])
@jwt_required()
def manage_contents():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    if request.method == 'POST':
        data = request.get_json()
        new_c = Content(
            id=data.get('id'), title=data.get('title'), type=data.get('type'),
            status=data.get('status'), publish_at=data.get('publishAt'),
            author=data.get('author'), thumbnail=data.get('thumbnail'), body=data.get('body')
        )
        db.session.add(new_c)
        db.session.commit()
        return jsonify({"msg": "Content added"}), 201
    contents = Content.query.all()
    return jsonify([{
        "id": c.id, "title": c.title, "type": c.type, "status": c.status,
        "publishAt": c.publish_at, "author": c.author, "thumbnail": c.thumbnail, "body": c.body
    } for c in contents])

@app.route('/admin/content/<string:c_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_single_content(c_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    content = Content.query.get(c_id)
    if not content: return jsonify({"msg": "Not found"}), 404
    if request.method == 'DELETE':
        db.session.delete(content)
        db.session.commit()
        return jsonify({"msg": "Deleted"})
    data = request.get_json()
    content.title = data.get('title', content.title)
    content.type = data.get('type', content.type)
    content.status = data.get('status', content.status)
    content.publish_at = data.get('publishAt', content.publish_at)
    content.thumbnail = data.get('thumbnail', content.thumbnail)
    content.body = data.get('body', content.body)
    db.session.commit()
    return jsonify({"msg": "Updated"})

# --- API HỖ TRỢ KHÁCH HÀNG ---
@app.route('/admin/support', methods=['GET'])
@jwt_required()
def list_support():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    reqs = SupportRequest.query.order_by(SupportRequest.created_at.desc()).all()
    return jsonify([{
        "id": r.id, "customer": r.customer_name, "email": r.email, "phone": r.phone,
        "subject": r.subject, "message": r.message, "status": r.status,
        "createdAt": r.created_at.strftime("%Y-%m-%d %H:%M")
    } for r in reqs])

@app.route('/admin/support/<int:s_id>/status', methods=['PUT'])
@jwt_required()
def update_support_status(s_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    req = db.session.get(SupportRequest, s_id)
    if not req: return jsonify({"msg": "Not found"}), 404
    data = request.get_json()
    req.status = data.get('status', req.status)
    db.session.commit()
    return jsonify({"msg": "Status updated"})

@app.route('/admin/support/<int:s_id>/respond', methods=['PUT'])
@jwt_required()
def update_support_response(s_id):
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    req = db.session.get(SupportRequest, s_id)
    if not req: return jsonify({"msg": "Not found"}), 404
    data = request.get_json()
    req.response = data.get('response')
    req.status = 'resolved'
    req.responded_at = db.func.current_timestamp()
    db.session.commit()
    return jsonify({"msg": "Phản hồi đã được gửi thành công"})

# --- API THỐNG KÊ (DASHBOARD) ---
@app.route('/admin/dashboard/stats', methods=['GET'])
@jwt_required()
def dashboard_stats():
    if get_jwt().get("role") != "admin": return jsonify({"msg": "Unauthorized"}), 403
    total_revenue = db.session.query(db.func.sum(Order.total_price)).filter(Order.status == 'completed').scalar() or 0
    new_orders = Order.query.filter(Order.status == 'processing').count()
    total_users = User.query.filter(User.role == 'user').count()
    low_stock = Product.query.filter(Product.stock <= 5).all()
    pending_count = Order.query.filter(Order.status == 'processing').count()
    shipping_count = Order.query.filter(Order.status == 'shipping').count()
    completed_count = Order.query.filter(Order.status == 'completed').count()
    # Thống kê doanh thu theo danh mục (Dựa trên số lượng đã bán)
    category_data = db.session.query(
        Product.category, 
        db.func.sum(Product.sold * Product.price)
    ).group_by(Product.category).all()
    
    cat_labels = [c[0] for c in category_data]
    cat_values = [float(c[1] or 0) for c in category_data]

    return jsonify({
        "kpis": [
            {"key": "revenue", "label": "Doanh thu thực", "value": total_revenue, "trend": 12, "trendLabel": "tháng này"},
            {"key": "orders", "label": "Đơn hàng mới", "value": new_orders, "trend": 5, "trendLabel": "chờ xử lý"},
            {"key": "users", "label": "Khách hàng", "value": total_users, "trend": 8, "trendLabel": "đã đăng ký"}
        ],
        "lowStock": [{"id": p.id, "name": p.name, "stock": p.stock} for p in low_stock],
        "labels": ["Chờ xử lý", "Đang giao", "Hoàn thành"],
        "revenueSeries": [pending_count, shipping_count, completed_count],
        "ordersSeries": [pending_count, shipping_count, completed_count],
        "categoryLabels": cat_labels,
        "categoryValues": cat_values
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)