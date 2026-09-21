import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import CategorySection from '../components/CategorySection';
import Cart from '../components/Cart';
import OrderForm from '../components/OrderForm';
import OrderReviewModal from '../components/OrderReviewModal';
import OrderSuccessModal from '../components/OrderSuccessModal';
import { formatMoney } from '../utils/formatters';

const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [packingFee, setPackingFee] = useState(2000);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cart state: { [productId]: { product, quantity } }
  const [cart, setCart] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    social_username: '',
    order_channel: '',
    custom_channel_name: '',
    delivery_address: '',
    pickup_date: '',
    ship_payment_method: 'Chuyển khoản tiền ship cho Cúc-Ki',
    note: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Modals state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdOrderCode, setCreatedOrderCode] = useState(null);

  // Fetch menu and availability on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [menuRes, availRes] = await Promise.all([
          api.getMenu(),
          api.getPickupAvailability(),
        ]);
        setCategories(menuRes.data.categories || []);
        setPackingFee(menuRes.data.packingFee ?? 2000);
        setAvailability(availRes.data || []);
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
        setError('Không thể tải thực đơn tiệm bánh. Vui lòng thử tải lại trang.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Cart actions
  const handleAddToCart = (product) => {
    setCart((prev) => ({
      ...prev,
      [product.id]: {
        product,
        quantity: 1,
      },
    }));
  };

  const handleUpdateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCart((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: Math.min(newQty, 50),
        },
      };
    });
  };

  const handleRemoveItem = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Form actions
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Client-side validation before opening review modal
  const validateForm = () => {
    const errs = {};
    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      errs.customer_name = 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự)';
    }

    if (!formData.phone.trim() || !VN_PHONE_REGEX.test(formData.phone.trim())) {
      errs.phone = 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
    }

    if (!formData.social_username.trim()) {
      errs.social_username = 'Vui lòng nhập username mạng xã hội đã đặt';
    }

    if (!formData.order_channel) {
      errs.order_channel = 'Vui lòng chọn kênh đặt hàng';
    } else if (formData.order_channel === 'Khác' && !formData.custom_channel_name?.trim()) {
      errs.custom_channel_name = 'Vui lòng điền link hoặc tên kênh bạn đã đặt';
    }

    if (!formData.delivery_address.trim() || formData.delivery_address.trim().length < 5) {
      errs.delivery_address = 'Địa chỉ nhận bánh cần chi tiết hơn (tối thiểu 5 ký tự)';
    }

    if (!formData.pickup_date) {
      errs.pickup_date = 'Vui lòng chọn ngày nhận bánh';
    }

    if (!formData.ship_payment_method) {
      errs.ship_payment_method = 'Vui lòng chọn phương thức thanh toán ship';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOpenReview = (e) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) {
      alert('Giỏ hàng đang trống. Bạn hãy chọn bánh từ menu phía trên nhé!');
      return;
    }
    if (validateForm()) {
      setSubmitError(null);
      setIsReviewOpen(true);
    }
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const orderPayload = {
        customer_name: formData.customer_name.trim(),
        phone: formData.phone.trim(),
        social_username: formData.social_username.trim(),
        order_channel: formData.order_channel,
        custom_channel_name:
          formData.order_channel === 'Khác'
            ? formData.custom_channel_name.trim()
            : undefined,
        delivery_address: formData.delivery_address.trim(),
        pickup_date: formData.pickup_date,
        ship_payment_method: formData.ship_payment_method,
        note: formData.note?.trim() || undefined,
        items: Object.values(cart).map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const result = await api.createOrder(orderPayload);
      setIsReviewOpen(false);
      setCreatedOrderCode(result.data.code);

      // Refresh pickup availability so slot counts update
      const availRes = await api.getPickupAvailability();
      setAvailability(availRes.data || []);
    } catch (err) {
      console.error('Lỗi đặt bánh:', err);
      setSubmitError(
        err.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCart({});
    setFormData({
      customer_name: '',
      phone: '',
      social_username: '',
      order_channel: '',
      custom_channel_name: '',
      delivery_address: '',
      pickup_date: '',
      ship_payment_method: 'Chuyển khoản tiền ship cho Cúc-Ki',
      note: '',
    });
    setCreatedOrderCode(null);
  };

  // Mobile calculations
  const totalCartItemsCount = Object.values(cart).reduce(
    (cnt, it) => cnt + it.quantity,
    0
  );
  const cartSubtotal = Object.values(cart).reduce(
    (sum, it) => sum + it.product.price * it.quantity,
    0
  );
  const cartTotal = totalCartItemsCount > 0 ? cartSubtotal + packingFee : 0;

  const scrollToOrderSection = () => {
    const el = document.getElementById('dat-banh-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <span style={{ fontSize: '3rem', display: 'inline-block', animation: 'bounce 1s infinite' }}>🍪</span>
        <h2 style={{ marginTop: '16px', color: 'var(--color-primary)' }}>
          Đang nướng bánh thơm phức...
        </h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Vui lòng chờ Cúc-Ki chuẩn bị thực đơn nhé!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem' }}>😢</div>
        <h2 style={{ marginTop: '16px', color: 'var(--color-danger)' }}>{error}</h2>
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: '20px' }}
          onClick={() => window.location.reload()}
        >
          Tải lại trang
        </button>
      </div>
    );
  }

  return (
    <main className="container" style={{ padding: '40px 20px' }}>
      {/* Intro hero banner */}
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          Tiệm Bánh Quy Handmade CÚC-KI BIẾT ĐI
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto' }}>
          Bánh quy tươi mới nướng mỗi ngày với nguyên liệu cao cấp, ít ngọt, chuẩn vị gia đình.
          Để đảm bảo chất lượng ngon nhất, Cúc-Ki chỉ nhận <strong>tối đa 4 đơn/ngày</strong>!
        </p>
      </div>

      {/* Menu Categories */}
      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          cartItems={cart}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
        />
      ))}

      {/* Section "Đơn bánh của bạn" */}
      <div className="order-section" id="dat-banh-section">
        <h2 className="order-section-title">ĐƠN BÁNH CỦA BẠN</h2>

        <div className="order-layout">
          {/* LEFT: THÔNG TIN KHÁCH HÀNG */}
          <div>
            <OrderForm
              formData={formData}
              errors={formErrors}
              availability={availability}
              onChange={handleFieldChange}
              onSubmit={handleOpenReview}
              isSubmitting={isSubmitting}
              hasItems={totalCartItemsCount > 0}
            />
          </div>

          {/* RIGHT: GIỎ HÀNG (Sticky) */}
          <div className="sticky-cart-wrapper">
            <Cart
              cartItems={cart}
              packingFee={packingFee}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      {totalCartItemsCount > 0 && (
        <aside className="mobile-bottom-bar" aria-label="Tóm tắt giỏ hàng di động">
          <div className="mobile-bottom-info">
            <span className="mobile-bottom-items">
              {totalCartItemsCount} cái bánh đã chọn
            </span>
            <span className="mobile-bottom-total">{formatMoney(cartTotal)}</span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={scrollToOrderSection}
            style={{ padding: '10px 20px', fontSize: '0.92rem' }}
          >
            ĐẶT BÁNH NGAY
          </button>
        </aside>
      )}

      {/* Review Modal */}
      <OrderReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirm={handleConfirmOrder}
        formData={formData}
        cartItems={cart}
        packingFee={packingFee}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />

      {/* Success Modal */}
      {createdOrderCode && (
        <OrderSuccessModal
          orderCode={createdOrderCode}
          onReset={handleReset}
        />
      )}
    </main>
  );
}
