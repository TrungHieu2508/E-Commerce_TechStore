// 1. Lấy ID sản phẩm từ URL (ví dụ: product-detail.html?id=20)
const params = new URLSearchParams(window.location.search);
const id = parseInt(params.get('id'));

// 2. Tìm sản phẩm trong kho dữ liệu allProducts (từ file scripts.js)
let product = null;
let categoryKey = "";

for (let key in allProducts) {
    let found = allProducts[key].find(item => item.id === id);
    if (found) { 
        product = found; 
        categoryKey = key; 
        break; 
    }
}

// 3. Nếu tìm thấy sản phẩm, tiến hành đổ dữ liệu
if (product) {
    // Đổ Breadcrumb
    document.getElementById('dynamic-breadcrumb').innerHTML = `
        <a href="index.html"><i class="fas fa-home"></i> Trang chủ</a> > 
        <a href="#" onclick="history.back(); return false;"> ${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1) } > </a>
        <strong>${product.name}</strong>
    `;
    
    // Đổ Nội dung chi tiết
    document.getElementById('product-content').innerHTML = `
        <div class="detail-grid">
            <div class="left">
                <img src="${product.img}" class="product-main-img" alt="${product.name}">
                
                <div class="product-description-content">
                    ${product.description || '<p>Nội dung đang được cập nhật cho sản phẩm này...</p>'}
                </div>
            </div>

            <div class="right">
                <h1>${product.name}</h1>
                <div style="margin: 15px 0; display: flex; align-items: baseline;">
                    <span class="price-big">${product.price.toLocaleString()}đ</span>
                    ${product.oldPrice > 0 ? `<span class="old-price-detail">${product.oldPrice.toLocaleString()}đ</span>` : ''}
                </div>

                <div class="buy-group">
                    <button class="btn-now" id="btnBuyNow">
                        MUA NGAY
                        <small>Giao tận nơi hoặc nhận tại cửa hàng</small>
                    </button>
                    
                    <button class="btn-advise" id="btnAdvise">
                        <i class="fas fa-comment-dots"></i> TƯ VẤN NGAY
                    </button>
                </div>

                <ul style="font-size: 14px; color: #444;margin-bottom: 20px">
                    <li><i class="fas fa-check" style="color: #28a745; margin-right: 8px;"></i> Bảo hành chính hãng 12 tháng.</li>
                    <li><i class="fas fa-check" style="color: #28a745; margin-right: 8px;"></i> Hỗ trợ đổi mới trong 7 ngày.</li>
                    <li><i class="fas fa-check" style="color: #28a745; margin-right: 8px;"></i> Miễn phí giao hàng toàn quốc.</li>
                </ul>

                <div class="promo-box">
                    <div class="promo-header">
                        <i class="fas fa-gift" style="color: #d70018;"></i> Khuyến mãi
                    </div>
                    <div class="promo-body">
                        <p><i class="fas fa-check-circle" style="color: #28a745;"></i> ${product.promo || 'Giảm ngay 100.000đ khi mua tại NexTech.'}</p>
                        <p style="color: #007bff; cursor: pointer;">(Xem thêm)</p>
                    </div>
                </div>

                <div class="specs-detail-title">ĐIỂM NỔI BẬT</div>
                <table class="specs-table">
                    ${Object.entries(product.specs).map(([k, v]) => `
                        <tr>
                            <td>${k}</td>
                            <td>${v}</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        </div>
    `;


        // 1. Xử lý nút Mua Ngay
        const btnBuyNow = document.getElementById('btnBuyNow');
        if (btnBuyNow) {
            btnBuyNow.onclick = function() {
                // Chuyển hướng sang trang order-Information.html và đính kèm ID sản phẩm
                window.location.href = `order-information.html?id=${product.id}`;
            };
        }

        // 2. Xử lý nút Tư Vấn (Gắn số điện thoại bạn yêu cầu)
        const btnAdvise = document.getElementById('btnAdvise');
        if (btnAdvise) {
            btnAdvise.onclick = function() {
                // Lệnh tel: sẽ tự động mở ứng dụng cuộc gọi trên điện thoại
                window.location.href = 'tel:0938943062';
            };
        }



    // Cập nhật tiêu đề trang và tiêu đề đánh giá
    document.getElementById('rating-title').innerText = `Đánh giá & Nhận xét : ${product.name}`;
    document.addEventListener('DOMContentLoaded', function() {
        const submitBtn = document.getElementById('submitReview');
        
        if (submitBtn) {
            submitBtn.addEventListener('click', function() {
                const content = document.getElementById('reviewText').value;
                const name = document.getElementById('reviewerName').value;
                const starInput = document.querySelector('input[name="stars"]:checked');
                
                // Kiểm tra dữ liệu
                if (!starInput) {
                    alert("Vui lòng chọn số sao đánh giá!");
                    return;
                }
                if (!name || !content) {
                    alert("Vui lòng nhập đầy đủ họ tên và nội dung đánh giá!");
                    return;
                }

                // Tạo cấu trúc đánh giá mới
                const ratingValue = starInput.value;
                const reviewList = document.getElementById('review-list');
                
                const newReview = document.createElement('div');
                newReview.className = 'review-item';
                
                // Tạo chuỗi sao vàng dựa trên số lượng chọn
                let starHtml = '';
                for(let i=0; i<5; i++) {
                    starHtml += `<i class="fas fa-star" style="color: ${i < ratingValue ? '#ffc107' : '#ccc'}"></i>`;
                }

                newReview.innerHTML = `
                    <div class="author">${name} <span style="font-weight: normal; font-size: 12px; color: #999;">- Vừa xong</span></div>
                    <div class="stars">${starHtml}</div>
                    <div class="content">${content}</div>
                `;

                // Thêm vào đầu danh sách
                reviewList.prepend(newReview);

                // Reset form
                document.getElementById('reviewText').value = '';
                document.getElementById('reviewerName').value = '';
                document.getElementById('reviewerEmail').value = '';
                starInput.checked = false;

                alert("Cảm ơn bạn đã gửi đánh giá! Đánh giá của bạn đang được chờ duyệt.");
            });
        }
    });

} else {
    // Nếu không tìm thấy sản phẩm
    document.getElementById('product-content').innerHTML = `
        <div style="text-align: center; padding: 50px; background: #fff; border-radius: 8px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
            <h2>Rất tiếc, sản phẩm không tồn tại hoặc đã hết hàng!</h2>
            <a href="index.html" style="color: #d70018; text-decoration: none; font-weight: bold;">Quay lại trang chủ</a>
        </div>
    `;
}