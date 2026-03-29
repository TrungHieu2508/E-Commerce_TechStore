(function () {
    function ensureAdminAccess() {
        var raw = localStorage.getItem("nextech_auth");
        if (!raw) {
            window.location.href = "../login.html";
            return false;
        }

        try {
            var auth = JSON.parse(raw);
            if (!auth || auth.role !== "admin") {
                window.location.href = "../login.html";
                return false;
            }
        } catch (error) {
            localStorage.removeItem("nextech_auth");
            window.location.href = "../login.html";
            return false;
        }

        return true;
    }

    if (!ensureAdminAccess()) {
        return;
    }

    var menuItems = [
        { key: "dashboard", label: "Thống kê", icon: "fa-chart-line", href: "dashboard.html" },
        { key: "products", label: "Sản phẩm", icon: "fa-box-open", href: "products.html" },
        { key: "users", label: "Người dùng", icon: "fa-users", href: "users.html" },
        { key: "content", label: "Tin tức / Khuyến mãi", icon: "fa-bullhorn", href: "content.html" },
        { key: "banners", label: "Quản lý Banner", icon: "fa-images", href: "banners.html" },
        { key: "orders", label: "Đơn hàng", icon: "fa-receipt", href: "orders.html" },
        { key: "support", label: "Hỗ trợ khách hàng", icon: "fa-headset", href: "support.html" }
    ];

    function formatCurrency(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " đ";
    }

    function formatCompactNumber(value) {
        return Number(value || 0).toLocaleString("vi-VN");
    }

    function getStatusMeta(kind, status) {
        var maps = {
            product: {
                active: { label: "Đang bán", tone: "success" },
                hidden: { label: "Đã ẩn", tone: "neutral" },
                low_stock: { label: "Sắp hết", tone: "warning" }
            },
            user: {
                active: { label: "Hoạt động", tone: "success" },
                locked: { label: "Đã khóa", tone: "danger" }
            },
            content: {
                published: { label: "Published", tone: "success" },
                draft: { label: "Draft", tone: "neutral" },
                scheduled: { label: "Scheduled", tone: "info" }
            },
            order: {
                processing: { label: "Đang xử lý", tone: "warning" },
                shipping: { label: "Đang giao", tone: "info" },
                completed: { label: "Hoàn thành", tone: "success" },
                cancelled: { label: "Đã hủy", tone: "danger" }
            },
            banner: {
                active: { label: "Hiển thị", tone: "success" },
                hidden: { label: "Đã ẩn", tone: "neutral" }
            },
            support: {
                pending: { label: "Chờ xử lý", tone: "warning" },
                resolved: { label: "Đã xử lý", tone: "success" }
            }
        };
        var group = maps[kind] || {};
        return group[status] || { label: status, tone: "neutral" };
    }

    function statusBadge(kind, status) {
        var meta = getStatusMeta(kind, status);
        return '<span class="badge ' + meta.tone + '">' + meta.label + "</span>";
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderShell(pageKey, pageTitle, subtitle) {
        var app = document.getElementById("adminApp");
        if (!app) {
            return;
        }

        var nav = menuItems
            .map(function (item) {
                var active = item.key === pageKey ? " active" : "";
                return (
                    '<a class="admin-nav-link' +
                    active +
                    '" href="' +
                    item.href +
                    '"><i class="fas ' +
                    item.icon +
                    '"></i><span>' +
                    item.label +
                    "</span></a>"
                );
            })
            .join("");

        app.innerHTML =
            '<div class="admin-shell">' +
            '<aside class="admin-sidebar" id="adminSidebar">' +
            '<div class="admin-brand">' +
            '<img src="../../assets/img/LOGO1.png" alt="NexTech" />' +
            '<div><div class="admin-brand-title">NexTech Admin</div><div class="admin-brand-sub">Control Center</div></div>' +
            "</div>" +
            '<nav class="admin-nav">' +
            nav +
            "</nav>" +
            "</aside>" +
            '<main class="admin-main">' +
            '<header class="admin-topbar">' +
            '<div class="admin-top-left">' +
            '<div class="admin-breadcrumbs"><span>Admin</span><i class="fas fa-chevron-right" style="font-size:10px"></i><span class="current">' +
            escapeHtml(pageTitle) +
            "</span></div>" +
            '<h1 class="admin-page-title">' +
            escapeHtml(pageTitle) +
            "</h1>" +
            '<small style="color:#6b7280">' +
            escapeHtml(subtitle || "") +
            "</small>" +
            "</div>" +
            '<div class="admin-top-right">' +
            '<button class="mobile-menu-btn" id="mobileMenuBtn"><i class="fas fa-bars"></i></button>' +
            '<label class="admin-top-search"><i class="fas fa-search" style="color:#98a2b3"></i><input id="globalAdminSearch" placeholder="Tìm kiếm nhanh..." /></label>' +
            '<button class="btn btn-ghost" type="button" id="notifyBtn"><i class="fas fa-bell"></i></button>' +
            '<button class="btn btn-ghost" type="button" id="logoutBtn" title="Đăng xuất"><i class="fas fa-sign-out-alt"></i></button>' +
            '<div class="admin-avatar">AD</div>' +
            "</div>" +
            "</header>" +
            '<section class="admin-content" id="adminContent"></section>' +
            "</main>" +
            "</div>";

        var logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", function () {
                localStorage.removeItem("nextech_auth");
                window.location.href = "../login.html";
            });
        }

        var btn = document.getElementById("mobileMenuBtn");
        if (btn) {
            btn.addEventListener("click", function () {
                var sidebar = document.getElementById("adminSidebar");
                if (sidebar) {
                    sidebar.classList.toggle("open");
                }
            });
        }

        var notifyBtn = document.getElementById("notifyBtn");
        if (notifyBtn) {
            notifyBtn.addEventListener("click", function () {
                toast("Thông báo mới đã được đồng bộ", "success");
            });
        }
    }

    function setContent(html) {
        var content = document.getElementById("adminContent");
        if (content) {
            content.innerHTML = html;
        }
    }

    function table(columns, rows) {
        var thead =
            "<tr>" +
            columns
                .map(function (col) {
                    return "<th>" + escapeHtml(col.label) + "</th>";
                })
                .join("") +
            "</tr>";

        var tbody = rows.length
            ? rows
                  .map(function (row) {
                      return (
                          "<tr>" +
                          columns
                              .map(function (col) {
                                  if (typeof col.render === "function") {
                                      return "<td>" + col.render(row) + "</td>";
                                  }
                                  return "<td>" + escapeHtml(row[col.key] == null ? "" : row[col.key]) + "</td>";
                              })
                              .join("") +
                          "</tr>"
                      );
                  })
                  .join("")
            : '<tr><td colspan="' + columns.length + '"><div class="empty-state"><i class="fas fa-box-open"></i><div>Không có dữ liệu.</div></div></td></tr>';

        return '<div class="table-wrap"><table class="table"><thead>' + thead + "</thead><tbody>" + tbody + "</tbody></table></div>";
    }

    function pagination(meta) {
        var text = "Hiển thị " + meta.from + " - " + meta.to + " trên " + meta.total + " dòng";
        return (
            '<div class="pagination">' +
            '<div class="pagination-meta">' +
            text +
            "</div>" +
            '<div class="pagination-actions">' +
            '<button class="btn btn-ghost" data-page-action="prev"><i class="fas fa-chevron-left"></i> Trước</button>' +
            '<button class="btn btn-ghost" data-page-action="next">Sau <i class="fas fa-chevron-right"></i></button>' +
            "</div></div>"
        );
    }

    function openModal(opts) {
        var root = document.getElementById("adminModalRoot");
        if (!root) {
            return;
        }

        var footer = (opts.actions || [])
            .map(function (act) {
                return '<button class="btn ' + act.className + '" data-modal-action="' + act.key + '">' + act.label + "</button>";
            })
            .join("");

        root.innerHTML =
            '<div class="admin-modal-overlay open" id="adminModalOverlay"></div>' +
            '<div class="admin-modal open" id="adminModal">' +
            '<div class="admin-modal-header"><strong>' +
            escapeHtml(opts.title || "") +
            "</strong></div>" +
            '<div class="admin-modal-body">' +
            (opts.bodyHtml || "") +
            "</div>" +
            '<div class="admin-modal-footer">' +
            footer +
            "</div></div>";

        function close() {
            root.innerHTML = "";
        }

        var overlay = document.getElementById("adminModalOverlay");
        if (overlay) {
            overlay.addEventListener("click", close);
        }

        root.querySelectorAll("[data-modal-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var key = btn.getAttribute("data-modal-action");
                if (typeof opts.onAction === "function") {
                    opts.onAction(key, close);
                } else {
                    close();
                }
            });
        });
    }

    function openDrawer(opts) {
        var root = document.getElementById("adminDrawerRoot");
        if (!root) {
            root = document.createElement("div");
            root.id = "adminDrawerRoot";
            document.body.appendChild(root);
        }

        var footer = (opts.actions || [])
            .map(function (act) {
                return '<button class="btn ' + act.className + '" data-drawer-action="' + act.key + '">' + act.label + "</button>";
            })
            .join("");

        root.innerHTML =
            '<div class="admin-drawer-overlay open" id="adminDrawerOverlay"></div>' +
            '<aside class="admin-drawer open" id="adminDrawer">' +
            '<div class="admin-drawer-header"><strong>' +
            escapeHtml(opts.title || "") +
            "</strong></div>" +
            '<div class="admin-drawer-body">' +
            (opts.bodyHtml || "") +
            "</div>" +
            '<div class="admin-drawer-footer">' +
            footer +
            "</div></aside>";

        function close() {
            root.innerHTML = "";
        }

        var overlay = document.getElementById("adminDrawerOverlay");
        if (overlay) {
            overlay.addEventListener("click", close);
        }

        root.querySelectorAll("[data-drawer-action]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var key = btn.getAttribute("data-drawer-action");
                if (typeof opts.onAction === "function") {
                    opts.onAction(key, close);
                } else {
                    close();
                }
            });
        });
    }

    function toast(message, tone) {
        var root = document.getElementById("adminToastRoot");
        if (!root) {
            root = document.createElement("div");
            root.id = "adminToastRoot";
            root.className = "toast-root";
            document.body.appendChild(root);
        }

        var node = document.createElement("div");
        node.className = "toast " + (tone || "info");
        node.textContent = message;
        root.appendChild(node);

        setTimeout(function () {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        }, 2600);
    }

    function drawLineChart(targetId, labels, series, color) {
        var node = document.getElementById(targetId);
        if (!node) {
            return;
        }

        var width = 680;
        var height = 220;
        var max = Math.max.apply(Math, series);
        var min = Math.min.apply(Math, series);
        var range = max - min || 1;

        var points = series
            .map(function (v, i) {
                var x = (i / (series.length - 1)) * (width - 40) + 20;
                var y = height - ((v - min) / range) * (height - 40) - 20;
                return x.toFixed(2) + "," + y.toFixed(2);
            })
            .join(" ");

        var labelHtml = labels
            .map(function (label, i) {
                var x = (i / (labels.length - 1)) * (width - 40) + 20;
                return '<text x="' + x.toFixed(2) + '" y="214" font-size="11" fill="#667085" text-anchor="middle">' + escapeHtml(label) + "</text>";
            })
            .join("");

        node.innerHTML =
            '<svg class="simple-chart" viewBox="0 0 ' +
            width +
            " " +
            height +
            '" preserveAspectRatio="none">' +
            '<polyline fill="none" stroke="' +
            color +
            '" stroke-width="3" points="' +
            points +
            '"></polyline>' +
            labelHtml +
            "</svg>";
    }

    var API_BASE = "http://localhost:5000";

    async function api(path, options) {
        options = options || {};
        var raw = localStorage.getItem("nextech_auth");
        var auth = raw ? JSON.parse(raw) : null;
        
        var headers = Object.assign({
            "Content-Type": "application/json",
            "Authorization": auth ? "Bearer " + auth.access_token : ""
        }, options.headers || {});

        try {
            var response = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
            var data = await response.json();
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Unauthorized/Forbidden
                    toast(data.msg || "Hết phiên đăng nhập", "error");
                    // Optional: redirect to login
                }
                throw data;
            }
            return data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }

    window.AdminCore = {
        menuItems: menuItems,
        formatCurrency: formatCurrency,
        formatCompactNumber: formatCompactNumber,
        statusBadge: statusBadge,
        getStatusMeta: getStatusMeta,
        renderShell: renderShell,
        setContent: setContent,
        table: table,
        pagination: pagination,
        openModal: openModal,
        openDrawer: openDrawer,
        toast: toast,
        drawLineChart: drawLineChart,
        escapeHtml: escapeHtml,
        api: api
    };
})();
