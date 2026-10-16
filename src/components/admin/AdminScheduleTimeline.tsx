'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Check,
  X,
  User,
  Building,
  Info,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { formatDisplayDate } from '@/lib/date-utils';

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  approvedBy?: {
    fullName: string;
    email: string;
  };
  approvedAt?: string;
  createdAt: string;
}

export interface AdminScheduleTimelineProps {
  bookings: AdminBooking[];
  mode?: 'day' | 'week';
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onSelectBooking: (booking: AdminBooking) => void;
  onApproveBooking?: (booking: AdminBooking) => void;
  onRejectBooking?: (booking: AdminBooking) => void;
}

const START_HOUR = 8; // 08:00
const END_HOUR = 20; // 20:00
const TOTAL_HOURS = END_HOUR - START_HOUR; // 12 hours
const TOTAL_MINUTES = TOTAL_HOURS * 60; // 720 minutes
const START_MINUTES = START_HOUR * 60; // 480 minutes

const THAI_DAY_NAMES = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

const THAI_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const THAI_MONTH_NAMES_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const THAI_MONTH_NAMES_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

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

// Assign bookings to parallel lanes if overlapping
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

export default function AdminScheduleTimeline({
  bookings,
  mode: initialMode = 'day',
  selectedDate,
  onDateChange,
  onSelectBooking,
  onApproveBooking,
  onRejectBooking,
}: AdminScheduleTimelineProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>(initialMode);

  // Sync internal mode if prop changes
  React.useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  const todayStr = useMemo(() => toDateString(new Date()), []);
  const selectedDateStr = useMemo(() => toDateString(selectedDate), [selectedDate]);

  // Generate hourly markers 08:00 to 20:00
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push(h);
    }
    return list;
  }, []);

  // Compute Week dates
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Current time position (if today is within view)
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isNowInOperationalRange =
    currentMinutes >= START_MINUTES && currentMinutes <= START_MINUTES + TOTAL_MINUTES;
  const currentNowPercent = isNowInOperationalRange
    ? ((currentMinutes - START_MINUTES) / TOTAL_MINUTES) * 100
    : null;

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    onDateChange(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Header Title
  const titleText = useMemo(() => {
    if (viewMode === 'day') {
      const dayName = THAI_DAY_NAMES[selectedDate.getDay()];
      const day = selectedDate.getDate();
      const month = THAI_MONTH_NAMES_FULL[selectedDate.getMonth()];
      const yearBE = selectedDate.getFullYear() + 543;
      return `${dayName}ที่ ${day} ${month} ${yearBE}`;
    } else {
      const start = weekDates[0];
      const end = weekDates[6];
      const startDay = start.getDate();
      const startMonth = THAI_MONTH_NAMES_SHORT[start.getMonth()];
      const endDay = end.getDate();
      const endMonth = THAI_MONTH_NAMES_SHORT[end.getMonth()];
      const yearBE = end.getFullYear() + 543;
      return `สัปดาห์ที่ ${startDay} ${startMonth} - ${endDay} ${endMonth} ${yearBE}`;
    }
  }, [viewMode, selectedDate, weekDates]);

  // Filter bookings for a given date string (ignoring cancelled bookings for cleaner timeline, or showing them)
  const getBookingsForDate = (dateStr: string) => {
    const list = Array.isArray(bookings) ? bookings : [];
    return list.filter(
      (b) => b.date === dateStr && b.status !== 'CANCELLED' && b.status !== 'REJECTED'
    );
  };

  const dayBookings = useMemo(
    () => getBookingsForDate(selectedDateStr),
    [bookings, selectedDateStr]
  );

  const dayLanes = useMemo(() => assignLanes(dayBookings), [dayBookings]);

  // Helper to compute block position & width percentage
  const calculateBlockStyles = (b: AdminBooking) => {
    const startM = Math.max(START_MINUTES, Math.min(START_MINUTES + TOTAL_MINUTES, parseTimeToMinutes(b.startTime)));
    const endM = Math.max(START_MINUTES, Math.min(START_MINUTES + TOTAL_MINUTES, parseTimeToMinutes(b.endTime)));
    const duration = Math.max(endM - startM, 30); // minimum 30 mins visual width

    const left = ((startM - START_MINUTES) / TOTAL_MINUTES) * 100;
    const width = Math.max((duration / TOTAL_MINUTES) * 100, 4);

    return {
      left: `${left}%`,
      width: `${Math.min(width, 100 - left)}%`,
    };
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Top Header / Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-gradient-to-b from-slate-50/60 to-white">
        {/* Navigation buttons and Title */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 rounded-xl hover:bg-white hover:text-slate-900 text-slate-600 transition cursor-pointer"
              title={viewMode === 'day' ? 'วันก่อนหน้า' : 'สัปดาห์ก่อนหน้า'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedDateStr === todayStr
                  ? 'bg-orange-500 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:text-orange-600 shadow-2xs'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-xl hover:bg-white hover:text-slate-900 text-slate-600 transition cursor-pointer"
              title={viewMode === 'day' ? 'วันถัดไป' : 'สัปดาห์ถัดไป'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-orange-600 shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 font-sans tracking-tight">
              {titleText}
            </h3>
            {selectedDateStr === todayStr && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                วันนี้
              </span>
            )}
          </div>
        </div>

        {/* Right side: Day/Week Toggle & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500 mr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
              <span>อนุมัติแล้ว</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-500"></span>
              <span>รออนุมัติ</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>รายวัน</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>รายสัปดาห์</span>
            </button>
          </div>
        </div>
      </div>

      {/* Timeline View Body */}
      <div className="overflow-x-auto select-none p-3 sm:p-5">
        <div className="min-w-[820px]">
          {/* Time Header Scale (08:00 - 20:00) */}
          <div className="grid grid-cols-12 border-b border-slate-200 pb-2 mb-2 text-[11px] font-mono font-medium text-slate-400">
            {hours.slice(0, TOTAL_HOURS).map((h) => (
              <div key={h} className="text-left pl-1">
                <span>{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* ----------------- DAY VIEW ----------------- */}
          {viewMode === 'day' && (
            <div className="relative border border-slate-200 rounded-2xl bg-slate-50/40 p-2 min-h-[220px]">
              {/* Vertical Hour Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                {hours.slice(0, TOTAL_HOURS).map((h, idx) => (
                  <div
                    key={h}
                    className={`h-full border-r border-slate-200/60 ${
                      idx === 0 ? 'border-l' : ''
                    }`}
                  />
                ))}
              </div>

              {/* Current Time Red Vertical Line */}
              {selectedDateStr === todayStr && currentNowPercent !== null && (
                <div
                  className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{ left: `${currentNowPercent}%` }}
                >
                  <div className="w-0.5 h-full bg-rose-500 shadow-sm relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 -mt-1 shadow-sm animate-pulse" />
                    <span className="absolute -top-5 -left-6 bg-rose-500 text-white font-mono text-[9px] font-bold px-1 py-0.5 rounded shadow-xs whitespace-nowrap">
                      {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}

              {/* Day View Content */}
              {dayBookings.length === 0 ? (
                <div className="relative z-10 flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-200/60">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">ไม่มีรายการจองในช่วงเวลานี้</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">ห้องว่างตลอดวัน (08:00 - 20:00 น.)</p>
                </div>
              ) : (
                <div className="relative z-10 space-y-2 py-2">
                  {dayLanes.map((lane, laneIdx) => (
                    <div key={laneIdx} className="relative h-18">
                      {lane.map((b) => {
                        const style = calculateBlockStyles(b);
                        const isApproved = b.status === 'APPROVED';
                        const isPending = b.status === 'PENDING';

                        return (
                          <div
                            key={b.id}
                            style={style}
                            onClick={() => onSelectBooking(b)}
                            className={`absolute top-0 bottom-0 rounded-xl p-2 transition-all cursor-pointer shadow-xs group flex flex-col justify-between overflow-hidden text-left active:scale-[0.99] ${
                              isApproved
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700/80'
                                : isPending
                                ? 'bg-amber-50 hover:bg-amber-100/90 text-amber-950 border-2 border-amber-400 shadow-amber-100'
                                : 'bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                            title={`คลิกเพื่อดูรายละเอียด: ${b.fullName} (${b.startTime} - ${b.endTime})`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isApproved
                                    ? 'bg-emerald-800/60 text-emerald-100'
                                    : 'bg-amber-200/80 text-amber-900'
                                }`}
                              >
                                {b.startTime} - {b.endTime}
                              </span>

                              {/* Quick Action Buttons for Pending */}
                              {isPending && (
                                <div
                                  className="flex items-center gap-1 opacity-90 group-hover:opacity-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {onApproveBooking && (
                                    <button
                                      type="button"
                                      onClick={() => onApproveBooking(b)}
                                      className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
                                      title="อนุมัติคำขอนี้ทันที"
                                    >
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                    </button>
                                  )}
                                  {onRejectBooking && (
                                    <button
                                      type="button"
                                      onClick={() => onRejectBooking(b)}
                                      className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition"
                                      title="ปฏิเสธคำขอนี้"
                                    >
                                      <X className="w-3 h-3 stroke-[2.5]" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="truncate">
                              <div className="text-xs font-bold truncate leading-tight">
                                {b.fullName}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  isApproved ? 'text-emerald-100' : 'text-amber-800'
                                }`}
                              >
                                {b.department}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ----------------- WEEK VIEW ----------------- */}
          {viewMode === 'week' && (
            <div className="space-y-2">
              {weekDates.map((d) => {
                const dateStr = toDateString(d);
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDateStr;
                const dateBookings = getBookingsForDate(dateStr);
                const lanes = assignLanes(dateBookings);

                return (
                  <div
                    key={dateStr}
                    className={`border rounded-2xl p-2 transition flex items-center gap-3 ${
                      isToday
                        ? 'border-orange-300 bg-orange-50/20 shadow-2xs'
                        : isSelected
                        ? 'border-slate-300 bg-white'
                        : 'border-slate-200 bg-white/70 hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Day Column on Left */}
                    <div
                      onClick={() => {
                        onDateChange(d);
                        setViewMode('day');
                      }}
                      className="w-24 shrink-0 text-left cursor-pointer group"
                      title="คลิกเพื่อขยายดูมุมมองรายวัน"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold ${
                            isToday ? 'text-orange-600' : 'text-slate-800 group-hover:text-orange-600'
                          }`}
                        >
                          {THAI_DAY_SHORT[d.getDay()]} {d.getDate()}{' '}
                          {THAI_MONTH_NAMES_SHORT[d.getMonth()]}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {dateBookings.length === 0
                          ? 'ห้องว่าง'
                          : `${dateBookings.length} รายการ`}
                      </div>
                    </div>

                    {/* Timeline track on Right */}
                    <div className="flex-1 relative h-12 border border-slate-200/80 rounded-xl bg-slate-50/40 overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                        {hours.slice(0, TOTAL_HOURS).map((h, idx) => (
                          <div
                            key={h}
                            className={`h-full border-r border-slate-200/50 ${
                              idx === 0 ? 'border-l' : ''
                            }`}
                          />
                        ))}
                      </div>

                      {/* Current Time Line */}
                      {isToday && currentNowPercent !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
                          style={{ left: `${currentNowPercent}%` }}
                        />
                      )}

                      {/* Booking blocks */}
                      {dateBookings.length > 0 && (
                        <div className="relative z-10 h-full">
                          {dateBookings.map((b) => {
                            const style = calculateBlockStyles(b);
                            const isApproved = b.status === 'APPROVED';
                            const isPending = b.status === 'PENDING';

                            return (
                              <div
                                key={b.id}
                                style={style}
                                onClick={() => onSelectBooking(b)}
                                className={`absolute top-1 bottom-1 rounded-lg px-1.5 py-0.5 text-left text-[10px] transition cursor-pointer shadow-2xs truncate flex items-center justify-between ${
                                  isApproved
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : isPending
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 font-semibold'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                                title={`${b.fullName} (${b.startTime} - ${b.endTime}): ${b.reason}`}
                              >
                                <span className="truncate font-medium">{b.fullName}</span>
                                <span className="font-mono text-[9px] opacity-80 shrink-0 ml-1">
                                  {b.startTime}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
