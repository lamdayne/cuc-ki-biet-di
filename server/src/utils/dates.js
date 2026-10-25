const TIMEZONE = 'Asia/Ho_Chi_Minh';

const VIETNAMESE_WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

/**
 * Gets the current date string (YYYY-MM-DD) in Asia/Ho_Chi_Minh
 */
export function getTodayVietnamString(referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(referenceDate);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export const DEFAULT_DAILY_SETTINGS = {
  default_max_orders: 4,
  allow_weekend_ordering: true,
  day_configs: {},
};

/**
 * Gets day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * in Asia/Ho_Chi_Minh timezone
 */
export function getVietnamDayOfWeek(referenceDate = new Date()) {
  const todayStr = getTodayVietnamString(referenceDate);
  const [year, month, day] = todayStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.getUTCDay();
}

/**
 * Checks if the reference date in Vietnam falls on a weekend (Saturday or Sunday)
 */
export function isWeekendInVietnam(referenceDate = new Date()) {
  const dow = getVietnamDayOfWeek(referenceDate);
  return dow === 0 || dow === 6;
}

/**
 * Resolves the configuration for a specific date (isOpen, maxOrders, note, isCustom)
 */
export function resolveDateConfig(dateStr, scheduleSettings = null) {
  const settings = scheduleSettings || DEFAULT_DAILY_SETTINGS;
  const defaultMax = Number(settings.default_max_orders) >= 0 ? Number(settings.default_max_orders) : 4;
  const allowWeekend = Boolean(settings.allow_weekend_ordering);
  const dayConfigs = settings.day_configs || {};

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const override = dayConfigs[dateStr];
  if (override) {
    const isOpen = typeof override.is_open === 'boolean' ? override.is_open : true;
    const maxOrders = typeof override.max_orders === 'number' ? override.max_orders : defaultMax;
    return {
      isOpen,
      maxOrders,
      note: override.note || '',
      isCustom: true,
      isWeekend,
      dayOfWeek,
    };
  }

  return {
    isOpen: isWeekend ? allowWeekend : true,
    maxOrders: defaultMax,
    note: '',
    isCustom: false,
    isWeekend,
    dayOfWeek,
  };
}

/**
 * Generates an array of upcoming calendar days starting from today in Asia/Ho_Chi_Minh.
 * Includes both weekdays and weekends with dynamic resolution of open/closed status and max quotas.
 */
export function getUpcomingDays(referenceDate = new Date(), totalDays = 42, scheduleSettings = null) {
  const todayStr = getTodayVietnamString(referenceDate);
  const [year, month, day] = todayStr.split('-').map(Number);

  const dates = [];
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  for (let offset = 0; offset < totalDays; offset++) {
    const d = new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getUTCDay();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayOfMonth}`;

    const weekdayName = VIETNAMESE_WEEKDAYS[dayOfWeek];
    const monthGroup = `Tháng ${d.getUTCMonth() + 1}/${y}`;
    const displayDate = `${dayOfMonth}/${m}/${y}`;
    const resolved = resolveDateConfig(dateStr, scheduleSettings);

    dates.push({
      dateStr,
      weekdayName,
      monthGroup,
      displayDate,
      dayOfWeek,
      isWeekend: resolved.isWeekend,
      isToday: dateStr === todayStr,
      isOpen: resolved.isOpen,
      maxOrders: resolved.maxOrders,
      note: resolved.note,
      isCustom: resolved.isCustom,
    });
  }

  return dates;
}

/**
 * Returns upcoming baking days for customer ordering.
 * The bakery bakes from Monday to Friday only, so Saturday and Sunday are excluded from the list.
 * Returns 31 upcoming weekday dates.
 */
export function getUpcoming31Days(referenceDate = new Date(), scheduleSettings = null, totalDays = 31) {
  const allDays = getUpcomingDays(referenceDate, 60, scheduleSettings);
  return allDays.filter((d) => !d.isWeekend).slice(0, totalDays);
}

/**
 * Validates if the given date string (YYYY-MM-DD) falls within the valid upcoming baking window
 */
export function isWithinValidPickupWindow(dateStr, referenceDate = new Date(), scheduleSettings = null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const validDates = getUpcoming31Days(referenceDate, scheduleSettings);
  return validDates.some((d) => d.dateStr === dateStr);
}

/**
 * Checks if order placement is currently allowed.
 * Ordering is always open (including weekends) to allow pre-orders for upcoming baking days.
 */
export function isOrderingAllowed(_referenceDate = new Date(), _scheduleSettings = null) {
  return true;
}

/**
 * Provides structured schedule info for UI badges and API responses
 */
export function getOrderingScheduleInfo(referenceDate = new Date(), _scheduleSettings = null) {
  const dow = getVietnamDayOfWeek(referenceDate);
  const todayWeekday = VIETNAMESE_WEEKDAYS[dow];

  return {
    isOpen: true,
    todayWeekday,
    allowedDaysText: 'Mở nhận đơn 24/7 (kể cả Thứ 7 & Chủ Nhật)',
    closedDaysText: 'Không có (Đặt trước xuyên suốt)',
    bakingDaysText: 'Nướng bánh từ Thứ 2 đến Thứ 6',
    message: 'Tiệm đang mở nhận đơn (Nướng bánh Thứ 2 – Thứ 6)',
  };
}
