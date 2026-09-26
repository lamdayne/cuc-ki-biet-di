import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { env } from '../config/env.js';
import { adminService } from '../services/adminService.js';
import { requireAdminAuth } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/rateLimiter.js';
import {
  adminLoginSchema,
  updateOrderStatusSchema,
  categorySchema,
  productSchema,
  packingFeeConfigSchema,
} from '../schemas/orderSchemas.js';

const router = Router();

// Multer memory storage for category banner image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận định dạng hình ảnh (JPG, PNG, WEBP)'));
    }
  },
});

/**
 * POST /api/admin/login
 * Verify 6-digit PIN and set httpOnly cookie
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { pin } = adminLoginSchema.parse(req.body);
    const isValid = await adminService.verifyPin(pin);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Mã PIN không đúng, vui lòng thử lại',
      });
    }

    // Generate signed JWT
    const token = jwt.sign({ role: 'admin' }, env.JWT_SECRET, {
      expiresIn: '4h',
    });

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 4 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      message: 'Đăng nhập quản trị thành công',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Đã đăng xuất' });
});

/**
 * GET /api/admin/check-auth
 */
router.get('/check-auth', requireAdminAuth, (req, res) => {
  res.json({ success: true, authenticated: true });
});

// --- Protected Admin Routes ---
router.use(requireAdminAuth);

/**
 * Orders management
 */
router.get('/orders', async (req, res, next) => {
  try {
    const { pickupDate, status } = req.query;
    const result = await adminService.getOrders({ pickupDate, status });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = updateOrderStatusSchema.parse(req.body);
    const updatedOrder = await adminService.updateOrderStatus(id, status);
    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    next(err);
  }
});

/**
 * Categories CRUD
 */
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await adminService.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const validated = categorySchema.parse(req.body);
    const category = await adminService.createCategory(validated);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = categorySchema.partial().parse(req.body);
    const updated = await adminService.updateCategory(id, validated);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.deleteCategory(id);
    res.json({ success: true, message: 'Đã xóa loại cookie' });
  } catch (err) {
    next(err);
  }
});

router.post('/categories/upload-image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn tệp hình ảnh' });
    }
    const imageUrl = await adminService.uploadCategoryImage(req.file);
    res.json({ success: true, data: { imageUrl } });
  } catch (err) {
    next(err);
  }
});

/**
 * Products CRUD
 */
router.get('/products', async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const products = await adminService.getProducts(categoryId);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const validated = productSchema.parse(req.body);
    const product = await adminService.createProduct(validated);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.put('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = productSchema.partial().parse(req.body);
    const updated = await adminService.updateProduct(id, validated);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.deleteProduct(id);
    res.json({ success: true, message: 'Đã xóa sản phẩm' });
  } catch (err) {
    next(err);
  }
});

/**
 * Settings - Packing Fee Config
 */
router.get('/settings/packing-fee', async (req, res, next) => {
  try {
    const config = await adminService.getPackingFeeConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

router.put('/settings/packing-fee', async (req, res, next) => {
  try {
    const validated = packingFeeConfigSchema.parse(req.body);
    const updated = await adminService.updatePackingFeeConfig(validated);
    res.json({
      success: true,
      data: updated,
      message: 'Đã lưu cấu hình phí gói bánh thành công',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
