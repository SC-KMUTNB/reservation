'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowLeft,
  Landmark,
  FileText,
  Copy,
  Check,
  CalendarPlus,
  X,
  User,
  Building,
  AlertTriangle,
  Download,
  CalendarDays,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';
import { isBackdated } from '@/lib/date-utils';
import { buildGoogleCalendarUrl, generateIcsContent } from '@/lib/calendar-export';

export interface BookingTrackItem {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  department: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string | null;
  approvedAt?: string | null;
  checkedInAt?: string | null;
  createdAt: string;
}

function TrackContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<BookingTrackItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appBaseUrl, setAppBaseUrl] = useState('');

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState<BookingTrackItem | null>(null);
  const [cancelStudentId, setCancelStudentId] = useState('');
  const [cancelPhoneLast4, setCancelPhoneLast4] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const fetchAppBaseUrl = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        const value = String(data?.settings?.app_base_url || '').trim().replace(/\/+$/, '');
        setAppBaseUrl(value);
      } catch (error) {
        console.error(error);
      }
    };
    fetchAppBaseUrl();
  }, []);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setIsLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/bookings/track?q=${encodeURIComponent(searchTerm.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.bookings || []);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const qrBaseUrl =
    appBaseUrl || (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCancelModal = (booking: BookingTrackItem) => {
    setCancellingBooking(booking);
    setCancelStudentId(booking.studentId || (query.match(/^\d{13}$/) ? query : ''));
    setCancelPhoneLast4('');
    setCancelReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;
    if (!cancelStudentId.trim() || !cancelPhoneLast4.trim()) {
      setCancelError('กรุณากรอกรหัสนักศึกษาและเบอร์โทรศัพท์ 4 ตัวท้าย');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch('/api/bookings/track', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingCode: cancellingBooking.bookingCode,
          studentId: cancelStudentId.trim(),
          phoneLast4: cancelPhoneLast4.trim(),
          cancelReason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || 'ไม่สามารถยกเลิกการจองได้');
        return;
      }

      // Update UI state immediately
      setResults((prev) =>
        prev
          ? prev.map((item) =>
              item.bookingCode === cancellingBooking.bookingCode
                ? {
                    ...item,
                    status: 'CANCELLED',
                    rejectionReason: `[ผู้จองยกเลิกเอง]: ${cancelReason.trim() || 'ไม่ระบุเหตุผล'}`,
                  }
                : item
            )
          : null
      );

      setCancellingBooking(null);
    } catch (error) {
      console.error(error);
      setCancelError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadIcs = (item: BookingTrackItem) => {
    const icsContent = generateIcsContent({
      bookingCode: item.bookingCode,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      fullName: item.fullName,
      department: item.department,
      reason: item.reason,
      status: item.status,
      trackUrl: `${qrBaseUrl}/track?q=${encodeURIComponent(item.bookingCode)}`,
    });

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.bookingCode}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col text-slate-800">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">
                สภานักศึกษา มจพ.
              </h1>
              <p className="text-[11px] text-orange-100 font-medium tracking-wide">
                Student Council KMUTNB
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/booking"
              className="text-xs font-semibold bg-white text-orange-600 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition active-press flex items-center gap-1.5 shadow-warm-xs"
            >
              <Calendar className="w-3.5 h-3.5" /> จองห้องประชุม
            </Link>
            <Link
              href="/"
              className="text-xs font-medium bg-orange-950/30 hover:bg-orange-950/50 px-3.5 py-2 rounded-xl transition active-press flex items-center gap-1.5 border border-orange-400/30 text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> หน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      {/* Subheader Banner */}
      <section className="bg-gradient-to-b from-orange-600 to-amber-600 text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-dots opacity-15 pointer-events-none"></div>
        <div className="max-w-xl mx-auto text-center relative z-10">
          <div className="w-12 h-12 bg-orange-950/30 text-amber-300 border border-orange-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner backdrop-blur-xs">
            <Search className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            ตรวจสอบสถานะการจองห้องประชุม
          </h2>
          <p className="text-orange-100 text-xs md:text-sm mt-1.5 font-light">
            ระบุรหัสนักศึกษา (13 หลัก) หรือรหัสการจอง (KMUTNB-...) เพื่อดูความคืบหน้าและการเช็กอิน
          </p>
        </div>
      </section>

      {/* Main Content & Search */}
      <main className="flex-grow max-w-4xl mx-auto px-4 -mt-6 pb-16 w-full space-y-6 relative z-20">
        {/* Search Card */}
        <div className="max-w-2xl mx-auto bg-white p-3 md:p-3.5 rounded-3xl shadow-warm border border-slate-200/90">
          <form onSubmit={onSubmit} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ระบุรหัสนักศึกษา หรือรหัสการจอง เช่น KMUTNB-2026-..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 md:px-6 py-2.5 rounded-2xl font-semibold text-xs md:text-sm transition shadow-warm-xs active-press cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? 'กำลังค้นหา...' : 'ค้นหาข้อมูล'}
            </button>
          </form>
        </div>

        {/* Results Container */}
        {searched && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-sm text-slate-800 tracking-tight">
                ผลการค้นหา {results ? `(${results.length} รายการ)` : ''}
              </h3>
            </div>

            {/* Empty State */}
            {results && results.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/90 shadow-warm">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">ไม่พบประวัติการจอง</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6">
                  ไม่พบข้อมูลตามคำค้นหา กรุณาตรวจสอบรหัสนักศึกษาหรือรหัสการจอง หรือส่งคำขอจองห้องประชุมใหม่
                </p>
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-warm-xs transition active-press"
                >
                  <CalendarPlus className="w-4 h-4" /> เริ่มจองห้องประชุม
                </Link>
              </div>
            )}

            {/* Result Cards */}
            {results &&
              results.map((item) => {
                const isApproved = item.status === 'APPROVED';
                const isPending = item.status === 'PENDING';
                const isRejected = item.status === 'REJECTED';
                const isCancelled = item.status === 'CANCELLED';

                const isFutureBooking = !isBackdated(item.date, item.startTime).isBackdated;
                const canCancel = isPending || (isApproved && isFutureBooking);

                const googleCalUrl = buildGoogleCalendarUrl({
                  bookingCode: item.bookingCode,
                  date: item.date,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  fullName: item.fullName,
                  department: item.department,
                  reason: item.reason,
                  status: item.status,
                  trackUrl: `${qrBaseUrl}/track?q=${encodeURIComponent(item.bookingCode)}`,
                });

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-warm space-y-4 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-orange-600 text-sm bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200/80">
                            {item.bookingCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyCode(item.bookingCode, item.id)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
                            title="คัดลอกรหัสการจอง"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <h4 className="font-bold text-base text-slate-800 mt-2">{item.fullName}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> อนุมัติแล้ว (ยืนยัน)
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                            <AlertCircle className="w-4 h-4 text-amber-600" /> รอตรวจสอบ (Pending)
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                            <XCircle className="w-4 h-4 text-rose-600" /> ปฏิเสธคำขอ
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-full shadow-2xs">
                            <X className="w-4 h-4 text-slate-500" /> ยกเลิกแล้ว (Cancelled)
                          </span>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(item)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full transition active-press cursor-pointer"
                          >
                            ยกเลิกการจอง
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Booking Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-slate-400 mb-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> วันที่จองใช้งาน
                        </div>
                        <div className="font-mono tabular-nums font-bold text-slate-700">{item.date}</div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-slate-400 mb-1 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> ช่วงเวลาที่ใช้
                        </div>
                        <div className="font-mono tabular-nums font-bold text-slate-700">
                          {item.startTime} - {item.endTime} น.
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-slate-400 mb-1 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> รหัสนักศึกษา / สังกัด
                        </div>
                        <div className="font-bold text-slate-700 truncate">
                          {item.studentId} ({item.department})
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                      <span className="font-semibold text-slate-700">เหตุผลและวาระ: </span>
                      {item.reason}
                    </div>

                    {/* Check-in status badge (Task 3.2) */}
                    {item.checkedInAt && (
                      <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          เช็กอินเข้าห้องแล้วเมื่อ{' '}
                          {new Date(item.checkedInAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          น.
                        </span>
                      </div>
                    )}

                    {/* Rejection or Cancellation Note */}
                    {(isRejected || isCancelled) && item.rejectionReason && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs">
                        <span className="font-bold">
                          {isCancelled ? 'เหตุผลการยกเลิก: ' : 'เหตุผลที่ไม่สามารถอนุมัติได้: '}
                        </span>
                        {item.rejectionReason}
                      </div>
                    )}

                    {/* Book Another Slot Prompt for Cancelled Bookings */}
                    {isCancelled && (
                      <div className="pt-2 flex justify-end">
                        <Link
                          href="/booking"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition border border-orange-200"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" /> จองใหม่อีกครั้ง (Book Another Slot) &rarr;
                        </Link>
                      </div>
                    )}

                    {/* Calendar Export Buttons (Task 2.2) */}
                    {(isApproved || isPending) && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                        <a
                          href={googleCalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press"
                        >
                          <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                          เพิ่มใน Google Calendar
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(item)}
                          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          ดาวน์โหลด .ics
                        </button>
                      </div>
                    )}

                    {/* QR Code Section (Task 3.2: APPROVED encodes check-in URL) */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                      <div className="shrink-0 p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                        <QRCodeSVG
                          value={
                            isApproved
                              ? `${qrBaseUrl}/admin/dashboard?checkIn=${encodeURIComponent(item.bookingCode)}`
                              : `${qrBaseUrl}/track?q=${encodeURIComponent(item.bookingCode)}`
                          }
                          size={96}
                          level="M"
                          includeMargin={false}
                          fgColor={isApproved ? '#059669' : isPending ? '#d97706' : '#e11d48'}
                        />
                      </div>
                      <div className="text-xs text-slate-600 text-center sm:text-left">
                        <div className="font-bold text-slate-800 mb-1">QR Code สำหรับการจอง</div>
                        <div className="text-slate-500 mb-2">
                          {isApproved
                            ? 'แสดง QR Code นี้ให้แอดมินสแกนเพื่อเช็กอินเข้าห้องประชุม'
                            : 'สแกนเพื่อตรวจสอบสถานะการจองได้ทันที'}
                        </div>
                        {isApproved && (
                          <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl font-semibold">
                            ✓ แอดมินสแกน QR นี้เพื่อเช็กอินเข้าใช้งานห้อง
                          </div>
                        )}
                        {isPending && (
                          <div className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl font-semibold">
                            ⏳ รอการอนุมัติ — กรุณาตรวจสอบสถานะอีกครั้ง
                          </div>
                        )}
                        {isRejected && (
                          <div className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl font-semibold">
                            ✕ คำขอนี้ถูกปฏิเสธแล้ว
                          </div>
                        )}
                        {isCancelled && (
                          <div className="text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl font-semibold">
                            — รายการนี้ถูกยกเลิกแล้ว
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* Cancellation Confirmation Modal (Task 2.1) */}
      {cancellingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-warm-xs">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              ยืนยันการยกเลิกการจองห้อง
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              รหัสการจอง: <span className="font-mono font-bold text-orange-600">{cancellingBooking.bookingCode}</span>
            </p>

            {cancelError && (
              <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  รหัสนักศึกษา 13 หลัก
                </label>
                <input
                  type="text"
                  required
                  value={cancelStudentId}
                  onChange={(e) => setCancelStudentId(e.target.value)}
                  placeholder="เช่น 6501012345678"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ 4 ตัวท้ายของผู้จอง
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={cancelPhoneLast4}
                  onChange={(e) => setCancelPhoneLast4(e.target.value)}
                  placeholder="เช่น 5678"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เหตุผลในการยกเลิก (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="ระบุเหตุผลที่ขอยกเลิก เช่น ติดภารกิจด่วน, เลื่อนการประชุม"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold text-xs transition cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition shadow-warm-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกการจอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewSwitcherFooter currentMode="desktop" />
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">กำลังโหลด...</div>}>
      <TrackContent />
    </Suspense>
  );
}
