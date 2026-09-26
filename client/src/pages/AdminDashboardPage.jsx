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
  Sliders,
  Calculator,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { formatMoney, ORDER_STATUS_MAP } from '../utils/formatters';
import {
  DEFAULT_PACKING_FEE_CONFIG,
  calculateItemPackingFee,
} from '../utils/packingFee';
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

  // Packing Fee Config states
  const [packingFeeConfig, setPackingFeeConfig] = useState(DEFAULT_PACKING_FEE_CONFIG);
  const [savingPackingFee, setSavingPackingFee] = useState(false);
  const [simSelectedProduct1, setSimSelectedProduct1] = useState('');
  const [simSelectedProduct2, setSimSelectedProduct2] = useState('');
  const [simQty1, setSimQty1] = useState(5);
  const [simQty2, setSimQty2] = useState(20);

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
      const [ordersRes, catsRes, prodsRes, feeRes] = await Promise.allSettled([
        api.getAdminOrders({
          pickupDate: orderDateFilter,
          status: orderStatusFilter,
        }),
        api.getAdminCategories(),
        api.getAdminProducts(),
        api.getPackingFeeConfig(),
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

      if (feeRes.status === 'fulfilled' && feeRes.value.data) {
        setPackingFeeConfig(feeRes.value.data);
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

  // Packing fee tab handlers
  const handleSavePackingFee = async (e) => {
    e?.preventDefault();
    try {
      setSavingPackingFee(true);
      const cleanProductRules = (packingFeeConfig.product_rules || []).map((rule) => {
        const cleanTiers = (rule.tiers || []).map((t) => ({
          from: Math.max(1, parseInt(t.from, 10) || 1),
          to: t.to !== '' && t.to != null ? Math.max(1, parseInt(t.to, 10) || 1) : null,
          fee: Math.max(0, parseInt(t.fee, 10) || 0),
        }));
        cleanTiers.sort((a, b) => a.from - b.from);

        return {
          product_id: rule.product_id,
          product_name: rule.product_name || '',
          base_fee: Math.max(0, parseInt(rule.base_fee, 10) || 2000),
          rule_type: rule.rule_type === 'step' ? 'step' : 'tiers',
          tiers: cleanTiers,
          step_quantity: Math.max(1, parseInt(rule.step_quantity, 10) || 5),
          step_fee: Math.max(0, parseInt(rule.step_fee, 10) || 5000),
        };
      });

      const payload = {
        default_fee: Math.max(0, parseInt(packingFeeConfig.default_fee, 10) || 2000),
        amount: Math.max(0, parseInt(packingFeeConfig.default_fee, 10) || 2000),
        product_rules: cleanProductRules,
      };

      const res = await api.updatePackingFeeConfig(payload);
      setPackingFeeConfig(res.data || payload);
      showNotify('Đã lưu cấu hình phí gói bánh thành công!');
    } catch (err) {
      showNotify(`Lỗi lưu cấu hình: ${err.message}`, true);
    } finally {
      setSavingPackingFee(false);
    }
  };

  const handleAddProductRule = (productId) => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const existingRules = packingFeeConfig.product_rules || [];
    if (existingRules.some((r) => r.product_id === productId)) {
      showNotify('Loại bánh này đã có trong danh sách cấu hình riêng!', true);
      return;
    }

    const newRule = {
      product_id: prod.id,
      product_name: prod.name,
      base_fee: 2000,
      rule_type: 'tiers',
      tiers: [
        { from: 1, to: 4, fee: 2000 },
        { from: 5, to: 9, fee: 10000 },
        { from: 10, to: 19, fee: 15000 },
        { from: 20, to: null, fee: 20000 },
      ],
      step_quantity: 5,
      step_fee: 5000,
    };

    setPackingFeeConfig({
      ...packingFeeConfig,
      product_rules: [...existingRules, newRule],
    });
    showNotify(`Đã thêm cấu hình riêng cho "${prod.name}"`);
  };

  const handleRemoveProductRule = (productId) => {
    const existingRules = packingFeeConfig.product_rules || [];
    setPackingFeeConfig({
      ...packingFeeConfig,
      product_rules: existingRules.filter((r) => r.product_id !== productId),
    });
    showNotify('Đã xóa cấu hình riêng. Loại bánh này sẽ áp dụng mức mặc định 2.000đ.');
  };

  const handleUpdateProductRule = (productId, updates) => {
    const existingRules = packingFeeConfig.product_rules || [];
    setPackingFeeConfig({
      ...packingFeeConfig,
      product_rules: existingRules.map((r) =>
        r.product_id === productId ? { ...r, ...updates } : r
      ),
    });
  };

  const handleAddTierToRule = (productId) => {
    const existingRules = packingFeeConfig.product_rules || [];
    const rule = existingRules.find((r) => r.product_id === productId);
    if (!rule) return;

    const tiers = rule.tiers || [];
    const lastTier = tiers[tiers.length - 1];
    const nextFrom = lastTier ? Number(lastTier.to || lastTier.from) + 1 : 1;
    const nextFee = lastTier ? Number(lastTier.fee) + 5000 : 5000;

    const newTiers = [...tiers, { from: nextFrom, to: nextFrom + 4, fee: nextFee }];
    handleUpdateProductRule(productId, { tiers: newTiers });
  };

  const handleRemoveTierFromRule = (productId, tierIndex) => {
    const existingRules = packingFeeConfig.product_rules || [];
    const rule = existingRules.find((r) => r.product_id === productId);
    if (!rule) return;

    const newTiers = [...(rule.tiers || [])];
    newTiers.splice(tierIndex, 1);
    handleUpdateProductRule(productId, { tiers: newTiers });
  };

  const handleTierChangeInRule = (productId, tierIndex, field, value) => {
    const existingRules = packingFeeConfig.product_rules || [];
    const rule = existingRules.find((r) => r.product_id === productId);
    if (!rule) return;

    const newTiers = [...(rule.tiers || [])];
    newTiers[tierIndex] = {
      ...newTiers[tierIndex],
      [field]: value === '' && field === 'to' ? null : value,
    };
    handleUpdateProductRule(productId, { tiers: newTiers });
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
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Sliders size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Cấu hình phí gói
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

      {/* 4. TAB CẤU HÌNH PHÍ GÓI BÁNH */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card */}
          <div
            className="form-card"
            style={{
              background: 'linear-gradient(135deg, #FFF9F3 0%, #FFFFFF 100%)',
              border: '1.5px solid var(--card-border)',
              borderRadius: '20px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={24} style={{ color: 'var(--color-accent-terracotta)' }} />
                  Cấu Hình Phí Gói Bánh (Phí Đóng Hộp)
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.94rem', marginTop: '6px', maxWidth: '780px', lineHeight: 1.6 }}>
                  • <strong>Mặc định:</strong> Mọi loại bánh đều có phí gói là <strong>2.000đ</strong> cố định (dù khách mua 1 cái hay nhiều cái).
                  <br />
                  • <strong>Cấu hình riêng:</strong> Nếu có loại bánh cần tính thêm phí theo số lượng (ví dụ: cứ 5 cái thêm 10k, hoặc mua 20 cái thì 20k phí gói), bạn chọn loại bánh đó ở bên dưới để cài đặt.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSavePackingFee}
                  disabled={savingPackingFee}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                >
                  {savingPackingFee ? (
                    <>
                      <RefreshCw size={16} className="spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} /> Lưu cấu hình
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Row 1: Mức phí mặc định chung */}
          <div className="form-card" style={{ padding: '20px', borderRadius: '18px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} style={{ color: 'var(--color-accent-terracotta)' }} />
              Phí Gói Mặc Định Toàn Cửa Hàng
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Áp dụng cố định cho bất kỳ loại bánh nào <strong>không nằm trong danh sách cấu hình riêng</strong> bên dưới, bất kể khách mua số lượng bao nhiêu cái.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '1.1rem', fontWeight: 700, maxWidth: '180px' }}
                step="500"
                min="0"
                value={packingFeeConfig.default_fee ?? 2000}
                onChange={(e) =>
                  setPackingFeeConfig({
                    ...packingFeeConfig,
                    default_fee: e.target.value,
                    amount: e.target.value,
                  })
                }
                required
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-accent-terracotta)' }}>
                = {formatMoney(Number(packingFeeConfig.default_fee) || 2000)} / loại bánh
              </span>
            </div>
          </div>

          {/* Row 2: Danh sách loại bánh cấu hình riêng */}
          <div className="form-card" style={{ padding: '24px', borderRadius: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Cookie size={20} style={{ color: 'var(--color-accent-terracotta)' }} />
                  Cấu Hình Riêng Theo Từng Loại Bánh
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Chỉ những loại bánh thêm vào danh sách này mới tính phí gói theo số lượng, các loại bánh còn lại giữ mức 2.000đ.
                </p>
              </div>

              {/* Add product dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  className="form-select"
                  style={{ minWidth: '260px', padding: '8px 14px', borderColor: 'var(--color-accent-terracotta)' }}
                  value=""
                  onChange={(e) => {
                    handleAddProductRule(e.target.value);
                    e.target.value = '';
                  }}
                >
                  <option value="">+ Chọn loại bánh muốn cấu hình riêng...</option>
                  {products
                    .filter(
                      (p) =>
                        !(packingFeeConfig.product_rules || []).some(
                          (r) => r.product_id === p.id
                        )
                    )
                    .map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.categories?.name || 'Khác'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* List of configured products */}
            {(packingFeeConfig.product_rules || []).length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  background: 'var(--card-bg)',
                  borderRadius: '14px',
                  border: '1.5px dashed var(--card-border)',
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>🍪</span>
                <h4 style={{ color: 'var(--color-primary)', marginTop: '10px', fontSize: '1.1rem' }}>
                  Chưa có loại bánh nào được cấu hình riêng
                </h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '540px', margin: '6px auto 0' }}>
                  Mọi loại bánh hiện đều áp dụng mức phí gói mặc định là <strong>2.000đ</strong> (dù số lượng bao nhiêu). Để cấu hình thêm phí theo số lượng (ví dụ cứ 5 cái thêm 10k, hoặc 20 cái là 20k), hãy chọn một loại bánh ở danh sách chọn phía trên.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(packingFeeConfig.product_rules || []).map((rule) => {
                  const prod = products.find((p) => p.id === rule.product_id);
                  const prodName = prod?.name || rule.product_name || 'Bánh';
                  const catName = prod?.categories?.name || '';

                  return (
                    <div
                      key={rule.product_id}
                      style={{
                        padding: '20px',
                        borderRadius: '16px',
                        border: '1.5px solid var(--card-border)',
                        background: '#FFFFFF',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {/* Product Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          borderBottom: '1px solid var(--card-border)',
                          paddingBottom: '14px',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🍪</span>
                          <div>
                            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                              {prodName}
                            </span>
                            {catName && (
                              <span
                                style={{
                                  marginLeft: '8px',
                                  fontSize: '0.78rem',
                                  padding: '2px 8px',
                                  background: 'var(--color-primary-light)',
                                  color: 'var(--color-primary)',
                                  borderRadius: 'var(--pill-radius)',
                                  fontWeight: 600,
                                }}
                              >
                                {catName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* Rule type selector */}
                          <div style={{ display: 'inline-flex', background: 'var(--card-bg)', padding: '3px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateProductRule(rule.product_id, { rule_type: 'tiers' })}
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                background: rule.rule_type !== 'step' ? 'var(--color-primary)' : 'transparent',
                                color: rule.rule_type !== 'step' ? '#FFFFFF' : 'var(--color-text-muted)',
                              }}
                            >
                              Theo mốc số lượng (Tiers)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateProductRule(rule.product_id, { rule_type: 'step' })}
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                background: rule.rule_type === 'step' ? 'var(--color-primary)' : 'transparent',
                                color: rule.rule_type === 'step' ? '#FFFFFF' : 'var(--color-text-muted)',
                              }}
                            >
                              Cứ mỗi X cái thì thêm Y đ
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn-remove-item"
                            onClick={() => handleRemoveProductRule(rule.product_id)}
                            title="Xóa cấu hình riêng của bánh này"
                            style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Trash2 size={15} /> Xóa
                          </button>
                        </div>
                      </div>

                      {/* Rule Type: Step mode */}
                      {rule.rule_type === 'step' ? (
                        <div>
                          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                            Công thức tính: Phí gói = Phí cơ bản + (Số lượng / [Mỗi X cái]) × [Thêm Y đ]
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Phí cơ bản:</span>
                              <input
                                type="number"
                                className="form-input"
                                style={{ width: '100px', textAlign: 'right', fontWeight: 600 }}
                                value={rule.base_fee ?? 2000}
                                onChange={(e) =>
                                  handleUpdateProductRule(rule.product_id, { base_fee: e.target.value })
                                }
                              />
                              <span style={{ fontSize: '0.85rem' }}>đ</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cứ mỗi:</span>
                              <input
                                type="number"
                                className="form-input"
                                min="1"
                                style={{ width: '70px', textAlign: 'center', fontWeight: 600 }}
                                value={rule.step_quantity ?? 5}
                                onChange={(e) =>
                                  handleUpdateProductRule(rule.product_id, { step_quantity: e.target.value })
                                }
                              />
                              <span style={{ fontSize: '0.85rem' }}>cái</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Thì cộng thêm:</span>
                              <input
                                type="number"
                                className="form-input"
                                step="500"
                                min="0"
                                style={{ width: '110px', textAlign: 'right', fontWeight: 600 }}
                                value={rule.step_fee ?? 5000}
                                onChange={(e) =>
                                  handleUpdateProductRule(rule.product_id, { step_fee: e.target.value })
                                }
                              />
                              <span style={{ fontSize: '0.85rem' }}>đ</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Rule Type: Tiers mode */
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                              Bảng mốc phí gói cho <strong>{prodName}</strong> theo số lượng đặt:
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() =>
                                  handleUpdateProductRule(rule.product_id, {
                                    tiers: [
                                      { from: 1, to: 4, fee: 2000 },
                                      { from: 5, to: 9, fee: 10000 },
                                      { from: 10, to: 19, fee: 15000 },
                                      { from: 20, to: null, fee: 20000 },
                                    ],
                                  })
                                }
                                style={{ padding: '4px 10px', fontSize: '0.82rem' }}
                                title="Mẫu: cứ 5 cái thêm phí (20 cái = 20k)"
                              >
                                Điền mốc mẫu 5-10-20 cái
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleAddTierToRule(rule.product_id)}
                                style={{ padding: '4px 10px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Plus size={14} /> Thêm mốc
                              </button>
                            </div>
                          </div>

                          <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                            <table className="modal-items-table" style={{ margin: 0 }}>
                              <thead>
                                <tr style={{ background: 'var(--color-primary-light)' }}>
                                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                                  <th style={{ textAlign: 'center' }}>Từ số lượng</th>
                                  <th style={{ textAlign: 'center' }}>Đến số lượng</th>
                                  <th style={{ textAlign: 'right' }}>Phí gói (VNĐ)</th>
                                  <th style={{ width: '50px', textAlign: 'center' }}>Xóa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(rule.tiers || []).map((tier, tIdx) => (
                                  <tr key={tIdx}>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                      {tIdx + 1}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        style={{ width: '75px', textAlign: 'center', margin: '0 auto', padding: '5px 8px' }}
                                        value={tier.from ?? ''}
                                        onChange={(e) => handleTierChangeInRule(rule.product_id, tIdx, 'from', e.target.value)}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <input
                                        type="number"
                                        className="form-input"
                                        min="1"
                                        placeholder="Trở lên"
                                        style={{ width: '90px', textAlign: 'center', margin: '0 auto', padding: '5px 8px' }}
                                        value={tier.to ?? ''}
                                        onChange={(e) => handleTierChangeInRule(rule.product_id, tIdx, 'to', e.target.value)}
                                      />
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                        <input
                                          type="number"
                                          className="form-input"
                                          step="500"
                                          min="0"
                                          style={{ width: '105px', textAlign: 'right', padding: '5px 8px', fontWeight: 600 }}
                                          value={tier.fee ?? ''}
                                          onChange={(e) => handleTierChangeInRule(rule.product_id, tIdx, 'fee', e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.85rem' }}>đ</span>
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn-remove-item"
                                        onClick={() => handleRemoveTierFromRule(rule.product_id, tIdx)}
                                        title="Xóa mốc này"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Live Quick Preview for this product */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--color-primary-light)',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          fontSize: '0.88rem',
                          marginTop: '8px',
                        }}
                      >
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                          💡 Ví dụ tính thử cho bánh {prodName}:
                        </span>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <span>1 cái: <strong>{formatMoney(calculateItemPackingFee(rule.product_id, 1, packingFeeConfig))}</strong></span>
                          <span>5 cái: <strong>{formatMoney(calculateItemPackingFee(rule.product_id, 5, packingFeeConfig))}</strong></span>
                          <span>20 cái: <strong style={{ color: 'var(--color-accent-terracotta)' }}>{formatMoney(calculateItemPackingFee(rule.product_id, 20, packingFeeConfig))}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: Simulator for Entire Order */}
          <div
            className="form-card"
            style={{
              padding: '24px',
              borderRadius: '18px',
              background: '#FFFFFF',
              border: '1.5px solid var(--card-border)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calculator size={20} style={{ color: 'var(--color-accent-terracotta)' }} />
              Mô Phỏng Tính Phí Gói Cả Đơn Hàng (Order Preview)
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
              Chọn 2 loại bánh bất kỳ từ cửa hàng để kiểm tra tính toán thực tế khi khách đặt hàng:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {/* Product 1 */}
              <div style={{ padding: '14px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Bánh thứ nhất:</label>
                <select
                  className="form-select"
                  style={{ marginBottom: '10px' }}
                  value={simSelectedProduct1 || (products[0]?.id ?? '')}
                  onChange={(e) => setSimSelectedProduct1(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({(packingFeeConfig.product_rules || []).some(r => r.product_id === p.id) ? 'Có cấu hình riêng' : 'Mặc định 2k'})
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Số lượng:</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ width: '65px', textAlign: 'center', padding: '4px' }}
                      value={simQty1}
                      onChange={(e) => setSimQty1(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <span style={{ fontSize: '0.85rem' }}>cái</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent-terracotta)' }}>
                    Phí gói: {formatMoney(calculateItemPackingFee(simSelectedProduct1 || products[0]?.id, simQty1, packingFeeConfig))}
                  </span>
                </div>
              </div>

              {/* Product 2 */}
              <div style={{ padding: '14px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Bánh thứ hai:</label>
                <select
                  className="form-select"
                  style={{ marginBottom: '10px' }}
                  value={simSelectedProduct2 || (products[1]?.id ?? products[0]?.id ?? '')}
                  onChange={(e) => setSimSelectedProduct2(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({(packingFeeConfig.product_rules || []).some(r => r.product_id === p.id) ? 'Có cấu hình riêng' : 'Mặc định 2k'})
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Số lượng:</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      style={{ width: '65px', textAlign: 'center', padding: '4px' }}
                      value={simQty2}
                      onChange={(e) => setSimQty2(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <span style={{ fontSize: '0.85rem' }}>cái</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent-terracotta)' }}>
                    Phí gói: {formatMoney(calculateItemPackingFee(simSelectedProduct2 || products[1]?.id || products[0]?.id, simQty2, packingFeeConfig))}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Simulated Packing Fee */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'var(--color-primary-light)',
                borderRadius: '12px',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}
            >
              <span>Tổng phí gói dự kiến cho đơn hàng trên:</span>
              <span style={{ fontSize: '1.25rem', color: 'var(--color-accent-terracotta)' }}>
                {formatMoney(
                  calculateItemPackingFee(simSelectedProduct1 || products[0]?.id, simQty1, packingFeeConfig) +
                    calculateItemPackingFee(simSelectedProduct2 || products[1]?.id || products[0]?.id, simQty2, packingFeeConfig)
                )}
              </span>
            </div>
          </div>
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
