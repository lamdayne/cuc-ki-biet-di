import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // 1. Zod Validation Error
  if (err instanceof ZodError || err?.name === 'ZodError') {
    const rawIssues = err.issues || err.errors || [];
    const errorDetails = rawIssues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : '',
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: errorDetails[0]?.message || 'Dữ liệu không hợp lệ',
      errors: errorDetails,
    });
  }

  // 2. Custom Business Errors from Postgres RPC or Services
  const message = err.message || '';
  if (message.includes('DAY_CAPACITY_FULL')) {
    const customMsg = message.replace(/^.*DAY_CAPACITY_FULL:\s*/, '').trim();
    return res.status(409).json({
      success: false,
      code: 'DAY_CAPACITY_FULL',
      message: customMsg || 'Ngày nướng bánh này đã nhận đủ số lượng đơn hàng. Vui lòng chọn một ngày khác.',
    });
  }

  if (message.includes('DAY_CLOSED')) {
    const customMsg = message.replace(/^.*DAY_CLOSED:\s*/, '').trim();
    return res.status(400).json({
      success: false,
      code: 'DAY_CLOSED',
      message: customMsg || 'Ngày nướng bánh này tiệm tạm ngưng nhận đơn. Vui lòng chọn một ngày khác.',
    });
  }

  if (message.includes('PRODUCT_UNAVAILABLE')) {
    return res.status(400).json({
      success: false,
      code: 'PRODUCT_UNAVAILABLE',
      message: message.replace(/^.*PRODUCT_UNAVAILABLE:\s*/, ''),
    });
  }

  if (message.includes('PRODUCT_NOT_FOUND')) {
    return res.status(400).json({
      success: false,
      code: 'PRODUCT_NOT_FOUND',
      message: 'Một số sản phẩm trong giỏ hàng không còn tồn tại.',
    });
  }

  if (message.includes('ORDER_WEEKEND_CLOSED')) {
    return res.status(400).json({
      success: false,
      code: 'ORDER_WEEKEND_CLOSED',
      message: 'Tiệm CÚC-KI chỉ nhận đặt hàng từ Thứ 2 đến Thứ 6. Thứ 7 và Chủ Nhật tiệm tạm ngưng nhận đơn mới.',
    });
  }

  // 3. Fallback General Error
  console.error('[SERVER ERROR]:', err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.userMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
  });
}
