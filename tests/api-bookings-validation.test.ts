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

import { validateBookingInput } from '@/lib/booking-validation';

describe('Shared Booking Input Validation (validateBookingInput)', () => {
  const fixedNow = new Date('2026-10-05T14:30:00+07:00');

  const validPayload = {
    date: '2026-10-06',
    startTime: '09:00',
    endTime: '11:00',
    fullName: 'สมชาย สายตรวจ',
    studentId: '1234567890123',
    email: 'somchai@kmutnb.ac.th',
    phone: '0812345678',
    department: 'คณะวิศวกรรมศาสตร์',
    reason: 'ประชุมจัดทำโครงการพัฒนาศักยภาพผู้นำนักศึกษา',
  };

  test('valid payload passes validation', () => {
    const res = validateBookingInput(validPayload, { referenceDate: fixedNow });
    expect(res.isValid).toBe(true);
    expect(res.firstError).toBeUndefined();
    expect(res.sanitized?.studentId).toBe('1234567890123');
  });

  test('rejects studentId that is not 13 digits', () => {
    const res1 = validateBookingInput({ ...validPayload, studentId: '12345' }, { referenceDate: fixedNow });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.studentId).toContain('13 หลัก');

    const res2 = validateBookingInput({ ...validPayload, studentId: '123456789012a' }, { referenceDate: fixedNow });
    expect(res2.isValid).toBe(false);
  });

  test('rejects invalid Thai phone numbers', () => {
    const res1 = validateBookingInput({ ...validPayload, phone: '123456789' }, { referenceDate: fixedNow });
    expect(res1.isValid).toBe(false);
    expect(res1.errors.phone).toContain('ขึ้นต้นด้วย 0');

    // Valid formats with hyphens get sanitized
    const res2 = validateBookingInput({ ...validPayload, phone: '081-234-5678' }, { referenceDate: fixedNow });
    expect(res2.isValid).toBe(true);
    expect(res2.sanitized?.phone).toBe('0812345678');
  });

  test('rejects invalid email formats', () => {
    const res = validateBookingInput({ ...validPayload, email: 'invalid-email' }, { referenceDate: fixedNow });
    expect(res.isValid).toBe(false);
    expect(res.errors.email).toBe('รูปแบบอีเมลไม่ถูกต้อง');
  });

  test('rejects startTime >= endTime', () => {
    const res = validateBookingInput({ ...validPayload, startTime: '12:00', endTime: '12:00' }, { referenceDate: fixedNow });
    expect(res.isValid).toBe(false);
    expect(res.errors.endTime).toBe('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
  });

  test('rejects backdated bookings for public users but allows when checkBackdated is false (admin)', () => {
    const pastPayload = { ...validPayload, date: '2026-10-04' };

    const publicRes = validateBookingInput(pastPayload, {
      checkBackdated: true,
      referenceDate: fixedNow,
    });
    expect(publicRes.isValid).toBe(false);
    expect(publicRes.errors.date).toContain('ไม่อนุญาตให้จองย้อนหลัง');

    const adminRes = validateBookingInput(pastPayload, {
      checkBackdated: false,
      referenceDate: fixedNow,
    });
    expect(adminRes.isValid).toBe(true);
  });

  test('validates required length for fullName, department, and reason', () => {
    const res = validateBookingInput({
      ...validPayload,
      fullName: 'A',
      department: 'B',
      reason: 'สั้น',
    }, { referenceDate: fixedNow });

    expect(res.isValid).toBe(false);
    expect(res.errors.fullName).toBeDefined();
    expect(res.errors.department).toBeDefined();
    expect(res.errors.reason).toBeDefined();
  });
});
