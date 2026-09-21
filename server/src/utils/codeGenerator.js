import crypto from 'crypto';

const UNAMBIGUOUS_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an order code in format: CK-DDMMYY-XXXX
 * - DDMMYY from provided date or today in Asia/Ho_Chi_Minh
 * - XXXX: 4 random characters excluding confusing characters (0, O, 1, I)
 */
export function generateOrderCode(date = new Date()) {
  // Format DDMMYY in Vietnam timezone
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const year = parts.find((p) => p.type === 'year')?.value || '26';

  const datePart = `${day}${month}${year}`;

  const randomBytes = crypto.randomBytes(4);
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    const index = randomBytes[i] % UNAMBIGUOUS_CHARS.length;
    randomPart += UNAMBIGUOUS_CHARS[index];
  }

  return `CK-${datePart}-${randomPart}`;
}
