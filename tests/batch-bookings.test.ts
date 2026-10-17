process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservation_db?schema=public';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-batch-bookings';

import { describe, it, expect, spyOn, beforeEach } from 'bun:test';
import {
  validateBatchApproval,
  type CandidateBooking,
} from '../src/lib/batch-validation';
import { POST } from '../src/routes/api/admin/bookings/batch/+server';
import * as authModule from '../src/lib/auth';
import * as auditModule from '../src/lib/audit';
import * as emailModule from '../src/lib/email';
import * as sheetsModule from '../src/lib/google-sheets';
import { prisma } from '../src/lib/prisma';

function createMockEvent(url: string, bodyObj?: any) {
  const request = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
  });
  return {
    request,
    url: new URL(url),
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
    },
    locals: {},
  } as any;
}

describe('validateBatchApproval', () => {
  it('should detect candidate overlapping with existing approved booking as conflict', () => {
    const existingApproved: CandidateBooking[] = [
      {
        id: 'approved-1',
        bookingCode: 'BK-APP-1',
        date: '2026-11-01',
        startTime: '10:00',
        endTime: '12:00',
        fullName: 'Existing User',
      },
    ];

    const candidates: CandidateBooking[] = [
      {
        id: 'cand-1',
        bookingCode: 'BK-CAND-1',
        date: '2026-11-01',
        startTime: '11:00',
        endTime: '13:00',
        fullName: 'Candidate One',
      },
    ];

    const { approved, conflicts } = validateBatchApproval(candidates, existingApproved);

    expect(approved).toHaveLength(0);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('cand-1');
    expect(conflicts[0].bookingCode).toBe('BK-CAND-1');
    expect(conflicts[0].reason).toContain('Existing User');
  });

  it('should approve first candidate and mark second overlapping candidate as conflict', () => {
    const candidates: CandidateBooking[] = [
      {
        id: 'cand-1',
        bookingCode: 'BK-CAND-1',
        date: '2026-11-01',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'First Student',
      },
      {
        id: 'cand-2',
        bookingCode: 'BK-CAND-2',
        date: '2026-11-01',
        startTime: '10:00',
        endTime: '12:00',
        fullName: 'Second Student',
      },
    ];

    const { approved, conflicts } = validateBatchApproval(candidates, []);

    expect(approved).toHaveLength(1);
    expect(approved[0].id).toBe('cand-1');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('cand-2');
    expect(conflicts[0].bookingCode).toBe('BK-CAND-2');
    expect(conflicts[0].reason).toContain('First Student');
  });

  it('should approve all non-overlapping candidates', () => {
    const candidates: CandidateBooking[] = [
      {
        id: 'cand-1',
        bookingCode: 'BK-CAND-1',
        date: '2026-11-01',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'User One',
      },
      {
        id: 'cand-2',
        bookingCode: 'BK-CAND-2',
        date: '2026-11-01',
        startTime: '11:00',
        endTime: '13:00',
        fullName: 'User Two',
      },
      {
        id: 'cand-3',
        bookingCode: 'BK-CAND-3',
        date: '2026-11-02',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'User Three',
      },
    ];

    const { approved, conflicts } = validateBatchApproval(candidates, []);

    expect(approved).toHaveLength(3);
    expect(conflicts).toHaveLength(0);
    expect(approved.map((a) => a.id)).toEqual(['cand-1', 'cand-2', 'cand-3']);
  });
});

describe('POST /api/admin/bookings/batch API Route', () => {
  beforeEach(() => {
    spyOn(auditModule, 'recordAuditLog').mockResolvedValue(undefined as any);
    spyOn(emailModule, 'notifyUserBookingStatusUpdate').mockResolvedValue(undefined as any);
    spyOn(sheetsModule, 'syncBookingToGoogleSheet').mockResolvedValue(undefined as any);
  });

  it('returns 401 when unauthenticated', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue(null);

    const event = createMockEvent('http://localhost:3000/api/admin/bookings/batch', {
      action: 'APPROVE',
      bookingIds: ['id-1'],
    });

    const res = await POST(event);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('ไม่ได้รับอนุญาต');
  });

  it('returns 400 when action is invalid', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Super Admin',
      role: 'ADMIN',
    });

    const event = createMockEvent('http://localhost:3000/api/admin/bookings/batch', {
      action: 'INVALID_ACTION',
      bookingIds: ['id-1'],
    });

    const res = await POST(event);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 when bookingIds is empty or not an array', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Super Admin',
      role: 'ADMIN',
    });

    const event = createMockEvent('http://localhost:3000/api/admin/bookings/batch', {
      action: 'APPROVE',
      bookingIds: [],
    });

    const res = await POST(event);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('executes batch APPROVE and detects conflicts accurately', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Super Admin',
      role: 'ADMIN',
    });

    const mockCandidates = [
      {
        id: 'b-1',
        bookingCode: 'BK01',
        date: '2026-11-01',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'Student 1',
        studentId: 's1',
        email: 's1@kmutnb.ac.th',
        phone: '0811111111',
        department: 'CS',
        reason: 'Meeting 1',
        status: 'PENDING',
        createdAt: new Date(),
      },
      {
        id: 'b-2',
        bookingCode: 'BK02',
        date: '2026-11-01',
        startTime: '10:00',
        endTime: '12:00',
        fullName: 'Student 2',
        studentId: 's2',
        email: 's2@kmutnb.ac.th',
        phone: '0822222222',
        department: 'IT',
        reason: 'Meeting 2',
        status: 'PENDING',
        createdAt: new Date(),
      },
    ];

    (prisma as any).booking = {
      findMany: async (args: any) => {
        if (args?.where?.id?.in) {
          return mockCandidates;
        }
        if (args?.where?.status === 'APPROVED') {
          return [];
        }
        return [];
      },
      update: async () => ({}),
    };
    (prisma as any).$transaction = async (promises: any[]) => promises;

    const event = createMockEvent('http://localhost:3000/api/admin/bookings/batch', {
      action: 'APPROVE',
      bookingIds: ['b-1', 'b-2'],
    });

    const res = await POST(event);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvedCount).toBe(1);
    expect(data.conflictCount).toBe(1);
    expect(data.conflicts[0].id).toBe('b-2');
  });

  it('executes batch REJECT with rejectionReason', async () => {
    spyOn(authModule, 'getSessionFromRequest').mockResolvedValue({
      id: 'admin-1',
      email: 'admin@kmutnb.ac.th',
      fullName: 'Super Admin',
      role: 'ADMIN',
    });

    const mockCandidates = [
      {
        id: 'b-1',
        bookingCode: 'BK01',
        date: '2026-11-01',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'Student 1',
        studentId: 's1',
        email: 's1@kmutnb.ac.th',
        phone: '0811111111',
        department: 'CS',
        reason: 'Meeting 1',
        status: 'PENDING',
        createdAt: new Date(),
      },
      {
        id: 'b-2',
        bookingCode: 'BK02',
        date: '2026-11-01',
        startTime: '13:00',
        endTime: '15:00',
        fullName: 'Student 2',
        studentId: 's2',
        email: 's2@kmutnb.ac.th',
        phone: '0822222222',
        department: 'IT',
        reason: 'Meeting 2',
        status: 'PENDING',
        createdAt: new Date(),
      },
    ];

    (prisma as any).booking = {
      findMany: async (args: any) => {
        if (args?.where?.id?.in) {
          return mockCandidates;
        }
        return [];
      },
      update: async () => ({}),
    };
    (prisma as any).$transaction = async (promises: any[]) => promises;

    const event = createMockEvent('http://localhost:3000/api/admin/bookings/batch', {
      action: 'REJECT',
      bookingIds: ['b-1', 'b-2'],
      rejectionReason: 'ห้องปิดปรับปรุงระบบไฟฟ้า',
    });

    const res = await POST(event);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.rejectedCount).toBe(2);
    expect(data.conflictCount).toBe(0);
  });
});
