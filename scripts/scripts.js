/**
 * NEXTECH - SCRIPTS.JS (FINAL OPTIMIZED FOR BANNERS & PRODUCTS)
 */

let allProducts = {};
let currentProducts = [];

// 1. Hàm tổng hợp lấy dữ liệu (Sản phẩm & Banner)
async function fetchDataFromDB() {
  try {
    // Lấy danh sách sản phẩm
    const productRes = await fetch(window.apiUrl("/api/public/products"));
    if (!productRes.ok) throw new Error("Không thể tải dữ liệu sản phẩm");
    allProducts = await productRes.json();

    const isHomePage =
      window.location.pathname.includes("index.html") ||
      window.location.pathname.endsWith("/") ||
      window.location.pathname === "";

    if (isHomePage) {
      // Đổ dữ liệu sản phẩm vào trang chủ theo ID
      renderHomeGrid(allProducts["Iphone"], "iphone-grid");
      renderHomeGrid(allProducts["SamSung"], "samsung-grid");
      renderHomeGrid(allProducts["Laptop DELL"], "laptop-grid");
      renderHomeGrid(allProducts["CPU"], "cpu-grid");
      renderHomeGrid(allProducts["RAM"], "ram-grid");
      renderHomeGrid(allProducts["Bàn Phím"], "banphim-grid");
      renderHomeGrid(allProducts["Màn hình ASUS"], "manhinh-grid");

      // Slider đề xuất ngẫu nhiên
      const randomList = Object.values(allProducts)
        .flat()
        .sort(() => 0.5 - Math.random())
        .slice(0, 12);
      renderHomeGrid(randomList, "random-slider");

      // Quan trọng: Gọi hàm nạp Banner ngay sau khi nạp sản phẩm
      await fetchHomeBanners();
    }

    // Xử lý các trang danh mục (sub-pages)
    const container = document.getElementById("productContainer");
    if (container) {
      const category = container.getAttribute("data-category");
      currentProducts = allProducts[category] || [];
      renderProducts(currentProducts);
    }
  } catch (error) {
    console.error("Lỗi kết nối Backend:", error);
  }
}

// 2. Hàm nạp Banner từ Database (Sửa lỗi không lưu/hiển thị banner)
async function fetchHomeBanners() {
  try {
    const res = await fetch(window.apiUrl("/api/public/banners"));
    const banners = await res.json();

    // Định nghĩa bảng tra cứu (Key là position trong DB, Value là tên file ảnh gốc)
    const bannerMap = {
      banner_slider: "nextech-laptop-nvidia-rtx-50-series-slider.jpg",
      ad_monitor: "ads-monitor.png",
      ad_deal: "ads-deal.png",
      ad_laptop: "ads-laptopgaming.png",
      ad_phimco_1: "ads-phimco.png",
      ad_bottom_3: "quangcao3.jpg",
      ad_bottom_4: "quangcao4.jpg",
    };

    banners.forEach((b) => {
      const fileNameOriginal = bannerMap[b.position];
      if (fileNameOriginal) {
        // Tìm tất cả ảnh trên trang có chứa tên file gốc trong thuộc tính src
        const targetImgs = document.querySelectorAll(
          `img[src*="${fileNameOriginal}"]`,
        );

        // Riêng với ads-phimco.png nếu có 2 cái, ta xử lý đặc biệt
        if (b.position === "ad_phimco_1" && targetImgs[0])
          targetImgs[0].src = b.img;
        if (b.position === "ad_phimco_2") {
          const allPhimCo = document.querySelectorAll(
            'img[src*="ads-phimco.png"]',
          );
          if (allPhimCo[1]) allPhimCo[1].src = b.img;
        }

        // Với các ảnh còn lại
        targetImgs.forEach((img) => {
          img.src = b.img;
        });
      }
    });
  } catch (e) {
    console.error("Lỗi đồng bộ Banner:", e);
  }
}
// 3. Hàm hiển thị cho trang chủ (Đã cập nhật logic hiển thị SAO TRUNG BÌNH)
function renderHomeGrid(data, elementId) {
  const grid = document.getElementById(elementId);
  if (!grid || !data) return;

  grid.innerHTML = data
    .map((p) => {
      const discount =
        p.oldPrice > 0
          ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
          : 0;

      // --- KHỐI LOGIC TÍNH SAO ---
      let starsHtml = "";
      const ratingValue = p.rating || 0; // Lấy rating từ DB, nếu null/undefined thì là 0

      for (let i = 1; i <= 5; i++) {
        // Nếu rating > 0 và i nhỏ hơn hoặc bằng số sao đã làm tròn thì màu Vàng (#ffbe00)
        // Ngược lại tất cả đều màu Xám (#ccc)
        const starColor =
          ratingValue > 0 && i <= Math.round(ratingValue) ? "#ffbe00" : "#ccc";
        starsHtml += `<i class="fas fa-star" style="color: ${starColor}; font-size: 11px;"></i>`;
      }
      // ---------------------------

      return `
            <div class="product-card" onclick="window.location.href='product-detail.html?id=${p.id}'" style="cursor: pointer;">
                ${discount > 0 ? `<span class="tag-off">-${discount}%</span>` : ""}
                <div class="product-img-box">
                    <img src="${p.img}" alt="${p.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    
                    <div class="product-rating" style="margin: 5px 0; display: flex; align-items: center; gap: 5px;">
                        <div class="stars">${starsHtml}</div>
                        <span style="font-size: 11px; color: #888;">(${p.review_count || 0})</span>
                    </div>

                    <div class="product-price">${p.price.toLocaleString()}đ</div>
                    ${p.oldPrice > 0 ? `<div style="text-decoration:line-through; color:#999; font-size:12px;">${p.oldPrice.toLocaleString()}đ</div>` : ""}
                </div>
            </div>
        `;
    })
    .join("");
}
// 4. Hàm render trang danh mục
function renderProducts(data) {
  const container = document.getElementById("productContainer");
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 50px;">Đang cập nhật sản phẩm...</p>`;
    return;
  }

  container.innerHTML = data
    .map((p) => {
      const discount =
        p.oldPrice > 0
          ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)
          : 0;
      let specsHtml = '<div class="p-specs">';
      if (p.specs && typeof p.specs === "object") {
        Object.entries(p.specs)
          .slice(0, 3)
          .forEach(([key, value]) => {
            let icon = "fa-info-circle";
            const k = key.toLowerCase();
            if (k.includes("màn hình")) icon = "fa-desktop";
            if (k.includes("chip") || k.includes("cpu")) icon = "fa-microchip";
            if (k.includes("ram")) icon = "fa-memory";
            specsHtml += `<span><i class="fas ${icon}"></i> ${value}</span>`;
          });
      }
      specsHtml += "</div>";

      return `
            <div class="p-card" onclick="window.location.href='product-detail.html?id=${p.id}'" style="cursor: pointer;">
                ${discount > 0 ? `<span class="tag-off">-${discount}%</span>` : ""}
                <img src="${p.img}" alt="${p.name}" loading="lazy">
                <div class="p-name">${p.name}</div>
                ${specsHtml}
                <div class="p-old">${p.oldPrice > 0 ? p.oldPrice.toLocaleString() + "đ" : "&nbsp;"}</div>
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span class="p-price">${p.price.toLocaleString()}đ</span>
              <span style="display:flex; flex-direction:row; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
                <span class="btn-buy btn-add-cart" data-product-id="${p.id}" role="button">Thêm vào giỏ</span>
                <span class="btn-buy btn-buy-now" data-product-id="${p.id}" role="button">Mua ngay</span>
              </span>
                </div>
            </div>
        `;
    })
    .join("");
}

async function addToCartBE2(productId, quantity) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Bạn cần đăng nhập để thêm vào giỏ hàng!");
    window.location.href = "login.html";
    return { ok: false };
  }

  const res = await fetch(window.apiUrl("/api/cart"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ product_id: productId, quantity: quantity || 1 }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    alert("Lỗi: " + ((data && data.msg) || "Không thể thêm vào giỏ"));
    return { ok: false, data };
  }

  return { ok: true, data };
}

function ensureCartLinkInHeader() {
  const headerTools = document.querySelector("header .header-tools");
  if (!headerTools) return;
  if (document.getElementById("cart-tool")) return;

  const cartLink = document.createElement("a");
  cartLink.id = "cart-tool";
  cartLink.href = "order-information.html?cart=1";
  cartLink.className = "tool-item";
  cartLink.innerHTML = `
    <i class="fas fa-shopping-cart"></i>
    <div class="text">
      <span>Giỏ</span>
      <strong>hàng</strong>
    </div>
  `;

  const userAccount = document.getElementById("user-account");
  if (userAccount && userAccount.parentElement === headerTools) {
    headerTools.insertBefore(cartLink, userAccount);
  } else {
    headerTools.appendChild(cartLink);
  }
}

// 5. Khởi chạy khi DOM đã load
document.addEventListener("DOMContentLoaded", () => {
  fetchDataFromDB();
  ensureCartLinkInHeader();

  // BE2 Cart: click "Mua" to add to cart
  const productContainer = document.getElementById("productContainer");
  if (productContainer) {
    productContainer.addEventListener(
      "click",
      async (e) => {
        const addBtn = e.target.closest(".btn-add-cart");
        const buyNowBtn = e.target.closest(".btn-buy-now");
        if (!addBtn && !buyNowBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const btn = addBtn || buyNowBtn;
        const pid = parseInt(btn.getAttribute("data-product-id"), 10);
        if (!pid) return;

        try {
          if (buyNowBtn) {
            window.location.href = `order-information.html?id=${pid}`;
            return;
          }

          const result = await addToCartBE2(pid, 1);
          if (result.ok) {
            window.location.href = "order-information.html?cart=1";
          }
        } catch (err) {
          console.error("Add to cart failed:", err);
          alert("Không thể kết nối đến server!");
        }
      },
      true,
    );
  }

  // Logic Filter
  const filterBtn = document.getElementById("filterToggle");
  const filterMenu = document.getElementById("filterMenu");
  if (filterBtn && filterMenu) {
    filterBtn.onclick = (e) => {
      e.stopPropagation();
      filterMenu.classList.toggle("active");
    };
    document.querySelectorAll(".flt-opt").forEach((opt) => {
      opt.onclick = function () {
        const sortType = this.dataset.sort;
        let sorted = [...currentProducts];
        if (sortType === "low-high") sorted.sort((a, b) => a.price - b.price);
        else sorted.sort((a, b) => b.price - a.price);
        renderProducts(sorted);
        filterMenu.classList.remove("active");
      };
    });
    document.addEventListener("click", () =>
      filterMenu.classList.remove("active"),
    );
  }
});

// --- PHẦN SIDEBAR VÀ OVERLAY ---
document.addEventListener("DOMContentLoaded", function () {
  const categoryBtn = document.querySelector(".category-btn");
  const sidebar = document.querySelector(".sidebar");
  const mainContainer = document.querySelector(".main-container-top");
  const overlay = document.querySelector(".sidebar-overlay");

  const isHomePage =
    window.location.pathname.includes("index.html") ||
    window.location.pathname.endsWith("/") ||
    window.location.pathname === "";

  if (sidebar) {
    if (isHomePage) {
      sidebar.classList.remove("subpage-popup");
      if (mainContainer) mainContainer.classList.add("sidebar-active");
    } else {
      sidebar.classList.add("subpage-popup");
    }
  }

  if (categoryBtn && sidebar) {
    categoryBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (isHomePage) {
        if (mainContainer) mainContainer.classList.toggle("sidebar-active");
      } else {
        sidebar.classList.toggle("show");
        if (overlay) overlay.classList.toggle("active");
      }
    });

    document.addEventListener("click", function (e) {
      if (
        !isHomePage &&
        sidebar &&
        !sidebar.contains(e.target) &&
        !categoryBtn.contains(e.target)
      ) {
        sidebar.classList.remove("show");
        if (overlay) overlay.classList.remove("active");
      }
    });
  }
});
