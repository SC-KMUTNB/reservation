<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import {
    Calendar,
    Clock,
    CheckCircle,
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
    Camera,
  } from 'lucide-svelte';
  import { formatDisplayDate, getSearchableDateVariants, getNowInTimezone } from '$lib/date-utils';
  import AdminScheduleTimeline from '$lib/components/admin/AdminScheduleTimeline.svelte';
  import {
    type AdminBooking,
    getWeekDates,
    toDateString,
  } from '$lib/timeline-utils';
  import AdminMonthCalendar from '$lib/components/admin/AdminMonthCalendar.svelte';
  import DashboardCustomizerModal from '$lib/components/admin/DashboardCustomizerModal.svelte';
  import QrScannerModal from '$lib/components/admin/QrScannerModal.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import {
    type UserDashboardPreferences,
    DEFAULT_USER_PREFERENCES,
    mergeUserPreferences,
  } from '$lib/user-preferences';

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
    if (current.status !== 'PENDING' || !Array.isArray(allBookings)) return [];
    return allBookings.filter(
      (b) =>
        b.id !== current.id &&
        b.status === 'PENDING' &&
        b.date === current.date &&
        isTimeOverlapping(current.startTime, current.endTime, b.startTime, b.endTime)
    );
  }

  let bookings = $state<AdminBooking[]>([]);
  let isLoading = $state(true);
  let statusFilter = $state('ALL');
  let searchQuery = $state('');
  let sortOrder = $state<'desc' | 'asc'>('desc');
  let viewMode = $state<'TABLE' | 'TIMELINE' | 'MONTH'>('TABLE');
  let timelineDate = $state<Date>(new Date());
  let calendarMonth = $state<Date>(new Date());
  let detailsBooking = $state<AdminBooking | null>(null);

  let preferences = $state<UserDashboardPreferences>(DEFAULT_USER_PREFERENCES);
  let isCustomizerOpen = $state(false);

  let rejectingBooking = $state<AdminBooking | null>(null);
  let rejectionReasonInput = $state('');
  let approvingBooking = $state<AdminBooking | null>(null);
  let conflictsForApproving = $state<AdminBooking[]>([]);
  let autoRejectConflicts = $state(true);

  let checkInModalBooking = $state<AdminBooking | null>(null);
  let isCheckingIn = $state(false);
  let isRetryingSyncId = $state<string | null>(null);
  let isScannerOpen = $state(false);

  let actionError = $state<string | null>(null);
  let actionSuccess = $state<string | null>(null);

  let selectedIds = $state<Set<string>>(new Set());
  let isBatchApproveModalOpen = $state(false);
  let isBatchRejectModalOpen = $state(false);
  let batchRejectionReason = $state('');
  let conflictResults = $state<{
    approvedCount: number;
    conflictCount: number;
    conflicts: Array<{ id: string; bookingCode: string; reason: string }>;
  } | null>(null);
  let isBatchProcessing = $state(false);

  const { dateStr: todayStr } = getNowInTimezone('Asia/Bangkok');

  onMount(() => {
    const saved = localStorage.getItem('admin_dashboard_sort_order');
    if (saved === 'asc' || saved === 'desc') {
      sortOrder = saved;
    }
    fetchPreferences();
    fetchBookings();
  });

  $effect(() => {
    if (bookings.length > 0 && typeof window !== 'undefined') {
      const checkInCode = page.url.searchParams.get('checkIn');
      if (checkInCode) {
        const found = bookings.find((b) => b.bookingCode.toUpperCase() === checkInCode.toUpperCase());
        if (found) {
          checkInModalBooking = found;
        }
      }
    }
  });

  function handleScanBookingCode(code: string) {
    isScannerOpen = false;
    const found = bookings.find((b) => b.bookingCode.toUpperCase() === code.toUpperCase());
    if (found) {
      checkInModalBooking = found;
    } else {
      actionError = `ไม่พบรายการจองที่มีรหัส: ${code}`;
      setTimeout(() => (actionError = null), 4500);
    }
  }

  async function fetchPreferences() {
    try {
      const res = await fetch('/api/users/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.preferences) {
          const merged = mergeUserPreferences(data.preferences);
          preferences = merged;
          const mapped = merged.defaultView === 'CALENDAR' || merged.defaultView === 'MONTH' ? 'MONTH' : merged.defaultView === 'TIMELINE' ? 'TIMELINE' : 'TABLE';
          viewMode = mapped;
          if (merged.defaultStatusFilter) {
            statusFilter = merged.defaultStatusFilter;
          }
        }
      }
    } catch {}
  }

  async function handleSavePreferences(newPrefs: UserDashboardPreferences): Promise<boolean> {
    try {
      const res = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });
      if (res.ok) {
        const data = await res.json();
        const merged = mergeUserPreferences(data.preferences);
        preferences = merged;
        const mapped = merged.defaultView === 'CALENDAR' || merged.defaultView === 'MONTH' ? 'MONTH' : merged.defaultView === 'TIMELINE' ? 'TIMELINE' : 'TABLE';
        viewMode = mapped;
        actionSuccess = 'บันทึกการตั้งค่าส่วนบุคคลเรียบร้อยแล้ว';
        setTimeout(() => (actionSuccess = null), 3500);
        return true;
      }
    } catch {}
    return false;
  }

  function handleSetSortOrder(newOrder: 'desc' | 'asc') {
    sortOrder = newOrder;
    localStorage.setItem('admin_dashboard_sort_order', newOrder);
  }

  function toggleSortOrder() {
    const next = sortOrder === 'desc' ? 'asc' : 'desc';
    handleSetSortOrder(next);
  }

  function handleSetViewMode(mode: 'TABLE' | 'TIMELINE' | 'MONTH') {
    viewMode = mode;
    localStorage.setItem('admin_dashboard_view_mode', mode);
  }

  async function fetchBookings() {
    try {
      isLoading = true;
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.bookings || []);
        bookings = Array.isArray(list) ? list : [];
      }
    } catch {
      actionError = 'ไม่สามารถโหลดข้อมูลคำขอจองห้องประชุมได้';
    } finally {
      isLoading = false;
    }
  }

  let filteredBookings = $derived.by(() => {
    let result = Array.isArray(bookings) ? [...bookings] : [];

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

    return result;
  });

  let pendingBookingsInFiltered = $derived(
    filteredBookings.filter((b) => b.status === 'PENDING')
  );

  function handleToggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedIds = next;
  }

  function handleSelectAllPending() {
    if (selectedIds.size === pendingBookingsInFiltered.length && pendingBookingsInFiltered.length > 0) {
      selectedIds = new Set();
    } else {
      selectedIds = new Set(pendingBookingsInFiltered.map((b) => b.id));
    }
  }

  async function handleBatchApprove() {
    if (selectedIds.size === 0) return;
    isBatchProcessing = true;
    actionError = null;
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
        actionError = data.error || 'การอนุมัติแบบกลุ่มเกิดข้อผิดพลาด';
      } else {
        if (data.conflictCount > 0) {
          conflictResults = {
            approvedCount: data.approvedCount,
            conflictCount: data.conflictCount,
            conflicts: data.conflicts || [],
          };
        } else {
          actionSuccess = `อนุมัติคำขอสำเร็จทั้งหมด ${data.approvedCount} รายการ`;
          setTimeout(() => (actionSuccess = null), 4000);
        }
        selectedIds = new Set();
        fetchBookings();
      }
    } catch {
      actionError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
    } finally {
      isBatchProcessing = false;
      isBatchApproveModalOpen = false;
    }
  }

  async function handleBatchReject() {
    if (selectedIds.size === 0) return;
    isBatchProcessing = true;
    actionError = null;
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
        actionError = data.error || 'การปฏิเสธแบบกลุ่มเกิดข้อผิดพลาด';
      } else {
        actionSuccess = `ปฏิเสธคำขอเรียบร้อยแล้ว ${data.rejectedCount} รายการ`;
        setTimeout(() => (actionSuccess = null), 4000);
        selectedIds = new Set();
        fetchBookings();
      }
    } catch {
      actionError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
    } finally {
      isBatchProcessing = false;
      isBatchRejectModalOpen = false;
      batchRejectionReason = '';
    }
  }

  function handleApproveClick(booking: AdminBooking) {
    const conflicts = getConflictingPendingBookings(booking, bookings);
    conflictsForApproving = conflicts;
    autoRejectConflicts = true;
    approvingBooking = booking;
  }

  async function updateBookingStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
    rejectionReason?: string,
    autoRejectConflictsFlag?: boolean
  ) {
    actionError = null;
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
        actionError = data.error || 'เกิดข้อผิดพลาดในการปรับปรุงสถานะ';
      } else {
        const msg =
          status === 'APPROVED'
            ? 'อนุมัติการจองสำเร็จและส่งอีเมลแจ้งผู้จองเรียบร้อยแล้ว'
            : status === 'REJECTED'
            ? 'ปฏิเสธการจองและแจ้งผู้จองเรียบร้อยแล้ว'
            : 'คืนสถานะเป็นรอการตรวจสอบแล้ว';
        actionSuccess = msg;
        setTimeout(() => (actionSuccess = null), 4000);
        fetchBookings();
      }
    } catch {
      actionError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
    } finally {
      rejectingBooking = null;
      approvingBooking = null;
      detailsBooking = null;
    }
  }

  async function handleCheckIn(booking: AdminBooking) {
    isCheckingIn = true;
    actionError = null;
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECK_IN', checkIn: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        actionError = data.error || 'เช็กอินไม่สำเร็จ';
      } else {
        actionSuccess = `เช็กอินห้องประชุมสำเร็จ: ${booking.fullName} (${booking.bookingCode})`;
        setTimeout(() => (actionSuccess = null), 4000);
        checkInModalBooking = null;
        fetchBookings();
      }
    } catch {
      actionError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
    } finally {
      isCheckingIn = false;
    }
  }

  async function handleRetrySync(id: string) {
    isRetryingSyncId = id;
    actionError = null;
    try {
      const res = await fetch('/api/admin/retry-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        actionError = data.error || 'ซิงก์ข้อมูลซ้ำไม่สำเร็จ';
      } else {
        actionSuccess = 'ดำเนินการซิงก์ข้อมูลและส่งอีเมลซ้ำสำเร็จแล้ว';
        setTimeout(() => (actionSuccess = null), 4000);
      }
    } catch {
      actionError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย';
    } finally {
      isRetryingSyncId = null;
    }
  }

  let stats = $derived.by(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const total = list.length;
    const pending = list.filter((b) => b.status === 'PENDING').length;
    const approved = list.filter((b) => b.status === 'APPROVED').length;
    const rejected = list.filter((b) => b.status === 'REJECTED').length;
    const today = list.filter((b) => b.date === todayStr).length;

    const n = new Date();
    const in48h = new Date(n.getTime() + 48 * 60 * 60 * 1000);
    const urgent = list.filter((b) => {
      if (b.status !== 'PENDING') return false;
      const bDate = new Date(`${b.date}T${b.startTime}:00`);
      return bDate >= n && bDate <= in48h;
    }).length;

    const wDates = getWeekDates(n).map(toDateString);
    const weekly = list.filter((b) => wDates.includes(b.date)).length;

    return { total, pending, approved, rejected, today, urgent, weekly };
  });

  let cellPadding = $derived(
    preferences?.tableDensity === 'compact' ? 'py-2 px-3 text-xs' : 'p-3.5'
  );

  let totalVisibleColSpan = $derived(
    3 +
    (preferences?.visibleColumns?.studentId ? 1 : 0) +
    (preferences?.visibleColumns?.department ? 1 : 0) +
    (preferences?.visibleColumns?.reason ? 1 : 0) +
    1 +
    (preferences?.visibleColumns?.approvedBy ? 1 : 0) +
    1
  );
</script>

<div class="space-y-6">
  <!-- Top Header -->
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-warm">
    <div>
      <h2 class="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
        ระบบจัดการคำขอจองห้องประชุม
      </h2>
      <p class="text-xs text-slate-500 mt-1">
        ตรวจสอบ อนุมัติ หรือปฏิเสธคำขอ พร้อมดูตารางเวลาและสถิติการใช้งาน
      </p>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
      <button
        type="button"
        onclick={() => (isCustomizerOpen = true)}
        class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active-press shadow-2xs"
        title="ปรับแต่งแดชบอร์ดส่วนบุคคล"
      >
        <SlidersHorizontal class="w-3.5 h-3.5 text-orange-600" />
        <span>ปรับแต่งแดชบอร์ด</span>
      </button>

      <button
        type="button"
        onclick={fetchBookings}
        class="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
        title="รีเฟรชข้อมูล"
      >
        <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin' : ''}" />
      </button>

      <a
        href="/admin/reports"
        class="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer"
      >
        <FileSpreadsheet class="w-4 h-4" /> ส่งออกรายงาน
      </a>
    </div>
  </div>

  <!-- Metric Cards Row -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    {#if preferences?.visibleWidgets?.includes('PENDING')}
      <div class="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-warm-xs">
        <div class="flex justify-between items-center text-amber-800 text-xs font-semibold">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200"></span> รอการตรวจสอบ
          </span>
          <Clock class="w-4 h-4 text-amber-500" />
        </div>
        <div class="text-2xl md:text-3xl font-extrabold text-amber-900 mt-2 tabular-nums font-mono">
          {stats.pending}
        </div>
      </div>
    {/if}

    {#if preferences?.visibleWidgets?.includes('TODAY')}
      <div class="bg-white p-5 rounded-3xl border border-blue-200/80 bg-blue-50/20 shadow-warm-xs">
        <div class="flex justify-between items-center text-blue-800 text-xs font-semibold">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-200"></span> วันนี้
          </span>
          <Calendar class="w-4 h-4 text-blue-500" />
        </div>
        <div class="text-2xl md:text-3xl font-extrabold text-blue-900 mt-2 tabular-nums font-mono">
          {stats.today}
        </div>
      </div>
    {/if}

    {#if preferences?.visibleWidgets?.includes('URGENT')}
      <div class="bg-white p-5 rounded-3xl border border-rose-200/80 bg-rose-50/20 shadow-warm-xs">
        <div class="flex justify-between items-center text-rose-800 text-xs font-semibold">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 animate-pulse"></span> เร่งด่วน 48 ชม.
          </span>
          <AlertTriangle class="w-4 h-4 text-rose-500" />
        </div>
        <div class="text-2xl md:text-3xl font-extrabold text-rose-900 mt-2 tabular-nums font-mono">
          {stats.urgent}
        </div>
      </div>
    {/if}

    {#if preferences?.visibleWidgets?.includes('WEEKLY')}
      <div class="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-warm-xs">
        <div class="flex justify-between items-center text-emerald-800 text-xs font-semibold">
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> รวมในสัปดาห์นี้
          </span>
          <CalendarDays class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-2xl md:text-3xl font-extrabold text-emerald-900 mt-2 tabular-nums font-mono">
          {stats.weekly}
        </div>
      </div>
    {/if}
  </div>

  <!-- Action Messages -->
  {#if actionError}
    <div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex justify-between items-center shadow-2xs">
      <span>{actionError}</span>
      <button onclick={() => (actionError = null)} class="text-rose-500 hover:text-rose-700 cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if actionSuccess}
    <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex justify-between items-center shadow-2xs">
      <span>{actionSuccess}</span>
      <button onclick={() => (actionSuccess = null)} class="text-emerald-500 hover:text-emerald-700 cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- View Switcher Header & Filters -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
      <button
        type="button"
        onclick={() => handleSetViewMode('TABLE')}
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {viewMode === 'TABLE'
          ? 'bg-white text-orange-600 shadow-2xs'
          : 'text-slate-600 hover:text-slate-900'}"
      >
        <span>📋 ตารางรายการ</span>
      </button>
      <button
        type="button"
        onclick={() => handleSetViewMode('TIMELINE')}
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {viewMode === 'TIMELINE'
          ? 'bg-white text-orange-600 shadow-2xs'
          : 'text-slate-600 hover:text-slate-900'}"
      >
        <span>🕒 ไทม์ไลน์</span>
      </button>
      <button
        type="button"
        onclick={() => handleSetViewMode('MONTH')}
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer {viewMode === 'MONTH'
          ? 'bg-white text-orange-600 shadow-2xs'
          : 'text-slate-600 hover:text-slate-900'}"
      >
        <span>📅 ปฏิทินเดือน</span>
      </button>
    </div>

    <!-- Search & Sort Controls -->
    <div class="flex items-center gap-2.5">
      <div class="relative">
        <Search class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ, รหัส, สังกัด..."
          bind:value={searchQuery}
          class="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-48 md:w-60 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <button
        type="button"
        onclick={toggleSortOrder}
        class="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        title="เรียงตามวันที่จอง"
      >
        {#if sortOrder === 'desc'}
          <ArrowDownWideNarrow class="w-3.5 h-3.5 text-orange-600" />
          <span>ใหม่ไปเก่า</span>
        {:else}
          <ArrowUpNarrowWide class="w-3.5 h-3.5 text-orange-600" />
          <span>เก่าไปใหม่</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Switchable View Content -->
  {#if viewMode === 'TIMELINE'}
    <AdminScheduleTimeline
      {bookings}
      selectedDate={timelineDate}
      onDateChange={(d) => (timelineDate = d)}
      onSelectBooking={(b) => (detailsBooking = b)}
      onApproveBooking={handleApproveClick}
      onRejectBooking={(b) => {
        rejectingBooking = b;
        rejectionReasonInput = '';
      }}
    />
  {:else if viewMode === 'MONTH'}
    <AdminMonthCalendar
      {bookings}
      currentMonth={calendarMonth}
      onMonthChange={(m) => (calendarMonth = m)}
      onSelectDate={(dateStr) => {
        timelineDate = new Date(dateStr + 'T00:00:00');
        handleSetViewMode('TIMELINE');
      }}
      onSelectBooking={(b) => (detailsBooking = b)}
    />
  {:else}
    <!-- TABLE VIEW -->
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-warm overflow-hidden">
      <!-- Status Filter Tabs -->
      <div class="flex border-b border-slate-100 p-2 overflow-x-auto gap-1">
        {#each [
          { id: 'ALL', label: 'ทั้งหมด' },
          { id: 'PENDING', label: 'รออนุมัติ' },
          { id: 'APPROVED', label: 'อนุมัติแล้ว' },
          { id: 'TODAY', label: 'วันนี้' },
          { id: 'REJECTED', label: 'ปฏิเสธแล้ว' },
        ] as tab}
          <button
            onclick={() => (statusFilter = tab.id)}
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer {statusFilter === tab.id
              ? 'bg-orange-50 text-orange-700 border border-orange-200/80 shadow-2xs'
              : 'text-slate-600 hover:bg-slate-50'}"
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-700">
          <thead class="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <tr>
              <th class="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={pendingBookingsInFiltered.length > 0 && selectedIds.size === pendingBookingsInFiltered.length}
                  onchange={handleSelectAllPending}
                  class="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  title="เลือกคำขอรออนุมัติทั้งหมด"
                />
              </th>
              <th class="py-3 px-3">วันและเวลาที่จอง</th>
              <th class="py-3 px-3">ผู้ขอใช้บริการ</th>
              {#if preferences?.visibleColumns?.studentId}
                <th class="py-3 px-3">รหัสนักศึกษา</th>
              {/if}
              {#if preferences?.visibleColumns?.department}
                <th class="py-3 px-3">หน่วยงาน / สังกัด</th>
              {/if}
              {#if preferences?.visibleColumns?.reason}
                <th class="py-3 px-3">เหตุผลและวาระ</th>
              {/if}
              <th class="py-3 px-3">สถานะ</th>
              {#if preferences?.visibleColumns?.approvedBy}
                <th class="py-3 px-3">ผู้อนุมัติ</th>
              {/if}
              <th class="py-3 px-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#if isLoading}
              <tr>
                <td colspan={totalVisibleColSpan} class="p-12 text-center text-slate-400">
                  กำลังดึงข้อมูลคำขอจองล่าสุด...
                </td>
              </tr>
            {:else if filteredBookings.length === 0}
              <tr>
                <td colspan={totalVisibleColSpan} class="p-12 text-center text-slate-400">
                  <AlertCircle class="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <div>ไม่พบรายการจองตามเงื่อนไขที่เลือก</div>
                </td>
              </tr>
            {:else}
              {#each filteredBookings as b}
                {@const conflicts = getConflictingPendingBookings(b, bookings)}
                {@const isToday = b.date === todayStr}
                <tr class="hover:bg-slate-50/70 transition-colors {selectedIds.has(b.id) ? 'bg-orange-50/40' : ''}">
                  <td class="{cellPadding} w-10 text-center">
                    {#if b.status === 'PENDING'}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(b.id)}
                        onchange={() => handleToggleSelect(b.id)}
                        class="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                    {:else}
                      <span class="text-slate-300">-</span>
                    {/if}
                  </td>
                  <td class={cellPadding}>
                    <div class="font-bold text-slate-900 tabular-nums font-mono">
                      {formatDisplayDate(b.date)}
                    </div>
                    <div class="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5 tabular-nums font-mono">
                      <Clock class="w-3 h-3 text-slate-400" /> {b.startTime} - {b.endTime} น.
                    </div>
                    <div class="font-mono text-[10px] text-orange-600 mt-1 bg-orange-50 px-1.5 py-0.5 rounded inline-block border border-orange-200/60">
                      {b.bookingCode}
                    </div>
                    {#if conflicts.length > 0}
                      <div class="mt-1">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle class="w-3 h-3 text-amber-600" />
                          ชน {conflicts.length} รายการ
                        </span>
                      </div>
                    {/if}
                  </td>

                  <td class={cellPadding}>
                    <div class="font-semibold text-slate-900 text-xs">{b.fullName}</div>
                    <div class="text-slate-400 text-[10px] mt-0.5">โทร: {b.phone}</div>
                  </td>

                  {#if preferences?.visibleColumns?.studentId}
                    <td class={cellPadding}>
                      <span class="font-mono text-slate-700 text-xs">{b.studentId || '-'}</span>
                    </td>
                  {/if}

                  {#if preferences?.visibleColumns?.department}
                    <td class={cellPadding}>
                      <span class="font-medium text-slate-800 text-xs">{b.department || '-'}</span>
                    </td>
                  {/if}

                  {#if preferences?.visibleColumns?.reason}
                    <td class="{cellPadding} max-w-xs">
                      <div class="text-slate-600 text-[11px] line-clamp-2" title={b.reason}>
                        {b.reason}
                      </div>
                      {#if b.borrowedEquipment && b.borrowedEquipment.length > 0}
                        <div class="flex flex-wrap gap-1 mt-1">
                          {#each b.borrowedEquipment as eq}
                            <span class="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] border border-slate-200">
                              {eq}
                            </span>
                          {/each}
                        </div>
                      {/if}
                      {#if b.rejectionReason}
                        <div class="text-rose-700 text-[10px] mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          เหตุผลที่ปฏิเสธ: {b.rejectionReason}
                        </div>
                      {/if}
                    </td>
                  {/if}

                  <td class={cellPadding}>
                    <div>
                      <Badge
                        status={b.status === 'APPROVED' ? 'APPROVED' : b.status === 'PENDING' ? 'PENDING' : 'REJECTED'}
                        class="text-[10px] font-bold shadow-2xs"
                      >
                        {b.status === 'APPROVED' ? 'อนุมัติแล้ว' : b.status === 'PENDING' ? 'รออนุมัติ' : 'ถูกปฏิเสธ'}
                      </Badge>
                    </div>
                    {#if b.status === 'APPROVED'}
                      <div class="mt-1">
                        {#if b.checkedInAt}
                          <span class="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle class="w-3 h-3 text-emerald-600" /> เช็กอินแล้ว
                          </span>
                        {:else}
                          <span class="inline-block text-[10px] text-slate-400">ยังไม่เช็กอิน</span>
                        {/if}
                      </div>
                    {/if}
                  </td>

                  {#if preferences?.visibleColumns?.approvedBy}
                    <td class={cellPadding}>
                      {#if b.approvedBy}
                        <div>
                          <div class="font-medium text-slate-800 text-xs">{b.approvedBy.fullName}</div>
                          {#if b.approvedAt}
                            <div class="text-slate-400 text-[10px] tabular-nums font-mono mt-0.5">
                              {new Date(b.approvedAt).toLocaleDateString('th-TH')}
                            </div>
                          {/if}
                        </div>
                      {:else}
                        <span class="text-slate-400">-</span>
                      {/if}
                    </td>
                  {/if}

                  <td class="{cellPadding} text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                      {#if b.status === 'PENDING'}
                        <button
                          type="button"
                          onclick={() => handleApproveClick(b)}
                          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="อนุมัติคำขอ"
                        >
                          <Check class="w-3.5 h-3.5" /> อนุมัติ
                        </button>
                        <button
                          type="button"
                          onclick={() => {
                            rejectingBooking = b;
                            rejectionReasonInput = '';
                          }}
                          class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="ปฏิเสธคำขอ"
                        >
                          <X class="w-3.5 h-3.5" /> ปฏิเสธ
                        </button>
                      {/if}

                      {#if b.status === 'APPROVED' && isToday && !b.checkedInAt}
                        <button
                          type="button"
                          onclick={() => (checkInModalBooking = b)}
                          class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="เช็กอินผู้ใช้บริการ"
                        >
                          <QrCode class="w-3.5 h-3.5" /> เช็กอิน
                        </button>
                      {/if}

                      {#if b.status !== 'PENDING'}
                        <button
                          type="button"
                          onclick={() => updateBookingStatus(b.id, 'PENDING')}
                          class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition active-press flex items-center gap-1 cursor-pointer"
                          title="คืนสถานะเป็นรออนุมัติ"
                        >
                          <RotateCcw class="w-3 h-3" /> คืนสถานะ
                        </button>
                      {/if}

                      <button
                        type="button"
                        onclick={() => handleRetrySync(b.id)}
                        disabled={isRetryingSyncId === b.id}
                        class="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                        title="ซิงก์ข้อมูล/ส่งอีเมลซ้ำ (Retry Sync)"
                      >
                        <RotateCw class="w-3.5 h-3.5 {isRetryingSyncId === b.id ? 'animate-spin text-blue-600' : ''}" />
                      </button>

                      <button
                        type="button"
                        onclick={() => (detailsBooking = b)}
                        class="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="ดูรายละเอียดการจอง"
                      >
                        <Eye class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Floating Batch Actions Bar -->
  {#if selectedIds.size > 0}
    <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-4 transition-all duration-300">
      <div class="text-xs font-bold flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-[11px] font-mono">
          {selectedIds.size}
        </span>
        <span>รายการที่เลือก</span>
      </div>

      <div class="h-4 w-px bg-slate-700"></div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={() => (isBatchApproveModalOpen = true)}
          class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active-press flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Check class="w-3.5 h-3.5" /> อนุมัติที่เลือก
        </button>
        <button
          type="button"
          onclick={() => {
            batchRejectionReason = '';
            isBatchRejectModalOpen = true;
          }}
          class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active-press flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <X class="w-3.5 h-3.5" /> ปฏิเสธที่เลือก
        </button>
        <button
          type="button"
          onclick={() => (selectedIds = new Set())}
          class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  {/if}

  <!-- Single Approve Modal with Conflict Detection -->
  {#if approvingBooking}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="text-lg font-bold text-slate-900">ยืนยันการอนุมัติคำขอ</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              รายการของ <span class="font-semibold text-slate-800">{approvingBooking.fullName}</span> วันที่ {formatDisplayDate(approvingBooking.date)} ({approvingBooking.startTime} - {approvingBooking.endTime} น.)
            </p>
          </div>
          <button
            type="button"
            onclick={() => (approvingBooking = null)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 -mr-1 space-y-4 pt-3">
          {#if conflictsForApproving.length > 0}
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div class="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
                <span>พบคำขอรออนุมัติอื่นที่เวลาซ้อนทับกัน ({conflictsForApproving.length} รายการ):</span>
              </div>
              <div class="divide-y divide-amber-200/60 max-h-36 overflow-y-auto">
                {#each conflictsForApproving as c}
                  <div class="py-1.5 flex justify-between items-center text-amber-950">
                    <div>
                      <span class="font-mono font-bold">{c.bookingCode}</span> • {c.fullName} ({c.department})
                    </div>
                    <div class="font-mono text-[11px] text-amber-800">
                      {c.startTime} - {c.endTime} น.
                    </div>
                  </div>
                {/each}
              </div>
              <label class="flex items-start gap-2 pt-2 border-t border-amber-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={autoRejectConflicts}
                  class="mt-0.5 rounded border-amber-300 text-orange-600 focus:ring-orange-500"
                />
                <span class="font-semibold text-amber-900 text-xs">
                  ปฏิเสธคำขอที่รออนุมัติอื่นซึ่งเวลาชนกันโดยอัตโนมัติ (แนะนำ)
                </span>
              </label>
            </div>
          {/if}

          <p class="text-xs text-slate-600">
            เมื่ออนุมัติ ระบบจะส่งอีเมลแจ้งผู้จอง พร้อมแนบไฟล์ปฏิทิน (.ics) และบันทึกลง Google Sheets
          </p>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => (approvingBooking = null)}
            class="text-xs"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="success"
            onclick={() => {
              if (approvingBooking) {
                const b = approvingBooking;
                approvingBooking = null;
                updateBookingStatus(b.id, 'APPROVED', undefined, autoRejectConflicts);
              }
            }}
            class="text-xs"
          >
            <Check class="w-4 h-4" /> ยืนยันการอนุมัติ
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Quick Rejection Reason Modal -->
  {#if rejectingBooking}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start mb-4 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="text-lg font-bold text-slate-900">
              ระบุเหตุผลในการปฏิเสธคำขอ
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              รายการของ <span class="font-semibold text-slate-800">{rejectingBooking.fullName}</span> วันที่ {formatDisplayDate(rejectingBooking.date)}
            </p>
          </div>
          <button
            type="button"
            onclick={() => (rejectingBooking = null)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 overflow-y-auto flex-1 pr-1 -mr-1">
          <span class="block text-xs font-semibold text-slate-700">
            เลือกเหตุผลสำเร็จรูป หรือพิมพ์ระบุเอง:
          </span>
          <div class="flex flex-col gap-1.5">
            {#each PRESET_REJECTION_REASONS as reason}
              <button
                type="button"
                onclick={() => (rejectionReasonInput = reason)}
                class="text-left text-xs bg-slate-50 hover:bg-orange-50 hover:text-orange-700 border border-slate-200 hover:border-orange-300 p-2.5 rounded-xl transition cursor-pointer active-press"
              >
                • {reason}
              </button>
            {/each}
          </div>

          <textarea
            rows={3}
            bind:value={rejectionReasonInput}
            placeholder="ระบุเหตุผลเพิ่มเติมที่จะแสดงให้ผู้ยื่นคำขอเห็น..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => (rejectingBooking = null)}
            class="text-xs"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            onclick={() => {
              if (rejectingBooking) {
                updateBookingStatus(rejectingBooking.id, 'REJECTED', rejectionReasonInput);
              }
            }}
            class="text-xs"
          >
            ยืนยันการปฏิเสธ
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- QR Check-In Modal -->
  {#if checkInModalBooking}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-orange-100 text-orange-600">
              <QrCode class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">เช็กอินเข้าใช้งานห้องประชุม</h3>
              <p class="text-xs text-slate-500 font-mono">รหัสการจอง: {checkInModalBooking.bookingCode}</p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (checkInModalBooking = null)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 -mr-1 pt-3">
          <div class="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs border border-slate-200">
            <div class="flex justify-between">
              <span class="text-slate-500">ผู้ขอใช้บริการ:</span>
              <span class="font-semibold text-slate-900">{checkInModalBooking.fullName}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">รหัสนักศึกษา:</span>
              <span class="font-mono text-slate-900">{checkInModalBooking.studentId}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">หน่วยงาน / ชมรม:</span>
              <span class="text-slate-900">{checkInModalBooking.department}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">วันที่จอง:</span>
              <span class="font-bold text-slate-900">{formatDisplayDate(checkInModalBooking.date)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">เวลา:</span>
              <span class="font-mono font-bold text-orange-600">
                {checkInModalBooking.startTime} - {checkInModalBooking.endTime} น.
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">วัตถุประสงค์:</span>
              <span class="text-slate-800 line-clamp-2 max-w-xs text-right">
                {checkInModalBooking.reason}
              </span>
            </div>
            {#if checkInModalBooking.checkedInAt}
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 text-xs flex items-center gap-2 mt-2">
                <CheckCircle class="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  เช็กอินแล้วเมื่อ {new Date(checkInModalBooking.checkedInAt).toLocaleString('th-TH')} โดย{' '}
                  {checkInModalBooking.checkedInByName || 'เจ้าหน้าที่'}
                </span>
              </div>
            {/if}
          </div>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => (checkInModalBooking = null)}
            class="text-xs"
          >
            ปิด
          </Button>
          {#if checkInModalBooking.status === 'APPROVED' && !checkInModalBooking.checkedInAt}
            <Button
              type="button"
              variant="primary"
              disabled={isCheckingIn}
              onclick={() => {
                if (checkInModalBooking) handleCheckIn(checkInModalBooking);
              }}
              class="text-xs"
            >
              <Check class="w-4 h-4" />
              {isCheckingIn ? 'กำลังเช็กอิน...' : 'ยืนยันการเช็กอินเข้าใช้งานห้องประชุม'}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Batch Approve Modal -->
  {#if isBatchApproveModalOpen}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-emerald-100 text-emerald-600">
              <Check class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">อนุมัติคำขอที่เลือกพร้อมกัน</h3>
              <p class="text-xs text-slate-500">
                เลือกไว้ทั้งหมด <span class="font-semibold text-slate-900">{selectedIds.size}</span> รายการ
              </p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (isBatchApproveModalOpen = false)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="overflow-y-auto flex-1 pr-1 -mr-1 pt-3">
          <p class="text-xs text-slate-600 leading-relaxed">
            ระบบจะตรวจสอบช่วงเวลาว่ามีคำขอใดซ้อนทับกันหรือไม่ หากไม่มีความขัดแย้ง ระบบจะอนุมัติพร้อมกัน ส่งอีเมลแจ้งเตือนผู้จองทุกคน และบันทึกประวัติการทำงานอัตโนมัติ
          </p>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => (isBatchApproveModalOpen = false)}
            class="text-xs"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={isBatchProcessing}
            onclick={handleBatchApprove}
            class="text-xs"
          >
            <Check class="w-4 h-4" />
            {isBatchProcessing ? 'กำลังประมวลผล...' : 'ยืนยันอนุมัติที่เลือก'}
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Batch Reject Modal -->
  {#if isBatchRejectModalOpen}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-rose-100 text-rose-600">
              <X class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">ปฏิเสธคำขอที่เลือกพร้อมกัน</h3>
              <p class="text-xs text-slate-500">
                เลือกไว้ทั้งหมด <span class="font-semibold text-slate-900">{selectedIds.size}</span> รายการ
              </p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (isBatchRejectModalOpen = false)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 overflow-y-auto flex-1 pr-1 -mr-1 pt-3">
          <span class="block text-xs font-semibold text-slate-700">
            เลือกเหตุผลสำเร็จรูป หรือพิมพ์ระบุเหตุผลส่วนกลาง:
          </span>
          <div class="flex flex-col gap-1.5">
            {#each PRESET_REJECTION_REASONS as reason}
              <button
                type="button"
                onclick={() => (batchRejectionReason = reason)}
                class="text-left text-xs bg-slate-50 hover:bg-orange-50 hover:text-orange-700 border border-slate-200 hover:border-orange-300 p-2.5 rounded-xl transition cursor-pointer active-press"
              >
                • {reason}
              </button>
            {/each}
          </div>

          <textarea
            rows={3}
            bind:value={batchRejectionReason}
            placeholder="ระบุเหตุผลในการปฏิเสธคำขอชุดนี้ (จะส่งในอีเมลแจ้งเตือนทุกคน)..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => (isBatchRejectModalOpen = false)}
            class="text-xs"
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isBatchProcessing}
            onclick={handleBatchReject}
            class="text-xs"
          >
            <X class="w-4 h-4" />
            {isBatchProcessing ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธที่เลือก'}
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Conflict Results Modal -->
  {#if conflictResults}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">สรุปผลการอนุมัติแบบกลุ่ม</h3>
              <p class="text-xs text-slate-500">พบคำขอที่เวลาซ้อนทับกัน</p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (conflictResults = null)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs overflow-y-auto flex-1 pr-1 -mr-1 pt-3">
          <div class="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-semibold">
            ✓ อนุมัติสำเร็จ: {conflictResults.approvedCount} รายการ
          </div>

          <div class="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl space-y-2">
            <div class="font-bold flex items-center gap-1.5">
              <AlertTriangle class="w-4 h-4 text-amber-600" />
              <span>ข้าม/ไม่สามารถอนุมัติได้เนื่องจากเวลาชนกัน ({conflictResults.conflictCount} รายการ):</span>
            </div>
            <div class="divide-y divide-amber-200/60 max-h-40 overflow-y-auto">
              {#each conflictResults.conflicts as c}
                <div class="py-1.5 text-amber-950">
                  <span class="font-mono font-bold">{c.bookingCode}</span>: {c.reason}
                </div>
              {/each}
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-3 border-t border-slate-100 shrink-0 mt-2">
          <button
            type="button"
            onclick={() => (conflictResults = null)}
            class="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            รับทราบ
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Booking Details Modal -->
  {#if detailsBooking}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="flex justify-between items-start pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 class="text-lg font-bold text-slate-900">รายละเอียดคำขอจองห้อง</h3>
            <p class="text-xs font-mono text-orange-600 mt-0.5">{detailsBooking.bookingCode}</p>
          </div>
          <button
            type="button"
            onclick={() => (detailsBooking = null)}
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-2.5 text-xs overflow-y-auto flex-1 pr-1 -mr-1 pt-3">
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-500">ผู้ขอจอง:</span>
            <span class="font-semibold text-slate-800">{detailsBooking.fullName}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-500">รหัสนักศึกษา:</span>
            <span class="font-mono text-slate-800">{detailsBooking.studentId || '-'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-500">หน่วยงาน / สังกัด:</span>
            <span class="text-slate-800">{detailsBooking.department || '-'}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-500">เบอร์ติดต่อ / อีเมล:</span>
            <span class="text-slate-800">{detailsBooking.phone} • {detailsBooking.email}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-100">
            <span class="text-slate-500">วันและเวลา:</span>
            <span class="font-bold text-slate-900">
              {formatDisplayDate(detailsBooking.date)} ({detailsBooking.startTime} - {detailsBooking.endTime} น.)
            </span>
          </div>
          <div class="py-1 border-b border-slate-100">
            <span class="text-slate-500 block mb-1">เหตุผลและวาระ:</span>
            <p class="text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              {detailsBooking.reason}
            </p>
          </div>
          {#if detailsBooking.borrowedEquipment && detailsBooking.borrowedEquipment.length > 0}
            <div class="py-1 border-b border-slate-100">
              <span class="text-slate-500 block mb-1">อุปกรณ์ที่ขอใช้:</span>
              <div class="flex flex-wrap gap-1">
                {#each detailsBooking.borrowedEquipment as eq}
                  <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-xs border border-slate-200">
                    {eq}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
          {#if detailsBooking.rejectionReason}
            <div class="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl">
              <span class="font-bold block mb-0.5">เหตุผลที่ปฏิเสธ:</span>
              {detailsBooking.rejectionReason}
            </div>
          {/if}
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <button
            type="button"
            onclick={() => (detailsBooking = null)}
            class="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
          >
            ปิด
          </button>
          {#if detailsBooking.status === 'PENDING'}
            <button
              type="button"
              onclick={() => {
                if (detailsBooking) {
                  const b = detailsBooking;
                  detailsBooking = null;
                  rejectingBooking = b;
                  rejectionReasonInput = '';
                }
              }}
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition active-press cursor-pointer"
            >
              ปฏิเสธคำขอ
            </button>
            <button
              type="button"
              onclick={() => {
                if (detailsBooking) {
                  const b = detailsBooking;
                  detailsBooking = null;
                  handleApproveClick(b);
                }
              }}
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition active-press cursor-pointer"
            >
              อนุมัติคำขอ
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Dashboard Customizer Modal -->
  <DashboardCustomizerModal
    isOpen={isCustomizerOpen}
    onClose={() => (isCustomizerOpen = false)}
    {preferences}
    onSave={handleSavePreferences}
  />

  <!-- Floating Action Button for Mobile QR Check-In -->
  <div class="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 lg:hidden">
    <button
      type="button"
      onclick={() => (isScannerOpen = true)}
      class="p-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-xl shadow-orange-600/35 border-2 border-white/80 active:scale-95 transition-all flex items-center gap-2 cursor-pointer group"
      title="สแกน QR Code เช็กอิน"
      aria-label="สแกน QR Code เช็กอิน"
    >
      <Camera class="w-5 h-5 group-hover:rotate-6 transition-transform stroke-[2.2]" />
      <span class="text-xs font-bold pr-1">สแกนเช็กอิน</span>
    </button>
  </div>

  <!-- QR Camera Scanner Modal -->
  <QrScannerModal
    isOpen={isScannerOpen}
    onClose={() => (isScannerOpen = false)}
    onScanSuccess={handleScanBookingCode}
  />
</div>
