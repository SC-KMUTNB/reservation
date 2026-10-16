import { describe, expect, it } from 'bun:test';
import { extractBookingCode } from '@/components/admin/QrScannerModal';

describe('extractBookingCode', () => {
  it('extracts raw booking code correctly', () => {
    expect(extractBookingCode('BK-2026-ABCD')).toBe('BK-2026-ABCD');
    expect(extractBookingCode('  bk-2026-xyz123  ')).toBe('BK-2026-XYZ123');
  });

  it('extracts booking code from dashboard checkIn URL', () => {
    const url = 'https://reservation.kmutnb.ac.th/admin/dashboard?checkIn=BK-2026-9988';
    expect(extractBookingCode(url)).toBe('BK-2026-9988');
  });

  it('extracts booking code from track search URL', () => {
    const url = 'https://reservation.kmutnb.ac.th/track?q=BK-2026-1122';
    expect(extractBookingCode(url)).toBe('BK-2026-1122');
  });

  it('extracts embedded BK- code from arbitrary text or malformed links', () => {
    const text = 'Reservation confirmation: BK-2026-SAMPLE for meeting room';
    expect(extractBookingCode(text)).toBe('BK-2026-SAMPLE');
  });
});
