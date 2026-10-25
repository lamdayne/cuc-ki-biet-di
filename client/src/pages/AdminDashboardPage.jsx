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
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Info,
  List,
  Grid,
  FileText,
  Clock,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'schedule' | 'categories' | 'products' | 'settings'
  const [loading, setLoading] = useState(true);

  // Data states
  const [orders, setOrders] = useState([]);
  const [dayCounts, setDayCounts] = useState({});
  const [dayLimits, setDayLimits] = useState({});
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Schedule Management states
  const [scheduleData, setScheduleData] = useState({
    settings: { default_max_orders: 4, allow_weekend_ordering: false, day_configs: {} },
    days: [],
    stats: { totalDays: 0, openDaysCount: 0, closedDaysCount: 0, fullDaysCount: 0, totalBookedOrders: 0 },
  });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState('calendar'); // 'calendar' | 'table'
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [scheduleFilter, setScheduleFilter] = useState('all'); // 'all' | 'open' | 'closed' | 'has_orders' | 'full'
  const [viewOrdersModalDay, setViewOrdersModalDay] = useState(null);
  const [editingDayNote, setEditingDayNote] = useState(null);
  const [defaultQuotaInput, setDefaultQuotaInput] = useState(4);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState('open_weekdays');
  const [batchCustomQuota, setBatchCustomQuota] = useState(4);

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
      const [ordersRes, catsRes, prodsRes, feeRes, scheduleRes] = await Promise.allSettled([
        api.getAdminOrders({
          pickupDate: orderDateFilter,
          status: orderStatusFilter,
        }),
        api.getAdminCategories(),
        api.getAdminProducts(),
        api.getPackingFeeConfig(),
        api.getAdminSchedule(60),
      ]);

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data.orders || []);
        setDayCounts(ordersRes.value.data.dayCounts || {});
        setDayLimits(ordersRes.value.data.dayLimits || {});
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

      if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data) {
        setScheduleData(scheduleRes.value.data);
        setDefaultQuotaInput(scheduleRes.value.data.settings?.default_max_orders ?? 4);
      }
    } catch (err) {
      showNotify(err.message, true);
    }
  };

  const loadScheduleData = async () => {
    try {
      setScheduleLoading(true);
      const res = await api.getAdminSchedule(60);
      if (res?.data) {
        setScheduleData(res.data);
        setDefaultQuotaInput(res.data.settings?.default_max_orders ?? 4);
      }
    } catch (err) {
      console.error('Lỗi tải lịch nhận đơn:', err);
      showNotify(`Lỗi tải lịch nhận đơn: ${err.message}`, true);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleToggleDay = async (dateStr) => {
    const currentDay = scheduleData.days.find((d) => d.dateStr === dateStr);
    if (!currentDay) return;
    const newIsOpen = !currentDay.isOpen;

    // Optimistic UI update
    setScheduleData((prev) => {
      const updatedDays = prev.days.map((d) => {
        if (d.dateStr !== dateStr) return d;
        const isFull = !newIsOpen || (d.maxOrders > 0 && d.count >= d.maxOrders);
        return { ...d, isOpen: newIsOpen, isFull, isCustom: true };
      });
      const openCount = updatedDays.filter((d) => d.isOpen).length;
      const closedCount = updatedDays.length - openCount;
      const fullCount = updatedDays.filter((d) => d.isFull).length;
      return {
        ...prev,
        days: updatedDays,
        stats: {
          ...prev.stats,
          openDaysCount: openCount,
          closedDaysCount: closedCount,
          fullDaysCount: fullCount,
        },
      };
    });

    try {
      await api.updateDayConfig(dateStr, {
        is_open: newIsOpen,
        max_orders: currentDay.maxOrders,
        note: currentDay.note || '',
      });
      showNotify(
        newIsOpen
          ? `🟢 Đã MỞ nhận đơn ngày ${currentDay.displayDate}`
          : `⚪ Đã TẮT nhận đơn ngày ${currentDay.displayDate}`
      );
    } catch (err) {
      showNotify(`Lỗi cập nhật: ${err.message}`, true);
      loadScheduleData();
    }
  };

  const handleUpdateDayQuota = async (dateStr, newQuota) => {
    const quota = Math.max(0, parseInt(newQuota, 10) || 0);
    const currentDay = scheduleData.days.find((d) => d.dateStr === dateStr);
    if (!currentDay) return;

    // Optimistic UI update
    setScheduleData((prev) => {
      const updatedDays = prev.days.map((d) => {
        if (d.dateStr !== dateStr) return d;
        const isFull = !d.isOpen || (quota > 0 && d.count >= quota);
        return { ...d, maxOrders: quota, isFull, isCustom: true };
      });
      const fullCount = updatedDays.filter((d) => d.isFull).length;
      return {
        ...prev,
        days: updatedDays,
        stats: {
          ...prev.stats,
          fullDaysCount: fullCount,
        },
      };
    });

    try {
      await api.updateDayConfig(dateStr, {
        is_open: currentDay.isOpen,
        max_orders: quota,
        note: currentDay.note || '',
      });
      showNotify(`🎯 Đã đổi giới hạn ngày ${currentDay.displayDate}: ${quota} đơn`);
    } catch (err) {
      showNotify(`Lỗi cập nhật giới hạn: ${err.message}`, true);
      loadScheduleData();
    }
  };

  const handleSaveDefaultQuota = async () => {
    try {
      setSavingSchedule(true);
      const quota = Math.max(0, parseInt(defaultQuotaInput, 10) || 0);
      const newSettings = {
        ...scheduleData.settings,
        default_max_orders: quota,
      };
      await api.updateAdminSchedule(newSettings);
      showNotify(`✅ Đã lưu giới hạn mặc định: ${quota} đơn/ngày`);
      await loadScheduleData();
    } catch (err) {
      showNotify(`Lỗi lưu mặc định: ${err.message}`, true);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleWeekendOrdering = async () => {
    try {
      setSavingSchedule(true);
      const newAllow = !scheduleData.settings.allow_weekend_ordering;
      const newSettings = {
        ...scheduleData.settings,
        allow_weekend_ordering: newAllow,
      };
      await api.updateAdminSchedule(newSettings);
      showNotify(
        newAllow
          ? '🟢 Đã BẬT tự động nhận đơn cuối tuần (Thứ 7 & CN)'
          : '⚪ Đã TẮT tự động nhận đơn cuối tuần (Thứ 7 & CN)'
      );
      await loadScheduleData();
    } catch (err) {
      showNotify(`Lỗi: ${err.message}`, true);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleExecuteBatchAction = async () => {
    try {
      setSavingSchedule(true);
      const uniqueMonthGroups = Array.from(new Set(scheduleData.days.map((d) => d.monthGroup)));
      const currentMonthGroup = uniqueMonthGroups[selectedMonthIndex] || '';
      const daysInCurrentMonth = scheduleData.days.filter(
        (d) => d.monthGroup === currentMonthGroup
      );

      if (daysInCurrentMonth.length === 0) {
        showNotify('Không có ngày nào trong tháng này', true);
        return;
      }

      let payload = {};
      if (batchActionType === 'open_weekdays') {
        const weekdayDates = daysInCurrentMonth.filter((d) => !d.isWeekend).map((d) => d.dateStr);
        payload = { dates: weekdayDates, is_open: true };
      } else if (batchActionType === 'close_weekends') {
        const weekendDates = daysInCurrentMonth.filter((d) => d.isWeekend).map((d) => d.dateStr);
        payload = { dates: weekendDates, is_open: false };
      } else if (batchActionType === 'set_month_quota') {
        const allDates = daysInCurrentMonth.map((d) => d.dateStr);
        payload = { dates: allDates, max_orders: batchCustomQuota };
      } else if (batchActionType === 'reset_month') {
        const allDates = daysInCurrentMonth.map((d) => d.dateStr);
        payload = { dates: allDates, reset_to_default: true };
      }

      await api.batchUpdateDays(payload);
      showNotify('✅ Đã cập nhật hàng loạt thành công!');
      setBatchModalOpen(false);
      await loadScheduleData();
    } catch (err) {
      showNotify(`Lỗi thao tác hàng loạt: ${err.message}`, true);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveNote = async (dateStr, note) => {
    try {
      const currentDay = scheduleData.days.find((d) => d.dateStr === dateStr);
      await api.updateDayConfig(dateStr, {
        is_open: currentDay ? currentDay.isOpen : true,
        max_orders: currentDay?.maxOrders,
        note: (note || '').trim(),
      });
      setScheduleData((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.dateStr === dateStr ? { ...d, note: (note || '').trim() } : d)),
      }));
      setEditingDayNote(null);
      showNotify('Đã lưu ghi chú cho ngày');
    } catch (err) {
      showNotify(`Lỗi lưu ghi chú: ${err.message}`, true);
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

  const uniqueMonthGroups = Array.from(new Set(scheduleData.days.map((d) => d.monthGroup)));
  const currentMonthGroup = uniqueMonthGroups[selectedMonthIndex] || uniqueMonthGroups[0] || '';
  const currentMonthDays = scheduleData.days.filter((d) => d.monthGroup === currentMonthGroup);

  const filteredScheduleDays = currentMonthDays.filter((d) => {
    if (scheduleFilter === 'open') return d.isOpen;
    if (scheduleFilter === 'closed') return !d.isOpen;
    if (scheduleFilter === 'has_orders') return d.count > 0;
    if (scheduleFilter === 'full') return d.isFull;
    return true;
  });

  const firstDayOfMonth = currentMonthDays[0];
  const paddingBefore = firstDayOfMonth ? (firstDayOfMonth.dayOfWeek + 6) % 7 : 0;

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
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('schedule');
            loadScheduleData();
          }}
        >
          <Calendar size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Lịch & Giới hạn đơn
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
              <label className="form-label">Lọc theo ngày nướng bánh:</label>
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
                const maxForDay = dayLimits[ord.pickup_date] ?? 4;
                const isDayFull = maxForDay > 0 && countForDay >= maxForDay;
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
                          title="Ngày nướng bánh và số lượng đơn trong ngày"
                        >
                          <Calendar size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          <span className="order-day-label">
                            Nướng: <strong>{displayPickupDate}</strong>
                          </span>
                          <span className={`order-day-pill ${isDayFull ? 'pill-full' : 'pill-available'}`}>
                            {countForDay}/{maxForDay} đơn
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

      {/* TAB 2: LỊCH NHẬN ĐƠN & GIỚI HẠN ĐƠN (SCHEDULE & CAPACITY MANAGEMENT) */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Header Card with Stats */}
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
                  <Calendar size={24} style={{ color: 'var(--color-accent-terracotta)' }} />
                  Quản Lý Lịch Nhận Đơn & Số Lượng Đơn / Ngày
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.94rem', marginTop: '6px', maxWidth: '780px', lineHeight: 1.6 }}>
                  • <strong>Bật / Tắt ngày nhận bánh:</strong> Nhấp nút ON / OFF trên từng ngày để mở nhận đơn hoặc tạm ngưng (nghỉ lễ, sửa lò, việc bận...).
                  <br />
                  • <strong>Điều chỉnh số lượng nhận:</strong> Tăng/giảm số đơn tối đa nhận cho từng ngày riêng lẻ (ví dụ: ngày 28 nhận 8 đơn, ngày 29 nhận 2 đơn).
                  <br />
                  • <strong>Tự động áp dụng:</strong> Khách đặt hàng sẽ chỉ chọn được những ngày đang MỞ (ON) và còn chỗ trống.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={loadScheduleData}
                  disabled={scheduleLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                >
                  <RefreshCw size={16} className={scheduleLoading ? 'spin' : ''} />
                  Làm mới
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="schedule-stats-grid">
              <div className="schedule-stat-card">
                <div className="schedule-stat-icon open">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <div className="schedule-stat-value">{scheduleData.stats.openDaysCount}</div>
                  <div className="schedule-stat-label">Ngày đang mở nhận đơn (ON)</div>
                </div>
              </div>

              <div className="schedule-stat-card">
                <div className="schedule-stat-icon closed">
                  <X size={22} />
                </div>
                <div>
                  <div className="schedule-stat-value">{scheduleData.stats.closedDaysCount}</div>
                  <div className="schedule-stat-label">Ngày tạm ngưng (OFF)</div>
                </div>
              </div>

              <div className="schedule-stat-card">
                <div className="schedule-stat-icon full">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <div className="schedule-stat-value">{scheduleData.stats.fullDaysCount}</div>
                  <div className="schedule-stat-label">Ngày đã nhận đủ (FULL)</div>
                </div>
              </div>

              <div className="schedule-stat-card">
                <div className="schedule-stat-icon orders">
                  <Package size={22} />
                </div>
                <div>
                  <div className="schedule-stat-value">{scheduleData.stats.totalBookedOrders}</div>
                  <div className="schedule-stat-label">Tổng đơn đã đặt (60 ngày tới)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Settings & View Switcher Bar */}
          <div className="schedule-controls-bar">
            {/* Setting 1: Default daily capacity */}
            <div className="schedule-control-item">
              <Sliders size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Giới hạn mặc định:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  value={defaultQuotaInput}
                  onChange={(e) => setDefaultQuotaInput(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '68px', padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>đơn/ngày</span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveDefaultQuota}
                  disabled={savingSchedule || defaultQuotaInput === scheduleData.settings?.default_max_orders}
                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  Lưu mặc định
                </button>
              </div>
            </div>

            {/* Setting 2: Weekend ordering toggle */}
            <div className="schedule-control-item">
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                Nhận đơn Thứ 7 & CN:
              </span>
              <button
                type="button"
                className={`btn-day-toggle ${scheduleData.settings?.allow_weekend_ordering ? 'on' : 'off'}`}
                onClick={handleToggleWeekendOrdering}
                disabled={savingSchedule}
                style={{ width: 'auto', padding: '6px 14px' }}
                title="Bật/Tắt tự động mở nhận đơn vào Thứ 7 và Chủ Nhật cho toàn hệ thống"
              >
                {scheduleData.settings?.allow_weekend_ordering ? (
                  <>
                    <Check size={14} /> Tự động mở cuối tuần
                  </>
                ) : (
                  <>
                    <X size={14} /> Nghỉ cuối tuần (Mặc định)
                  </>
                )}
              </button>
            </div>

            {/* Setting 3: View Mode Switcher */}
            <div className="schedule-control-item">
              <div className="schedule-view-switcher">
                <button
                  type="button"
                  className={`schedule-view-btn ${scheduleViewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => setScheduleViewMode('calendar')}
                >
                  <Grid size={16} /> Lưới Lịch
                </button>
                <button
                  type="button"
                  className={`schedule-view-btn ${scheduleViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setScheduleViewMode('table')}
                >
                  <List size={16} /> Danh Sách
                </button>
              </div>
            </div>
          </div>

          {/* Month Navigation & Filters Bar */}
          <div className="schedule-nav-filter-bar">
            {/* Month Switcher */}
            <div className="month-nav-group">
              <button
                type="button"
                className="month-nav-btn"
                onClick={() => setSelectedMonthIndex((prev) => Math.max(0, prev - 1))}
                disabled={selectedMonthIndex <= 0}
                title="Tháng trước"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="month-nav-title">
                {uniqueMonthGroups[selectedMonthIndex] || 'Lịch nhận đơn'}
              </div>
              <button
                type="button"
                className="month-nav-btn"
                onClick={() =>
                  setSelectedMonthIndex((prev) =>
                    Math.min(uniqueMonthGroups.length - 1, prev + 1)
                  )
                }
                disabled={selectedMonthIndex >= uniqueMonthGroups.length - 1}
                title="Tháng tiếp theo"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="schedule-filters-pills">
              <button
                type="button"
                className={`schedule-filter-pill ${scheduleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('all')}
              >
                Tất cả ({currentMonthDays.length})
              </button>
              <button
                type="button"
                className={`schedule-filter-pill ${scheduleFilter === 'open' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('open')}
              >
                🟢 Đang mở ({currentMonthDays.filter((d) => d.isOpen).length})
              </button>
              <button
                type="button"
                className={`schedule-filter-pill ${scheduleFilter === 'closed' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('closed')}
              >
                ⚪ Tạm đóng ({currentMonthDays.filter((d) => !d.isOpen).length})
              </button>
              <button
                type="button"
                className={`schedule-filter-pill ${scheduleFilter === 'has_orders' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('has_orders')}
              >
                📦 Có đơn ({currentMonthDays.filter((d) => d.count > 0).length})
              </button>
              <button
                type="button"
                className={`schedule-filter-pill ${scheduleFilter === 'full' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('full')}
              >
                🔴 Đã đầy ({currentMonthDays.filter((d) => d.isFull).length})
              </button>
            </div>

            {/* Batch Action Button */}
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setBatchModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--pill-radius)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  border: '1.5px solid var(--card-border)',
                  background: '#FFFFFF',
                  color: 'var(--color-primary)',
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--color-accent-terracotta)' }} />
                Thao tác hàng loạt
              </button>
            </div>
          </div>

          {/* MAIN VIEW: Calendar Grid */}
          {scheduleViewMode === 'calendar' && (
            <div className="schedule-calendar-wrapper">
              {/* Day of Week Headers */}
              <div className="schedule-calendar-headers">
                <div className="schedule-calendar-header-col">Thứ Hai</div>
                <div className="schedule-calendar-header-col">Thứ Ba</div>
                <div className="schedule-calendar-header-col">Thứ Tư</div>
                <div className="schedule-calendar-header-col">Thứ Năm</div>
                <div className="schedule-calendar-header-col">Thứ Sáu</div>
                <div className="schedule-calendar-header-col weekend">Thứ Bảy</div>
                <div className="schedule-calendar-header-col weekend">Chủ Nhật</div>
              </div>

              {/* Day Grid */}
              <div className="schedule-calendar-grid">
                {/* Empty padding cells before first day of month if filter is 'all' */}
                {scheduleFilter === 'all' &&
                  Array.from({ length: paddingBefore }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="schedule-day-cell is-empty-placeholder"></div>
                  ))}

                {filteredScheduleDays.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`schedule-day-cell ${day.isToday ? 'is-today' : ''} ${!day.isOpen ? 'is-closed' : ''} ${day.isFull ? 'is-full' : ''}`}
                  >
                    {/* Header: Date + Badges */}
                    <div className="schedule-cell-header">
                      <div>
                        <span className={`schedule-date-num ${day.isWeekend ? 'is-weekend' : ''}`}>
                          {day.dateStr.split('-')[2]}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: '6px', fontWeight: 600 }}>
                          {day.weekdayName}
                        </span>
                      </div>
                      <div className="schedule-cell-badges">
                        {day.isToday && <span className="badge-pill-tag today">Hôm nay</span>}
                        {day.isCustom && <span className="badge-pill-tag custom" title="Đã có cài đặt riêng cho ngày này">Tùy chỉnh</span>}
                      </div>
                    </div>

                    {/* ON / OFF Toggle Button */}
                    <button
                      type="button"
                      className={`btn-day-toggle ${day.isOpen ? 'on' : 'off'}`}
                      onClick={() => handleToggleDay(day.dateStr)}
                      title={day.isOpen ? 'Nhấp để TẮT nhận đơn ngày này' : 'Nhấp để BẬT nhận đơn ngày này'}
                    >
                      {day.isOpen ? (
                        <>
                          <Check size={14} /> MỞ ĐƠN (ON)
                        </>
                      ) : (
                        <>
                          <X size={14} /> TẠM ĐÓNG (OFF)
                        </>
                      )}
                    </button>

                    {/* Stepper: Max Quota */}
                    <div className="schedule-stepper-box">
                      <div className="schedule-stepper-label">
                        <span>Giới hạn nhận đơn:</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{day.maxOrders} đơn</span>
                      </div>
                      <div className="schedule-stepper-controls">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleUpdateDayQuota(day.dateStr, Math.max(0, day.maxOrders - 1))}
                          title="Giảm 1 đơn"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="stepper-input"
                          value={day.maxOrders}
                          onChange={(e) => handleUpdateDayQuota(day.dateStr, e.target.value)}
                        />
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleUpdateDayQuota(day.dateStr, day.maxOrders + 1)}
                          title="Tăng 1 đơn"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Status Text */}
                    <div className="schedule-progress-container">
                      <div className="schedule-progress-text">
                        <span style={{ color: 'var(--color-text-muted)' }}>Đã đặt:</span>
                        <span style={{ color: 'var(--color-primary)' }}>
                          {day.count} / {day.maxOrders} đơn
                        </span>
                      </div>
                      <div className="schedule-progress-bar-bg">
                        <div
                          className={`schedule-progress-bar-fill ${
                            day.isFull ? 'full' : day.count >= day.maxOrders * 0.7 ? 'warning' : 'normal'
                          }`}
                          style={{
                            width: `${day.maxOrders > 0 ? Math.min(100, Math.round((day.count / day.maxOrders) * 100)) : 0}%`,
                          }}
                        ></div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.72rem', fontWeight: 600 }}>
                        {!day.isOpen ? (
                          <span style={{ color: 'var(--color-text-muted)' }}>⚪ Tạm ngưng</span>
                        ) : day.isFull ? (
                          <span style={{ color: '#DC2626' }}>🔴 ĐÃ ĐỦ ĐƠN</span>
                        ) : (
                          <span style={{ color: '#2E7D32' }}>🟢 Còn {day.maxOrders - day.count} chỗ</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom: View Orders + Note */}
                    <div className="schedule-cell-bottom">
                      {day.count > 0 ? (
                        <button
                          type="button"
                          className="btn-view-day-orders"
                          onClick={() => setViewOrdersModalDay(day)}
                          title="Xem chi tiết các đơn hàng đặt ngày này"
                        >
                          <Eye size={13} /> Xem {day.count} đơn
                        </button>
                      ) : (
                        <div style={{ height: '28px' }}></div>
                      )}

                      {day.note ? (
                        <div
                          className="day-note-tag"
                          onClick={() => setEditingDayNote({ date: day.dateStr, note: day.note, displayDate: day.displayDate })}
                          title={`Ghi chú: ${day.note} (Nhấp để sửa)`}
                        >
                          📝 {day.note}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: '0.73rem',
                            color: 'var(--color-text-subtle)',
                            textAlign: 'center',
                            cursor: 'pointer',
                          }}
                          onClick={() => setEditingDayNote({ date: day.dateStr, note: '', displayDate: day.displayDate })}
                        >
                          + Ghi chú
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredScheduleDays.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  Không có ngày nào phù hợp với bộ lọc trong tháng này.
                </div>
              )}
            </div>
          )}

          {/* MAIN VIEW: Table View */}
          {scheduleViewMode === 'table' && (
            <div className="form-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '18px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Ngày nướng bánh</th>
                      <th>Trạng thái nhận đơn</th>
                      <th style={{ width: '190px' }}>Giới hạn đơn tối đa</th>
                      <th style={{ width: '220px' }}>Tiến độ đơn đã đặt</th>
                      <th>Ghi chú</th>
                      <th style={{ textAlign: 'center', width: '130px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScheduleDays.map((day) => (
                      <tr key={day.dateStr} className={!day.isOpen ? 'is-closed' : ''}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: day.isWeekend ? 'var(--color-accent-terracotta)' : 'var(--color-primary)' }}>
                              {day.weekdayName}
                            </span>
                            <span style={{ color: 'var(--color-text-main)', fontSize: '0.92rem' }}>
                              {day.displayDate}
                            </span>
                            {day.isToday && <span className="badge-pill-tag today">Hôm nay</span>}
                            {day.isCustom && <span className="badge-pill-tag custom">Tùy chỉnh</span>}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`btn-day-toggle ${day.isOpen ? 'on' : 'off'}`}
                            onClick={() => handleToggleDay(day.dateStr)}
                            style={{ width: 'auto', padding: '6px 14px' }}
                          >
                            {day.isOpen ? (
                              <>
                                <Check size={14} /> MỞ ĐƠN (ON)
                              </>
                            ) : (
                              <>
                                <X size={14} /> TẠM ĐÓNG (OFF)
                              </>
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="schedule-stepper-controls" style={{ maxWidth: '140px' }}>
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleUpdateDayQuota(day.dateStr, Math.max(0, day.maxOrders - 1))}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="stepper-input"
                              value={day.maxOrders}
                              onChange={(e) => handleUpdateDayQuota(day.dateStr, e.target.value)}
                            />
                            <button
                              type="button"
                              className="stepper-btn"
                              onClick={() => handleUpdateDayQuota(day.dateStr, day.maxOrders + 1)}
                            >
                              +
                            </button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>đơn</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600 }}>
                              <span>{day.count} / {day.maxOrders} đơn</span>
                              <span>
                                {!day.isOpen ? (
                                  <span style={{ color: 'var(--color-text-muted)' }}>⚪ Tạm ngưng</span>
                                ) : day.isFull ? (
                                  <span style={{ color: '#DC2626' }}>🔴 ĐÃ ĐỦ ĐƠN</span>
                                ) : (
                                  <span style={{ color: '#2E7D32' }}>Còn {day.maxOrders - day.count} chỗ</span>
                                )}
                              </span>
                            </div>
                            <div className="schedule-progress-bar-bg" style={{ height: '6px' }}>
                              <div
                                className={`schedule-progress-bar-fill ${
                                  day.isFull ? 'full' : day.count >= day.maxOrders * 0.7 ? 'warning' : 'normal'
                                }`}
                                style={{
                                  width: `${day.maxOrders > 0 ? Math.min(100, Math.round((day.count / day.maxOrders) * 100)) : 0}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{ cursor: 'pointer', fontSize: '0.88rem', color: day.note ? 'var(--color-text-main)' : 'var(--color-text-subtle)' }}
                            onClick={() => setEditingDayNote({ date: day.dateStr, note: day.note, displayDate: day.displayDate })}
                            title="Nhấp để sửa ghi chú"
                          >
                            {day.note ? `📝 ${day.note}` : '+ Thêm ghi chú...'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {day.count > 0 ? (
                            <button
                              type="button"
                              className="btn-view-day-orders"
                              onClick={() => setViewOrdersModalDay(day)}
                              style={{ width: 'auto', padding: '6px 12px' }}
                            >
                              <Eye size={13} /> {day.count} đơn
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LOẠI COOKIE */}
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

      {/* Modal: View Orders for Specific Date */}
      {viewOrdersModalDay && (
        <div className="modal-backdrop" onClick={() => setViewOrdersModalDay(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  Đơn Hàng Ngày {viewOrdersModalDay.displayDate}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  {viewOrdersModalDay.weekdayName} — Tổng cộng {viewOrdersModalDay.count} / {viewOrdersModalDay.maxOrders} đơn
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewOrdersModalDay(null)}
                style={{ padding: '6px 12px' }}
              >
                <X size={18} />
              </button>
            </div>

            {viewOrdersModalDay.orders.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Chưa có đơn hàng nào cho ngày này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {viewOrdersModalDay.orders.map((ord) => {
                  const statusMeta = ORDER_STATUS_MAP[ord.status] || ORDER_STATUS_MAP.pending;
                  return (
                    <div
                      key={ord.id}
                      style={{
                        background: '#FAF6F0',
                        border: '1px solid var(--card-border)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1.05rem' }}>
                            {ord.code}
                          </span>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: statusMeta.bgColor,
                              color: statusMeta.color,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-main)', marginTop: '4px' }}>
                          <strong>{ord.customer_name}</strong> — {ord.phone}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-accent-terracotta)', fontSize: '1.02rem' }}>
                          {formatMoney(ord.total_price)}
                        </div>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setOrderDateFilter(viewOrdersModalDay.dateStr);
                            setActiveTab('orders');
                            setViewOrdersModalDay(null);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            marginTop: '4px',
                            borderRadius: 'var(--pill-radius)',
                          }}
                        >
                          Xem chi tiết đơn
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setViewOrdersModalDay(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Day Note */}
      {editingDayNote && (
        <div className="modal-backdrop" onClick={() => setEditingDayNote(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 className="modal-title" style={{ marginBottom: '10px' }}>
              Ghi Chú Ngày {editingDayNote.displayDate}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Ghi chú nội bộ cho riêng ngày này (ví dụ: Nghỉ bảo trì lò nướng, Tăng ca đơn sự kiện, v.v.)
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveNote(editingDayNote.date, editingDayNote.note);
              }}
            >
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  value={editingDayNote.note}
                  onChange={(e) => setEditingDayNote({ ...editingDayNote, note: e.target.value })}
                  placeholder="Nhập ghi chú cho ngày..."
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingDayNote(null)}
                >
                  HỦY
                </button>
                <button type="submit" className="btn-primary">
                  LƯU GHI CHÚ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Batch Update Schedule */}
      {batchModalOpen && (
        <div className="modal-backdrop" onClick={() => setBatchModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 className="modal-title" style={{ marginBottom: '12px' }}>
              Thao Tác Hàng Loạt ({uniqueMonthGroups[selectedMonthIndex]})
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '18px' }}>
              Áp dụng nhanh thay đổi cho tất cả các ngày trong tháng <strong>{uniqueMonthGroups[selectedMonthIndex]}</strong>:
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExecuteBatchAction();
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--card-border)',
                    background: batchActionType === 'open_weekdays' ? '#FBF7F2' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="batchAction"
                    value="open_weekdays"
                    checked={batchActionType === 'open_weekdays'}
                    onChange={() => setBatchActionType('open_weekdays')}
                  />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-primary)' }}>
                      🟢 Mở nhận đơn tất cả Thứ 2 - Thứ 6
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      Chuyển tất cả ngày trong tuần sang trạng thái MỞ (ON).
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--card-border)',
                    background: batchActionType === 'close_weekends' ? '#FBF7F2' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="batchAction"
                    value="close_weekends"
                    checked={batchActionType === 'close_weekends'}
                    onChange={() => setBatchActionType('close_weekends')}
                  />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-primary)' }}>
                      ⚪ Đóng tất cả Thứ 7 & Chủ Nhật
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      Chuyển tất cả ngày cuối tuần trong tháng sang trạng thái TẮT (OFF).
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--card-border)',
                    background: batchActionType === 'set_month_quota' ? '#FBF7F2' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="batchAction"
                    value="set_month_quota"
                    checked={batchActionType === 'set_month_quota'}
                    onChange={() => setBatchActionType('set_month_quota')}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', color: 'var(--color-primary)' }}>
                      🎯 Đặt số lượng đơn nhận cho cả tháng
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>Nhận tối đa:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        value={batchCustomQuota}
                        onChange={(e) => setBatchCustomQuota(parseInt(e.target.value, 10) || 0)}
                        style={{ width: '60px', padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}
                        disabled={batchActionType !== 'set_month_quota'}
                      />
                      <span style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>đơn/ngày</span>
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--card-border)',
                    background: batchActionType === 'reset_month' ? '#FBF7F2' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="batchAction"
                    value="reset_month"
                    checked={batchActionType === 'reset_month'}
                    onChange={() => setBatchActionType('reset_month')}
                  />
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-primary)' }}>
                      🔄 Đặt lại tất cả về mặc định
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      Xóa toàn bộ tùy chỉnh riêng của tháng này và áp dụng quy tắc mặc định của tiệm.
                    </span>
                  </div>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setBatchModalOpen(false)}
                >
                  HỦY
                </button>
                <button type="submit" className="btn-primary" disabled={savingSchedule}>
                  {savingSchedule ? 'ĐANG ÁP DỤNG...' : 'ÁP DỤNG NGAY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
