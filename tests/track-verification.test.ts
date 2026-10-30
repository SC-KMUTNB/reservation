import { describe, test, expect, beforeEach, spyOn } from 'bun:test';
import { prisma } from '@/lib/prisma';
import { resetRateLimits } from '@/lib/rate-limit';

describe('Track API Student Verification Logic', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test('flags student ID query as requiring phoneLast4 verification', () => {
    const isStudentId = (query: string) => /^\d{13}$/.test(query.trim());
    expect(isStudentId('6501012345678')).toBe(true);
    expect(isStudentId('KMUTNB-2026-0001-1234')).toBe(false);
  });

  test('validates phoneLast4 against user phone string', () => {
    const phone = '081-234-5678';
    const cleanPhone = phone.replace(/[-\s]/g, '');
    const phoneLast4 = '5678';
    expect(cleanPhone.endsWith(phoneLast4)).toBe(true);
    expect(cleanPhone.endsWith('9999')).toBe(false);
  });

  describe('GET /api/bookings/track endpoint', () => {
    const mockBookings = [
      {
        id: 'booking-1',
        bookingCode: 'BK-2026-0001-1234',
        date: '2026-11-01',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'สมชาย รักเรียน',
        studentId: '6501012345678',
        phone: '081-234-5678',
        department: 'วิศวกรรมคอมพิวเตอร์',
        reason: 'ประชุมจัดกิจกรรมวิชาการ',
        status: 'APPROVED',
        rejectionReason: null,
        approvedAt: new Date('2026-10-25T10:00:00Z'),
        checkedInAt: null,
        createdAt: new Date('2026-10-24T10:00:00Z')
      }
    ];

    const makeTrackRequest = (params: Record<string, string>, ip = '192.168.1.100') => {
      const url = new URL('http://localhost:3000/api/bookings/track');
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
      return {
        getClientAddress: () => ip,
        url,
        request: new Request(url.toString())
      } as any;
    };

    test('returns 400 when query parameter q is missing', async () => {
      const { GET } = await import('@/routes/api/bookings/track/+server');
      const res = await GET(makeTrackRequest({}));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('กรุณาระบุรหัสนักศึกษาหรือรหัสการจอง');
    });

    test('returns requiresVerification when query is 13-digit studentId without phoneLast4', async () => {
      const { GET } = await import('@/routes/api/bookings/track/+server');
      const res = await GET(makeTrackRequest({ q: '6501012345678' }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requiresVerification).toBe(true);
      expect(data.message).toContain('เบอร์โทรศัพท์ 4 ตัวท้าย');
    });

    test('returns 400 when phoneLast4 is not 4 digits', async () => {
      const { GET } = await import('@/routes/api/bookings/track/+server');
      const res = await GET(makeTrackRequest({ q: '6501012345678', phoneLast4: '12' }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('ตัวเลข 4 หลัก');
    });

    test('returns 400 when student exists but phoneLast4 does not match', async () => {
      const originalBooking = (prisma as any).booking;
      (prisma as any).booking = {
        findMany: async () => mockBookings
      };
      try {
        const { GET } = await import('@/routes/api/bookings/track/+server');
        const res = await GET(makeTrackRequest({ q: '6501012345678', phoneLast4: '9999' }));
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('เบอร์โทรศัพท์ 4 ตัวท้ายไม่ตรง');
      } finally {
        (prisma as any).booking = originalBooking;
      }
    });

    test('returns student bookings without phone field when phoneLast4 matches', async () => {
      const originalBooking = (prisma as any).booking;
      (prisma as any).booking = {
        findMany: async () => mockBookings
      };
      try {
        const { GET } = await import('@/routes/api/bookings/track/+server');
        const res = await GET(makeTrackRequest({ q: '6501012345678', phoneLast4: '5678' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.bookings).toBeDefined();
        expect(data.bookings.length).toBe(1);
        expect(data.bookings[0].bookingCode).toBe('BK-2026-0001-1234');
        expect(data.bookings[0].fullName).toBe('สมชาย รักเรียน');
        // Privacy check: phone number must NOT be exposed
        expect(data.bookings[0].phone).toBeUndefined();
      } finally {
        (prisma as any).booking = originalBooking;
      }
    });

    test('returns empty bookings list when student has no bookings in DB', async () => {
      const originalBooking = (prisma as any).booking;
      (prisma as any).booking = {
        findMany: async () => []
      };
      try {
        const { GET } = await import('@/routes/api/bookings/track/+server');
        const res = await GET(makeTrackRequest({ q: '6501012345678', phoneLast4: '5678' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.bookings).toEqual([]);
      } finally {
        (prisma as any).booking = originalBooking;
      }
    });

    test('returns matching booking by bookingCode without requiring phoneLast4', async () => {
      const originalBooking = (prisma as any).booking;
      (prisma as any).booking = {
        findMany: async () => mockBookings
      };
      try {
        const { GET } = await import('@/routes/api/bookings/track/+server');
        const res = await GET(makeTrackRequest({ q: 'BK-2026-0001-1234' }));
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.requiresVerification).toBeUndefined();
        expect(data.bookings).toBeDefined();
        expect(data.bookings.length).toBe(1);
        expect(data.bookings[0].bookingCode).toBe('BK-2026-0001-1234');
      } finally {
        (prisma as any).booking = originalBooking;
      }
    });
  });
});
