// DỮ LIỆU ĐIỀU KIỆN: Khi có đơn xác nhận (lấy từ localStorage)
function loadOrdersFromStorage() {
    return JSON.parse(localStorage.getItem('nextech_orders') || '[]');
}

function filterOrders(status, element) {
    // Cập nhật giao diện tab
    document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    const orders = loadOrdersFromStorage();
    const container = document.getElementById('orderListArea');
    
    // Lọc dữ liệu
    const filtered = status === 'all' ? orders : orders.filter(o => o.status === status);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-notify"><i class="fas fa-box-open" style="font-size: 40px; display: block; margin-bottom: 10px;"></i>Chưa có đơn hàng nào.</div>`;
        return;
    }

    // Render danh sách chuẩn theo ảnh mẫu
    container.innerHTML = filtered.map(order => `
        <div class="order-card-item">
            <img src="${order.productImg}" alt="Product">
            <div class="order-card-info">
                <h4>${order.productName}</h4>
                <p>Số lượng: 1</p>
                <p>Trạng thái: <span style="color: #28a745;">${getStatusText(order.status)}</span></p>
                <p>Ngày đặt: ${order.orderDate}</p>
            </div>
            <div class="order-price">${order.price} VND</div>
        </div>
    `).join('');

    // Cập nhật tên người dùng nếu có
    if(orders.length > 0) {
        document.getElementById('userNameDisplay').innerText = orders[0].customerName;
    }
}

function getStatusText(status) {
    const map = {
        'processing': 'Đang xử lý',
        'shipping': 'Đang vận chuyển',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return map[status] || 'Không xác định';
}

// Khởi tạo trang: Mặc định hiện tất cả
window.onload = () => {
    const firstTab = document.querySelector('.step-item');
    filterOrders('all', firstTab);
};