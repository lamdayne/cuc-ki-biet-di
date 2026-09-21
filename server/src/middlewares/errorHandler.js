import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
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
    return res.status(409).json({
      success: false,
      code: 'DAY_CAPACITY_FULL',
      message: 'Ngày nhận bánh này vừa nhận đủ 4 đơn hàng. Vui lòng chọn một ngày khác.',
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

  // 3. Fallback General Error
  console.error('[SERVER ERROR]:', err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.userMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
  });
}
