/**
 * Utility functions for date formatting and manipulation across the reservation system.
 */

/**
 * Converts a date string (YYYY-MM-DD) into DD-MM-YYYY in Thai Buddhist Era (พ.ศ.).
 * Example: "2026-10-02" -> "02-10-2569"
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  // Handle standard YYYY-MM-DD
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const yearCE = parseInt(match[1], 10);
    const month = match[2];
    const day = match[3];
    const yearBE = yearCE + 543;
    return `${day}-${month}-${yearBE}`;
  }

  // Handle Date objects or ISO strings
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const yearBE = parsed.getFullYear() + 543;
    return `${day}-${month}-${yearBE}`;
  }

  return dateStr;
}

/**
 * Returns searchable representation of dates so users can search
 * by DD-MM-YYYY (พ.ศ.), YYYY-MM-DD (ค.ศ.), DD/MM/YYYY, etc.
 */
export function getSearchableDateVariants(dateStr: string | null | undefined): string[] {
  if (!dateStr) return [];
  const variants = [dateStr.toLowerCase()];
  const formatted = formatDisplayDate(dateStr);
  if (formatted !== dateStr) {
    variants.push(formatted.toLowerCase());
    variants.push(formatted.replace(/-/g, '/').toLowerCase());
  }
  return variants;
}

export const DEFAULT_TIMEZONE = 'Asia/Bangkok';

/**
 * Resolves a valid IANA timezone string, falling back to 'Asia/Bangkok' if invalid or empty.
 */
export function resolveTimezone(timezone?: string | null): string {
  const value = timezone?.trim() || DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Returns current date (YYYY-MM-DD) and current time (HH:mm) in the specified timezone.
 */
export function getNowInTimezone(
  timezone?: string | null,
  referenceDate: Date = new Date()
): { dateStr: string; timeStr: string } {
  const tz = resolveTimezone(timezone);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value;
    }
  }

  let hour = partMap.hour || '00';
  if (hour === '24') hour = '00';

  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeStr = `${hour}:${partMap.minute || '00'}`;

  return { dateStr, timeStr };
}

export interface BackdatedCheckResult {
  isBackdated: boolean;
  reason?: 'PAST_DATE' | 'PAST_TIME';
}

/**
 * Checks whether a booking date and start time are backdated according to the configured timezone.
 * Returns { isBackdated: true, reason: 'PAST_DATE' | 'PAST_TIME' } or { isBackdated: false }.
 */
export function isBackdated(
  bookingDate: string,
  startTime: string,
  timezone?: string | null,
  referenceDate: Date = new Date()
): BackdatedCheckResult {
  const { dateStr: todayStr, timeStr: nowTimeStr } = getNowInTimezone(timezone, referenceDate);

  if (bookingDate < todayStr) {
    return { isBackdated: true, reason: 'PAST_DATE' };
  }

  if (bookingDate === todayStr && startTime <= nowTimeStr) {
    return { isBackdated: true, reason: 'PAST_TIME' };
  }

  return { isBackdated: false };
}

