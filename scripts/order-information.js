let currentStep = 1;
let foundProduct = null;
let orderData = { customer: {}, product: {}, orderDate: "" };
let cartItems = [];

let isSubmittingOrder = false;

let selectedPaymentMethod = "cod";
let walletPaymentConfirmed = false;

const IDEM_KEY_STORAGE = "order_idempotency_key";

function getOrCreateOrderIdempotencyKey() {
  let key = null;
  try {
    key = sessionStorage.getItem(IDEM_KEY_STORAGE);
  } catch {
    key = null;
  }
  if (key) return key;

  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    key = window.crypto.randomUUID();
  } else {
    key = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  try {
    sessionStorage.setItem(IDEM_KEY_STORAGE, key);
  } catch {
    // ignore
  }
  return key;
}

function clearOrderIdempotencyKey() {
  try {
    sessionStorage.removeItem(IDEM_KEY_STORAGE);
  } catch {
    // ignore
  }
}

let locationsData = null;
let locationsLoadFailed = false;

// 1. Khởi tạo sản phẩm
const urlParams = new URLSearchParams(window.location.search);
const orderProductId = parseInt(urlParams.get("id"));
const displayImg = document.getElementById("display-order-img");

const isCartMode =
  urlParams.get("cart") === "1" || Number.isNaN(orderProductId);

async function loadProductForOrder() {
  try {
    const res = await fetch(window.apiUrl("/api/public/products"));
    const allProductsFromDB = await res.json();
    for (let key in allProductsFromDB) {
      let item = allProductsFromDB[key].find((p) => p.id === orderProductId);
      if (item) {
        foundProduct = item;
        break;
      }
    }
    if (foundProduct && displayImg) displayImg.src = foundProduct.img;
  } catch (e) {
    console.error("Không thể tải sản phẩm:", e);
  }
}

function requireLoginForBE2() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Bạn cần đăng nhập để sử dụng giỏ hàng/đặt hàng!");
    window.location.href = "login.html";
    return null;
  }
  return token;
}

async function fetchCartItems() {
  const token = requireLoginForBE2();
  if (!token) return null;

  const res = await fetch(window.apiUrl("/api/cart"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    alert("Lỗi tải giỏ hàng: " + (data.msg || "Không thể tải giỏ hàng"));
    return null;
  }
  return Array.isArray(data) ? data : [];
}

function ensureCartUIContainer() {
  const step1 = document.getElementById("step-1");
  if (!step1) return null;

  let box = document.getElementById("cart-box");
  if (box) return box;

  const wrapper = document.createElement("div");
  wrapper.id = "cart-box";
  wrapper.style.marginTop = "20px";
  wrapper.innerHTML = `
        <div style="background:#fff; border-radius:10px; padding:15px;">
            <h3 style="margin:0 0 10px;">Giỏ hàng của bạn</h3>
            <div id="cart-items" style="display:flex; flex-direction:column; gap:10px;"></div>
            <div id="cart-total" style="margin-top:10px; font-weight:700;"></div>
        </div>
    `;

  step1.appendChild(wrapper);
  return wrapper;
}

async function updateCartItemBE2(itemId, quantity) {
  const token = requireLoginForBE2();
  if (!token) return false;

  const res = await fetch(window.apiUrl(`/api/cart/${itemId}`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert("Lỗi cập nhật giỏ hàng: " + (data.msg || "Không thể cập nhật"));
    return false;
  }
  return true;
}

async function deleteCartItemBE2(itemId) {
  const token = requireLoginForBE2();
  if (!token) return false;

  const res = await fetch(window.apiUrl(`/api/cart/${itemId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert("Lỗi xóa sản phẩm khỏi giỏ: " + (data.msg || "Không thể xóa"));
    return false;
  }
  return true;
}

function renderCartUI() {
  ensureCartUIContainer();
  const list = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!list || !totalEl) return;

  if (!cartItems || cartItems.length === 0) {
    list.innerHTML = '<p style="margin:0; color:#666;">Giỏ hàng trống.</p>';
    totalEl.textContent = "";
    return;
  }

  const total = cartItems.reduce(
    (sum, it) => sum + (parseInt(it.subtotal || 0) || 0),
    0,
  );
  totalEl.textContent = "Tổng: " + total.toLocaleString("vi-VN") + "đ";

  list.innerHTML = cartItems
    .map((it) => {
      return `
            <div class="cart-row" data-item-id="${it.id}" style="display:flex; gap:10px; align-items:center; border:1px solid #eee; border-radius:10px; padding:10px;">
                <img src="${it.img}" alt="${it.name}" style="width:60px; height:60px; object-fit:contain; border-radius:8px; border:1px solid #f1f1f1; background:#fff;" />
                <div style="flex:1;">
                    <div style="font-weight:600; color:#333;">${it.name}</div>
                    <div style="font-size:12px; color:#666;">${(parseInt(it.price || 0) || 0).toLocaleString("vi-VN")}đ</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                    <input class="cart-qty" type="number" min="1" value="${it.quantity}" style="width:70px; padding:6px; border:1px solid #ddd; border-radius:8px;" />
                    <button class="cart-del" type="button" style="background:none; border:none; color:#d70018; cursor:pointer; font-size:12px;">Xóa</button>
                </div>
            </div>
        `;
    })
    .join("");

  list.querySelectorAll(".cart-qty").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const row = e.target.closest(".cart-row");
      const itemId = parseInt(row?.getAttribute("data-item-id") || "0", 10);
      const qty = parseInt(e.target.value || "0", 10);
      if (!itemId) return;
      if (!qty || qty < 1) {
        e.target.value = "1";
        return;
      }
      const ok = await updateCartItemBE2(itemId, qty);
      if (!ok) return;

      const refreshed = await fetchCartItems();
      if (refreshed) {
        cartItems = refreshed;
        renderCartUI();
      }
    });
  });

  list.querySelectorAll(".cart-del").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const row = e.target.closest(".cart-row");
      const itemId = parseInt(row?.getAttribute("data-item-id") || "0", 10);
      if (!itemId) return;
      if (!confirm("Xóa sản phẩm này khỏi giỏ hàng?")) return;
      const ok = await deleteCartItemBE2(itemId);
      if (!ok) return;
      const refreshed = await fetchCartItems();
      cartItems = refreshed || [];
      renderCartUI();
    });
  });
}

// 2. Tỉnh/Thành API
const provinceSelect = document.getElementById("province");
const districtSelect = document.getElementById("district");
const wardSelect = document.getElementById("ward");

function setSelectLoadingState(isLoading) {
  const selects = [provinceSelect, districtSelect, wardSelect].filter(Boolean);
  selects.forEach((s) => {
    s.disabled = !!isLoading;
  });
}

function resetLocationSelects() {
  if (provinceSelect) provinceSelect.length = 1;
  if (districtSelect) districtSelect.length = 1;
  if (wardSelect) wardSelect.length = 1;
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = data && data.msg ? data.msg : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function bindLocationEvents(data) {
  if (!provinceSelect || !districtSelect || !wardSelect) return;

  provinceSelect.onchange = () => {
    districtSelect.length = 1;
    wardSelect.length = 1;
    const p = data.find((x) => x.name === provinceSelect.value);
    if (p && Array.isArray(p.districts)) {
      p.districts.forEach((d) =>
        districtSelect.add(new Option(d.name, d.name)),
      );
    }
  };

  districtSelect.onchange = () => {
    wardSelect.length = 1;
    const p = data.find((x) => x.name === provinceSelect.value);
    const d = p?.districts?.find((x) => x.name === districtSelect.value);
    if (d && Array.isArray(d.wards)) {
      d.wards.forEach((w) => wardSelect.add(new Option(w.name, w.name)));
    }
  };
}

async function initLocationSelectors() {
  if (!provinceSelect || !districtSelect || !wardSelect) return;

  locationsLoadFailed = false;
  setSelectLoadingState(true);
  resetLocationSelects();

  try {
    try {
      // 1) Direct source first
      const directUrl = "https://provinces.open-api.vn/api/?depth=3";
      const data = await fetchJsonWithTimeout(directUrl, 8000);
      if (!Array.isArray(data))
        throw new Error("Dữ liệu locations không hợp lệ");

      locationsData = data;
      data.forEach((p) => provinceSelect.add(new Option(p.name, p.name)));
      bindLocationEvents(data);
      return;
    } catch (e) {
      console.warn(
        "Direct locations fetch failed, fallback to backend proxy:",
        e,
      );
    }

    try {
      // 2) Fallback: backend proxy (same-origin)
      const proxyUrl = window.apiUrl("/api/public/locations?depth=3");
      const data = await fetchJsonWithTimeout(proxyUrl, 8000);
      if (!Array.isArray(data))
        throw new Error("Dữ liệu locations proxy không hợp lệ");

      locationsData = data;
      data.forEach((p) => provinceSelect.add(new Option(p.name, p.name)));
      bindLocationEvents(data);
    } catch (e) {
      console.error("Locations proxy fetch failed:", e);
      locationsData = null;
      locationsLoadFailed = true;
      alert(
        "Không tải được danh sách Tỉnh/Thành. Vui lòng kiểm tra mạng hoặc thử lại sau.",
      );
    }
  } finally {
    setSelectLoadingState(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLocationSelectors();
});

function isValidEmail(email) {
  const v = String(email || "").trim();
  // Keep in sync with backend regex (register/create_order)
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return emailRegex.test(v);
}

function isWalletPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "momo" || m === "napas" || m === "bank";
}

function getPaymentMethodText(method) {
  const m = String(method || "").toLowerCase();
  if (m === "momo") return "Ví MoMo";
  if (m === "bank") return "Chuyển khoản ngân hàng";
  if (m === "napas") return "Thẻ ATM/Napas";
  return "Thanh toán khi nhận hàng (COD)";
}

function updatePaymentUI() {
  const label = document.getElementById("paymentMethodLabel");
  if (label) label.textContent = getPaymentMethodText(selectedPaymentMethod);

  const hint = document.getElementById("paymentHint");
  const paidArea = document.getElementById("walletPaidArea");
  const paidBtn = document.getElementById("markPaidBtn");
  const nextBtn = document.getElementById("mainNextBtn");

  if (currentStep !== 2) {
    if (nextBtn) nextBtn.disabled = false;
    if (paidArea) paidArea.style.display = "none";
    return;
  }

  if (isWalletPaymentMethod(selectedPaymentMethod)) {
    if (paidArea) paidArea.style.display = "block";
    if (nextBtn) nextBtn.disabled = !walletPaymentConfirmed;
    if (paidBtn) {
      paidBtn.disabled = walletPaymentConfirmed;
      paidBtn.textContent = walletPaymentConfirmed
        ? "Đã xác nhận thanh toán"
        : "Đã thanh toán";
    }
    if (hint) {
      hint.textContent = walletPaymentConfirmed
        ? "Đã xác nhận thanh toán. Bạn có thể tiếp tục."
        : "";
    }
    return;
  }

  if (paidArea) paidArea.style.display = "none";
  if (nextBtn) nextBtn.disabled = false;

  if (hint) {
    if (String(selectedPaymentMethod || "").toLowerCase() === "cod") {
      hint.textContent = "Bạn sẽ thanh toán khi nhận hàng.";
    } else {
      hint.textContent = "";
    }
  }
}

function initPaymentUI() {
  const select = document.getElementById("paymentMethod");
  const paidBtn = document.getElementById("markPaidBtn");
  if (!select) return;

  selectedPaymentMethod = select.value || "cod";
  walletPaymentConfirmed = false;

  select.addEventListener("change", () => {
    selectedPaymentMethod = select.value || "cod";
    walletPaymentConfirmed = false;
    updatePaymentUI();
  });

  if (paidBtn) {
    paidBtn.addEventListener("click", (e) => {
      e.preventDefault();
      walletPaymentConfirmed = true;
      updatePaymentUI();
      // Proceed to confirmation (step 3)
      if (currentStep === 2) handleNext();
    });
  }

  updatePaymentUI();
}

// 3. Điều hướng
function handleNext() {
  if (currentStep === 1) {
    const name = String(
      document.getElementById("customerName").value || "",
    ).trim();
    const phone = String(
      document.getElementById("customerPhone").value || "",
    ).trim();
    const email = String(
      document.getElementById("customerEmail")?.value || "",
    ).trim();
    const hasProvinceOptions =
      !!provinceSelect &&
      provinceSelect.options &&
      provinceSelect.options.length > 1;
    if (!name || !phone || (hasProvinceOptions && !provinceSelect.value)) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (email && !isValidEmail(email)) {
      alert("Định dạng Email không hợp lệ!");
      return;
    }

    const detail = (
      document.getElementById("detailAddress")?.value || ""
    ).trim();
    const ward = (wardSelect?.value || "").trim();
    const district = (districtSelect?.value || "").trim();
    const province = (provinceSelect?.value || "").trim();

    const parts = [detail, ward, district, province].filter(
      (x) => x && x.length > 0,
    );
    orderData.customer = {
      name,
      phone,
      address: parts.join(", "),
      email,
    };
  }

  if (currentStep === 2 && isCartMode) {
    if (!cartItems || cartItems.length === 0) {
      alert("Giỏ hàng trống, không thể đặt hàng.");
      return;
    }
  }

  if (currentStep === 2) {
    const method = String(selectedPaymentMethod || "cod").toLowerCase();
    if (isWalletPaymentMethod(method) && !walletPaymentConfirmed) {
      alert("Vui lòng bấm “Đã thanh toán” để tiếp tục.");
      updatePaymentUI();
      return;
    }
  }

  if (currentStep < 3) {
    toggleStep(currentStep, false);
    currentStep++;
    toggleStep(currentStep, true);

    updatePaymentUI();

    if (currentStep === 3) {
      renderFinalOrder();
      const nextBtn = document.getElementById("mainNextBtn");
      document.querySelector(".btn-prev").style.display = "none";
      document
        .querySelector(".order-footer-btns")
        .classList.add("finish-state");
      nextBtn.innerHTML = '<i class="fas fa-home"></i> HOÀN TẤT & VỀ TRANG CHỦ';
      nextBtn.className = "btn-order btn-finish";

      nextBtn.onclick = async function () {
        if (isSubmittingOrder) return;
        const token = requireLoginForBE2();
        if (!token) return;
        if (!isCartMode && !foundProduct) {
          alert("Không tìm thấy sản phẩm để đặt hàng.");
          return;
        }

        isSubmittingOrder = true;
        const oldHtml = nextBtn.innerHTML;
        nextBtn.disabled = true;
        nextBtn.innerHTML = "Đang xử lý...";

        // Idempotency key: protect against double-click / retry
        const idemKey = getOrCreateOrderIdempotencyKey();

        const customerPayload = {
          name: orderData.customer.name,
          phone: orderData.customer.phone,
          address: orderData.customer.address,
        };

        const emailValue = String(orderData.customer.email || "").trim();
        if (emailValue) {
          customerPayload.email = emailValue;
        }

        const payload = { customer: customerPayload };

        // Persist selected payment method on the order (for order detail view)
        payload.payment_method = String(
          selectedPaymentMethod || "cod",
        ).toLowerCase();

        // Fallback for some clients/environments: also send key in JSON body.
        payload.idempotency_key = idemKey;

        if (!isCartMode) {
          payload.items = [{ product_id: foundProduct.id, quantity: 1 }];
        } else {
          payload.clear_cart = true;
        }

        try {
          const res = await fetch(window.apiUrl("/api/orders"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "Idempotency-Key": idemKey,
            },
            body: JSON.stringify(payload),
          });

          const data = await res.json();
          if (res.ok) {
            clearOrderIdempotencyKey();
            const emailStatus = data.email_sent
              ? "\nĐã gửi email xác nhận đơn hàng."
              : `\nĐơn hàng đã tạo nhưng chưa gửi được email (${data.email_error || "kiểm tra cấu hình SMTP"}).`;
            alert(
              "Đặt hàng thành công! Mã đơn: " + data.order_code + emailStatus,
            );
            localStorage.setItem("last_order_code", data.order_code);
            // Replace to prevent user from going back and re-submitting the same order page.
            window.location.replace("/Tra_cuu.html");
            return;
          } else {
            alert("Lỗi: " + (data.msg || "Không thể tạo đơn hàng"));
          }
        } catch (e) {
          console.error("Lỗi tạo đơn:", e);
          alert("Không thể kết nối đến server!");
        } finally {
          // If we didn't redirect, unlock the button for retry.
          isSubmittingOrder = false;
          nextBtn.disabled = false;
          nextBtn.innerHTML = oldHtml;
          // Allow retry with updated info.
          clearOrderIdempotencyKey();
        }
      };
    }
  }
}

// If user navigates back to this page (bfcache), clear old info.
window.addEventListener("pageshow", (event) => {
  if (event && event.persisted) {
    isSubmittingOrder = false;
    clearOrderIdempotencyKey();
    try {
      // Clear inputs so the previous order info doesn't remain visible.
      const ids = [
        "customerName",
        "customerPhone",
        "customerEmail",
        "detailAddress",
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      if (provinceSelect) provinceSelect.value = "";
      if (districtSelect) districtSelect.value = "";
      if (wardSelect) wardSelect.value = "";
    } catch {
      // ignore
    }
    try {
      // Reset to step 1 UI
      for (let s = 1; s <= 3; s++) {
        toggleStep(s, s === 1);
      }
      currentStep = 1;
    } catch {
      // ignore
    }

    try {
      selectedPaymentMethod = "cod";
      walletPaymentConfirmed = false;
      const sel = document.getElementById("paymentMethod");
      if (sel) sel.value = "cod";
      updatePaymentUI();
    } catch {
      // ignore
    }
  }
});

function handlePrev() {
  if (currentStep === 1) {
    window.history.back();
    return;
  }
  toggleStep(currentStep, false);
  currentStep--;
  toggleStep(currentStep, true);

  updatePaymentUI();
}

function toggleStep(step, isActive) {
  const method = isActive ? "add" : "remove";
  document.getElementById(`step-${step}`).classList[method]("active");
  document.getElementById(`st-${step}`).classList[method]("active");
}

function renderFinalOrder() {
  const now = new Date();
  const summaryBox = document.getElementById("order-summary-card");
  summaryBox.style.border = "none";
  summaryBox.style.boxShadow = "0 5px 20px rgba(0,0,0,0.05)";
  const paymentText = getPaymentMethodText(selectedPaymentMethod);
  const paymentLine = paymentText
    ? `<p style="font-size:12px; margin:6px 0 0;"><i class="fas fa-credit-card"></i> ${paymentText}</p>`
    : "";
  if (!isCartMode) {
    summaryBox.innerHTML = `
            <div class="summary-item" style="padding: 10px;">
                <img src="${displayImg.src}" width="100" style="border-radius:12px; border: 1px solid #eee">
                <div class="summary-info" style="margin-left: 20px;">
                    <h4 style="margin:0; color:#333;">${foundProduct ? foundProduct.name : "Sản phẩm"}</h4>
                    <p class="price-red">${foundProduct ? foundProduct.price : "Liên hệ"} VNĐ</p>
                    <p style="font-size:12px;"><i class="far fa-calendar-alt"></i> ${now.toLocaleString("vi-VN")}</p>
                    ${paymentLine}
                    <hr style="border:0; border-top:1px dashed #ddd; margin:10px 0;">
                    <p><b>${orderData.customer.name}</b></p>
                    <p style="font-size:11px; color:#666;">${orderData.customer.address}</p>
                </div>
            </div>`;
    return;
  }

  const total = (cartItems || []).reduce(
    (sum, it) => sum + (parseInt(it.subtotal || 0) || 0),
    0,
  );
  const itemsHtml = (cartItems || [])
    .map(
      (it) => `
        <div style="display:flex; gap:10px; align-items:center; padding:10px; border:1px solid #eee; border-radius:10px; margin-top:10px;">
            <img src="${it.img}" width="60" height="60" style="object-fit:contain; border-radius:8px; border:1px solid #f1f1f1; background:#fff;" />
            <div style="flex:1;">
                <div style="font-weight:600; color:#333;">${it.name}</div>
                <div style="font-size:12px; color:#666;">SL: ${it.quantity} • ${(parseInt(it.price || 0) || 0).toLocaleString("vi-VN")}đ</div>
            </div>
            <div style="font-weight:700; color:#d70018;">${(parseInt(it.subtotal || 0) || 0).toLocaleString("vi-VN")}đ</div>
        </div>
    `,
    )
    .join("");

  summaryBox.innerHTML = `
        <div style="padding:10px;">
            <p style="margin:0; font-size:12px;"><i class="far fa-calendar-alt"></i> ${now.toLocaleString("vi-VN")}</p>
        ${paymentLine}
            <hr style="border:0; border-top:1px dashed #ddd; margin:10px 0;">
            <p style="margin:0 0 6px;"><b>${orderData.customer.name}</b></p>
            <p style="margin:0; font-size:11px; color:#666;">${orderData.customer.address}</p>
            ${itemsHtml}
            <div style="margin-top:12px; font-weight:800;">Tổng: ${total.toLocaleString("vi-VN")}đ</div>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isCartMode) {
    loadProductForOrder();
    // continue to auto-fill profile
  }

  initPaymentUI();

  (async () => {
    try {
      const token = localStorage.getItem("token");
      const emailInput = document.getElementById("customerEmail");
      if (token && emailInput && !String(emailInput.value || "").trim()) {
        const res = await fetch(window.apiUrl("/api/profile"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && data.email && isValidEmail(data.email)) {
          emailInput.value = String(data.email).trim();
        }
      }
    } catch (e) {
      // ignore autofill failures
    }

    if (isCartMode) {
      const refreshed = await fetchCartItems();
      cartItems = refreshed || [];

      if (cartItems.length > 0 && displayImg) {
        displayImg.src = cartItems[0].img;
      }

      renderCartUI();
    }
  })();
});
