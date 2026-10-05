import { describe, expect, test } from 'bun:test';
import { isBackdated } from '@/lib/date-utils';

describe('Booking API validation logic', () => {
  const fixedNow = new Date('2026-10-05T14:30:00+07:00'); // 14:30 Bangkok time

  test('rejects booking on a past date for public user', () => {
    const result = isBackdated('2026-10-04', '09:00', 'Asia/Bangkok', fixedNow);
    expect(result.isBackdated).toBe(true);
    expect(result.reason).toBe('PAST_DATE');
    
    // Test the corresponding error message mapping
    const errorMessage = result.reason === 'PAST_DATE'
      ? 'ไม่อนุญาตให้จองย้อนหลัง กรุณาเลือกวันที่ปัจจุบันหรือในอนาคต'
      : 'เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต';
    expect(errorMessage).toBe('ไม่อนุญาตให้จองย้อนหลัง กรุณาเลือกวันที่ปัจจุบันหรือในอนาคต');
  });

  test('rejects booking with past startTime on current date for public user', () => {
    const result = isBackdated('2026-10-05', '13:00', 'Asia/Bangkok', fixedNow);
    expect(result.isBackdated).toBe(true);
    expect(result.reason).toBe('PAST_TIME');

    const errorMessage = result.reason === 'PAST_DATE'
      ? 'ไม่อนุญาตให้จองย้อนหลัง กรุณาเลือกวันที่ปัจจุบันหรือในอนาคต'
      : 'เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต';
    expect(errorMessage).toBe('เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต');
  });

  test('rejects booking where startTime equals current time', () => {
    const result = isBackdated('2026-10-05', '14:30', 'Asia/Bangkok', fixedNow);
    expect(result.isBackdated).toBe(true);
    expect(result.reason).toBe('PAST_TIME');
  });

  test('allows booking with future startTime on current date', () => {
    const result = isBackdated('2026-10-05', '15:00', 'Asia/Bangkok', fixedNow);
    expect(result.isBackdated).toBe(false);
  });

  test('allows booking on future dates regardless of time', () => {
    const result = isBackdated('2026-10-06', '08:00', 'Asia/Bangkok', fixedNow);
    expect(result.isBackdated).toBe(false);
  });

  test('admin session bypass simulation', () => {
    const adminSession = { role: 'ADMIN', fullName: 'Staff' };
    const superAdminSession = { role: 'SUPER_ADMIN', fullName: 'Super' };
    const publicUserSession = null;

    const shouldBypass = (session: any) =>
      session?.role === 'ADMIN' || session?.role === 'SUPER_ADMIN';

    expect(shouldBypass(adminSession)).toBe(true);
    expect(shouldBypass(superAdminSession)).toBe(true);
    expect(shouldBypass(publicUserSession)).toBe(false);
  });
});
