(function () {
    var state = {
        products: [],
        users: [],
        promotions: [],
        orders: [],
        support: [],
        banners: [],
        dashboard: null
    };

    function byId(id) {
        return document.getElementById(id);
    }

    async function init() {
        var page = document.body.getAttribute("data-page") || "dashboard";
        
        try {
            if (page === "dashboard") {
                state.dashboard = await AdminCore.api("/admin/dashboard/stats");
                state.products = await AdminCore.api("/products");
                state.orders = await AdminCore.api("/admin/orders");
                renderDashboard();
            } else if (page === "products") {
                state.products = await AdminCore.api("/products");
                renderProductsPage();
            } else if (page === "users") {
                state.users = await AdminCore.api("/admin/users");
                renderUsersPage();
            } else if (page === "content") {
                state.promotions = await AdminCore.api("/admin/content");
                renderContentPage();
            } else if (page === "orders") {
                state.orders = await AdminCore.api("/admin/orders");
                renderOrdersPage();
            } else if (page === "support") {
                state.support = await AdminCore.api("/admin/support");
                renderSupportPage();
            } else if (page === "banners") {
                state.banners = await AdminCore.api("/admin/banners");
                renderBannersPage();
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            AdminCore.toast("Không thể tải dữ liệu từ máy chủ", "error");
        }
    }

    function renderDashboard() {
        AdminCore.renderShell("dashboard", "Giao diện thống kê", "Theo dõi doanh thu, đơn hàng và tồn kho theo thời gian thực");

        var kpiHtml = state.dashboard.kpis
            .map(function (kpi) {
                var trendClass = Number(kpi.trend) >= 0 ? "up" : "down";
                var prefix = Number(kpi.trend) >= 0 ? "+" : "";
                var value = kpi.key === "revenue" || kpi.key === "aov" ? AdminCore.formatCurrency(kpi.value) : AdminCore.formatCompactNumber(kpi.value);
                return (
                    '<article class="kpi-card">' +
                    '<div class="kpi-label">' + kpi.label + "</div>" +
                    '<div class="kpi-value">' + value + "</div>" +
                    '<div class="kpi-trend ' + trendClass + '">' + prefix + kpi.trend + "% " + kpi.trendLabel + "</div>" +
                    "</article>"
                );
            })
            .join("");

        var topProducts = state.products
            .slice()
            .sort(function (a, b) {
                return b.sold - a.sold;
            })
            .slice(0, 5)
            .map(function (item, index) {
                return "<tr><td>#" + (index + 1) + "</td><td>" + item.name + "</td><td>" + item.sold + "</td><td>" + AdminCore.formatCurrency(item.price) + "</td></tr>";
            })
            .join("");

        var recentOrders = state.orders
            .slice(0, 5)
            .map(function (order) {
                return "<tr><td>" + order.id + "</td><td>" + order.customer + "</td><td>" + AdminCore.statusBadge("order", order.status) + "</td><td>" + AdminCore.formatCurrency(order.total) + "</td></tr>";
            })
            .join("");

        var stockAlert = state.dashboard.lowStock
            .map(function (item) {
                return '<div class="stock-alert-item"><span>' + item.name + '</span><strong>Còn ' + item.stock + "</strong></div>";
            })
            .join("");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<select class="select" id="dashboardPeriod"><option value="7d">7 ngày gần nhất</option><option value="30d">30 ngày gần nhất</option><option value="90d">Quý này</option></select>' +
                    '<button class="btn btn-outline" id="dashboardRefresh"><i class="fas fa-rotate-right"></i> Làm mới</button>' +
                "</div>" +
            "</div></div>" +

            '<section class="admin-grid-4">' + kpiHtml + "</section>" +

            '<section class="admin-grid-2">' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Phân bổ doanh thu theo trạng thái</h3></div><div class="admin-card-body"><div class="chart-box"><div id="revenueChart" class="simple-chart"></div></div></div></article>' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Doanh thu theo ngành hàng (Triệu VNĐ)</h3></div>' +
                '<div class="admin-card-body">' + 
                    '<div id="categoryRevenueBar" style="display:flex;align-items:flex-end;height:140px;gap:12px;padding-bottom:20px;margin-top:20px">' +
                        (state.dashboard.categoryLabels || []).map(function(label, i) {
                            var val = state.dashboard.categoryValues[i];
                            var max = Math.max.apply(null, state.dashboard.categoryValues) || 1;
                            var h = (val / max) * 100;
                            return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px">' +
                                   '<div style="background:#0076df;width:40%;height:' + h + '%;border-radius:4px 4px 0 0" title="' + AdminCore.formatCurrency(val) + '"></div>' +
                                   '<span style="font-size:10px;color:#667085;text-align:center;word-break:break-word;max-width:50px">' + label + '</span>' +
                                   '</div>';
                        }).join('') +
                    '</div>' +
                '</div></article>' +
            "</section>" +

            '<section class="admin-grid-3">' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Top sản phẩm bán chạy</h3></div><div class="admin-card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Top</th><th>Sản phẩm</th><th>Đã bán</th><th>Giá</th></tr></thead><tbody>' + topProducts + '</tbody></table></div></div></article>' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Đơn hàng gần đây</h3></div><div class="admin-card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th><th>Tổng</th></tr></thead><tbody>' + recentOrders + '</tbody></table></div></div></article>' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Cảnh báo tồn kho thấp</h3></div><div class="admin-card-body"><div class="stock-alert-list">' + stockAlert + '</div></div></article>' +
            "</section>"
        );

        AdminCore.drawLineChart("revenueChart", state.dashboard.labels, state.dashboard.revenueSeries, "#0076df");

        byId("dashboardRefresh").addEventListener("click", function () {
            AdminCore.toast("Dữ liệu thống kê đã cập nhật", "success");
        });
    }

    function renderProductsPage() {
        AdminCore.renderShell("products", "Quản lý sản phẩm", "Quản lý danh mục, tồn kho và trạng thái hiển thị sản phẩm");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<input class="input" id="productSearch" placeholder="Tìm theo tên hoặc mã..." style="min-width:220px" />' +
                    '<select class="select" id="productCategory"><option value="all">Tất cả danh mục</option><option>Điện thoại</option><option>Laptop</option><option>Màn hình</option><option>Linh kiện</option><option>Phụ kiện</option></select>' +
                    '<select class="select" id="productStatus"><option value="all">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="low_stock">Sắp hết</option><option value="hidden">Đã ẩn</option></select>' +
                    '<button class="btn btn-ghost" id="productReset">Reset</button>' +
                    '<button class="btn btn-primary" id="addProductBtn"><i class="fas fa-plus"></i> Thêm sản phẩm</button>' +
                    '<button class="btn btn-outline" id="bulkHideBtn"><i class="fas fa-eye-slash"></i> Ẩn sản phẩm sắp hết</button>' +
                "</div>" +
            "</div></div>" +
            '<article class="admin-card"><div class="admin-card-body" id="productTableWrap"></div></article>'
        );

        function bindFilterEvents() {
            ["productSearch", "productCategory", "productStatus"].forEach(function (id) {
                byId(id).addEventListener("input", renderTable);
                byId(id).addEventListener("change", renderTable);
            });

            byId("productReset").addEventListener("click", function () {
                byId("productSearch").value = "";
                byId("productCategory").value = "all";
                byId("productStatus").value = "all";
                renderTable();
            });

            byId("addProductBtn").addEventListener("click", openProductModal);
            byId("bulkHideBtn").addEventListener("click", function () {
                state.products = state.products.map(function (p) {
                    if (p.status === "low_stock") {
                        return Object.assign({}, p, { status: "hidden" });
                    }
                    return p;
                });
                renderTable();
                AdminCore.toast("Đã ẩn các sản phẩm sắp hết", "success");
            });
        }

        function filteredProducts() {
            var q = byId("productSearch").value.trim().toLowerCase();
            var c = byId("productCategory").value;
            var s = byId("productStatus").value;
            return state.products.filter(function (item) {
                var nameMatch = !q || item.name.toLowerCase().indexOf(q) !== -1 || item.id.toLowerCase().indexOf(q) !== -1;
                var categoryMatch = c === "all" || item.category === c;
                var statusMatch = s === "all" || item.status === s;
                return nameMatch && categoryMatch && statusMatch;
            });
        }

        function renderTable() {
            var rows = filteredProducts();
            var html = AdminCore.table(
                [
                    { label: "Mã", key: "id" },
                    {
                        label: "Sản phẩm",
                        render: function (row) {
                            return '<div style="display:flex;align-items:center;gap:10px"><img src="' + row.image + '" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb" /><div><strong>' + row.name + '</strong><div style="font-size:12px;color:#667085">' + row.category + "</div></div></div>";
                        }
                    },
                    { label: "Giá", render: function (row) { return AdminCore.formatCurrency(row.price); } },
                    { label: "Tồn kho", key: "stock" },
                    { label: "Đã bán", key: "sold" },
                    { label: "Trạng thái", render: function (row) { return AdminCore.statusBadge("product", row.status); } },
                    {
                        label: "Thao tác",
                        render: function (row) {
                            return (
                                '<div class="table-actions">' +
                                '<button class="btn btn-ghost" data-product-action="view" data-id="' + row.id + '" title="Chi tiết"><i class="fas fa-eye"></i></button>' +
                                '<button class="btn btn-ghost" data-product-action="import" data-id="' + row.id + '" title="Nhập kho"><i class="fas fa-plus-square"></i></button>' +
                                '<button class="btn btn-ghost" data-product-action="edit" data-id="' + row.id + '" title="Sửa"><i class="fas fa-pen"></i></button>' +
                                '<button class="btn btn-danger" data-product-action="delete" data-id="' + row.id + '" title="Xóa"><i class="fas fa-trash"></i></button>' +
                                "</div>"
                            );
                        }
                    }
                ],
                rows
            );

            byId("productTableWrap").innerHTML = html + AdminCore.pagination({ from: rows.length ? 1 : 0, to: rows.length, total: rows.length });

            document.querySelectorAll("[data-product-action]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var action = btn.getAttribute("data-product-action");
                    var record = state.products.find(function (p) { return p.id === id; });
                    if (!record) {
                        return;
                    }
                    if (action === "view") {
                        openProductDrawer(record);
                    } else if (action === "import") {
                        openStockImportModal(record);
                    } else if (action === "edit") {
                        openProductModal(record);
                    } else if (action === "delete") {
                        AdminCore.openModal({
                            title: "Xác nhận xóa sản phẩm",
                            bodyHtml: '<p>Bạn có chắc muốn xóa <strong>' + record.name + "</strong>?</p>",
                            actions: [
                                { key: "cancel", label: "Hủy", className: "btn-ghost" },
                                { key: "ok", label: "Xóa", className: "btn-danger" }
                            ],
                            onAction: async function (key, close) {
                                if (key === "ok") {
                                    try {
                                        await AdminCore.api("/admin/products/" + id, { method: "DELETE" });
                                        state.products = state.products.filter(function (p) { return p.id !== id; });
                                        renderTable();
                                        AdminCore.toast("Đã xóa sản phẩm", "success");
                                    } catch (err) {
                                        AdminCore.toast(err.msg || "Lỗi khi xóa sản phẩm", "error");
                                    }
                                }
                                close();
                            }
                        });
                    }
                });
            });
        }

        function openProductDrawer(item) {
            var specsHtml = "";
            if (item.details) {
                try {
                    var specs = JSON.parse(item.details);
                    specsHtml = '<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb">' +
                                '<strong>Thông số kỹ thuật:</strong>' +
                                '<ul style="margin:8px 0 0 18px;font-size:13px;color:#667085">' +
                                (specs.cpu ? '<li>CPU: ' + specs.cpu + '</li>' : '') +
                                (specs.ram ? '<li>RAM: ' + specs.ram + '</li>' : '') +
                                (specs.storage ? '<li>Ổ cứng: ' + specs.storage + '</li>' : '') +
                                (specs.screen ? '<li>Màn hình: ' + specs.screen + '</li>' : '') +
                                '</ul></div>';
                } catch(e) {}
            }

            AdminCore.openDrawer({
                title: "Chi tiết sản phẩm",
                bodyHtml:
                    '<div style="display:grid;gap:12px">' +
                        '<img src="' + item.image + '" style="width:100%;max-height:220px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;background:#fff" />' +
                        '<div><strong>' + item.name + '</strong></div>' +
                        '<div>Mã: ' + item.id + "</div>" +
                        '<div>Danh mục: ' + item.category + "</div>" +
                        '<div>Giá bán: ' + AdminCore.formatCurrency(item.price) + "</div>" +
                        '<div>Tồn kho: ' + item.stock + "</div>" +
                        '<div>Đã bán: ' + item.sold + "</div>" +
                        '<div>Trạng thái: ' + AdminCore.statusBadge("product", item.status) + "</div>" +
                        specsHtml +
                    "</div>",
                actions: [{ key: "close", label: "Đóng", className: "btn-ghost" }],
                onAction: function (_, close) { close(); }
            });
        }

        function openProductModal(item) {
            var isEdit = !!item;
            var data = item || {
                id: "P-" + Math.floor(Math.random() * 9000 + 1000),
                name: "",
                category: "Điện thoại",
                price: 0,
                stock: 0,
                status: "active",
                sold: 0,
                image: "../../assets/img/LOGO1.png",
                details: ""
            };

            AdminCore.openModal({
                title: isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới",
                bodyHtml:
                    '<div class="form-grid-2">' +
                        '<label class="form-field"><span class="form-label">Tên sản phẩm</span><input class="input" id="pName" value="' + AdminCore.escapeHtml(data.name) + '" /></label>' +
                        '<label class="form-field"><span class="form-label">Mã sản phẩm</span><input class="input" id="pId" value="' + AdminCore.escapeHtml(data.id) + '" ' + (isEdit ? "disabled" : "") + " /></label>" +
                        '<label class="form-field"><span class="form-label">Danh mục</span><select class="select" id="pCategory"><option>Điện thoại</option><option>Laptop</option><option>Màn hình</option><option>Linh kiện</option><option>Phụ kiện</option></select></label>' +
                        '<label class="form-field"><span class="form-label">Giá bán</span><input type="number" class="input" id="pPrice" value="' + data.price + '" /></label>' +
                        '<label class="form-field"><span class="form-label">Tồn kho</span><input type="number" class="input" id="pStock" value="' + data.stock + '" /></label>' +
                        '<label class="form-field"><span class="form-label">Trạng thái</span><select class="select" id="pStatus"><option value="active">Đang bán</option><option value="low_stock">Sắp hết</option><option value="hidden">Đã ẩn</option></select></label>' +
                    "</div>" +
                    '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb">' +
                        '<strong>Thông số kỹ thuật (Cấu hình)</strong>' +
                        '<div class="form-grid-2" style="margin-top:10px">' +
                            '<label class="form-field"><span class="form-label">Vi xử lý (CPU)</span><input class="input" id="specCPU" placeholder="VD: Apple M3, Intel i9..." /></label>' +
                            '<label class="form-field"><span class="form-label">RAM</span><input class="input" id="specRAM" placeholder="VD: 16GB, 32GB..." /></label>' +
                            '<label class="form-field"><span class="form-label">Bộ nhớ (SSD/HDD)</span><input class="input" id="specStorage" placeholder="VD: 512GB SSD..." /></label>' +
                            '<label class="form-field"><span class="form-label">Màn hình</span><input class="input" id="specScreen" placeholder="VD: 14 inch, Retina..." /></label>' +
                        '</div>' +
                    '</div>' +
                    '<div class="form-field" style="margin-top:10px"><span class="form-label">Upload ảnh</span><label class="upload-box" for="pImage">Chọn ảnh thumbnail<input id="pImage" type="file" accept="image/*" style="display:none" /></label><div class="thumb-grid" id="pThumb"><img src="' + data.image + '" /></div></div>',
                actions: [
                    { key: "cancel", label: "Hủy", className: "btn-ghost" },
                    { key: "save", label: isEdit ? "Lưu thay đổi" : "Tạo sản phẩm", className: "btn-primary" }
                ],
                onAction: async function (key, close) {
                    if (key !== "save") {
                        close();
                        return;
                    }

                    var specs = {
                        cpu: byId("specCPU").value.trim(),
                        ram: byId("specRAM").value.trim(),
                        storage: byId("specStorage").value.trim(),
                        screen: byId("specScreen").value.trim()
                    };

                    var payload = {
                        id: isEdit ? data.id : byId("pId").value.trim(),
                        name: byId("pName").value.trim(),
                        category: byId("pCategory").value,
                        price: Number(byId("pPrice").value || 0),
                        stock: Number(byId("pStock").value || 0),
                        status: byId("pStatus").value,
                        sold: data.sold || 0,
                        image: data.image,
                        details: JSON.stringify(specs)
                    };

                    if (!payload.name || !payload.id) {
                        AdminCore.toast("Thiếu tên hoặc mã sản phẩm", "error");
                        return;
                    }

                    try {
                        if (isEdit) {
                            await AdminCore.api("/admin/products/" + payload.id, {
                                method: "PUT",
                                body: JSON.stringify(payload)
                            });
                            state.products = state.products.map(function (p) { return p.id === payload.id ? Object.assign({}, p, payload) : p; });
                        } else {
                            await AdminCore.api("/admin/products", {
                                method: "POST",
                                body: JSON.stringify(payload)
                            });
                            state.products.unshift(payload);
                        }

                        renderTable();
                        close();
                        AdminCore.toast(isEdit ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới", "success");
                    } catch (err) {
                        AdminCore.toast(err.msg || "Lỗi khi lưu sản phẩm", "error");
                    }
                }
            });

            setTimeout(function () {
                byId("pCategory").value = data.category;
                byId("pStatus").value = data.status;
                if (data.details) {
                    try {
                        var specs = JSON.parse(data.details);
                        byId("specCPU").value = specs.cpu || "";
                        byId("specRAM").value = specs.ram || "";
                        byId("specStorage").value = specs.storage || "";
                        byId("specScreen").value = specs.screen || "";
                    } catch(e) {}
                }
                var pImage = byId("pImage");
                if (pImage) {
                    pImage.addEventListener("change", function (event) {
                        var file = event.target.files && event.target.files[0];
                        if (!file) {
                            return;
                        }
                        var reader = new FileReader();
                        reader.onload = function (e) {
                            data.image = e.target.result;
                            byId("pThumb").innerHTML = '<img src="' + e.target.result + '" />';
                        };
                        reader.readAsDataURL(file);
                    });
                }
            }, 0);
        }

        bindFilterEvents();
        renderTable();
    }

    function renderUsersPage() {
        AdminCore.renderShell("users", "Quản lý người dùng", "Xem thông tin đăng ký, khóa hoặc xóa tài khoản người dùng");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<input class="input" id="userSearch" placeholder="Tìm tên, email, số điện thoại..." style="min-width:260px" />' +
                    '<select class="select" id="userRole"><option value="all">Tất cả role</option><option value="customer">Customer</option><option value="staff">Staff</option><option value="admin">Admin</option></select>' +
                    '<select class="select" id="userStatus"><option value="all">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đã khóa</option></select>' +
                    '<button class="btn btn-ghost" id="userReset">Reset</button>' +
                "</div>" +
            "</div></div>" +
            '<article class="admin-card"><div class="admin-card-body" id="userTableWrap"></div></article>'
        );

        function filteredUsers() {
            var q = byId("userSearch").value.trim().toLowerCase();
            var role = byId("userRole").value;
            var status = byId("userStatus").value;
            return state.users.filter(function (item) {
                var qMatch = !q || item.name.toLowerCase().indexOf(q) !== -1 || item.email.toLowerCase().indexOf(q) !== -1 || item.phone.indexOf(q) !== -1;
                var roleMatch = role === "all" || item.role === role;
                var statusMatch = status === "all" || item.status === status;
                return qMatch && roleMatch && statusMatch;
            });
        }

        function renderTable() {
            var rows = filteredUsers();
            byId("userTableWrap").innerHTML =
                AdminCore.table(
                    [
                        { label: "ID", key: "id" },
                        {
                            label: "Người dùng",
                            render: function (u) {
                                return "<div><strong>" + u.name + "</strong><div style='font-size:12px;color:#667085'>" + u.email + "</div></div>";
                            }
                        },
                        { label: "Điện thoại", key: "phone" },
                        { label: "Role", render: function (u) { return '<span class="badge info">' + u.role + "</span>"; } },
                        { label: "Ngày đăng ký", key: "joinedAt" },
                        { label: "Trạng thái", render: function (u) { return AdminCore.statusBadge("user", u.status); } },
                        { label: "Số đơn", key: "orders" },
                        { label: "Tổng chi", render: function (u) { return AdminCore.formatCurrency(u.totalSpent); } },
                        {
                            label: "Thao tác",
                            render: function (u) {
                                var checked = u.status === "active" ? "checked" : "";
                                return (
                                    '<div class="table-actions">' +
                                    '<button class="btn btn-ghost" data-user-action="view" data-id="' + u.id + '"><i class="fas fa-eye"></i></button>' +
                                    '<label class="switch"><input type="checkbox" data-user-action="switch" data-id="' + u.id + '" ' + checked + ' /><span></span></label>' +
                                    '<button class="btn btn-danger" data-user-action="delete" data-id="' + u.id + '"><i class="fas fa-trash"></i></button>' +
                                    "</div>"
                                );
                            }
                        }
                    ],
                    rows
                ) +
                AdminCore.pagination({ from: rows.length ? 1 : 0, to: rows.length, total: rows.length });

            document.querySelectorAll("[data-user-action='view']").forEach(function (btn) {
                btn.addEventListener("click", async function () {
                    var id = btn.getAttribute("data-id");
                    var user = state.users.find(function (u) { return String(u.id) === id; });
                    if (!user) return;

                    try {
                        // Fetch order history for this user
                        var history = await AdminCore.api("/admin/users/" + id + "/orders");
                        var historyHtml = history.length 
                            ? history.map(function(o) {
                                return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px dashed #eee">' +
                                       '<span>#' + o.id + '</span>' +
                                       '<span>' + AdminCore.formatCurrency(o.total) + '</span>' +
                                       '<span>' + AdminCore.statusBadge("order", o.status) + '</span>' +
                                       '</div>';
                              }).join("")
                            : '<div style="color:#667085;font-size:13px">Chưa có đơn hàng nào.</div>';

                        AdminCore.openDrawer({
                            title: "Chi tiết người dùng",
                            bodyHtml:
                                '<div style="display:grid;gap:12px">' +
                                    '<div><strong>' + (user.name || user.username) + '</strong></div>' +
                                    '<div style="height:1px;background:#e5e7eb;margin:2px 0 6px"></div>' +
                                    '<div><strong>Thông tin tài khoản</strong></div>' +
                                    '<div>Username: ' + user.username + '</div>' +
                                    '<div>Email: ' + user.email + '</div>' +
                                    '<div>SĐT: ' + (user.phone || "Chưa cập nhật") + '</div>' +
                                    '<div class="form-field"><span class="form-label">Phân quyền (Role)</span>' +
                                        '<select class="select" id="changeUserRole">' +
                                            '<option value="user">User</option>' +
                                            '<option value="staff">Staff</option>' +
                                            '<option value="admin">Admin</option>' +
                                        '</select>' +
                                    '</div>' +
                                    '<div>Trạng thái: ' + AdminCore.statusBadge("user", user.is_locked ? 'locked' : 'active') + '</div>' +
                                    '<div style="height:1px;background:#e5e7eb;margin:2px 0 6px"></div>' +
                                    '<div><strong>Lịch sử mua hàng</strong></div>' +
                                    '<div style="max-height:200px;overflow-y:auto">' + historyHtml + '</div>' +
                                "</div>",
                            actions: [
                                { key: "cancel", label: "Đóng", className: "btn-ghost" },
                                { key: "saveRole", label: "Cập nhật Role", className: "btn-primary" }
                            ],
                            onAction: async function (key, close) {
                                if (key === "saveRole") {
                                    var newRole = document.getElementById("changeUserRole").value;
                                    try {
                                        await AdminCore.api("/admin/users/" + id + "/role", {
                                            method: "PUT",
                                            body: JSON.stringify({ role: newRole })
                                        });
                                        user.role = newRole;
                                        AdminCore.toast("Đã cập nhật phân quyền", "success");
                                        renderTable();
                                    } catch (err) {
                                        AdminCore.toast(err.msg || "Lỗi cập nhật role", "error");
                                    }
                                }
                                close();
                            }
                        });

                        setTimeout(function() {
                            if(document.getElementById("changeUserRole")) {
                                document.getElementById("changeUserRole").value = user.role;
                            }
                        }, 0);
                    } catch (err) {
                        AdminCore.toast("Không thể lấy lịch sử mua hàng", "error");
                    }
                });
            });

            document.querySelectorAll("[data-user-action='switch']").forEach(function (cb) {
                cb.addEventListener("change", function () {
                    var id = cb.getAttribute("data-id");
                    var user = state.users.find(function (u) { return u.id === id; });
                    if (!user) {
                        return;
                    }
                    var nextStatus = cb.checked ? "active" : "locked";
                    var statusText = nextStatus === "locked" ? "khóa" : "mở khóa";

                    AdminCore.openModal({
                        title: "Xác nhận cập nhật trạng thái",
                        bodyHtml: '<p>Bạn có chắc muốn <strong>' + statusText + '</strong> tài khoản <strong>' + user.name + '</strong>?</p>',
                        actions: [
                            { key: "cancel", label: "Hủy", className: "btn-ghost" },
                            { key: "ok", label: "Xác nhận", className: "btn-primary" }
                        ],
                        onAction: async function (key, close) {
                            if (key === "ok") {
                                try {
                                    await AdminCore.api("/admin/users/toggle-lock/" + id, { method: "PUT" });
                                    user.status = nextStatus;
                                    AdminCore.toast("Đã cập nhật trạng thái tài khoản", "success");
                                    renderTable();
                                } catch (err) {
                                    AdminCore.toast(err.msg || "Lỗi khi cập nhật trạng thái", "error");
                                }
                            }
                            close();
                        }
                    });
                });
            });

            document.querySelectorAll("[data-user-action='delete']").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var user = state.users.find(function (u) { return u.id === id; });
                    if (!user) {
                        return;
                    }

                    AdminCore.openModal({
                        title: "Xác nhận xóa tài khoản",
                        bodyHtml: '<p>Bạn có chắc muốn xóa tài khoản <strong>' + user.name + '</strong> (' + user.id + ')?</p><p style="color:#b42318;font-size:12px">Thao tác này hiện chỉ mô phỏng ở giao diện Admin.</p>',
                        actions: [
                            { key: "cancel", label: "Hủy", className: "btn-ghost" },
                            { key: "ok", label: "Xóa tài khoản", className: "btn-danger" }
                        ],
                        onAction: async function (key, close) {
                            if (key === "ok") {
                                try {
                                    await AdminCore.api("/admin/users/delete/" + id, { method: "DELETE" });
                                    state.users = state.users.filter(function (u) { return u.id !== id; });
                                    AdminCore.toast("Đã xóa tài khoản người dùng", "success");
                                    renderTable();
                                } catch (err) {
                                    AdminCore.toast(err.msg || "Lỗi khi xóa tài khoản", "error");
                                }
                            }
                            close();
                        }
                    });
                });
            });
        }

        ["userSearch", "userRole", "userStatus"].forEach(function (id) {
            byId(id).addEventListener("input", renderTable);
            byId(id).addEventListener("change", renderTable);
        });

        byId("userReset").addEventListener("click", function () {
            byId("userSearch").value = "";
            byId("userRole").value = "all";
            byId("userStatus").value = "all";
            renderTable();
        });

        renderTable();
    }

    function renderContentPage() {
        AdminCore.renderShell("content", "Quản lý tin tức / khuyến mãi", "Tạo mới, chỉnh sửa, publish hoặc lên lịch nội dung");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<input class="input" id="contentSearch" placeholder="Tìm bài viết hoặc khuyến mãi..." style="min-width:250px" />' +
                    '<select class="select" id="contentType"><option value="all">Tất cả loại</option><option value="news">Tin tức</option><option value="promotion">Khuyến mãi</option></select>' +
                    '<select class="select" id="contentStatus"><option value="all">Tất cả trạng thái</option><option value="published">Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option></select>' +
                    '<button class="btn btn-ghost" id="contentReset">Reset</button>' +
                    '<button class="btn btn-primary" id="newContentBtn"><i class="fas fa-plus"></i> Tạo nội dung</button>' +
                "</div>" +
            "</div></div>" +
            '<article class="admin-card"><div class="admin-card-body" id="contentTableWrap"></div></article>'
        );

        function filteredContent() {
            var q = byId("contentSearch").value.trim().toLowerCase();
            var type = byId("contentType").value;
            var status = byId("contentStatus").value;
            return state.promotions.filter(function (item) {
                var qMatch = !q || item.title.toLowerCase().indexOf(q) !== -1 || item.id.toLowerCase().indexOf(q) !== -1;
                var typeMatch = type === "all" || item.type === type;
                var statusMatch = status === "all" || item.status === status;
                return qMatch && typeMatch && statusMatch;
            });
        }

        function renderTable() {
            var rows = filteredContent();
            byId("contentTableWrap").innerHTML =
                AdminCore.table(
                    [
                        { label: "Mã", key: "id" },
                        {
                            label: "Nội dung",
                            render: function (p) {
                                return '<div style="display:flex;align-items:center;gap:10px"><img src="' + p.thumbnail + '" style="width:58px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb"/><div><strong>' + p.title + '</strong><div style="font-size:12px;color:#667085">' + p.author + "</div></div></div>";
                            }
                        },
                        { label: "Loại", render: function (p) { return '<span class="badge info">' + p.type + "</span>"; } },
                        { label: "Trạng thái", render: function (p) { return AdminCore.statusBadge("content", p.status); } },
                        { label: "Lịch publish", render: function (p) { return p.publishAt || "-"; } },
                        {
                            label: "Thao tác",
                            render: function (p) {
                                return '<div class="table-actions"><button class="btn btn-ghost" data-content-action="edit" data-id="' + p.id + '"><i class="fas fa-pen"></i></button><button class="btn btn-danger" data-content-action="delete" data-id="' + p.id + '"><i class="fas fa-trash"></i></button></div>';
                            }
                        }
                    ],
                    rows
                ) +
                AdminCore.pagination({ from: rows.length ? 1 : 0, to: rows.length, total: rows.length });

            document.querySelectorAll("[data-content-action]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var action = btn.getAttribute("data-content-action");
                    var record = state.promotions.find(function (x) { return x.id === id; });
                    if (!record) {
                        return;
                    }
                    if (action === "edit") {
                        openContentModal(record);
                    } else if (action === "delete") {
                        AdminCore.openModal({
                            title: "Xác nhận xóa nội dung",
                            bodyHtml: '<p>Bạn có chắc muốn xóa <strong>' + record.title + "</strong>?</p>",
                            actions: [
                                { key: "cancel", label: "Hủy", className: "btn-ghost" },
                                { key: "ok", label: "Xóa", className: "btn-danger" }
                            ],
                            onAction: function (key, close) {
                                if (key === "ok") {
                                    AdminCore.api("/admin/content/" + id, {
                                        method: "DELETE"
                                    })
                                        .then(function () {
                                            state.promotions = state.promotions.filter(function (x) { return x.id !== id; });
                                            renderTable();
                                            AdminCore.toast("Đã xóa nội dung", "success");
                                        })
                                        .catch(function (err) {
                                            AdminCore.toast(err.msg || "Lỗi khi xóa nội dung", "error");
                                        });
                                }
                                close();
                            }
                        });
                    }
                });
            });
        }

        function openContentModal(item) {
            var isEdit = !!item;
            var data = item || {
                id: "N-" + Math.floor(Math.random() * 900 + 100),
                title: "",
                type: "news",
                status: "draft",
                publishAt: "",
                author: "Admin",
                thumbnail: "../../assets/img/herobanner.jpg"
            };

            AdminCore.openModal({
                title: isEdit ? "Chỉnh sửa nội dung" : "Tạo nội dung mới",
                bodyHtml:
                    '<div class="form-grid-2">' +
                        '<label class="form-field"><span class="form-label">Tiêu đề</span><input class="input" id="cTitle" value="' + AdminCore.escapeHtml(data.title) + '" /></label>' +
                        '<label class="form-field"><span class="form-label">Mã</span><input class="input" id="cId" value="' + AdminCore.escapeHtml(data.id) + '" ' + (isEdit ? "disabled" : "") + " /></label>" +
                        '<label class="form-field"><span class="form-label">Loại</span><select class="select" id="cType"><option value="news">Tin tức</option><option value="promotion">Khuyến mãi</option></select></label>' +
                        '<label class="form-field"><span class="form-label">Trạng thái</span><select class="select" id="cStatus"><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label>' +
                        '<label class="form-field"><span class="form-label">Lịch publish</span><input class="input" id="cPublishAt" placeholder="YYYY-MM-DD HH:mm" value="' + AdminCore.escapeHtml(data.publishAt) + '" /></label>' +
                        '<label class="form-field"><span class="form-label">Thumbnail</span><input class="input" id="cThumb" value="' + AdminCore.escapeHtml(data.thumbnail) + '" /></label>' +
                    "</div>" +
                    '<label class="form-field" style="margin-top:10px"><span class="form-label">Nội dung (Rich text mô phỏng)</span><textarea class="textarea" id="cBody" placeholder="Nhập nội dung chi tiết để content admin thao tác nhanh..."></textarea></label>',
                actions: [
                    { key: "cancel", label: "Hủy", className: "btn-ghost" },
                    { key: "save", label: isEdit ? "Lưu" : "Tạo mới", className: "btn-primary" }
                ],
                onAction: async function (key, close) {
                    if (key !== "save") {
                        close();
                        return;
                    }

                    var payload = {
                        id: isEdit ? data.id : byId("cId").value.trim(),
                        title: byId("cTitle").value.trim(),
                        type: byId("cType").value,
                        status: byId("cStatus").value,
                        publishAt: byId("cPublishAt").value.trim(),
                        author: data.author,
                        thumbnail: byId("cThumb").value.trim() || data.thumbnail
                    };

                    if (!payload.id || !payload.title) {
                        AdminCore.toast("Thiếu mã hoặc tiêu đề", "error");
                        return;
                    }

                    try {
                        if (isEdit) {
                            await AdminCore.api("/admin/content/" + payload.id, {
                                method: "PUT",
                                body: JSON.stringify(payload)
                            });
                            state.promotions = state.promotions.map(function (x) { return x.id === payload.id ? Object.assign({}, x, payload) : x; });
                        } else {
                            await AdminCore.api("/admin/content", {
                                method: "POST",
                                body: JSON.stringify(payload)
                            });
                            state.promotions.unshift(payload);
                        }
                        renderTable();
                        close();
                        AdminCore.toast("Đã lưu nội dung", "success");
                    } catch (err) {
                        AdminCore.toast(err.msg || "Lỗi khi lưu nội dung", "error");
                    }
                }
            });

            setTimeout(function () {
                byId("cType").value = data.type;
                byId("cStatus").value = data.status;
            }, 0);
        }

        ["contentSearch", "contentType", "contentStatus"].forEach(function (id) {
            byId(id).addEventListener("input", renderTable);
            byId(id).addEventListener("change", renderTable);
        });

        byId("contentReset").addEventListener("click", function () {
            byId("contentSearch").value = "";
            byId("contentType").value = "all";
            byId("contentStatus").value = "all";
            renderTable();
        });

        byId("newContentBtn").addEventListener("click", function () {
            openContentModal(null);
        });

        renderTable();
    }

    function renderOrdersPage() {
        AdminCore.renderShell("orders", "Quản lý đơn hàng", "Theo dõi trạng thái đơn, thông tin thanh toán và vận chuyển");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<input class="input" id="orderSearch" placeholder="Tìm mã đơn hoặc khách hàng..." style="min-width:260px" />' +
                    '<select class="select" id="orderStatus"><option value="all">Tất cả trạng thái</option><option value="processing">Đang xử lý</option><option value="shipping">Đang giao</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select>' +
                    '<button class="btn btn-ghost" id="orderReset">Reset</button>' +
                "</div>" +
            "</div></div>" +
            '<article class="admin-card"><div class="admin-card-body" id="orderTableWrap"></div></article>'
        );

        function filteredOrders() {
            var q = byId("orderSearch").value.trim().toLowerCase();
            var s = byId("orderStatus").value;
            return state.orders.filter(function (item) {
                var qMatch = !q || item.id.toLowerCase().indexOf(q) !== -1 || item.customer.toLowerCase().indexOf(q) !== -1;
                var statusMatch = s === "all" || item.status === s;
                return qMatch && statusMatch;
            });
        }

        function orderTimeline(order) {
            var base = [
                { status: "processing", time: order.createdAt, text: "Đơn hàng đã được tạo" }
            ];
            if (order.status === "completed") {
                base.push({ status: "completed", time: "-", text: "Khách hàng nhận hàng thành công" });
            }
            if (order.status === "cancelled") {
                base.push({ status: "cancelled", time: "-", text: "Đơn hàng đã hủy" });
            }
            return base;
        }

        function renderTable() {
            var rows = filteredOrders();
            byId("orderTableWrap").innerHTML =
                AdminCore.table(
                    [
                        { label: "Mã đơn", key: "id" },
                        {
                            label: "Khách hàng",
                            render: function (o) {
                                return "<div><strong>" + o.customer + "</strong><div style='font-size:12px;color:#667085'>" + o.phone + "</div></div>";
                            }
                        },
                        { label: "Thanh toán", key: "payment" },
                        { label: "Vận chuyển", key: "shipping" },
                        { label: "Tổng tiền", render: function (o) { return AdminCore.formatCurrency(o.total); } },
                        { label: "Trạng thái", render: function (o) { return AdminCore.statusBadge("order", o.status); } },
                        {
                            label: "Thao tác",
                            render: function (o) {
                                return '<div class="table-actions"><button class="btn btn-ghost" data-order-action="view" data-id="' + o.id + '"><i class="fas fa-eye"></i></button><button class="btn btn-outline" data-order-action="edit" data-id="' + o.id + '"><i class="fas fa-pen"></i></button></div>';
                            }
                        }
                    ],
                    rows
                ) +
                AdminCore.pagination({ from: rows.length ? 1 : 0, to: rows.length, total: rows.length });

            document.querySelectorAll("[data-order-action]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var action = btn.getAttribute("data-order-action");
                    var order = state.orders.find(function (x) { return x.id === id; });
                    if (!order) return;

                    if (action === "view") {
                        var timelineHtml = orderTimeline(order)
                            .map(function (event) {
                                return '<div class="timeline-item"><strong>' + AdminCore.getStatusMeta("order", event.status).label + '</strong><div style="font-size:12px;color:#667085">' + event.time + '</div><div>' + event.text + "</div></div>";
                            })
                            .join("");

                        AdminCore.openDrawer({
                            title: "Chi tiết đơn hàng",
                            bodyHtml:
                                '<div style="display:grid;gap:12px">' +
                                    '<div><strong>' + order.id + '</strong> - ' + AdminCore.statusBadge("order", order.status) + '</div>' +
                                    '<div><strong>Khách hàng:</strong> ' + order.customer + ' - ' + order.phone + '</div>' +
                                    '<div><strong>Địa chỉ:</strong> ' + order.address + '</div>' +
                                    '<div><strong>Thanh toán:</strong> ' + order.payment + '</div>' +
                                    '<div><strong>Vận chuyển:</strong> ' + order.shipping + '</div>' +
                                    '<div><strong>Tổng tiền:</strong> ' + AdminCore.formatCurrency(order.total) + '</div>' +
                                    '<div><strong>Timeline trạng thái</strong><div class="timeline">' + timelineHtml + '</div></div>' +
                                "</div>",
                            actions: [{ key: "close", label: "Đóng", className: "btn-ghost" }],
                            onAction: function (_, close) { close(); }
                        });
                    } else if (action === "edit") {
                        openOrderStatusModal(order);
                    }
                });
            });
        }

        function openOrderStatusModal(order) {
            AdminCore.openModal({
                title: "Cập nhật trạng thái đơn",
                bodyHtml:
                    '<label class="form-field"><span class="form-label">Trạng thái</span><select class="select" id="oStatus"><option value="processing">Đang xử lý</option><option value="shipping">Đang giao</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select></label>',
                actions: [
                    { key: "cancel", label: "Hủy", className: "btn-ghost" },
                    { key: "save", label: "Lưu", className: "btn-primary" }
                ],
                onAction: async function (key, close) {
                    if (key === "save") {
                        var newStatus = byId("oStatus").value;
                        try {
                            await AdminCore.api("/admin/orders/" + order.id + "/status", {
                                method: "PUT",
                                body: JSON.stringify({ status: newStatus })
                            });
                            order.status = newStatus;
                            renderTable();
                            AdminCore.toast("Đã cập nhật đơn hàng", "success");
                        } catch (err) {
                            AdminCore.toast(err.msg || "Lỗi cập nhật đơn", "error");
                        }
                    }
                    close();
                }
            });
            setTimeout(function () { byId("oStatus").value = order.status; }, 0);
        }

        ["orderSearch", "orderStatus"].forEach(function (id) {
            byId(id).addEventListener("input", renderTable);
            byId(id).addEventListener("change", renderTable);
        });

        byId("orderReset").addEventListener("click", function () {
            byId("orderSearch").value = "";
            byId("orderStatus").value = "all";
            renderTable();
        });

        renderTable();
    }

    function renderSupportPage() {
        AdminCore.renderShell("support", "Hỗ trợ khách hàng", "Xem và phản hồi các yêu cầu tư vấn, hỗ trợ từ khách hàng");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<input class="input" id="supportSearch" placeholder="Tìm theo tên hoặc tiêu đề..." style="min-width:260px" />' +
                    '<select class="select" id="supportStatus"><option value="all">Tất cả trạng thái</option><option value="pending">Chờ xử lý</option><option value="resolved">Đã xử lý</option></select>' +
                    '<button class="btn btn-ghost" id="supportReset">Reset</button>' +
                "</div>" +
            "</div></div>" +
            '<article class="admin-card"><div class="admin-card-body" id="supportTableWrap"></div></article>'
        );

        function filteredSupport() {
            var q = byId("supportSearch").value.trim().toLowerCase();
            var s = byId("supportStatus").value;
            return state.support.filter(function (item) {
                var qMatch = !q || item.customer.toLowerCase().indexOf(q) !== -1 || item.subject.toLowerCase().indexOf(q) !== -1;
                var sMatch = s === "all" || item.status === s;
                return qMatch && sMatch;
            });
        }

        function renderTable() {
            var rows = filteredSupport();
            byId("supportTableWrap").innerHTML =
                AdminCore.table(
                    [
                        { label: "Ngày gửi", key: "createdAt" },
                        {
                            label: "Khách hàng",
                            render: function (r) {
                                return "<div><strong>" + r.customer + "</strong><div style='font-size:12px;color:#667085'>" + r.email + "</div></div>";
                            }
                        },
                        { label: "Tiêu đề", key: "subject" },
                        { label: "Trạng thái", render: function (r) { return AdminCore.statusBadge("support", r.status); } },
                        {
                            label: "Thao tác",
                            render: function (r) {
                                return '<div class="table-actions"><button class="btn btn-ghost" data-support-action="view" data-id="' + r.id + '"><i class="fas fa-eye"></i></button><button class="btn btn-outline" data-support-action="resolve" data-id="' + r.id + '"><i class="fas fa-check"></i></button></div>';
                            }
                        }
                    ],
                    rows
                );

            document.querySelectorAll("[data-support-action]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var action = btn.getAttribute("data-support-action");
                    var req = state.support.find(function (x) { return String(x.id) === id; });
                    if (!req) return;

                    if (action === "view") {
                        var isResolved = req.status === "resolved";
                        AdminCore.openDrawer({
                            title: "Chi tiết yêu cầu hỗ trợ",
                            bodyHtml:
                                '<div style="display:grid;gap:12px">' +
                                    '<div><strong>Khách hàng:</strong> ' + req.customer + '</div>' +
                                    '<div><strong>Liên hệ:</strong> ' + req.email + ' - ' + req.phone + '</div>' +
                                    '<div><strong>Tiêu đề:</strong> ' + req.subject + '</div>' +
                                    '<div style="background:#f9fafb;padding:12px;border-radius:6px;border:1px solid #e5e7eb"><strong>Nội dung:</strong><p>' + req.message + '</p></div>' +
                                    '<div style="height:1px;background:#e5e7eb;margin:4px 0"></div>' +
                                    '<div><strong>Gửi phản hồi cho khách hàng</strong></div>' +
                                    (isResolved 
                                        ? '<div style="background:#f0f9ff;padding:12px;border-radius:6px;border:1px solid #b9e6fe"><strong>Đã phản hồi:</strong><p>' + (req.response || "No response content") + '</p></div>'
                                        : '<textarea class="textarea" id="supportReply" placeholder="Nhập nội dung tư vấn, giải đáp..." style="height:120px"></textarea>') +
                                    '<div><strong>Trạng thái:</strong> ' + AdminCore.statusBadge("support", req.status) + '</div>' +
                                "</div>",
                            actions: [
                                { key: "close", label: "Đóng", className: "btn-ghost" },
                                (isResolved ? null : { key: "send", label: "Gửi phản hồi", className: "btn-primary" })
                            ].filter(Boolean),
                            onAction: async function (key, close) {
                                if (key === "send") {
                                    var replyText = document.getElementById("supportReply").value.trim();
                                    if (!replyText) {
                                        AdminCore.toast("Vui lòng nhập nội dung phản hồi", "error");
                                        return;
                                    }
                                    try {
                                        await AdminCore.api("/admin/support/" + id + "/respond", {
                                            method: "PUT",
                                            body: JSON.stringify({ response: replyText })
                                        });
                                        req.status = "resolved";
                                        req.response = replyText;
                                        renderTable();
                                        AdminCore.toast("Đã gửi phản hồi thành công", "success");
                                        close();
                                    } catch (err) {
                                        AdminCore.toast(err.msg || "Lỗi gửi phản hồi", "error");
                                    }
                                } else {
                                    close();
                                }
                            }
                        });
                    } else if (action === "resolve") {
                        AdminCore.openModal({
                            title: "Xác nhận xử lý",
                            bodyHtml: "<p>Đánh dấu yêu cầu của <strong>" + req.customer + "</strong> là đã xử lý xong?</p>",
                            actions: [
                                { key: "cancel", label: "Hủy", className: "btn-ghost" },
                                { key: "ok", label: "Xác nhận", className: "btn-primary" }
                            ],
                            onAction: async function (key, close) {
                                if (key === "ok") {
                                    try {
                                        await AdminCore.api("/admin/support/" + id + "/status", {
                                            method: "PUT",
                                            body: JSON.stringify({ status: "resolved" })
                                        });
                                        req.status = "resolved";
                                        renderTable();
                                        AdminCore.toast("Đã xử lý yêu cầu", "success");
                                    } catch (err) {
                                        AdminCore.toast(err.msg || "Lỗi cập nhật", "error");
                                    }
                                }
                                close();
                            }
                        });
                    }
                });
            });
        }

        ["supportSearch", "supportStatus"].forEach(function (id) {
            byId(id).addEventListener("input", renderTable);
            byId(id).addEventListener("change", renderTable);
        });

        byId("supportReset").addEventListener("click", function () {
            byId("supportSearch").value = "";
            byId("supportStatus").value = "all";
            renderTable();
        });

        renderTable();
    }

    function openStockImportModal(product) {
        AdminCore.openModal({
            title: "Nhập thêm hàng vào kho",
            bodyHtml: '<p>Bạn đang nhập thêm hàng cho: <strong>' + product.name + '</strong></p>' +
                      '<p>Số lượng hiện tại: <strong>' + product.stock + '</strong></p>' +
                      '<label class="form-field"><span class="form-label">Số lượng nhập thêm</span>' +
                      '<input type="number" class="input" id="importQty" value="10" min="1" /></label>',
            actions: [
                { key: "cancel", label: "Hủy", className: "btn-ghost" },
                { key: "ok", label: "Xác nhận nhập", className: "btn-primary" }
            ],
            onAction: async function (key, close) {
                if (key === "ok") {
                    var qty = parseInt(document.getElementById("importQty").value);
                    try {
                        var res = await AdminCore.api("/admin/products/" + product.id + "/stock", {
                            method: "PUT",
                            body: JSON.stringify({ stock: qty })
                        });
                        product.stock = res.currentStock;
                        renderTable();
                        AdminCore.toast(res.msg, "success");
                    } catch (err) {
                        AdminCore.toast(err.msg || "Lỗi nhập kho", "error");
                    }
                }
                close();
            }
        });
    }

    function renderBannersPage() {
        AdminCore.renderShell("banners", "Quản lý Banner", "Quản lý hình ảnh quảng cáo và vị trí hiển thị trên trang chủ");

        AdminCore.setContent(
            '<div class="admin-card"><div class="admin-card-body">' +
                '<div class="filter-bar">' +
                    '<button class="btn btn-primary" id="addBannerBtn"><i class="fas fa-plus"></i> Thêm Banner mới</button>' +
                "</div>" +
            "</div></div>" +
            '<article class="admin-card"><div class="admin-card-body" id="bannerTableWrap"></div></article>'
        );

        function renderTable() {
            byId("bannerTableWrap").innerHTML = AdminCore.table(
                [
                    { label: "ID", key: "id" },
                    { label: "Hình ảnh", render: function(b) { return '<img src="' + b.image + '" style="width:120px;height:60px;object-fit:cover;border-radius:4px" />'; } },
                    { label: "Tiêu đề", key: "title" },
                    { label: "Vị trí", key: "position" },
                    { label: "Trạng thái", render: function(b) { return AdminCore.statusBadge("banner", b.status); } },
                    { label: "Thao tác", render: function(b) {
                        return '<div class="table-actions">' +
                               '<button class="btn btn-ghost" data-banner-action="edit" data-id="' + b.id + '"><i class="fas fa-pen"></i></button>' +
                               '<button class="btn btn-danger" data-banner-action="delete" data-id="' + b.id + '"><i class="fas fa-trash"></i></button>' +
                               '</div>';
                    }}
                ],
                state.banners
            );

            document.querySelectorAll("[data-banner-action]").forEach(function(btn) {
                btn.addEventListener("click", function() {
                    var id = btn.getAttribute("data-id");
                    var action = btn.getAttribute("data-banner-action");
                    var banner = state.banners.find(function(b) { return String(b.id) === id; });
                    if (!banner) return;

                    if (action === "edit") {
                        openBannerModal(banner);
                    } else if (action === "delete") {
                        AdminCore.openModal({
                            title: "Xác nhận xóa Banner",
                            bodyHtml: "<p>Bạn có chắc muốn xóa banner này?</p>",
                            actions: [
                                { key: "cancel", label: "Hủy", className: "btn-ghost" },
                                { key: "ok", label: "Xóa", className: "btn-danger" }
                            ],
                            onAction: async function(key, close) {
                                if (key === "ok") {
                                    try {
                                        await AdminCore.api("/admin/banners/" + id, { method: "DELETE" });
                                        state.banners = state.banners.filter(function(b) { return String(b.id) !== id; });
                                        renderTable();
                                        AdminCore.toast("Đã xóa banner", "success");
                                    } catch (err) {
                                        AdminCore.toast(err.msg || "Lỗi xóa banner", "error");
                                    }
                                }
                                close();
                            }
                        });
                    }
                });
            });
        }

        function openBannerModal(banner) {
            var isEdit = !!banner;
            var data = banner || { title: "", image: "", link: "#", position: "main", status: "active" };

            AdminCore.openModal({
                title: isEdit ? "Chỉnh sửa Banner" : "Thêm Banner mới",
                bodyHtml: '<div class="form-grid-2">' +
                          '<label class="form-field"><span class="form-label">Tiêu đề</span><input class="input" id="bTitle" value="' + data.title + '" /></label>' +
                          '<label class="form-field"><span class="form-label">Link liên kết</span><input class="input" id="bLink" value="' + data.link + '" /></label>' +
                          '<label class="form-field"><span class="form-label">Vị trí</span><select class="select" id="bPos"><option value="main">Trang chủ (Chính)</option><option value="sub">Danh mục (Phụ)</option></select></label>' +
                          '<label class="form-field"><span class="form-label">Trạng thái</span><select class="select" id="bStatus"><option value="active">Hiển thị</option><option value="hidden">Ẩn</option></select></label>' +
                          '</div>' +
                          '<label class="form-field" style="margin-top:10px"><span class="form-label">URL Hình ảnh</span><input class="input" id="bImg" value="' + data.image + '" /></label>',
                actions: [
                    { key: "cancel", label: "Hủy", className: "btn-ghost" },
                    { key: "save", label: "Lưu", className: "btn-primary" }
                ],
                onAction: async function(key, close) {
                    if (key === "save") {
                        var payload = {
                            title: byId("bTitle").value,
                            link: byId("bLink").value,
                            position: byId("bPos").value,
                            status: byId("bStatus").value,
                            image: byId("bImg").value
                        };
                        try {
                            if (isEdit) {
                                await AdminCore.api("/admin/banners/" + banner.id, { method: "PUT", body: JSON.stringify(payload) });
                                Object.assign(banner, payload);
                            } else {
                                await AdminCore.api("/admin/banners", { method: "POST", body: JSON.stringify(payload) });
                                state.banners = await AdminCore.api("/admin/banners");
                            }
                            renderTable();
                            AdminCore.toast("Đã lưu banner", "success");
                            close();
                        } catch (err) {
                            AdminCore.toast(err.msg || "Lỗi lưu banner", "error");
                        }
                    } else {
                        close();
                    }
                }
            });
            setTimeout(function() {
                byId("bPos").value = data.position;
                byId("bStatus").value = data.status;
            }, 0);
        }

        byId("addBannerBtn").addEventListener("click", function() { openBannerModal(null); });
        renderTable();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
