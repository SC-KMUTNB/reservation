'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Ban } from 'lucide-react';
import { BookingItem } from '@/types/booking';
import { ClosedDateItem } from '@/lib/facility-config';
import { calculateDayAvailability } from '@/lib/booking-capacity';

interface BookingCalendarCardProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTodayMonth: () => void;
  onSelectDate: (dateStr: string) => void;
  selectedDate: string;
  bookings: BookingItem[];
  closedDates: ClosedDateItem[];
  todayStr: string;
}

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function BookingCalendarCard({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onTodayMonth,
  onSelectDate,
  selectedDate,
  bookings,
  closedDates,
  todayStr,
}: BookingCalendarCardProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const yearBE = year + 543;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-warm">
      {/* Calendar Top Controls & Legend */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>เลือกวันที่ต้องการจอง</span>
            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              พ.ศ. {yearBE}
            </span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            คลิกที่ช่องวันที่เพื่อดูช่วงเวลาว่างและส่งคำขอจองห้องประชุม
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50/80 px-3.5 py-2 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>มีคิวอนุมัติแล้ว</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"></span>
            <span>มีคำขอรอตรวจสอบ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-rose-200"></span>
            <span>ปิดทำการ/งดใช้</span>
          </div>
        </div>
      </div>

      {/* Month Switcher Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active-press cursor-pointer"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onTodayMonth}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition active-press cursor-pointer"
          >
            เดือนปัจจุบัน
          </button>
        </div>

        <h4 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight">
          {MONTH_NAMES_TH[month]} {yearBE}
        </h4>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onNextMonth}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition active-press flex items-center gap-1 cursor-pointer"
          >
            เดือนถัดไป <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">
        <div className="text-rose-500 py-1">อา.</div>
        <div className="py-1">จ.</div>
        <div className="py-1">อ.</div>
        <div className="py-1">พ.</div>
        <div className="py-1">พฤ.</div>
        <div className="py-1">ศ.</div>
        <div className="text-blue-500 py-1">ส.</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2 md:gap-2.5">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="h-24 md:h-28 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/60"
          ></div>
        ))}

        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isSelected = dateStr === selectedDate;

          const blackout = closedDates.find((cd) => cd.date === dateStr);
          const isClosed = !!blackout;

          const dayBookings = bookings.filter((b) => b.date === dateStr);
          const activeBookings = dayBookings.filter(
            (b) => b.status === 'APPROVED' || b.status === 'PENDING'
          );
          const availability = calculateDayAvailability(dateStr, dayBookings, isPast);

          const hasApproved = dayBookings.some((b) => b.status === 'APPROVED');
          const hasPending = dayBookings.some((b) => b.status === 'PENDING');

          let cardStyle =
            'bg-white hover:border-orange-500 hover:shadow-warm-sm border-slate-200/90 text-slate-800';
          let badgeDot = null;

          if (isClosed) {
            cardStyle = 'bg-rose-50/50 border-rose-200 text-rose-700 hover:border-rose-300';
            badgeDot = <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>;
          } else if (isPast) {
            cardStyle = 'bg-slate-100/60 border-slate-200/60 text-slate-400 hover:border-slate-300';
          } else if (hasApproved) {
            cardStyle =
              'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500 hover:shadow-warm-sm text-slate-800';
            badgeDot = (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shadow-xs"></span>
            );
          } else if (hasPending) {
            cardStyle =
              'bg-amber-50/40 border-amber-300 hover:border-amber-500 hover:shadow-warm-sm text-slate-800';
            badgeDot = (
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200 shadow-xs"></span>
            );
          }

          if (isSelected) {
            cardStyle += ' ring-2 ring-orange-500 border-orange-500';
          }

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`${cardStyle} border rounded-2xl p-2.5 md:p-3 h-24 md:h-28 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative active-press`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`text-xs md:text-sm font-bold tabular-nums font-mono ${
                    isToday
                      ? 'bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-xs -ml-0.5 -mt-0.5'
                      : isPast
                      ? 'text-slate-400 font-normal'
                      : 'text-slate-700 group-hover:text-orange-600 transition-colors'
                  }`}
                >
                  {day}
                </span>
                {badgeDot}
              </div>

              <div>
                {isClosed ? (
                  <div className="text-[10px] md:text-[11px] font-semibold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-lg inline-block border border-rose-200 truncate max-w-full">
                    {blackout?.reason || 'ปิดทำการ'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div
                      className={`text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-lg inline-block border leading-tight ${availability.colorClasses.bg} ${availability.colorClasses.text} ${availability.colorClasses.border}`}
                    >
                      {availability.label}
                    </div>
                    {!isPast && (
                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${availability.colorClasses.bar}`}
                          style={{ width: `${availability.freePercentage}%` }}
                        />
                      </div>
                    )}
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
