# 🍪 CÚC-KI BIẾT ĐI — Website Đặt Trước Bánh Quy Handmade

Website nhận đặt trước (pre-order) bánh quy thủ công cho tiệm bánh **"CÚC-KI BIẾT ĐI"** với phong cách ấm cúng (Warm Cozy Bakery), tông màu kem đào, thẻ bo tròn mềm mại và màu chủ đạo nâu chocolate.

---

## 🌟 Tính Năng Nổi Bật

1. **Trang đặt bánh (`/`)**:
   - Menu bánh nhóm theo danh mục với ảnh banner (placeholder thanh lịch khi chưa có ảnh).
   - Thẻ sản phẩm tối giản: tên bánh, giá tiền (ví dụ `14.000đ`), nút tròn `+` chuyển thành cụm tăng giảm `(− n +)` kèm viền thẻ nổi bật khi được chọn.
   - Bố cục 2 cột trên máy tính: Bên trái là form thông tin khách hàng, bên phải là giỏ hàng dính (sticky cart) cập nhật tức thì thành tiền, phí đóng gói (2.000đ) và tổng tiền bánh.
   - Trên điện thoại: Tự động xếp chồng kèm thanh bar cố định dưới chân trang hiển thị tổng tiền và số lượng bánh.
   - Chọn ngày nhận bánh bằng thẻ `<select>` nguyên bản với `<optgroup>` theo từng tháng (31 ngày tính từ hôm nay theo giờ `Asia/Ho_Chi_Minh`). Ngày đủ 4 đơn sẽ tự động bị vô hiệu hóa `(FULL)`.
   - Xem lại thông tin đơn hàng đầy đủ trong hộp thoại (modal) trước khi xác nhận.
   - Màn hình thông báo thành công kèm mã đơn dạng `CK-DDMMYY-XXXX`, nút sao chép mã nhanh và nút chuyển đến tra cứu.

2. **Tra cứu đơn hàng (`/tra-cuu`)**:
   - Nhập mã đơn để xem tiến độ thực hiện với thanh trạng thái (Timeline):
     `Chờ xác nhận → Đã xác nhận → Đang làm bánh → Sẵn sàng nhận bánh → Hoàn thành` (hoặc huy hiệu riêng khi đơn `Đã hủy`).
   - Tự động che mờ số điện thoại để bảo vệ quyền riêng tư (ví dụ `090****567`).

3. **Khu vực Quản trị (`/quan-ly`)**:
   - Bảo vệ bằng mã PIN 6 số (`/quan-ly/pin`) với giao diện 6 ô nhập tự động chuyển ô và hỗ trợ dán mã.
   - Tab **Đơn hàng**: Lọc theo ngày nhận bánh và trạng thái; hiển thị số đơn trong từng ngày `(x/4)`; đổi trạng thái đơn (khi hủy đơn sẽ tự động giải phóng slot nhận bánh của ngày đó).
   - Tab **Loại cookie**: Thêm/sửa danh mục, tải ảnh banner lên Supabase Storage bucket `category-images`, xem trước ảnh; chặn xóa danh mục nếu vẫn còn bánh bên trong.
   - Tab **Sản phẩm**: Thêm/sửa bánh, lọc theo danh mục, bật/tắt trạng thái còn hàng/hết hàng (tuyệt đối không có trường ảnh).
   - Nút **Đăng xuất** xóa session an toàn.

4. **Bảo mật & Quy tắc Nghiệp vụ máy chủ**:
   - Khóa nguyên tử (Atomic concurrency lock) bằng hàm Postgres RPC `create_preorder`: Ngăn chặn 2 khách đặt đồng thời tạo ra đơn thứ 5 trong cùng một ngày.
   - Server tự động tính lại 100% đơn giá từ database, snapshot lại tên bánh và giá tại thời điểm đặt.
   - Mã PIN quản lý được băm bằng `bcrypt` và lưu trong biến môi trường máy chủ.
   - Giới hạn tần suất gửi yêu cầu (Rate limiting) cho Đăng nhập, Tạo đơn và Tra cứu đơn.
   - Kích hoạt RLS trên tất cả bảng dữ liệu với **0 public policy** (Trình duyệt không thể đọc/ghi trực tiếp vào DB, chỉ backend dùng service role key mới có quyền truy cập).

---

## 📁 Cấu Trúc Thư Mục

```
cookie-order/
├── client/                     # Mã nguồn Frontend (React + Vite + React Router)
│   ├── index.html              # Phông chữ Google Fonts Fredoka & DM Sans, thẻ SEO
│   ├── package.json
│   ├── vite.config.js          # Cấu hình proxy /api sang backend
│   ├── src/
│   │   ├── components/         # Header, ProductCard, CategorySection, Cart, OrderForm, Modals, Timeline
│   │   ├── pages/              # HomePage, OrderLookupPage, AdminPinPage, AdminDashboardPage
│   │   ├── services/api.js     # Kết nối API phía máy chủ
│   │   ├── utils/              # Định dạng tiền tệ VND (Intl.NumberFormat)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css           # Toàn bộ design tokens và giao diện tiệm bánh
│   └── .env.example
├── server/                     # Mã nguồn Backend (Node.js + Express ES Modules)
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── config/             # env.js, supabase.js
│   │   ├── middlewares/        # auth.js, rateLimiter.js, errorHandler.js
│   │   ├── routes/             # public.js, admin.js
│   │   ├── schemas/            # Zod validation schemas
│   │   ├── services/           # orderService.js, adminService.js, store.js (fallback offline)
│   │   ├── utils/              # codeGenerator.js (CK-DDMMYY-XXXX), dates.js
│   │   └── index.js            # Express app entry point
│   └── scripts/
│       ├── hashPin.js          # CLI sinh mã băm bcrypt cho mã PIN quản trị
│       ├── testOrderLogic.js   # Kiểm tra logic nghiệp vụ độc lập
│       └── testEndpoints.js    # Kiểm tra tích hợp toàn bộ API
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql    # Khởi tạo bảng, enum, indexes, bật RLS
│   │   ├── 002_create_order_rpc.sql  # Hàm RPC create_preorder nguyên tử với advisory lock
│   │   └── 003_storage_bucket.sql    # Tạo bucket category-images với quyền public read
│   └── seed.sql                      # Dữ liệu thực đơn mẫu và cài đặt phí đóng gói 2.000đ
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Môi Trường Phát Triển

### Yêu cầu tiên quyết
- **Node.js**: Phiên bản 18+ (khuyên dùng Node 20 hoặc 22)
- **npm** phiên bản 9+

---

### Bước 1: Tạo dự án và chạy Migration trên Supabase

1. Truy cập [Supabase](https://supabase.com) và tạo một Project mới (chọn khu vực Singapore hoặc gần Việt Nam).
2. Vào mục **SQL Editor** trong trang quản trị Supabase.
3. Mở file [001_initial_schema.sql](file:///d:/Workspace/cookie-order/supabase/migrations/001_initial_schema.sql), dán toàn bộ nội dung vào SQL Editor và bấm **Run**.
4. Mở file [002_create_order_rpc.sql](file:///d:/Workspace/cookie-order/supabase/migrations/002_create_order_rpc.sql), dán vào và bấm **Run**.
5. Mở file [003_storage_bucket.sql](file:///d:/Workspace/cookie-order/supabase/migrations/003_storage_bucket.sql), dán vào và bấm **Run**.
6. Mở file [seed.sql](file:///d:/Workspace/cookie-order/supabase/seed.sql), dán vào và bấm **Run** để nạp thực đơn bánh mẫu và phí gói hàng 2.000đ.
7. Vào mục **Project Settings -> API**:
   - Copy **Project URL**
   - Copy khóa **service_role** bí mật (Secret key — lưu ý: tuyệt đối không dùng khóa `anon`).

---

### Bước 2: Thiết lập Backend Server

1. Mở terminal và di chuyển vào thư mục `server`:
   ```bash
   cd server
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Sinh mã băm bcrypt cho mã PIN quản trị (ví dụ mã PIN là `123456`):
   ```bash
   npm run hash-pin 123456
   ```
   Lệnh sẽ xuất ra dòng:
   ```
   ADMIN_PIN_HASH=$2b$10$...
   ```
4. Tạo file `.env` trong thư mục `server` (tham khảo `server/.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   # Thông tin Supabase lấy từ Bước 1
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

   # Mã PIN băm đã sinh ở trên
   ADMIN_PIN_HASH=$2b$10$your_generated_hash_here
   JWT_SECRET=super_secret_cookie_bakery_jwt_key_2026_change_me
   ```
5. Chạy thử nghiệm kiểm tra tính đúng đắn của logic:
   ```bash
   npm run test-logic
   ```
6. Khởi động server backend:
   ```bash
   npm run dev
   ```
   Server sẽ lắng nghe tại `http://localhost:5000`.

---

### Bước 3: Thiết lập Frontend Client

1. Mở terminal mới và di chuyển vào thư mục `client`:
   ```bash
   cd client
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Tạo file `.env` trong thư mục `client`:
   ```env
   # Khi chạy local với Vite proxy, để trống biến này:
   VITE_API_URL=
   ```
4. Khởi động ứng dụng giao diện:
   ```bash
   npm run dev
   ```
   Mở trình duyệt tại: **`http://localhost:5173`**.

---

## 🧪 Kiểm Tra Hệ Thống (Testing)

1. **Kiểm tra nghiệp vụ độc lập**:
   ```bash
   cd server
   npm run test-logic
   ```
   Kiểm tra:
   - Sinh mã đơn `CK-DDMMYY-XXXX` không chứa ký tự dễ nhầm `0`, `O`, `1`, `I`.
   - Sinh 31 ngày nhận bánh chuẩn giờ Việt Nam.
   - Validate Zod schema với số điện thoại Việt Nam.
   - Tính toán lại đơn giá từ server và chặn sản phẩm hết hàng.
   - Giới hạn 4 đơn/ngày và giải phóng slot khi hủy đơn.

2. **Kiểm tra End-to-End API**:
   ```bash
   cd server
   node scripts/testEndpoints.js
   ```

---

## 🌐 Hướng Dẫn Triển Khai Lên Production (Deploy)

### 1. Triển khai Backend lên Render hoặc Railway

#### A. Triển khai lên Render (Web Service):
1. Đẩy mã nguồn lên GitHub.
2. Trên [Render Dashboard](https://dashboard.render.com/), chọn **New -> Web Service**.
3. Kết nối repository GitHub của bạn.
4. Cài đặt thông số:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Thêm các biến môi trường (**Environment Variables**) trên Render:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://your-frontend-domain.vercel.app`
   - `SUPABASE_URL`: URL dự án Supabase của bạn
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key bí mật
   - `ADMIN_PIN_HASH`: Mã băm PIN sinh từ `npm run hash-pin`
   - `JWT_SECRET`: Khóa bí mật JWT ngẫu nhiên mạnh
6. Bấm **Deploy Web Service** và copy URL backend (ví dụ `https://cucki-api.onrender.com`).

---

### 2. Triển khai Frontend lên Vercel hoặc Netlify

#### A. Triển khai lên Vercel:
1. Truy cập [Vercel Dashboard](https://vercel.com/) và chọn **Add New Project**.
2. Chọn repository chứa dự án.
3. Thiết lập:
   - **Root Directory**: Chọn thư mục `client`.
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.
4. Thêm biến môi trường:
   - `VITE_API_URL`: Điền URL backend Render vừa tạo ở trên (ví dụ `https://cucki-api.onrender.com`).
5. Bấm **Deploy**.
6. Sau khi deploy xong, quay lại Render và cập nhật biến `CLIENT_URL` bằng tên miền chính thức của Vercel để CORS hoạt động chuẩn xác!

---

## 🛡️ Tài Khoản Mặc Định Cho Môi Trường Thử Nghiệm

- **Mã PIN Quản Lý mặc định**: `123456`
- **Đường dẫn quản lý**: `/quan-ly/pin` hoặc bấm vào biểu tượng ổ khóa 🔒 trên thanh điều hướng.
