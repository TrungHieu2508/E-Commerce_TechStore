document.addEventListener('DOMContentLoaded', function() {
    const categoryBtn = document.querySelector('.category-btn');
    const mainContainer = document.querySelector('.main-container-top');
    const categoryDropdown = document.querySelector('.category-dropdown');
    let sidebarIsActive = false;

    // Hàm xử lý chung để Mở/Đóng
    function toggleSidebar(forceClose = false) {
        if (forceClose) {
            sidebarIsActive = false;
        } else {
            sidebarIsActive = !sidebarIsActive;
        }

        if (sidebarIsActive) {
            // Kiểm tra vị trí cuộn trang
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            
            if (scrollY < 200) {
                // TRẠNG THÁI 1: < 200px (Đầu trang) -> Làm sáng menu (NHƯ CŨ)
                if (mainContainer) mainContainer.classList.add('sidebar-active');
                if (categoryDropdown) {
                    categoryDropdown.classList.add('active');
                    categoryDropdown.classList.remove('fixed-mode');
                    categoryDropdown.style.left = ''; // Reset CSS left
                }
            } else {
                // TRẠNG THÁI 2: > 200px (Cuộn xuống) -> Fixed menu, không làm sáng nền
                if (mainContainer) mainContainer.classList.remove('sidebar-active');
                if (categoryDropdown) {
                    categoryDropdown.classList.add('active', 'fixed-mode');
                    
                    // Lấy vị trí lề trái chính xác của nút Danh mục để dropdown nằm thẳng hàng
                    const btnRect = categoryBtn.getBoundingClientRect();
                    categoryDropdown.style.left = btnRect.left + 'px';
                }
            }
        } else {
            // ĐÓNG SIDEBAR
            if (mainContainer) mainContainer.classList.remove('sidebar-active');
            if (categoryDropdown) {
                categoryDropdown.classList.remove('active', 'fixed-mode');
                categoryDropdown.style.left = '';
            }
        }
    }

    // Khi click vào nút Danh mục
    if (categoryBtn) {
        categoryBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleSidebar(); // Gọi hàm bật/tắt
        });
    }

    // Đóng sidebar khi click ra ngoài
    document.addEventListener('click', function(event) {
        const isClickInsideDropdown = categoryDropdown && categoryDropdown.contains(event.target);
        const isClickOnCategoryBtn = categoryBtn && categoryBtn.contains(event.target);

        // Nếu click ra ngoài và menu đang mở -> Ép đóng
        if (!isClickInsideDropdown && !isClickOnCategoryBtn && sidebarIsActive) {
            toggleSidebar(true); 
        }
    });

    // Tùy chọn: Đóng khi nhấn phím Esc
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && sidebarIsActive) {
            toggleSidebar(true);
        }
    });
});
//banner động
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.querySelector('.hero-slider');
    const slides = document.querySelectorAll('.hero-slider img');
    let currentIndex = 0;
    const totalSlides = slides.length;

    // Hàm chuyển slide
    function nextSlide() {
        currentIndex++;
        
        // Nếu đi đến cuối danh sách, quay lại ảnh đầu tiên
        if (currentIndex >= totalSlides) {
            currentIndex = 0;
        }
        
        // Tính toán khoảng cách dịch chuyển (mỗi bước là 100% / số lượng ảnh)
        const translateValue = currentIndex * (100 / totalSlides);
        slider.style.transform = `translateX(-${translateValue}%)`;
    }

    // Tự động chạy sau mỗi 4000ms (4 giây)
    let slideInterval = setInterval(nextSlide, 4000);

    // (Tùy chọn) Dừng chuyển khi di chuột vào banner
    const heroBanner = document.querySelector('.hero-banner');
    if (heroBanner) {
        heroBanner.addEventListener('mouseenter', () => clearInterval(slideInterval));
        heroBanner.addEventListener('mouseleave', () => {
            slideInterval = setInterval(nextSlide, 4000);
        });
    }
});

// Xử lý bộ lọc
document.addEventListener('DOMContentLoaded', function() {
    // Lấy tất cả các brand-section
    const brandSections = document.querySelectorAll('.brand-section');

    brandSections.forEach(section => {
        const filterBtn = section.querySelector('.filter-btn');
        const filterMenu = section.querySelector('.filter-menu');
        const products = section.querySelectorAll('.product-card');

        if (filterBtn && filterMenu && products.length > 0) {
            // 1. Đóng/Mở menu khi click nút
            filterBtn.addEventListener('click', () => {
                filterMenu.classList.toggle('show');
            });

            // 2. Xử lý khi chọn khoảng giá
            filterMenu.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', function() {
                    const range = this.getAttribute('data-range');

                    products.forEach(product => {
                        const price = parseInt(product.getAttribute('data-price'));

                        if (range === 'all') {
                            product.style.display = 'block';
                        } else {
                            const [min, max] = range.split('-').map(Number);
                            if (price >= min && price <= max) {
                                product.style.display = 'block';
                            } else {
                                product.style.display = 'none';
                            }
                        }
                    });

                    // Đóng menu sau khi chọn
                    filterMenu.classList.remove('show');
                    // Cập nhật text trên nút để user biết đang lọc gì
                    filterBtn.innerHTML = `<i class="fa-solid fa-filter"></i> ${this.innerText}`;
                });
            });

            // Click ra ngoài để đóng menu
            window.addEventListener('click', function(event) {
                if (!filterBtn.contains(event.target) && !filterMenu.contains(event.target)) {
                    filterMenu.classList.remove('show');
                }
            });
        }
    });
});