<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
  } from 'lucide-svelte';
  import type { AdminBooking } from '$lib/components/admin/AdminScheduleTimeline.svelte';

  interface Props {
    bookings: AdminBooking[];
    currentMonth: Date;
    onMonthChange: (month: Date) => void;
    onSelectDate: (dateStr: string) => void;
    onSelectBooking: (booking: AdminBooking) => void;
  }

  let {
    bookings = [],
    currentMonth,
    onMonthChange,
    onSelectDate,
    onSelectBooking,
  }: Props = $props();

  const THAI_MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const WEEKDAY_NAMES = [
    { short: 'อา.', full: 'อาทิตย์', isWeekend: true },
    { short: 'จ.', full: 'จันทร์', isWeekend: false },
    { short: 'อ.', full: 'อังคาร', isWeekend: false },
    { short: 'พ.', full: 'พุธ', isWeekend: false },
    { short: 'พฤ.', full: 'พฤหัสบดี', isWeekend: false },
    { short: 'ศ.', full: 'ศุกร์', isWeekend: false },
    { short: 'ส.', full: 'เสาร์', isWeekend: true },
  ];

  function toDateString(year: number, month: number, day: number): string {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  const now = new Date();
  const todayStr = toDateString(now.getFullYear(), now.getMonth(), now.getDate());

  let year = $derived(currentMonth.getFullYear());
  let month = $derived(currentMonth.getMonth());

  function handlePrevMonth() {
    onMonthChange(new Date(year, month - 1, 1));
  }

  function handleNextMonth() {
    onMonthChange(new Date(year, month + 1, 1));
  }

  function handleThisMonth() {
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  let bookingsByDate = $derived.by(() => {
    const map = new Map<string, AdminBooking[]>();
    const list = Array.isArray(bookings) ? bookings : [];
    for (const b of list) {
      if (b.status === 'CANCELLED') continue;
      const arr = map.get(b.date) || [];
      arr.push(b);
      map.set(b.date, arr);
    }
    return map;
  });

  let monthStats = $derived.by(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let total = 0;
    let approved = 0;
    let pending = 0;

    for (const b of bookings) {
      if (b.date.startsWith(monthPrefix) && b.status !== 'CANCELLED') {
        total++;
        if (b.status === 'APPROVED') approved++;
        if (b.status === 'PENDING') pending++;
      }
    }

    return { total, approved, pending };
  });

  let calendarCells = $derived.by(() => {
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
    }> = [];

    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonthDate = new Date(year, month - 1, day);
      cells.push({
        dateStr: toDateString(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), day),
        dayNum: day,
        isCurrentMonth: false,
        isWeekend: prevMonthDate.getDay() === 0 || prevMonthDate.getDay() === 6,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push({
        dateStr: toDateString(year, month, day),
        dayNum: day,
        isCurrentMonth: true,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    const remainder = cells.length % 7;
    if (remainder > 0) {
      const daysToAdd = 7 - remainder;
      for (let day = 1; day <= daysToAdd; day++) {
        const nextMonthDate = new Date(year, month + 1, day);
        cells.push({
          dateStr: toDateString(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), day),
          dayNum: day,
          isCurrentMonth: false,
          isWeekend: nextMonthDate.getDay() === 0 || nextMonthDate.getDay() === 6,
        });
      }
    }

    return cells;
  });
</script>

<div class="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
  <!-- Calendar Header -->
  <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-gradient-to-b from-slate-50/60 to-white">
    <!-- Month Navigation -->
    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          type="button"
          onclick={handlePrevMonth}
          class="p-1.5 rounded-xl hover:bg-white hover:text-slate-900 text-slate-600 transition cursor-pointer"
          title="เดือนก่อนหน้า"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          type="button"
          onclick={handleThisMonth}
          class="px-3 py-1 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-orange-600 shadow-2xs transition cursor-pointer"
        >
          เดือนนี้
        </button>
        <button
          type="button"
          onclick={handleNextMonth}
          class="p-1.5 rounded-xl hover:bg-white hover:text-slate-900 text-slate-600 transition cursor-pointer"
          title="เดือนถัดไป"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <CalendarIcon class="w-4 h-4 text-orange-600 shrink-0" />
        <h3 class="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight">
          {THAI_MONTH_NAMES[month]} {year + 543}
        </h3>
      </div>
    </div>

    <!-- Month Summary Statistics Badges -->
    <div class="flex items-center gap-2 sm:gap-3 text-xs">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100/80 border border-slate-200 font-medium text-slate-700">
        <span>ทั้งหมดในเดือน:</span>
        <span class="font-bold font-mono text-slate-900">{monthStats.total}</span>
      </div>
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 font-medium text-emerald-800">
        <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
        <span>อนุมัติแล้ว:</span>
        <span class="font-bold font-mono text-emerald-900">{monthStats.approved}</span>
      </div>
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 font-medium text-amber-800">
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span>รออนุมัติ:</span>
        <span class="font-bold font-mono text-amber-900">{monthStats.pending}</span>
      </div>
    </div>
  </div>

  <!-- Weekday Header -->
  <div class="grid grid-cols-7 border-b border-slate-200/90 bg-slate-50/70 text-center text-xs font-bold text-slate-700 py-2.5">
    {#each WEEKDAY_NAMES as wd}
      <div class="flex items-center justify-center gap-1 {wd.isWeekend ? 'text-orange-600/80' : 'text-slate-700'}">
        <span class="hidden sm:inline">{wd.full}</span>
        <span class="sm:hidden">{wd.short}</span>
      </div>
    {/each}
  </div>

  <!-- Calendar Grid -->
  <div class="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/40">
    {#each calendarCells as cell}
      {@const isToday = cell.dateStr === todayStr}
      {@const dayBookings = bookingsByDate.get(cell.dateStr) || []}
      {@const approvedCount = dayBookings.filter((b) => b.status === 'APPROVED').length}
      {@const pendingCount = dayBookings.filter((b) => b.status === 'PENDING').length}
      {@const hasBookings = dayBookings.length > 0}

      <div
        onclick={() => onSelectDate(cell.dateStr)}
        class="min-h-[100px] sm:min-h-[125px] p-2 sm:p-2.5 transition-colors cursor-pointer group flex flex-col justify-between select-none relative {cell.isCurrentMonth
          ? isToday
            ? 'bg-orange-50/40 hover:bg-orange-50/70'
            : 'bg-white hover:bg-slate-50'
          : 'bg-slate-50/50 hover:bg-slate-100/60 opacity-60'}"
        title="คลิกเพื่อดูไทม์ไลน์วันที่ {cell.dateStr}"
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') onSelectDate(cell.dateStr); }}
      >
        <!-- Day Header -->
        <div class="flex items-center justify-between">
          <span
            class="text-xs sm:text-sm font-semibold rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-mono {isToday
              ? 'bg-orange-600 text-white font-bold shadow-2xs'
              : cell.isCurrentMonth
              ? 'text-slate-800 group-hover:text-orange-600'
              : 'text-slate-400'}"
          >
            {cell.dayNum}
          </span>

          {#if isToday}
            <span class="hidden sm:inline-block text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
              วันนี้
            </span>
          {/if}
        </div>

        <!-- Day Booking Badges & Preview chips -->
        <div class="mt-1.5 space-y-1 flex-1 flex flex-col justify-end">
          {#if hasBookings}
            <div class="flex flex-wrap items-center gap-1">
              {#if approvedCount > 0}
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-300">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                  <span>{approvedCount}</span>
                  <span class="hidden md:inline">อนุมัติ</span>
                </span>
              {/if}
              {#if pendingCount > 0}
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/90 text-amber-900 border border-amber-300">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>{pendingCount}</span>
                  <span class="hidden md:inline">รอ</span>
                </span>
              {/if}
            </div>

            <!-- Desktop miniature preview chips -->
            <div class="hidden sm:flex flex-col gap-0.5 pt-0.5">
              {#each dayBookings.slice(0, 2) as b}
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    onSelectBooking(b);
                  }}
                  class="text-[10px] px-1.5 py-0.5 rounded truncate transition text-left cursor-pointer hover:shadow-2xs {b.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'}"
                  title="{b.startTime}-{b.endTime} {b.fullName}"
                >
                  <span class="font-mono font-medium mr-1 text-[9px] opacity-75">
                    {b.startTime}
                  </span>
                  <span class="font-medium truncate">{b.fullName}</span>
                </button>
              {/each}

              {#if dayBookings.length > 2}
                <div class="text-[9px] text-slate-400 font-medium text-left pl-1">
                  +{dayBookings.length - 2} รายการเพิ่มเติม
                </div>
              {/if}
            </div>
          {:else}
            <div class="hidden sm:block text-[10px] text-slate-300 font-light text-left pl-1">
              -
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
