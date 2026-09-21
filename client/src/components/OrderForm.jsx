import React from 'react';
import { User } from 'lucide-react';

const CHANNELS = ['Facebook', 'Instagram', 'Threads', 'Zalo', 'TikTok', 'Khác'];
const SHIP_METHODS = [
  'Chuyển khoản tiền ship cho Cúc-Ki',
  'Tự thanh toán phí ship',
];

export default function OrderForm({
  formData,
  errors = {},
  availability = [],
  onChange,
  onSubmit,
  isSubmitting = false,
  hasItems = false,
}) {
  // Group 31 pickup days by monthGroup (e.g. "Tháng 9/2026")
  const groupedDays = availability.reduce((acc, item) => {
    const group = item.monthGroup || 'Các ngày sắp tới';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <form className="form-card" onSubmit={onSubmit} noValidate>
      <h3 className="form-title">
        <User size={22} />
        THÔNG TIN KHÁCH HÀNG
      </h3>

      {/* 1. Họ và tên * */}
      <div className="form-group">
        <label className="form-label" htmlFor="customer_name">
          Họ và tên <span className="required-star">*</span>
        </label>
        <input
          id="customer_name"
          name="customer_name"
          type="text"
          className="form-input"
          placeholder="Ví dụ: Nguyễn Thị Mai"
          value={formData.customer_name}
          onChange={(e) => onChange('customer_name', e.target.value)}
          required
        />
        {errors.customer_name && (
          <div className="form-error">{errors.customer_name}</div>
        )}
      </div>

      {/* 2. Số điện thoại * */}
      <div className="form-group">
        <label className="form-label" htmlFor="phone">
          Số điện thoại <span className="required-star">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="form-input"
          placeholder="Ví dụ: 0901234567"
          value={formData.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          required
        />
        {errors.phone && <div className="form-error">{errors.phone}</div>}
      </div>

      {/* 3. Username tài khoản mạng xã hội đã đặt * */}
      <div className="form-group">
        <label className="form-label" htmlFor="social_username">
          Username tài khoản mạng xã hội đã đặt <span className="required-star">*</span>
        </label>
        <input
          id="social_username"
          name="social_username"
          type="text"
          className="form-input"
          placeholder="@abcxyz"
          value={formData.social_username}
          onChange={(e) => onChange('social_username', e.target.value)}
          required
        />
        {errors.social_username && (
          <div className="form-error">{errors.social_username}</div>
        )}
      </div>

      {/* 4. Kênh đặt hàng * */}
      <div className="form-group">
        <label className="form-label" htmlFor="order_channel">
          Kênh đặt hàng <span className="required-star">*</span>
        </label>
        <select
          id="order_channel"
          name="order_channel"
          className="form-select"
          value={formData.order_channel}
          onChange={(e) => onChange('order_channel', e.target.value)}
          required
        >
          <option value="" disabled>
            -- Chọn kênh bạn đã liên hệ --
          </option>
          {CHANNELS.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
        {errors.order_channel && (
          <div className="form-error">{errors.order_channel}</div>
        )}
      </div>

      {/* 4b. If "Khác" chosen, show required input for custom channel */}
      {formData.order_channel === 'Khác' && (
        <div className="form-group" style={{ paddingLeft: '12px', borderLeft: '3px solid var(--color-primary)' }}>
          <label className="form-label" htmlFor="custom_channel_name">
            Link hoặc tên kênh bạn đã đặt <span className="required-star">*</span>
          </label>
          <input
            id="custom_channel_name"
            name="custom_channel_name"
            type="text"
            className="form-input"
            placeholder="Ví dụ: Hotline, Bạn giới thiệu, Website khác..."
            value={formData.custom_channel_name || ''}
            onChange={(e) => onChange('custom_channel_name', e.target.value)}
            required
          />
          {errors.custom_channel_name && (
            <div className="form-error">{errors.custom_channel_name}</div>
          )}
        </div>
      )}

      {/* 5. Địa chỉ / điểm nhận bánh * */}
      <div className="form-group">
        <label className="form-label" htmlFor="delivery_address">
          Địa chỉ / điểm nhận bánh <span className="required-star">*</span>
        </label>
        <input
          id="delivery_address"
          name="delivery_address"
          type="text"
          className="form-input"
          placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
          value={formData.delivery_address}
          onChange={(e) => onChange('delivery_address', e.target.value)}
          required
        />
        {errors.delivery_address && (
          <div className="form-error">{errors.delivery_address}</div>
        )}
      </div>

      {/* 6. Chọn ngày nhận bánh * (REAL native select with optgroup per month) */}
      <div className="form-group">
        <label className="form-label" htmlFor="pickup_date">
          Chọn ngày nhận bánh <span className="required-star">*</span>
        </label>
        <select
          id="pickup_date"
          name="pickup_date"
          className="form-select"
          value={formData.pickup_date}
          onChange={(e) => onChange('pickup_date', e.target.value)}
          required
        >
          <option value="" disabled>
            -- Chọn ngày nhận bánh --
          </option>
          {Object.entries(groupedDays).map(([monthTitle, daysInMonth]) => (
            <optgroup key={monthTitle} label={monthTitle}>
              {daysInMonth.map((day) => (
                <option
                  key={day.dateStr}
                  value={day.dateStr}
                  disabled={day.isFull}
                >
                  {day.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="form-helper">CÚC-KI nhận tối đa 4 đơn cho mỗi ngày.</div>
        {errors.pickup_date && (
          <div className="form-error">{errors.pickup_date}</div>
        )}
      </div>

      {/* 7. Phương thức thanh toán phí ship (radio) */}
      <div className="form-group">
        <label className="form-label">
          Phương thức thanh toán phí ship <span className="required-star">*</span>
        </label>
        <div className="radio-group">
          {SHIP_METHODS.map((method) => {
            const isChecked = formData.ship_payment_method === method;
            return (
              <label
                key={method}
                className={`radio-label ${isChecked ? 'checked' : ''}`}
              >
                <input
                  type="radio"
                  name="ship_payment_method"
                  value={method}
                  checked={isChecked}
                  onChange={() => onChange('ship_payment_method', method)}
                />
                <span>{method}</span>
              </label>
            );
          })}
        </div>
        {errors.ship_payment_method && (
          <div className="form-error">{errors.ship_payment_method}</div>
        )}
      </div>

      {/* 8. Ghi chú cho đơn hàng */}
      <div className="form-group">
        <label className="form-label" htmlFor="note">
          Ghi chú cho đơn hàng
        </label>
        <textarea
          id="note"
          name="note"
          className="form-textarea"
          placeholder="Ví dụ: Giờ giao thuận tiện, đóng gói riêng từng bánh,..."
          value={formData.note || ''}
          onChange={(e) => onChange('note', e.target.value)}
        />
      </div>

      {/* 9. Button "XEM LẠI THÔNG TIN ĐƠN" */}
      <button
        type="submit"
        className="btn-primary"
        style={{ width: '100%', marginTop: '12px', padding: '14px 28px' }}
        disabled={isSubmitting || !hasItems}
        title={!hasItems ? 'Vui lòng chọn ít nhất 1 loại bánh' : 'Xem lại thông tin đơn'}
      >
        XEM LẠI THÔNG TIN ĐƠN
      </button>

      {!hasItems && (
        <div className="form-helper" style={{ textAlign: 'center', marginTop: '10px' }}>
          * Hãy bấm dấu (+) tại menu phía trên để chọn bánh vào giỏ nhé.
        </div>
      )}
    </form>
  );
}
