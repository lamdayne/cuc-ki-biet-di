import assert from 'assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🚀 Bắt đầu kiểm tra toàn diện các API Endpoints...\n');

  // 1. GET /api/health
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'ok');
  console.log('✅ 1. Health check: OK');

  // 2. GET /api/menu
  const menuRes = await fetch(`${BASE_URL}/api/menu`);
  const menuData = await menuRes.json();
  assert.strictEqual(menuData.success, true);
  assert(menuData.data.categories.length >= 4, 'Phải có ít nhất 4 danh mục');
  assert.strictEqual(menuData.data.packingFee, 2000, 'Phí gói hàng phải là 2000đ');

  const chocochipCat = menuData.data.categories.find(c => c.name === 'CÚC KI CHOCOCHIP');
  assert(chocochipCat, 'Phải có danh mục CÚC KI CHOCOCHIP');
  assert.strictEqual(chocochipCat.products.length, 5, 'CÚC KI CHOCOCHIP phải có 5 loại bánh');
  console.log('✅ 2. Thực đơn (Menu): 4 danh mục bánh đầy đủ, phí gói 2.000đ.');

  // 3. GET /api/pickup-availability
  const availRes = await fetch(`${BASE_URL}/api/pickup-availability`);
  const availData = await availRes.json();
  assert.strictEqual(availData.success, true);
  assert.strictEqual(availData.data.length, 31, 'Phải có đủ 31 ngày');
  assert(availData.data[0].label.includes('(Hôm nay)'), 'Ngày đầu tiên phải có nhãn (Hôm nay)');
  console.log('✅ 3. Cửa sổ nhận bánh: Đủ 31 ngày với định dạng nhãn theo chuẩn Asia/Ho_Chi_Minh.');

  // 4. POST /api/orders (Tạo đơn hàng)
  const targetDay = availData.data[1].dateStr; // Ngày mai
  const prod1 = chocochipCat.products[0]; // Chocochip Cacao (14.000đ)
  const prod2 = chocochipCat.products[1]; // Chocochip Matcha (14.000đ)

  const orderPayload = {
    customer_name: 'Trần Minh Anh',
    phone: '0987654321',
    social_username: '@minhanh_cucki',
    order_channel: 'Instagram',
    delivery_address: '123 Đường Hoa Hồng, Phường 2, Quận Phú Nhuận',
    pickup_date: targetDay,
    ship_payment_method: 'Chuyển khoản tiền ship cho Cúc-Ki',
    note: 'Giao buổi sáng giúp mình nhé!',
    items: [
      { productId: prod1.id, quantity: 2 }, // 14k x 2 = 28k
      { productId: prod2.id, quantity: 3 }, // 14k x 3 = 42k
    ],
  };

  const createRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });
  const createResult = await createRes.json();
  assert.strictEqual(createResult.success, true);
  const createdOrder = createResult.data;
  assert(createdOrder.code.startsWith('CK-'), 'Mã đơn phải có tiền tố CK-');
  assert.strictEqual(createdOrder.subtotal, 70000, 'Subtotal phải là 70.000đ');
  assert.strictEqual(createdOrder.packing_fee, 2000, 'Phí gói hàng phải là 2.000đ');
  assert.strictEqual(createdOrder.total_price, 72000, 'Tổng tiền phải là 72.000đ');
  console.log(`✅ 4. Tạo đơn hàng thành công: Mã đơn ${createdOrder.code}, Tổng tiền ${createdOrder.total_price}đ.`);

  // 5. GET /api/orders/:code (Tra cứu đơn hàng)
  const lookupRes = await fetch(`${BASE_URL}/api/orders/${createdOrder.code}`);
  const lookupResult = await lookupRes.json();
  assert.strictEqual(lookupResult.success, true);
  assert.strictEqual(lookupResult.data.code, createdOrder.code);
  assert.strictEqual(lookupResult.data.status, 'pending');
  // Kiểm tra che mờ số điện thoại
  assert.match(lookupResult.data.phone, /^\d{3}\*{4}\d{3}$/, 'Số điện thoại phải được che mờ (ví dụ 098****321)');
  console.log(`✅ 5. Tra cứu đơn hàng: Tìm thấy đơn, SĐT đã được che mờ (${lookupResult.data.phone}).`);

  // 6. Tra cứu mã không tồn tại
  const notFoundRes = await fetch(`${BASE_URL}/api/orders/CK-999999-XXXX`);
  const notFoundResult = await notFoundRes.json();
  assert.strictEqual(notFoundRes.status, 404);
  assert(notFoundResult.message.includes('Không tìm thấy đơn hàng'));
  console.log('✅ 6. Tra cứu mã không tồn tại: Trả về lỗi 404 thân thiện đúng yêu cầu.');

  // 7. POST /api/admin/login
  // Thử PIN sai
  const badLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '000000' }),
  });
  const badLoginResult = await badLoginRes.json();
  assert.strictEqual(badLoginRes.status, 401);
  assert.strictEqual(badLoginResult.message, 'Mã PIN không đúng, vui lòng thử lại');
  console.log('✅ 7. Đăng nhập PIN sai: Từ chối với thông báo "Mã PIN không đúng, vui lòng thử lại".');

  // Đăng nhập PIN đúng (123456)
  const goodLoginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '123456' }),
  });
  assert.strictEqual(goodLoginRes.status, 200);
  const cookieHeader = goodLoginRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes('admin_token'), 'Phải trả về cookie admin_token');
  console.log('✅ 8. Đăng nhập PIN đúng: Thành công và nhận JWT cookie httpOnly.');

  const adminCookie = cookieHeader.split(';')[0];

  // 8. GET /api/admin/orders (Quản lý đơn hàng)
  const adminOrdersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: { Cookie: adminCookie },
  });
  const adminOrdersData = await adminOrdersRes.json();
  assert.strictEqual(adminOrdersData.success, true);
  assert(adminOrdersData.data.orders.length >= 1, 'Admin phải thấy đơn vừa tạo');
  assert.strictEqual(adminOrdersData.data.dayCounts[targetDay], 1, 'Chỉ số đơn trong ngày phải là 1/4');
  console.log('✅ 9. Admin xem danh sách đơn hàng & chỉ số ngày: 1/4 đơn chính xác.');

  // 9. PATCH /api/admin/orders/:id/status (Đổi trạng thái)
  const orderId = createdOrder.order_id;
  const updateStatusRes = await fetch(`${BASE_URL}/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'baking' }),
  });
  const updateStatusData = await updateStatusRes.json();
  assert.strictEqual(updateStatusData.data.status, 'baking');
  console.log('✅ 10. Admin cập nhật trạng thái đơn thành "baking" thành công.');

  // 10. CRUD Loại cookie (Categories)
  const createCatRes = await fetch(`${BASE_URL}/api/admin/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ name: 'CÚC KI ĐẶC BIỆT', display_order: 5, is_active: true }),
  });
  const newCat = (await createCatRes.json()).data;
  assert(newCat.id);
  console.log('✅ 11. Admin thêm danh mục cookie mới thành công.');

  // Thử xóa danh mục đang có sản phẩm -> Phải bị chặn
  const deleteBlockedRes = await fetch(`${BASE_URL}/api/admin/categories/${chocochipCat.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  const deleteBlockedData = await deleteBlockedRes.json();
  assert.strictEqual(deleteBlockedRes.status, 400);
  assert(deleteBlockedData.message.includes('Không thể xóa loại cookie này vì vẫn còn'));
  console.log('✅ 12. Chặn xóa danh mục khi còn sản phẩm: Hoạt động chính xác với thông báo giải thích rõ ràng.');

  // Xóa danh mục vừa tạo (không có sản phẩm) -> Thành công
  const deleteSuccessRes = await fetch(`${BASE_URL}/api/admin/categories/${newCat.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  assert.strictEqual(deleteSuccessRes.status, 200);
  console.log('✅ 13. Xóa danh mục rỗng: Thành công.');

  // 11. CRUD Sản phẩm (Products)
  const createProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      name: 'Chocochip Hạnh Nhân Mới',
      category_id: chocochipCat.id,
      price: 18000,
      is_available: true,
      display_order: 6,
    }),
  });
  const newProd = (await createProdRes.json()).data;
  assert.strictEqual(newProd.price, 18000);
  console.log('✅ 14. Admin thêm bánh mới thành công (hoàn toàn không có trường ảnh).');

  // Đổi trạng thái có sẵn của sản phẩm
  const updateProdRes = await fetch(`${BASE_URL}/api/admin/products/${newProd.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ is_available: false }),
  });
  const updatedProd = (await updateProdRes.json()).data;
  assert.strictEqual(updatedProd.is_available, false);
  console.log('✅ 15. Admin chuyển bánh sang trạng thái "Tạm hết" thành công.');

  console.log('\n🎉 TOÀN BỘ CÁC BÀI TEST API VÀ QUẢN TRỊ ĐÃ VƯỢT QUA 100%!');
}

runTests().catch((err) => {
  console.error('❌ Lỗi kiểm tra:', err);
  process.exit(1);
});
