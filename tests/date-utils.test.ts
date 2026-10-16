import { describe, expect, test } from 'bun:test';
import {
  resolveTimezone,
  getNowInTimezone,
  isBackdated,
  formatDisplayDate,
  getSearchableDateVariants,
} from '@/lib/date-utils';

describe('date-utils timezone & backdate functions', () => {
  test('resolveTimezone returns valid timezone or fallback', () => {
    expect(resolveTimezone('Asia/Bangkok')).toBe('Asia/Bangkok');
    expect(resolveTimezone('America/New_York')).toBe('America/New_York');
    expect(resolveTimezone(undefined)).toBe('Asia/Bangkok');
    expect(resolveTimezone(null)).toBe('Asia/Bangkok');
    expect(resolveTimezone('   ')).toBe('Asia/Bangkok');
    expect(resolveTimezone('Invalid/Zone')).toBe('Asia/Bangkok');
  });

  test('getNowInTimezone returns valid dateStr and timeStr', () => {
    const { dateStr, timeStr } = getNowInTimezone('Asia/Bangkok');
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(timeStr).toMatch(/^\d{2}:\d{2}$/);
  });

  test('isBackdated flags strictly past dates', () => {
    // Reference time in Bangkok: 2026-10-05 16:00
    const fixedNow = new Date('2026-10-05T16:00:00+07:00');
    
    // Yesterday
    const resYesterday = isBackdated('2026-10-04', '10:00', 'Asia/Bangkok', fixedNow);
    expect(resYesterday.isBackdated).toBe(true);
    expect(resYesterday.reason).toBe('PAST_DATE');

    // Past month
    const resPastMonth = isBackdated('2026-09-30', '14:00', 'Asia/Bangkok', fixedNow);
    expect(resPastMonth.isBackdated).toBe(true);
    expect(resPastMonth.reason).toBe('PAST_DATE');
  });

  test('isBackdated flags past time slots on current date', () => {
    // Reference time in Bangkok: 2026-10-05 16:00
    const fixedNow = new Date('2026-10-05T16:00:00+07:00');

    // 14:00 earlier today
    const resPastTime = isBackdated('2026-10-05', '14:00', 'Asia/Bangkok', fixedNow);
    expect(resPastTime.isBackdated).toBe(true);
    expect(resPastTime.reason).toBe('PAST_TIME');

    // Exactly 16:00 (has already arrived / not future)
    const resExact = isBackdated('2026-10-05', '16:00', 'Asia/Bangkok', fixedNow);
    expect(resExact.isBackdated).toBe(true);
    expect(resExact.reason).toBe('PAST_TIME');
  });

  test('isBackdated allows upcoming time slots today and future dates', () => {
    // Reference time in Bangkok: 2026-10-05 16:00
    const fixedNow = new Date('2026-10-05T16:00:00+07:00');

    // 17:00 today
    const resFutureToday = isBackdated('2026-10-05', '17:00', 'Asia/Bangkok', fixedNow);
    expect(resFutureToday.isBackdated).toBe(false);
    expect(resFutureToday.reason).toBeUndefined();

    // Tomorrow
    const resTomorrow = isBackdated('2026-10-06', '08:00', 'Asia/Bangkok', fixedNow);
    expect(resTomorrow.isBackdated).toBe(false);
    expect(resTomorrow.reason).toBeUndefined();
  });
});

import { buildGoogleCalendarUrl, generateIcsContent } from '@/lib/calendar-export';

describe('Calendar Export functions (buildGoogleCalendarUrl & generateIcsContent)', () => {
  const sampleBooking = {
    bookingCode: 'KMUTNB-2026-0001-9999',
    date: '2026-10-20',
    startTime: '09:00',
    endTime: '12:00',
    fullName: 'สมหญิง จริงใจ',
    department: 'คณะครุศาสตร์อุตสาหกรรม',
    reason: 'สัมมนาวิชาการนักศึกษา',
    status: 'APPROVED',
  };

  test('buildGoogleCalendarUrl builds valid Google Calendar URL', () => {
    const url = buildGoogleCalendarUrl(sampleBooking);
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('dates=20261020T090000%2F20261020T120000');
    expect(url).toContain('ctz=Asia%2FBangkok');
    expect(url).toContain('KMUTNB-2026-0001-9999');
  });

  test('generateIcsContent generates valid RFC 5545 string', () => {
    const ics = generateIcsContent(sampleBooking);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:KMUTNB-2026-0001-9999@sc.kmutnb.ac.th');
    expect(ics).toContain('DTSTART;TZID=Asia/Bangkok:20261020T090000');
    expect(ics).toContain('DTEND;TZID=Asia/Bangkok:20261020T120000');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT30M');
    expect(ics).toContain('END:VALARM');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  test('generateIcsContent marks PENDING bookings as TENTATIVE', () => {
    const ics = generateIcsContent({ ...sampleBooking, status: 'PENDING' });
    expect(ics).toContain('STATUS:TENTATIVE');
  });
});

