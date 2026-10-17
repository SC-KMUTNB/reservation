export interface AdminBooking {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
  borrowedEquipment?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  approvedBy?: {
    fullName: string;
    email: string;
  };
  approvedAt?: string;
  checkedInAt?: string;
  checkedInByName?: string;
  createdAt: string;
}

export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getWeekDates(d: Date): Date[] {
  const current = new Date(d);
  const day = current.getDay();
  // Monday as first day of week (day === 0 is Sunday, so diff = -6; else 1 - day)
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    week.push(dayDate);
  }
  return week;
}

export function assignLanes(items: AdminBooking[]): AdminBooking[][] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const sorted = [...items].sort((a, b) => {
    const diff = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime);
  });

  const lanes: AdminBooking[][] = [];
  for (const item of sorted) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      if (parseTimeToMinutes(last.endTime) <= parseTimeToMinutes(item.startTime)) {
        lane.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([item]);
    }
  }
  return lanes;
}
