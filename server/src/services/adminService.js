import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import { memoryStore } from './store.js';
import { DEFAULT_PACKING_FEE_CONFIG } from '../utils/packingFee.js';
import {
  getUpcomingDays,
  resolveDateConfig,
  DEFAULT_DAILY_SETTINGS,
} from '../utils/dates.js';

const isSupabaseLive = Boolean(
  env.SUPABASE_URL &&
    !env.SUPABASE_URL.includes('placeholder') &&
    env.SUPABASE_SERVICE_ROLE_KEY &&
    !env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')
);

export const adminService = {
  async verifyPin(pin) {
    if (!env.ADMIN_PIN_HASH) {
      throw new Error('ADMIN_PIN_HASH chưa được cấu hình trên máy chủ.');
    }
    const isValid = await bcrypt.compare(pin, env.ADMIN_PIN_HASH);
    return isValid;
  },

  async getOrders(filters = {}) {
    if (!isSupabaseLive) {
      return memoryStore.getOrders(filters);
    }

    let query = supabase
      .from('orders')
      .select('*')
      .order('pickup_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (filters.pickupDate) {
      query = query.eq('pickup_date', filters.pickupDate);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    // Fetch order items separately to ensure 100% reliability with PostgREST
    const orderIds = (orders || []).map((o) => o.id);
    let itemsByOrderId = {};

    if (orderIds.length > 0) {
      const { data: allItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (!itemsErr && allItems) {
        itemsByOrderId = allItems.reduce((acc, item) => {
          if (!acc[item.order_id]) acc[item.order_id] = [];
          acc[item.order_id].push(item);
          return acc;
        }, {});
      }
    }

    const ordersWithItems = (orders || []).map((ord) => ({
      ...ord,
      order_items: itemsByOrderId[ord.id] || [],
    }));

    const dates = Array.from(new Set((orders || []).map((o) => o.pickup_date)));
    let dayCounts = {};

    if (dates.length > 0) {
      const { data: countData, error: countErr } = await supabase
        .from('orders')
        .select('pickup_date')
        .in('pickup_date', dates)
        .neq('status', 'cancelled');

      if (!countErr && countData) {
        dayCounts = countData.reduce((acc, row) => {
          acc[row.pickup_date] = (acc[row.pickup_date] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const dailySettings = await this.getDailyOrderSettings();
    const dayLimits = {};
    for (const d of dates) {
      dayLimits[d] = resolveDateConfig(d, dailySettings).maxOrders;
    }

    return {
      orders: ordersWithItems,
      dayCounts,
      dayLimits,
    };
  },

  async updateOrderStatus(id, status) {
    if (!isSupabaseLive) {
      return memoryStore.updateOrderStatus(id, status);
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCategories() {
    if (!isSupabaseLive) {
      const cats = memoryStore.getCategories();
      const prods = memoryStore.getProducts();
      return cats.map((cat) => ({
        ...cat,
        product_count: prods.filter((p) => p.category_id === cat.id).length,
      }));
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*, products(id)')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((cat) => ({
      ...cat,
      product_count: cat.products?.length || 0,
    }));
  },

  async createCategory({ name, slug, display_order, is_active, image_url }) {
    const generatedSlug =
      slug ||
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    if (!isSupabaseLive) {
      return memoryStore.addCategory({
        name,
        slug: generatedSlug,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
        image_url: image_url || null,
      });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug: generatedSlug,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id, updates) {
    if (!isSupabaseLive) {
      return memoryStore.updateCategory(id, updates);
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    if (!isSupabaseLive) {
      return memoryStore.deleteCategory(id);
    }

    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name')
      .eq('category_id', id);

    if (prodErr) throw prodErr;

    if (products && products.length > 0) {
      const err = new Error(
        `Không thể xóa loại cookie này vì vẫn còn ${products.length} sản phẩm bên trong. Vui lòng chuyển danh mục hoặc xóa các sản phẩm trước.`
      );
      err.status = 400;
      err.userMessage = err.message;
      throw err;
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async uploadCategoryImage(file) {
    if (!isSupabaseLive) {
      // In local mode, return inline base64 data URL
      const base64 = file.buffer.toString('base64');
      return `data:${file.mimetype};base64,${base64}`;
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const filePath = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from('category-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('category-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  },

  async getProducts(categoryId = null) {
    if (!isSupabaseLive) {
      return memoryStore.getProducts(categoryId);
    }

    let query = supabase
      .from('products')
      .select('*, categories(id, name)')
      .order('display_order', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createProduct({ name, category_id, price, is_available, display_order }) {
    if (!isSupabaseLive) {
      return memoryStore.addProduct({
        name,
        category_id,
        price,
        is_available: is_available ?? true,
        display_order: display_order ?? 0,
      });
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        name,
        category_id,
        price,
        is_available: is_available ?? true,
        display_order: display_order ?? 0,
      })
      .select('*, categories(id, name)')
      .single();

    if (error) throw error;
    return data;
  },

  async updateProduct(id, updates) {
    if (!isSupabaseLive) {
      return memoryStore.updateProduct(id, updates);
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*, categories(id, name)')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    if (!isSupabaseLive) {
      return memoryStore.deleteProduct(id);
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async getPackingFeeConfig() {
    if (!isSupabaseLive) {
      return memoryStore.getPackingFeeConfig();
    }

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'packing_fee')
      .maybeSingle();

    if (error) throw error;
    return data?.value ?? DEFAULT_PACKING_FEE_CONFIG;
  },

  async updatePackingFeeConfig(config) {
    const payload = {
      ...config,
      amount: config.default_fee ?? config.amount ?? 2000,
    };

    if (!isSupabaseLive) {
      return memoryStore.updatePackingFeeConfig(payload);
    }

    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key: 'packing_fee',
        value: payload,
        updated_at: new Date().toISOString(),
      })
      .select('value')
      .single();

    if (error) throw error;
    return data?.value ?? payload;
  },

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
      console.error('Failed to get daily_order_settings, fallback to default:', err);
      return DEFAULT_DAILY_SETTINGS;
    }
  },

  async getScheduleData(daysAhead = 60) {
    const settings = await this.getDailyOrderSettings();
    const upcomingDays = getUpcomingDays(new Date(), daysAhead, settings);

    let ordersByDate = {};
    let countsByDate = {};

    if (!isSupabaseLive) {
      const allOrders = memoryStore.orders.filter((o) => o.status !== 'cancelled');
      for (const ord of allOrders) {
        if (!ordersByDate[ord.pickup_date]) ordersByDate[ord.pickup_date] = [];
        ordersByDate[ord.pickup_date].push({
          id: ord.id,
          code: ord.code,
          customer_name: ord.customer_name,
          phone: ord.phone,
          status: ord.status,
          total_price: ord.total_price,
          created_at: ord.created_at,
          items_count: (ord.order_items || []).reduce((s, it) => s + (it.quantity || 1), 0),
        });
        countsByDate[ord.pickup_date] = (countsByDate[ord.pickup_date] || 0) + 1;
      }
    } else if (upcomingDays.length > 0) {
      const startDate = upcomingDays[0].dateStr;
      const endDate = upcomingDays[upcomingDays.length - 1].dateStr;

      const { data: dbOrders, error } = await supabase
        .from('orders')
        .select('id, code, customer_name, phone, status, total_price, created_at, pickup_date')
        .gte('pickup_date', startDate)
        .lte('pickup_date', endDate)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (!error && dbOrders) {
        for (const ord of dbOrders) {
          if (!ordersByDate[ord.pickup_date]) ordersByDate[ord.pickup_date] = [];
          ordersByDate[ord.pickup_date].push(ord);
          countsByDate[ord.pickup_date] = (countsByDate[ord.pickup_date] || 0) + 1;
        }
      }
    }

    let totalOpen = 0;
    let totalClosed = 0;
    let totalFull = 0;
    let totalBookedOrders = 0;

    const enrichedDays = upcomingDays.map((d) => {
      const count = countsByDate[d.dateStr] || 0;
      const isFull = !d.isOpen || (d.maxOrders > 0 && count >= d.maxOrders);
      totalBookedOrders += count;

      if (d.isOpen) {
        totalOpen++;
        if (isFull) totalFull++;
      } else {
        totalClosed++;
      }

      return {
        ...d,
        count,
        isFull,
        orders: ordersByDate[d.dateStr] || [],
      };
    });

    return {
      settings,
      days: enrichedDays,
      stats: {
        totalDays: upcomingDays.length,
        openDaysCount: totalOpen,
        closedDaysCount: totalClosed,
        fullDaysCount: totalFull,
        totalBookedOrders,
      },
    };
  },

  async updateDailyOrderSettings(newSettings) {
    const payload = {
      default_max_orders:
        Number(newSettings.default_max_orders) >= 0
          ? Number(newSettings.default_max_orders)
          : 4,
      allow_weekend_ordering: Boolean(newSettings.allow_weekend_ordering),
      day_configs: newSettings.day_configs || {},
    };

    if (!isSupabaseLive) {
      return memoryStore.updateDailyOrderSettings(payload);
    }

    const { data, error } = await supabase
      .from('settings')
      .upsert({
        key: 'daily_order_settings',
        value: payload,
        updated_at: new Date().toISOString(),
      })
      .select('value')
      .single();

    if (error) throw error;
    return data?.value ?? payload;
  },

  async updateDayConfig(date, config) {
    const currentSettings = await this.getDailyOrderSettings();
    const updatedDayConfigs = { ...(currentSettings.day_configs || {}) };

    updatedDayConfigs[date] = {
      ...(updatedDayConfigs[date] || {}),
      is_open: typeof config.is_open === 'boolean' ? config.is_open : true,
      max_orders:
        config.max_orders !== undefined
          ? Number(config.max_orders)
          : (updatedDayConfigs[date]?.max_orders ?? currentSettings.default_max_orders ?? 4),
      note: config.note !== undefined ? config.note : (updatedDayConfigs[date]?.note || ''),
    };

    const newSettings = {
      ...currentSettings,
      day_configs: updatedDayConfigs,
    };

    return this.updateDailyOrderSettings(newSettings);
  },

  async batchUpdateDays({ dates = [], is_open, max_orders, reset_to_default = false }) {
    const currentSettings = await this.getDailyOrderSettings();
    const updatedDayConfigs = { ...(currentSettings.day_configs || {}) };

    for (const date of dates) {
      if (reset_to_default) {
        delete updatedDayConfigs[date];
      } else {
        const existing = updatedDayConfigs[date] || {};
        updatedDayConfigs[date] = {
          ...existing,
          is_open: typeof is_open === 'boolean' ? is_open : (existing.is_open ?? true),
          max_orders:
            max_orders !== undefined
              ? Number(max_orders)
              : (existing.max_orders ?? currentSettings.default_max_orders ?? 4),
        };
      }
    }

    const newSettings = {
      ...currentSettings,
      day_configs: updatedDayConfigs,
    };

    return this.updateDailyOrderSettings(newSettings);
  },
};
