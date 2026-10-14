'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Search,
  Check,
  X,
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  QrCode,
  RotateCw,
} from 'lucide-react';
import { formatDisplayDate, getSearchableDateVariants, getNowInTimezone } from '@/lib/date-utils';

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
  borrowedEquipment?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  approvedBy?: {
    fullName: string;
    email: string;
  };
  approvedAt?: string;
  checkedInAt?: string;
  checkedInByName?: string;
  createdAt: string;
}

const PRESET_REJECTION_REASONS = [
  'ช่วงเวลาดังกล่าวมีการใช้งานกิจกรรมของสภานักศึกษา',
  'ข้อมูลผู้ขอใช้บริการไม่ครบถ้วน หรือไม่สามารถติดต่อได้',
  'วัตถุประสงค์ไม่ตรงตามระเบียบการใช้ห้องประชุม',
  'มีคำขออื่นได้รับการอนุมัติในเวลาเดียวกันแล้ว',
];

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [rejectingBooking, setRejectingBooking] = useState<AdminBooking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [approvingBooking, setApprovingBooking] = useState<AdminBooking | null>(null);
  const [conflictsForApproving, setConflictsForApproving] = useState<AdminBooking[]>([]);
  const [autoRejectConflicts, setAutoRejectConflicts] = useState(true);

  const [checkInModalBooking, setCheckInModalBooking] = useState<AdminBooking | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isRetryingSyncId, setIsRetryingSyncId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { dateStr: todayStr } = useMemo(() => getNowInTimezone('Asia/Bangkok'), []);

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

  const getConflictingPendingBookings = (booking: AdminBooking, allList: AdminBooking[]) => {
    if (booking.status !== 'PENDING') return [];
    return allList.filter(
      (b) =>
        b.id !== booking.id &&
        b.status === 'PENDING' &&
        b.date === booking.date &&
        b.startTime < booking.endTime &&
        b.endTime > booking.startTime
    );
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
        const loaded: AdminBooking[] = data.bookings || [];
        setBookings(loaded);

        // QR Check-in parameter detection
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const checkInCode = params.get('checkIn');
          if (checkInCode) {
            const target = loaded.find(
              (b) => b.bookingCode.toUpperCase() === checkInCode.toUpperCase()
            );
            if (target) {
              setCheckInModalBooking(target);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setActionError('ไม่สามารถดึงข้อมูลการจองได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveClick = (b: AdminBooking) => {
    const conflicts = getConflictingPendingBookings(b, bookings);
    if (conflicts.length > 0) {
      setApprovingBooking(b);
      setConflictsForApproving(conflicts);
      setAutoRejectConflicts(true);
    } else {
      updateBookingStatus(b.id, 'APPROVED');
    }
  };

  const updateBookingStatus = async (
    id: string,
    status: string,
    rejectionReason?: string,
    autoRejectConflictsParam?: boolean
  ) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason,
          autoRejectConflicts: autoRejectConflictsParam,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถอัปเดตสถานะได้');
        return;
      }

      setActionSuccess(
        status === 'APPROVED'
          ? autoRejectConflictsParam
            ? 'อนุมัติการจองและปฏิเสธคำขอที่เวลาชนกันเรียบร้อยแล้ว'
            : 'อนุมัติการจองเรียบร้อยแล้ว'
          : status === 'REJECTED'
          ? 'ปฏิเสธคำขอการจองเรียบร้อยแล้ว'
          : 'อัปเดตสถานะสำเร็จ'
      );
      setRejectingBooking(null);
      setRejectionReasonInput('');
      setApprovingBooking(null);
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleCheckIn = async (booking: AdminBooking) => {
    setIsCheckingIn(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECK_IN' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'เช็กอินไม่สำเร็จ');
        return;
      }
      setActionSuccess(`เช็กอินรหัส ${booking.bookingCode} เรียบร้อยแล้ว`);
      setCheckInModalBooking(null);
      fetchBookings();
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleRetrySync = async (bookingId: string) => {
    setIsRetryingSyncId(bookingId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/admin/retry-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, syncType: 'ALL' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'ซิงก์ข้อมูลซ้ำล้มเหลว');
      } else {
        setActionSuccess('ส่งอีเมลและซิงก์ข้อมูลซ้ำเรียบร้อยแล้ว');
      }
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsRetryingSyncId(null);
    }
  };

  const deleteBooking = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบรายการจองของ ${name} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถลบรายการจองได้');
        return;
      }

      setActionSuccess('ลบรายการจองเรียบร้อยแล้ว');
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'PENDING').length,
    approved: bookings.filter((b) => b.status === 'APPROVED').length,
    rejected: bookings.filter((b) => b.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Export */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            แผงควบคุมการจองห้องประชุม
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-light">
            ตรวจสอบความถูกต้อง อนุมัติ และจัดการคำขอจองห้องประชุมสภานักศึกษา มจพ.
          </p>
        </div>

        <Link
          href="/admin/reports"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-warm-xs transition flex items-center gap-2 active-press self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" /> ส่งออกรายงาน Excel
        </Link>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-warm-xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>คำขอทั้งหมด</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2 tabular-nums font-mono">
            {stats.total}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-warm-xs">
          <div className="flex justify-between items-center text-amber-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200"></span> รอการอนุมัติ
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-900 mt-2 tabular-nums font-mono">
            {stats.pending}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-warm-xs">
          <div className="flex justify-between items-center text-emerald-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-200"></span> อนุมัติแล้ว
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-900 mt-2 tabular-nums font-mono">
            {stats.approved}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200/80 bg-rose-50/20 shadow-warm-xs">
          <div className="flex justify-between items-center text-rose-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-200"></span> ปฏิเสธแล้ว
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-rose-900 mt-2 tabular-nums font-mono">
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Action Messages */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex justify-between items-center shadow-2xs">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex justify-between items-center shadow-2xs">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bookings Table Canvas */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-warm space-y-4">
        {/* Controls: Filter Pills & Search */}
        <div className="flex flex-col lg:flex-row justify-between gap-3.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto shrink-0">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'PENDING', label: 'รออนุมัติ' },
              { id: 'APPROVED', label: 'อนุมัติแล้ว' },
              { id: 'REJECTED', label: 'ถูกปฏิเสธ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Sort Controls */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-grow max-w-xl">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัสนักศึกษา, รหัสจอง, สังกัด, วันที่ (02-10-2569)..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>

            {/* Sort Order Buttons */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => handleSetSortOrder('desc')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  sortOrder === 'desc'
                    ? 'bg-white text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title="เรียงจากวันจองใหม่สุดไปเก่าสุด"
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                <span>ใหม่ที่สุด</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetSortOrder('asc')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  sortOrder === 'asc'
                    ? 'bg-white text-orange-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title="เรียงจากวันจองเก่าสุดไปใหม่สุด"
              >
                <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                <span>เก่าที่สุด</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th
                  onClick={toggleSortOrder}
                  className="p-3.5 cursor-pointer hover:bg-slate-100/90 transition-colors select-none group"
                  title="คลิกเพื่อสลับการเรียงลำดับวันที่ (ใหม่สุด / เก่าสุด)"
                >
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <span>วันที่ & เวลา</span>
                    <span className="text-orange-600 transition-transform group-hover:scale-110">
                      {sortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-4 h-4" />
                      ) : (
                        <ArrowUpNarrowWide className="w-4 h-4" />
                      )}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 group-hover:text-orange-600">
                      ({sortOrder === 'desc' ? 'ใหม่สุด' : 'เก่าสุด'})
                    </span>
                  </div>
                </th>
                <th className="p-3.5">ผู้จอง & ข้อมูลติดต่อ</th>
                <th className="p-3.5">หน่วยงาน & วัตถุประสงค์</th>
                <th className="p-3.5">สถานะ / เช็กอิน</th>
                <th className="p-3.5">ผู้พิจารณา</th>
                <th className="p-3.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    กำลังดึงข้อมูลคำขอจองล่าสุด...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div>ไม่พบรายการจองตามเงื่อนไขที่เลือก</div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const conflicts = getConflictingPendingBookings(b, bookings);
                  const isToday = b.date === todayStr;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 tabular-nums font-mono">
                          {formatDisplayDate(b.date)}
                        </div>
                        <div className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5 tabular-nums font-mono">
                          <Clock className="w-3 h-3 text-slate-400" /> {b.startTime} - {b.endTime} น.
                        </div>
                        <div className="font-mono text-[10px] text-orange-600 mt-1 bg-orange-50 px-1.5 py-0.5 rounded inline-block border border-orange-200/60">
                          {b.bookingCode}
                        </div>
                        {conflicts.length > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              เวลาชนกับคำขอรออนุมัติอื่น {conflicts.length} รายการ
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 text-xs">{b.fullName}</div>
                        <div className="text-slate-500 text-[11px] font-mono mt-0.5">รหัส: {b.studentId}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">โทร: {b.phone}</div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-medium text-slate-800">{b.department}</div>
                        <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5" title={b.reason}>
                          {b.reason}
                        </div>
                        {b.rejectionReason && (
                          <div className="text-rose-700 text-[10px] mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                            เหตุผลที่ปฏิเสธ: {b.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs ${
                              b.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : b.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-rose-50 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {b.status === 'APPROVED'
                              ? 'อนุมัติแล้ว'
                              : b.status === 'PENDING'
                              ? 'รออนุมัติ'
                              : 'ถูกปฏิเสธ'}
                          </span>
                        </div>
                        {b.status === 'APPROVED' && (
                          <div className="mt-1">
                            {b.checkedInAt ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" /> เช็กอินแล้ว
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] text-slate-400">ยังไม่เช็กอิน</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {b.approvedBy ? (
                          <div>
                            <div className="font-medium text-slate-800">{b.approvedBy.fullName}</div>
                            {b.approvedAt && (
                              <div className="text-slate-400 text-[10px] tabular-nums font-mono mt-0.5">
                                {new Date(b.approvedAt).toLocaleDateString('th-TH')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveClick(b)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="อนุมัติคำขอ"
                              >
                                <Check className="w-3.5 h-3.5" /> อนุมัติ
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingBooking(b);
                                  setRejectionReasonInput('');
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="ปฏิเสธคำขอ"
                              >
                                <X className="w-3.5 h-3.5" /> ปฏิเสธ
                              </button>
                            </>
                          )}

                          {b.status === 'APPROVED' && isToday && !b.checkedInAt && (
                            <button
                              onClick={() => setCheckInModalBooking(b)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="เช็กอินผู้ใช้บริการ"
                            >
                              <QrCode className="w-3.5 h-3.5" /> เช็กอิน
                            </button>
                          )}

                          {b.status !== 'PENDING' && (
                            <button
                              onClick={() => updateBookingStatus(b.id, 'PENDING')}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition active-press flex items-center gap-1 cursor-pointer"
                              title="คืนสถานะเป็นรออนุมัติ"
                            >
                              <RotateCcw className="w-3 h-3" /> คืนสถานะ
                            </button>
                          )}

                          <button
                            onClick={() => handleRetrySync(b.id)}
                            disabled={isRetryingSyncId === b.id}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                            title="ซิงก์ข้อมูล/ส่งอีเมลซ้ำ (Retry Sync)"
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 ${
                                isRetryingSyncId === b.id ? 'animate-spin text-blue-600' : ''
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => deleteBooking(b.id, b.fullName)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal with Conflict Preview & Auto-Rejection */}
      {approvingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">ยืนยันการอนุมัติคำขอจอง</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รหัส <span className="font-mono font-bold text-orange-600">{approvingBooking.bookingCode}</span> ({approvingBooking.fullName})
                </p>
              </div>
              <button
                onClick={() => setApprovingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflictsForApproving.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>พบคำขอรออนุมัติอื่นที่เวลาซ้อนทับกัน ({conflictsForApproving.length} รายการ):</span>
                </div>
                <div className="divide-y divide-amber-200/60 max-h-36 overflow-y-auto">
                  {conflictsForApproving.map((c) => (
                    <div key={c.id} className="py-1.5 flex justify-between items-center text-amber-950">
                      <div>
                        <span className="font-mono font-bold">{c.bookingCode}</span> • {c.fullName} ({c.department})
                      </div>
                      <div className="font-mono text-[11px] text-amber-800">
                        {c.startTime} - {c.endTime} น.
                      </div>
                    </div>
                  ))}
                </div>
                <label className="flex items-start gap-2 pt-2 border-t border-amber-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRejectConflicts}
                    onChange={(e) => setAutoRejectConflicts(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="font-semibold text-amber-900 text-xs">
                    ปฏิเสธคำขอที่รออนุมัติอื่นซึ่งเวลาชนกันโดยอัตโนมัติ (แนะนำ)
                  </span>
                </label>
              </div>
            )}

            <p className="text-xs text-slate-600">
              เมื่ออนุมัติ ระบบจะส่งอีเมลแจ้งผู้จอง พร้อมแนบไฟล์ปฏิทิน (.ics) และบันทึกลง Google Sheets
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setApprovingBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = approvingBooking;
                  setApprovingBooking(null);
                  updateBookingStatus(b.id, 'APPROVED', undefined, autoRejectConflicts);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> ยืนยันการอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Rejection Reason Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ระบุเหตุผลในการปฏิเสธคำขอ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายการของ <span className="font-semibold text-slate-800">{rejectingBooking.fullName}</span> วันที่ {formatDisplayDate(rejectingBooking.date)}
                </p>
              </div>
              <button
                onClick={() => setRejectingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-semibold text-slate-700">
                เลือกเหตุผลสำเร็จรูป หรือพิมพ์ระบุเอง:
              </label>
              <div className="flex flex-col gap-1.5">
                {PRESET_REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className="text-left text-xs bg-slate-50 hover:bg-orange-50 hover:text-orange-700 border border-slate-200 hover:border-orange-300 p-2.5 rounded-xl transition cursor-pointer active-press"
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="ระบุเหตุผลเพิ่มเติมที่จะแสดงให้ผู้ยื่นคำขอเห็น..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => updateBookingStatus(rejectingBooking.id, 'REJECTED', rejectionReasonInput)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Check-In Modal */}
      {checkInModalBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">เช็กอินเข้าใช้งานห้องประชุม</h3>
                  <p className="text-xs text-slate-500 font-mono">รหัสการจอง: {checkInModalBooking.bookingCode}</p>
                </div>
              </div>
              <button
                onClick={() => setCheckInModalBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">ผู้ขอใช้บริการ:</span>
                <span className="font-semibold text-slate-900">{checkInModalBooking.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">รหัสนักศึกษา:</span>
                <span className="font-mono text-slate-900">{checkInModalBooking.studentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">หน่วยงาน / ชมรม:</span>
                <span className="text-slate-900">{checkInModalBooking.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่จอง:</span>
                <span className="font-bold text-slate-900">{formatDisplayDate(checkInModalBooking.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เวลา:</span>
                <span className="font-mono font-bold text-orange-600">
                  {checkInModalBooking.startTime} - {checkInModalBooking.endTime} น.
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วัตถุประสงค์:</span>
                <span className="text-slate-800 line-clamp-2 max-w-xs text-right">
                  {checkInModalBooking.reason}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">สถานะคำขอ:</span>
                <span className="font-bold">
                  {checkInModalBooking.status === 'APPROVED' ? 'อนุมัติแล้ว' : checkInModalBooking.status}
                </span>
              </div>
              {checkInModalBooking.checkedInAt && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 text-xs flex items-center gap-2 mt-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    เช็กอินแล้วเมื่อ {new Date(checkInModalBooking.checkedInAt).toLocaleString('th-TH')} โดย{' '}
                    {checkInModalBooking.checkedInByName || 'เจ้าหน้าที่'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCheckInModalBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ปิด
              </button>
              {checkInModalBooking.status === 'APPROVED' && !checkInModalBooking.checkedInAt && (
                <button
                  type="button"
                  disabled={isCheckingIn}
                  onClick={() => handleCheckIn(checkInModalBooking)}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isCheckingIn ? 'กำลังเช็กอิน...' : 'ยืนยันการเช็กอินเข้าใช้งานห้องประชุม'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
