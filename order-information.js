// order-information.js - ĐÃ SỬA LỖI HIỂN THỊ SAU THANH TOÁN PAYOS
let currentStep = 1;
let foundProduct = null;
let orderData = { customer: {}, product: {}, orderDate: "" };
let cartItems = [];
let isSubmittingOrder = false;
let selectedPaymentMethod = "cod";
let finalOrderFetchFailed = false;   // Đánh dấu đã fetch thất bại
const CHECKOUT_ORDER_CODE_KEY = "checkout_order_code";
if (!window.apiUrl) {
    window.apiUrl = function(path) { return path; };
}
function _getCheckoutOrderCode() {
  try {
    return String(sessionStorage.getItem(CHECKOUT_ORDER_CODE_KEY) || "").trim();
  } catch { return ""; }
}
function _setCheckoutOrderCode(code) {
  const c = String(code || "").trim();
  if (!c) return;
  try { sessionStorage.setItem(CHECKOUT_ORDER_CODE_KEY, c); } catch {}
}
function _clearCheckoutOrderCode() {
  try { sessionStorage.removeItem(CHECKOUT_ORDER_CODE_KEY); } catch {}
}
_clearCheckoutOrderCode();
 
let finalOrderDetailCache = null;
let finalOrderDetailFetchInFlight = false;
async function _fetchFinalOrderDetailIfPossible(force = false) {
    if (finalOrderDetailCache) return finalOrderDetailCache;
    if (finalOrderDetailFetchInFlight) return null;
    if (finalOrderFetchFailed && !force) return null;  // Không fetch lại nếu đã thất bại

    let code = _getCheckoutOrderCode();
    if (!code) code = String(localStorage.getItem("last_order_code") || "").trim();
    if (!code) return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    finalOrderDetailFetchInFlight = true;
    try {
        const res = await fetch(window.apiUrl(`/api/orders/${encodeURIComponent(code)}`), {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
            alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            window.location.href = "/login.html";
            return null;
        }
        if (!res.ok) {
            console.warn("Fetch order detail failed:", res.status);
            finalOrderFetchFailed = true;
            return null;
        }

        const data = await res.json();
        if (!data || !data.order_code) {
            finalOrderFetchFailed = true;
            return null;
        }
 
        finalOrderDetailCache = data;
        finalOrderFetchFailed = false;   // Thành công, reset cờ
        return finalOrderDetailCache;
    } catch (err) {
        console.error("Fetch order detail error:", err);
        finalOrderFetchFailed = true;
        return null;
    } finally {
        finalOrderDetailFetchInFlight = false;
    }
}

const CART_SELECTED_KEY = "checkout_selected_cart_item_ids";
function getSelectedCartItemIds() {
  try {
    const raw = sessionStorage.getItem(CART_SELECTED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(x => parseInt(x, 10)).filter(n => Number.isFinite(n) && n > 0);
  } catch { return []; }
}
function clearSelectedCartItemIds() { try { sessionStorage.removeItem(CART_SELECTED_KEY); } catch {} }

const IDEM_KEY_STORAGE = "order_idempotency_key";
function getOrCreateOrderIdempotencyKey() {
  let key = null;
  try { key = sessionStorage.getItem(IDEM_KEY_STORAGE); } catch {}
  if (key) return key;
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    key = window.crypto.randomUUID();
  } else {
    key = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  try { sessionStorage.setItem(IDEM_KEY_STORAGE, key); } catch {}
  return key;
}
function clearOrderIdempotencyKey() { try { sessionStorage.removeItem(IDEM_KEY_STORAGE); } catch {} }

let locationsData = null;
let locationsLoadFailed = false;

const urlParams = new URLSearchParams(window.location.search);
const orderProductId = parseInt(urlParams.get("id"));
const displayImg = document.getElementById("display-order-img");
let productLoadPromise = null;
let buyNowQuantity = 1;
let buyNowDeleted = false;

function updateOrderDisplayImages() {
  if (!displayImg) return;
  const container = displayImg.parentElement;
  if (!container) return;
  let images = [];
  if (isCartMode) {
    const selectedIds = new Set(getSelectedCartItemIds());
    const items = selectedIds.size > 0 ? (cartItems || []).filter(it => selectedIds.has(parseInt(it.id || 0, 10))) : cartItems;
    images = items.map(it => it.img).filter(Boolean);
  } else if (foundProduct && !buyNowDeleted) {
    images = [foundProduct.img];
  }
  const existingStack = container.querySelector(".od-image-stack");
  if (existingStack) existingStack.remove();
  if (images.length <= 1) {
    displayImg.style.display = "block";
    if (images.length === 1) displayImg.src = images[0];
    return;
  }
  displayImg.style.display = "none";
  const stack = document.createElement("div");
  stack.className = "od-image-stack";
  stack.style.cssText = "position:relative; height:160px; width:100%; display:flex; justify-content:center; align-items:center; margin:15px 0;";
  container.appendChild(stack);
  const displayLimit = 5;
  const itemsToShow = images.slice(0, displayLimit);
  itemsToShow.forEach((src, idx) => {
    const img = document.createElement("img");
    img.src = src;
    img.style.cssText = "position:absolute; width:100px; height:100px; object-fit:contain; background:#fff; border:1px solid #eee; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.15); transition:transform 0.3s ease;";
    const offset = idx - (itemsToShow.length - 1) / 2;
    const rotate = offset * 15;
    const tx = offset * 35;
    const ty = Math.abs(offset) * 8;
    img.style.transform = `translateX(${tx}px) translateY(${ty}px) rotate(${rotate}deg)`;
    img.style.zIndex = idx;
    stack.appendChild(img);
  });
}

const isCartMode = urlParams.get("cart") === "1" || Number.isNaN(orderProductId);

async function loadProductForOrder() {
  try {
    const res = await fetch(window.apiUrl("/api/public/products"));
    const allProductsFromDB = await res.json().catch(() => ({}));
    const flat = Object.values(allProductsFromDB || {}).flat();
    const item = (flat || []).find(p => p && p.id === orderProductId);
    if (item) foundProduct = item;
    if (foundProduct) updateOrderDisplayImages();
  } catch (e) { console.error("Không thể tải sản phẩm:", e); }
}

function _getBuyNowQuantity() {
  const q = parseInt(buyNowQuantity || 1, 10);
  return Number.isFinite(q) ? Math.max(1, q) : 1;
}

function requireLoginForBE2() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Bạn cần đăng nhập để đặt hàng!");
    window.location.href = "login.html";
    return null;
  }
  return token;
}

function _handleAuthExpired(res, data) {
  const msg = String((data && data.msg) || "").toLowerCase();
if (res && res.status === 401 && (msg.includes("expired") || msg.includes("token"))) {
    try { localStorage.removeItem("token"); localStorage.removeItem("username"); } catch {}
    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
    window.location.href = "login.html";
    return true;
  }
  return false;
}

async function fetchCartItems() {
  const token = requireLoginForBE2();
  if (!token) return null;
  const res = await fetch(window.apiUrl("/api/cart"), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    if (_handleAuthExpired(res, data)) return null;
    alert("Lỗi tải giỏ hàng: " + (data.msg || "Không thể tải giỏ hàng"));
    return null;
  }
  return Array.isArray(data) ? data : [];
}

async function _ensureCartItemsLoaded() {
  if (!isCartMode) return true;
  if (Array.isArray(cartItems) && cartItems.length > 0) return true;
  const refreshed = await fetchCartItems();
  cartItems = refreshed || [];
  try { renderCartUI(); } catch {}
  return Array.isArray(cartItems) && cartItems.length > 0;
}

async function _ensureBuyNowProductLoaded() {
  if (isCartMode) return true;
  if (buyNowDeleted) return false;
  if (foundProduct && foundProduct.id) return true;
  try {
    if (!productLoadPromise) productLoadPromise = loadProductForOrder();
    await Promise.resolve(productLoadPromise);
  } catch {}
  return !!(foundProduct && foundProduct.id);
}

function ensureCartUIContainer() {
  const step1 = document.getElementById("step-1");
  if (!step1) return null;
  let box = document.getElementById("cart-box");
  if (box) return box;
  const wrapper = document.createElement("div");
  wrapper.id = "cart-box";
  wrapper.style.marginTop = "20px";
  const title = isCartMode ? "Giỏ hàng của bạn" : "Sản phẩm của bạn";
  wrapper.innerHTML = `<div style="background:#fff; border-radius:10px; padding:15px;"><h3 style="margin:0 0 10px;">${title}</h3><div id="cart-items" style="display:flex; flex-direction:column; gap:10px;"></div><div id="cart-total" style="margin-top:10px; font-weight:700;"></div></div>`;
  step1.appendChild(wrapper);
  return wrapper;
}

async function updateCartItemBE2(itemId, quantity) {
  const token = requireLoginForBE2();
  if (!token) return false;
  const res = await fetch(window.apiUrl(`/api/cart/${itemId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quantity }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (_handleAuthExpired(res, data)) return false;
    alert("Lỗi cập nhật giỏ hàng: " + (data.msg || "Không thể cập nhật"));
    return false;
  }
  return true;
}

async function deleteCartItemBE2(itemId) {
  const token = requireLoginForBE2();
  if (!token) return false;
const res = await fetch(window.apiUrl(`/api/cart/${itemId}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (_handleAuthExpired(res, data)) return false;
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

  if (!isCartMode) {
    if (buyNowDeleted) {
      list.innerHTML = '<p style="margin:0; color:#666;">Bạn đã xóa sản phẩm khỏi đơn.</p>';
      totalEl.textContent = "";
      return;
    }
    if (!foundProduct) {
      list.innerHTML = '<p style="margin:0; color:#666;">Đang tải sản phẩm...</p>';
      totalEl.textContent = "";
      return;
    }
    const unit = parseInt(foundProduct.price || 0, 10) || 0;
    const qty = _getBuyNowQuantity();
    const total = unit * qty;
    list.innerHTML = `<div class="cart-row" style="display:flex; gap:10px; align-items:center; border:1px solid #eee; border-radius:10px; padding:10px;">
      <img src="${foundProduct.img}" alt="${foundProduct.name}" style="width:60px; height:60px; object-fit:contain; border-radius:8px; border:1px solid #f1f1f1; background:#fff;" />
      <div style="flex:1;"><div style="font-weight:600; color:#333;">${foundProduct.name}</div><div style="font-size:12px; color:#666;">${unit.toLocaleString("vi-VN")}đ</div></div>
      <div style="display:flex; align-items:center; gap:10px; justify-content:flex-end;">
        <div class="qty-stepper" style="display:inline-flex; align-items:center; border:1px solid #ddd; border-radius:10px; overflow:hidden; background:#fff;">
          <button class="buy-now-qty-btn" type="button" data-delta="-1" style="width:32px; height:32px; border:none; background:#fff; cursor:pointer; font-weight:900; font-size:16px;">-</button>
          <span class="buy-now-qty-val" style="min-width:28px; text-align:center; font-weight:800; font-size:13px; padding:0 10px;">${qty}</span>
          <button class="buy-now-qty-btn" type="button" data-delta="1" style="width:32px; height:32px; border:none; background:#fff; cursor:pointer; font-weight:900; font-size:16px;">+</button>
        </div>
        <button class="buy-now-del" type="button" style="display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid #f3b6bd; color:#d70018; cursor:pointer; font-size:12px; font-weight:700; padding:6px 10px; border-radius:10px;"><i class="fas fa-trash"></i><span>Xóa</span></button>
      </div>
    </div>`;
    totalEl.textContent = "Tổng: " + total.toLocaleString("vi-VN") + "đ";
    totalEl.classList.add("price-red");
    list.querySelectorAll(".buy-now-qty-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
e.preventDefault();
        const delta = parseInt(btn.getAttribute("data-delta") || "0", 10) || 0;
        const nextQty = Math.max(1, _getBuyNowQuantity() + delta);
        buyNowQuantity = nextQty;
        renderCartUI();
      });
    });
    const delBtn = list.querySelector(".buy-now-del");
    if (delBtn) delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!confirm("Xóa sản phẩm này khỏi đơn?")) return;
      buyNowDeleted = true;
      renderCartUI();
    });
    updateOrderDisplayImages();
    return;
  }

  const selectedIds = new Set(getSelectedCartItemIds());
  const viewItems = selectedIds.size > 0 ? (cartItems || []).filter(it => selectedIds.has(parseInt(it.id || 0, 10))) : cartItems;
  if (!viewItems || viewItems.length === 0) {
    list.innerHTML = '<p style="margin:0; color:#666;">Giỏ hàng trống.</p>';
    totalEl.textContent = "";
    return;
  }
  const total = viewItems.reduce((sum, it) => sum + (parseInt(it.subtotal || 0) || 0), 0);
  totalEl.textContent = "Tổng: " + total.toLocaleString("vi-VN") + "đ";
  totalEl.classList.add("price-red");
  list.innerHTML = viewItems.map(it => `
    <div class="cart-row" data-item-id="${it.id}" style="display:flex; gap:10px; align-items:center; border:1px solid #eee; border-radius:10px; padding:10px;">
      <img src="${it.img}" alt="${it.name}" style="width:60px; height:60px; object-fit:contain; border-radius:8px; border:1px solid #f1f1f1; background:#fff;" />
      <div style="flex:1;"><div style="font-weight:600; color:#333;">${it.name}</div><div style="font-size:12px; color:#666;">${(parseInt(it.price || 0) || 0).toLocaleString("vi-VN")}đ</div></div>
      <div style="display:flex; align-items:center; gap:10px; justify-content:flex-end;">
        <div class="qty-stepper" style="display:inline-flex; align-items:center; border:1px solid #ddd; border-radius:10px; overflow:hidden; background:#fff;">
          <button class="cart-qty-btn" type="button" data-delta="-1" style="width:32px; height:32px; border:none; background:#fff; cursor:pointer; font-weight:900; font-size:16px;">-</button>
          <span class="cart-qty-val" style="min-width:28px; text-align:center; font-weight:800; font-size:13px; padding:0 10px;">${it.quantity}</span>
          <button class="cart-qty-btn" type="button" data-delta="1" style="width:32px; height:32px; border:none; background:#fff; cursor:pointer; font-weight:900; font-size:16px;">+</button>
        </div>
        <button class="cart-del" type="button" style="display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid #f3b6bd; color:#d70018; cursor:pointer; font-size:12px; font-weight:700; padding:6px 10px; border-radius:10px;"><i class="fas fa-trash"></i><span>Xóa</span></button>
      </div>
    </div>`).join("");
  list.querySelectorAll(".cart-qty-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
const row = e.target.closest(".cart-row");
      const itemId = parseInt(row?.getAttribute("data-item-id") || "0", 10);
      if (!itemId) return;
      const valEl = row?.querySelector(".cart-qty-val");
      const currentQty = parseInt(valEl?.textContent || "1", 10) || 1;
      const delta = parseInt(btn.getAttribute("data-delta") || "0", 10) || 0;
      const nextQty = Math.max(1, currentQty + delta);
      if (nextQty === currentQty) return;
      const ok = await updateCartItemBE2(itemId, nextQty);
      if (!ok) return;
      const refreshed = await fetchCartItems();
      if (refreshed) { cartItems = refreshed; renderCartUI(); }
    });
  });
  list.querySelectorAll(".cart-del").forEach(btn => {
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
  updateOrderDisplayImages();
}

// Địa chỉ
const provinceSelect = document.getElementById("province");
const districtSelect = document.getElementById("district");
const wardSelect = document.getElementById("ward");

function setSelectLoadingState(isLoading) {
  const selects = [provinceSelect, districtSelect, wardSelect].filter(Boolean);
  selects.forEach(s => s.disabled = !!isLoading);
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
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) throw new Error(data && data.msg ? data.msg : `HTTP ${res.status}`);
    return data;
  } finally { clearTimeout(timeout); }
}
function bindLocationEvents(data) {
  if (!provinceSelect || !districtSelect || !wardSelect) return;
  provinceSelect.onchange = () => {
    districtSelect.length = 1; wardSelect.length = 1;
    const p = data.find(x => x.name === provinceSelect.value);
    if (p && Array.isArray(p.districts)) p.districts.forEach(d => districtSelect.add(new Option(d.name, d.name)));
  };
  districtSelect.onchange = () => {
    wardSelect.length = 1;
    const p = data.find(x => x.name === provinceSelect.value);
    const d = p?.districts?.find(x => x.name === districtSelect.value);
    if (d && Array.isArray(d.wards)) d.wards.forEach(w => wardSelect.add(new Option(w.name, w.name)));
  };
}
async function initLocationSelectors() {
  if (!provinceSelect || !districtSelect || !wardSelect) return;
  locationsLoadFailed = false;
  setSelectLoadingState(true);
  resetLocationSelects();
  try {
    try {
      const directUrl = "https://provinces.open-api.vn/api/?depth=3";
      const data = await fetchJsonWithTimeout(directUrl, 8000);
      if (!Array.isArray(data)) throw new Error("Dữ liệu locations không hợp lệ");
      locationsData = data;
      data.forEach(p => provinceSelect.add(new Option(p.name, p.name)));
      bindLocationEvents(data);
      return;
    } catch (e) { console.warn("Direct locations fetch failed, fallback to backend proxy:", e); }
    try {
      const proxyUrl = window.apiUrl("/api/public/locations?depth=3");
      const data = await fetchJsonWithTimeout(proxyUrl, 8000);
      if (!Array.isArray(data)) throw new Error("Dữ liệu locations proxy không hợp lệ");
      locationsData = data;
      data.forEach(p => provinceSelect.add(new Option(p.name, p.name)));
      bindLocationEvents(data);
    } catch (e) {
      console.error("Locations proxy fetch failed:", e);
      locationsData = null;
      locationsLoadFailed = true;
      alert("Không tải được danh sách Tỉnh/Thành. Vui lòng kiểm tra mạng hoặc thử lại sau.");
    }
  } finally { setSelectLoadingState(false); }
}
document.addEventListener("DOMContentLoaded", () => { initLocationSelectors(); });

function isValidEmail(email) {
  const v = String(email || "").trim();
  const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return emailRegex.test(v);
}

function isWalletPaymentMethod(method) {
  const m = String(method || "").toLowerCase();
  return m === "payos";
}

function getPaymentMethodText(method) {
  const m = String(method || "").toLowerCase();
  if (m === "payos") return "Thanh toán qua PayOS";
  return "Thanh toán khi nhận hàng (COD)";
}

function _formatVnd(amount) {
  const v = parseInt(amount || 0, 10) || 0;
  return v.toLocaleString("vi-VN") + "đ";
}

function _getCheckoutTotalAmount() {
  if (!isCartMode) {
    if (buyNowDeleted) return 0;
    const unit = parseInt(foundProduct?.price || 0, 10) || 0;
    return unit * _getBuyNowQuantity();
  }
  const selectedIds = new Set(getSelectedCartItemIds());
  const viewItems = selectedIds.size > 0 ? (cartItems || []).filter(it => selectedIds.has(parseInt(it.id || 0, 10))) : cartItems;
  return (viewItems || []).reduce((sum, it) => sum + (parseInt(it.subtotal || 0) || 0), 0);
}

async function _submitOrder(payload, token, idemKey) {
  const res = await fetch(window.apiUrl("/api/orders"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "Idempotency-Key": idemKey },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function _submitOrderWithIdempotencyRetry(build, forcePaymentMethod) {
const methodOverride = String(forcePaymentMethod || "").trim().toLowerCase();
  const firstPayload = methodOverride ? { ...build.payload, payment_method: methodOverride, provider: methodOverride } : build.payload;
  const first = await _submitOrder(firstPayload, build.token, build.idemKey);
  if (first && first.res && first.res.ok) return first;
  const msg = String((first && first.data && first.data.msg) || "").toLowerCase();
  const isIdemConflict = (first && first.res && first.res.status === 409) || msg.includes("idempotency") || msg.includes("đang được tạo") || msg.includes("vui lòng chờ");
  if (!isIdemConflict) return first;
  clearOrderIdempotencyKey();
  const retryBuild = _buildCreateOrderPayloadForCurrentSelection();
  if (!retryBuild) return first;
  const retryPayload = methodOverride ? { ...retryBuild.payload, payment_method: methodOverride, provider: methodOverride } : retryBuild.payload;
  return await _submitOrder(retryPayload, retryBuild.token, retryBuild.idemKey);
}

function _buildCreateOrderPayloadForCurrentSelection() {
  const token = requireLoginForBE2();
  if (!token) return null;
  const idemKey = getOrCreateOrderIdempotencyKey();
  const customerPayload = {
    name: orderData.customer.name,
    phone: orderData.customer.phone,
    address: orderData.customer.address,
  };
  const emailValue = String(orderData.customer.email || "").trim();
  if (emailValue) customerPayload.email = emailValue;
  const payload = { customer: customerPayload };
  payload.payment_method = String(selectedPaymentMethod || "cod").toLowerCase();
  payload.idempotency_key = idemKey;
  if (!isCartMode) {
    if (buyNowDeleted) return null;
    const pid = foundProduct && foundProduct.id ? foundProduct.id : orderProductId;
    if (!pid || Number.isNaN(pid)) return null;
    payload.items = [{ product_id: pid, quantity: _getBuyNowQuantity() }];
  } else {
    const selectedIdsArr = getSelectedCartItemIds();
    if (Array.isArray(selectedIdsArr) && selectedIdsArr.length > 0) {
      const selectedIds = new Set(selectedIdsArr);
      const selected = (cartItems || []).filter(it => selectedIds.has(parseInt(it.id || 0, 10)));
      if (!selected || selected.length === 0) return null;
      payload.items = selected.map(it => ({ product_id: it.product_id, quantity: it.quantity }));
      payload.clear_cart_item_ids = selected.map(it => it.id);
    } else {
      payload.clear_cart = true;
    }
  }
  return { token, idemKey, payload, emailValue };
}

async function _ensureOrderCreatedBeforePayment() {
  if (isSubmittingOrder) return false;
  const existing = _getCheckoutOrderCode();
  if (existing) return true;

  const token = requireLoginForBE2();
  if (!token) return false;

  await _ensureCartItemsLoaded();
  await _ensureBuyNowProductLoaded();

  const build = _buildCreateOrderPayloadForCurrentSelection();
  if (!build) {
alert("Không thể tạo đơn hàng. Vui lòng kiểm tra sản phẩm/giỏ hàng và thông tin giao hàng.");
    return false;
  }

  const nextBtn = document.getElementById("mainNextBtn");
  const oldHtml = nextBtn ? nextBtn.innerHTML : "";
  isSubmittingOrder = true;
  if (nextBtn) {
    nextBtn.disabled = true;
    nextBtn.innerHTML = "Đang tạo đơn...";
  }

  try {
    const { res, data } = await _submitOrderWithIdempotencyRetry(build);
    if (!res.ok) {
      const msg = data && data.msg ? String(data.msg) : "Không thể tạo đơn hàng";
      alert(`Lỗi tạo đơn hàng (HTTP ${res.status}): ${msg}`);
      return false;
    }

    clearOrderIdempotencyKey();
    if (isCartMode) clearSelectedCartItemIds();

    const orderCode = String((data && data.order_code) || "").trim();
    if (!orderCode) {
      alert("Không nhận được mã đơn hàng từ server.");
      return false;
    }

    try {
      localStorage.setItem("last_order_code", orderCode);
    } catch {}
    _setCheckoutOrderCode(orderCode);
    finalOrderDetailCache = null;
    return true;
  } catch (e) {
    console.error("Lỗi tạo đơn:", e);
    alert("Không thể kết nối đến server!");
    return false;
  } finally {
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.innerHTML = oldHtml || nextBtn.innerHTML;
    }
    isSubmittingOrder = false;
  }
}

async function handlePayOSPayment() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Bạn cần đăng nhập để thanh toán!");
    return;
  }

  const orderCreated = await _ensureOrderCreatedBeforePayment();
  if (!orderCreated) {
    alert("Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.");
    return;
  }

  const orderCode = _getCheckoutOrderCode();
  if (!orderCode) {
    alert("Không tìm thấy mã đơn hàng. Vui lòng thử lại.");
    return;
  }

  try {
    const url = window.apiUrl("/api/payment/create");
    console.log("Calling API:", url);
    const response = await fetch(window.apiUrl('/api/payment/create'), {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
      body: JSON.stringify({ order_code: orderCode, provider: 'payos' })
    });
    const data = await response.json();
    console.log("Payment create response:", data);
    if (!response.ok) {
      alert(data.msg || "Không thể tạo link thanh toán");
      return;
    }
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      alert("Không nhận được đường dẫn thanh toán");
    }
  } catch (err) {
    console.error("PayOS error:", err);
    alert("Lỗi kết nối đến server thanh toán: " + err.message);
  }
}

function updatePaymentUI() {
  const label = document.getElementById("paymentMethodLabel");
  if (label) label.textContent = getPaymentMethodText(selectedPaymentMethod);
const hint = document.getElementById("paymentHint");
  const paymentArea = document.getElementById("paymentArea");
  const nextBtn = document.getElementById("mainNextBtn");

  if (nextBtn) {
    if (isWalletPaymentMethod(selectedPaymentMethod)) {
      nextBtn.innerHTML = 'THANH TOÁN QUA PAYOS <i class="fas fa-arrow-right"></i>';
    } else {
      nextBtn.innerHTML = 'TIẾP TỤC <i class="fas fa-arrow-right"></i>';
    } 
  }

  const payosBox = document.getElementById("payosPaymentBox");
  if (currentStep !== 2) {
    if (nextBtn) nextBtn.disabled = false;
    if (paymentArea) paymentArea.style.display = "none";
    if (payosBox) payosBox.style.display = "none";
    return;
  }
  if (isWalletPaymentMethod(selectedPaymentMethod)) {
    if (paymentArea) paymentArea.style.display = "block";
    if (payosBox) payosBox.style.display = "block";
    if (nextBtn) nextBtn.disabled = false;
    const payosInfo = document.getElementById("payosInfo");
    if (payosInfo) {
      payosInfo.innerHTML = `
        <div style="text-align:center; padding:15px; border:1px dashed #d70018; border-radius:10px; background:#fff5f5; margin-bottom:15px;">
            <p>Bạn sẽ được chuyển đến cổng thanh toán an toàn của PayOS.</p>
            <button id="payosRedirectBtn" class="btn-order" style="background:#d70018; color:#fff; border:none; padding:10px 20px; border-radius:8px; margin-top:10px;">
                <i class="fas fa-credit-card"></i> Thanh toán với PayOS
            </button>
        </div>
      `;
      const redirectBtn = document.getElementById("payosRedirectBtn");
      if (redirectBtn) redirectBtn.onclick = () => handlePayOSPayment();
    }
    return;
  }
  // COD
  if (paymentArea) paymentArea.style.display = "none";
  if (payosBox) payosBox.style.display = "none";
  if (nextBtn) nextBtn.disabled = false;
  if (hint) hint.textContent = "Bạn sẽ thanh toán khi nhận hàng.";
}

function initPaymentUI() {
  const select = document.getElementById("paymentMethod");
  if (!select) return;
  selectedPaymentMethod = select.value || "cod";
  select.addEventListener("change", () => {
    selectedPaymentMethod = select.value || "cod";
    updatePaymentUI();
  });
  updatePaymentUI();
}



// Hàm thoát HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
    return c;
  });
}

// SỬA LỖI: renderFinalOrder chỉ dùng API, không fallback
function renderFinalOrder() {
    const summaryBox = document.getElementById("order-summary-card");
    if (!summaryBox) return;
    const orderCode = _getCheckoutOrderCode() || localStorage.getItem("last_order_code") || "";
    summaryBox.innerHTML = `
        <div style="padding:20px; text-align:center;">
            <p>Đơn hàng của bạn đã được xác nhận và sẽ được giao trong thời gian sớm nhất.</p>
        </div>
    `;
}

async function handlePayOSReturn() {
    const urlStatus = urlParams.get('status');
    const urlOrderCode = urlParams.get('orderCode');
    const token = localStorage.getItem("token");

    if (urlStatus === 'PAID' && urlOrderCode) {
        // Xác nhận thanh toán thành công
        if (token) {
            try {
                await fetch(window.apiUrl('/api/payment/confirm'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ payment_ref: urlOrderCode, result: 'success' })
                });
                // Lấy order_code
                const orderRes = await fetch(window.apiUrl(`/api/payments/${urlOrderCode}/order`), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (orderRes.ok) {
                    const orderData = await orderRes.json();
                    if (orderData.order_code) _setCheckoutOrderCode(orderData.order_code);
                }
            } catch (err) {
                console.error('Confirm payment error:', err);
            }
        }
        
        // Chuyển sang bước 3
        toggleStep(1, false);
        toggleStep(2, false);
        currentStep = 3;
        toggleStep(3, true);
        renderFinalOrder();
        
        const nextBtn = document.getElementById("mainNextBtn");
        if (nextBtn) {
            nextBtn.innerHTML = '<i class="fas fa-home"></i> HOÀN TẤT & VỀ TRANG CHỦ';
            nextBtn.className = "btn-order btn-finish";
            nextBtn.onclick = function () {
                _clearCheckoutOrderCode();
                window.location.replace("index.html");
            };
        }
        const footerPrevBtn = document.querySelector(".order-footer-btns .btn-prev");
        if (footerPrevBtn) footerPrevBtn.style.display = "none";
        document.querySelector(".order-footer-btns")?.classList.add("finish-state");
        
        alert("Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.");
    
    } else if (urlStatus === 'CANCELLED' && urlOrderCode && token) {
        try {
            const response = await fetch(window.apiUrl(`/api/payments/${encodeURIComponent(urlOrderCode)}/discard`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                localStorage.setItem('refresh_orders', Date.now().toString());
                setTimeout(() => localStorage.removeItem('refresh_orders'), 500);
                if (data.email_sent) {
                    alert("Thanh toán bị hủy. Đơn hàng đã xóa và email thông báo đã gửi.");
                } else {
                    alert(`Thanh toán bị hủy. Đơn hàng đã xóa.${data.email_error ? ` (Email lỗi: ${data.email_error})` : ''}`);
                }
            } else {
                alert(`Không thể xóa đơn hàng. Vui lòng liên hệ hỗ trợ. (Lỗi: ${data.msg || response.status})`);
            }
        } catch (err) {
            console.error("Discard error:", err);
            alert("Lỗi kết nối khi hủy thanh toán.");
        }
        _clearCheckoutOrderCode();
        localStorage.removeItem("last_order_code");
        toggleStep(1, false);
        toggleStep(3, false);
        currentStep = 2;
        toggleStep(2, true);
        updatePaymentUI();
    }
}
// Các hàm điều hướng giữ nguyên
async function handleNext() {
  if (currentStep === 1) {
    if (!isCartMode && buyNowDeleted) {
      alert("Bạn đã xóa sản phẩm khỏi đơn. Vui lòng chọn sản phẩm khác để tiếp tục.");
      return;
    }
    const nameEl = document.getElementById("customerName");
    const phoneEl = document.getElementById("customerPhone");
    const emailEl = document.getElementById("customerEmail");
    let name = String(nameEl?.value || "").trim();
    let phone = String(phoneEl?.value || "").trim();
    let email = String(emailEl?.value || "").trim();
    if (!email && name && isValidEmail(name)) {
      if (emailEl) emailEl.value = name;
      if (nameEl) nameEl.value = "";
      alert("Email đang bị điền nhầm vào ô Họ tên. Mình đã chuyển sang ô Email, bạn vui lòng nhập lại Họ tên.");
      return;
    }
    if (!email && phone && isValidEmail(phone)) {
      if (emailEl) emailEl.value = phone;
      if (phoneEl) phoneEl.value = "";
      alert("Email đang bị điền nhầm vào ô Số điện thoại. Mình đã chuyển sang ô Email, bạn vui lòng nhập lại Số điện thoại.");
      return;
    }
    name = String(nameEl?.value || "").trim();
    phone = String(phoneEl?.value || "").trim();
    email = String(emailEl?.value || "").trim();
    const hasProvinceOptions = !!provinceSelect && provinceSelect.options && provinceSelect.options.length > 1;
    if (!name || !phone || (hasProvinceOptions && !provinceSelect.value)) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }
    if (email && !isValidEmail(email)) { alert("Định dạng Email không hợp lệ!"); return; }
    const detail = (document.getElementById("detailAddress")?.value || "").trim();
    const ward = (wardSelect?.value || "").trim();
    const district = (districtSelect?.value || "").trim();
    const province = (provinceSelect?.value || "").trim();
    const parts = [detail, ward, district, province].filter(x => x && x.length > 0);
    const fullAddress = parts.join(", ");
    if (!fullAddress) { alert("Vui lòng nhập đầy đủ địa chỉ giao hàng."); return; }
    orderData.customer = { name, phone, address: fullAddress, email };
}
  if (currentStep === 2 && isCartMode) {
    await _ensureCartItemsLoaded();
    if (!cartItems || cartItems.length === 0) { alert("Giỏ hàng trống, không thể đặt hàng."); return; }
  }
  if (currentStep === 2) {
    if (isWalletPaymentMethod(selectedPaymentMethod)) {
      await handlePayOSPayment();
      return;
    }
    const ok = await _ensureOrderCreatedBeforePayment();
    if (!ok) return;
  }
  if (currentStep < 3) {
    toggleStep(currentStep, false);
    currentStep++;
    toggleStep(currentStep, true);
    updatePaymentUI();
    if (currentStep === 3) {
      renderFinalOrder();
      const nextBtn = document.getElementById("mainNextBtn");
      const footerPrevBtn = document.querySelector(".order-footer-btns .btn-prev");
      if (footerPrevBtn) footerPrevBtn.style.display = "none";
      document.querySelector(".order-footer-btns").classList.add("finish-state");
      nextBtn.innerHTML = '<i class="fas fa-home"></i> HOÀN TẤT & VỀ TRANG CHỦ';
      nextBtn.className = "btn-order btn-finish";
      nextBtn.onclick = function () {
        _clearCheckoutOrderCode();
        window.location.replace("index.html");
      };
    }
  }
}



function handlePrev() {
  if (currentStep === 1) { window.history.back(); return; }
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

// Khởi tạo khi DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  if (!isCartMode) {
    renderCartUI();
    productLoadPromise = loadProductForOrder().then(() => renderCartUI());
  }
  initPaymentUI();
  handlePayOSReturn();
  (async () => {
    try {
      const token = localStorage.getItem("token");
      const emailInput = document.getElementById("customerEmail");
      const phoneInput = document.getElementById("customerPhone");
      const needEmail = emailInput && !String(emailInput.value || "").trim();
      const needPhone = phoneInput && !String(phoneInput.value || "").trim();
      if (token && (needEmail || needPhone)) {
        const res = await fetch(window.apiUrl("/api/profile"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (needEmail && res.ok && data && data.email && isValidEmail(data.email)) emailInput.value = String(data.email).trim();
        if (needPhone && res.ok && data && data.phone) phoneInput.value = String(data.phone).trim();
      }
    } catch (e) {}
    if (isCartMode) {
      const refreshed = await fetchCartItems();
      cartItems = refreshed || [];
      updateOrderDisplayImages();
      renderCartUI();
    }
  })();
});