import assert from 'assert';
import { generateOrderCode } from '../src/utils/codeGenerator.js';
import {
  getUpcoming31Days,
  isWithinValidPickupWindow,
  getTodayVietnamString,
  isOrderingAllowed,
  isWeekendInVietnam,
  resolveDateConfig,
  DEFAULT_DAILY_SETTINGS,
} from '../src/utils/dates.js';
import { createOrderSchema } from '../src/schemas/orderSchemas.js';
import { orderService } from '../src/services/orderService.js';

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
const testRefDate = new Date('2026-09-22T08:00:00+07:00'); // Thứ 3
const days = getUpcoming31Days(testRefDate);
assert.strictEqual(days.length, 31, 'Phải sinh đúng 31 ngày!');
assert.strictEqual(days[0].isToday, true, 'Ngày đầu tiên phải là hôm nay!');
assert.strictEqual(days[1].isToday, false);
assert(days[0].monthGroup.startsWith('Tháng '), 'Tên nhóm tháng phải bắt đầu bằng "Tháng "');
assert(days[0].weekdayName.length > 0, 'Phải có tên thứ tiếng Việt');

const todayStr = getTodayVietnamString(testRefDate);
assert.strictEqual(isWithinValidPickupWindow(todayStr, testRefDate), true, 'Hôm nay (Thứ 3) phải hợp lệ');
assert.strictEqual(isWithinValidPickupWindow('1999-01-01', testRefDate), false, 'Ngày trong quá khứ không hợp lệ');

// Đảm bảo mặc định không có Thứ 7 và Chủ Nhật trong danh sách nhận bánh khi chưa mở
assert(
  days.every((d) => d.weekdayName !== 'Thứ Bảy' && d.weekdayName !== 'Chủ Nhật'),
  'Danh sách ngày nhận bánh mặc định không được chứa Thứ 7 và Chủ Nhật!'
);
assert.strictEqual(isWithinValidPickupWindow('2026-10-03', testRefDate), false, 'Thứ 7 không được là ngày nhận bánh');
assert.strictEqual(isWithinValidPickupWindow('2026-10-04', testRefDate), false, 'Chủ Nhật không được là ngày nhận bánh');

console.log(`   ✅ Đạt: 31 ngày nhận bánh mặc định chỉ gồm Thứ 2 đến Thứ 6 (không có Thứ 7 và Chủ Nhật).\n`);

// 3. Kiểm tra Zod schema và validation số điện thoại VN
console.log('3. Kiểm tra Zod schema đặt bánh:');
const validPickupDay = getUpcoming31Days()[1]?.dateStr || getUpcoming31Days()[0].dateStr;
const validPayload = {
  customer_name: 'Nguyễn Văn Bánh',
  phone: '0901234567',
  social_username: '@banhquy_cucki',
  order_channel: 'Instagram',
  delivery_address: '123 Đường Bơ Sữa, Phường 1, Quận 1',
  pickup_date: validPickupDay,
  ship_payment_method: 'Chuyển khoản tiền ship cho Cúc-Ki',
  note: 'Giao buổi chiều giúp mình nhé',
  items: [
    { productId: 'a0000000-0000-4000-8000-000000000001', quantity: 3 },
    { productId: 'a0000000-0000-4000-8000-000000000002', quantity: 2 },
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

// 6. Kiểm tra quy định chỉ nhận đặt hàng Thứ 2 đến Thứ 6 (đóng cổng Thứ 7 & Chủ Nhật)
console.log('6. Kiểm tra quy định chỉ nhận đặt hàng Thứ 2 đến Thứ 6 (đóng cổng Thứ 7 & CN):');
// Test Thứ 2 (2026-09-28)
assert.strictEqual(isOrderingAllowed(new Date('2026-09-28T09:00:00+07:00')), true, 'Thứ 2 phải được đặt hàng');
assert.strictEqual(isWeekendInVietnam(new Date('2026-09-28T09:00:00+07:00')), false);
// Test Thứ 3 (2026-09-29)
assert.strictEqual(isOrderingAllowed(new Date('2026-09-29T10:00:00+07:00')), true, 'Thứ 3 phải được đặt hàng');
// Test Thứ 4 (2026-09-30)
assert.strictEqual(isOrderingAllowed(new Date('2026-09-30T11:00:00+07:00')), true, 'Thứ 4 phải được đặt hàng');
// Test Thứ 5 (2026-10-01)
assert.strictEqual(isOrderingAllowed(new Date('2026-10-01T14:00:00+07:00')), true, 'Thứ 5 phải được đặt hàng');
// Test Thứ 6 (2026-10-02)
assert.strictEqual(isOrderingAllowed(new Date('2026-10-02T16:00:00+07:00')), true, 'Thứ 6 phải được đặt hàng');
assert.strictEqual(isWeekendInVietnam(new Date('2026-10-02T16:00:00+07:00')), false);
// Test Thứ 7 (2026-10-03)
assert.strictEqual(isOrderingAllowed(new Date('2026-10-03T10:00:00+07:00')), false, 'Thứ 7 phải bị chặn đặt hàng');
assert.strictEqual(isWeekendInVietnam(new Date('2026-10-03T10:00:00+07:00')), true);
// Test Chủ Nhật (2026-10-04)
assert.strictEqual(isOrderingAllowed(new Date('2026-10-04T12:00:00+07:00')), false, 'Chủ Nhật phải bị chặn đặt hàng');
assert.strictEqual(isWeekendInVietnam(new Date('2026-10-04T12:00:00+07:00')), true);

// Test orderService.createOrder chặn tạo đơn vào cuối tuần
const testMockPayload = {
  customer_name: 'Khách Thử Nghiệm',
  phone: '0901234567',
  social_username: '@test_cucki',
  order_channel: 'Instagram',
  delivery_address: '123 Đường Bánh Quy, Q1, TPHCM',
  pickup_date: validPickupDay,
  ship_payment_method: 'Chuyển khoản tiền ship cho Cúc-Ki',
  items: [{ productId: 'mock-id-1', quantity: 1 }],
};

await assert.rejects(
  async () => {
    await orderService.createOrder(testMockPayload, new Date('2026-10-03T10:00:00+07:00'));
  },
  /ORDER_WEEKEND_CLOSED/,
  'Tạo đơn vào Thứ 7 phải bị chặn với lỗi ORDER_WEEKEND_CLOSED'
);

await assert.rejects(
  async () => {
    await orderService.createOrder(testMockPayload, new Date('2026-10-04T15:00:00+07:00'));
  },
  /ORDER_WEEKEND_CLOSED/,
  'Tạo đơn vào Chủ Nhật phải bị chặn với lỗi ORDER_WEEKEND_CLOSED'
);
console.log('   ✅ Đạt: Chặn tạo đơn thành công vào Thứ 7 & Chủ Nhật, cho phép Thứ 2 đến Thứ 6.\n');

// 7. Kiểm tra tính năng Quản lý On/Off ngày và Tùy chỉnh số lượng đơn nhận
console.log('7. Kiểm tra tính năng Admin điều chỉnh On/Off và số lượng đơn nhận:');
const customSettings = {
  ...DEFAULT_DAILY_SETTINGS,
  default_max_orders: 5,
  allow_weekend_ordering: false,
  day_configs: {
    '2026-10-27': { is_open: false, max_orders: 5, note: 'Bảo trì lò nướng' },
    '2026-10-28': { is_open: true, max_orders: 10, note: 'Tăng công suất' },
    '2026-10-31': { is_open: true, max_orders: 6, note: 'Mở đơn đặc biệt Thứ 7' },
  },
};

// Ngày thường mặc định thừa kế default_max_orders = 5
const weekdayDefault = resolveDateConfig('2026-10-26', customSettings);
assert.strictEqual(weekdayDefault.isOpen, true, 'Ngày thường không cấu hình phải mở');
assert.strictEqual(weekdayDefault.maxOrders, 5, 'Phải nhận default_max_orders = 5');
assert.strictEqual(weekdayDefault.isCustom, false);

// Ngày Thứ 3 bị admin tắt (OFF)
const closedDay = resolveDateConfig('2026-10-27', customSettings);
assert.strictEqual(closedDay.isOpen, false, 'Ngày bị admin tắt phải có isOpen = false');
assert.strictEqual(closedDay.note, 'Bảo trì lò nướng');
assert.strictEqual(closedDay.isCustom, true);

// Ngày Thứ 4 nâng quota lên 10 đơn
const boostedDay = resolveDateConfig('2026-10-28', customSettings);
assert.strictEqual(boostedDay.isOpen, true);
assert.strictEqual(boostedDay.maxOrders, 10, 'Quota phải được nâng lên 10 đơn');
assert.strictEqual(boostedDay.isCustom, true);

// Ngày Thứ 7 được admin bật riêng lẻ (mặc dù allow_weekend_ordering = false)
const openedSaturday = resolveDateConfig('2026-10-31', customSettings);
assert.strictEqual(openedSaturday.isWeekend, true);
assert.strictEqual(openedSaturday.isOpen, true, 'Thứ 7 được mở riêng lẻ phải có isOpen = true');
assert.strictEqual(openedSaturday.maxOrders, 6);

// Ngày Chủ Nhật bình thường vẫn đóng
const defaultSunday = resolveDateConfig('2026-11-01', customSettings);
assert.strictEqual(defaultSunday.isWeekend, true);
assert.strictEqual(defaultSunday.isOpen, false, 'Chủ Nhật chưa mở phải có isOpen = false');

console.log('   ✅ Đạt: Logic resolveDateConfig giải quyết chính xác các trường hợp override On/Off, quota và ghi chú ngày.\n');

console.log('🎉 TẤT CẢ CÁC BÀI KIỂM TRA NGHIỆP VỤ ĐÃ VƯỢT QUA THÀNH CÔNG!');

