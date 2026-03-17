/**
 * Dữ liệu sản phẩm mẫu
 */
const productsData = [
    { id: 1, name: "Laptop ASUS ROG Strix G16 (2025)", price: "38.990.000đ", img: "https://via.placeholder.com/200x160?text=Laptop" },
    { id: 2, name: "PC GVN Phantom Plus i7/RTX 4070", price: "45.500.000đ", img: "https://via.placeholder.com/200x160?text=PC" },
    { id: 3, name: "Màn hình Samsung Odyssey G7 2K 240Hz", price: "13.200.000đ", img: "https://via.placeholder.com/200x160?text=Monitor" },
    { id: 4, name: "Chuột Gaming Logitech G Pro X Superlight", price: "3.100.000đ", img: "https://via.placeholder.com/200x160?text=Mouse" },
    { id: 5, name: "Bàn phím AKKO 3098B Multi-modes", price: "2.250.000đ", img: "https://via.placeholder.com/200x160?text=Keyboard" },
];

/**
 * Hàm hiển thị danh sách sản phẩm
 */
function renderProducts() {
    const container = document.getElementById('productContainer');
    if (!container) return;

    // Sử dụng map và join để tối ưu hiệu năng render
    const htmlContent = productsData.map(item => `
        <div class="card">
            <div class="img-box">
                <img src="${item.img}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain;">
            </div>
            <div class="p-name">${item.name}</div>
            <div class="p-price">${item.price}</div>
            <button class="btn-buy">MUA NGAY</button>
        </div>
    `).join('');

    container.innerHTML = htmlContent;
}

/**
 * Xử lý sự kiện tìm kiếm
 */
function initSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                alert("NexTech đang tìm: " + query);
            } else {
                alert("Vui lòng nhập từ khóa!");
            }
        });
    }
}

/**
 * Khởi tạo khi trang web tải xong
 */
document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    initSearch();
});