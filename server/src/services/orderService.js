import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { generateOrderCode } from '../utils/codeGenerator.js';
import {
  getUpcoming31Days,
  getTodayVietnamString,
  isOrderingAllowed,
  getOrderingScheduleInfo,
  resolveDateConfig,
  DEFAULT_DAILY_SETTINGS,
} from '../utils/dates.js';
import { memoryStore } from './store.js';
import {
  DEFAULT_PACKING_FEE_CONFIG,
  calculateOrderPackingFee,
} from '../utils/packingFee.js';

const isSupabaseLive = Boolean(
  env.SUPABASE_URL &&
    !env.SUPABASE_URL.includes('placeholder') &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
);

function maskPhoneNumber(phone) {
  if (!phone || phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

export const orderService = {
  async getDailyOrderSettings() {
    if (!isSupabaseLive) {
      return memoryStore.getDailyOrderSettings();
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'daily_order_settings')
        .maybeSingle();

      if (error || !data?.value) {
        return DEFAULT_DAILY_SETTINGS;
      }
      return data.value;
    } catch (err) {
      console.error('Failed to load daily_order_settings, using fallback:', err);
      return DEFAULT_DAILY_SETTINGS;
    }
  },

  async getOrderingSchedule(referenceDate = new Date()) {
    const dailySettings = await this.getDailyOrderSettings();
    return getOrderingScheduleInfo(referenceDate, dailySettings);
  },

  async getPublicMenu() {
    const dailySettings = await this.getDailyOrderSettings();
    const orderingSchedule = getOrderingScheduleInfo(new Date(), dailySettings);

    if (!isSupabaseLive) {
      const categories = memoryStore.getCategories(true);
      const products = memoryStore.getProducts(null, true);
      const categoriesWithProducts = categories.map((cat) => ({
        ...cat,
        products: products.filter((p) => p.category_id === cat.id),
      }));
      const packingConfig = memoryStore.getPackingFeeConfig();
      return {
        categories: categoriesWithProducts,
        packingFee: packingConfig.amount ?? 2000,
        packingFeeConfig: packingConfig,
        isOrderingOpen: orderingSchedule.isOpen,
        orderingSchedule,
        dailySettings,
      };
    }

    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (catError) throw catError;

    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('display_order', { ascending: true });

    if (prodError) throw prodError;

    const { data: feeSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'packing_fee')
      .maybeSingle();

    const packingFeeConfig = feeSetting?.value ?? DEFAULT_PACKING_FEE_CONFIG;
    const packingFee = packingFeeConfig?.default_fee ?? packingFeeConfig?.amount ?? 2000;

    const categoriesWithProducts = categories.map((cat) => ({
      ...cat,
      products: products.filter((p) => p.category_id === cat.id),
    }));

    return {
      categories: categoriesWithProducts,
      packingFee,
      packingFeeConfig,
      isOrderingOpen: orderingSchedule.isOpen,
      orderingSchedule,
      dailySettings,
    };
  },

  async getPickupAvailability() {
    const dailySettings = await this.getDailyOrderSettings();
    const upcomingDays = getUpcoming31Days(new Date(), dailySettings);
    let countsByDate = {};

    if (!isSupabaseLive) {
      countsByDate = upcomingDays.reduce((acc, day) => {
        acc[day.dateStr] = memoryStore.countOrdersForDate(day.dateStr);
        return acc;
      }, {});
    } else if (upcomingDays.length > 0) {
      const startDate = upcomingDays[0].dateStr;
      const endDate = upcomingDays[upcomingDays.length - 1].dateStr;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('pickup_date')
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate)
        .neq('status', 'cancelled');

      if (error) throw error;

      countsByDate = (orders || []).reduce((acc, order) => {
        acc[order.pickup_date] = (acc[order.pickup_date] || 0) + 1;
        return acc;
      }, {});
    }

    return upcomingDays.map((day) => {
      const count = countsByDate[day.dateStr] || 0;
      const max = day.maxOrders;
      const isFull = !day.isOpen || (max > 0 && count >= max);
      const todaySuffix = day.isToday ? ' (Hôm nay)' : '';

      let countText = '';
      if (!day.isOpen) {
        countText = '(Tạm ngưng nhận đơn)';
      } else if (isFull) {
        countText = `${count}/${max} đơn (ĐÃ ĐỦ ĐƠN)`;
      } else {
        const remaining = max - count;
        countText = remaining > 0 ? `Còn ${remaining} đơn (${count}/${max} đơn)` : `${count}/${max} đơn`;
      }

      const label = `${day.weekdayName}, ${day.displayDate}${todaySuffix} — ${countText}`;

      return {
        ...day,
        count,
        max,
        isFull,
        label,
      };
    });
  },

  async createOrder(orderInput, referenceDate = new Date()) {
    const dailySettings = await this.getDailyOrderSettings();

    // Validate that baking date is OPEN and not beyond max quota
    const resolved = resolveDateConfig(orderInput.pickup_date, dailySettings);
    if (!resolved.isOpen) {
      const err = new Error(
        `DAY_CLOSED: Tiệm tạm ngưng nhận đơn cho ngày nướng ${orderInput.pickup_date}. Vui lòng chọn ngày khác.`
      );
      err.status = 400;
      err.code = 'DAY_CLOSED';
      err.userMessage = `Tiệm tạm ngưng nhận đơn cho ngày nướng ${orderInput.pickup_date}. Vui lòng chọn ngày khác.`;
      throw err;
    }

    // Pre-check capacity count
    let currentCount = 0;
    if (!isSupabaseLive) {
      currentCount = memoryStore.countOrdersForDate(orderInput.pickup_date);
    } else {
      const { count: dbCount, error: countErr } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('pickup_date', orderInput.pickup_date)
        .neq('status', 'cancelled');
      if (!countErr && typeof dbCount === 'number') {
        currentCount = dbCount;
      }
    }

    if (resolved.maxOrders > 0 && currentCount >= resolved.maxOrders) {
      const err = new Error(
        `DAY_CAPACITY_FULL: Ngày nướng ${orderInput.pickup_date} đã đủ ${resolved.maxOrders} đơn hàng. Vui lòng chọn ngày khác.`
      );
      err.status = 409;
      err.code = 'DAY_CAPACITY_FULL';
      err.userMessage = `Ngày nướng bánh này đã nhận đủ ${resolved.maxOrders} đơn hàng. Vui lòng chọn một ngày khác.`;
      throw err;
    }


    const code = generateOrderCode(new Date(orderInput.pickup_date));

    if (!isSupabaseLive) {
      return memoryStore.createOrder(code, orderInput);
    }

    const rpcPayload = {
      p_code: code,
      p_customer_name: orderInput.customer_name,
      p_phone: orderInput.phone,
      p_social_username: orderInput.social_username,
      p_order_channel: orderInput.order_channel,
      p_custom_channel_name: orderInput.custom_channel_name || null,
      p_delivery_address: orderInput.delivery_address,
      p_pickup_date: orderInput.pickup_date,
      p_ship_payment_method: orderInput.ship_payment_method,
      p_note: orderInput.note || null,
      p_items: orderInput.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
    };

    const { data, error } = await supabase.rpc('create_preorder', rpcPayload);
    if (error) throw error;

    // Recalculate packing fee dynamically based on configured tiers for each cookie item
    try {
      const { data: feeSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'packing_fee')
        .maybeSingle();
      const packingConfig = feeSetting?.value ?? DEFAULT_PACKING_FEE_CONFIG;
      const calculatedPackingFee = calculateOrderPackingFee(orderInput.items, packingConfig);

      if (data?.order_id) {
        const finalTotalPrice = Number(data.subtotal) + calculatedPackingFee;
        await supabase
          .from('orders')
          .update({
            packing_fee: calculatedPackingFee,
            total_price: finalTotalPrice,
          })
          .eq('id', data.order_id);

        data.packing_fee = calculatedPackingFee;
        data.total_price = finalTotalPrice;
      }
    } catch (updateErr) {
      console.error('Failed to sync dynamic packing fee on order:', updateErr);
    }

    return data;
  },

  async lookupOrderByCode(code) {
    let formattedCode = (code || '').trim().toUpperCase().replace(/[\u2013\u2014]/g, '-');
    if (!formattedCode.startsWith('CK-') && /^\d{6}/.test(formattedCode)) {
      formattedCode = `CK-${formattedCode}`;
    }

    if (!isSupabaseLive) {
      const order = memoryStore.getOrderByCode(formattedCode);
      if (!order) {
        const notFoundErr = new Error('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn.');
        notFoundErr.status = 404;
        notFoundErr.userMessage = 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn.';
        throw notFoundErr;
      }
      return {
        ...order,
        phone: maskPhoneNumber(order.phone),
      };
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('code', formattedCode)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      const notFoundErr = new Error('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn.');
      notFoundErr.status = 404;
      notFoundErr.userMessage = 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn.';
      throw notFoundErr;
    }

    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsErr) throw itemsErr;

    return {
      ...order,
      phone: maskPhoneNumber(order.phone),
      items: items || [],
    };
  },
};
