/**
 * packingFee.js
 * Client utility functions for calculating packaging fee based on item quantity and tier rules.
 * Rule: Each distinct cookie type in the order calculates its packaging fee based on its quantity,
 * then sums up to the total order packaging fee.
 */

export const DEFAULT_PACKING_FEE_CONFIG = {
  amount: 2000,
  default_fee: 2000,
  tiers: [
    { from: 1, to: 1, fee: 2000 },
    { from: 2, to: 3, fee: 4000 },
    { from: 4, to: 6, fee: 6000 },
    { from: 7, to: null, fee: 8000 },
  ],
};

/**
 * Calculate packaging fee for a single product/item given its quantity
 * @param {number} quantity - Quantity of this cookie item
 * @param {object} config - Configuration object with { default_fee, tiers }
 * @returns {number} Packaging fee in VND
 */
export function calculateItemPackingFee(quantity, config = {}) {
  const qty = Number(quantity);
  if (!qty || qty <= 0) return 0;

  const defaultFee = Number(config.default_fee ?? config.amount ?? 2000);
  const tiers = Array.isArray(config.tiers) ? config.tiers : [];

  if (tiers.length === 0) {
    return defaultFee;
  }

  // Find exact or range match
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

  return defaultFee;
}

/**
 * Calculate total packaging fee for an order with multiple items
 * @param {Array<{ quantity: number }>} items - Array of order items
 * @param {object} config - Packing fee config
 * @returns {number} Total packaging fee in VND
 */
export function calculateOrderPackingFee(items = [], config = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => {
    return sum + calculateItemPackingFee(item.quantity, config);
  }, 0);
}
