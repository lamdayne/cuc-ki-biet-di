import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Search, Home } from 'lucide-react';

export default function OrderSuccessModal({
  orderCode,
  onReset,
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleGoToLookup = () => {
    onReset();
    navigate(`/tra-cuu?code=${encodeURIComponent(orderCode)}`);
  };

  const handleGoHome = () => {
    onReset();
    navigate('/');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog success-card">
        <div className="success-icon-wrapper">
          <Check size={38} strokeWidth={3} />
        </div>

        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
          ĐẶT BÁNH THÀNH CÔNG!
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          Cảm ơn bạn đã ủng hộ CÚC-KI BIẾT ĐI. Chúng mình sẽ chuẩn bị mẻ bánh thơm ngon nhất cho bạn!
        </p>

        <div>Mã đơn hàng của bạn:</div>
        <div className="order-code-display">
          <span>{orderCode}</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopy}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            title="Sao chép mã đơn"
          >
            {copied ? (
              <>
                <Check size={14} />
                Đã chép
              </>
            ) : (
              <>
                <Copy size={14} />
                Sao chép mã
              </>
            )}
          </button>
        </div>

        <div
          style={{
            background: 'var(--color-accent-soft)',
            padding: '12px 18px',
            borderRadius: '14px',
            color: 'var(--color-primary)',
            fontSize: '0.92rem',
            fontWeight: 500,
            marginBottom: '26px',
          }}
        >
          💡 Hãy lưu lại mã đơn để tra cứu trạng thái
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleGoToLookup}
          >
            <Search size={18} />
            TRA CỨU ĐƠN
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleGoHome}
          >
            <Home size={18} />
            VỀ TRANG CHỦ
          </button>
        </div>
      </div>
    </div>
  );
}
