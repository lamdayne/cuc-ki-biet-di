/**
 * packingFee.js
 * Utility functions for calculating packaging fee based on product-specific rules and defaults.
 *
 * Rules:
 * - Default: Every cookie type has a flat packaging fee of 2.000đ regardless of quantity,
 *   unless a specific custom rule is configured for that product.
 * - Product-specific rule: If a product has a custom configuration, its packaging fee
 *   scales based on its quantity (either via quantity tiers or step rules, e.g. every 5 items adds 10k).
 * - Total order packaging fee = Sum of packaging fees for each distinct cookie type in the order.
 */

export const DEFAULT_PACKING_FEE_CONFIG = {
  amount: 2000,
  default_fee: 2000,
  product_rules: [],
};

/**
 * Calculate packaging fee for a single product/item given its quantity
 * @param {string|object} productOrId - Product ID (UUID) or product object containing { id }
 * @param {number} quantity - Quantity of this cookie item
 * @param {object} config - Configuration object with { default_fee, product_rules }
 * @returns {number} Packaging fee in VND
 */
export function calculateItemPackingFee(productOrId, quantity, config = {}) {
  const qty = Number(quantity);
  if (!qty || qty <= 0) return 0;

  const defaultFee = Number(config.default_fee ?? config.amount ?? 2000);
  const productId =
    typeof productOrId === 'object' && productOrId !== null
      ? productOrId.id || productOrId.product_id || productOrId.productId
      : productOrId;

  const productRules = Array.isArray(config.product_rules) ? config.product_rules : [];

  // Find custom rule for this specific product
  const customRule = productId
    ? productRules.find((r) => String(r.product_id) === String(productId))
    : null;

  // RULE 1: If no custom rule, fee is strictly 2.000đ regardless of quantity
  if (!customRule) {
    return defaultFee;
  }

  const baseFee = Number(customRule.base_fee ?? defaultFee);

  // RULE 2: Step-based rule (e.g. "cứ 5 cái thì thêm 10k")
  if (customRule.rule_type === 'step') {
    const step = Math.max(1, Number(customRule.step_quantity) || 5);
    const stepFee = Number(customRule.step_fee) || 5000;
    const stepCount = Math.floor(qty / step);
    return baseFee + stepCount * stepFee;
  }

  // RULE 3: Tier-based rule (e.g. 1-4 cái: 2k, 5-9 cái: 10k, 20+ cái: 20k)
  const tiers = Array.isArray(customRule.tiers) ? customRule.tiers : [];
  if (tiers.length === 0) {
    return baseFee;
  }

  // Find matching tier
  for (const tier of tiers) {
    const from = Number(tier.from ?? 1);
    const to = tier.to != null && tier.to !== '' ? Number(tier.to) : Infinity;
    if (qty >= from && qty <= to) {
      return Number(tier.fee) || 0;
    }
  }

  // If quantity exceeds all defined ranges, find the highest tier
  const sortedByFrom = [...tiers].sort((a, b) => Number(b.from || 0) - Number(a.from || 0));
  if (sortedByFrom.length > 0 && qty >= Number(sortedByFrom[0].from || 0)) {
    return Number(sortedByFrom[0].fee) || defaultFee;
  }

  return baseFee;
}

/**
 * Calculate total packaging fee for an order with multiple items
 * @param {Array<{ productId?: string, product_id?: string, product?: { id: string }, quantity: number }>} items - Order items
 * @param {object} config - Packing fee config
 * @returns {number} Total packaging fee in VND
 */
export function calculateOrderPackingFee(items = [], config = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => {
    const pId = item.productId || item.product_id || item.product?.id;
    return sum + calculateItemPackingFee(pId, item.quantity, config);
  }, 0);
}
