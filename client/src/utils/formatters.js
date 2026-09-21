/**
 * Format monetary amount in Vietnamese Dong
 * Uses Intl.NumberFormat vi-VN with suffix 'đ'
 */
const vnCurrencyFormatter = new Intl.NumberFormat('vi-VN');

export function formatMoney(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0đ';
  }
  return `${vnCurrencyFormatter.format(amount)}đ`;
}

/**
 * Format status labels and badge color styles
 */
export const ORDER_STATUS_MAP = {
  pending: {
    label: 'Chờ xác nhận',
    step: 1,
    badgeBg: '#FFF3E0',
    badgeText: '#B76E00',
    borderColor: '#FFE0B2',
  },
  confirmed: {
    label: 'Đã xác nhận',
    step: 2,
    badgeBg: '#E3F2FD',
    badgeText: '#1565C0',
    borderColor: '#BBDEFB',
  },
  baking: {
    label: 'Đang làm bánh',
    step: 3,
    badgeBg: '#F3E5F5',
    badgeText: '#7B1FA2',
    borderColor: '#E1BEE7',
  },
  ready: {
    label: 'Sẵn sàng nhận bánh',
    step: 4,
    badgeBg: '#E8F5E9',
    badgeText: '#2E7D32',
    borderColor: '#C8E6C9',
  },
  done: {
    label: 'Hoàn thành',
    step: 5,
    badgeBg: '#E0F2F1',
    badgeText: '#00695C',
    borderColor: '#B2DFDB',
  },
  cancelled: {
    label: 'Đã hủy',
    step: -1,
    badgeBg: '#FFEBEE',
    badgeText: '#C62828',
    borderColor: '#FFCDD2',
  },
};
