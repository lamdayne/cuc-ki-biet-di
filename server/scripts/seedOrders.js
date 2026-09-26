import { supabase } from '../src/config/supabase.js';

// ═══════════════════════════════════════════════════════════════
// 🍪 Seed Orders — Dữ liệu đơn hàng thực tế
// Từ 22/09/2026 → 17/10/2026, mỗi ngày 4 đơn
// ═══════════════════════════════════════════════════════════════

const PRODUCTS = [
  { id: '889a8ac5-29a2-4ee9-9ec2-2db17f9c120f', name: 'Chocochip Cacao', price: 14000 },
  { id: 'fa78822b-d42e-4c01-8b44-e95c2acee3e3', name: 'Chocochip Matcha', price: 14000 },
  { id: '3f14caac-7ae2-4133-8f7d-50b15e0f7e2d', name: 'Chocochip Red Velvet', price: 15000 },
  { id: '83feb364-0651-4cc3-82a1-3dea3b17fede', name: 'Chocochip Oreo', price: 17000 },
  { id: 'c6a01e0f-c79e-4259-9fe0-f447cae7c495', name: 'Chocochip Nguyên Vị', price: 12000 },
  { id: '58899291-ae8f-42ce-91f1-a91a3105d973', name: 'Strawberry Cúc-Ki', price: 19000 },
  { id: '833ba27d-1143-4269-bcb0-af58495c043d', name: 'Orange Cúc-Ki', price: 16000 },
  { id: '165a704a-9c12-4dd1-b35f-71927abc39b3', name: 'Chocomint Cúc-Ki', price: 19000 },
  { id: 'fa9cd94a-8ce4-4bdc-b045-fe2607aaf5f5', name: 'Glass Cúc-Ki', price: 5000 },
  { id: 'b950590c-67d3-4074-a887-dbfd48739751', name: 'Cacao', price: 5000 },
  { id: 'd3607cc7-1c90-4698-81bc-f9aa14fb9ce7', name: 'Matcha', price: 5000 },
  { id: '3a7da77f-e4d8-43bd-8d8d-8ab3d6bf1260', name: 'Nguyên Vị', price: 3000 },
  { id: '1f167331-600f-4209-9ee0-ec6064254281', name: "S'more Nuts Cacao", price: 17000 },
  { id: 'e9787ab1-e1de-402d-8059-4f81e51891ac', name: "S'more Nuts Matcha", price: 17000 },
  { id: '6859bdf0-d303-4f54-a0b1-5f889e8977ae', name: "S'more Nuts Nguyên Vị", price: 14000 },
  { id: '096aca45-1a36-47c0-952d-9aedfefb96a2', name: 'Lemon Cookie', price: 19000 },
  { id: '511cd208-ca10-4c97-af55-ff82ea5f19fd', name: "S'MORE CHOCO CACAO", price: 17000 },
  { id: 'f32a64b1-0ce7-4e91-8ea0-09f53449fa1e', name: "S'MORE CHOCO MATCHA", price: 17000 },
  { id: '29f22b46-76c4-4ba8-b217-b49e720dab38', name: "S'MORE CHOCO NGUYÊN VỊ", price: 15000 },
  { id: '4b193233-b745-41d2-a60b-e1dcdd05d843', name: 'CACAO', price: 6000 },
  { id: '2d7e7a70-309c-49b4-92ab-2413681c15f2', name: 'MATCHA', price: 6000 },
  { id: '399b8612-6364-4582-ba61-feb8efcc11fe', name: 'NGUYÊN VỊ', price: 15000 },
];

// Danh sách khách hàng thực tế
const CUSTOMERS = [
  { name: 'Nguyễn Thị Hồng Nhung', phone: '0901234567', social: '@hongnhung.99', channel: 'Instagram', address: '23 Nguyễn Trãi, Q.5, TP.HCM' },
  { name: 'Trần Minh Khôi', phone: '0912345678', social: 'minhkhoi.tran', channel: 'Facebook', address: '45 Lê Duẩn, Q.1, TP.HCM' },
  { name: 'Lê Hoàng Yến Nhi', phone: '0356789012', social: '@yennhi.le', channel: 'Instagram', address: '112 Cách Mạng Tháng 8, Q.3, TP.HCM' },
  { name: 'Phạm Quốc Bảo', phone: '0789012345', social: 'quocbao.pham', channel: 'Zalo', address: 'KTX Khu B ĐHQG, Thủ Đức' },
  { name: 'Võ Ngọc Trâm Anh', phone: '0867890123', social: '@tramanh.vo', channel: 'Instagram', address: '78 Hai Bà Trưng, Q.1, TP.HCM' },
  { name: 'Đặng Thanh Tùng', phone: '0934567890', social: 'thanhtung.dang', channel: 'Facebook', address: '56 Nguyễn Huệ, Q.1, TP.HCM' },
  { name: 'Bùi Thị Mỹ Linh', phone: '0378901234', social: '@mylinh.bui', channel: 'Threads', address: '90 Phan Xích Long, Q.Phú Nhuận, TP.HCM' },
  { name: 'Huỳnh Gia Huy', phone: '0845678901', social: 'giahuy.huynh', channel: 'Zalo', address: '34 Nguyễn Văn Cừ, Q.5, TP.HCM' },
  { name: 'Ngô Khánh Linh', phone: '0923456789', social: '@khanhlinh.ngo', channel: 'TikTok', address: '67 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM' },
  { name: 'Trương Bảo Ngọc', phone: '0356123456', social: '@baongoc.truong', channel: 'Instagram', address: '12 Lý Thường Kiệt, Q.10, TP.HCM' },
  { name: 'Cao Thị Thanh Hà', phone: '0798643166', social: 'thanhha.cao', channel: 'Zalo', address: '200 Trần Hưng Đạo, Q.1, TP.HCM' },
  { name: 'Lý Hoàng Long', phone: '0897654321', social: '@hoanglong.ly', channel: 'Facebook', address: '15 Võ Văn Tần, Q.3, TP.HCM' },
  { name: 'Mai Thị Bích Ngọc', phone: '0365432109', social: '@bichngoc.mai', channel: 'Threads', address: '88 Trường Sa, Q.Phú Nhuận, TP.HCM' },
  { name: 'Phan Đức Anh', phone: '0876543210', social: 'ducanh.phan', channel: 'Instagram', address: 'Ký túc xá ĐH Bách Khoa, Q.10' },
  { name: 'Hồ Nguyên Khánh', phone: '0943210987', social: '@nguyenkhanh.ho', channel: 'TikTok', address: '101 Nguyễn Đình Chiểu, Q.3, TP.HCM' },
  { name: 'Đinh Phương Thảo', phone: '0387654321', social: 'phuongthao.dinh', channel: 'Zalo', address: '45 Hoàng Sa, Q.1, TP.HCM' },
  { name: 'Lâm Gia Bảo', phone: '0854321098', social: '@giabao.lam', channel: 'Instagram', address: '29 Pasteur, Q.1, TP.HCM' },
  { name: 'Dương Thùy Trang', phone: '0976543210', social: 'thuytrang.duong', channel: 'Facebook', address: '176 Nguyễn Thái Bình, Q.Tân Bình' },
  { name: 'Nguyễn Hải Đăng', phone: '0398765432', social: '@haidang.nguyen', channel: 'Instagram', address: '8 Trần Quang Diệu, Q.3, TP.HCM' },
  { name: 'Trần Thị Kim Ngân', phone: '0821098765', social: 'kimngan.tran', channel: 'Zalo', address: 'Chung cư Sunview, Thủ Đức' },
  { name: 'Vũ Minh Tú', phone: '0910987654', social: '@minhtu.vu', channel: 'TikTok', address: '55 Lê Lai, Q.1, TP.HCM' },
  { name: 'Hoàng Thị Diệu Linh', phone: '0376543210', social: '@dieulinh.hoang', channel: 'Threads', address: '123 CMT8, Q.10, TP.HCM' },
  { name: 'Tô Quang Hưng', phone: '0865432109', social: 'quanghung.to', channel: 'Facebook', address: '91 Bà Huyện Thanh Quan, Q.3' },
  { name: 'Chu Thị Minh Anh', phone: '0954321098', social: '@minhanh.chu', channel: 'Instagram', address: 'Vinhomes Grand Park, Q.9' },
];

const NOTES = [
  null,
  null,
  null,
  'Giao trước 5h chiều nha',
  'Gói riêng từng loại giúp mình',
  'Sinh nhật bạn, gói đẹp giúp nhé ❤️',
  null,
  'Ship tầm 2-3h chiều',
  'Để ít ngọt hơn được không ạ',
  null,
  'Mua tặng đồng nghiệp, gói 2 hộp riêng',
  null,
  null,
  'Giao buổi sáng trước 10h',
  null,
  'Lần đầu mua thử, cho xin thêm túi giấy',
  null,
  'Giao trưa 12h tại văn phòng',
  null,
  null,
];

const SHIP_METHODS = [
  'Chuyển khoản tiền ship cho Cúc-Ki',
  'Tự thanh toán phí ship',
];

const STATUSES = ['pending', 'confirmed', 'baking', 'ready', 'done', 'cancelled'];

const PACKING_FEE = 2000;

// ── Helpers ───────────────────────────────────
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function generateCode(pickupDate) {
  const d = new Date(pickupDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CK-${dd}${mm}${yy}-${rand}`;
}

function pickRandomItems() {
  const count = randomInt(1, 4);
  const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  return selected.map((p) => ({
    product_id: p.id,
    product_name: p.name,
    unit_price: p.price,
    quantity: randomInt(1, 5),
    line_total: 0, // computed below
  }));
}

function statusForDate(pickupDate) {
  const now = new Date('2026-09-22T20:00:00+07:00');
  const pickup = new Date(pickupDate + 'T00:00:00+07:00');
  const diffDays = Math.floor((pickup - now) / (1000 * 60 * 60 * 24));

  if (diffDays < -3) return randomPick(['done', 'done', 'done', 'cancelled']);
  if (diffDays < 0) return randomPick(['done', 'ready']);
  if (diffDays === 0) return randomPick(['baking', 'ready', 'confirmed']);
  if (diffDays <= 2) return randomPick(['confirmed', 'pending']);
  return 'pending';
}

// ── Generate all orders ─────────────────────────
async function seed() {
  console.log('🍪 Bắt đầu tạo đơn hàng seed...\n');

  const startDate = new Date('2026-09-22');
  const endDate = new Date('2026-10-17');
  const orders = [];
  const allItems = [];

  let customerIdx = 0;
  let dayCounter = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const pickupDateStr = formatDate(d);
    dayCounter++;

    for (let i = 0; i < 4; i++) {
      const customer = CUSTOMERS[customerIdx % CUSTOMERS.length];
      customerIdx++;

      const code = generateCode(pickupDateStr);
      const items = pickRandomItems();
      items.forEach((item) => {
        item.line_total = item.unit_price * item.quantity;
      });
      const subtotal = items.reduce((s, it) => s + it.line_total, 0);
      const total = subtotal + PACKING_FEE;
      const status = statusForDate(pickupDateStr);

      // created_at is 1-3 days before pickup_date, random hour
      const createdOffset = randomInt(1, 3);
      const createdDate = new Date(d);
      createdDate.setDate(createdDate.getDate() - createdOffset);
      const hours = randomInt(8, 22);
      const minutes = randomInt(0, 59);
      createdDate.setHours(hours, minutes, randomInt(0, 59));
      const createdAt = createdDate.toISOString();

      const order = {
        code,
        customer_name: customer.name,
        phone: customer.phone,
        social_username: customer.social,
        order_channel: customer.channel,
        custom_channel_name: null,
        delivery_address: customer.address,
        pickup_date: pickupDateStr,
        ship_payment_method: randomPick(SHIP_METHODS),
        note: randomPick(NOTES),
        subtotal,
        packing_fee: PACKING_FEE,
        total_price: total,
        status,
        created_at: createdAt,
        updated_at: createdAt,
      };

      orders.push(order);
      allItems.push({ code, items }); // map items by code for later
    }
  }

  console.log(`📦 Tổng số đơn cần tạo: ${orders.length}`);
  console.log(`📅 Từ ${formatDate(startDate)} đến ${formatDate(endDate)}\n`);

  // Insert orders in batches of 20
  const BATCH = 20;
  let insertedOrders = [];

  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('orders')
      .insert(batch)
      .select('id, code');

    if (error) {
      console.error(`❌ Lỗi insert orders batch ${i / BATCH + 1}:`, error.message);
      process.exit(1);
    }
    insertedOrders.push(...data);
    process.stdout.write(`  ✅ Orders batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(orders.length / BATCH)} (${data.length} đơn)\n`);
  }

  console.log(`\n🎉 Đã insert ${insertedOrders.length} đơn hàng!\n`);

  // Build order_items with correct order_id
  const codeToId = {};
  insertedOrders.forEach((o) => {
    codeToId[o.code] = o.id;
  });

  const orderItemsToInsert = [];
  allItems.forEach(({ code, items }) => {
    const orderId = codeToId[code];
    if (!orderId) return;
    items.forEach((item) => {
      orderItemsToInsert.push({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      });
    });
  });

  console.log(`🛒 Tổng số order_items cần tạo: ${orderItemsToInsert.length}`);

  for (let i = 0; i < orderItemsToInsert.length; i += BATCH) {
    const batch = orderItemsToInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('order_items').insert(batch);
    if (error) {
      console.error(`❌ Lỗi insert order_items batch ${i / BATCH + 1}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`  ✅ Items batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(orderItemsToInsert.length / BATCH)} (${batch.length} items)\n`);
  }

  console.log(`\n🎉🎉🎉 HOÀN TẤT! Đã seed ${insertedOrders.length} đơn hàng với ${orderItemsToInsert.length} sản phẩm!\n`);

  // Summary
  const statusCount = {};
  orders.forEach((o) => {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  });
  console.log('📊 Thống kê trạng thái:');
  Object.entries(statusCount).forEach(([s, c]) => console.log(`   ${s}: ${c} đơn`));
}

seed().catch((err) => {
  console.error('💥 Seed thất bại:', err);
  process.exit(1);
});
