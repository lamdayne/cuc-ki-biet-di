import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import { formatMoney, ORDER_STATUS_MAP } from '../utils/formatters';

export default function OrderLookupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = async (orderCode) => {
    if (!orderCode || !orderCode.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await api.lookupOrder(orderCode);
      setOrder(res.data);
    } catch (err) {
      console.error('Lookup error:', err);
      if (err.status === 404 || err.message?.includes('Không tìm thấy')) {
        setError('Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn.');
      } else {
        setError(err.message || 'Có lỗi xảy ra khi tra cứu. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) {
      setCode(initialCode);
      fetchOrder(initialCode);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSearchParams({ code: code.trim().toUpperCase() });
    fetchOrder(code.trim());
  };

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '780px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>
          Tra Cứu Đơn Bánh
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Nhập mã đơn hàng bạn đã nhận khi đặt bánh (Ví dụ: CK-210926-AB23)
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Nhập mã đơn CK-DDMMYY-XXXX..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.5px' }}
            required
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '12px 28px', whiteSpace: 'nowrap' }}
            disabled={loading}
          >
            {loading ? (
              'Đang tìm...'
            ) : (
              <>
                <Search size={18} />
                Tra cứu
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1.5px solid #FFCDD2',
            borderRadius: '16px',
            padding: '16px 20px',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '30px',
          }}
        >
          <AlertCircle size={22} />
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Order Details Display */}
      {order && (
        <div className="form-card" style={{ marginTop: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1.5px solid var(--card-border)',
              paddingBottom: '16px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                Mã đơn hàng:
              </span>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--color-primary)' }}>
                {order.code}
              </h2>
            </div>
            <div>
              {(() => {
                const statusMeta = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending;
                return (
                  <span
                    style={{
                      background: statusMeta.badgeBg,
                      color: statusMeta.badgeText,
                      border: `1.5px solid ${statusMeta.borderColor}`,
                      padding: '8px 18px',
                      borderRadius: 'var(--pill-radius)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    {statusMeta.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Timeline */}
          <StatusTimeline status={order.status} />

          {/* Order Details Info */}
          <div className="modal-info-block" style={{ marginTop: '28px' }}>
            <div className="info-row">
              <span className="info-label">Khách hàng:</span>
              <span className="info-value">{order.customer_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Số điện thoại (đã ẩn):</span>
              <span className="info-value">{order.phone}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Username MXH:</span>
              <span className="info-value">{order.social_username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Kênh đặt hàng:</span>
              <span className="info-value">
                {order.order_channel === 'Khác'
                  ? `Khác (${order.custom_channel_name || 'N/A'})`
                  : order.order_channel}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Địa chỉ nhận:</span>
              <span className="info-value">{order.delivery_address}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Ngày nhận bánh:</span>
              <span className="info-value" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                {(() => {
                  const [y, m, d] = order.pickup_date.split('-');
                  return `${d}/${m}/${y}`;
                })()}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Thanh toán phí ship:</span>
              <span className="info-value">{order.ship_payment_method}</span>
            </div>
            {order.note && (
              <div className="info-row">
                <span className="info-label">Ghi chú:</span>
                <span className="info-value" style={{ fontStyle: 'italic' }}>
                  {order.note}
                </span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <h3 style={{ fontSize: '1.2rem', margin: '22px 0 10px 0' }}>Bánh đã đặt</h3>
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
              {(order.items || []).map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.product_name}</strong></td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(item.unit_price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatMoney(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Price Summary */}
          <div style={{ marginTop: '16px', borderTop: '1.5px dashed var(--card-border)', paddingTop: '12px' }}>
            <div className="info-row">
              <span className="info-label">Tiền bánh:</span>
              <span className="info-value">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phí gói hàng:</span>
              <span className="info-value">{formatMoney(order.packing_fee)}</span>
            </div>
            <div
              className="info-row"
              style={{
                fontSize: '1.25rem',
                color: 'var(--color-accent-terracotta)',
                fontWeight: 700,
                borderTop: '1px solid var(--card-border)',
                paddingTop: '10px',
                marginTop: '6px',
              }}
            >
              <span>Tổng tiền bánh:</span>
              <span>{formatMoney(order.total_price)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
