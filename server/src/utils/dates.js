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

/**
 * Generates an array of 31 upcoming weekday date strings (YYYY-MM-DD, Thứ 2 đến Thứ 6)
 * starting from today (or the next available Monday if today is a weekend) in Asia/Ho_Chi_Minh.
 * Completely excludes Saturday and Sunday.
 */
export function getUpcoming31Days(referenceDate = new Date()) {
  const todayStr = getTodayVietnamString(referenceDate);
  const [year, month, day] = todayStr.split('-').map(Number);

  const dates = [];
  // Use UTC dates offset to avoid local daylight savings bugs
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  let offsetDays = 0;
  while (dates.length < 31 && offsetDays < 70) {
    const d = new Date(base.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getUTCDay();

    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      offsetDays++;
      continue;
    }

    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayOfMonth}`;

    const weekdayName = VIETNAMESE_WEEKDAYS[dayOfWeek];
    const monthGroup = `Tháng ${d.getUTCMonth() + 1}/${y}`;
    const displayDate = `${dayOfMonth}/${m}/${y}`;

    dates.push({
      dateStr,
      weekdayName,
      monthGroup,
      displayDate,
      isToday: dateStr === todayStr,
    });

    offsetDays++;
  }

  return dates;
}

/**
 * Validates if the given date string (YYYY-MM-DD) falls between today and today + 30 days
 */
export function isWithinValidPickupWindow(dateStr, referenceDate = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const validDates = getUpcoming31Days(referenceDate);
  return validDates.some((d) => d.dateStr === dateStr);
}

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
 * Checks if order placement is currently allowed (Monday to Friday only)
 */
export function isOrderingAllowed(referenceDate = new Date()) {
  return !isWeekendInVietnam(referenceDate);
}

/**
 * Provides structured schedule info for UI badges and API responses
 */
export function getOrderingScheduleInfo(referenceDate = new Date()) {
  const dow = getVietnamDayOfWeek(referenceDate);
  const isOpen = !isWeekendInVietnam(referenceDate);
  const todayWeekday = VIETNAMESE_WEEKDAYS[dow];
  return {
    isOpen,
    todayWeekday,
    allowedDaysText: 'Thứ 2 đến Thứ 6',
    closedDaysText: 'Thứ 7 & Chủ Nhật',
    message: isOpen
      ? 'Tiệm đang nhận đặt bánh (nhận đơn Thứ 2 - Thứ 6)'
      : 'Tiệm CÚC-KI chỉ nhận đặt hàng từ Thứ 2 đến Thứ 6. Thứ 7 và Chủ Nhật tiệm tạm đóng cổng đặt đơn.',
  };
}
