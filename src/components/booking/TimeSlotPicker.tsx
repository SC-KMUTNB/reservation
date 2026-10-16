'use client';

import React, { useMemo } from 'react';
import { Clock, Info, CheckCircle2 } from 'lucide-react';
import { BookingItem } from '@/types/booking';

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  bookingsOnDate: BookingItem[];
  startTime: string;
  endTime: string;
  onSelectSlot: (start: string, end: string) => void;
  isToday: boolean;
  currentTimeStr: string;
  isPastDate: boolean;
}

export function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export function isSlotBooked(
  start: string,
  end: string,
  bookingsOnDate: BookingItem[]
): BookingItem | undefined {
  return bookingsOnDate.find(
    (b) =>
      (b.status === 'APPROVED' || b.status === 'PENDING') &&
      hasTimeOverlap(start, end, b.startTime, b.endTime)
  );
}

export function isSlotAvailable(
  start: string,
  end: string,
  bookingsOnDate: BookingItem[],
  isToday: boolean,
  currentTimeStr: string,
  isPastDate: boolean
): boolean {
  if (isPastDate) return false;
  if (isToday && start <= currentTimeStr) return false;
  return !isSlotBooked(start, end, bookingsOnDate);
}

export function getValidEndTimes(
  start: string,
  slots: TimeSlot[],
  bookingsOnDate: BookingItem[],
  isToday: boolean,
  currentTimeStr: string,
  isPastDate: boolean
): string[] {
  if (!start) return [];
  const validEnds: string[] = [];

  for (const slot of slots) {
    if (slot.start < start) continue;

    // The slot must be available
    const available = isSlotAvailable(
      slot.start,
      slot.end,
      bookingsOnDate,
      isToday,
      currentTimeStr,
      isPastDate
    );

    if (!available) {
      // Encountered occupied or past slot -> cannot bridge across it
      break;
    }

    validEnds.push(slot.end);
  }

  return validEnds;
}

export default function TimeSlotPicker({
  slots,
  bookingsOnDate,
  startTime,
  endTime,
  onSelectSlot,
  isToday,
  currentTimeStr,
  isPastDate,
}: TimeSlotPickerProps) {
  // Available start times (first slot of any range must be available)
  const validStartTimes = useMemo(() => {
    return slots
      .filter((slot) =>
        isSlotAvailable(slot.start, slot.end, bookingsOnDate, isToday, currentTimeStr, isPastDate)
      )
      .map((slot) => slot.start);
  }, [slots, bookingsOnDate, isToday, currentTimeStr, isPastDate]);

  // Available end times dynamically truncated at the next occupied slot
  const validEndTimes = useMemo(() => {
    return getValidEndTimes(
      startTime,
      slots,
      bookingsOnDate,
      isToday,
      currentTimeStr,
      isPastDate
    );
  }, [startTime, slots, bookingsOnDate, isToday, currentTimeStr, isPastDate]);

  // Duration computation
  const durationSummary = useMemo(() => {
    if (!startTime || !endTime || startTime >= endTime) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const totalMinutes = eH * 60 + eM - (sH * 60 + sM);
    if (totalMinutes <= 0) return null;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    let text = '';
    if (hours > 0) text += `${hours} ชั่วโมง`;
    if (mins > 0) text += ` ${mins} นาที`;
    return { text, totalMinutes };
  }, [startTime, endTime]);

  const handleStartChange = (newStart: string) => {
    if (!newStart) {
      onSelectSlot('', '');
      return;
    }

    const availableEnds = getValidEndTimes(
      newStart,
      slots,
      bookingsOnDate,
      isToday,
      currentTimeStr,
      isPastDate
    );

    if (availableEnds.length === 0) {
      onSelectSlot(newStart, '');
      return;
    }

    // If current endTime is still valid for this new start, keep it
    if (endTime && availableEnds.includes(endTime)) {
      onSelectSlot(newStart, endTime);
    } else {
      // Auto-adjust to the earliest valid end slot
      onSelectSlot(newStart, availableEnds[0]);
    }
  };

  const handleEndChange = (newEnd: string) => {
    if (!startTime) return;
    onSelectSlot(startTime, newEnd);
  };

  // 2-click Range Selection for Pills
  const handlePillClick = (slot: TimeSlot, isDisabled: boolean) => {
    if (isDisabled) return;

    // If no start selected yet, or clicking a slot strictly before current start
    if (!startTime || !endTime || slot.start < startTime) {
      onSelectSlot(slot.start, slot.end);
      return;
    }

    // If clicking the current start slot
    if (slot.start === startTime) {
      if (endTime > slot.end) {
        // Collapse multi-hour back to 1 slot
        onSelectSlot(slot.start, slot.end);
      }
      return;
    }

    // Clicking a slot after current start -> check if contiguous range is valid
    if (validEndTimes.includes(slot.end)) {
      // Expand range up to this slot's end time
      onSelectSlot(startTime, slot.end);
    } else {
      // Range crosses occupied or invalid slots -> restart selection from this slot
      onSelectSlot(slot.start, slot.end);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Header and Duration Indicator */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          <span>ช่วงเวลาที่ต้องการจอง (ระบุเวลาหรือคลิกเลือกช่วง)</span>
        </label>
        {durationSummary && (
          <div className="flex items-center gap-1.5 text-xs text-orange-800 font-semibold bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />
            <span>
              {startTime} - {endTime} น. (รวม {durationSummary.text})
            </span>
          </div>
        )}
      </div>

      {/* Mode 1: Manual Start Time & End Time Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            เวลาเริ่มต้น (Start Time) <span className="text-rose-500">*</span>
          </label>
          <select
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-2xs"
          >
            {validStartTimes.length === 0 ? (
              <option value="">ไม่มีช่วงเวลาว่างในวันที่เลือก</option>
            ) : (
              <>
                {!startTime && <option value="">-- เลือกเวลาเริ่มต้น --</option>}
                {validStartTimes.map((time) => (
                  <option key={time} value={time}>
                    {time} น.
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            เวลาสิ้นสุด (End Time) <span className="text-rose-500">*</span>
          </label>
          <select
            value={endTime}
            disabled={!startTime || validEndTimes.length === 0}
            onChange={(e) => handleEndChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-2xs"
          >
            {validEndTimes.length === 0 ? (
              <option value="">
                {!startTime ? 'กรุณาเลือกเวลาเริ่มต้นก่อน' : 'ไม่สามารถขยายเวลาเพิ่มได้'}
              </option>
            ) : (
              validEndTimes.map((time) => (
                <option key={time} value={time}>
                  {time} น.
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Mode 2: Interactive 2-Click Range Selection Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            คลิกเลือกช่องเริ่มต้น และคลิกช่องถัดไปเพื่อจองหลายชั่วโมงต่อเนื่อง
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const isSelected =
              Boolean(startTime) &&
              Boolean(endTime) &&
              startTime <= slot.start &&
              endTime >= slot.end;

            const conflict = isSlotBooked(slot.start, slot.end, bookingsOnDate);
            const isSlotPastToday = isToday && slot.start <= currentTimeStr;
            const isDisabled = isPastDate || isSlotPastToday || Boolean(conflict);

            let pillStyle =
              'bg-slate-50 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300';
            let statusText = 'ว่าง';

            if (conflict) {
              if (conflict.status === 'APPROVED') {
                pillStyle =
                  'bg-rose-50 border-rose-200 text-rose-700 opacity-90 cursor-not-allowed';
                statusText = 'อนุมัติแล้ว';
              } else {
                pillStyle =
                  'bg-amber-50 border-amber-200 text-amber-700 opacity-90 cursor-not-allowed';
                statusText = 'รอตรวจสอบ';
              }
            } else if (isPastDate || isSlotPastToday) {
              pillStyle =
                'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed';
              statusText = 'เลยเวลาแล้ว';
            } else if (isSelected) {
              pillStyle =
                'bg-orange-600 text-white border-orange-600 shadow-warm-xs scale-102 font-bold ring-2 ring-orange-200';
              statusText = '✓ เลือกอยู่';
            }

            return (
              <button
                key={`${slot.start}-${slot.end}`}
                type="button"
                disabled={isDisabled}
                onClick={() => handlePillClick(slot, isDisabled)}
                className={`p-2.5 rounded-2xl border text-center transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${pillStyle}`}
              >
                <span className="font-mono tabular-nums text-xs font-semibold">{slot.label}</span>
                <span
                  className={`text-[10px] mt-0.5 ${
                    isSelected
                      ? 'text-orange-100 font-bold'
                      : conflict?.status === 'APPROVED'
                      ? 'text-rose-600 font-bold'
                      : conflict?.status === 'PENDING'
                      ? 'text-amber-600 font-bold'
                      : 'text-slate-400'
                  }`}
                >
                  {statusText}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
