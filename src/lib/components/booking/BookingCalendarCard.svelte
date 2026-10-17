<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import type { BookingItem } from '$lib/types/booking';
  import type { ClosedDateItem } from '$lib/facility-config';
  import { calculateDayAvailability } from '$lib/booking-capacity';

  interface Props {
    currentDate: Date;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onTodayMonth: () => void;
    onSelectDate: (dateStr: string) => void;
    selectedDate: string;
    bookings: BookingItem[];
    closedDates: ClosedDateItem[];
    todayStr: string;
  }

  let {
    currentDate,
    onPrevMonth,
    onNextMonth,
    onTodayMonth,
    onSelectDate,
    selectedDate,
    bookings,
    closedDates,
    todayStr,
  }: Props = $props();

  const MONTH_NAMES_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  let year = $derived(currentDate.getFullYear());
  let month = $derived(currentDate.getMonth());
  let yearBE = $derived(year + 543);

  let firstDayIndex = $derived(new Date(year, month, 1).getDay());
  let totalDays = $derived(new Date(year, month + 1, 0).getDate());
</script>

<div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-warm">
  <!-- Calendar Top Controls & Legend -->
  <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
    <div>
      <h3 class="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <span>เลือกวันที่ต้องการจอง</span>
        <span class="text-xs font-normal text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
          พ.ศ. {yearBE}
        </span>
      </h3>
      <p class="text-slate-500 text-xs mt-1">
        คลิกที่ช่องวันที่เพื่อดูช่วงเวลาว่างและส่งคำขอจองห้องประชุม
      </p>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50/80 px-3.5 py-2 rounded-2xl border border-slate-100">
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
        <span>มีคิวอนุมัติแล้ว</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200"></span>
        <span>มีคำขอรอตรวจสอบ</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-400 ring-2 ring-rose-200"></span>
        <span>ปิดทำการ/งดใช้</span>
      </div>
    </div>
  </div>

  <!-- Month Switcher Header -->
  <div class="flex justify-between items-center mb-6">
    <div class="flex items-center space-x-2">
      <button
        type="button"
        onclick={onPrevMonth}
        class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active-press cursor-pointer"
        title="เดือนก่อนหน้า"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>
      <button
        type="button"
        onclick={onTodayMonth}
        class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition active-press cursor-pointer"
      >
        เดือนปัจจุบัน
      </button>
    </div>

    <h4 class="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight">
      {MONTH_NAMES_TH[month]} {yearBE}
    </h4>

    <div class="flex items-center space-x-2">
      <button
        type="button"
        onclick={onNextMonth}
        class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs md:text-sm font-semibold transition active-press flex items-center gap-1 cursor-pointer"
      >
        เดือนถัดไป <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>

  <!-- Weekday Headers -->
  <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2 tracking-wider uppercase">
    <div class="text-rose-500 py-1">อา.</div>
    <div class="py-1">จ.</div>
    <div class="py-1">อ.</div>
    <div class="py-1">พ.</div>
    <div class="py-1">พฤ.</div>
    <div class="py-1">ศ.</div>
    <div class="text-blue-500 py-1">ส.</div>
  </div>

  <!-- Days Grid -->
  <div class="grid grid-cols-7 gap-2 md:gap-2.5">
    {#each Array.from({ length: firstDayIndex }) as _, i}
      <div class="h-24 md:h-28 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200/60"></div>
    {/each}

    {#each Array.from({ length: totalDays }) as _, i}
      {@const day = i + 1}
      {@const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
      {@const isToday = dateStr === todayStr}
      {@const isPast = dateStr < todayStr}
      {@const isSelected = dateStr === selectedDate}
      {@const blackout = closedDates.find((cd) => cd.date === dateStr)}
      {@const isClosed = !!blackout}
      {@const dayBookings = bookings.filter((b) => b.date === dateStr)}
      {@const availability = calculateDayAvailability(dateStr, dayBookings, isPast, { includePending: true })}
      {@const hasApproved = dayBookings.some((b) => b.status === 'APPROVED')}
      {@const hasPending = dayBookings.some((b) => b.status === 'PENDING')}

      <div
        onclick={() => onSelectDate(dateStr)}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') onSelectDate(dateStr); }}
        class="border rounded-2xl p-2.5 md:p-3 h-24 md:h-28 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative active-press {isClosed
          ? 'bg-rose-50/50 border-rose-200 text-rose-700 hover:border-rose-300'
          : isPast
          ? 'bg-slate-100/60 border-slate-200/60 text-slate-400 hover:border-slate-300'
          : hasApproved
          ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500 hover:shadow-warm-sm text-slate-800'
          : hasPending
          ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500 hover:shadow-warm-sm text-slate-800'
          : 'bg-white hover:border-orange-500 hover:shadow-warm-sm border-slate-200/90 text-slate-800'} {isSelected ? 'ring-2 ring-orange-500 border-orange-500' : ''}"
      >
        <div class="flex justify-between items-start">
          <span
            class="text-xs md:text-sm font-bold tabular-nums font-mono {isToday
              ? 'bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-xs -ml-0.5 -mt-0.5'
              : isPast
              ? 'text-slate-400 font-normal'
              : 'text-slate-700 group-hover:text-orange-600 transition-colors'}"
          >
            {day}
          </span>
          {#if isClosed}
            <span class="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
          {:else if hasApproved}
            <span class="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shadow-xs"></span>
          {:else if hasPending}
            <span class="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200 shadow-xs"></span>
          {/if}
        </div>

        <div>
          {#if isClosed}
            <div class="text-[10px] md:text-[11px] font-semibold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-lg inline-block border border-rose-200 truncate max-w-full">
              {blackout?.reason || 'ปิดทำการ'}
            </div>
          {:else}
            <div class="space-y-1">
              <div
                class="text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-lg inline-block border leading-tight {availability.colorClasses.bg} {availability.colorClasses.text} {availability.colorClasses.border}"
              >
                {availability.label}
              </div>
              {#if !isPast}
                <div class="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300 {availability.colorClasses.bar}"
                    style="width: {availability.statusLevel === 'FULL' ? 100 : availability.bookedPercentage}%"
                  ></div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
