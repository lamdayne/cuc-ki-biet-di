import { Router } from 'express';
import { orderService } from '../services/orderService.js';
import { createOrderSchema } from '../schemas/orderSchemas.js';
import { orderCreateLimiter, orderLookupLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

/**
 * GET /api/menu
 * Active categories, available products, and packing fee
 */
router.get('/menu', async (req, res, next) => {
  try {
    const data = await orderService.getPublicMenu();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/pickup-availability
 * Per-day order count and fullness for the next 31 days
 */
router.get('/pickup-availability', async (req, res, next) => {
  try {
    const availability = await orderService.getPickupAvailability();
    res.json({ success: true, data: availability });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/orders
 * Create a new preorder with server-side validation and atomic check
 */
router.post('/orders', orderCreateLimiter, async (req, res, next) => {
  try {
    const validatedBody = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(validatedBody);
    res.status(201).json({
      success: true,
      message: 'Đặt bánh thành công!',
      data: order,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:code
 * Look up order status and details by order code
 */
router.get('/orders/:code', orderLookupLimiter, async (req, res, next) => {
  try {
    const { code } = req.params;
    const order = await orderService.lookupOrderByCode(code);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

export default router;
