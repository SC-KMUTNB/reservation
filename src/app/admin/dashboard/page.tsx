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
  SlidersHorizontal,
  CalendarDays,
  QrCode,
  RotateCw,
  RefreshCw,
  Eye,
  Building,
  User as UserIcon,
} from 'lucide-react';
import { formatDisplayDate, getSearchableDateVariants, getNowInTimezone } from '@/lib/date-utils';
import AdminScheduleTimeline, { getWeekDates, toDateString } from '@/components/admin/AdminScheduleTimeline';
import AdminMonthCalendar from '@/components/admin/AdminMonthCalendar';
import DashboardCustomizerModal from '@/components/admin/DashboardCustomizerModal';
import {
  UserDashboardPreferences,
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
} from '@/lib/user-preferences';

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

function isTimeOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

function getConflictingPendingBookings(current: AdminBooking, allBookings: AdminBooking[]): AdminBooking[] {
  if (current.status !== 'PENDING') return [];
  return allBookings.filter(
    (b) =>
      b.id !== current.id &&
      b.status === 'PENDING' &&
      b.date === current.date &&
      isTimeOverlapping(current.startTime, current.endTime, b.startTime, b.endTime)
  );
}

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

  // User preferences & customization state
  const [preferences, setPreferences] = useState<UserDashboardPreferences>(DEFAULT_USER_PREFERENCES);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

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

  const { dateStr: todayStr } = useMemo(() => getNowInTimezone('Asia/Bangkok'), []);

  useEffect(() => {
    const saved = localStorage.getItem('admin_dashboard_sort_order');
    if (saved === 'asc' || saved === 'desc') {
      setSortOrder(saved);
    }
    fetchPreferences();
    fetchBookings();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/users/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          const merged = mergeUserPreferences(data.preferences);
          setPreferences(merged);
          const mapped = merged.defaultView === 'CALENDAR' || merged.defaultView === 'MONTH' ? 'MONTH' : merged.defaultView === 'TIMELINE' ? 'TIMELINE' : 'TABLE';
          setViewMode(mapped);
          if (merged.defaultStatusFilter) {
            setStatusFilter(merged.defaultStatusFilter);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleSavePreferences = async (newPrefs: UserDashboardPreferences): Promise<boolean> => {
    try {
      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
        const mapped = data.preferences.defaultView === 'CALENDAR' || data.preferences.defaultView === 'MONTH' ? 'MONTH' : data.preferences.defaultView === 'TIMELINE' ? 'TIMELINE' : 'TABLE';
        setViewMode(mapped);
        setActionSuccess('บันทึกการตั้งค่าส่วนบุคคลเรียบร้อยแล้ว');
        setTimeout(() => setActionSuccess(null), 3500);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const handleSetSortOrder = (newOrder: 'desc' | 'asc') => {
    setSortOrder(newOrder);
    localStorage.setItem('admin_dashboard_sort_order', newOrder);
  };

  const toggleSortOrder = () => {
    const next = sortOrder === 'desc' ? 'asc' : 'desc';
    handleSetSortOrder(next);
  };

  const handleSetViewMode = (mode: 'TABLE' | 'TIMELINE' | 'MONTH') => {
    setViewMode(mode);
    localStorage.setItem('admin_dashboard_view_mode', mode);
  };

  useEffect(() => {
    let result = [...bookings];

    if (statusFilter === 'TODAY') {
      result = result.filter((b) => b.date === todayStr);
    } else if (statusFilter !== 'ALL') {
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
          b.department.toLowerCase().includes(q) ||
          b.bookingCode.toLowerCase().includes(q) ||
          b.reason.toLowerCase().includes(q) ||
          b.phone.toLowerCase().includes(q) ||
          matchesDate
        );
      });
    }

    result.sort((a, b) => {
      if (a.date !== b.date) {
        return sortOrder === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      }
      return sortOrder === 'desc'
        ? b.startTime.localeCompare(a.startTime)
        : a.startTime.localeCompare(b.startTime);
    });

    setFilteredBookings(result);
  }, [bookings, statusFilter, searchQuery, sortOrder, todayStr]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch {
      setActionError('ไม่สามารถโหลดข้อมูลคำขอจองห้องประชุมได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pendingBookingsInFiltered = useMemo(
    () => filteredBookings.filter((b) => b.status === 'PENDING'),
    [filteredBookings]
  );

  const handleSelectAllPending = () => {
    if (selectedIds.size === pendingBookingsInFiltered.length && pendingBookingsInFiltered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingBookingsInFiltered.map((b) => b.id)));
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          bookingIds: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'การอนุมัติแบบกลุ่มเกิดข้อผิดพลาด');
      } else {
        if (data.conflictCount > 0) {
          setConflictResults({
            approvedCount: data.approvedCount,
            conflictCount: data.conflictCount,
            conflicts: data.conflicts || [],
          });
        } else {
          setActionSuccess(`อนุมัติคำขอสำเร็จทั้งหมด ${data.approvedCount} รายการ`);
          setTimeout(() => setActionSuccess(null), 4000);
        }
        setSelectedIds(new Set());
        fetchBookings();
      }
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsBatchProcessing(false);
      setIsBatchApproveModalOpen(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchProcessing(true);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/bookings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          bookingIds: Array.from(selectedIds),
          rejectionReason: batchRejectionReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'การปฏิเสธแบบกลุ่มเกิดข้อผิดพลาด');
      } else {
        setActionSuccess(`ปฏิเสธคำขอเรียบร้อยแล้ว ${data.rejectedCount} รายการ`);
        setTimeout(() => setActionSuccess(null), 4000);
        setSelectedIds(new Set());
        fetchBookings();
      }
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsBatchProcessing(false);
      setIsBatchRejectModalOpen(false);
      setBatchRejectionReason('');
    }
  };

  const handleApproveClick = (booking: AdminBooking) => {
    const conflicts = getConflictingPendingBookings(booking, bookings);
    setConflictsForApproving(conflicts);
    setAutoRejectConflicts(true);
    setApprovingBooking(booking);
  };

  const updateBookingStatus = async (
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
    rejectionReason?: string,
    autoRejectConflictsFlag?: boolean
  ) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          rejectionReason,
          autoRejectConflicts: autoRejectConflictsFlag,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'เกิดข้อผิดพลาดในการปรับปรุงสถานะ');
      } else {
        const msg =
          status === 'APPROVED'
            ? 'อนุมัติการจองสำเร็จและส่งอีเมลแจ้งผู้จองเรียบร้อยแล้ว'
            : status === 'REJECTED'
            ? 'ปฏิเสธการจองและแจ้งผู้จองเรียบร้อยแล้ว'
            : 'คืนสถานะเป็นรอการตรวจสอบแล้ว';
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchBookings();
      }
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setRejectingBooking(null);
      setApprovingBooking(null);
      setDetailsBooking(null);
    }
  };

  const handleCheckIn = async (booking: AdminBooking) => {
    setIsCheckingIn(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIn: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'เช็กอินไม่สำเร็จ');
      } else {
        setActionSuccess(`เช็กอินห้องประชุมสำเร็จ: ${booking.fullName} (${booking.bookingCode})`);
        setTimeout(() => setActionSuccess(null), 4000);
        setCheckInModalBooking(null);
        fetchBookings();
      }
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleRetrySync = async (id: string) => {
    setIsRetryingSyncId(id);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/retry-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || 'ซิงก์ข้อมูลซ้ำไม่สำเร็จ');
      } else {
        setActionSuccess('ดำเนินการซิงก์ข้อมูลและส่งอีเมลซ้ำสำเร็จแล้ว');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch {
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsRetryingSyncId(null);
    }
  };

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === 'PENDING').length;
    const approved = bookings.filter((b) => b.status === 'APPROVED').length;
    const rejected = bookings.filter((b) => b.status === 'REJECTED').length;
    const today = bookings.filter((b) => b.date === todayStr).length;

    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const urgent = bookings.filter((b) => {
      if (b.status !== 'PENDING') return false;
      const bDate = new Date(`${b.date}T${b.startTime}:00`);
      return bDate >= now && bDate <= in48h;
    }).length;

    const weekDates = getWeekDates(now).map(toDateString);
    const weekly = bookings.filter((b) => weekDates.includes(b.date)).length;

    return { total, pending, approved, rejected, today, urgent, weekly };
  }, [bookings, todayStr]);

  const cellPadding = preferences.tableDensity === 'compact' ? 'py-2 px-3 text-xs' : 'p-3.5';

  const totalVisibleColSpan =
    3 +
    (preferences.visibleColumns.studentId ? 1 : 0) +
    (preferences.visibleColumns.department ? 1 : 0) +
    (preferences.visibleColumns.reason ? 1 : 0) +
    1 +
    (preferences.visibleColumns.approvedBy ? 1 : 0) +
    1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-warm">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            ระบบจัดการคำขอจองห้องประชุม
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ตรวจสอบ อนุมัติ หรือปฏิเสธคำขอ พร้อมดูตารางเวลาและสถิติการใช้งาน
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active-press shadow-2xs"
            title="ปรับแต่งแดชบอร์ดส่วนบุคคล"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
            <span>ปรับแต่งแดชบอร์ด</span>
          </button>

          <button
            type="button"
            onClick={fetchBookings}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/reports"
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> ส่งออกรายงาน
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {preferences.visibleWidgets.includes('PENDING') && (
          <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-warm-xs">
            <div className="flex justify-between items-center text-amber-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200"></span> รอการตรวจสอบ
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-amber-900 mt-2 tabular-nums font-mono">
              {stats.pending}
            </div>
          </div>
        )}

        {preferences.visibleWidgets.includes('TODAY') && (
          <div className="bg-white p-5 rounded-3xl border border-blue-200/80 bg-blue-50/20 shadow-warm-xs">
            <div className="flex justify-between items-center text-blue-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-200"></span> วันนี้
              </span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-900 mt-2 tabular-nums font-mono">
              {stats.today}
            </div>
          </div>
        )}

        {preferences.visibleWidgets.includes('URGENT') && (
          <div className="bg-white p-5 rounded-3xl border border-rose-200/80 bg-rose-50/20 shadow-warm-xs">
            <div className="flex justify-between items-center text-rose-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse"></span> เร่งด่วน 48 ชม.
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-rose-900 mt-2 tabular-nums font-mono">
              {stats.urgent}
            </div>
          </div>
        )}

        {preferences.visibleWidgets.includes('WEEKLY') && (
          <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-warm-xs">
            <div className="flex justify-between items-center text-emerald-800 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> รวมในสัปดาห์นี้
              </span>
              <CalendarDays className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-900 mt-2 tabular-nums font-mono">
              {stats.weekly}
            </div>
          </div>
        )}
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

      {/* View Switcher Header & Filters */}
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
            <span>📋 ตารางรายการ</span>
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
            <span>🕒 ไทม์ไลน์</span>
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
            <span>📅 ปฏิทินเดือน</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, สังกัด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-48 md:w-60 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="button"
            onClick={toggleSortOrder}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            title="เรียงตามวันที่จอง"
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDownWideNarrow className="w-3.5 h-3.5 text-orange-600" />
                <span>ใหม่ไปเก่า</span>
              </>
            ) : (
              <>
                <ArrowUpNarrowWide className="w-3.5 h-3.5 text-orange-600" />
                <span>เก่าไปใหม่</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Switchable View Content */}
      {viewMode === 'TIMELINE' ? (
        <AdminScheduleTimeline
          bookings={bookings}
          selectedDate={timelineDate}
          onDateChange={setTimelineDate}
          onSelectBooking={(b) => setDetailsBooking(b)}
          onApproveBooking={handleApproveClick}
          onRejectBooking={(b) => {
            setRejectingBooking(b);
            setRejectionReasonInput('');
          }}
        />
      ) : viewMode === 'MONTH' ? (
        <AdminMonthCalendar
          bookings={bookings}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          onSelectDate={(dateStr) => {
            setTimelineDate(new Date(dateStr + 'T00:00:00'));
            handleSetViewMode('TIMELINE');
          }}
          onSelectBooking={(b) => setDetailsBooking(b)}
        />
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-warm overflow-hidden">
          {/* Status Filter Tabs */}
          <div className="flex border-b border-slate-100 p-2 overflow-x-auto gap-1">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'PENDING', label: 'รออนุมัติ' },
              { id: 'APPROVED', label: 'อนุมัติแล้ว' },
              { id: 'TODAY', label: 'วันนี้' },
              { id: 'REJECTED', label: 'ปฏิเสธแล้ว' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-orange-50 text-orange-700 border border-orange-200/80 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        pendingBookingsInFiltered.length > 0 &&
                        selectedIds.size === pendingBookingsInFiltered.length
                      }
                      onChange={handleSelectAllPending}
                      className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      title="เลือกคำขอรออนุมัติทั้งหมด"
                    />
                  </th>
                  <th className="py-3 px-3">วันและเวลาที่จอง</th>
                  <th className="py-3 px-3">ผู้ขอใช้บริการ</th>
                  {preferences.visibleColumns.studentId && <th className="py-3 px-3">รหัสนักศึกษา</th>}
                  {preferences.visibleColumns.department && <th className="py-3 px-3">หน่วยงาน / สังกัด</th>}
                  {preferences.visibleColumns.reason && <th className="py-3 px-3">เหตุผลและวาระ</th>}
                  <th className="py-3 px-3">สถานะ</th>
                  {preferences.visibleColumns.approvedBy && <th className="py-3 px-3">ผู้อนุมัติ</th>}
                  <th className="py-3 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={totalVisibleColSpan} className="p-12 text-center text-slate-400">
                      กำลังดึงข้อมูลคำขอจองล่าสุด...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={totalVisibleColSpan} className="p-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <div>ไม่พบรายการจองตามเงื่อนไขที่เลือก</div>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => {
                    const conflicts = getConflictingPendingBookings(b, bookings);
                    const isToday = b.date === todayStr;

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          selectedIds.has(b.id) ? 'bg-orange-50/40' : ''
                        }`}
                      >
                        <td className={`${cellPadding} w-10 text-center`}>
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
                        <td className={cellPadding}>
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
                                ชน {conflicts.length} รายการ
                              </span>
                            </div>
                          )}
                        </td>

                        <td className={cellPadding}>
                          <div className="font-semibold text-slate-900 text-xs">{b.fullName}</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">โทร: {b.phone}</div>
                        </td>

                        {preferences.visibleColumns.studentId && (
                          <td className={cellPadding}>
                            <span className="font-mono text-slate-700 text-xs">{b.studentId || '-'}</span>
                          </td>
                        )}

                        {preferences.visibleColumns.department && (
                          <td className={cellPadding}>
                            <span className="font-medium text-slate-800 text-xs">{b.department || '-'}</span>
                          </td>
                        )}

                        {preferences.visibleColumns.reason && (
                          <td className={`${cellPadding} max-w-xs`}>
                            <div className="text-slate-600 text-[11px] line-clamp-2" title={b.reason}>
                              {b.reason}
                            </div>
                            {b.borrowedEquipment && b.borrowedEquipment.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {b.borrowedEquipment.map((eq, idx) => (
                                  <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] border border-slate-200">
                                    {eq}
                                  </span>
                                ))}
                              </div>
                            )}
                            {b.rejectionReason && (
                              <div className="text-rose-700 text-[10px] mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                เหตุผลที่ปฏิเสธ: {b.rejectionReason}
                              </div>
                            )}
                          </td>
                        )}

                        <td className={cellPadding}>
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

                        {preferences.visibleColumns.approvedBy && (
                          <td className={cellPadding}>
                            {b.approvedBy ? (
                              <div>
                                <div className="font-medium text-slate-800 text-xs">{b.approvedBy.fullName}</div>
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
                        )}

                        <td className={`${cellPadding} text-right whitespace-nowrap`}>
                          <div className="flex items-center justify-end gap-1.5">
                            {b.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveClick(b)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                                  title="อนุมัติคำขอ"
                                >
                                  <Check className="w-3.5 h-3.5" /> อนุมัติ
                                </button>
                                <button
                                  type="button"
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
                                type="button"
                                onClick={() => setCheckInModalBooking(b)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="เช็กอินผู้ใช้บริการ"
                              >
                                <QrCode className="w-3.5 h-3.5" /> เช็กอิน
                              </button>
                            )}

                            {b.status !== 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => updateBookingStatus(b.id, 'PENDING')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition active-press flex items-center gap-1 cursor-pointer"
                                title="คืนสถานะเป็นรออนุมัติ"
                              >
                                <RotateCcw className="w-3 h-3" /> คืนสถานะ
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRetrySync(b.id)}
                              disabled={isRetryingSyncId === b.id}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                              title="ซิงก์ข้อมูล/ส่งอีเมลซ้ำ (Retry Sync)"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${isRetryingSyncId === b.id ? 'animate-spin text-blue-600' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDetailsBooking(b)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              title="ดูรายละเอียดการจอง"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
      )}

      {/* Floating Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-4 transition-all duration-300">
          <div className="text-xs font-bold flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-[11px] font-mono">
              {selectedIds.size}
            </span>
            <span>รายการที่เลือก</span>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBatchApproveModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active-press flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> อนุมัติที่เลือก
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchRejectionReason('');
                setIsBatchRejectModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active-press flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <X className="w-3.5 h-3.5" /> ปฏิเสธที่เลือก
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Single Approve Modal with Conflict Detection */}
      {approvingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">ยืนยันการอนุมัติคำขอ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายการของ <span className="font-semibold text-slate-800">{approvingBooking.fullName}</span> วันที่ {formatDisplayDate(approvingBooking.date)} ({approvingBooking.startTime} - {approvingBooking.endTime} น.)
                </p>
              </div>
              <button
                type="button"
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
                type="button"
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
                type="button"
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

      {/* Batch Approve Modal */}
      {isBatchApproveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">อนุมัติคำขอที่เลือกพร้อมกัน</h3>
                  <p className="text-xs text-slate-500">
                    เลือกไว้ทั้งหมด <span className="font-semibold text-slate-900">{selectedIds.size}</span> รายการ
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

            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบจะตรวจสอบช่วงเวลาว่ามีคำขอใดซ้อนทับกันหรือไม่ หากไม่มีความขัดแย้ง ระบบจะอนุมัติพร้อมกัน ส่งอีเมลแจ้งเตือนผู้จองทุกคน และบันทึกประวัติการทำงานอัตโนมัติ
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchApproveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={handleBatchApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isBatchProcessing ? 'กำลังประมวลผล...' : 'ยืนยันอนุมัติที่เลือก'}
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
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">ปฏิเสธคำขอที่เลือกพร้อมกัน</h3>
                  <p className="text-xs text-slate-500">
                    เลือกไว้ทั้งหมด <span className="font-semibold text-slate-900">{selectedIds.size}</span> รายการ
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
                เลือกเหตุผลสำเร็จรูป หรือพิมพ์ระบุเหตุผลส่วนกลาง:
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
                placeholder="ระบุเหตุผลในการปฏิเสธคำขอชุดนี้ (จะส่งในอีเมลแจ้งเตือนทุกคน)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isBatchProcessing}
                onClick={handleBatchReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {isBatchProcessing ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธที่เลือก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Results Modal */}
      {conflictResults && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">สรุปผลการอนุมัติแบบกลุ่ม</h3>
                  <p className="text-xs text-slate-500">พบคำขอที่เวลาซ้อนทับกัน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConflictResults(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-semibold">
                ✓ อนุมัติสำเร็จ: {conflictResults.approvedCount} รายการ
              </div>

              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>ข้าม/ไม่สามารถอนุมัติได้เนื่องจากเวลาชนกัน ({conflictResults.conflictCount} รายการ):</span>
                </div>
                <div className="divide-y divide-amber-200/60 max-h-40 overflow-y-auto">
                  {conflictResults.conflicts.map((c) => (
                    <div key={c.id} className="py-1.5 text-amber-950">
                      <span className="font-mono font-bold">{c.bookingCode}</span>: {c.reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setConflictResults(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {detailsBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">รายละเอียดคำขอจองห้อง</h3>
                <p className="text-xs font-mono text-orange-600 mt-0.5">{detailsBooking.bookingCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">ผู้ขอจอง:</span>
                <span className="font-semibold text-slate-800">{detailsBooking.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">รหัสนักศึกษา:</span>
                <span className="font-mono text-slate-800">{detailsBooking.studentId || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">หน่วยงาน / สังกัด:</span>
                <span className="text-slate-800">{detailsBooking.department || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">เบอร์ติดต่อ / อีเมล:</span>
                <span className="text-slate-800">{detailsBooking.phone} • {detailsBooking.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">วันและเวลา:</span>
                <span className="font-bold text-slate-900">
                  {formatDisplayDate(detailsBooking.date)} ({detailsBooking.startTime} - {detailsBooking.endTime} น.)
                </span>
              </div>
              <div className="py-1 border-b border-slate-100">
                <span className="text-slate-500 block mb-1">เหตุผลและวาระ:</span>
                <p className="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  {detailsBooking.reason}
                </p>
              </div>
              {detailsBooking.borrowedEquipment && detailsBooking.borrowedEquipment.length > 0 && (
                <div className="py-1 border-b border-slate-100">
                  <span className="text-slate-500 block mb-1">อุปกรณ์ที่ขอใช้:</span>
                  <div className="flex flex-wrap gap-1">
                    {detailsBooking.borrowedEquipment.map((eq, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-xs border border-slate-200">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detailsBooking.rejectionReason && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl">
                  <span className="font-bold block mb-0.5">เหตุผลที่ปฏิเสธ:</span>
                  {detailsBooking.rejectionReason}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDetailsBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ปิด
              </button>
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
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition active-press cursor-pointer"
                  >
                    ปฏิเสธคำขอ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const b = detailsBooking;
                      setDetailsBooking(null);
                      handleApproveClick(b);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active-press cursor-pointer"
                  >
                    อนุมัติคำขอ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Customizer Modal */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
