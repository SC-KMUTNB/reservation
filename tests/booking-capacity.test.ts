import { describe, it, expect } from 'bun:test';
import { calculateDayAvailability, OPERATIONAL_SLOTS } from '../src/lib/booking-capacity';

describe('calculateDayAvailability', () => {
  it('should return 12 free hours for an empty future day', () => {
    const res = calculateDayAvailability('2026-11-01', [], false);
    expect(res.totalHours).toBe(12);
    expect(res.bookedHours).toBe(0);
    expect(res.freeHours).toBe(12);
    expect(res.freePercentage).toBe(100);
    expect(res.statusLevel).toBe('FREE');
    expect(res.label).toBe('ว่างทั้งวัน');
    expect(res.colorClasses.bar).toContain('emerald');
  });

  it('should deduct approved hours correctly for contiguous bookings', () => {
    const bookings = [
      {
        startTime: '09:00',
        endTime: '12:00',
        status: 'APPROVED',
        id: '1',
        bookingCode: 'A',
        date: '2026-11-01',
        department: 'D',
        fullName: 'F',
      },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.totalHours).toBe(12);
    expect(res.bookedHours).toBe(3);
    expect(res.freeHours).toBe(9);
    expect(res.freePercentage).toBe(75);
    expect(res.statusLevel).toBe('MODERATE');
    expect(res.label).toBe('ว่าง 9 ชม.');
    expect(res.colorClasses.bar).toContain('amber');
  });

  it('should deduct approved hours correctly for disjoint bookings', () => {
    const bookings = [
      { startTime: '08:00', endTime: '10:00', status: 'APPROVED', date: '2026-11-01' },
      { startTime: '13:00', endTime: '16:00', status: 'APPROVED', date: '2026-11-01' },
      { startTime: '18:00', endTime: '19:00', status: 'APPROVED', date: '2026-11-01' },
    ];
    // Booked slots: 08-09, 09-10 (2) + 13-14, 14-15, 15-16 (3) + 18-19 (1) = 6 slots
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.bookedHours).toBe(6);
    expect(res.freeHours).toBe(6);
    expect(res.freePercentage).toBe(50);
    expect(res.statusLevel).toBe('MODERATE');
    expect(res.label).toBe('ว่าง 6 ชม.');
  });

  it('should ignore non-approved bookings (PENDING, REJECTED, CANCELLED) when includePending is false', () => {
    const bookings = [
      { startTime: '09:00', endTime: '12:00', status: 'PENDING', date: '2026-11-01' },
      { startTime: '13:00', endTime: '15:00', status: 'REJECTED', date: '2026-11-01' },
      { startTime: '16:00', endTime: '18:00', status: 'CANCELLED', date: '2026-11-01' },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.bookedHours).toBe(0);
    expect(res.freeHours).toBe(12);
    expect(res.bookedPercentage).toBe(0);
    expect(res.freePercentage).toBe(100);
    expect(res.statusLevel).toBe('FREE');
    expect(res.label).toBe('ว่างทั้งวัน');
  });

  it('should count PENDING bookings when includePending is true (matching live calendar and real db)', () => {
    const bookings = [
      { startTime: '09:00', endTime: '12:00', status: 'PENDING', date: '2026-11-01' },
      { startTime: '13:00', endTime: '15:00', status: 'REJECTED', date: '2026-11-01' },
      { startTime: '16:00', endTime: '18:00', status: 'CANCELLED', date: '2026-11-01' },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false, { includePending: true });
    expect(res.bookedHours).toBe(3);
    expect(res.freeHours).toBe(9);
    expect(res.bookedPercentage).toBe(25);
    expect(res.freePercentage).toBe(75);
    expect(res.statusLevel).toBe('MODERATE');
    expect(res.label).toBe('ว่าง 9 ชม.');
  });


  it('should ignore bookings on different dates if date is provided', () => {
    const bookings = [
      { startTime: '09:00', endTime: '12:00', status: 'APPROVED', date: '2026-11-02' },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.bookedHours).toBe(0);
    expect(res.freeHours).toBe(12);
    expect(res.statusLevel).toBe('FREE');
  });

  it('should categorize freeHours < 4 as LOW status', () => {
    const bookings = [
      // 9 hours booked: 08:00 - 17:00 -> 3 free hours left
      { startTime: '08:00', endTime: '17:00', status: 'APPROVED', date: '2026-11-01' },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.bookedHours).toBe(9);
    expect(res.freeHours).toBe(3);
    expect(res.freePercentage).toBe(25);
    expect(res.statusLevel).toBe('LOW');
    expect(res.label).toBe('ว่าง 3 ชม.');
    expect(res.colorClasses.bar).toContain('rose');
  });

  it('should mark completely booked day as FULL', () => {
    const bookings = [
      {
        startTime: '08:00',
        endTime: '20:00',
        status: 'APPROVED',
        id: '1',
        bookingCode: 'A',
        date: '2026-11-01',
        department: 'D',
        fullName: 'F',
      },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    expect(res.totalHours).toBe(12);
    expect(res.bookedHours).toBe(12);
    expect(res.freeHours).toBe(0);
    expect(res.freePercentage).toBe(0);
    expect(res.statusLevel).toBe('FULL');
    expect(res.label).toBe('เต็มทุกช่วง');
    expect(res.colorClasses.bar).toContain('rose');
  });

  it('should mark past days as PAST regardless of bookings', () => {
    const bookings = [
      { startTime: '09:00', endTime: '11:00', status: 'APPROVED', date: '2026-10-01' },
    ];
    const res = calculateDayAvailability('2026-10-01', bookings, true);
    expect(res.totalHours).toBe(12);
    expect(res.bookedHours).toBe(2);
    expect(res.freeHours).toBe(10);
    expect(res.statusLevel).toBe('PAST');
    expect(res.label).toBe('ประวัติ');
    expect(res.colorClasses.text).toContain('slate');
  });

  it('should handle overlapping and partial-hour bookings without double-counting', () => {
    const bookings = [
      // Two overlapping bookings in morning: 09:00-11:00 and 10:00-12:00 -> slots 09-10, 10-11, 11-12 (3 slots)
      { startTime: '09:00', endTime: '11:00', status: 'APPROVED' },
      { startTime: '10:00', endTime: '12:00', status: 'APPROVED' },
      // Partial booking: 13:30 - 14:30 -> overlaps with 13:00-14:00 and 14:00-15:00 (2 slots)
      { startTime: '13:30', endTime: '14:30', status: 'APPROVED' },
    ];
    const res = calculateDayAvailability('2026-11-01', bookings, false);
    // Slots booked: 09-10, 10-11, 11-12 (3), 13-14, 14-15 (2) => total 5 slots
    expect(res.bookedHours).toBe(5);
    expect(res.freeHours).toBe(7);
    expect(res.statusLevel).toBe('MODERATE');
    expect(res.label).toBe('ว่าง 7 ชม.');
  });

  it('should expose OPERATIONAL_SLOTS with 12 slots', () => {
    expect(OPERATIONAL_SLOTS.length).toBe(12);
    expect(OPERATIONAL_SLOTS[0].start).toBe('08:00');
    expect(OPERATIONAL_SLOTS[11].end).toBe('20:00');
  });
});
