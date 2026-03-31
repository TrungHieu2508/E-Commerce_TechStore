let currentStep = 1;
let foundProduct = null;
let orderData = { customer: {}, product: {}, orderDate: "" };

// 1. Khởi tạo sản phẩm
const urlParams = new URLSearchParams(window.location.search);
const productId = parseInt(urlParams.get('id'));
const displayImg = document.getElementById('display-order-img');

if (typeof allProducts !== 'undefined') {
    for (let key in allProducts) {
        let item = allProducts[key].find(p => p.id === productId);
        if (item) { foundProduct = item; break; }
    }
    if (foundProduct) displayImg.src = foundProduct.img;
}

// 2. Tỉnh/Thành API
const provinceSelect = document.getElementById('province');
const districtSelect = document.getElementById('district');
const wardSelect = document.getElementById('ward');

fetch('https://provinces.open-api.vn/api/?depth=3')
    .then(res => res.json())
    .then(data => {
        data.forEach(p => provinceSelect.add(new Option(p.name, p.name)));
        provinceSelect.onchange = () => {
            districtSelect.length = 1; wardSelect.length = 1;
            const p = data.find(x => x.name === provinceSelect.value);
            if (p) p.districts.forEach(d => districtSelect.add(new Option(d.name, d.name)));
        };
        districtSelect.onchange = () => {
            wardSelect.length = 1;
            const p = data.find(x => x.name === provinceSelect.value);
            const d = p.districts.find(x => x.name === districtSelect.value);
            if (d) d.wards.forEach(w => wardSelect.add(new Option(w.name, w.name)));
        };
    });

// 3. Điều hướng
function handleNext() {
    if (currentStep === 1) {
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        if (!name || !phone || !provinceSelect.value) {
            alert("Vui lòng điền đầy đủ thông tin!"); return;
        }
        orderData.customer = {
            name, phone,
            address: `${document.getElementById('detailAddress').value}, ${wardSelect.value}, ${districtSelect.value}, ${provinceSelect.value}`
        };
    }

    if (currentStep < 3) {
        toggleStep(currentStep, false);
        currentStep++;
        toggleStep(currentStep, true);

        if (currentStep === 3) {
            renderFinalOrder();
            const nextBtn = document.getElementById('mainNextBtn');
            document.querySelector('.btn-prev').style.display = 'none';
            document.querySelector('.order-footer-btns').classList.add('finish-state');
            nextBtn.innerHTML = '<i class="fas fa-home"></i> HOÀN TẤT & VỀ TRANG CHỦ';
            nextBtn.className = 'btn-order btn-finish';

// Thay thế đoạn này trong file đặt hàng của bạnbạnbạn///
            nextBtn.onclick = function() {
                // Lưu đơn hàng vào localStorage trước khi về trang chủ
                const orders = JSON.parse(localStorage.getItem('nextech_orders') || '[]');
                const newOrder = {
                    id: "ORD" + Date.now(),
                    productName: foundProduct ? foundProduct.name : 'Sản phẩm NexTech',
                    productImg: displayImg.src,
                    price: foundProduct ? foundProduct.price : 'Liên hệ',
                    customerName: orderData.customer.name,
                    status: 'processing', // Trạng thái mặc định: Đang xử lý
                    orderDate: new Date().toLocaleString('vi-VN')
                };
                orders.push(newOrder);
                localStorage.setItem('nextech_orders', JSON.stringify(orders));
                
                window.location.href = "index.html"; 
            };
        }
    }
}

function handlePrev() {
    if (currentStep === 1) { window.history.back(); return; }
    toggleStep(currentStep, false);
    currentStep--;
    toggleStep(currentStep, true);
}

function toggleStep(step, isActive) {
    const method = isActive ? 'add' : 'remove';
    document.getElementById(`step-${step}`).classList[method]('active');
    document.getElementById(`st-${step}`).classList[method]('active');
}

function renderFinalOrder() {
    const now = new Date();
    const summaryBox = document.getElementById('order-summary-card');
    summaryBox.style.border = "none";
    summaryBox.style.boxShadow = "0 5px 20px rgba(0,0,0,0.05)";
    summaryBox.innerHTML = `
        <div class="summary-item" style="padding: 10px;">
            <img src="${displayImg.src}" width="100" style="border-radius:12px; border: 1px solid #eee">
            <div class="summary-info" style="margin-left: 20px;">
                <h4 style="margin:0; color:#333;">${foundProduct ? foundProduct.name : 'Sản phẩm'}</h4>
                <p class="price-red">${foundProduct ? foundProduct.price : 'Liên hệ'} VNĐ</p>
                <p style="font-size:12px;"><i class="far fa-calendar-alt"></i> ${now.toLocaleString('vi-VN')}</p>
                <hr style="border:0; border-top:1px dashed #ddd; margin:10px 0;">
                <p><b>${orderData.customer.name}</b></p>
                <p style="font-size:11px; color:#666;">${orderData.customer.address}</p>
            </div>
        </div>`;
}