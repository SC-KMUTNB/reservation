import { describe, it, expect } from 'bun:test';
import {
  parseTimeToMinutes,
  toDateString,
  getWeekDates,
  assignLanes,
  type AdminBooking,
} from '../src/components/admin/AdminScheduleTimeline';

describe('Admin Schedule Timeline Logic', () => {
  it('parseTimeToMinutes converts HH:mm string to minutes from midnight', () => {
    expect(parseTimeToMinutes('08:00')).toBe(480);
    expect(parseTimeToMinutes('08:30')).toBe(510);
    expect(parseTimeToMinutes('12:00')).toBe(720);
    expect(parseTimeToMinutes('20:00')).toBe(1200);
    expect(parseTimeToMinutes('')).toBe(0);
  });

  it('toDateString formats dates into YYYY-MM-DD', () => {
    const d = new Date(2026, 9, 16); // 2026-10-16
    expect(toDateString(d)).toBe('2026-10-16');
  });

  it('getWeekDates produces 7 days starting from Monday', () => {
    // 2026-10-16 is a Friday (day 5)
    const friday = new Date(2026, 9, 16);
    const week = getWeekDates(friday);

    expect(week.length).toBe(7);
    // Monday should be 2026-10-12
    expect(toDateString(week[0])).toBe('2026-10-12');
    expect(week[0].getDay()).toBe(1); // Monday

    // Sunday should be 2026-10-18
    expect(toDateString(week[6])).toBe('2026-10-18');
    expect(week[6].getDay()).toBe(0); // Sunday
  });

  it('assignLanes places non-overlapping bookings in the same lane', () => {
    const bookings: AdminBooking[] = [
      {
        id: 'b1',
        bookingCode: 'B001',
        date: '2026-10-16',
        startTime: '08:00',
        endTime: '10:00',
        fullName: 'Somchai',
        studentId: '123',
        email: 's@test.com',
        phone: '081',
        department: 'Dept A',
        reason: 'Meeting',
        status: 'APPROVED',
        createdAt: '2026-10-15T10:00:00Z',
      },
      {
        id: 'b2',
        bookingCode: 'B002',
        date: '2026-10-16',
        startTime: '10:00',
        endTime: '12:00',
        fullName: 'Somsak',
        studentId: '124',
        email: 's2@test.com',
        phone: '082',
        department: 'Dept B',
        reason: 'Seminar',
        status: 'PENDING',
        createdAt: '2026-10-15T11:00:00Z',
      },
    ];

    const lanes = assignLanes(bookings);
    // Because b2 starts at 10:00 when b1 ends, they fit in a single lane
    expect(lanes.length).toBe(1);
    expect(lanes[0].length).toBe(2);
  });

  it('assignLanes allocates separate lanes for overlapping bookings', () => {
    const bookings: AdminBooking[] = [
      {
        id: 'b1',
        bookingCode: 'B001',
        date: '2026-10-16',
        startTime: '09:00',
        endTime: '11:00',
        fullName: 'Somchai',
        studentId: '123',
        email: 's@test.com',
        phone: '081',
        department: 'Dept A',
        reason: 'Meeting',
        status: 'APPROVED',
        createdAt: '2026-10-15T10:00:00Z',
      },
      {
        id: 'b2',
        bookingCode: 'B002',
        date: '2026-10-16',
        startTime: '10:00',
        endTime: '12:00',
        fullName: 'Somsak',
        studentId: '124',
        email: 's2@test.com',
        phone: '082',
        department: 'Dept B',
        reason: 'Workshop',
        status: 'PENDING',
        createdAt: '2026-10-15T11:00:00Z',
      },
      {
        id: 'b3',
        bookingCode: 'B003',
        date: '2026-10-16',
        startTime: '11:00',
        endTime: '13:00',
        fullName: 'Somying',
        studentId: '125',
        email: 's3@test.com',
        phone: '083',
        department: 'Dept C',
        reason: 'Discussion',
        status: 'APPROVED',
        createdAt: '2026-10-15T12:00:00Z',
      },
    ];

    const lanes = assignLanes(bookings);
    // b1: 09:00 - 11:00 (lane 0)
    // b2: 10:00 - 12:00 (overlaps with b1 -> lane 1)
    // b3: 11:00 - 13:00 (fits in lane 0 after b1 finishes at 11:00!)
    expect(lanes.length).toBe(2);
    expect(lanes[0].map((b) => b.id)).toEqual(['b1', 'b3']);
    expect(lanes[1].map((b) => b.id)).toEqual(['b2']);
  });
});
