import type { BookingItem } from '$lib/types/booking';

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

export function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export function isSlotBooked(
  start: string,
  end: string,
  bookings: BookingItem[]
): BookingItem | undefined {
  return bookings.find(
    (b) =>
      (b.status === 'APPROVED' || b.status === 'PENDING') &&
      hasTimeOverlap(start, end, b.startTime, b.endTime)
  );
}

export function isSlotAvailable(
  start: string,
  end: string,
  bookings: BookingItem[],
  todayFlag: boolean,
  currTime: string,
  pastFlag: boolean
): boolean {
  if (pastFlag) return false;
  if (todayFlag && start <= currTime) return false;
  return !isSlotBooked(start, end, bookings);
}

export function getValidEndTimes(
  start: string,
  allSlots: TimeSlot[],
  bookings: BookingItem[],
  todayFlag: boolean,
  currTime: string,
  pastFlag: boolean
): string[] {
  if (!start) return [];
  const validEnds: string[] = [];

  for (const slot of allSlots) {
    if (slot.start < start) continue;

    const available = isSlotAvailable(
      slot.start,
      slot.end,
      bookings,
      todayFlag,
      currTime,
      pastFlag
    );

    if (!available) {
      break;
    }

    validEnds.push(slot.end);
  }

  return validEnds;
}
