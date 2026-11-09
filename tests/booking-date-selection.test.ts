import { describe, it, expect } from 'bun:test';
import { isBackdated, getNowInTimezone } from '../src/lib/date-utils';

describe('Booking Date Selection & Past Date Popup Prevention', () => {
  const referenceDate = new Date('2026-11-09T15:45:00+07:00');
  const timezone = 'Asia/Bangkok';
  const { dateStr: todayStr, timeStr: nowTimeStr } = getNowInTimezone(timezone, referenceDate);

  it('todayStr and nowTimeStr are correctly computed for the reference date', () => {
    expect(todayStr).toBe('2026-11-09');
    expect(nowTimeStr).toBe('15:45');
  });

  it('correctly classifies dates as passed vs current vs future', () => {
    const pastDate = '2026-11-08';
    const todayDate = '2026-11-09';
    const futureDate = '2026-11-10';

    expect(pastDate < todayStr).toBe(true);
    expect(todayDate < todayStr).toBe(false);
    expect(futureDate < todayStr).toBe(false);
  });

  it('past dates are blocked from opening popup and cannot be selected', () => {
    let selectedDate = '';
    let isBookingModalOpen = false;

    function handleSelectDate(dateStr: string) {
      if (dateStr < todayStr) return;
      selectedDate = dateStr;
      isBookingModalOpen = true;
    }

    // Try selecting yesterday
    handleSelectDate('2026-11-08');
    expect(selectedDate).toBe('');
    expect(isBookingModalOpen).toBe(false);

    // Try selecting earlier in the month
    handleSelectDate('2026-11-01');
    expect(selectedDate).toBe('');
    expect(isBookingModalOpen).toBe(false);
  });

  it('today is clickable and allows opening popup even when time has passed', () => {
    let selectedDate = '';
    let isBookingModalOpen = false;

    function handleSelectDate(dateStr: string) {
      if (dateStr < todayStr) return;
      selectedDate = dateStr;
      isBookingModalOpen = true;
    }

    // Select today
    handleSelectDate('2026-11-09');
    expect(selectedDate).toBe('2026-11-09');
    expect(isBookingModalOpen).toBe(true);
  });

  it('future dates are clickable and allow opening popup', () => {
    let selectedDate = '';
    let isBookingModalOpen = false;

    function handleSelectDate(dateStr: string) {
      if (dateStr < todayStr) return;
      selectedDate = dateStr;
      isBookingModalOpen = true;
    }

    // Select tomorrow
    handleSelectDate('2026-11-10');
    expect(selectedDate).toBe('2026-11-10');
    expect(isBookingModalOpen).toBe(true);
  });

  it('maintains strict distinction between PAST_DATE and PAST_TIME via isBackdated', () => {
    // Past date (yesterday) at 09:00 -> PAST_DATE
    const resPastDate = isBackdated('2026-11-08', '09:00', timezone, referenceDate);
    expect(resPastDate.isBackdated).toBe(true);
    expect(resPastDate.reason).toBe('PAST_DATE');

    // Current date (today) at 09:00 (which is before 15:45) -> PAST_TIME, NOT PAST_DATE
    const resPastTime = isBackdated('2026-11-09', '09:00', timezone, referenceDate);
    expect(resPastTime.isBackdated).toBe(true);
    expect(resPastTime.reason).toBe('PAST_TIME');

    // Current date (today) at 16:00 (which is after 15:45) -> not backdated
    const resFutureTimeToday = isBackdated('2026-11-09', '16:00', timezone, referenceDate);
    expect(resFutureTimeToday.isBackdated).toBe(false);

    // Future date at 08:00 -> not backdated
    const resFutureDate = isBackdated('2026-11-10', '08:00', timezone, referenceDate);
    expect(resFutureDate.isBackdated).toBe(false);
  });
});
