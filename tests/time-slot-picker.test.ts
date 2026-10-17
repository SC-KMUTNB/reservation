import { describe, expect, test } from 'bun:test';
import {
  hasTimeOverlap,
  isSlotBooked,
  isSlotAvailable,
  getValidEndTimes,
  type TimeSlot,
} from '$lib/time-slot-utils';
import type { BookingItem } from '$lib/types/booking';

describe('TimeSlotPicker Multi-Hour and Conflict Logic', () => {
  const dummySlots: TimeSlot[] = [
    { start: '08:00', end: '09:00', label: '08:00 - 09:00' },
    { start: '09:00', end: '10:00', label: '09:00 - 10:00' },
    { start: '10:00', end: '11:00', label: '10:00 - 11:00' },
    { start: '11:00', end: '12:00', label: '11:00 - 12:00' },
    { start: '12:00', end: '13:00', label: '12:00 - 13:00' },
    { start: '13:00', end: '14:00', label: '13:00 - 14:00' },
  ];

  const dummyBookings: BookingItem[] = [
    {
      id: 'b1',
      bookingCode: 'BK-001',
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '12:00',
      status: 'APPROVED',
      fullName: 'Student A',
      studentId: '1234567890123',
      email: 'a@kmutnb.ac.th',
      phone: '0812345678',
      department: 'CED',
      reason: 'Meeting',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'b2',
      bookingCode: 'BK-002',
      date: '2026-10-15',
      startTime: '13:00',
      endTime: '14:00',
      status: 'PENDING',
      fullName: 'Student B',
      studentId: '1234567890124',
      email: 'b@kmutnb.ac.th',
      phone: '0812345679',
      department: 'ECE',
      reason: 'Discussion',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  test('hasTimeOverlap correctly detects overlaps and adjacent non-overlapping times', () => {
    // Exact match
    expect(hasTimeOverlap('08:00', '10:00', '08:00', '10:00')).toBe(true);
    // Partial overlap
    expect(hasTimeOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true);
    expect(hasTimeOverlap('09:00', '11:00', '08:00', '10:00')).toBe(true);
    // Inside
    expect(hasTimeOverlap('08:00', '12:00', '09:00', '10:00')).toBe(true);
    // Adjacent touching boundary (NOT an overlap)
    expect(hasTimeOverlap('08:00', '09:00', '09:00', '10:00')).toBe(false);
    expect(hasTimeOverlap('10:00', '11:00', '08:00', '10:00')).toBe(false);
  });

  test('isSlotBooked detects approved and pending bookings but ignores cancelled', () => {
    expect(isSlotBooked('10:00', '11:00', dummyBookings)?.bookingCode).toBe('BK-001');
    expect(isSlotBooked('13:00', '14:00', dummyBookings)?.bookingCode).toBe('BK-002');
    expect(isSlotBooked('08:00', '09:00', dummyBookings)).toBeUndefined();
    expect(isSlotBooked('12:00', '13:00', dummyBookings)).toBeUndefined();
  });

  test('isSlotAvailable handles past time on today and bookings', () => {
    // 08:00 is past if currentTimeStr is '08:30' on today
    expect(isSlotAvailable('08:00', '09:00', dummyBookings, true, '08:30', false)).toBe(false);
    // 09:00 is available if currentTimeStr is '08:30' on today
    expect(isSlotAvailable('09:00', '10:00', dummyBookings, true, '08:30', false)).toBe(true);
    // 10:00 is booked
    expect(isSlotAvailable('10:00', '11:00', dummyBookings, true, '08:30', false)).toBe(false);
  });

  test('getValidEndTimes dynamically truncates at the earliest occupied booking', () => {
    // Starting at 08:00 on future date:
    // 08:00-09:00 free -> 09:00
    // 09:00-10:00 free -> 10:00
    // 10:00-11:00 BOOKED -> STOPS HERE! Cannot select 11:00, 12:00, 13:00
    const endsFrom08 = getValidEndTimes('08:00', dummySlots, dummyBookings, false, '00:00', false);
    expect(endsFrom08).toEqual(['09:00', '10:00']);

    // Starting at 09:00: only 10:00 is valid before the 10:00 booking
    const endsFrom09 = getValidEndTimes('09:00', dummySlots, dummyBookings, false, '00:00', false);
    expect(endsFrom09).toEqual(['10:00']);

    // Starting at 12:00:
    // 12:00-13:00 free -> 13:00
    // 13:00-14:00 is PENDING BOOKED -> STOPS!
    const endsFrom12 = getValidEndTimes('12:00', dummySlots, dummyBookings, false, '00:00', false);
    expect(endsFrom12).toEqual(['13:00']);
  });

  test('getValidEndTimes returns full span when no bookings block', () => {
    const endsNoBookings = getValidEndTimes('08:00', dummySlots, [], false, '00:00', false);
    expect(endsNoBookings).toEqual(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00']);
  });
});
