const token = localStorage.getItem("token");

// Nếu không có token thì đuổi về trang login ngay
if (!token) {
  alert("Vui lòng đăng nhập để xem thông tin!");
  window.location.href = "login.html";
}

// 1. Hàm tự động lấy dữ liệu từ Backend khi vừa vào trang
async function loadProfile() {
  try {
    const res = await fetch("http://127.0.0.1:5000/api/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      alert("Phiên đăng nhập hết hạn!");
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();

    // Đổ dữ liệu vào các ô Input
    document.getElementById("username").value = data.username || "";
    document.getElementById("email").value = data.email || "";
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("address").value = data.address || "";

    // Đổ dữ liệu vào Sidebar trái
    document.getElementById("display-name").innerText = data.username || "User";
    document.getElementById("display-email").innerText =
      data.email || "Chưa có email";
    document.getElementById("avatar-initial").innerText = (data.username || "U")
      .charAt(0)
      .toUpperCase();
  } catch (error) {
    console.error("Lỗi khi tải Profile:", error);
    alert("Không thể kết nối đến máy chủ!");
  }
}

// 2. Hàm xử lý khi bấm nút "LƯU THAY ĐỔI"
async function updateProfile() {
  const phone = document.getElementById("phone").value;
  const address = document.getElementById("address").value;
  const old_password = document.getElementById("old_password").value;
  const new_password = document.getElementById("new_password").value;
  const confirm_password = document.getElementById("confirm_password").value;

  const body = {
    phone: phone,
    address: address,
  };

  // Nếu người dùng nhập mật khẩu mới thì mới kiểm tra bảo mật
  if (new_password) {
    if (!old_password) {
      alert("Bạn phải nhập mật khẩu cũ để thiết lập mật khẩu mới!");
      return;
    }
    if (new_password !== confirm_password) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (new_password.length < 6) {
      alert("Mật khẩu mới phải từ 6 ký tự!");
      return;
    }
    body.old_password = old_password;
    body.new_password = new_password;
  }

  try {
    const res = await fetch("http://127.0.0.1:5000/api/profile/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (res.ok) {
      alert("Cập nhật thông tin thành công!");
      // Xóa trắng các ô mật khẩu
      document.getElementById("old_password").value = "";
      document.getElementById("new_password").value = "";
      document.getElementById("confirm_password").value = "";
      loadProfile(); // Tải lại dữ liệu mới nhất
    } else {
      alert("Lỗi: " + result.msg);
    }
  } catch (error) {
    alert("Lỗi kết nối Backend!");
  }
}

// QUAN TRỌNG: Gọi hàm này ngay khi file JS được load
document.addEventListener("DOMContentLoaded", loadProfile);
