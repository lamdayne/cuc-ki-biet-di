import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Layers,
  Cookie,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { formatMoney, ORDER_STATUS_MAP } from '../utils/formatters';
import Pagination from '../components/Pagination';
import ImageCropModal from '../components/ImageCropModal';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'categories' | 'products'
  const [loading, setLoading] = useState(true);

  // Data states
  const [orders, setOrders] = useState([]);
  const [dayCounts, setDayCounts] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Pagination states
  const [orderPage, setOrderPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(5);

  const [prodPage, setProdPage] = useState(1);
  const [prodsPerPage, setProdsPerPage] = useState(10);

  const [catPage, setCatPage] = useState(1);
  const [catsPerPage, setCatsPerPage] = useState(10);

  // Filters
  const [orderDateFilter, setOrderDateFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');

  // Modals & Form states
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    display_order: 0,
    is_active: true,
    image_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFileForCrop, setSelectedFileForCrop] = useState(null);

  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    category_id: '',
    price: 15000,
    is_available: true,
    display_order: 0,
  });

  const [notification, setNotification] = useState(null);

  const showNotify = (text, isError = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  // Auth check & initial data load
  useEffect(() => {
    async function init() {
      try {
        await api.checkAdminAuth();
        await loadAllData();
      } catch (err) {
        navigate('/quan-ly/pin', { replace: true });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [navigate]);

  const loadAllData = async () => {
    try {
      const [ordersRes, catsRes, prodsRes] = await Promise.allSettled([
        api.getAdminOrders({
          pickupDate: orderDateFilter,
          status: orderStatusFilter,
        }),
        api.getAdminCategories(),
        api.getAdminProducts(),
      ]);

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data.orders || []);
        setDayCounts(ordersRes.value.data.dayCounts || {});
      } else {
        console.error('Lỗi tải đơn hàng:', ordersRes.reason);
        showNotify(`Lỗi tải đơn hàng: ${ordersRes.reason?.message || 'Không thể lấy danh sách đơn'}`, true);
      }

      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value.data || []);
      }

      if (prodsRes.status === 'fulfilled') {
        setProducts(prodsRes.value.data || []);
      }
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } finally {
      navigate('/quan-ly/pin', { replace: true });
    }
  };

  // Orders Tab handlers
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      showNotify('Đã cập nhật trạng thái đơn hàng');
      const ordersRes = await api.getAdminOrders({
        pickupDate: orderDateFilter,
        status: orderStatusFilter,
      });
      setOrders(ordersRes.data.orders || []);
      setDayCounts(ordersRes.data.dayCounts || {});
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  const handleFilterOrders = async (e) => {
    e?.preventDefault();
    setOrderPage(1);
    try {
      const res = await api.getAdminOrders({
        pickupDate: orderDateFilter,
        status: orderStatusFilter,
      });
      setOrders(res.data.orders || []);
      setDayCounts(res.data.dayCounts || {});
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  // Categories Tab handlers
  const openAddCategory = () => {
    setEditingCategory(null);
    setCatForm({
      name: '',
      slug: '',
      display_order: categories.length + 1,
      is_active: true,
      image_url: '',
    });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      slug: cat.slug,
      display_order: cat.display_order,
      is_active: cat.is_active,
      image_url: cat.image_url || '',
    });
    setCatModalOpen(true);
  };

  const handleSelectImageToCrop = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileForCrop(file);
    setCropModalOpen(true);
    e.target.value = '';
  };

  const handleConfirmCroppedImage = async (croppedFile) => {
    setCropModalOpen(false);
    setUploadingImage(true);
    try {
      const res = await api.uploadCategoryImage(croppedFile);
      const newImageUrl = res.data.imageUrl;
      setCatForm((prev) => ({ ...prev, image_url: newImageUrl }));

      // Nếu đang chỉnh sửa danh mục hiện có: Tự động lưu ngay vào cơ sở dữ liệu
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          ...catForm,
          image_url: newImageUrl,
        });
        await loadData();
        showNotify('Đã cắt và LƯU ảnh banner danh mục thành công!');
      } else {
        showNotify('Đã cắt và tải ảnh lên. Hãy bấm "Lưu danh mục" để hoàn tất.');
      }
    } catch (err) {
      showNotify(err.message || 'Lỗi khi tải ảnh', true);
    } finally {
      setUploadingImage(false);
      setSelectedFileForCrop(null);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: catForm.name.trim(),
        slug: catForm.slug?.trim() ? catForm.slug.trim() : undefined,
        display_order: Number(catForm.display_order) || 0,
        is_active: Boolean(catForm.is_active),
        image_url: catForm.image_url?.trim() ? catForm.image_url.trim() : null,
      };

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, payload);
        showNotify('Đã cập nhật danh mục');
      } else {
        await api.createCategory(payload);
        showNotify('Đã thêm danh mục mới');
      }
      setCatModalOpen(false);
      const res = await api.getAdminCategories();
      setCategories(res.data || []);
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (cat.product_count > 0) {
      alert(
        `Không thể xóa danh mục "${cat.name}" vì vẫn còn ${cat.product_count} sản phẩm bên trong. Vui lòng chuyển hoặc xóa các sản phẩm này trước!`
      );
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa loại cookie "${cat.name}"?`)) {
      return;
    }
    try {
      await api.deleteCategory(cat.id);
      showNotify('Đã xóa loại cookie');
      const res = await api.getAdminCategories();
      setCategories(res.data || []);
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  // Products Tab handlers
  const openAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      category_id: categories[0]?.id || '',
      price: 15000,
      is_available: true,
      display_order: products.length + 1,
    });
    setProdModalOpen(true);
  };

  const openEditProduct = (prod) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name,
      category_id: prod.category_id,
      price: prod.price,
      is_available: prod.is_available,
      display_order: prod.display_order,
    });
    setProdModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...prodForm,
        price: Number(prodForm.price),
        display_order: Number(prodForm.display_order),
      };
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showNotify('Đã cập nhật sản phẩm');
      } else {
        await api.createProduct(payload);
        showNotify('Đã thêm sản phẩm mới');
      }
      setProdModalOpen(false);
      const res = await api.getAdminProducts();
      setProducts(res.data || []);
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (window.confirm('Bạn có chắc muốn xóa mục này?')) {
      try {
        await api.deleteProduct(prodId);
        showNotify('Đã xóa sản phẩm');
        const res = await api.getAdminProducts();
        setProducts(res.data || []);
      } catch (err) {
        showNotify(err.message, true);
      }
    }
  };

  const handleToggleProductAvailable = async (prod) => {
    try {
      await api.updateProduct(prod.id, { is_available: !prod.is_available });
      const res = await api.getAdminProducts();
      setProducts(res.data || []);
      showNotify(`Đã chuyển bánh thành "${!prod.is_available ? 'Còn bánh' : 'Tạm hết'}"`);
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  // Pagination calculations
  const totalOrders = orders.length;
  const totalOrderPages = Math.max(1, Math.ceil(totalOrders / ordersPerPage));
  const paginatedOrders = orders.slice(
    (orderPage - 1) * ordersPerPage,
    orderPage * ordersPerPage
  );

  const filteredProducts = products.filter((p) =>
    productCategoryFilter ? p.category_id === productCategoryFilter : true
  );
  const totalProducts = filteredProducts.length;
  const totalProdPages = Math.max(1, Math.ceil(totalProducts / prodsPerPage));
  const paginatedProducts = filteredProducts.slice(
    (prodPage - 1) * prodsPerPage,
    prodPage * prodsPerPage
  );

  const totalCategories = categories.length;
  const totalCatPages = Math.max(1, Math.ceil(totalCategories / catsPerPage));
  const paginatedCategories = categories.slice(
    (catPage - 1) * catsPerPage,
    catPage * catsPerPage
  );

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Đang tải bảng quản trị...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '36px 20px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>
            Quản Lý Tiệm Bánh CÚC-KI
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem' }}>
            Hệ thống quản trị đơn hàng, danh mục và sản phẩm
          </p>
        </div>
      </div>

      {/* Notifications banner */}
      {notification && (
        <div
          style={{
            padding: '12px 20px',
            borderRadius: '14px',
            marginBottom: '20px',
            backgroundColor: notification.isError
              ? 'var(--color-danger-bg)'
              : 'var(--color-success-bg)',
            color: notification.isError ? 'var(--color-danger)' : 'var(--color-success)',
            border: `1px solid ${notification.isError ? '#FFCDD2' : '#C8E6C9'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 500,
          }}
        >
          {notification.isError ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Đơn hàng ({orders.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Loại cookie ({categories.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Cookie size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Sản phẩm ({products.length})
        </button>

        <button
          type="button"
          className="tab-btn tab-btn-logout"
          onClick={handleLogout}
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Đăng xuất
        </button>
      </div>

      {/* TAB 1: ĐƠN HÀNG */}
      {activeTab === 'orders' && (
        <div>
          {/* Filter Bar */}
          <div
            className="form-card"
            style={{ padding: '20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}
          >
            <div style={{ flex: '1', minWidth: '180px' }}>
              <label className="form-label">Lọc theo ngày nhận bánh:</label>
              <input
                type="date"
                className="form-input"
                value={orderDateFilter}
                onChange={(e) => setOrderDateFilter(e.target.value)}
              />
            </div>

            <div style={{ flex: '1', minWidth: '180px' }}>
              <label className="form-label">Lọc theo trạng thái:</label>
              <select
                className="form-select"
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
              >
                <option value="">-- Tất cả trạng thái --</option>
                {Object.entries(ORDER_STATUS_MAP).map(([stKey, stVal]) => (
                  <option key={stKey} value={stKey}>
                    {stVal.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleFilterOrders}
              style={{ padding: '10px 22px' }}
            >
              Áp dụng lọc
            </button>

            {(orderDateFilter || orderStatusFilter) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setOrderDateFilter('');
                  setOrderStatusFilter('');
                  setOrderPage(1);
                  api.getAdminOrders().then((res) => {
                    setOrders(res.data.orders || []);
                    setDayCounts(res.data.dayCounts || {});
                  });
                }}
                style={{ padding: '10px 18px' }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="form-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <span style={{ fontSize: '2.5rem' }}>📦</span>
              <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>
                Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {paginatedOrders.map((ord) => {
                const countForDay = dayCounts[ord.pickup_date] ?? 0;
                const isDayFull = countForDay >= 4;
                const statusMeta = ORDER_STATUS_MAP[ord.status] || ORDER_STATUS_MAP.pending;
                const [y, m, d] = ord.pickup_date.split('-');
                const displayPickupDate = `${d}/${m}/${y}`;

                return (
                  <div key={ord.id} className="form-card" style={{ padding: '24px' }}>
                    {/* Header line - Đảm bảo nằm ngang 1 dòng */}
                    <div className="admin-order-header">
                      <div className="admin-order-title-group">
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: 'var(--color-primary)',
                          }}
                        >
                          {ord.code}
                        </span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                          Đặt lúc: {new Date(ord.created_at).toLocaleString('vi-VN')}
                        </div>
                      </div>

                      {/* Actions and Slot badge container */}
                      <div className="admin-order-actions-group">
                        <div
                          className={`order-day-badge ${isDayFull ? 'day-full' : ''}`}
                          title="Ngày nhận bánh và số lượng đơn trong ngày"
                        >
                          <Calendar size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <span className="order-day-label">
                            Nhận: <strong>{displayPickupDate}</strong>
                          </span>
                          <span className={`order-day-pill ${isDayFull ? 'pill-full' : 'pill-available'}`}>
                            {countForDay}/4 đơn
                          </span>
                        </div>

                        {/* Status update select */}
                        <select
                          className="form-select status-select-pill"
                          value={ord.status}
                          onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                          style={{
                            padding: '7px 16px',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            background: statusMeta.badgeBg,
                            color: statusMeta.badgeText,
                            borderColor: statusMeta.borderColor,
                            cursor: 'pointer',
                            borderRadius: 'var(--pill-radius)',
                            boxShadow: '0 2px 6px rgba(74, 44, 26, 0.05)',
                          }}
                        >
                          {Object.entries(ORDER_STATUS_MAP).map(([stKey, stVal]) => (
                            <option key={stKey} value={stKey}>
                              {stVal.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Customer details grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                        background: '#FFFFFF',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid var(--card-border)',
                        marginBottom: '16px',
                        fontSize: '0.92rem',
                      }}
                    >
                      <div>
                        <strong>Khách hàng:</strong> {ord.customer_name}
                      </div>
                      <div>
                        <strong>SĐT:</strong> {ord.phone}
                      </div>
                      <div>
                        <strong>Username MXH:</strong> {ord.social_username}
                      </div>
                      <div>
                        <strong>Kênh đặt:</strong>{' '}
                        {ord.order_channel === 'Khác'
                          ? `Khác (${ord.custom_channel_name || ''})`
                          : ord.order_channel}
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <strong>Địa chỉ:</strong> {ord.delivery_address}
                      </div>
                      <div>
                        <strong>Thanh toán ship:</strong> {ord.ship_payment_method}
                      </div>
                      {ord.note && (
                        <div style={{ gridColumn: '1 / -1', fontStyle: 'italic', color: 'var(--color-primary)' }}>
                          <strong>Ghi chú:</strong> {ord.note}
                        </div>
                      )}
                    </div>

                    {/* Order items snapshot table */}
                    <table className="modal-items-table" style={{ margin: '0 0 14px 0' }}>
                      <thead>
                        <tr>
                          <th>Bánh (snapshot lúc đặt)</th>
                          <th style={{ textAlign: 'center' }}>SL</th>
                          <th style={{ textAlign: 'right' }}>Đơn giá</th>
                          <th style={{ textAlign: 'right' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ord.order_items || []).map((it) => (
                          <tr key={it.id}>
                            <td>{it.product_name}</td>
                            <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatMoney(it.unit_price)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {formatMoney(it.line_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '24px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        borderTop: '1px dashed var(--card-border)',
                        paddingTop: '10px',
                      }}
                    >
                      <span>Tiền bánh: {formatMoney(ord.subtotal)}</span>
                      <span>Phí gói: {formatMoney(ord.packing_fee)}</span>
                      <span style={{ color: 'var(--color-accent-terracotta)', fontSize: '1.1rem' }}>
                        Tổng cộng: {formatMoney(ord.total_price)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {orders.length > 0 && (
                <Pagination
                  currentPage={orderPage}
                  totalPages={totalOrderPages}
                  onPageChange={setOrderPage}
                  totalItems={totalOrders}
                  pageSize={ordersPerPage}
                  onPageSizeChange={(newSize) => {
                    setOrdersPerPage(newSize);
                    setOrderPage(1);
                  }}
                  itemName="đơn hàng"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOẠI COOKIE */}
      {activeTab === 'categories' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h2 style={{ fontSize: '1.4rem' }}>Danh Mục Loại Cookie</h2>
            <button type="button" className="btn-primary" onClick={openAddCategory}>
              <Plus size={18} />
              Thêm loại cookie
            </button>
          </div>

          <div className="form-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="modal-items-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'var(--color-primary-light)' }}>
                  <th>Banner</th>
                  <th>Tên danh mục</th>
                  <th>Slug</th>
                  <th style={{ textAlign: 'center' }}>Thứ tự</th>
                  <th style={{ textAlign: 'center' }}>Số sản phẩm</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ width: '90px' }}>
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          style={{ width: '70px', height: '40px', objectFit: 'cover', borderRadius: '8px' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '70px',
                            height: '40px',
                            background: '#EEE',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            color: '#888',
                          }}
                        >
                          Chưa có
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{cat.name}</strong>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{cat.slug}</td>
                    <td style={{ textAlign: 'center' }}>{cat.display_order}</td>
                    <td style={{ textAlign: 'center' }}>{cat.product_count} bánh</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--pill-radius)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: cat.is_active ? 'var(--color-success-bg)' : '#EEE',
                          color: cat.is_active ? 'var(--color-success)' : '#777',
                        }}
                      >
                        {cat.is_active ? 'Hiển thị' : 'Đang ẩn'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => openEditCategory(cat)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={14} /> Sửa
                        </button>
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => handleDeleteCategory(cat)}
                          title="Xóa danh mục"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {categories.length > 0 && (
            <Pagination
              currentPage={catPage}
              totalPages={totalCatPages}
              onPageChange={setCatPage}
              totalItems={totalCategories}
              pageSize={catsPerPage}
              onPageSizeChange={(newSize) => {
                setCatsPerPage(newSize);
                setCatPage(1);
              }}
              itemName="loại cookie"
            />
          )}
        </div>
      )}

      {/* TAB 3: SẢN PHẨM */}
      {activeTab === 'products' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '1.4rem' }}>Danh Sách Bánh Quy</h2>
              {/* Filter by Category */}
              <select
                className="form-select"
                value={productCategoryFilter}
                onChange={(e) => {
                  setProductCategoryFilter(e.target.value);
                  setProdPage(1);
                }}
                style={{ padding: '8px 16px', minWidth: '180px' }}
              >
                <option value="">-- Tất cả loại cookie --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" className="btn-primary" onClick={openAddProduct}>
              <Plus size={18} />
              Thêm bánh mới
            </button>
          </div>

          <div className="form-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="modal-items-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'var(--color-primary-light)' }}>
                  <th>Tên bánh</th>
                  <th>Loại cookie</th>
                  <th style={{ textAlign: 'right' }}>Giá bán</th>
                  <th style={{ textAlign: 'center' }}>Thứ tự</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái bán</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((prod) => (
                    <tr key={prod.id}>
                      <td>
                        <strong>{prod.name}</strong>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {prod.categories?.name || 'Chưa phân loại'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent-terracotta)' }}>
                        {formatMoney(prod.price)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{prod.display_order}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleProductAvailable(prod)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 'var(--pill-radius)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            background: prod.is_available ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                            color: prod.is_available ? 'var(--color-success)' : 'var(--color-danger)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          title="Bấm để bật/tắt khả dụng"
                        >
                          {prod.is_available ? 'Đang bán' : 'Tạm hết'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            onClick={() => openEditProduct(prod)}
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={14} /> Sửa
                          </button>
                          <button
                            type="button"
                            className="btn-remove-item"
                            onClick={() => handleDeleteProduct(prod.id)}
                            title="Xóa bánh"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {totalProducts > 0 && (
            <Pagination
              currentPage={prodPage}
              totalPages={totalProdPages}
              onPageChange={setProdPage}
              totalItems={totalProducts}
              pageSize={prodsPerPage}
              onPageSizeChange={(newSize) => {
                setProdsPerPage(newSize);
                setProdPage(1);
              }}
              itemName="bánh"
            />
          )}
        </div>
      )}

      {/* Modal Add/Edit Category */}
      {catModalOpen && (
        <div className="modal-backdrop" onClick={() => setCatModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ marginBottom: '20px' }}>
              {editingCategory ? 'Chỉnh Sửa Loại Cookie' : 'Thêm Loại Cookie Mới'}
            </h3>

            <form onSubmit={handleSaveCategory}>
              <div className="form-group">
                <label className="form-label">Tên loại cookie *</label>
                <input
                  type="text"
                  className="form-input"
                  value={catForm.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!editingCategory) {
                      const autoSlug = val
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                      setCatForm({ ...catForm, name: val, slug: autoSlug });
                    } else {
                      setCatForm({ ...catForm, name: val });
                    }
                  }}
                  placeholder="Ví dụ: CÚC KI CHOCOCHIP"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug (đường dẫn rút gọn)</label>
                <input
                  type="text"
                  className="form-input"
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                  placeholder="để trống để tự động tạo"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thứ tự hiển thị</label>
                <input
                  type="number"
                  className="form-input"
                  value={catForm.display_order}
                  onChange={(e) =>
                    setCatForm({ ...catForm, display_order: Number(e.target.value) })
                  }
                />
              </div>

              {/* Banner image upload & preview */}
              <div className="form-group">
                <label className="form-label">Ảnh Banner danh mục</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <label
                    className="btn-secondary"
                    style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    <Upload size={16} />
                    {uploadingImage ? 'Đang tải lên...' : 'Chọn ảnh tải lên'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelectImageToCrop}
                      style={{ display: 'none' }}
                      disabled={uploadingImage}
                    />
                  </label>

                  {catForm.image_url && (
                    <button
                      type="button"
                      className="btn-remove-item"
                      onClick={() => setCatForm({ ...catForm, image_url: '' })}
                      title="Xóa ảnh"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {catForm.image_url && (
                  <div style={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '16 / 5', width: '100%', height: 'auto', border: '1.5px solid var(--card-border)' }}>
                    <img
                      src={catForm.image_url}
                      alt="Banner Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="radio-label checked" style={{ display: 'inline-flex' }}>
                  <input
                    type="checkbox"
                    checked={catForm.is_active}
                    onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                  />
                  <span>Hiển thị trên trang chủ cho khách đặt</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCatModalOpen(false)}
                >
                  HỦY
                </button>
                <button type="submit" className="btn-primary">
                  LƯU DANH MỤC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Product (Strictly NO image field) */}
      {prodModalOpen && (
        <div className="modal-backdrop" onClick={() => setProdModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title" style={{ marginBottom: '20px' }}>
              {editingProduct ? 'Chỉnh Sửa Bánh' : 'Thêm Bánh Mới'}
            </h3>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Tên bánh *</label>
                <input
                  type="text"
                  className="form-input"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="Ví dụ: Chocochip Cacao"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Loại cookie *</label>
                <select
                  className="form-select"
                  value={prodForm.category_id}
                  onChange={(e) => setProdForm({ ...prodForm, category_id: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    -- Chọn danh mục --
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Giá bán (VND) *</label>
                <input
                  type="number"
                  className="form-input"
                  step="1000"
                  min="0"
                  value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                  required
                />
                <div className="form-helper">Ví dụ: 14000 = {formatMoney(Number(prodForm.price) || 0)}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Thứ tự hiển thị</label>
                <input
                  type="number"
                  className="form-input"
                  value={prodForm.display_order}
                  onChange={(e) =>
                    setProdForm({ ...prodForm, display_order: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="radio-label checked" style={{ display: 'inline-flex' }}>
                  <input
                    type="checkbox"
                    checked={prodForm.is_available}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, is_available: e.target.checked })
                    }
                  />
                  <span>Bánh đang có sẵn để khách đặt</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setProdModalOpen(false)}
                >
                  HỦY
                </button>
                <button type="submit" className="btn-primary">
                  LƯU SẢN PHẨM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Crop & Resize Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageFile={selectedFileForCrop}
        categoryName={catForm.name || 'Tên Danh Mục'}
        isUploading={uploadingImage}
        onClose={() => {
          setCropModalOpen(false);
          setSelectedFileForCrop(null);
        }}
        onConfirm={handleConfirmCroppedImage}
      />
    </div>
  );
}
