import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

export default function ProductCard({
  product,
  quantity = 0,
  onAdd,
  onUpdateQuantity,
}) {
  const isSelected = quantity > 0;

  return (
    <div className={`product-card ${isSelected ? 'has-selected' : ''}`}>
      <div className="product-card-info">
        <h3 className="product-name">{product.name}</h3>
        <span className="product-price">{formatMoney(product.price)}</span>
      </div>

      <div className="product-card-actions">
        {!isSelected ? (
          <button
            type="button"
            className="btn-plus-round"
            onClick={() => onAdd(product)}
            title={`Thêm ${product.name} vào giỏ`}
            aria-label={`Thêm ${product.name} vào giỏ`}
          >
            <Plus size={20} />
          </button>
        ) : (
          <div className="stepper">
            <button
              type="button"
              className="stepper-btn"
              onClick={() => onUpdateQuantity(product.id, quantity - 1)}
              title="Giảm số lượng"
              aria-label="Giảm số lượng"
            >
              <Minus size={16} />
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
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
