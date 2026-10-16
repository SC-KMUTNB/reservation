/**
 * Public Calendar Availability Heatmap & Capacity Calculation
 *
 * Operational hours are standard 08:00 - 20:00 (12 hourly slots).
 * Deducts approved bookings to compute capacity and free hours.
 */

export interface OperationalSlot {
  start: string;
  end: string;
  label: string;
}

export const OPERATIONAL_SLOTS: OperationalSlot[] = [
  { start: '08:00', end: '09:00', label: '08:00 - 09:00' },
  { start: '09:00', end: '10:00', label: '09:00 - 10:00' },
  { start: '10:00', end: '11:00', label: '10:00 - 11:00' },
  { start: '11:00', end: '12:00', label: '11:00 - 12:00' },
  { start: '12:00', end: '13:00', label: '12:00 - 13:00' },
  { start: '13:00', end: '14:00', label: '13:00 - 14:00' },
  { start: '14:00', end: '15:00', label: '14:00 - 15:00' },
  { start: '15:00', end: '16:00', label: '15:00 - 16:00' },
  { start: '16:00', end: '17:00', label: '16:00 - 17:00' },
  { start: '17:00', end: '18:00', label: '17:00 - 18:00' },
  { start: '18:00', end: '19:00', label: '18:00 - 19:00' },
  { start: '19:00', end: '20:00', label: '19:00 - 20:00' },
];

export interface DayAvailability {
  totalHours: number;
  bookedHours: number;
  freeHours: number;
  freePercentage: number; // 0 to 100
  bookedPercentage: number; // 0 to 100
  statusLevel: 'FREE' | 'MODERATE' | 'LOW' | 'FULL' | 'PAST';
  label: string; // e.g., 'ว่างทั้งวัน', 'ว่าง 9 ชม.', 'เต็มทุกช่วง', 'ประวัติ'
  colorClasses: {
    bg: string;
    text: string;
    border: string;
    bar: string;
  };
}

export interface BookingSlotInput {
  startTime: string;
  endTime: string;
  status: string;
  date?: string;
  [key: string]: any;
}

export interface CalculateDayAvailabilityOptions {
  includePending?: boolean;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;
  return hours * 60 + minutes;
}

function isSlotOverlapping(
  slotStart: string,
  slotEnd: string,
  bookingStart: string,
  bookingEnd: string
): boolean {
  const sStart = parseTimeToMinutes(slotStart);
  const sEnd = parseTimeToMinutes(slotEnd);
  const bStart = parseTimeToMinutes(bookingStart);
  const bEnd = parseTimeToMinutes(bookingEnd);
  return bStart < sEnd && bEnd > sStart;
}

/**
 * Calculates availability, free hours, capacity usage, and color badge attributes for a calendar day.
 * Active bookings (APPROVED and PENDING) consume operational slots because both block double-booking.
 * REJECTED and CANCELLED bookings are ignored.
 */
export function calculateDayAvailability(
  dateStr: string,
  bookings: BookingSlotInput[],
  isPast: boolean = false,
  options?: CalculateDayAvailabilityOptions
): DayAvailability {
  const includePending = options?.includePending ?? false;

  // Filter for active bookings matching this date
  const activeBookings = (bookings || []).filter((b) => {
    if (b.date && b.date !== dateStr) return false;
    if (b.status === 'APPROVED') return true;
    if (includePending && b.status === 'PENDING') return true;
    return false;
  });

  let bookedSlotsCount = 0;
  for (const slot of OPERATIONAL_SLOTS) {
    const isBooked = activeBookings.some((b) =>
      isSlotOverlapping(slot.start, slot.end, b.startTime, b.endTime)
    );
    if (isBooked) {
      bookedSlotsCount++;
    }
  }

  const totalHours = OPERATIONAL_SLOTS.length; // 12
  const bookedHours = bookedSlotsCount;
  const freeHours = Math.max(0, totalHours - bookedHours);
  const freePercentage = Math.round((freeHours / totalHours) * 100);
  const bookedPercentage = Math.round((bookedHours / totalHours) * 100);

  let statusLevel: DayAvailability['statusLevel'];
  let label: string;
  let colorClasses: DayAvailability['colorClasses'];

  if (isPast) {
    statusLevel = 'PAST';
    label = 'ประวัติ';
    colorClasses = {
      bg: 'bg-slate-100/70',
      text: 'text-slate-500',
      border: 'border-slate-200/80',
      bar: 'bg-slate-400',
    };
  } else if (freeHours === totalHours) {
    statusLevel = 'FREE';
    label = 'ว่างทั้งวัน';
    colorClasses = {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      bar: 'bg-emerald-500',
    };
  } else if (freeHours === 0) {
    statusLevel = 'FULL';
    label = 'เต็มทุกช่วง';
    colorClasses = {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      bar: 'bg-rose-500',
    };
  } else if (freeHours < 4) {
    statusLevel = 'LOW';
    label = `ว่าง ${freeHours} ชม.`;
    colorClasses = {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      bar: 'bg-rose-500',
    };
  } else {
    statusLevel = 'MODERATE';
    label = `ว่าง ${freeHours} ชม.`;
    colorClasses = {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      bar: 'bg-amber-500',
    };
  }

  return {
    totalHours,
    bookedHours,
    freeHours,
    freePercentage,
    bookedPercentage,
    statusLevel,
    label,
    colorClasses,
  };
}

