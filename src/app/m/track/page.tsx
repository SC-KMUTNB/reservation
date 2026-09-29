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
  Copy,
  Check,
  User,
  Building,
  RotateCw,
  X,
  Share2
} from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';

interface BookingTrackItem {
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
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: string;
}

function MobileTrackContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<BookingTrackItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

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

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <MobileHeader title="ตรวจสอบสถานะการจอง" subtitle="ค้นหาด้วยรหัสนักศึกษาหรือรหัสจอง" />

      {/* Search Header Bar */}
      <div className="bg-orange-600 px-4 pt-2 pb-5 text-white shadow-xs">
        <form onSubmit={onSubmit} className="relative mt-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="รหัสนักศึกษา (13 หลัก) หรือ KMUTNB-..."
            className="w-full bg-white text-slate-800 placeholder:text-slate-400 pl-10 pr-20 py-2.5 rounded-2xl text-xs font-mono shadow-md focus:outline-hidden focus:ring-2 focus:ring-amber-300"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-14 top-2 text-slate-400 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-1.5 top-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition"
          >
            {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : 'ค้นหา'}
          </button>
        </form>
      </div>

      {/* Results Feed */}
      <main className="px-4 py-4 space-y-4 flex-1">
        {isLoading && (
          <div className="py-12 text-center space-y-3">
            <RotateCw className="w-6 h-6 text-orange-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">กำลังค้นหาข้อมูลการจอง...</p>
          </div>
        )}

        {!isLoading && searched && results && results.length === 0 && (
          <div className="bg-white rounded-3xl p-6 text-center shadow-xs border border-slate-200/90 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">ไม่พบข้อมูลการจอง</h3>
              <p className="text-xs text-slate-500 mt-1">
                โปรดตรวจสอบรหัสนักศึกษา 13 หลัก หรือรหัสการจองอีกครั้ง
              </p>
            </div>
            <Link
              href="/m/booking"
              className="inline-block bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition"
            >
              ไปที่หน้าจองห้อง &rarr;
            </Link>
          </div>
        )}

        {!isLoading && results && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-700">พบ {results.length} รายการ</span>
              <span className="text-[11px] text-slate-500">เรียงตามวันที่จองล่าสุด</span>
            </div>

            {results.map((booking) => {
              const isApproved = booking.status === 'APPROVED';
              const isPending = booking.status === 'PENDING';
              const isRejected = booking.status === 'REJECTED';
              const isCancelled = booking.status === 'CANCELLED';

              const badgeColor = isApproved
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : isPending
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : isRejected
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-slate-100 text-slate-700 border-slate-300';

              const statusText = isApproved
                ? 'อนุมัติแล้ว (APPROVED)'
                : isPending
                ? 'รอการตรวจสอบ (PENDING)'
                : isRejected
                ? 'ถูกปฏิเสธ (REJECTED)'
                : 'ยกเลิกแล้ว (CANCELLED)';

              const trackUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/m/track?q=${encodeURIComponent(booking.bookingCode)}`
                : `/m/track?q=${encodeURIComponent(booking.bookingCode)}`;

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200/90 space-y-3.5 overflow-hidden"
                >
                  {/* Status Banner */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${badgeColor}`}
                    >
                      {statusText}
                    </span>
                    <button
                      onClick={() => copyCode(booking.bookingCode, booking.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-orange-600 active:scale-95"
                    >
                      {copiedId === booking.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกรหัส</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Booking Code */}
                  <div className="bg-slate-50 rounded-2xl p-2.5 text-center border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      รหัสการจอง
                    </span>
                    <span className="font-mono text-base font-extrabold text-slate-800 tracking-tight">
                      {booking.bookingCode}
                    </span>
                  </div>

                  {/* QR Code Section (if Approved or Pending) */}
                  <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-200/70 flex items-center gap-3.5">
                    <div className="bg-white p-2 rounded-xl shadow-2xs shrink-0 border border-orange-100">
                      <QRCodeSVG value={trackUrl} size={64} level="M" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">QR Code แสดงตน</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-light">
                        แสดง QR Code นี้แก่เจ้าหน้าที่หน้าห้องประชุมในวันใช้งาน
                      </p>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="font-semibold">วันที่:</span>
                      <span>{booking.date}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="font-semibold">เวลา:</span>
                      <span className="font-mono font-medium">
                        {booking.startTime} - {booking.endTime} น.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="font-semibold">ผู้ขอใช้:</span>
                      <span className="truncate">
                        {booking.fullName} ({booking.studentId})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Building className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="font-semibold">สังกัด:</span>
                      <span className="truncate">{booking.department}</span>
                    </div>

                    <div className="pt-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 block mb-0.5">วัตถุประสงค์:</span>
                      <p className="font-light">{booking.reason}</p>
                    </div>

                    {booking.rejectionReason && (
                      <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-[11px]">
                        <span className="font-bold block">เหตุผลที่ไม่อนุมัติ:</span>
                        <span>{booking.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <ViewSwitcherFooter currentMode="mobile" />
    </div>
  );
}

export default function MobileTrackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
          กำลังโหลด...
        </div>
      }
    >
      <MobileTrackContent />
    </Suspense>
  );
}
