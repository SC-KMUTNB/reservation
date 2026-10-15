export interface CalendarBookingInfo {
  bookingCode: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  fullName: string;
  department: string;
  reason: string;
  status?: string;
  location?: string;
  trackUrl?: string;
}

const DEFAULT_ROOM_NAME = 'ห้องประชุมสภานักศึกษา อาคาร 40 ปี มจพ.';

/**
 * Builds a direct Google Calendar template URL
 */
export function buildGoogleCalendarUrl(booking: CalendarBookingInfo): string {
  const cleanDate = booking.date.replace(/-/g, '');
  const cleanStart = booking.startTime.replace(/:/g, '').padEnd(4, '0') + '00';
  const cleanEnd = booking.endTime.replace(/:/g, '').padEnd(4, '0') + '00';

  const datesParam = `${cleanDate}T${cleanStart}/${cleanDate}T${cleanEnd}`;
  const title = `[SC-KMUTNB] จองห้องประชุมสภานักศึกษา (${booking.bookingCode})`;

  const detailsLines = [
    `รหัสการจอง: ${booking.bookingCode}`,
    `ผู้ขอใช้งาน: ${booking.fullName}`,
    `หน่วยงาน/คณะ: ${booking.department}`,
    `วัตถุประสงค์: ${booking.reason}`,
  ];
  if (booking.trackUrl) {
    detailsLines.push(`ติดตามสถานะการจอง: ${booking.trackUrl}`);
  }
  const details = detailsLines.join('\n');
  const location = booking.location || DEFAULT_ROOM_NAME;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: datesParam,
    ctz: 'Asia/Bangkok',
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC 5545 compliant .ics calendar string
 */
export function generateIcsContent(booking: CalendarBookingInfo): string {
  const cleanDate = booking.date.replace(/-/g, '');
  const cleanStart = booking.startTime.replace(/:/g, '').padEnd(4, '0') + '00';
  const cleanEnd = booking.endTime.replace(/:/g, '').padEnd(4, '0') + '00';

  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const status = booking.status === 'APPROVED' ? 'CONFIRMED' : 'TENTATIVE';
  const summary = `[SC-KMUTNB] จองห้องประชุมสภานักศึกษา (${booking.bookingCode})`;
  const location = booking.location || DEFAULT_ROOM_NAME;

  const descLines = [
    `รหัสการจอง: ${booking.bookingCode}`,
    `ผู้ขอใช้งาน: ${booking.fullName}`,
    `หน่วยงาน: ${booking.department}`,
    `วัตถุประสงค์: ${booking.reason}`,
  ];
  if (booking.trackUrl) {
    descLines.push(`ลิงก์ติดตามสถานะ: ${booking.trackUrl}`);
  }
  const description = descLines.join('\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student Council KMUTNB//Reservation System//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${booking.bookingCode}@sc.kmutnb.ac.th`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART;TZID=Asia/Bangkok:${cleanDate}T${cleanStart}`,
    `DTEND;TZID=Asia/Bangkok:${cleanDate}T${cleanEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:${status}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:เตือนก่อนเริ่มการใช้งานห้องประชุม 30 นาที',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}
