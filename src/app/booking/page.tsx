'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Landmark,
  Lock,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Share2,
  Info,
  CalendarCheck,
  ArrowLeft,
  Copy,
  Check,
  Building2,
  User,
  Mail,
  Phone,
  Hash,
  Sparkles
} from 'lucide-react';

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

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Operational hours: 08:00 - 20:00 (hourly intervals)
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

function isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export default function BookingPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const formattedMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchBookings(formattedMonthStr);
  }, [formattedMonthStr]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBookings = async (monthStr: string) => {
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
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const openDateModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    setErrorMessage(null);

    // Find the first available slot on that date
    const dayBookings = bookings.filter(
      (b) => b.date === dateStr && (b.status === 'APPROVED' || b.status === 'PENDING')
    );

    const firstFreeSlot = OPERATIONAL_SLOTS.find((slot) =>
      !dayBookings.some((b) => isTimeOverlapping(slot.start, slot.end, b.startTime, b.endTime))
    );

    if (firstFreeSlot) {
      setFormData((prev) => ({
        ...prev,
        startTime: firstFreeSlot.start,
        endTime: firstFreeSlot.end,
      }));
    }

    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setErrorMessage(null);
  };

  // Active bookings on the selected date (APPROVED and PENDING)
  const selectedDateBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.date === selectedDate && (b.status === 'APPROVED' || b.status === 'PENDING')
    );
  }, [bookings, selectedDate]);

  // Real-time conflict detection
  const conflictDetails = useMemo(() => {
    if (!formData.startTime || !formData.endTime) return null;
    if (formData.startTime >= formData.endTime) {
      return { type: 'INVALID_ORDER', message: 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด' };
    }

    const conflict = selectedDateBookings.find((b) =>
      isTimeOverlapping(formData.startTime, formData.endTime, b.startTime, b.endTime)
    );

    if (conflict) {
      const statusLabel = conflict.status === 'APPROVED' ? 'ได้รับการอนุมัติแล้ว' : 'มีผู้จองแล้ว (รอตรวจสอบ)';
      return {
        type: 'OVERLAP',
        message: `ช่วงเวลานี้ตรงกับการจองที่${statusLabel} (${conflict.startTime} - ${conflict.endTime} น. โดย ${conflict.fullName})`,
      };
    }

    return null;
  }, [formData.startTime, formData.endTime, selectedDateBookings]);

  const handleSelectSlot = (slotStart: string, slotEnd: string) => {
    setFormData((prev) => ({
      ...prev,
      startTime: slotStart,
      endTime: slotEnd,
    }));
    setErrorMessage(null);
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (conflictDetails) {
      setErrorMessage(conflictDetails.message);
      return;
    }

    setIsBookingModalOpen(false);
    setIsRuleModalOpen(true);
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
        setIsRuleModalOpen(false);
        setIsBookingModalOpen(true);
        setErrorMessage(data.error || 'ไม่สามารถส่งคำขอจองได้');
        return;
      }

      setIsRuleModalOpen(false);
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
      fetchBookings(formattedMonthStr);
    } catch (e) {
      console.error(e);
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBookingCode = () => {
    if (successBookingCode) {
      navigator.clipboard.writeText(successBookingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
      {/* Sticky Frosted Header */}
      <header className="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">
                {settings.site_title || 'สภานักศึกษา มจพ.'}
              </h1>
              <p className="text-[11px] text-orange-100 font-medium tracking-wide">
                {settings.site_subtitle || 'Student Council KMUTNB'}
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition"
            >
              หน้าหลัก
            </Link>
            <Link
              href="/booking"
              className="px-3 py-1.5 rounded-xl bg-orange-700/60 text-white font-semibold shadow-inner border border-orange-400/30 flex items-center gap-1.5"
            >
              <CalendarIcon className="w-4 h-4" /> จองห้องประชุม
            </Link>
            <Link
              href="/track"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" /> ตรวจสอบสถานะ
            </Link>
            <Link
              href="/#channels"
              className="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition"
            >
              ช่องทางติดต่อ
            </Link>
            <div className="pl-2">
              <Link
                href="/admin/login"
                className="bg-orange-950/40 hover:bg-orange-950/60 text-orange-100 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-orange-400/30 shadow-xs transition active-press flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> แอดมิน
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Subheader */}
      <section className="bg-gradient-to-b from-orange-600 to-amber-600 text-white py-10 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-dots opacity-15 pointer-events-none"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-orange-950/30 text-orange-100 px-3 py-1 rounded-full text-xs font-medium mb-2 border border-orange-400/30 backdrop-blur-xs">
              <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>ระบบจองห้องประชุมออนไลน์ • ป้องกันเวลาซ้อนทับ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ปฏิทินตรวจสอบและจองห้องประชุม
            </h2>
            <p className="text-orange-100 text-xs md:text-sm mt-1 max-w-xl font-light">
              เลือกวันที่ต้องการจองเพื่อดูช่วงเวลาว่าง ระบบจะล็อกช่วงเวลาที่มีการจองแล้วอัตโนมัติ (First-come, First-served)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2.5 rounded-xl border border-white/20 transition active-press flex items-center gap-1.5 backdrop-blur-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
            </Link>
            <Link
              href="/track"
              className="bg-white text-orange-600 hover:bg-orange-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-warm-xs transition active-press flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" /> ตรวจสอบสถานะการจอง
            </Link>
          </div>
        </div>
      </section>

      {/* Main Calendar View */}
      <main className="flex-grow max-w-6xl mx-auto px-4 -mt-4 pb-14 w-full relative z-20">
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-warm">
          {/* Calendar Top Controls & Legend */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>เลือกวันที่ต้องการจอง</span>
                {isLoading && (
                  <span className="text-xs font-normal text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200 animate-pulse">
                    กำลังซิงค์ข้อมูล...
                  </span>
                )}
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                คลิกที่ช่องวันที่เพื่อเปิดตารางช่วงเวลาและกรอกแบบฟอร์มคำขอจอง
              </p>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> ว่าง
              </span>
              <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"></span> รอตรวจสอบ
              </span>
              <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> อนุมัติแล้ว
              </span>
            </div>
          </div>

          {/* Month Header Switcher */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={prevMonth}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition active-press flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> เดือนก่อนหน้า
            </button>

            <div className="text-center">
              <h4 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                {MONTH_NAMES_TH[month]} <span className="tabular-nums font-mono text-orange-600">{year + 543}</span>
              </h4>
            </div>

            <button
              onClick={nextMonth}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition active-press flex items-center gap-1 cursor-pointer"
            >
              เดือนถัดไป <ChevronRight className="w-4 h-4" />
            </button>
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

              const dayBookings = bookings.filter((b) => b.date === dateStr);
              const activeBookings = dayBookings.filter(
                (b) => b.status === 'APPROVED' || b.status === 'PENDING'
              );

              const hasApproved = dayBookings.some((b) => b.status === 'APPROVED');
              const hasPending = dayBookings.some((b) => b.status === 'PENDING');

              let cardStyle =
                'bg-white hover:border-orange-500 hover:shadow-warm-sm border-slate-200/90 text-slate-800';
              let badgeDot = null;

              if (hasApproved) {
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

              return (
                <div
                  key={dateStr}
                  onClick={() => openDateModal(dateStr)}
                  className={`${cardStyle} border rounded-2xl p-2.5 md:p-3 h-24 md:h-28 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative active-press`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-xs md:text-sm font-bold tabular-nums font-mono ${
                        isToday
                          ? 'bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-xs -ml-0.5 -mt-0.5'
                          : 'text-slate-700 group-hover:text-orange-600 transition-colors'
                      }`}
                    >
                      {day}
                    </span>
                    {badgeDot}
                  </div>

                  <div>
                    {activeBookings.length > 0 ? (
                      <div className="text-[10px] md:text-[11px] font-semibold text-orange-800 bg-orange-100/80 px-2 py-0.5 rounded-lg inline-block border border-orange-200/60 leading-tight">
                        {activeBookings.length} รายการ
                      </div>
                    ) : (
                      <div className="text-[10px] md:text-[11px] text-slate-300 group-hover:text-orange-600 transition-colors font-medium">
                        คลิกจอง
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Booking Form Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-7 shadow-2xl my-8 border border-slate-100 relative">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200/80 mb-1">
                  <CalendarCheck className="w-3.5 h-3.5" /> แบบฟอร์มขอใช้ห้อง
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  จองห้องประชุมวันที่ <span className="text-orange-600 font-mono tabular-nums">{selectedDate}</span>
                </h3>
              </div>
              <button
                onClick={closeBookingModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing Active Bookings list */}
            {selectedDateBookings.length > 0 && (
              <div className="mb-4 bg-slate-50 p-3.5 rounded-2xl text-xs text-slate-600 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> ช่วงเวลาที่ถูกจองแล้วในวันนี้ (ไม่สามารถจองซ้อนได้):
                </span>
                <div className="space-y-1.5">
                  {selectedDateBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex justify-between items-center py-1 border-b border-slate-200/70 last:border-0"
                    >
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        {b.startTime} - {b.endTime} น.
                        <span className="text-slate-500 font-sans font-normal ml-2">
                          ({b.fullName} • {b.department})
                        </span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          b.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {b.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Time Slot Selector Grid (08:00 - 20:00) */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-800">
                  เลือกช่วงเวลาเปิดใช้งาน (08:00 - 20:00 น.)
                </label>
                <span className="text-[11px] text-slate-400">คลิกบล็อกเวลาที่ว่าง</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {OPERATIONAL_SLOTS.map((slot) => {
                  const conflict = selectedDateBookings.find((b) =>
                    isTimeOverlapping(slot.start, slot.end, b.startTime, b.endTime)
                  );

                  const isOccupied = !!conflict;
                  const isSelected =
                    formData.startTime <= slot.start && formData.endTime >= slot.end;

                  let slotClass =
                    'border border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50/50 text-slate-700 cursor-pointer shadow-2xs';

                  if (isOccupied) {
                    if (conflict?.status === 'APPROVED') {
                      slotClass =
                        'border-emerald-200/80 bg-emerald-50/60 text-emerald-800 cursor-not-allowed opacity-75';
                    } else {
                      slotClass =
                        'border-amber-200/80 bg-amber-50/60 text-amber-800 cursor-not-allowed opacity-75';
                    }
                  } else if (isSelected) {
                    slotClass =
                      'border-orange-600 bg-orange-600 text-white shadow-warm-xs font-bold';
                  }

                  return (
                    <button
                      key={slot.label}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => handleSelectSlot(slot.start, slot.end)}
                      className={`p-2 rounded-xl text-center text-xs transition active-press flex flex-col items-center justify-center min-h-[52px] ${slotClass}`}
                    >
                      <span className="font-mono tabular-nums text-xs">{slot.label}</span>
                      <span className="text-[10px] mt-0.5">
                        {isOccupied
                          ? conflict?.status === 'APPROVED'
                            ? 'อนุมัติแล้ว'
                            : 'รอตรวจสอบ'
                          : isSelected
                          ? '✓ เลือกอยู่'
                          : 'ว่าง'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error or Conflict Alert Banner */}
            {conflictDetails && (
              <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3.5 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{conflictDetails.message}</span>
              </div>
            )}

            {errorMessage && !conflictDetails && (
              <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3.5 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Form Inputs */}
            <form onSubmit={handlePreSubmit} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เวลาเริ่มต้น</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">ชื่อ-นามสกุล ผู้จอง</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1 text-xs">รหัสนักศึกษา</label>
                  <input
                    type="text"
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="เช่น 6501012345"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1 text-xs">เบอร์ติดต่อ</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="เช่น 0812345678"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">อีเมลผู้จอง</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="เช่น student@kmutnb.ac.th"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">หน่วยงาน / ชมรม / สโมสร</label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="เช่น สโมสรนักศึกษาคณะวิศวกรรมศาสตร์"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1 text-xs">เหตุผลและวาระการประชุม</label>
                <textarea
                  rows={2}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="ระบุวาระการประชุมหรือกิจกรรมพอสังเขป"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeBookingModal}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition font-medium cursor-pointer text-xs active-press"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!!conflictDetails}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold cursor-pointer shadow-warm-xs disabled:opacity-50 disabled:cursor-not-allowed text-xs active-press"
                >
                  ตรวจสอบกฎระเบียบและยืนยัน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-center border border-slate-100">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl shadow-warm-xs">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">กฎระเบียบการใช้ห้องประชุม</h3>
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 text-left mb-6 space-y-2 whitespace-pre-line leading-relaxed">
              {settings.rules_content ||
                `1. ห้ามนำอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) เข้ามารับประทานในห้องประชุมเด็ดขาด\n2. ช่วยกันรักษาความสะอาด ปิดไฟ และเครื่องปรับอากาศทุกครั้งหลังใช้งานเสร็จ\n⚠️ คำเตือน: หากทำผิดกฎระเบียบ ท่านจะไม่สามารถจองห้องประชุมได้อีกเป็นเวลา 2 เดือนเต็ม`}
            </div>
            <div className="flex space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsRuleModalOpen(false);
                  setIsBookingModalOpen(true);
                }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition font-medium text-xs cursor-pointer active-press"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleFinalConfirm}
                className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition font-semibold text-xs cursor-pointer shadow-warm-xs disabled:opacity-50 active-press"
              >
                {isLoading ? 'กำลังบันทึก...' : 'ยอมรับและยืนยันการจอง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Booking Code Modal (Ticket Style) */}
      {successBookingCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl text-center border border-slate-100 relative">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-warm-xs">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-1 tracking-tight">
              ส่งคำขอจองสำเร็จ
            </h3>
            <p className="text-xs text-slate-500 mb-5 font-light">
              คำขอของคุณอยู่ในสถานะ <span className="text-amber-600 font-semibold">รอการอนุมัติ</span> กรุณาบันทึกรหัสนี้ไว้เพื่อใช้ตรวจสอบ
            </p>

            {/* Ticket Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 relative group">
              <div className="text-[11px] text-orange-700 font-semibold uppercase tracking-wider">
                Booking Code (รหัสการจอง)
              </div>
              <div className="text-lg md:text-xl font-bold text-orange-600 tracking-wider font-mono my-2 select-all">
                {successBookingCode}
              </div>
              <button
                type="button"
                onClick={copyBookingCode}
                className="inline-flex items-center gap-1.5 text-xs text-orange-700 bg-white border border-orange-200/80 px-3 py-1 rounded-lg hover:bg-orange-100/60 transition active-press cursor-pointer shadow-2xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">คัดลอกรหัสแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คลิกเพื่อคัดลอก</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex space-x-2.5">
              <Link
                href={`/track?q=${successBookingCode}`}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition font-medium text-xs flex items-center justify-center gap-1.5 shadow-warm-xs active-press"
              >
                <Search className="w-3.5 h-3.5" /> ดูสถานะคำขอนี้
              </Link>
              <button
                type="button"
                onClick={() => setSuccessBookingCode(null)}
                className="py-2.5 px-5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium text-xs cursor-pointer active-press"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 text-xs mt-auto border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="font-semibold text-slate-200">สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)</p>
            <p className="text-slate-500 mt-1">
              อีเมล: {settings.contact_email || 'council@kmutnb.ac.th'} | โทร: {settings.contact_phone || '02-555-2000 ต่อ 1135'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="hover:text-white transition">หน้าหลัก</Link>
            <Link href="/track" className="hover:text-white transition">ตรวจสอบการจอง</Link>
            <Link href="/admin/login" className="hover:text-white transition">สำหรับผู้ดูแลระบบ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
