import { z } from 'zod';
import { isWithinValidPickupWindow } from '../utils/dates.js';

const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

export const createOrderSchema = z
  .object({
    customer_name: z
      .string({ required_error: 'Vui lòng nhập họ và tên' })
      .trim()
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
      .max(100, 'Họ và tên tối đa 100 ký tự'),

    phone: z
      .string({ required_error: 'Vui lòng nhập số điện thoại' })
      .trim()
      .regex(VN_PHONE_REGEX, 'Số điện thoại không hợp lệ (ví dụ: 0901234567)'),

    social_username: z
      .string({ required_error: 'Vui lòng nhập username mạng xã hội đã đặt' })
      .trim()
      .min(1, 'Vui lòng nhập username mạng xã hội đã đặt (ví dụ: @cucki)'),

    order_channel: z.enum(
      ['Facebook', 'Instagram', 'Threads', 'Zalo', 'TikTok', 'Khác'],
      { errorMap: () => ({ message: 'Vui lòng chọn kênh đặt hàng hợp lệ' }) }
    ),

    custom_channel_name: z.string().trim().optional(),

    delivery_address: z
      .string({ required_error: 'Vui lòng nhập địa chỉ / điểm nhận bánh' })
      .trim()
      .min(5, 'Địa chỉ nhận bánh cần chi tiết hơn (tối thiểu 5 ký tự)'),

    pickup_date: z
      .string({ required_error: 'Vui lòng chọn ngày nhận bánh' })
      .refine(
        (val) => isWithinValidPickupWindow(val),
        'Ngày nhận bánh phải nằm trong khoảng từ hôm nay đến 30 ngày tới'
      ),

    ship_payment_method: z.enum(
      ['Chuyển khoản tiền ship cho Cúc-Ki', 'Tự thanh toán phí ship'],
      { errorMap: () => ({ message: 'Vui lòng chọn phương thức thanh toán ship' }) }
    ),

    note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự').optional(),

    items: z
      .array(
        z.object({
          productId: z.string().uuid('ID sản phẩm không hợp lệ'),
          quantity: z
            .number()
            .int('Số lượng phải là số nguyên')
            .min(1, 'Số lượng tối thiểu là 1')
            .max(50, 'Số lượng tối đa là 50 cho mỗi loại'),
        })
      )
      .min(1, 'Đơn hàng phải có ít nhất 1 loại bánh'),
  })
  .refine(
    (data) => {
      if (data.order_channel === 'Khác') {
        return (
          typeof data.custom_channel_name === 'string' &&
          data.custom_channel_name.trim().length > 0
        );
      }
      return true;
    },
    {
      message: 'Vui lòng nhập link hoặc tên kênh bạn đã đặt',
      path: ['custom_channel_name'],
    }
  );

export const adminLoginSchema = z.object({
  pin: z
    .string({ required_error: 'Vui lòng nhập mã PIN' })
    .regex(/^\d{6}$/, 'Mã PIN gồm đúng 6 chữ số'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'baking', 'ready', 'done', 'cancelled'], {
    errorMap: () => ({ message: 'Trạng thái đơn hàng không hợp lệ' }),
  }),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Tên danh mục tối thiểu 2 ký tự'),
  slug: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  display_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
  image_url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Tên bánh tối thiểu 2 ký tự'),
  category_id: z.string().uuid('Danh mục không hợp lệ'),
  price: z.number().int('Giá phải là số nguyên').min(0, 'Giá không được âm'),
  is_available: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export const packingFeeConfigSchema = z.object({
  amount: z.coerce.number().int().min(0, 'Phí mặc định không được âm').default(2000),
  default_fee: z.coerce.number().int().min(0, 'Phí mặc định không được âm').default(2000),
  tiers: z
    .array(
      z.object({
        from: z.coerce.number().int().min(1, 'Số lượng từ tối thiểu là 1'),
        to: z.coerce.number().int().min(1, 'Số lượng đến tối thiểu là 1').nullable().optional(),
        fee: z.coerce.number().int().min(0, 'Phí gói không được âm'),
      })
    )
    .default([]),
});

