'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  RotateCw,
  Landmark,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  ShieldCheck,
  Search,
  Sparkles,
  CalendarX,
} from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';
import { getNowInTimezone } from '@/lib/date-utils';

interface BookingItem {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  department: string;
  fullName: string;
}

const OPERATIONAL_SLOTS = [
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

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const DAY_NAMES_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MobileBookingPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getNowInTimezone('Asia/Bangkok').dateStr;
  });
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Bottom Sheet Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRuleSheetOpen, setIsRuleSheetOpen] = useState(false);
  const [successBookingCode, setSuccessBookingCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    department: '',
    reason: '',
    startTime: '09:00',
    endTime: '11:00',
  });

  const nowInTz = useMemo(() => {
    return getNowInTimezone(settings.timezone);
  }, [settings.timezone]);

  const todayStr = nowInTz.dateStr;
  const currentTimeStr = nowInTz.timeStr;
  const isPastSelectedDate = selectedDate < todayStr;

  const selectedMonthStr = selectedDate.slice(0, 7);

  // Fetch settings & bookings for current month
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings || {};
        setSettings(s);
        const { dateStr } = getNowInTimezone(s.timezone);
        setSelectedDate((prev) => (prev < dateStr ? dateStr : prev));
      })
      .catch(console.error);
  }, []);

  const fetchMonthBookings = useCallback(async (monthStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMonthStr) {
      fetchMonthBookings(selectedMonthStr);
    }
  }, [selectedMonthStr, fetchMonthBookings]);

  // Generate 21-day swipeable window starting from today in timezone
  const dateWindow = useMemo(() => {
    const dates: string[] = [];
    const parts = todayStr.split('-').map(Number);
    const y = parts[0] || new Date().getFullYear();
    const m = (parts[1] || 1) - 1;
    const d = parts[2] || 1;

    for (let i = 0; i < 21; i++) {
      const dt = new Date(y, m, d + i);
      dates.push(formatDateStr(dt));
    }
    return dates;
  }, [todayStr]);

  // Filter bookings for the actively selected date
  const dayBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.date === selectedDate && (b.status === 'APPROVED' || b.status === 'PENDING')
    );
  }, [bookings, selectedDate]);

  // Conflict check for selected times
  const conflictDetails = useMemo(() => {
    if (selectedDate < todayStr) {
      return { type: 'PAST_DATE', message: 'ไม่อนุญาตให้จองย้อนหลัง กรุณาเลือกวันที่ปัจจุบันหรือในอนาคต' };
    }

    if (!formData.startTime || !formData.endTime) return null;
    if (formData.startTime >= formData.endTime) {
      return { type: 'INVALID_ORDER', message: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด' };
    }

    const { timeStr: currentTzTime } = getNowInTimezone(settings.timezone);
    if (selectedDate === todayStr && formData.startTime <= currentTzTime) {
      return { type: 'PAST_TIME', message: 'เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต' };
    }

    const conflict = dayBookings.find((b) =>
      isTimeOverlapping(formData.startTime, formData.endTime, b.startTime, b.endTime)
    );

    if (conflict) {
      const statusLabel = conflict.status === 'APPROVED' ? 'ได้รับการอนุมัติแล้ว' : 'มีผู้จองแล้ว (รอตรวจสอบ)';
      return {
        type: 'OVERLAP',
        message: `ช่วงเวลานี้ตรงกับรายการที่${statusLabel} (${conflict.startTime} - ${conflict.endTime} น.)`,
      };
    }

    return null;
  }, [formData.startTime, formData.endTime, dayBookings, selectedDate, todayStr, settings.timezone]);

  const handleOpenFormWithSlot = (start: string, end: string) => {
    if (isPastSelectedDate) return;
    const { timeStr: currentTzTime } = getNowInTimezone(settings.timezone);
    if (selectedDate === todayStr && start <= currentTzTime) {
      setErrorMessage('เวลาเริ่มต้นที่เลือกได้ผ่านไปแล้ว กรุณาเลือกเวลาในอนาคต');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      startTime: start,
      endTime: end,
    }));
    setErrorMessage(null);
    setIsFormOpen(true);
  };


  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (conflictDetails) {
      setErrorMessage(conflictDetails.message);
      return;
    }

    setIsFormOpen(false);
    setIsRuleSheetOpen(true);
  };

  const handleFinalConfirm = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: selectedDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsRuleSheetOpen(false);
        setIsFormOpen(true);
        setErrorMessage(data.error || 'ไม่สามารถส่งคำขอจองได้');
        return;
      }

      setIsRuleSheetOpen(false);
      setSuccessBookingCode(data.booking.bookingCode);
      setFormData({
        fullName: '',
        studentId: '',
        email: '',
        phone: '',
        department: '',
        reason: '',
        startTime: '09:00',
        endTime: '11:00',
      });
      await fetchMonthBookings(selectedMonthStr);
    } catch (e) {
      console.error(e);
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (successBookingCode) {
      navigator.clipboard.writeText(successBookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Format header Thai date representation
  const selectedDateObj = new Date(selectedDate);
  const thaiDateHeader = `${selectedDateObj.getDate()} ${MONTH_NAMES_TH[selectedDateObj.getMonth()]} ${selectedDateObj.getFullYear() + 543}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <MobileHeader title="จองห้องประชุม" subtitle="เลือกวันและเวลาที่ต้องการ" />

      {/* Swipeable Date Strip */}
      <div className="bg-white border-b border-slate-200 sticky top-12 z-30 shadow-2xs">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <CalendarIcon className="w-3.5 h-3.5 text-orange-600" />
            <span>{thaiDateHeader}</span>
          </div>
          <input
            type="date"
            min={todayStr}
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="text-[11px] bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium"
          />
        </div>

        {/* Horizontal Days Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 no-scrollbar scroll-smooth">
          {dateWindow.map((dateStr) => {
            const isSelected = dateStr === selectedDate;
            const parts = dateStr.split('-').map(Number);
            const dt = new Date(parts[0], parts[1] - 1, parts[2]);
            const dayName = DAY_NAMES_TH[dt.getDay()];
            const dayNum = parts[2];
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-12 py-2 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                <span className={`text-[10px] uppercase ${isSelected ? 'text-orange-100' : 'text-slate-600'}`}>
                  {isToday ? 'วันนี้' : dayName}
                </span>
                <span className="text-sm font-extrabold mt-0.5">{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots Vertical Timeline */}
      <div className="px-4 py-4 space-y-3 flex-1">
        {isPastSelectedDate && (
          <div className="p-3.5 bg-slate-100 border border-slate-200/90 rounded-2xl flex items-center gap-2.5 text-slate-700">
            <CalendarX className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">ไม่อนุญาตให้จองย้อนหลัง</p>
              <p className="text-[11px] text-slate-500">วันที่นี้ได้ผ่านพ้นไปแล้ว สามารถเปิดดูข้อมูลประวัติการจองเดิมได้เท่านั้น</p>
            </div>
          </div>
        )}

        {selectedDate === todayStr && OPERATIONAL_SLOTS.every((s) => s.start <= currentTimeStr) && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>รอบเวลาเปิดใช้งานสำหรับวันนี้ผ่านพ้นไปหมดแล้ว กรุณาเลือกวันอื่น</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-600" />
            <span>ตารางเวลาทำการ (08:00 - 20:00 น.)</span>
          </span>
          <span className="text-[11px] text-slate-600">
            {dayBookings.length === 0 ? 'ว่างทั้งวัน' : `จองแล้ว ${dayBookings.length} รายการ`}
          </span>
        </div>

        {/* Slot Cards List */}
        <div className="space-y-2">
          {OPERATIONAL_SLOTS.map((slot) => {
            const overlapping = dayBookings.find((b) =>
              isTimeOverlapping(slot.start, slot.end, b.startTime, b.endTime)
            );

            const isPastSlot = selectedDate === todayStr && slot.start <= currentTimeStr;
            const isAvailable = !overlapping && !isPastSlot && !isPastSelectedDate;

            return (
              <div
                key={slot.start}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                  isAvailable
                    ? 'bg-white border-slate-200/90 shadow-2xs hover:border-orange-300'
                    : 'bg-slate-100/70 border-slate-200 text-slate-400'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold font-mono ${
                        isPastSlot || isPastSelectedDate
                          ? 'text-slate-400'
                          : isAvailable
                          ? 'text-slate-800'
                          : 'text-slate-500 line-through'
                      }`}
                    >
                      {slot.label}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isPastSlot || isPastSelectedDate
                          ? 'bg-slate-200/60 text-slate-500 border border-slate-300/40'
                          : isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : overlapping?.status === 'APPROVED'
                          ? 'bg-red-50 text-red-700 border border-red-200/60'
                          : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}
                    >
                      {isPastSlot || isPastSelectedDate
                        ? 'เลยเวลาแล้ว'
                        : isAvailable
                        ? 'ว่าง'
                        : overlapping?.status === 'APPROVED'
                        ? 'อนุมัติแล้ว'
                        : 'รออนุมัติ'}
                    </span>
                  </div>

                  {!isAvailable && overlapping && (
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {overlapping.department || overlapping.fullName}
                    </p>
                  )}
                </div>

                {isPastSelectedDate || isPastSlot ? (
                  <span className="text-[11px] text-slate-400 font-medium">เลยเวลาแล้ว</span>
                ) : isAvailable ? (
                  <button
                    onClick={() => handleOpenFormWithSlot(slot.start, slot.end)}
                    className="bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    จองช่วงนี้
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">ไม่ว่าง</span>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* -------------------- Top Popup Form -------------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-start p-3 pt-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white w-full max-w-md mx-auto rounded-3xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-top duration-300"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-bold text-slate-900">กรอกข้อมูลการจองห้องประชุม</h3>
                <p className="text-[11px] text-orange-600 font-medium">
                  วันที่ {thaiDateHeader}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body (Scrollable) */}
            <form onSubmit={handlePreSubmit} className="p-4 overflow-y-auto space-y-3.5 flex-1">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เวลาเริ่มต้น
                  </label>
                  <select
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-orange-500"
                  >
                    {OPERATIONAL_SLOTS.map((s) => (
                      <option key={s.start} value={s.start}>
                        {s.start} น.
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เวลาสิ้นสุด
                  </label>
                  <select
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-orange-500"
                  >
                    {OPERATIONAL_SLOTS.map((s) => (
                      <option key={s.end} value={s.end}>
                        {s.end} น.
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล ผู้จอง
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="เช่น นายสมชาย ใจดี"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Student ID */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  รหัสนักศึกษา (13 หลัก)
                </label>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="เช่น 6501091234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    อีเมล (สำหรับรับผลการอนุมัติ)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="s65010...@kmutnb.ac.th"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0812345678"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  คณะ / ภาควิชา / สโมสร / ชุมนุม
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="เช่น ชุมนุมโรบอท / วิศวกรรมไฟฟ้า"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  วัตถุประสงค์ในการขอใช้ห้อง
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="เช่น ประชุมวางแผนกิจกรรมเตรียมความพร้อมนักศึกษาใหม่"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span>ต่อไป: ตรวจสอบและยอมรับกฎระเบียบ &rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- Rules Confirmation Bottom Sheet -------------------- */}
      {isRuleSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-start p-3 pt-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-slate-200 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-sm">ข้อตกลงและกฎระเบียบการใช้ห้อง</h3>
            </div>

            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-light">
              {settings.rules_content ||
                '1. ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด\n2. ช่วยกันรักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จ\n⚠️ คำเตือน: หากทำผิดกฎระเบียบ ท่านจะไม่สามารถจองห้องประชุมได้อีกเป็นเวลา 2 เดือนเต็ม'}
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleFinalConfirm}
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs shadow-md active:scale-98 transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกข้อมูลและส่งอีเมล...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ยอมรับกฎระเบียบและยืนยันการจอง</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsRuleSheetOpen(false);
                  setIsFormOpen(true);
                }}
                disabled={isLoading}
                className="w-full bg-slate-100 text-slate-600 font-semibold py-2.5 rounded-xl text-xs active:scale-98 transition"
              >
                ย้อนกลับไปแก้ไขข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- Success Modal -------------------- */}
      {successBookingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-800">ส่งคำขอจองสำเร็จ!</h3>
              <p className="text-xs text-slate-500 mt-1">
                ระบบได้รับคำขอของท่านแล้ว โปรดบันทึกรหัสการจองไว้สำหรับติดตามสถานะ
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5">
              <span className="text-[10px] text-orange-700 font-bold uppercase tracking-wider block">
                รหัสการจองของท่าน (Booking Code)
              </span>
              <span className="font-mono text-lg font-black text-orange-600 mt-0.5 block select-all">
                {successBookingCode}
              </span>
              <button
                onClick={copyCode}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 rounded-lg text-xs font-semibold text-orange-600 active:scale-95 shadow-2xs"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href={`/m/track?q=${encodeURIComponent(successBookingCode)}`}
                className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs block active:scale-98 transition shadow-xs"
              >
                ดูสถานะและ QR Code ทันที &rarr;
              </Link>
              <button
                onClick={() => setSuccessBookingCode(null)}
                className="w-full bg-slate-100 text-slate-600 font-medium py-2 rounded-xl text-xs active:scale-98 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch to Desktop Footer */}
      <ViewSwitcherFooter currentMode="mobile" />
    </div>
  );
}
