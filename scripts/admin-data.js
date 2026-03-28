(function () {
    var products = [
        { id: "P-1001", name: "iPhone 17 Pro Max 256GB", category: "Điện thoại", price: 37790000, stock: 24, status: "active", sold: 196, image: "../../assets/img/IP1.png" },
        { id: "P-1002", name: "Samsung Galaxy S26 Ultra", category: "Điện thoại", price: 33990000, stock: 7, status: "active", sold: 122, image: "../../assets/img/SS1.png" },
        { id: "P-1003", name: "Laptop Dell XPS 9350", category: "Laptop", price: 54990000, stock: 4, status: "active", sold: 55, image: "../../assets/img/DELL1.png" },
        { id: "P-1004", name: "Màn hình Asus ROG XG32UQ", category: "Màn hình", price: 21990000, stock: 3, status: "low_stock", sold: 73, image: "../../assets/img/MH1.png" },
        { id: "P-1005", name: "Bàn phím cơ VGN N75 Pro", category: "Phụ kiện", price: 1590000, stock: 58, status: "active", sold: 310, image: "../../assets/img/BP1.png" },
        { id: "P-1006", name: "RAM Corsair Dominator 32GB", category: "Linh kiện", price: 5890000, stock: 0, status: "hidden", sold: 88, image: "../../assets/img/RAM4.png" },
        { id: "P-1007", name: "AMD Ryzen 5 9600X", category: "Linh kiện", price: 7990000, stock: 19, status: "active", sold: 145, image: "../../assets/img/CPU1.png" }
    ];

    var users = [
        { id: "U-001", name: "Nguyen Hoang Minh", email: "minh.nguyen@gmail.com", phone: "0901122334", role: "customer", status: "active", orders: 12, totalSpent: 182500000, joinedAt: "2025-07-10" },
        { id: "U-002", name: "Tran Khanh Linh", email: "linh.tran@gmail.com", phone: "0912233445", role: "customer", status: "active", orders: 5, totalSpent: 43600000, joinedAt: "2025-11-03" },
        { id: "U-003", name: "Le Quang Huy", email: "huy.le@gmail.com", phone: "0963344556", role: "customer", status: "locked", orders: 1, totalSpent: 1590000, joinedAt: "2026-02-19" },
        { id: "U-004", name: "Pham Thu Ha", email: "ha.pham@nextech.vn", phone: "0988123456", role: "staff", status: "active", orders: 0, totalSpent: 0, joinedAt: "2024-03-04" },
        { id: "U-005", name: "Vu Duc Long", email: "long.vu@nextech.vn", phone: "0978456123", role: "admin", status: "active", orders: 0, totalSpent: 0, joinedAt: "2023-10-12" }
    ];

    var promotions = [
        { id: "N-201", title: "Hot Deal Laptop RTX", type: "promotion", status: "published", publishAt: "2026-03-25 09:00", author: "Pham Thu Ha", thumbnail: "../../assets/img/ads-deal.png" },
        { id: "N-202", title: "Tin công nghệ tuần 13", type: "news", status: "draft", publishAt: "", author: "Pham Thu Ha", thumbnail: "../../assets/img/herobanner.jpg" },
        { id: "N-203", title: "Flash Sale màn hình gaming", type: "promotion", status: "scheduled", publishAt: "2026-03-30 08:00", author: "Vu Duc Long", thumbnail: "../../assets/img/ads-monitor.png" },
        { id: "N-204", title: "Review iPhone 17 Pro Max", type: "news", status: "published", publishAt: "2026-03-21 11:30", author: "Vu Duc Long", thumbnail: "../../assets/img/IP1.png" }
    ];

    var orders = [
        { id: "ORD-240321-1001", customer: "Nguyen Hoang Minh", phone: "0901122334", total: 37790000, payment: "COD", shipping: "GHN", status: "processing", createdAt: "2026-03-21 10:12", items: 1, address: "31 Le Loi, Q1, TP.HCM" },
        { id: "ORD-240321-1002", customer: "Tran Khanh Linh", phone: "0912233445", total: 33990000, payment: "Banking", shipping: "GHN", status: "shipping", createdAt: "2026-03-21 14:05", items: 1, address: "82 Nguyen Trai, Ha Noi" },
        { id: "ORD-240322-1003", customer: "Le Quang Huy", phone: "0963344556", total: 1590000, payment: "COD", shipping: "Viettel Post", status: "completed", createdAt: "2026-03-22 09:45", items: 1, address: "112 Tran Phu, Da Nang" },
        { id: "ORD-240323-1004", customer: "Pham Tuan Kiet", phone: "0939911223", total: 21990000, payment: "Banking", shipping: "GHN", status: "cancelled", createdAt: "2026-03-23 18:27", items: 1, address: "5 Nguyen Van Cu, Can Tho" },
        { id: "ORD-240324-1005", customer: "Do Thi Lan", phone: "0987766554", total: 5890000, payment: "COD", shipping: "J&T", status: "processing", createdAt: "2026-03-24 11:02", items: 1, address: "44 Le Duan, Hue" }
    ];

    var dashboard = {
        kpis: [
            { key: "revenue", label: "Doanh thu tháng", value: 1285400000, trend: 12.3, trendLabel: "so với tháng trước" },
            { key: "orders", label: "Đơn hàng mới", value: 438, trend: 8.1, trendLabel: "so với tuần trước" },
            { key: "users", label: "Người dùng hoạt động", value: 2671, trend: -2.4, trendLabel: "so với tuần trước" },
            { key: "aov", label: "Giá trị trung bình đơn", value: 2935000, trend: 3.2, trendLabel: "so với tháng trước" }
        ],
        labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
        revenueSeries: [120, 180, 160, 210, 260, 240, 290],
        ordersSeries: [44, 63, 59, 71, 83, 79, 92],
        usersSeries: [2100, 2145, 2180, 2204, 2240, 2268, 2291],
        lowStock: [
            { id: "P-1004", name: "Màn hình Asus ROG XG32UQ", stock: 3 },
            { id: "P-1003", name: "Laptop Dell XPS 9350", stock: 4 },
            { id: "P-1002", name: "Samsung Galaxy S26 Ultra", stock: 7 }
        ]
    };

    window.AdminData = {
        products: products,
        users: users,
        promotions: promotions,
        orders: orders,
        dashboard: dashboard
    };
})();
