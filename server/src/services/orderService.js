import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { generateOrderCode } from '../utils/codeGenerator.js';
import { getUpcoming31Days, getTodayVietnamString } from '../utils/dates.js';
import { memoryStore } from './store.js';

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
  async getPublicMenu() {
    if (!isSupabaseLive) {
      const categories = memoryStore.getCategories(true);
      const products = memoryStore.getProducts(null, true);
      const categoriesWithProducts = categories.map((cat) => ({
        ...cat,
        products: products.filter((p) => p.category_id === cat.id),
      }));
      return {
        categories: categoriesWithProducts,
        packingFee: memoryStore.packingFee,
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

    const packingFee = feeSetting?.value?.amount ?? 2000;

    const categoriesWithProducts = categories.map((cat) => ({
      ...cat,
      products: products.filter((p) => p.category_id === cat.id),
    }));

    return {
      categories: categoriesWithProducts,
      packingFee,
    };
  },

  async getPickupAvailability() {
    const upcomingDays = getUpcoming31Days();
    let countsByDate = {};

    if (!isSupabaseLive) {
      countsByDate = upcomingDays.reduce((acc, day) => {
        acc[day.dateStr] = memoryStore.countOrdersForDate(day.dateStr);
        return acc;
      }, {});
    } else {
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
      const isFull = count >= 4;
      const todaySuffix = day.isToday ? ' (Hôm nay)' : '';
      const countText = isFull ? '4/4 đơn (FULL)' : `${count}/4 đơn`;
      const label = `${day.weekdayName}, ${day.displayDate}${todaySuffix} — ${countText}`;

      return {
        ...day,
        count,
        max: 4,
        isFull,
        label,
      };
    });
  },

  async createOrder(orderInput) {
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
