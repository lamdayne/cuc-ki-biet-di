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
 * Generates an array of 31 consecutive date strings (YYYY-MM-DD)
 * starting from today in Asia/Ho_Chi_Minh
 */
export function getUpcoming31Days(referenceDate = new Date()) {
  const todayStr = getTodayVietnamString(referenceDate);
  const [year, month, day] = todayStr.split('-').map(Number);

  const dates = [];
  // Use UTC dates offset to avoid local daylight savings bugs
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  for (let i = 0; i < 31; i++) {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayOfMonth}`;

    const dayOfWeek = d.getUTCDay();
    const weekdayName = VIETNAMESE_WEEKDAYS[dayOfWeek];
    const monthGroup = `Tháng ${d.getUTCMonth() + 1}/${y}`;
    const displayDate = `${dayOfMonth}/${m}/${y}`;

    dates.push({
      dateStr,
      weekdayName,
      monthGroup,
      displayDate,
      isToday: i === 0,
    });
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
