'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Copy, Check, CalendarDays, Download, Search, X } from 'lucide-react';
import { BookingFormData } from '@/types/booking';
import { buildGoogleCalendarUrl, generateIcsContent } from '@/lib/calendar-export';

interface BookingSuccessModalProps {
  bookingCode: string | null;
  bookingDetails: BookingFormData | null;
  onClose: () => void;
  appBaseUrl?: string;
}

export default function BookingSuccessModal({
  bookingCode,
  bookingDetails,
  onClose,
  appBaseUrl,
}: BookingSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!bookingCode) return null;

  const copyBookingCode = () => {
    navigator.clipboard.writeText(bookingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const originUrl =
    appBaseUrl || (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');
  const trackUrl = `${originUrl}/track?q=${encodeURIComponent(bookingCode)}`;

  const googleCalUrl = bookingDetails
    ? buildGoogleCalendarUrl({
        bookingCode,
        date: bookingDetails.date,
        startTime: bookingDetails.startTime,
        endTime: bookingDetails.endTime,
        fullName: bookingDetails.fullName,
        department: bookingDetails.department,
        reason: bookingDetails.reason,
        status: 'PENDING',
        trackUrl,
      })
    : '';

  const handleDownloadIcs = () => {
    if (!bookingDetails) return;
    const content = generateIcsContent({
      bookingCode,
      date: bookingDetails.date,
      startTime: bookingDetails.startTime,
      endTime: bookingDetails.endTime,
      fullName: bookingDetails.fullName,
      department: bookingDetails.department,
      reason: bookingDetails.reason,
      status: 'PENDING',
      trackUrl,
    });

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bookingCode}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl text-center border border-slate-100 relative text-slate-800 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1 pr-1 -mr-1">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-warm-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-1 tracking-tight">
            ส่งคำขอจองสำเร็จ
          </h3>
          <p className="text-xs text-slate-500 mb-5 font-light">
            คำขอของคุณอยู่ในสถานะ <span className="text-amber-600 font-semibold">รอการอนุมัติ</span>{' '}
            กรุณาบันทึกรหัสนี้ไว้เพื่อใช้ตรวจสอบ
          </p>

          {/* Ticket Box */}
          <div className="bg-gradient-to-b from-orange-50 to-amber-50/60 border border-orange-200/90 rounded-2xl p-5 mb-5 relative overflow-hidden text-center">
            <div className="text-[11px] font-bold text-orange-950/70 tracking-wider uppercase mb-1">
              รหัสการจองของท่าน (Booking Code)
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-xl md:text-2xl font-black text-orange-600 tracking-tight">
                {bookingCode}
              </span>
              <button
                type="button"
                onClick={copyBookingCode}
                className="p-1.5 text-orange-600 hover:bg-orange-100/80 rounded-lg transition active-press cursor-pointer"
                title="คัดลอกรหัสการจอง"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">คัดลอกรหัสเรียบร้อยแล้ว!</p>
            )}

            {/* QR Code */}
            <div className="mt-4 flex justify-center">
              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-orange-100">
                <QRCodeSVG
                  value={`${originUrl}/track?q=${encodeURIComponent(bookingCode)}`}
                  size={110}
                  level="M"
                  includeMargin={false}
                  fgColor="#ea580c"
                />
              </div>
            </div>
          </div>

          {/* Calendar Export Actions (Task 2.2) */}
          {bookingDetails && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition active-press"
              >
                <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                Google Calendar
              </a>
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition active-press cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                ดาวน์โหลด .ics
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-3 shrink-0 border-t border-slate-100 mt-2">
          <Link
            href={`/track?q=${encodeURIComponent(bookingCode)}`}
            className="w-full inline-flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-warm-xs active-press"
          >
            <Search className="w-3.5 h-3.5" /> ติดตามสถานะคำขอนี้ทันที &rarr;
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
