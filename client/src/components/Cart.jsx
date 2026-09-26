import React from 'react';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { calculateItemPackingFee } from '../utils/packingFee';

export default function Cart({
  cartItems = {},
  packingFee = 2000,
  packingFeeConfig = {},
  onUpdateQuantity,
  onRemoveItem,
}) {
  const itemsList = Object.values(cartItems);
  const isEmpty = itemsList.length === 0;

  const subtotal = itemsList.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = isEmpty ? 0 : subtotal + packingFee;

  return (
    <div className="cart-card">
      <h3 className="cart-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={22} />
          GIỎ HÀNG
        </span>
        {!isEmpty && (
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            ({itemsList.reduce((cnt, it) => cnt + it.quantity, 0)} cái)
          </span>
        )}
      </h3>

      {isEmpty ? (
        <div className="cart-empty">
          <span style={{ fontSize: '2.5rem' }}>🍪</span>
          <p>Giỏ hàng đang trống. Hãy chọn bánh từ menu phía trên.</p>
        </div>
      ) : (
        <>
          <div className="cart-items-list">
            {itemsList.map(({ product, quantity }) => {
              const lineTotal = product.price * quantity;
              const itemPackingFee = calculateItemPackingFee(quantity, packingFeeConfig);
              return (
                <div key={product.id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{product.name}</div>
                    <div className="cart-item-formula" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span>{formatMoney(product.price)} × {quantity}</span>
                      <span
                        style={{
                          fontSize: '0.76rem',
                          color: 'var(--color-primary)',
                          background: 'var(--color-primary-light)',
                          padding: '1px 6px',
                          borderRadius: 'var(--pill-radius)',
                          fontWeight: 600,
                        }}
                        title={`Phí gói cho ${quantity} cái ${product.name}`}
                      >
                        Gói: {formatMoney(itemPackingFee)}
                      </span>
                    </div>
                  </div>

                  <div className="stepper" style={{ transform: 'scale(0.9)' }}>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      title="Giảm số lượng"
                      aria-label="Giảm số lượng"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="stepper-qty">{quantity}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= 50}
                      title="Tăng số lượng"
                      aria-label="Tăng số lượng"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="cart-item-total">{formatMoney(lineTotal)}</div>

                  <button
                    type="button"
                    className="btn-remove-item"
                    onClick={() => onRemoveItem(product.id)}
                    title="Xóa món này"
                    aria-label="Xóa món này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Tiền bánh</span>
              <span style={{ fontWeight: 600 }}>{formatMoney(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Phí gói bánh</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                  ({itemsList.length} loại)
                </span>
              </span>
              <span style={{ fontWeight: 600 }}>{formatMoney(packingFee)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Tổng tiền bánh</span>
              <span className="total-amount">{formatMoney(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

