(function () {
    var state = {
        products: (window.AdminData && window.AdminData.products ? window.AdminData.products.slice() : []),
        users: (window.AdminData && window.AdminData.users ? window.AdminData.users.slice() : []),
        promotions: (window.AdminData && window.AdminData.promotions ? window.AdminData.promotions.slice() : []),
        orders: (window.AdminData && window.AdminData.orders ? window.AdminData.orders.slice() : []),
        dashboard: (window.AdminData && window.AdminData.dashboard) || null
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function init() {
        var page = document.body.getAttribute("data-page") || "dashboard";
        if (page === "dashboard") {
            renderDashboard();
        } else if (page === "products") {
            renderProductsPage();
        } else if (page === "users") {
            renderUsersPage();
        } else if (page === "content") {
            renderContentPage();
        } else if (page === "orders") {
            renderOrdersPage();
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
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Doanh thu theo ngày</h3></div><div class="admin-card-body"><div class="chart-box"><div id="revenueChart" class="simple-chart"></div></div></div></article>' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Đơn hàng theo ngày</h3></div><div class="admin-card-body"><div class="chart-box"><div id="ordersChart" class="simple-chart"></div></div></div></article>' +
            "</section>" +

            '<section class="admin-grid-3">' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Top sản phẩm bán chạy</h3></div><div class="admin-card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Top</th><th>Sản phẩm</th><th>Đã bán</th><th>Giá</th></tr></thead><tbody>' + topProducts + '</tbody></table></div></div></article>' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Đơn hàng gần đây</h3></div><div class="admin-card-body"><div class="table-wrap"><table class="table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th><th>Tổng</th></tr></thead><tbody>' + recentOrders + '</tbody></table></div></div></article>' +
                '<article class="admin-card"><div class="admin-card-header"><h3 class="admin-card-title">Cảnh báo tồn kho thấp</h3></div><div class="admin-card-body"><div class="stock-alert-list">' + stockAlert + '</div></div></article>' +
            "</section>"
        );

        AdminCore.drawLineChart("revenueChart", state.dashboard.labels, state.dashboard.revenueSeries, "#0076df");
        AdminCore.drawLineChart("ordersChart", state.dashboard.labels, state.dashboard.ordersSeries, "#d70018");

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
                                '<button class="btn btn-ghost" data-product-action="view" data-id="' + row.id + '"><i class="fas fa-eye"></i></button>' +
                                '<button class="btn btn-ghost" data-product-action="edit" data-id="' + row.id + '"><i class="fas fa-pen"></i></button>' +
                                '<button class="btn btn-danger" data-product-action="delete" data-id="' + row.id + '"><i class="fas fa-trash"></i></button>' +
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
                            onAction: function (key, close) {
                                if (key === "ok") {
                                    state.products = state.products.filter(function (p) { return p.id !== id; });
                                    renderTable();
                                    AdminCore.toast("Đã xóa sản phẩm", "success");
                                }
                                close();
                            }
                        });
                    }
                });
            });
        }

        function openProductDrawer(item) {
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
                image: "../../assets/img/LOGO1.png"
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
                    '<div class="form-field" style="margin-top:10px"><span class="form-label">Upload ảnh</span><label class="upload-box" for="pImage">Chọn ảnh thumbnail<input id="pImage" type="file" accept="image/*" style="display:none" /></label><div class="thumb-grid" id="pThumb"><img src="' + data.image + '" /></div></div>',
                actions: [
                    { key: "cancel", label: "Hủy", className: "btn-ghost" },
                    { key: "save", label: isEdit ? "Lưu thay đổi" : "Tạo sản phẩm", className: "btn-primary" }
                ],
                onAction: function (key, close) {
                    if (key !== "save") {
                        close();
                        return;
                    }

                    var payload = {
                        id: isEdit ? data.id : byId("pId").value.trim(),
                        name: byId("pName").value.trim(),
                        category: byId("pCategory").value,
                        price: Number(byId("pPrice").value || 0),
                        stock: Number(byId("pStock").value || 0),
                        status: byId("pStatus").value,
                        sold: data.sold || 0,
                        image: data.image
                    };

                    if (!payload.name || !payload.id) {
                        AdminCore.toast("Thiếu tên hoặc mã sản phẩm", "error");
                        return;
                    }

                    if (isEdit) {
                        state.products = state.products.map(function (p) { return p.id === payload.id ? Object.assign({}, p, payload) : p; });
                    } else {
                        state.products.unshift(payload);
                    }

                    renderTable();
                    close();
                    AdminCore.toast(isEdit ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới", "success");
                }
            });

            setTimeout(function () {
                byId("pCategory").value = data.category;
                byId("pStatus").value = data.status;
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
        AdminCore.renderShell("users", "Quản lý người dùng", "Theo dõi tài khoản, trạng thái và lịch sử mua hàng của khách");

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
                                    "</div>"
                                );
                            }
                        }
                    ],
                    rows
                ) +
                AdminCore.pagination({ from: rows.length ? 1 : 0, to: rows.length, total: rows.length });

            document.querySelectorAll("[data-user-action='view']").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    var id = btn.getAttribute("data-id");
                    var user = state.users.find(function (u) { return u.id === id; });
                    if (!user) {
                        return;
                    }
                    AdminCore.openDrawer({
                        title: "Chi tiết người dùng",
                        bodyHtml:
                            '<div style="display:grid;gap:8px">' +
                                '<div><strong>' + user.name + '</strong></div>' +
                                '<div>Email: ' + user.email + '</div>' +
                                '<div>SĐT: ' + user.phone + '</div>' +
                                '<div>Role: <span class="badge info">' + user.role + '</span></div>' +
                                '<div>Trạng thái: ' + AdminCore.statusBadge("user", user.status) + '</div>' +
                                '<div>Ngày tham gia: ' + user.joinedAt + '</div>' +
                                '<div>Số đơn hàng: ' + user.orders + '</div>' +
                                '<div>Tổng chi tiêu: ' + AdminCore.formatCurrency(user.totalSpent) + '</div>' +
                            "</div>",
                        actions: [{ key: "close", label: "Đóng", className: "btn-ghost" }],
                        onAction: function (_, close) { close(); }
                    });
                });
            });

            document.querySelectorAll("[data-user-action='switch']").forEach(function (cb) {
                cb.addEventListener("change", function () {
                    var id = cb.getAttribute("data-id");
                    var user = state.users.find(function (u) { return u.id === id; });
                    if (!user) {
                        return;
                    }
                    user.status = cb.checked ? "active" : "locked";
                    AdminCore.toast("Đã cập nhật trạng thái tài khoản", "success");
                    renderTable();
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
                                    state.promotions = state.promotions.filter(function (x) { return x.id !== id; });
                                    renderTable();
                                    AdminCore.toast("Đã xóa nội dung", "success");
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
                onAction: function (key, close) {
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

                    if (isEdit) {
                        state.promotions = state.promotions.map(function (x) { return x.id === payload.id ? Object.assign({}, x, payload) : x; });
                    } else {
                        state.promotions.unshift(payload);
                    }
                    renderTable();
                    close();
                    AdminCore.toast("Đã lưu nội dung", "success");
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
                { status: "processing", time: order.createdAt, text: "Đơn hàng đã được tạo" },
                { status: "shipping", time: "2026-03-25 08:30", text: "Đơn đã bàn giao đơn vị vận chuyển" },
                { status: "completed", time: "2026-03-26 14:10", text: "Khách hàng nhận hàng thành công" }
            ];
            if (order.status === "cancelled") {
                base.push({ status: "cancelled", time: "2026-03-25 10:15", text: "Đơn hàng đã hủy theo yêu cầu" });
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
                        { label: "Sản phẩm", key: "items" },
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
                    if (!order) {
                        return;
                    }

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
                            actions: [
                                { key: "close", label: "Đóng", className: "btn-ghost" }
                            ],
                            onAction: function (key, close) {
                                close();
                            }
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
                    '<label class="form-field">' +
                        '<span class="form-label">Trạng thái</span>' +
                        '<select class="select" id="oStatus">' +
                            '<option value="processing">Đang xử lý</option>' +
                            '<option value="shipping">Đang giao</option>' +
                            '<option value="completed">Hoàn thành</option>' +
                            '<option value="cancelled">Đã hủy</option>' +
                        '</select>' +
                    '</label>',
                actions: [
                    { key: "cancel", label: "Hủy", className: "btn-ghost" },
                    { key: "save", label: "Lưu", className: "btn-primary" }
                ],
                onAction: function (key, close) {
                    if (key === "save") {
                        order.status = byId("oStatus").value;
                        renderTable();
                        AdminCore.toast("Đã cập nhật trạng thái đơn", "success");
                    }
                    close();
                }
            });

            setTimeout(function () {
                byId("oStatus").value = order.status;
            }, 0);
        }

        function nextOrderStatus(status) {
            if (status === "processing") {
                return "shipping";
            }
            if (status === "shipping") {
                return "completed";
            }
            return status;
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

    document.addEventListener("DOMContentLoaded", init);
})();
