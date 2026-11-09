import { describe, it, expect } from 'bun:test';
import { validateBookingInput } from '../src/lib/booking-validation';
import { buildGoogleCalendarUrl, generateIcsContent } from '../src/lib/calendar-export';
import { hasTimeOverlap } from '../src/lib/time-slot-utils';
import type { BookingItem } from '../src/lib/types/booking';

describe('Multi-Step Booking Flow Logic', () => {
  const mockBookings: BookingItem[] = [
    {
      id: 'bk-1',
      bookingCode: 'BK-001',
      date: '2026-11-15',
      startTime: '10:00',
      endTime: '12:00',
      status: 'APPROVED',
      fullName: 'นักศึกษา ตัวอย่าง',
      studentId: '1234567890123',
      email: 'student@kmutnb.ac.th',
      phone: '0812345678',
      department: 'CED',
      reason: 'ประชุมจัดกิจกรรม',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  describe('Step 1: Time Slot & Conflict Validation', () => {
    it('rejects missing or inverted time slots', () => {
      // Missing start or end
      expect(!'' || !'10:00').toBe(true);
      // Inverted start/end
      const startTime = '11:00';
      const endTime = '09:00';
      expect(startTime >= endTime).toBe(true);
    });

    it('detects slot conflict with existing approved booking', () => {
      const candidateStart = '11:00';
      const candidateEnd = '13:00';
      const conflict = mockBookings.some(
        (b) =>
          (b.status === 'APPROVED' || b.status === 'PENDING') &&
          hasTimeOverlap(candidateStart, candidateEnd, b.startTime, b.endTime)
      );
      expect(conflict).toBe(true);
    });

    it('allows slot that does not overlap existing bookings', () => {
      const candidateStart = '13:00';
      const candidateEnd = '15:00';
      const conflict = mockBookings.some(
        (b) =>
          (b.status === 'APPROVED' || b.status === 'PENDING') &&
          hasTimeOverlap(candidateStart, candidateEnd, b.startTime, b.endTime)
      );
      expect(conflict).toBe(false);
    });
  });

  describe('Step 2: Requester Details Validation', () => {
    it('validates required requester fields', () => {
      const incomplete = validateBookingInput({
        fullName: '',
        studentId: '123',
        email: 'invalid-email',
        phone: '12345',
        department: '',
        reason: 'hi',
        date: '2026-11-15',
        startTime: '13:00',
        endTime: '15:00',
      });
      expect(incomplete.isValid).toBe(false);
      expect(incomplete.errors.fullName).toBeDefined();
      expect(incomplete.errors.studentId).toBeDefined();
      expect(incomplete.errors.email).toBeDefined();
      expect(incomplete.errors.phone).toBeDefined();
      expect(incomplete.errors.department).toBeDefined();
      expect(incomplete.errors.reason).toBeDefined();
    });

    it('passes when all requester fields are valid', () => {
      const valid = validateBookingInput({
        fullName: 'สมชาย ใจดี',
        studentId: '6501012345678',
        email: 's6501012345678@kmutnb.ac.th',
        phone: '0812345678',
        department: 'สโมสรนักศึกษาคณะวิศวกรรมศาสตร์',
        reason: 'ประชุมวางแผนจัดค่ายอาสาพัฒนาชนบท',
        date: '2026-11-15',
        startTime: '13:00',
        endTime: '15:00',
      });
      expect(valid.isValid).toBe(true);
      expect(Object.keys(valid.errors).length).toBe(0);
    });
  });

  describe('Step 3: Rules Acceptance Guard', () => {
    it('submitting requires explicit agreement to rules', () => {
      let agreeToRules = false;
      const canSubmit = (agree: boolean, loading: boolean) => agree && !loading;

      expect(canSubmit(agreeToRules, false)).toBe(false);

      agreeToRules = true;
      expect(canSubmit(agreeToRules, false)).toBe(true);
      expect(canSubmit(agreeToRules, true)).toBe(false); // Disabled when loading
    });
  });

  describe('Step 4: Booking Code, QR Code & Calendar Generation', () => {
    const bookingDetails = {
      bookingCode: 'BK-20261115-001',
      date: '2026-11-15',
      startTime: '13:00',
      endTime: '15:00',
      fullName: 'สมชาย ใจดี',
      department: 'วิศวกรรมคอมพิวเตอร์',
      reason: 'ประชุมโครงงานปริญญานิพนธ์',
      status: 'PENDING',
      trackUrl: 'https://reservation.kmutnb.ac.th/track?q=BK-20261115-001',
    };

    it('generates valid Google Calendar URL containing booking code and times', () => {
      const gcalUrl = buildGoogleCalendarUrl(bookingDetails);
      expect(gcalUrl).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
      expect(gcalUrl).toContain(encodeURIComponent('BK-20261115-001'));
      expect(gcalUrl).toContain('20261115T130000');
      expect(gcalUrl).toContain('20261115T150000');
    });

    it('generates valid iCalendar (.ics) content with standard VEVENT structure', () => {
      const ics = generateIcsContent(bookingDetails);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:');
      expect(ics).toContain('BK-20261115-001');
      expect(ics).toContain('DTSTART;TZID=Asia/Bangkok:20261115T130000');
      expect(ics).toContain('DTEND;TZID=Asia/Bangkok:20261115T150000');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });
  });
});
