'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Search,
  Check,
  X,
  User,
  Building,
  RotateCw,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Filter,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from 'lucide-react';
import { formatDisplayDate, getSearchableDateVariants } from '@/lib/date-utils';

interface AdminBooking {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  approvedBy?: {
    fullName: string;
    email: string;
  };
  approvedAt?: string;
  createdAt: string;
}

const PRESET_REJECTION_REASONS = [
  'ช่วงเวลาดังกล่าวมีการใช้งานกิจกรรมของสภานักศึกษา',
  'ข้อมูลผู้ขอใช้บริการไม่ครบถ้วน หรือไม่สามารถติดต่อได้',
  'วัตถุประสงค์ไม่ตรงตามระเบียบการใช้ห้องประชุม',
  'มีคำขออื่นได้รับการอนุมัติในเวลาเดียวกันแล้ว',
];

export default function MobileAdminDashboardPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Action states
  const [rejectingBooking, setRejectingBooking] = useState<AdminBooking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [detailsBooking, setDetailsBooking] = useState<AdminBooking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_dashboard_sort_order');
    if (saved === 'asc' || saved === 'desc') {
      setSortOrder(saved);
    }
    fetchBookings();
  }, []);

  const handleSetSortOrder = (newOrder: 'desc' | 'asc') => {
    setSortOrder(newOrder);
    localStorage.setItem('admin_dashboard_sort_order', newOrder);
  };

  const toggleSortOrder = () => {
    const next = sortOrder === 'desc' ? 'asc' : 'desc';
    handleSetSortOrder(next);
  };

  useEffect(() => {
    let result = [...bookings];

    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const dateVariants = getSearchableDateVariants(b.date);
        const matchesDate = dateVariants.some((v) => v.includes(q));
        return (
          b.fullName.toLowerCase().includes(q) ||
          b.studentId.toLowerCase().includes(q) ||
          b.bookingCode.toLowerCase().includes(q) ||
          b.department.toLowerCase().includes(q) ||
          matchesDate
        );
      });
    }

    // Sort by date (desc / asc), then startTime asc, then createdAt desc
    result.sort((a, b) => {
      const dateComparison =
        sortOrder === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      if (dateComparison !== 0) return dateComparison;

      const timeComparison = a.startTime.localeCompare(b.startTime);
      if (timeComparison !== 0) return timeComparison;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredBookings(result);
  }, [bookings, statusFilter, searchQuery, sortOrder]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (e) {
      console.error(e);
      setActionError('ไม่สามารถดึงข้อมูลการจองได้');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string, rejectionReason?: string) => {
    setActionError(null);
    setActionSuccess(null);
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ดำเนินการไม่สำเร็จ');
        return;
      }

      setActionSuccess(
        status === 'APPROVED'
          ? 'อนุมัติการจองและส่งอีเมลเรียบร้อยแล้ว'
          : status === 'REJECTED'
          ? 'ปฏิเสธการจองและแจ้งเตือนแล้ว'
          : 'อัปเดตสถานะสำเร็จ'
      );
      setRejectingBooking(null);
      setRejectionReasonInput('');
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick stats
  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const approvedCount = bookings.filter((b) => b.status === 'APPROVED').length;

  return (
    <div className="p-4 space-y-4">
      {/* Toast Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Glance */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
            รอพิจารณา (Pending)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
            <span className="text-[10px] text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
            อนุมัติแล้ว (Approved)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
            <span className="text-[10px] text-slate-400">รายการ</span>
          </div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, ว/ด/ป (02-10-2569)..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs"
            />
          </div>

          {/* Sort Toggle Button */}
          <button
            type="button"
            onClick={toggleSortOrder}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs hover:bg-slate-50 active:scale-95 transition shrink-0 cursor-pointer"
            title="สลับการเรียงลำดับวันที่ (ใหม่สุด / เก่าสุด)"
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDownWideNarrow className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-[11px] font-bold text-orange-600">ใหม่สุด</span>
              </>
            ) : (
              <>
                <ArrowUpNarrowWide className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-[11px] font-bold text-orange-600">เก่าสุด</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'PENDING', label: `รออนุมัติ (${pendingCount})` },
            { id: 'APPROVED', label: 'อนุมัติแล้ว' },
            { id: 'REJECTED', label: 'ปฏิเสธ' },
            { id: 'CANCELLED', label: 'ยกเลิก' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Card Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <RotateCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
            <span>กำลังโหลดรายการคำขอ...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/90 text-xs text-slate-500 shadow-2xs">
            ไม่พบรายการจองตามเงื่อนไขที่เลือก
          </div>
        ) : (
          filteredBookings.map((b) => {
            const isPending = b.status === 'PENDING';
            const isApproved = b.status === 'APPROVED';

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-orange-600">
                    {b.bookingCode}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      b.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : b.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <User className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>{b.fullName}</span>
                    <span className="text-[11px] text-slate-500 font-mono font-normal">
                      ({b.studentId})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{b.department}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>{formatDisplayDate(b.date)}</span>
                    <span className="text-slate-300">|</span>
                    <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="font-mono">{b.startTime} - {b.endTime} น.</span>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl mt-1.5 font-light line-clamp-2">
                    {b.reason}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDetailsBooking(b)}
                    className="text-[11px] text-slate-600 font-medium px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
                  >
                    รายละเอียด
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isPending && (
                      <>
                        <button
                          onClick={() => {
                            setRejectingBooking(b);
                            setRejectionReasonInput('');
                          }}
                          disabled={isProcessing}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] px-3 py-1.5 rounded-xl border border-red-200 active:scale-95 transition"
                        >
                          ปฏิเสธ
                        </button>

                        <button
                          onClick={() => updateBookingStatus(b.id, 'APPROVED')}
                          disabled={isProcessing}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition"
                        >
                          อนุมัติ
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'CANCELLED')}
                        disabled={isProcessing}
                        className="bg-slate-100 text-slate-600 font-semibold text-[11px] px-2.5 py-1.5 rounded-xl active:scale-95 transition"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ----------------- Reject Bottom Sheet Modal ----------------- */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">ปฏิเสธคำขอจองห้อง</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {rejectingBooking.bookingCode} - {rejectingBooking.fullName}
                </p>
              </div>
              <button
                onClick={() => setRejectingBooking(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                เลือกเหตุผลที่ปฏิเสธ (ระบบจะส่งอีเมลแจ้งผู้จองอัตโนมัติ)
              </label>
              <div className="space-y-1">
                {PRESET_REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className="w-full text-left text-[11px] p-2 rounded-xl border border-slate-200 hover:bg-orange-50/50 hover:border-orange-300 text-slate-700 transition"
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="หรือระบุเหตุผลอื่นๆ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 resize-none mt-2"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setRejectingBooking(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl text-xs active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                onClick={() =>
                  updateBookingStatus(
                    rejectingBooking.id,
                    'REJECTED',
                    rejectionReasonInput || 'ไม่ระบุเหตุผล'
                  )
                }
                disabled={isProcessing}
                className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 shadow-xs"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Details Bottom Sheet Modal ----------------- */}
      {detailsBooking && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-3.5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">รายละเอียดคำขอจอง</h3>
                <span className="font-mono text-xs font-bold text-orange-600">
                  {detailsBooking.bookingCode}
                </span>
              </div>
              <button
                onClick={() => setDetailsBooking(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">ผู้ขอใช้บริการ</span>
                <span className="font-bold text-slate-900 text-sm">{detailsBooking.fullName}</span>
                <span className="text-slate-500 block font-mono text-[11px]">รหัสนักศึกษา: {detailsBooking.studentId}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">สังกัด / หน่วยงาน</span>
                <span>{detailsBooking.department}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">ข้อมูลติดต่อ</span>
                <span>{detailsBooking.email} | {detailsBooking.phone}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">วันและเวลา</span>
                <span className="font-semibold">{formatDisplayDate(detailsBooking.date)} เวลา {detailsBooking.startTime} - {detailsBooking.endTime} น.</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">วัตถุประสงค์</span>
                <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-light mt-0.5">
                  {detailsBooking.reason}
                </p>
              </div>

              {detailsBooking.rejectionReason && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200">
                  <span className="font-bold block">เหตุผลที่ปฏิเสธ:</span>
                  <span>{detailsBooking.rejectionReason}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setDetailsBooking(null)}
                className="w-full bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl text-xs active:scale-95"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
