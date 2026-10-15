'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Search,
  Check,
  X,
  User,
  Building,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from 'lucide-react';
import { formatDisplayDate, getSearchableDateVariants } from '@/lib/date-utils';
import AdminScheduleTimeline from '@/components/admin/AdminScheduleTimeline';
import AdminMonthCalendar from '@/components/admin/AdminMonthCalendar';

export interface AdminBooking {
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

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'TABLE' | 'TIMELINE' | 'MONTH'>('TABLE');
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [detailsBooking, setDetailsBooking] = useState<AdminBooking | null>(null);

  const [rejectingBooking, setRejectingBooking] = useState<AdminBooking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Batch action states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchApproveModalOpen, setIsBatchApproveModalOpen] = useState(false);
  const [isBatchRejectModalOpen, setIsBatchRejectModalOpen] = useState(false);
  const [batchRejectionReason, setBatchRejectionReason] = useState('');
  const [conflictResults, setConflictResults] = useState<{
    approvedCount: number;
    conflictCount: number;
    conflicts: Array<{ id: string; bookingCode: string; reason: string }>;
  } | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('admin_dashboard_sort_order');
    if (saved === 'asc' || saved === 'desc') {
      setSortOrder(saved);
    }
    const savedView = localStorage.getItem('admin_dashboard_view_mode');
    if (savedView === 'TABLE' || savedView === 'TIMELINE' || savedView === 'MONTH') {
      setViewMode(savedView);
    }
    fetchBookings();
  }, []);

  const handleSetViewMode = (mode: 'TABLE' | 'TIMELINE' | 'MONTH') => {
    setViewMode(mode);
    localStorage.setItem('admin_dashboard_view_mode', mode);
  };

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
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถอัปเดตสถานะได้');
        return;
      }

      setActionSuccess(
        status === 'APPROVED'
          ? 'อนุมัติการจองเรียบร้อยแล้ว'
          : status === 'REJECTED'
          ? 'ปฏิเสธคำขอการจองเรียบร้อยแล้ว'
          : 'อัปเดตสถานะสำเร็จ'
      );
      setRejectingBooking(null);
      setRejectionReasonInput('');
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
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

  const pendingInView = filteredBookings.filter((b) => b.status === 'PENDING');
  const isAllPendingSelected =
    pendingInView.length > 0 && pendingInView.every((b) => selectedIds.has(b.id));
  const isSomePendingSelected =
    pendingInView.some((b) => selectedIds.has(b.id)) && !isAllPendingSelected;

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllPendingSelected) {
      pendingInView.forEach((b) => next.delete(b.id));
    } else {
      pendingInView.forEach((b) => next.add(b.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchAction = async (action: 'APPROVE' | 'REJECT') => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch('/api/admin/bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          bookingIds: Array.from(selectedIds),
          rejectionReason: action === 'REJECT' ? batchRejectionReason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'เกิดข้อผิดพลาดในการดำเนินการแบบกลุ่ม');
        return;
      }

      if (action === 'APPROVE') {
        setIsBatchApproveModalOpen(false);
        if (data.conflictCount > 0) {
          setConflictResults({
            approvedCount: data.approvedCount,
            conflictCount: data.conflictCount,
            conflicts: data.conflicts || [],
          });
        } else {
          setActionSuccess(`อนุมัติคำขอที่เลือกเรียบร้อยแล้ว (${data.approvedCount} รายการ)`);
        }
      } else {
        setIsBatchRejectModalOpen(false);
        setActionSuccess(`ปฏิเสธคำขอที่เลือกเรียบร้อยแล้ว (${data.rejectedCount} รายการ)`);
      }

      setSelectedIds(new Set());
      setBatchRejectionReason('');
      fetchBookings();
    } catch (err) {
      console.error(err);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsBatchProcessing(false);
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
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> อนุมัติแล้ว
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
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200"></span> ถูกปฏิเสธ
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-rose-900 mt-2 tabular-nums font-mono">
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* View Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
          <button
            type="button"
            onClick={() => handleSetViewMode('TABLE')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋 ตาราง (Table)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('TIMELINE')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'TIMELINE'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🕒 ไทม์ไลน์ (Timeline)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('MONTH')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'MONTH'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅 ปฏิทินเดือน (Calendar)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-warm p-5 md:p-6 space-y-5">
        {/* Controls Toolbar: Segmented Tabs & Search */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pb-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
            >
              รออนุมัติ ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:text-emerald-900'
              }`}
            >
              อนุมัติแล้ว ({stats.approved})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-800 hover:text-rose-900'
              }`}
            >
              ถูกปฏิเสธ ({stats.rejected})
            </button>
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
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={pendingInView.length > 0 && isAllPendingSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = isSomePendingSelected;
                      }
                    }}
                    disabled={pendingInView.length === 0}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="เลือกคำขอรออนุมัติทั้งหมด"
                  />
                </th>
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
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5">ผู้พิจารณา</th>
                <th className="p-3.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">
                    กำลังดึงข้อมูลคำขอจองล่าสุด...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div>ไม่พบรายการจองตามเงื่อนไขที่เลือก</div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      selectedIds.has(b.id) ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    <td className="p-3.5 w-10 text-center">
                      {b.status === 'PENDING' ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(b.id)}
                          onChange={() => handleToggleSelect(b.id)}
                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
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
                              onClick={() => updateBookingStatus(b.id, 'APPROVED')}
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
                          onClick={() => deleteBooking(b.id, b.fullName)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {viewMode === 'TIMELINE' && (
        <AdminScheduleTimeline
          bookings={bookings}
          selectedDate={timelineDate}
          onDateChange={setTimelineDate}
          onSelectBooking={(b) => setDetailsBooking(b)}
          onApproveBooking={(b) => updateBookingStatus(b.id, 'APPROVED')}
          onRejectBooking={(b) => {
            setRejectingBooking(b);
            setRejectionReasonInput('');
          }}
        />
      )}

      {viewMode === 'MONTH' && (
        <AdminMonthCalendar
          bookings={bookings}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelectDate={(dateStr) => {
            setTimelineDate(new Date(dateStr));
            handleSetViewMode('TIMELINE');
          }}
          onSelectBooking={(b) => setDetailsBooking(b)}
        />
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

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
              เลือก {selectedIds.size} รายการ
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBatchApproveModalOpen(true)}
            disabled={isBatchProcessing}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active-press cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>อนุมัติที่เลือก</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBatchRejectionReason('');
              setIsBatchRejectModalOpen(true);
            }}
            disabled={isBatchProcessing}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active-press cursor-pointer"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ปฏิเสธที่เลือก</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={isBatchProcessing}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* Batch Approve Confirmation Modal */}
      {isBatchApproveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ยืนยันอนุมัติคำขอแบบกลุ่ม
                  </h3>
                  <p className="text-xs text-slate-500">
                    จำนวนที่เลือกทั้งหมด {selectedIds.size} รายการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchApproveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>การตรวจสอบข้อขัดแย้งของช่วงเวลา (Conflict Protection)</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                ระบบจะตรวจสอบเวลาซ้อนทับอัตโนมัติ หากมีรายการที่ชนกับรายการที่อนุมัติไปแล้ว หรือชนกันเองในกลุ่มที่เลือก
                ระบบจะอนุมัติเฉพาะรายการที่ไม่ชน และแจ้งเตือนรายการที่ขัดแย้งให้ทราบ
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 text-xs">
              {bookings
                .filter((b) => selectedIds.has(b.id))
                .map((b) => (
                  <div key={b.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">{b.fullName}</span>
                      <span className="text-slate-400 font-mono text-[11px] ml-1.5">({b.bookingCode})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {formatDisplayDate(b.date)} | {b.startTime} - {b.endTime}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchApproveModalOpen(false)}
                disabled={isBatchProcessing}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleBatchAction('APPROVE')}
                disabled={isBatchProcessing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active-press shadow-warm-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isBatchProcessing ? (
                  <span>กำลังดำเนินการ...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ยืนยันอนุมัติ ({selectedIds.size} รายการ)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reject Modal */}
      {isBatchRejectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ระบุเหตุผลในการปฏิเสธแบบกลุ่ม
                  </h3>
                  <p className="text-xs text-slate-500">
                    จำนวนที่เลือกทั้งหมด {selectedIds.size} รายการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                เลือกเหตุผลสำเร็จรูป หรือพิมพ์ระบุเอง:
              </label>
              <div className="flex flex-col gap-1.5">
                {PRESET_REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setBatchRejectionReason(reason)}
                    className="text-left text-xs bg-slate-50 hover:bg-orange-50 hover:text-orange-700 border border-slate-200 hover:border-orange-300 p-2.5 rounded-xl transition cursor-pointer active-press"
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={batchRejectionReason}
                onChange={(e) => setBatchRejectionReason(e.target.value)}
                placeholder="ระบุเหตุผลที่จะส่งแจ้งเตือนทางอีเมลไปยังผู้ยื่นคำขอทั้งหมด..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchRejectModalOpen(false)}
                disabled={isBatchProcessing}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleBatchAction('REJECT')}
                disabled={isBatchProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active-press shadow-warm-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isBatchProcessing ? (
                  <span>กำลังดำเนินการ...</span>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>ยืนยันปฏิเสธ ({selectedIds.size} รายการ)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Result Alert Modal */}
      {conflictResults && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ผลลัพธ์การอนุมัติแบบกลุ่ม
                </h3>
                <p className="text-xs text-slate-500">
                  อนุมัติสำเร็จ {conflictResults.approvedCount} รายการ | พบข้อขัดแย้ง {conflictResults.conflictCount} รายการ
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>รายการที่เวลาซ้อนทับ (คงสถานะรออนุมัติเพื่อตรวจสอบ):</span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {conflictResults.conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 space-y-1"
                  >
                    <div className="font-bold font-mono text-rose-800">
                      รหัสจอง: {c.bookingCode}
                    </div>
                    <div className="text-[11px] text-rose-700 leading-relaxed">
                      {c.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConflictResults(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition active-press cursor-pointer"
              >
                รับทราบและปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {detailsBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                    {detailsBooking.bookingCode}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      detailsBooking.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : detailsBooking.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-800 border border-amber-300'
                        : 'bg-rose-50 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {detailsBooking.status === 'APPROVED'
                      ? 'อนุมัติแล้ว'
                      : detailsBooking.status === 'PENDING'
                      ? 'รออนุมัติ'
                      : detailsBooking.status === 'REJECTED'
                      ? 'ถูกปฏิเสธ'
                      : 'ยกเลิก'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {detailsBooking.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">รหัสนักศึกษา</span>
                  <span className="font-mono font-medium text-slate-800">{detailsBooking.studentId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">สังกัด / หน่วยงาน</span>
                  <span className="font-medium text-slate-800">{detailsBooking.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">เบอร์โทรศัพท์</span>
                  <span className="font-mono font-medium text-slate-800">{detailsBooking.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">อีเมล</span>
                  <span className="font-mono font-medium text-slate-800 truncate block">{detailsBooking.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-800 font-medium">
                <Calendar className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{formatDisplayDate(detailsBooking.date)}</span>
                <span className="text-slate-300">|</span>
                <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-mono">{detailsBooking.startTime} - {detailsBooking.endTime} น.</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  วัตถุประสงค์ในการขอใช้บริการ
                </span>
                <p className="bg-slate-50 p-3 rounded-2xl border border-slate-100 font-light text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {detailsBooking.reason}
                </p>
              </div>

              {detailsBooking.rejectionReason && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200">
                  <span className="font-bold block text-[11px]">เหตุผลที่ปฏิเสธ:</span>
                  <p className="mt-0.5 text-xs">{detailsBooking.rejectionReason}</p>
                </div>
              )}

              {detailsBooking.approvedBy && (
                <div className="text-[11px] text-slate-500">
                  <span>อนุมัติโดย: </span>
                  <span className="font-semibold text-slate-700">{detailsBooking.approvedBy.fullName}</span>
                  {detailsBooking.approvedAt && (
                    <span className="font-mono ml-1">({new Date(detailsBooking.approvedAt).toLocaleDateString('th-TH')})</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {detailsBooking.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const b = detailsBooking;
                      setDetailsBooking(null);
                      setRejectingBooking(b);
                      setRejectionReasonInput('');
                    }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> ปฏิเสธคำขอ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateBookingStatus(detailsBooking.id, 'APPROVED');
                      setDetailsBooking(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-warm-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> อนุมัติคำขอ
                  </button>
                </>
              )}

              {detailsBooking.status !== 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    updateBookingStatus(detailsBooking.id, 'PENDING');
                    setDetailsBooking(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" /> คืนสถานะรออนุมัติ
                </button>
              )}

              <button
                type="button"
                onClick={() => setDetailsBooking(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
