import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

export default function OrderReviewModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  cartItems = {},
  packingFee = 2000,
  isSubmitting = false,
  submitError = null,
}) {
  if (!isOpen) return null;

  const itemsList = Object.values(cartItems);
  const subtotal = itemsList.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const total = subtotal + packingFee;

  // Format date display
  let formattedPickupDate = formData.pickup_date;
  if (formData.pickup_date) {
    const [y, m, d] = formData.pickup_date.split('-');
    formattedPickupDate = `${d}/${m}/${y}`;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">XÁC NHẬN THÔNG TIN ĐƠN</h3>
          <button
            type="button"
            className="btn-remove-item"
            onClick={onClose}
            title="Đóng"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {submitError && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: '14px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Customer Information Review */}
        <div className="modal-info-block">
          <div className="info-row">
            <span className="info-label">Khách hàng:</span>
            <span className="info-value">{formData.customer_name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Số điện thoại:</span>
            <span className="info-value">{formData.phone}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Username MXH:</span>
            <span className="info-value">{formData.social_username}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Kênh đặt hàng:</span>
            <span className="info-value">
              {formData.order_channel === 'Khác'
                ? `Khác (${formData.custom_channel_name || 'N/A'})`
                : formData.order_channel}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Địa chỉ nhận bánh:</span>
            <span className="info-value">{formData.delivery_address}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Ngày nhận bánh:</span>
            <span className="info-value" style={{ color: 'var(--color-primary)' }}>
              {formattedPickupDate}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Thanh toán phí ship:</span>
            <span className="info-value">{formData.ship_payment_method}</span>
          </div>
          {formData.note && (
            <div className="info-row">
              <span className="info-label">Ghi chú:</span>
              <span className="info-value" style={{ fontStyle: 'italic' }}>
                {formData.note}
              </span>
            </div>
          )}
        </div>

        {/* Items Table */}
        <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Danh sách bánh đặt</h4>
        <table className="modal-items-table">
          <thead>
            <tr>
              <th>Bánh</th>
              <th style={{ textAlign: 'center' }}>SL</th>
              <th style={{ textAlign: 'right' }}>Đơn giá</th>
              <th style={{ textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {itemsList.map(({ product, quantity }) => (
              <tr key={product.id}>
                <td><strong>{product.name}</strong></td>
                <td style={{ textAlign: 'center' }}>{quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatMoney(product.price)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatMoney(product.price * quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Price Breakdown */}
        <div style={{ marginTop: '12px', borderTop: '1px dashed var(--card-border)', paddingTop: '10px' }}>
          <div className="info-row">
            <span className="info-label">Tiền bánh:</span>
            <span className="info-value">{formatMoney(subtotal)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phí gói hàng:</span>
            <span className="info-value">{formatMoney(packingFee)}</span>
          </div>
          <div className="info-row" style={{ fontSize: '1.15rem', color: 'var(--color-accent-terracotta)', fontWeight: 700 }}>
            <span>Tổng thanh toán:</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            SỬA LẠI
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'ĐANG XỬ LÝ...'
            ) : (
              <>
                <CheckCircle size={18} />
                XÁC NHẬN ĐẶT BÁNH
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
