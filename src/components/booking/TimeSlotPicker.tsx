'use client';

import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { BookingItem } from '@/types/booking';

interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  bookingsOnDate: BookingItem[];
  startTime: string;
  endTime: string;
  onSelectSlot: (start: string, end: string) => void;
  isToday: boolean;
  currentTimeStr: string;
  isPastDate: boolean;
}

function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
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
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          <span>ช่วงเวลาที่เปิดให้บริการ (คลิกเลือกช่วงเวลา)</span>
        </label>
        <span className="text-[11px] text-slate-400 font-mono">
          เลือก: {startTime} - {endTime} น.
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const isSelected = startTime <= slot.start && endTime >= slot.end;

          const conflict = bookingsOnDate.find(
            (b) =>
              (b.status === 'APPROVED' || b.status === 'PENDING') &&
              hasTimeOverlap(slot.start, slot.end, b.startTime, b.endTime)
          );

          const isSlotPastToday = isToday && slot.start <= currentTimeStr;
          const isDisabled = isPastDate || isSlotPastToday || !!conflict;

          let pillStyle =
            'bg-slate-50 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300';
          let statusText = 'ว่าง';

          if (conflict) {
            if (conflict.status === 'APPROVED') {
              pillStyle = 'bg-rose-50 border-rose-200 text-rose-700 opacity-90 cursor-not-allowed';
              statusText = 'อนุมัติแล้ว';
            } else {
              pillStyle = 'bg-amber-50 border-amber-200 text-amber-700 opacity-90 cursor-not-allowed';
              statusText = 'รอตรวจสอบ';
            }
          } else if (isPastDate || isSlotPastToday) {
            pillStyle = 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed';
            statusText = 'เลยเวลาแล้ว';
          } else if (isSelected) {
            pillStyle =
              'bg-orange-600 text-white border-orange-600 shadow-warm-xs scale-102 font-bold';
            statusText = '✓ เลือกอยู่';
          }

          return (
            <button
              key={`${slot.start}-${slot.end}`}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectSlot(slot.start, slot.end)}
              className={`p-2.5 rounded-2xl border text-center transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${pillStyle}`}
            >
              <span className="font-mono tabular-nums text-xs font-semibold">{slot.label}</span>
              <span
                className={`text-[10px] mt-0.5 ${
                  isSelected
                    ? 'text-orange-100'
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
  );
}
