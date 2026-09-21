import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAdminAuth(req, res, next) {
  const token = req.cookies?.admin_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Vui lòng nhập mã PIN quản lý để truy cập.',
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập khu vực này.',
      });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng nhập lại mã PIN.',
    });
  }
}
