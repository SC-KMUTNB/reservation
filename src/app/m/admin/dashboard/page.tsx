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
  SlidersHorizontal,
  CalendarDays,
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
  const [viewMode, setViewMode] = useState<'TABLE' | 'TIMELINE' | 'MONTH'>('TABLE');
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // User preferences & customization state
  const [preferences, setPreferences] = useState<UserDashboardPreferences>(DEFAULT_USER_PREFERENCES);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Action states
  const [rejectingBooking, setRejectingBooking] = useState<AdminBooking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [detailsBooking, setDetailsBooking] = useState<AdminBooking | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Batch action states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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
    fetchUserPreferences();
    fetchBookings();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const res = await fetch('/api/users/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          const merged = mergeUserPreferences(data.preferences);
          setPreferences(merged);

          const savedView = localStorage.getItem('admin_dashboard_view_mode');
          if (!savedView && merged.defaultView) {
            const v = merged.defaultView === 'CALENDAR' ? 'MONTH' : merged.defaultView;
            setViewMode(v as 'TABLE' | 'TIMELINE' | 'MONTH');
          }

          if (merged.defaultStatusFilter) {
            setStatusFilter(merged.defaultStatusFilter);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load user preferences', e);
    }
  };

  const handleSavePreferences = async (newPrefs: UserDashboardPreferences): Promise<boolean> => {
    try {
      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: newPrefs }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'ไม่สามารถบันทึกการตั้งค่าได้');
        return false;
      }

      const data = await res.json();
      const merged = mergeUserPreferences(data.preferences || newPrefs);
      setPreferences(merged);

      if (merged.defaultView) {
        const v = merged.defaultView === 'CALENDAR' ? 'MONTH' : merged.defaultView;
        setViewMode(v as 'TABLE' | 'TIMELINE' | 'MONTH');
        localStorage.setItem('admin_dashboard_view_mode', v);
      }
      if (merged.defaultStatusFilter) {
        setStatusFilter(merged.defaultStatusFilter);
      }

      setActionSuccess('บันทึกการตั้งค่าแดชบอร์ดเรียบร้อยแล้ว');
      return true;
    } catch (err) {
      console.error('Save preferences error:', err);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      return false;
    }
  };

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
    const todayStr = getNowInTimezone().dateStr;

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

  const pendingInView = filteredBookings.filter((b) => b.status === 'PENDING');
  const isAllPendingSelected =
    pendingInView.length > 0 && pendingInView.every((b) => selectedIds.has(b.id));

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
      setIsSelectionMode(false);
      fetchBookings();
    } catch (err) {
      console.error(err);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Quick stats
  const todayStr = getNowInTimezone().dateStr;
  const todayCount = bookings.filter((b) => b.date === todayStr).length;

  const weekDates = getWeekDates(new Date());
  const weekDateStrings = new Set(weekDates.map(toDateString));
  const weeklyCount = bookings.filter((b) => weekDateStrings.has(b.date)).length;

  const nowTime = new Date().getTime();
  const urgentBookings = bookings.filter((b) => {
    if (b.status !== 'PENDING') return false;
    try {
      const bookingTime = new Date(`${b.date}T${b.startTime}:00`).getTime();
      const diffHours = (bookingTime - nowTime) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 48;
    } catch {
      return false;
    }
  });
  const urgentCount = urgentBookings.length;

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

      {/* Metrics Glance (Dynamic based on preferences) */}
      {preferences.visibleWidgets.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {preferences.visibleWidgets.includes('PENDING') && (
            <div className="bg-white p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
              <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                รอการตรวจสอบ (Pending)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
                <span className="text-[10px] text-slate-400">รายการ</span>
              </div>
            </div>
          )}

          {preferences.visibleWidgets.includes('TODAY') && (
            <div className="bg-white p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                การจองวันนี้ (Today)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-blue-600">{todayCount}</span>
                <span className="text-[10px] text-slate-400">รายการ</span>
              </div>
            </div>
          )}

          {preferences.visibleWidgets.includes('URGENT') && (
            <div className="bg-white p-3.5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs">
              <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                เร่งด่วน 48 ชม. (Urgent)
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-rose-600">{urgentCount}</span>
                <span className="text-[10px] text-slate-400">รายการ</span>
              </div>
            </div>
          )}

          {preferences.visibleWidgets.includes('WEEKLY') && (
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                รวมในสัปดาห์นี้
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-emerald-600">{weeklyCount}</span>
                <span className="text-[10px] text-slate-400">รายการ</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Switcher Tabs & Customize Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/90 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleSetViewMode('TABLE')}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'TABLE'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋 ตาราง</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetViewMode('TIMELINE')}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
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
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              viewMode === 'MONTH'
                ? 'bg-white text-orange-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅 ปฏิทิน</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCustomizerOpen(true)}
          className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition shrink-0 cursor-pointer flex items-center justify-center"
          title="ปรับแต่งแดชบอร์ด"
        >
          <SlidersHorizontal className="w-4 h-4 text-orange-600" />
        </button>
      </div>

      {viewMode === 'TABLE' && (
        <>
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
            { id: 'TODAY', label: `วันนี้ (${todayCount})` },
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

        {/* Multi-select Control Bar */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedIds(new Set());
              }}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSelectionMode ? 'bg-orange-500' : 'bg-slate-300'
                }`}
              ></span>
              <span>
                {isSelectionMode ? 'ปิดโหมดเลือกหลายรายการ' : 'เลือกหลายรายการ'}
              </span>
            </button>

            {isSelectionMode && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] text-orange-600 font-bold hover:underline cursor-pointer"
              >
                {isAllPendingSelected
                  ? 'ยกเลิกเลือกทั้งหมด'
                  : `เลือกทั้งหมด (${pendingInView.length})`}
              </button>
            )}
          </div>
        )}
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
                className={`bg-white rounded-2xl border transition-colors shadow-2xs ${
                  preferences.tableDensity === 'compact' ? 'p-3 space-y-2' : 'p-4 space-y-3'
                } ${
                  selectedIds.has(b.id)
                    ? 'border-orange-300 bg-orange-50/20 ring-1 ring-orange-300'
                    : 'border-slate-200/90'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(b.id)}
                        onChange={() => {
                          handleToggleSelect(b.id);
                          if (!isSelectionMode) setIsSelectionMode(true);
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    )}
                    <span className="font-mono text-xs font-bold text-orange-600">
                      {b.bookingCode}
                    </span>
                  </div>
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
                <div className={`text-xs text-slate-700 ${preferences.tableDensity === 'compact' ? 'space-y-0.5' : 'space-y-1'}`}>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <User className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>{b.fullName}</span>
                    {preferences.visibleColumns.studentId && b.studentId && (
                      <span className="text-[11px] text-slate-500 font-mono font-normal">
                        ({b.studentId})
                      </span>
                    )}
                  </div>

                  {preferences.visibleColumns.department && b.department && (
                    <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.department}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-700 pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>{formatDisplayDate(b.date)}</span>
                    <span className="text-slate-300">|</span>
                    <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span className="font-mono">{b.startTime} - {b.endTime} น.</span>
                  </div>

                  {preferences.visibleColumns.reason && b.reason && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl mt-1 font-light line-clamp-2">
                      {b.reason}
                    </p>
                  )}

                  {preferences.visibleColumns.approvedBy && b.approvedBy && (
                    <div className="text-[10px] text-slate-500 pt-0.5 flex items-center gap-1">
                      <span>ผู้อนุมัติ:</span>
                      <span className="font-medium text-slate-700">{b.approvedBy.fullName}</span>
                      {b.approvedAt && (
                        <span className="font-mono text-slate-400">
                          ({new Date(b.approvedAt).toLocaleDateString('th-TH')})
                        </span>
                      )}
                    </div>
                  )}
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
      </>
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

      {/* ----------------- Sticky Bottom Batch Action Bar ----------------- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-40 max-w-md mx-auto bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
              {selectedIds.size} รายการ
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsBatchApproveModalOpen(true)}
              disabled={isBatchProcessing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>อนุมัติ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchRejectionReason('');
                setIsBatchRejectModalOpen(true);
              }}
              disabled={isBatchProcessing}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>ปฏิเสธ</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={isBatchProcessing}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* ----------------- Batch Approve Bottom Sheet Modal ----------------- */}
      {isBatchApproveModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ยืนยันอนุมัติคำขอแบบกลุ่ม
                </h3>
                <p className="text-[11px] text-slate-500">
                  เลือก {selectedIds.size} รายการ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchApproveModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>การตรวจสอบข้อขัดแย้ง (Conflict Protection)</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed">
                ระบบจะตรวจสอบเวลาซ้อนทับอัตโนมัติ หากมีรายการชนกัน
                ระบบจะอนุมัติเฉพาะรายการแรกและแจ้งเตือนรายการที่ขัดแย้ง
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 divide-y divide-slate-100 text-xs">
              {bookings
                .filter((b) => selectedIds.has(b.id))
                .map((b) => (
                  <div key={b.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900 text-xs">{b.fullName}</span>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">({b.bookingCode})</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {formatDisplayDate(b.date)} | {b.startTime}-{b.endTime}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchApproveModalOpen(false)}
                disabled={isBatchProcessing}
                className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl text-xs active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleBatchAction('APPROVE')}
                disabled={isBatchProcessing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 shadow-xs flex items-center justify-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <span>กำลังดำเนินการ...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>ยืนยันอนุมัติ ({selectedIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Batch Reject Bottom Sheet Modal ----------------- */}
      {isBatchRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ปฏิเสธคำขอแบบกลุ่ม
                </h3>
                <p className="text-[11px] text-slate-500">
                  เลือก {selectedIds.size} รายการ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchRejectModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                เลือกเหตุผลที่ปฏิเสธ (ระบบจะส่งอีเมลแจ้งผู้จองทั้งหมด)
              </label>
              <div className="space-y-1">
                {PRESET_REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setBatchRejectionReason(reason)}
                    className="w-full text-left text-[11px] p-2 rounded-xl border border-slate-200 hover:bg-orange-50/50 hover:border-orange-300 text-slate-700 transition"
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={batchRejectionReason}
                onChange={(e) => setBatchRejectionReason(e.target.value)}
                placeholder="หรือระบุเหตุผลอื่นๆ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 resize-none mt-2"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBatchRejectModalOpen(false)}
                disabled={isBatchProcessing}
                className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl text-xs active:scale-95"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleBatchAction('REJECT')}
                disabled={isBatchProcessing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs active:scale-95 shadow-xs flex items-center justify-center gap-1.5"
              >
                {isBatchProcessing ? (
                  <span>กำลังดำเนินการ...</span>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>ยืนยันปฏิเสธ ({selectedIds.size})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Conflict Result Alert Bottom Sheet Modal ----------------- */}
      {conflictResults && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-3.5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ผลลัพธ์การอนุมัติแบบกลุ่ม
                </h3>
                <p className="text-[11px] text-slate-500">
                  อนุมัติ {conflictResults.approvedCount} รายการ | ข้อขัดแย้ง {conflictResults.conflictCount} รายการ
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>รายการที่เวลาซ้อนทับ (คงสถานะรออนุมัติ):</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {conflictResults.conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-900 space-y-1"
                  >
                    <div className="font-bold font-mono text-rose-800 text-[11px]">
                      รหัสจอง: {c.bookingCode}
                    </div>
                    <div className="text-[10px] text-rose-700 leading-relaxed">
                      {c.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConflictResults(null)}
                className="w-full bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-xs active:scale-95"
              >
                รับทราบและปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-Admin Dashboard Customizer Modal */}
      <DashboardCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
