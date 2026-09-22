'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  Lock
} from 'lucide-react';

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

function TrackContent() {
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
            ระบุรหัสนักศึกษา (เช่น 6501012345) หรือรหัสการจอง (KMUTNB-...) เพื่อดูความคืบหน้าการอนุมัติ
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

                      <div>
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
                      </div>
                    </div>

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

                    {isRejected && item.rejectionReason && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs">
                        <span className="font-bold">เหตุผลที่ไม่สามารถอนุมัติได้: </span>
                        {item.rejectionReason}
                      </div>
                    )}

                    {isApproved && (
                      <div className="bg-emerald-50/70 border border-emerald-200/90 text-emerald-800 p-3 rounded-2xl text-xs flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>กรุณาแสดงรหัสการจองนี้ต่อเจ้าหน้าที่ดูแลห้อง และปฏิบัติตามกฎระเบียบอย่างเคร่งครัด</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </main>
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
