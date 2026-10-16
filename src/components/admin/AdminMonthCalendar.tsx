'use client';

import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight as ArrowRightIcon,
} from 'lucide-react';
import type { AdminBooking } from './AdminScheduleTimeline';

export interface AdminMonthCalendarProps {
  bookings: AdminBooking[];
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
  onSelectDate: (dateStr: string) => void;
  onSelectBooking: (booking: AdminBooking) => void;
}

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const WEEKDAY_NAMES = [
  { short: 'อา.', full: 'อาทิตย์', isWeekend: true },
  { short: 'จ.', full: 'จันทร์', isWeekend: false },
  { short: 'อ.', full: 'อังคาร', isWeekend: false },
  { short: 'พ.', full: 'พุธ', isWeekend: false },
  { short: 'พฤ.', full: 'พฤหัสบดี', isWeekend: false },
  { short: 'ศ.', full: 'ศุกร์', isWeekend: false },
  { short: 'ส.', full: 'เสาร์', isWeekend: true },
];

function toDateString(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function AdminMonthCalendar({
  bookings,
  currentMonth,
  onMonthChange,
  onSelectDate,
  onSelectBooking,
}: AdminMonthCalendarProps) {
  const now = new Date();
  const todayStr = useMemo(() => {
    return toDateString(now.getFullYear(), now.getMonth(), now.getDate());
  }, [now]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const handleThisMonth = () => {
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Group bookings by date string for fast lookup
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, AdminBooking[]>();
    const list = Array.isArray(bookings) ? bookings : [];
    for (const b of list) {
      if (b.status === 'CANCELLED') continue;
      const list = map.get(b.date) || [];
      list.push(b);
      map.set(b.date, list);
    }
    return map;
  }, [bookings]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let total = 0;
    let approved = 0;
    let pending = 0;

    for (const b of bookings) {
      if (b.date.startsWith(monthPrefix) && b.status !== 'CANCELLED') {
        total++;
        if (b.status === 'APPROVED') approved++;
        if (b.status === 'PENDING') pending++;
      }
    }

    return { total, approved, pending };
  }, [bookings, year, month]);

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    // 1. Previous month trailing days
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonthDate = new Date(year, month - 1, day);
      cells.push({
        dateStr: toDateString(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), day),
        dayNum: day,
        isCurrentMonth: false,
        isWeekend: prevMonthDate.getDay() === 0 || prevMonthDate.getDay() === 6,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push({
        dateStr: toDateString(year, month, day),
        dayNum: day,
        isCurrentMonth: true,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    // 3. Next month leading days to complete week rows
    const remainder = cells.length % 7;
    if (remainder > 0) {
      const daysToAdd = 7 - remainder;
      for (let day = 1; day <= daysToAdd; day++) {
        const nextMonthDate = new Date(year, month + 1, day);
        cells.push({
          dateStr: toDateString(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), day),
          dayNum: day,
          isCurrentMonth: false,
          isWeekend: nextMonthDate.getDay() === 0 || nextMonthDate.getDay() === 6,
        });
      }
    }

    return cells;
  }, [year, month]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-gradient-to-b from-slate-50/60 to-white">
        {/* Month Navigation */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white hover:text-slate-900 text-slate-600 transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleThisMonth}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-orange-600 shadow-2xs transition cursor-pointer"
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-white hover:text-slate-900 text-slate-600 transition cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-orange-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
              {THAI_MONTH_NAMES[month]} {year + 543}
            </h3>
          </div>
        </div>

        {/* Month Summary Statistics Badges */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 font-medium text-slate-700">
            <span>ทั้งหมดในเดือน:</span>
            <span className="font-bold font-mono text-slate-900">{monthStats.total}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 font-medium text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>อนุมัติแล้ว:</span>
            <span className="font-bold font-mono text-emerald-900">{monthStats.approved}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 font-medium text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>รออนุมัติ:</span>
            <span className="font-bold font-mono text-amber-900">{monthStats.pending}</span>
          </div>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-slate-200/90 bg-slate-50/70 text-center text-xs font-bold text-slate-700 py-2.5">
        {WEEKDAY_NAMES.map((wd) => (
          <div
            key={wd.short}
            className={`flex items-center justify-center gap-1 ${
              wd.isWeekend ? 'text-orange-600/80' : 'text-slate-700'
            }`}
          >
            <span className="hidden sm:inline">{wd.full}</span>
            <span className="sm:hidden">{wd.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/40">
        {calendarCells.map((cell) => {
          const isToday = cell.dateStr === todayStr;
          const dayBookings = bookingsByDate.get(cell.dateStr) || [];
          const approvedCount = dayBookings.filter((b) => b.status === 'APPROVED').length;
          const pendingCount = dayBookings.filter((b) => b.status === 'PENDING').length;
          const hasBookings = dayBookings.length > 0;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[100px] sm:min-h-[125px] p-2 sm:p-2.5 transition-colors cursor-pointer group flex flex-col justify-between select-none relative ${
                cell.isCurrentMonth
                  ? isToday
                    ? 'bg-orange-50/40 hover:bg-orange-50/70'
                    : 'bg-white hover:bg-slate-50'
                  : 'bg-slate-50/50 hover:bg-slate-100/60 opacity-60'
              }`}
              title={`คลิกเพื่อดูไทม์ไลน์วันที่ ${cell.dateStr}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-mono ${
                    isToday
                      ? 'bg-orange-600 text-white font-bold shadow-2xs'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 group-hover:text-orange-600'
                      : 'text-slate-400'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {/* Day status badge (e.g. today or empty) */}
                {isToday && (
                  <span className="hidden sm:inline-block text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                    วันนี้
                  </span>
                )}
              </div>

              {/* Day Booking Badges & Preview chips */}
              <div className="mt-1.5 space-y-1 flex-1 flex flex-col justify-end">
                {hasBookings ? (
                  <>
                    {/* Count Pills */}
                    <div className="flex flex-wrap items-center gap-1">
                      {approvedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                          <span>{approvedCount}</span>
                          <span className="hidden md:inline">อนุมัติ</span>
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span>{pendingCount}</span>
                          <span className="hidden md:inline">รอ</span>
                        </span>
                      )}
                    </div>

                    {/* Desktop miniature preview chips */}
                    <div className="hidden sm:flex flex-col gap-0.5 pt-0.5">
                      {dayBookings.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBooking(b);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate transition text-left cursor-pointer hover:shadow-2xs ${
                            b.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                          }`}
                          title={`${b.startTime}-${b.endTime} ${b.fullName}`}
                        >
                          <span className="font-mono font-medium mr-1 text-[9px] opacity-75">
                            {b.startTime}
                          </span>
                          <span className="font-medium truncate">{b.fullName}</span>
                        </div>
                      ))}

                      {dayBookings.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-medium text-left pl-1">
                          +{dayBookings.length - 2} รายการเพิ่มเติม
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="hidden sm:block text-[10px] text-slate-300 font-light text-left pl-1">
                    -
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
