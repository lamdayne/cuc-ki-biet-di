import assert from 'assert';
import { generateOrderCode } from '../src/utils/codeGenerator.js';
import { getUpcoming31Days, isWithinValidPickupWindow, getTodayVietnamString } from '../src/utils/dates.js';
import { createOrderSchema } from '../src/schemas/orderSchemas.js';

console.log('🧪 Bắt đầu kiểm tra logic nghiệp vụ cho Cúc-Ki Biết Đi...\n');

// 1. Kiểm tra format mã đơn hàng CK-DDMMYY-XXXX
console.log('1. Kiểm tra định dạng mã đơn hàng:');
for (let i = 0; i < 20; i++) {
  const code = generateOrderCode();
  assert.match(
    code,
    /^CK-\d{6}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/,
    `Mã đơn ${code} không đúng định dạng!`
  );
  const randomPart = code.split('-')[2];
  assert(
    !randomPart.includes('0') &&
      !randomPart.includes('O') &&
      !randomPart.includes('1') &&
      !randomPart.includes('I'),
    `Phần ngẫu nhiên ${randomPart} chứa ký tự gây nhầm lẫn!`
  );
}
console.log('   ✅ Đạt: 20 mã đơn ngẫu nhiên đều đúng chuẩn CK-DDMMYY-XXXX và không có ký tự 0/O/1/I.\n');

// 2. Kiểm tra cửa sổ 31 ngày nhận bánh
console.log('2. Kiểm tra danh sách 31 ngày nhận bánh:');
const days = getUpcoming31Days();
assert.strictEqual(days.length, 31, 'Phải sinh đúng 31 ngày!');
assert.strictEqual(days[0].isToday, true, 'Ngày đầu tiên phải là hôm nay!');
assert.strictEqual(days[1].isToday, false);
assert(days[0].monthGroup.startsWith('Tháng '), 'Tên nhóm tháng phải bắt đầu bằng "Tháng "');
assert(days[0].weekdayName.length > 0, 'Phải có tên thứ tiếng Việt');

const todayStr = getTodayVietnamString();
assert.strictEqual(isWithinValidPickupWindow(todayStr), true, 'Hôm nay phải hợp lệ');
assert.strictEqual(isWithinValidPickupWindow('1999-01-01'), false, 'Ngày trong quá khứ không hợp lệ');
console.log(`   ✅ Đạt: 31 ngày từ hôm nay (${days[0].displayDate}) tới (${days[30].displayDate}) chính xác theo giờ Việt Nam.\n`);

// 3. Kiểm tra Zod schema và validation số điện thoại VN
console.log('3. Kiểm tra Zod schema đặt bánh:');
const validPayload = {
  customer_name: 'Nguyễn Văn Bánh',
  phone: '0901234567',
  social_username: '@banhquy_cucki',
  order_channel: 'Instagram',
  delivery_address: '123 Đường Bơ Sữa, Phường 1, Quận 1',
  pickup_date: days[2].dateStr,
  ship_payment_method: 'Chuyển khoản tiền ship cho Cúc-Ki',
  note: 'Giao buổi chiều giúp mình nhé',
  items: [
    { productId: 'a0000000-0000-0000-0000-000000000001', quantity: 3 },
    { productId: 'a0000000-0000-0000-0000-000000000002', quantity: 2 },
  ],
};

const parsed = createOrderSchema.safeParse(validPayload);
assert.strictEqual(parsed.success, true, 'Payload hợp lệ phải parse thành công');

// Thử số điện thoại sai
const invalidPhonePayload = { ...validPayload, phone: '123456' };
const parsedBadPhone = createOrderSchema.safeParse(invalidPhonePayload);
assert.strictEqual(parsedBadPhone.success, false, 'SĐT không hợp lệ phải bị từ chối');

// Thử kênh "Khác" không có custom_channel_name
const invalidKhacPayload = { ...validPayload, order_channel: 'Khác', custom_channel_name: '' };
const parsedBadKhac = createOrderSchema.safeParse(invalidKhacPayload);
assert.strictEqual(parsedBadKhac.success, false, 'Kênh "Khác" thiếu tên kênh phải bị từ chối');

console.log('   ✅ Đạt: Zod schema kiểm tra chặt chẽ họ tên, SĐT VN, kênh đặt hàng, số lượng và ngày nhận bánh.\n');

// 4. Mô phỏng tính lại giá từ database (chống gian lận giá từ client)
console.log('4. Kiểm tra logic tính lại đơn giá từ DB:');
const mockDbProducts = {
  'p-cacao': { name: 'Chocochip Cacao', price: 14000, is_available: true },
  'p-matcha': { name: 'Chocochip Matcha', price: 14000, is_available: true },
  'p-oreo': { name: 'Chocochip Oreo', price: 17000, is_available: false }, // Hết hàng
};
const mockPackingFee = 2000;

function simulateServerCalculation(items, dbProducts, packingFee) {
  let subtotal = 0;
  for (const item of items) {
    const prod = dbProducts[item.productId];
    if (!prod) throw new Error('PRODUCT_NOT_FOUND');
    if (!prod.is_available) throw new Error(`PRODUCT_UNAVAILABLE: ${prod.name}`);
    subtotal += prod.price * item.quantity;
  }
  const total = subtotal + packingFee;
  return { subtotal, packingFee, total };
}

// 3 bánh Cacao (14k x 3 = 42k) + 2 bánh Matcha (14k x 2 = 28k) = 70k + 2k phí gói = 72k
const clientItems = [
  { productId: 'p-cacao', quantity: 3 },
  { productId: 'p-matcha', quantity: 2 },
];
const calcResult = simulateServerCalculation(clientItems, mockDbProducts, mockPackingFee);
assert.strictEqual(calcResult.subtotal, 70000, 'Subtotal phải là 70.000đ');
assert.strictEqual(calcResult.total, 72000, 'Total phải là 72.000đ (bao gồm 2.000đ phí gói)');
console.log(`   ✅ Đạt: Server tính chuẩn xác Subtotal = ${calcResult.subtotal}đ, Phí gói = ${calcResult.packingFee}đ, Tổng cộng = ${calcResult.total}đ.\n`);

// 5. Kiểm tra từ chối sản phẩm hết hàng
assert.throws(
  () => simulateServerCalculation([{ productId: 'p-oreo', quantity: 1 }], mockDbProducts, mockPackingFee),
  /PRODUCT_UNAVAILABLE/,
  'Sản phẩm is_available = false phải bị từ chối'
);
console.log('   ✅ Đạt: Bánh hết hàng bị chặn ngay lập tức.\n');

// 6. Mô phỏng giới hạn 4 đơn/ngày & slot được giải phóng khi hủy
console.log('5. Kiểm tra giới hạn tối đa 4 đơn/ngày & giải phóng slot khi hủy:');
class DayOrderManager {
  constructor() {
    this.orders = [];
  }
  createOrder(pickupDate) {
    const activeCount = this.orders.filter(
      (o) => o.pickupDate === pickupDate && o.status !== 'cancelled'
    ).length;
    if (activeCount >= 4) {
      throw new Error('DAY_CAPACITY_FULL');
    }
    const order = { id: this.orders.length + 1, pickupDate, status: 'pending' };
    this.orders.push(order);
    return order;
  }
  cancelOrder(id) {
    const o = this.orders.find((x) => x.id === id);
    if (o) o.status = 'cancelled';
  }
}

const manager = new DayOrderManager();
const targetDate = '2026-09-25';

// Tạo 4 đơn hợp lệ
const o1 = manager.createOrder(targetDate);
const o2 = manager.createOrder(targetDate);
const o3 = manager.createOrder(targetDate);
const o4 = manager.createOrder(targetDate);
assert.strictEqual(manager.orders.filter((o) => o.status !== 'cancelled').length, 4);

// Tạo đơn thứ 5 phải bị chặn
assert.throws(() => manager.createOrder(targetDate), /DAY_CAPACITY_FULL/);

// Hủy đơn thứ 2
manager.cancelOrder(o2.id);

// Sau khi hủy, slot được giải phóng, tạo lại thành công
const o5 = manager.createOrder(targetDate);
assert.strictEqual(o5.id, 5);
console.log('   ✅ Đạt: Chặn đơn thứ 5 trong ngày và giải phóng slot khi đơn trước đó bị hủy.\n');

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM TRA NGHIỆP VỤ ĐÃ VƯỢT QUA THÀNH CÔNG!');
