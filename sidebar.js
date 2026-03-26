/**
 * PROJECT: NEXTECH E-COMMERCE
 * FILE: scripts.js
 * CHỨC NĂNG: Render sản phẩm, Sidebar Menu, Hero Slider, Tìm kiếm & Bộ lọc
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. KHỞI TẠO DỮ LIỆU SẢN PHẨM ---
    // Giả sử biến allProducts đã được định nghĩa ở file data.js hoặc phía trên
       if (typeof allProducts !== 'undefined') {
        renderProductsByCategory('SamSung', 'samsung-grid', 8);
        renderProductsByCategory('Màn hình ASUS', 'manhinh-grid', 8);
        renderProductsByCategory('Iphone', 'iphone-grid', 8);
        renderProductsByCategory('Bàn Phím', 'banphim-grid', 8);
        renderProductsByCategory('CPU', 'cpu-grid', 8);
        renderProductsByCategory('RAM', 'ram-grid', 8);
    }

    // =============================
    // 🔥 2. SIDEBAR (ĐÃ FIX FULL)
    // =============================
    const categoryBtn = document.querySelector('.category-btn');
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container-top');
    const overlay = document.querySelector('.sidebar-overlay');

    let isMenuOpen = false;

    if (categoryBtn && sidebar) {

        // 👉 CLICK DANH MỤC
        categoryBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            const scrollY = window.scrollY || document.documentElement.scrollTop;

            if (isMenuOpen) {
                closeMenu();
                return;
            }

            isMenuOpen = true;

            // 🟢 ĐẦU TRANG
            if (scrollY < 200) {
                openNormalSidebar();
            } 
            // 🔵 ĐÃ SCROLL
            else {
                openFixedSidebar();
            }
        });

        // 👉 MỞ SIDEBAR BÌNH THƯỜNG
        function openNormalSidebar() {
            mainContainer.classList.add('sidebar-active');

            sidebar.classList.remove('is-fixed');
            sidebar.style.cssText = "";
        }

        // 👉 MỞ SIDEBAR FIXED (GIỐNG GEARVN)
        function openFixedSidebar() {
            const rect = sidebar.getBoundingClientRect();

            mainContainer.classList.add('sidebar-active');
            sidebar.classList.add('is-fixed');

            sidebar.style.top = "120px";
            sidebar.style.left = rect.left + "px";
            sidebar.style.width = rect.width + "px";

            // 👉 Lưu vị trí gốc để dùng lại
            sidebar.dataset.originalLeft = rect.left;
        }

        // 👉 ĐÓNG MENU
        function closeMenu() {
            isMenuOpen = false;

            mainContainer.classList.remove('sidebar-active');

            sidebar.classList.remove('is-fixed');
            sidebar.style.cssText = "";
        }

        // 👉 CLICK NGOÀI → ĐÓNG
        document.addEventListener('click', function (e) {
            if (!sidebar.contains(e.target) && !categoryBtn.contains(e.target)) {
                closeMenu();
            }
        });

        // 👉 CLICK OVERLAY → ĐÓNG
        if (overlay) {
            overlay.addEventListener('click', closeMenu);
        }

        // 👉 SCROLL → TỰ KHỚP LẠI
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;

            if (sidebar.classList.contains('is-fixed') && scrollY < 200) {
                sidebar.classList.remove('is-fixed');
                sidebar.style.cssText = "";
            }
        });

        // 👉 FIX LỆCH KHI RESIZE (CỰC QUAN TRỌNG)
        window.addEventListener('resize', () => {
            if (!sidebar.classList.contains('is-fixed')) return;

            const rect = mainContainer.getBoundingClientRect();
            sidebar.style.left = rect.left + "px";
        });
    }

    // --- 3. SEARCH (GIỮ NGUYÊN) ---
    const searchInput = document.getElementById('searchInput');
const dropdown = document.getElementById('searchDropdown');

if (searchInput && dropdown) {
    searchInput.addEventListener('input', function () {
        const keyword = this.value.toLowerCase().trim();

        // Nếu rỗng → ẩn
        if (!keyword) {
            dropdown.style.display = 'none';
            return;
        }

        // Lấy tất cả sản phẩm
        const allItems = Object.values(allProducts).flat();

        // Lọc sản phẩm
        const results = allItems.filter(p =>
            p.name.toLowerCase().includes(keyword)
        ).slice(0, 6); // tối đa 6 item

        // Không có kết quả
        if (results.length === 0) {
            dropdown.innerHTML = `
                <div style="padding:10px; color:#666;">
                    Không tìm thấy sản phẩm
                </div>
            `;
            dropdown.style.display = 'block';
            return;
        }

        // Render dropdown
        dropdown.innerHTML = results.map(p => `
            <div class="search-item" data-id="${p.id}">
                <img src="${p.img}" alt="${p.name}">
                <div>
                    <div class="name" style="color:#000;">${p.name}</div>
                    <div class="price">${p.price.toLocaleString()} VNĐ</div>
                </div>
            </div>
        `).join('');

        dropdown.style.display = 'block';
    });

    // 👉 CLICK vào sản phẩm → sang trang chi tiết
    dropdown.addEventListener('click', function (e) {
        const item = e.target.closest('.search-item');
        if (!item) return;

        const id = item.getAttribute('data-id');
        window.location.href = `product-detail.html?id=${id}`;
    });

    // 👉 CLICK ngoài → ẩn dropdown
    document.addEventListener('click', function (e) {
        if (!document.querySelector('.search-bar').contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}
    


    // --- 4. BANNER ĐỘNG (HERO SLIDER) ---
    const slider = document.querySelector('.hero-slider');
    const slides = document.querySelectorAll('.hero-slider img');
    if (slider && slides.length > 0) {
        let currentIndex = 0;
        const totalSlides = slides.length;

        function nextSlide() {
            currentIndex = (currentIndex + 1) % totalSlides;
            const translateValue = currentIndex * (100 / totalSlides);
            slider.style.transform = `translateX(-${translateValue}%)`;
        }

        let slideInterval = setInterval(nextSlide, 4000);

        const heroBanner = document.querySelector('.hero-banner');
        if (heroBanner) {
            heroBanner.addEventListener('mouseenter', () => clearInterval(slideInterval));
            heroBanner.addEventListener('mouseleave', () => {
                slideInterval = setInterval(nextSlide, 4000);
            });
        }
    }

    // --- 5. BỘ LỌC GIÁ (FILTER) ---
    const brandSections = document.querySelectorAll('.brand-section');
    brandSections.forEach(section => {
        const filterBtn = section.querySelector('.filter-btn');
        const filterMenu = section.querySelector('.filter-menu');
        
        if (filterBtn && filterMenu) {
            filterBtn.addEventListener('click', () => filterMenu.classList.toggle('show'));

            filterMenu.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', function() {
                    const range = this.getAttribute('data-range');
                    const cards = section.querySelectorAll('.product-card');

                    cards.forEach(card => {
                        // Lấy giá từ thuộc tính data-price bạn đã đặt trong HTML
                        const price = parseInt(card.getAttribute('data-price')) || 0;
                        if (range === 'all') {
                            card.style.display = 'block';
                        } else {
                            const [min, max] = range.split('-').map(Number);
                            card.style.display = (price >= min && price <= max) ? 'block' : 'none';
                        }
                    });
                    filterMenu.classList.remove('show');
                    filterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> ${this.innerText}`;
                });
            });
        }
    });
});

/** --- HÀM TRỢ GIÚP NGOÀI SCOPE DOM --- **/

function createProductCard(p) {
    return `
        <div class="product-card" data-price="${p.price}">
            <div class="product-img-box">
                <a href="product-detail.html?id=${p.id}">
                    <img src="${p.img}" alt="${p.name}">
                </a>
            </div>
            <div class="product-info">
                <a href="product-detail.html?id=${p.id}">
                    <div class="product-name">${p.name}</div>
                </a>
                <div class="product-price">${p.price.toLocaleString()} VNĐ</div>
                <div class="product-rating">
                    <div class="stars">
                        ${'<span class="star-icon fill">★</span>'.repeat(5)}
                    </div>
                    <span class="rating-count">(10 lượt đánh giá)</span>
                </div>
            </div>
        </div>
    `;
}

function renderProductsByCategory(cat, containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container || !allProducts[cat]) return;
    const data = allProducts[cat].slice(0, limit);
    container.innerHTML = data.map(p => createProductCard(p)).join('');
}

/**Hàm xử lý chỗ đề suất cho bạn á. Các ảnh chạy ngang random */
 function renderRandomSlider() {
    const slider = document.getElementById('random-slider');
    if (!slider || typeof allProducts === 'undefined') return;

    // Lấy tất cả sản phẩm
    let everyProducts = [];
    for (let cat in allProducts) {
        everyProducts = everyProducts.concat(allProducts[cat]);
    }

    // Trộn ngẫu nhiên
    everyProducts.sort(() => Math.random() - 0.5);

    // Lấy khoảng 15 sản phẩm để nhìn cho đông đúc
    const selectedProducts = everyProducts.slice(0, 15);

    // Render (Hàm createProductCard lấy từ sidebar.js của bạn)
    const productHtml = selectedProducts.map(p => createProductCard(p)).join('');
    
    // Nhân đôi để tạo vòng lặp vô tận
    slider.innerHTML = productHtml + productHtml;
}

// Gọi hàm khi trang web tải xong
document.addEventListener('DOMContentLoaded', renderRandomSlider);