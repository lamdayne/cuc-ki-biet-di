import crypto from 'crypto';
import {
  DEFAULT_PACKING_FEE_CONFIG,
  calculateOrderPackingFee,
} from '../utils/packingFee.js';

export const INITIAL_CATEGORIES = [
  {
    id: 'ca000000-0000-0000-0000-000000000001',
    name: 'CÚC KI CHOCOCHIP',
    slug: 'cuc-ki-chocochip',
    display_order: 1,
    is_active: true,
    image_url: null,
  },
  {
    id: 'ca000000-0000-0000-0000-000000000002',
    name: 'CÚC KI NGÀNH Y',
    slug: 'cuc-ki-nganh-y',
    display_order: 2,
    is_active: true,
    image_url: null,
  },
  {
    id: 'ca000000-0000-0000-0000-000000000003',
    name: 'CÚC KI KHUÔN',
    slug: 'cuc-ki-khuon',
    display_order: 3,
    is_active: true,
    image_url: null,
  },
  {
    id: 'ca000000-0000-0000-0000-000000000004',
    name: "S'MORE NUTS",
    slug: 'smore-nuts',
    display_order: 4,
    is_active: true,
    image_url: null,
  },
];

export const INITIAL_PRODUCTS = [
  // CÚC KI CHOCOCHIP
  { id: 'ba000000-0000-0000-0000-000000000001', category_id: 'ca000000-0000-0000-0000-000000000001', name: 'Chocochip Cacao', price: 14000, is_available: true, display_order: 1 },
  { id: 'ba000000-0000-0000-0000-000000000002', category_id: 'ca000000-0000-0000-0000-000000000001', name: 'Chocochip Matcha', price: 14000, is_available: true, display_order: 2 },
  { id: 'ba000000-0000-0000-0000-000000000003', category_id: 'ca000000-0000-0000-0000-000000000001', name: 'Chocochip Red Velvet', price: 15000, is_available: true, display_order: 3 },
  { id: 'ba000000-0000-0000-0000-000000000004', category_id: 'ca000000-0000-0000-0000-000000000001', name: 'Chocochip Oreo', price: 17000, is_available: true, display_order: 4 },
  { id: 'ba000000-0000-0000-0000-000000000005', category_id: 'ca000000-0000-0000-0000-000000000001', name: 'Chocochip Nguyên Vị', price: 12000, is_available: true, display_order: 5 },
  // CÚC KI NGÀNH Y
  { id: 'ba000000-0000-0000-0000-000000000006', category_id: 'ca000000-0000-0000-0000-000000000002', name: 'Strawberry Cúc-Ki', price: 19000, is_available: true, display_order: 1 },
  { id: 'ba000000-0000-0000-0000-000000000007', category_id: 'ca000000-0000-0000-0000-000000000002', name: 'Orange Cúc-Ki', price: 16000, is_available: true, display_order: 2 },
  { id: 'ba000000-0000-0000-0000-000000000008', category_id: 'ca000000-0000-0000-0000-000000000002', name: 'Chocomint Cúc-Ki', price: 19000, is_available: true, display_order: 3 },
  { id: 'ba000000-0000-0000-0000-000000000009', category_id: 'ca000000-0000-0000-0000-000000000002', name: 'Glass Cúc-Ki', price: 5000, is_available: true, display_order: 4 },
  // CÚC KI KHUÔN
  { id: 'ba000000-0000-0000-0000-000000000010', category_id: 'ca000000-0000-0000-0000-000000000003', name: 'Cacao', price: 5000, is_available: true, display_order: 1 },
  { id: 'ba000000-0000-0000-0000-000000000011', category_id: 'ca000000-0000-0000-0000-000000000003', name: 'Matcha', price: 5000, is_available: true, display_order: 2 },
  { id: 'ba000000-0000-0000-0000-000000000012', category_id: 'ca000000-0000-0000-0000-000000000003', name: 'Nguyên Vị', price: 3000, is_available: true, display_order: 3 },
  // S'MORE NUTS
  { id: 'ba000000-0000-0000-0000-000000000013', category_id: 'ca000000-0000-0000-0000-000000000004', name: "S'more Nuts Cacao", price: 17000, is_available: true, display_order: 1 },
  { id: 'ba000000-0000-0000-0000-000000000014', category_id: 'ca000000-0000-0000-0000-000000000004', name: "S'more Nuts Matcha", price: 17000, is_available: true, display_order: 2 },
  { id: 'ba000000-0000-0000-0000-000000000015', category_id: 'ca000000-0000-0000-0000-000000000004', name: "S'more Nuts Nguyên Vị", price: 14000, is_available: true, display_order: 3 },
];

/**
 * In-memory fallback database for local development and demonstration
 */
export class MemoryStore {
  constructor() {
    this.categories = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.packingFeeConfig = JSON.parse(JSON.stringify(DEFAULT_PACKING_FEE_CONFIG));
    this.packingFee = this.packingFeeConfig.amount;
    this.orders = [];
    this.orderItems = [];
  }

  getPackingFeeConfig() {
    return this.packingFeeConfig;
  }

  updatePackingFeeConfig(newConfig) {
    this.packingFeeConfig = {
      ...this.packingFeeConfig,
      ...newConfig,
      amount: newConfig.default_fee ?? newConfig.amount ?? 2000,
    };
    this.packingFee = this.packingFeeConfig.amount;
    return this.packingFeeConfig;
  }

  // Categories
  getCategories(activeOnly = false) {
    let list = this.categories;
    if (activeOnly) {
      list = list.filter((c) => c.is_active);
    }
    return list.sort((a, b) => a.display_order - b.display_order);
  }

  addCategory(data) {
    const newCat = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.categories.push(newCat);
    return newCat;
  }

  updateCategory(id, updates) {
    const idx = this.categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Không tìm thấy loại cookie');
    this.categories[idx] = { ...this.categories[idx], ...updates };
    return this.categories[idx];
  }

  deleteCategory(id) {
    const prodCount = this.products.filter((p) => p.category_id === id).length;
    if (prodCount > 0) {
      const err = new Error(
        `Không thể xóa loại cookie này vì vẫn còn ${prodCount} sản phẩm bên trong. Vui lòng chuyển danh mục hoặc xóa các sản phẩm trước.`
      );
      err.status = 400;
      err.userMessage = err.message;
      throw err;
    }
    this.categories = this.categories.filter((c) => c.id !== id);
    return { success: true };
  }

  // Products
  getProducts(categoryId = null, availableOnly = false) {
    let list = this.products;
    if (categoryId) {
      list = list.filter((p) => p.category_id === categoryId);
    }
    if (availableOnly) {
      list = list.filter((p) => p.is_available);
    }
    return list.map((p) => ({
      ...p,
      categories: this.categories.find((c) => c.id === p.category_id)
        ? { id: p.category_id, name: this.categories.find((c) => c.id === p.category_id).name }
        : null,
    }));
  }

  addProduct(data) {
    const newProd = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };
    this.products.push(newProd);
    return {
      ...newProd,
      categories: this.categories.find((c) => c.id === newProd.category_id) || null,
    };
  }

  updateProduct(id, updates) {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Không tìm thấy sản phẩm');
    this.products[idx] = { ...this.products[idx], ...updates };
    const prod = this.products[idx];
    return {
      ...prod,
      categories: this.categories.find((c) => c.id === prod.category_id) || null,
    };
  }

  deleteProduct(id) {
    this.products = this.products.filter((p) => p.id !== id);
    return { success: true };
  }

  // Orders
  countOrdersForDate(pickupDate) {
    return this.orders.filter(
      (o) => o.pickup_date === pickupDate && o.status !== 'cancelled'
    ).length;
  }

  createOrder(code, orderInput) {
    // 1. Check day slot
    const count = this.countOrdersForDate(orderInput.pickup_date);
    if (count >= 4) {
      const err = new Error(
        `DAY_CAPACITY_FULL: Ngày ${orderInput.pickup_date} đã đủ 4 đơn hàng. Vui lòng chọn ngày khác.`
      );
      err.status = 409;
      err.code = 'DAY_CAPACITY_FULL';
      err.userMessage = 'Ngày nhận bánh này vừa nhận đủ 4 đơn hàng. Vui lòng chọn một ngày khác.';
      throw err;
    }

    // 2. Validate items and recalculate prices
    let subtotal = 0;
    const itemsSnapshot = [];

    for (const item of orderInput.items) {
      const prod = this.products.find((p) => p.id === item.productId);
      if (!prod) {
        const err = new Error('PRODUCT_NOT_FOUND');
        err.status = 400;
        err.userMessage = 'Một số sản phẩm trong giỏ hàng không còn tồn tại.';
        throw err;
      }
      if (!prod.is_available) {
        const err = new Error(`PRODUCT_UNAVAILABLE: Bánh "${prod.name}" hiện tạm hết`);
        err.status = 400;
        err.userMessage = `Bánh "${prod.name}" hiện tạm hết, vui lòng chọn loại khác.`;
        throw err;
      }
      const lineTotal = prod.price * item.quantity;
      subtotal += lineTotal;
      itemsSnapshot.push({
        id: crypto.randomUUID(),
        product_id: prod.id,
        product_name: prod.name,
        unit_price: prod.price,
        quantity: item.quantity,
        line_total: lineTotal,
      });
    }

    const calculatedPackingFee = calculateOrderPackingFee(orderInput.items, this.packingFeeConfig);
    const totalPrice = subtotal + calculatedPackingFee;
    const orderId = crypto.randomUUID();

    const newOrder = {
      id: orderId,
      code,
      customer_name: orderInput.customer_name,
      phone: orderInput.phone,
      social_username: orderInput.social_username,
      order_channel: orderInput.order_channel,
      custom_channel_name: orderInput.custom_channel_name || null,
      delivery_address: orderInput.delivery_address,
      pickup_date: orderInput.pickup_date,
      ship_payment_method: orderInput.ship_payment_method,
      note: orderInput.note || null,
      subtotal,
      packing_fee: calculatedPackingFee,
      total_price: totalPrice,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.orders.push(newOrder);

    // Save items
    for (const it of itemsSnapshot) {
      this.orderItems.push({ ...it, order_id: orderId });
    }

    return {
      order_id: orderId,
      code,
      pickup_date: orderInput.pickup_date,
      subtotal,
      packing_fee: this.packingFee,
      total_price: totalPrice,
      status: 'pending',
    };
  }

  getOrderByCode(code) {
    const formatted = code.trim().toUpperCase();
    const order = this.orders.find((o) => o.code === formatted);
    if (!order) return null;
    const items = this.orderItems.filter((it) => it.order_id === order.id);
    return { ...order, items };
  }

  getOrders(filters = {}) {
    let list = [...this.orders];
    if (filters.pickupDate) {
      list = list.filter((o) => o.pickup_date === filters.pickupDate);
    }
    if (filters.status) {
      list = list.filter((o) => o.status === filters.status);
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const ordersWithItems = list.map((ord) => ({
      ...ord,
      order_items: this.orderItems.filter((it) => it.order_id === ord.id),
    }));

    const dayCounts = {};
    for (const ord of this.orders) {
      if (ord.status !== 'cancelled') {
        dayCounts[ord.pickup_date] = (dayCounts[ord.pickup_date] || 0) + 1;
      }
    }

    return { orders: ordersWithItems, dayCounts };
  }

  updateOrderStatus(id, status) {
    const ord = this.orders.find((o) => o.id === id);
    if (!ord) throw new Error('Không tìm thấy đơn hàng');
    ord.status = status;
    ord.updated_at = new Date().toISOString();
    return ord;
  }
}

export const memoryStore = new MemoryStore();
