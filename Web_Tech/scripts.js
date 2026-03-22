// 1. Tổng hợp dữ liệu vào một đối tượng lớn
const allProducts = {
    Iphone: [
        { 
            id: 1, name: "iPhone 17 Pro Max 256GB | Chính hãng", price: 37790000, oldPrice: 37990000, img: "/imgs/IP1.png", brand: "Apple",
            specs: { "Màn hình": "6.9 inch, LTPO Super Retina XDR", "Chip": "Apple A19 Bionic (3nm)", "RAM": "12GB", "Pin": "4500 mAh", "Camera": "48MP + 48MP + 48MP" },
            description: `<h3>Đỉnh cao công nghệ dẫn đầu kỷ nguyên AI</h3><p>iPhone 17 Pro Max không chỉ là một chiếc điện thoại, mà là một cỗ máy trí tuệ nhân tạo thực thụ. Với màn hình 6.9 inch lớn nhất từ trước đến nay, viền bezel được thu hẹp tối đa giúp trải nghiệm thị giác trở nên vô tận.</p><h3>Hiệu năng vô đối với chip Apple A19 Bionic</h3><p>Được xây dựng trên tiến trình 3nm thế hệ mới, chip A19 Bionic sở hữu GPU 6 lõi chuyên dụng cho xử lý đồ họa nặng. Bạn có thể chiến mọi tựa game AAA trực tiếp trên điện thoại với tốc độ khung hình ổn định.</p><h3>Hệ thống camera nhiếp ảnh chuyên gia</h3><p>Bộ ba camera 48MP được nâng cấp với cảm biến lớn hơn, hỗ trợ quay video 8K ProRES và chụp ảnh RAW chân thực. Khả năng zoom quang học lên đến 10x giúp bạn bắt trọn mọi khoảnh khắc từ xa.</p>`
        },
        { 
            id: 2, name: "iPhone 17 256GB | Chính hãng", price: 24590000, oldPrice: 24990000, img: "/imgs/IP2.png", brand: "Apple", 
            specs: { "Màn hình": "6.1 inch, OLED", "Chip": "Apple A19", "RAM": "8GB", "Bộ nhớ": "256GB", "Camera": "48MP Dual" },
            description: `<h3>Sự kết hợp hoàn hảo giữa thiết kế và sức mạnh</h3><p>iPhone 17 tiêu chuẩn mang đến sự đột phá với bảng màu pastel mới cực kỳ thời thượng. Mặt lưng kính pha màu cùng khung nhôm hàng không vũ trụ giúp máy vừa nhẹ vừa bền bỉ.</p><h3>Trải nghiệm Apple Intelligence thông minh</h3><p>Với RAM 8GB tiêu chuẩn, iPhone 17 hỗ trợ mượt mà các tính năng AI mới nhất như tóm tắt văn bản và Siri thông minh hơn, giúp xử lý công việc hàng ngày nhanh chóng.</p>`
        },
        { 
            id: 3, name: "iPhone Air 256GB | Chính hãng", price: 24990000, oldPrice: 31990000, img: "/imgs/IP3.png", brand: "Apple", 
            specs: { "Thiết kế": "Siêu mỏng (5.5mm)", "Trọng lượng": "155g", "Chip": "Apple A18 Pro", "RAM": "8GB", "Màn hình": "6.3 inch" },
            description: `<h3>Định nghĩa lại sự mỏng nhẹ</h3><p>iPhone Air là dòng sản phẩm hoàn toàn mới với độ mỏng chỉ 5.5mm, mang lại cảm giác cầm nắm thoải mái đến mức không tưởng. Đây là thành quả của việc tái cấu trúc linh kiện và công nghệ pin xếp chồng mới.</p><h3>Sức mạnh không thỏa hiệp</h3><p>Dù cực mỏng, máy vẫn sở hữu chip A18 Pro mạnh mẽ, đảm bảo xử lý mượt mà mọi tác vụ từ chỉnh sửa video đến chơi game nặng mà không bị quá nhiệt.</p>`
        },
        { 
            id: 4, name: "iPhone 15 128GB | Chính hãng VN/A", price: 17990000, oldPrice: 19990000, img: "/imgs/IP4.png", brand: "Apple", 
            specs: { "Cổng sạc": "USB-C", "Chip": "A16 Bionic", "RAM": "6GB", "Màn hình": "6.1 inch Dynamic Island", "Camera": "48MP" },
            description: `<h3>Bước nhảy vọt với Dynamic Island</h3><p>iPhone 15 mang đến trải nghiệm tương tác hoàn toàn mới với Dynamic Island, giúp bạn theo dõi thông báo và hoạt động trực tiếp một cách sinh động.</p><h3>Cổng sạc USB-C tiện lợi</h3><p>Việc chuyển sang cổng USB-C giúp bạn dùng chung sạc với MacBook và iPad, đồng thời tăng tốc độ truyền dữ liệu. Camera 48MP mang lại những bức ảnh sắc nét đến từng chi tiết.</p>`
        },
        { 
            id: 5, name: "iPhone 17e 256GB | Chính hãng", price: 17990000, oldPrice: 0, img: "/imgs/IP5.png", brand: "Apple", 
            specs: { "Phiên bản": "Giá rẻ (e Edition)", "Chip": "Apple A18", "RAM": "8GB", "Màn hình": "6.1 inch OLED", "Pin": "3200 mAh" },
            description: `<h3>Lựa chọn tối ưu cho túi tiền</h3><p>iPhone 17e là phiên bản đặc biệt mang chip xử lý A18 mạnh mẽ xuống phân khúc giá rẻ hơn. Bạn vẫn có thể trải nghiệm đầy đủ hệ sinh thái iOS mượt mà.</p><h3>Màn hình OLED rực rỡ</h3><p>Dù có mức giá cạnh tranh, máy vẫn được trang bị màn hình OLED cho màu đen sâu và độ tương phản tuyệt vời, vượt xa các đối thủ trong cùng tầm giá.</p>`
        },
        { 
            id: 6, name: "iPhone 16e 128GB | Chính hãng VN/A", price: 12490000, oldPrice: 16990000, img: "/imgs/IP6.png", brand: "Apple", 
            specs: { "Chip": "A18 Bionic", "RAM": "8GB", "Màn hình": "6.1 inch", "Bộ nhớ": "128GB" },
            description: `<h3>Nhỏ gọn nhưng đầy uy lực</h3><p>iPhone 16e là sự lựa chọn hoàn hảo cho những ai yêu thích sự nhỏ gọn nhưng không muốn đánh đổi hiệu năng. Chip A18 đảm bảo máy hoạt động ổn định trong ít nhất 5 năm tới.</p><h3>Khả năng kết nối vượt trội</h3><p>Hỗ trợ 5G tốc độ cao và Wi-Fi 6E giúp việc tải tài liệu, xem phim trực tuyến hay chơi game online luôn ổn định, không độ trễ.</p>`
        },
        { 
            id: 7, name: "iPhone 16 Pro 128GB | Chính hãng VN/A", price: 26590000, oldPrice: 28990000, img: "/imgs/IP7.png", brand: "Apple", 
            specs: { "Màn hình": "6.3 inch 120Hz", "Chip": "A18 Pro", "RAM": "8GB", "Vỏ": "Titanium cấp độ 5" },
            description: `<h3>Chất liệu Titanium đẳng cấp</h3><p>iPhone 16 Pro sử dụng khung viền Titanium bền bỉ và nhẹ hơn hẳn thép không gỉ. Nút bấm Camera Control mới giúp bạn mở máy ảnh và chụp hình chỉ trong tích tắc.</p><h3>Màn hình ProMotion 120Hz</h3><p>Trải nghiệm vuốt chạm mượt mà tuyệt đối với công nghệ ProMotion, tự động thay đổi tần số quét để tối ưu hóa thời lượng pin mà vẫn đảm bảo độ phản hồi cực nhanh.</p>`
        },
        { 
            id: 8, name: "iPhone 16 Plus 128GB | Chính hãng VN/A", price: 24790000, oldPrice: 25990000, img: "/imgs/IP8.png", brand: "Apple", 
            specs: { "Màn hình": "6.7 inch", "Chip": "A18", "RAM": "8GB", "Pin": "4400 mAh (Cực trâu)" },
            description: `<h3>Pin trâu cho ngày dài năng động</h3><p>iPhone 16 Plus là nhà vô địch về thời lượng pin trong dòng iPhone 16. Bạn có thể sử dụng thoải mái đến 2 ngày mà không cần lo lắng về việc sạc pin.</p><h3>Màn hình lớn cho giải trí đỉnh cao</h3><p>Với kích thước 6.7 inch, máy mang lại không gian hiển thị rộng rãi cho việc xem phim, chơi game và làm việc đa nhiệm dễ dàng hơn.</p>`
        }
    ],
    SamSung: [
        { 
            id: 9, name: "Samsung Galaxy S26 Ultra 12GB 256GB", price: 33990000, oldPrice: 36990000, img: "/imgs/SS1.png", brand: "Samsung", 
            promo: "Tặng kèm bao da Samsung cao cấp & S-Pen", 
            specs: { "Màn hình": "6.8 inch Dynamic AMOLED 2X", "Chip": "Snapdragon 8 Gen 5", "RAM": "12GB", "Camera": "200MP Main", "AI": "Galaxy AI 2.0" },
            description: `<h3>Quyền năng tối thượng từ Galaxy AI</h3><p>Galaxy S26 Ultra định nghĩa lại trải nghiệm smartphone với Galaxy AI 2.0. Tính năng khoanh vùng tìm kiếm và dịch thuật trực tiếp giúp cuộc sống của bạn trở nên đơn giản hơn bao giờ hết.</p><h3>Hệ thống Camera 200MP dẫn đầu</h3><p>Khả năng siêu phân giải giúp bức ảnh của bạn giữ được độ chi tiết đáng kinh ngạc ngay cả khi crop. Chế độ chụp đêm Nightography được nâng cấp mạnh mẽ nhờ chip Snapdragon 8 Gen 5.</p><h3>Bút S-Pen huyền thoại</h3><p>Viết, vẽ và điều khiển từ xa với bút S-Pen tích hợp ngay trong thân máy, công cụ không thể thiếu cho những người làm việc chuyên nghiệp.</p>`
        },
        { 
            id: 10, name: "Samsung Galaxy S25 Ultra 12GB 256GB", price: 27490000, oldPrice: 33380000, img: "/imgs/SS2.png", brand: "Samsung", 
            specs: { "Chip": "Snapdragon 8 Gen 4", "RAM": "12GB", "Camera": "100x Space Zoom", "Pin": "5000 mAh" },
            description: `<h3>Vua nhiếp ảnh di động 2025</h3><p>Với cảm biến chính cải tiến và khả năng Zoom 100x, Galaxy S25 Ultra cho phép bạn bắt trọn các chi tiết ở khoảng cách cực xa với độ nét cao.</p><h3>Thiết kế Titanium bền bỉ</h3><p>Khung viền Titanium không chỉ sang trọng mà còn tăng cường khả năng chịu lực, bảo vệ máy tốt hơn trước các tác động vật lý hàng ngày.</p>`
        },
        { 
            id: 11, name: "Samsung Galaxy S26 12GB 256GB", price: 22990000, oldPrice: 25990000, img: "/imgs/SS3.png", brand: "Samsung", 
            specs: { "Chip": "Exynos 2600", "RAM": "12GB", "Màn hình": "6.2 inch 120Hz", "Thiết kế": "Nhôm Armor Aluminum" },
            description: `<h3>Nhỏ gọn nhưng đầy nội lực</h3><p>Galaxy S26 là sự kết hợp giữa thiết kế công thái học và sức mạnh phần cứng. Chip Exynos 2600 mới mang lại hiệu năng ổn định và kiểm soát nhiệt độ cực tốt.</p><h3>Màn hình rực rỡ sắc nét</h3><p>Tấm nền Dynamic AMOLED 2X với tần số quét 120Hz mang lại màu sắc sống động và sự mượt mà trong mọi chuyển động trên màn hình.</p>`
        },
        { 
            id: 12, name: "Samsung Galaxy Z Fold7 12GB 256GB", price: 41990000, oldPrice: 46990000, img: "/imgs/SS4.png", brand: "Samsung", 
            specs: { "Màn hình chính": "7.6 inch QXGA+", "Chip": "Snapdragon 8 Gen 5", "RAM": "12GB", "Bản lề": "Flex Hinge không kẽ hở" },
            description: `<h3>Máy tính bảng trong túi quần bạn</h3><p>Galaxy Z Fold7 với cơ chế gập Flex Hinge giúp máy phẳng hoàn toàn khi gập lại. Màn hình lớn 7.6 inch là không gian lý tưởng để xử lý bảng tính, đọc tài liệu hay xem phim giải trí.</p><h3>Đa nhiệm mạnh mẽ</h3><p>Tính năng Multi-window cho phép bạn mở cùng lúc 3 ứng dụng, giúp tăng năng suất làm việc lên gấp bội ngay trên một thiết bị di động.</p>`
        },
        { 
            id: 13, name: "Samsung Galaxy Z Flip7 12GB 256GB", price: 23990000, oldPrice: 28990000, img: "/imgs/SS5.png", brand: "Samsung", 
            specs: { "Màn hình": "6.7 inch Gập", "Màn hình phụ": "3.9 inch", "RAM": "12GB", "Kháng nước": "IPX8" },
            description: `<h3>Biểu tượng thời trang công nghệ</h3><p>Z Flip7 với màn hình phụ cực đại 3.9 inch giúp bạn thao tác nhanh, xem thông báo và chụp ảnh selfie bằng camera sau mà không cần mở máy.</p><h3>Flex Mode linh hoạt</h3><p>Khả năng gập mở ở nhiều góc độ giúp bạn dễ dàng livestream, quay video TikTok hay chụp ảnh nhóm mà không cần đến giá đỡ điện thoại.</p>`
        },
        { 
            id: 14, name: "Samsung Galaxy S24 Plus 12GB 256GB", price: 16290000, oldPrice: 18650000, img: "/imgs/SS6.png", brand: "Samsung", 
            specs: { "Chip": "Exynos 2400", "RAM": "12GB", "Màn hình": "6.7 inch QHD+", "Pin": "4900 mAh" },
            description: `<h3>Lựa chọn Plus thông minh</h3><p>S24 Plus mang đến màn hình độ phân giải QHD+ siêu sắc nét cùng dung lượng RAM 12GB, đảm bảo máy hoạt động mượt mà ngay cả khi chạy các ứng dụng nặng nhất.</p><h3>Sạc siêu nhanh</h3><p>Hỗ trợ công nghệ sạc nhanh giúp bạn nạp đầy năng lượng chỉ trong thời gian ngắn, không làm gián đoạn trải nghiệm sử dụng trong ngày.</p>`
        },
        { id: 15, name: "Samsung Galaxy S24 Ultra 12GB 256GB", price: 25290000, oldPrice: 29450000, img: "/imgs/SS7.png", brand: "Samsung", specs: { "Chip": "Snapdragon 8 Gen 3", "RAM": "12GB", "Vỏ": "Titanium" }, description: `<h3>Flagship toàn diện</h3><p>Galaxy S24 Ultra là mẫu điện thoại đầu tiên của Samsung sử dụng khung Titanium, kết hợp cùng kính Gorilla Armor chống chói cực tốt khi sử dụng ngoài trời.</p>` },
        { id: 16, name: "Samsung Galaxy S25 Ultra 512GB", price: 28810000, oldPrice: 36810000, img: "/imgs/SS8.png", brand: "Samsung", specs: { "Bộ nhớ": "512GB", "RAM": "12GB", "Chip": "Snapdragon 8 Gen 4" }, description: `<h3>Không gian lưu trữ vô tận</h3><p>Với 512GB bộ nhớ trong, bạn có thể thoải mái lưu trữ hàng ngàn video 8K, ảnh chất lượng cao và cài đặt các tựa game nặng mà không bao giờ lo hết dung lượng.</p>` }
    ],
    "Màn hình ASUS": [
        { 
            id: 17, name: "Màn hình Asus ROG Strix XG32UQ 32 Fast IPS 4K", price: 2199000, oldPrice: 25990000, img: "/imgs/MH1.png", brand: "Asus",
            specs: { "Kích thước": "32 inch", "Tấm nền": "WOLED", "Độ phân giải": "4K (3840 x 2160)", "Tần số quét": "160Hz", "Cổng kết nối": "HDMI, VGA" },
            description: `<h3>Đỉnh cao đồ họa 4K</h3><p>ROG Strix XG32UQ mang lại hình ảnh sắc nét đến từng chi tiết nhờ độ phân giải 4K. Tần số quét 160Hz giúp các chuyển động trong game nhanh luôn mượt mà và rõ nét.</p><h3>HDMI 2.1 cho Console thế hệ mới</h3><p>Hỗ trợ hoàn hảo cho PS5 và Xbox Series X, cho phép bạn chơi game ở độ phân giải 4K với tần số quét 120Hz mà không bị xé hình nhờ công nghệ VRR.</p>`
        },
        { 
            id: 18, name: "Màn hình Asus ROG Strix XG27ACMEG-G Hatsune", price: 8990000, oldPrice: 9990000, img: "/imgs/MH2.png", brand: "Asus",
            specs: { "Kích thước": "27 inch", "Tấm nền": "WOLED", "Độ phân giải": "QHD (2K)", "Tần số quét": "260Hz", "Màu sắc": "95% DCI-P3" },
            description: `<h3>Phiên bản giới hạn Hatsune Miku</h3><p>Thiết kế mang đậm phong cách nghệ thuật với tông màu xanh đặc trưng. Đây không chỉ là màn hình gaming mà còn là một vật phẩm trang trí cực chất cho góc máy của bạn.</p><h3>Tốc độ phản hồi cực nhanh</h3><p>Với tần số quét 260Hz, mọi hành động của đối thủ sẽ được hiển thị ngay lập tức, giúp bạn chiếm ưu thế tuyệt đối trong các tựa game Esport.</p>`
        },
        { 
            id: 19, name: "Màn hình Asus ROG Swift PG27AQWP-W 27 WOLED", price: 31990000, oldPrice: 39990000, img: "/imgs/MH3.png", brand: "Asus",
            specs: { "Kích thước": "27 inch", "Tấm nền": "WOLED", "Tần số quét": "540Hz", "Thời gian phản hồi": "0.03ms", "Độ sáng": "1300 nits" },
            description: `<h3>Màn hình gaming nhanh nhất thế giới</h3><p>ROG Swift PG27AQWP phá vỡ mọi giới hạn với tần số quét 540Hz. Công nghệ WOLED mang lại màu đen tuyệt đối và độ tương phản vô hạn, giúp hình ảnh nổi khối như thật.</p><h3>Hệ thống tản nhiệt thông minh</h3><p>Được trang bị bộ tản nhiệt tùy chỉnh giúp duy trì nhiệt độ ổn định cho tấm nền OLED, kéo dài tuổi thọ màn hình và ngăn ngừa hiện tượng burn-in.</p>`
        }
    ],
    "Laptop DELL": [
        { 
            id: 20, name: "Laptop Dell XPS 9350 XPS9350-U5IA165W11GR-FP", price: 54990000, oldPrice: 59990000, img: "/imgs/DELL1.png", brand: "Dell",
            specs: { "CPU": "i7-1165G7", "RAM": "32GB", "SSD": "1TB", "Màn hình": "13.4 inch OLED 3K", "Trọng lượng": "1.19 kg" },
            description: `<h3>Biểu tượng của sự sang trọng</h3><p>Dell XPS 13 (9350) sở hữu thiết kế nhôm nguyên khối cắt CNC tinh xảo. Bàn phím zero-lattice và touchpad tàng hình tạo nên vẻ đẹp tối giản nhưng vô cùng đẳng cấp.</p><h3>Màn hình OLED 3K chạm</h3><p>Tận hưởng không gian làm việc sống động với màn hình OLED 3K, độ phủ màu 100% DCI-P3, mang lại sự chính xác tuyệt đối cho các tác vụ đồ họa chuyên nghiệp.</p>`
        },
        { 
            id: 21, name: "Laptop Dell Inspiron 5440-PUS i5-1334U/512GB/16GB", price: 16990000, oldPrice: 19990000, img: "/imgs/DELL2.png", brand: "Dell",
            specs: { "CPU": "Core i5-1334U", "RAM": "16GB", "SSD": "512GB", "GPU": "NVIDIA MX550 2GB" },
            description: `<h3>Làm việc hiệu quả mỗi ngày</h3><p>Laptop Dell Inspiron 5440 được trang bị cấu hình ổn định với chip i5 và card đồ họa rời MX550, giúp bạn xử lý tốt các tác vụ văn phòng, học tập và chỉnh sửa ảnh nhẹ nhàng.</p><h3>Thiết kế bền bỉ, hiện đại</h3><p>Vỏ máy làm từ vật liệu tái chế thân thiện với môi trường nhưng vẫn đảm bảo độ bền chuẩn quân đội, đồng hành cùng bạn trên mọi nẻo đường.</p>`
        },
        { 
            id: 22, name: "Laptop Dell 15 DC15250 i7U161W11SLU", price: 20990000, oldPrice: 23490000, img: "/imgs/DELL3.png", brand: "Dell",
            specs: { "CPU": "Core i7-1335U", "RAM": "16GB", "SSD": "1TB NVMe", "Màn hình": "15.6 inch FHD" },
            description: `<h3>Sức mạnh xử lý vượt trội</h3><p>Với CPU Intel Core i7 và bộ nhớ SSD lên đến 1TB, chiếc laptop này đáp ứng hoàn hảo nhu cầu đa nhiệm cao và lưu trữ dữ liệu khổng lồ của người dùng doanh nghiệp.</p><h3>Màn hình lớn cho không gian làm việc rộng</h3><p>Kích thước 15.6 inch FHD giúp việc xem bảng tính Excel hay mở nhiều cửa sổ cùng lúc trở nên dễ dàng và thoải mái cho mắt hơn.</p>`
        }
    ],
    "Bàn Phím": [
            { 
                id: 23, name: "Bàn phím cơ VGN Không dây N75 Pro Blue Grey", price: 1590000, oldPrice: 1890000, img: "/imgs/BP1.png", brand: "AKKO",
                specs: { "Kết nối": "Không dây", "Switch": "Akko CS Jelly Pink", "Led": "RGB 16.8 triệu màu", "Pin": "1800 mAh" },
                description: `<h3>Thiết kế nhỏ gọn, hiện đại</h3><p>AKKO 3068B Plus với layout 68 phím tiết kiệm diện tích nhưng vẫn đầy đủ các phím chức năng cần thiết. Phối màu Blue on White thanh lịch phù hợp với mọi góc làm việc.</p><h3>Kết nối không giới hạn</h3><p>Hỗ trợ cả 3 chế độ kết nối, giúp bạn dễ dàng chuyển đổi giữa máy tính bảng, laptop và PC chỉ bằng một phím bấm. Switch Akko CS được lube sẵn cho cảm giác gõ cực mượt.</p>`
            },
            { 
                id: 24, name: "Bàn phím cơ VGN không dây N75 Pro Orange Vaporware", price: 5490000, oldPrice: 5990000, img: "/imgs/BP2.png", brand: "Razer",
                specs: { "Kết nối": "Wired 8KHz Polling", "Switch": "Razer Green Clicky", "Led": "Razer Chroma RGB", "Phụ kiện": "Kèm kê tay da" },
                description: `<h3>Trung tâm điều khiển Command Dial</h3><p>Trang bị vòng xoay điều khiển đa năng giúp bạn chỉnh âm lượng, độ sáng màn hình hoặc zoom ảnh chỉ bằng một tay. Hệ thống led Chroma RGB tỏa sáng rực rỡ dưới gầm phím.</p><h3>Tốc độ phản hồi ánh sáng</h3><p>Tần số gửi tín hiệu lên đến 8000Hz, nhanh gấp 8 lần bàn phím thông thường, giúp mọi thao tác trong game của bạn diễn ra gần như tức thì.</p>`
            },
            { 
                id: 25, name: "Bàn phím cơ VGN Không dây N75 Pro Orange Azure", price: 3590000, oldPrice: 3990000, img: "/imgs/BP3.png", brand: "Logitech",
                specs: { "Kết nối": "Không dây", "Switch": "GX Brown Tactile", "Led": "Lightsync RGB", "Thời lượng": "50 giờ" },
                description: `<h3>Thiết kế cho các vận động viên Esport</h3><p>Dòng phím TKL huyền thoại nay đã có phiên bản không dây Lightspeed siêu tốc. Phím được tối ưu để loại bỏ mọi độ trễ, giúp bạn thực hiện những cú click chính xác tuyệt đối trong game.</p><h3>Switch GX Brown bền bỉ</h3><p>Cảm giác gõ Tactile có khấc giúp bạn nhận diện phím đã nhận hay chưa mà không gây quá nhiều tiếng ồn, phù hợp cho cả chơi game và làm việc văn phòng.</p>`
            },
            { 
                id: 26, name: "Bàn phím cơ VGN Không dây N75 Pro Blue Grey Azure", price: 2150000, oldPrice: 2450000, img: "/imgs/BP4.png", brand: "Keychron",
                specs: { "Kết nối": "Không dây", "Tương thích": "Mac/Windows/Android", "Switch": "Keychron K Pro", "Tính năng": "VIA Custom Map" },
                description: `<h3>Hỗ trợ tối đa cho công việc</h3><p>Keychron K10 Pro là dòng phím Fullsize giúp nhập liệu số liệu cực nhanh. Khả năng tương thích hoàn hảo cho macOS giúp người dùng Apple có trải nghiệm gõ phím cơ tốt nhất.</p><h3>Tùy biến không giới hạn qua VIA</h3><p>Bạn có thể lập trình lại bất kỳ phím nào trên bàn phím thông qua phần mềm VIA mà không cần cài đặt driver phức tạp, giúp tối ưu hóa quy trình làm việc cá nhân.</p>`
            }
        ],
    "SmartWatch": [
            { 
                id: 27, name: "Đồng hồ thông minh Amazfit T-Rex 3 Pro", price: 6590000, oldPrice: 7290000, img: "/imgs/SW1.png", brand: "Amazfit",
                specs: { "Màn hình": "AMOLED 1.5 inch", "Độ bền": "Chuẩn quân đội (15 chứng nhận)", "Pin": "25 ngày", "GPS": "Băng tần kép 6 vệ tinh" },
                description: `<h3>Chiến binh bền bỉ cho mọi thử thách</h3><p>Amazfit T-Rex 3 Pro là sự lựa chọn hàng đầu cho những người yêu thích hoạt động ngoài trời. Với thiết kế hầm hố và khả năng chống chịu va đập, nhiệt độ cực hạn, chiếc đồng hồ này sẵn sàng đồng hành cùng bạn từ núi cao đến biển sâu.</p><h3>Công nghệ định vị chính xác tuyệt đối</h3><p>Hệ thống GPS băng tần kép giúp bạn không bao giờ lạc lối ngay cả trong rừng rậm hay thành phố với nhiều nhà cao tầng. Thời lượng pin lên đến 25 ngày giúp bạn yên tâm trong những chuyến đi dài ngày.</p>`
            },
            { 
                id: 28, name: "Đồng hồ thông minh HONMA X Huawei Watch GT6 Pro", price: 15500000, oldPrice: 17000000, img: "/imgs/SW2.png", brand: "Huawei",
                specs: { "Phiên bản": "Giới hạn (Limited)", "Chất liệu": "Gốm tinh thể Nanoscale", "Pin": "21 ngày", "Tính năng": "Chế độ Golf chuyên nghiệp" },
                description: `<h3>Sự giao thoa giữa thể thao và đẳng cấp</h3><p>Phiên bản đặc biệt kết hợp cùng thương hiệu gậy Golf huyền thoại HONMA. Mặt đồng hồ và dây đeo được thiết kế riêng biệt với logo HONMA, khẳng định vị thế của người sở hữu trên sân Green.</p><h3>Trợ lý Golf toàn năng</h3><p>Tích hợp bản đồ hơn 40.000 sân Golf trên toàn thế giới, tính toán lực gió, độ dốc và gợi ý loại gậy phù hợp giúp bạn nâng tầm cuộc chơi.</p>`
            },
            { 
                id: 29, name: "Đồng hồ thông minh OPPO Watch S Dây Vải", price: 3290000, oldPrice: 3990000, img: "/imgs/SW3.png", brand: "OPPO",
                specs: { "Thiết kế": "Mặt tròn cổ điển", "Dây đeo": "Vải Nylon kháng khuẩn", "Pin": "10 ngày", "Sạc nhanh": "VOOC Watch" },
                description: `<h3>Phong cách trẻ trung, năng động</h3><p>OPPO Watch S phiên bản dây vải mang lại cảm giác đeo cực kỳ nhẹ nhàng và thoáng khí, không gây bí bách khi tập luyện cường độ cao. Thiết kế mặt tròn tinh tế phù hợp cho cả nam và nữ.</p><h3>Công nghệ sạc nhanh độc quyền</h3><p>Chỉ cần 15 phút sạc bạn đã có đủ năng lượng cho cả một ngày dài sử dụng nhờ công nghệ sạc nhanh VOOC đặc trưng của OPPO.</p>`
            },
            { 
                id: 30, name: "Đồng hồ thông minh Coros Pace 4", price: 6190000, oldPrice: 6500000, img: "/imgs/SW4.png", brand: "Coros",
                specs: { "Trọng lượng": "Siêu nhẹ (28g)", "Chuyên dụng": "Chạy bộ & Triathlon", "Pin": "19", "Cảm biến": "Nhịp tim thế hệ mới" },
                description: `<h3>Vũ khí của những vận động viên Marathon</h3><p>Coros Pace 4 là chiếc đồng hồ thể thao chuyên nghiệp nhẹ nhất thế giới. Trọng lượng siêu nhẹ giúp bạn gần như không cảm thấy sự hiện diện của đồng hồ trên tay khi đang bứt tốc.</p><h3>Hệ sinh thái huấn luyện Coros Training Hub</h3><p>Phân tích chuyên sâu về chỉ số phục hồi, khối lượng tập luyện và dự đoán thành tích thi đấu, giúp bạn đạt được phong độ cao nhất trong ngày race.</p>`
            }
            ],
    "RAM": [
            { 
                id: 31, name: "Ram G.Skill Trident Z RGB Royal Elite Gold 16GB (2x8GB) 3600MHz", price: 3450000, oldPrice: 3850000, img: "/imgs/RAM1.png", brand: "G.Skill",
                specs: { "Dung lượng": "16GB (2x8GB)", "Bus": "3600MHz", "Loại": "DDR4", "Led": "RGB Royal Elite" },
                description: `<h3>Kiệt tác nghệ thuật trên PC</h3><p>Trident Z Royal Elite là dòng RAM cao cấp nhất từ G.Skill với mặt cắt kim cương được chế tác tỉ mỉ trên lớp vỏ mạ vàng 24K. Sản phẩm không chỉ mang lại hiệu suất cực cao mà còn là món đồ trang sức xa xỉ cho dàn máy của bạn.</p><h3>Hiệu năng ép xung đỉnh cao</h3><p>Sử dụng các chip nhớ được sàng lọc kỹ càng, Royal Elite cho khả năng duy trì tốc độ 3600MHz ổn định, giúp tối ưu hóa băng thông cho cả hệ thống Intel và AMD.</p>`
            },
            { 
                id: 32, name: "Ram G.Skill Trident Z RGB Royal Elite Silver 16GB (2x8GB) 3600MHz", price: 3350000, oldPrice: 3750000, img: "/imgs/RAM2.png", brand: "G.Skill",
                specs: { "Dung lượng": "16GB (2x8GB)", "Bus": "3600MHz", "Loại": "DDR4", "Led": "RGB Tinh thể" },
                description: `<h3>Vẻ đẹp tinh khôi của bạc</h3><p>Phiên bản Silver mang lại vẻ đẹp hiện đại, tinh tế với lớp mạ bạc sáng bóng như gương. Thanh ánh sáng tinh thể phía trên giúp tán xạ đèn LED RGB thành các dải màu lung linh như đá quý.</p><h3>Tản nhiệt nhôm nguyên khối</h3><p>Ngoài vẻ ngoài bóng bẩy, lớp vỏ nhôm dày dặn giúp tản nhiệt cực tốt cho các chip nhớ bên trong, đảm bảo tuổi thọ và hiệu suất trong thời gian dài sử dụng liên tục.</p>`
            },
            { 
                id: 33, name: "RAM Kingston Fury Beast RGB 32GB (2x16GB) Bus 3200MHz", price: 2190000, oldPrice: 2590000, img: "/imgs/RAM3.png", brand: "Kingston",
                specs: { "Dung lượng": "32GB (2x16GB)", "Bus": "3200MHz", "Loại": "DDR4", "Công nghệ": "Infrared Sync" },
                description: `<h3>Sự lựa chọn quốc dân cho Gaming</h3><p>Kingston Fury Beast RGB mang đến sự cân bằng hoàn hảo giữa giá thành và hiệu năng. Với 32GB bộ nhớ, bạn có thể thoải mái đa nhiệm, livestream và chơi các tựa game nặng nhất hiện nay.</p><h3>Đồng bộ ánh sáng hồng ngoại</h3><p>Công nghệ Infrared Sync độc quyền của Kingston giúp các thanh RAM luôn đồng bộ màu sắc với nhau mà không cần cắm thêm dây nhợ phức tạp.</p>`
            },
            { 
                id: 34, name: "RAM Corsair Dominator Titanium White 32GB (2x16GB) Bus 6000MHz", price: 5890000, oldPrice: 6200000, img: "/imgs/RAM4.png", brand: "Corsair",
                specs: { "Dung lượng": "32GB (2x16GB)", "Bus": "6000MHz", "Loại": "DDR5", "Tính năng": "Thay thế top bar" },
                description: `<h3>Kỷ nguyên mới của DDR5</h3><p>Dominator Titanium là dòng RAM flagship mới nhất của Corsair. Với tốc độ bus lên tới 6000MHz, đây là linh kiện không thể thiếu cho các bộ máy PC sử dụng CPU thế hệ mới nhất.</p><h3>Khả năng tùy biến độc đáo</h3><p>Điểm đặc biệt của dòng Titanium là phần thanh dẫn sáng phía trên có thể tháo rời và thay thế, cho phép người dùng cá nhân hóa tối đa thiết kế của bộ máy.</p>`
            }
        ],
    "CPU": [
            { 
                id: 35, name: "Bộ vi xử lý AMD Ryzen 5 9600X / 3.9GHz Boost 5.4GHz / 6 Nhân 12 Luồng", price: 7990000, oldPrice: 8500000, img: "/imgs/CPU1.png", brand: "AMD",
                specs: { "Nhân/Luồng": "6N / 12L", "Xung cơ bản": "3.9GHz", "Xung Boost": "5.4GHz", "Socket": "AM5" },
                description: `<h3>Kiến trúc Zen 5 đột phá</h3><p>AMD Ryzen 5 9600X sở hữu kiến trúc Zen 5 mới nhất, mang lại hiệu suất đơn nhân vượt trội cho các tác vụ chơi game và làm việc đồ họa. Với tiến trình sản xuất tiên tiến, CPU này hoạt động cực kỳ mát mẻ và tiết kiệm điện năng.</p><h3>Sức mạnh tối thượng cho Game thủ</h3><p>Tốc độ xung nhịp lên tới 5.4GHz giúp bạn xử lý mượt mà mọi tựa game AAA ở mức thiết lập cao nhất, đồng thời hỗ trợ tốt cho việc livestream và sáng tạo nội dung.</p>`
            },
            { 
                id: 36, name: "Bộ vi xử lý AMD Ryzen 5 8500G / 3.5GHz Boost 5.0GHz / 6 Nhân 12 Luồng", price: 4890000, oldPrice: 5200000, img: "/imgs/CPU2.png", brand: "AMD",
                specs: { "Nhân/Luồng": "6N / 12L", "Xung cơ bản": "3.5GHz", "Đồ họa": "Radeon 740M", "Socket": "AM5" },
                description: `<h3>Tích hợp đồ họa mạnh mẽ</h3><p>Ryzen 5 8500G là giải pháp hoàn hảo cho các bộ PC không sử dụng card rời. Đồ họa tích hợp Radeon 740M đủ sức cân tốt các tựa game Esport phổ biến như League of Legends, Valorant ở mức khung hình ổn định.</p><h3>Hiệu năng AI thông minh</h3><p>Tích hợp nhân xử lý AI giúp tối ưu hóa các tác vụ văn phòng và chỉnh sửa ảnh cơ bản, mang lại trải nghiệm mượt mà trong hệ sinh thái Windows 11.</p>`
            },
            { 
                id: 37, name: "Bộ vi xử lý AMD Ryzen 5 5600 / 3.5GHz Boost 4.4GHz / 6 Nhân 12 Luồng", price: 3150000, oldPrice: 3500000, img: "/imgs/CPU3.png", brand: "AMD",
                specs: { "Nhân/Luồng": "6N / 12L", "Xung cơ bản": "3.5GHz", "Cache": "32MB L3", "Socket": "AM4" },
                description: `<h3>Vị vua của phân khúc tầm trung</h3><p>Dù sử dụng socket AM4, Ryzen 5 5600 vẫn là lựa chọn cực kỳ kinh tế cho các cấu hình chơi game phổ thông. Với 32MB bộ nhớ đệm L3, CPU này giúp giảm độ trễ tối đa khi xử lý các khung hình phức tạp trong game.</p><h3>Nâng cấp dễ dàng</h3><p>Đây là sự lựa chọn nâng cấp tuyệt vời cho những hệ thống cũ đang chạy socket AM4, mang lại luồng sinh khí mới cho bộ máy của bạn mà không cần thay đổi mainboard.</p>`
            }
        ]
};

let currentProducts = [];

function renderProducts(data) {
    const container = document.getElementById('productContainer');
    if(!container) return;

    container.innerHTML = data.map(p => {
        const discount = p.oldPrice > 0 ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
        
        // Xử lý Specs icon
        let specsHtml = '';
        if (p.specs) {
            // Kiểm tra nếu là Màn hình (Có 'size' hoặc 'Kích thước')
            if (p.specs.size || p.specs["Kích thước"]) { 
                const size = p.specs.size || p.specs["Kích thước"];
                const panel = p.specs.panel || p.specs["Tấm nền"];
                const hz = p.specs.hz || p.specs["Tần số quét"];

                specsHtml = `
                    <div class="p-specs">
                        <span><i class="fas fa-desktop"></i> ${size}</span>
                        <span><i class="fas fa-layer-group"></i> ${panel}</span>
                        <span><i class="fas fa-bolt"></i> ${hz}</span>
                    </div>`;
            } 
            // Kiểm tra nếu là Laptop (Có 'cpu' hoặc 'CPU')
            else if (p.specs.cpu || p.specs.CPU) { 
                const cpu = p.specs.cpu || p.specs.CPU;
                const ram = p.specs.ram || p.specs.RAM;
                const ssd = p.specs.ssd || p.specs.SSD;

                specsHtml = `
                    <div class="p-specs">
                        <span><i class="fas fa-microchip"></i> ${cpu}</span>
                        <span><i class="fas fa-memory"></i> ${ram}</span>
                        <span><i class="fas fa-hdd"></i> ${ssd}</span>
                    </div>`;
            }
            // BanPhimBanPhim (p.specs.cpu)
            else if (p.specs["Kết nối"] || p.specs["Switch"]) { 
                const connection = p.specs["Kết nối"];
                const switchType = p.specs["Switch"];
                const led = p.specs["Led"] || p.specs["Tương thích"];

                specsHtml = `
                    <div class="p-specs">
                        <span><i class="fas fa-wifi"></i> ${connection}</span>
                        <span><i class="fas fa-keyboard"></i> ${switchType}</span>
                        <span><i class="fas fa-lightbulb"></i> ${led}</span>
                    </div>`;
}
        }

        return `
            <div class="p-card">
                ${discount > 0 ? `<span class="tag-off">-${discount}%</span>` : ''}
                <img src="${p.img}" style="width:100%">
                <div class="p-name">${p.name}</div>
                ${specsHtml}
                <div class="p-old">${p.oldPrice > 0 ? p.oldPrice.toLocaleString() + 'đ' : '&nbsp;'}</div>
                <div style="display:flex; justify-content:space-between; align-items:center">
                    <span class="p-price">${p.price.toLocaleString()}đ</span>
                    <a href="/SanPham/product-detail.html?id=${p.id}" class="btn-buy">Mua</a>
                </div>
            </div>
        `;
    }).join('');
}

// Logic khởi chạy khi trang load
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('productContainer');
    if(!container) return;

    // Lấy category từ thuộc tính data-category của thẻ HTML
    const category = container.getAttribute('data-category');
    currentProducts = allProducts[category] || [];

    renderProducts(currentProducts);

    // Xử lý Filter (giữ nguyên logic của bạn)
    const btn = document.getElementById('filterToggle');
    const menu = document.getElementById('filterMenu');

    if(btn && menu) {
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        };

        document.querySelectorAll('.flt-opt').forEach(opt => {
            opt.onclick = function() {
                const sortType = this.dataset.sort;
                let sorted = [...currentProducts];
                if(sortType === 'low-high') sorted.sort((a,b) => a.price - b.price);
                else sorted.sort((a,b) => b.price - a.price);
                renderProducts(sorted);
                menu.classList.remove('active');
            }
        });
    }
});









