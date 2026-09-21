const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Include admin Bearer token for seamless cross-site authentication
  const adminToken = localStorage.getItem('admin_token');
  if (adminToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Public
  getMenu() {
    return request('/api/menu');
  },

  getPickupAvailability() {
    return request('/api/pickup-availability');
  },

  createOrder(payload) {
    return request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  lookupOrder(rawCode) {
    let code = (rawCode || '').trim().toUpperCase().replace(/[\u2013\u2014]/g, '-');
    if (!code.startsWith('CK-') && /^\d{6}/.test(code)) {
      code = `CK-${code}`;
    }
    return request(`/api/orders/${encodeURIComponent(code)}`);
  },

  // Admin
  async adminLogin(pin) {
    const res = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res?.token) {
      localStorage.setItem('admin_token', res.token);
    }
    return res;
  },

  async adminLogout() {
    try {
      await request('/api/admin/logout', {
        method: 'POST',
      });
    } finally {
      localStorage.removeItem('admin_token');
    }
  },

  checkAdminAuth() {
    return request('/api/admin/check-auth');
  },

  getAdminOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.pickupDate) params.append('pickupDate', filters.pickupDate);
    if (filters.status) params.append('status', filters.status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/admin/orders${queryString}`);
  },

  updateOrderStatus(id, status) {
    return request(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getAdminCategories() {
    return request('/api/admin/categories');
  },

  createCategory(categoryData) {
    return request('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  updateCategory(id, categoryData) {
    return request(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  },

  deleteCategory(id) {
    return request(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    });
  },

  uploadCategoryImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    return request('/api/admin/categories/upload-image', {
      method: 'POST',
      body: formData,
    });
  },

  getAdminProducts(categoryId = null) {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    return request(`/api/admin/products${query}`);
  },

  createProduct(productData) {
    return request('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  updateProduct(id, productData) {
    return request(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  },

  deleteProduct(id) {
    return request(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });
  },
};
