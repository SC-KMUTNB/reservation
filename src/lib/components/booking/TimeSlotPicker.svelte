<script lang="ts">
  import { Clock, Info, CheckCircle2 } from 'lucide-svelte';
  import type { BookingItem } from '$lib/types/booking';

  export interface TimeSlot {
    start: string;
    end: string;
    label: string;
  }

  interface Props {
    slots: TimeSlot[];
    bookingsOnDate: BookingItem[];
    startTime: string;
    endTime: string;
    onSelectSlot: (start: string, end: string) => void;
    isToday: boolean;
    currentTimeStr: string;
    isPastDate: boolean;
  }

  let {
    slots,
    bookingsOnDate,
    startTime,
    endTime,
    onSelectSlot,
    isToday,
    currentTimeStr,
    isPastDate,
  }: Props = $props();

  export function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }

  export function isSlotBooked(
    start: string,
    end: string,
    bookings: BookingItem[]
  ): BookingItem | undefined {
    return bookings.find(
      (b) =>
        (b.status === 'APPROVED' || b.status === 'PENDING') &&
        hasTimeOverlap(start, end, b.startTime, b.endTime)
    );
  }

  export function isSlotAvailable(
    start: string,
    end: string,
    bookings: BookingItem[],
    todayFlag: boolean,
    currTime: string,
    pastFlag: boolean
  ): boolean {
    if (pastFlag) return false;
    if (todayFlag && start <= currTime) return false;
    return !isSlotBooked(start, end, bookings);
  }

  export function getValidEndTimes(
    start: string,
    allSlots: TimeSlot[],
    bookings: BookingItem[],
    todayFlag: boolean,
    currTime: string,
    pastFlag: boolean
  ): string[] {
    if (!start) return [];
    const validEnds: string[] = [];

    for (const slot of allSlots) {
      if (slot.start < start) continue;

      const available = isSlotAvailable(
        slot.start,
        slot.end,
        bookings,
        todayFlag,
        currTime,
        pastFlag
      );

      if (!available) {
        break;
      }

      validEnds.push(slot.end);
    }

    return validEnds;
  }

  let validStartTimes = $derived(
    slots
      .filter((slot) =>
        isSlotAvailable(slot.start, slot.end, bookingsOnDate, isToday, currentTimeStr, isPastDate)
      )
      .map((slot) => slot.start)
  );

  let validEndTimes = $derived(
    getValidEndTimes(
      startTime,
      slots,
      bookingsOnDate,
      isToday,
      currentTimeStr,
      isPastDate
    )
  );

  let durationSummary = $derived.by(() => {
    if (!startTime || !endTime || startTime >= endTime) return null;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const totalMinutes = eH * 60 + eM - (sH * 60 + sM);
    if (totalMinutes <= 0) return null;

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    let text = '';
    if (hours > 0) text += `${hours} ชั่วโมง`;
    if (mins > 0) text += ` ${mins} นาที`;
    return { text, totalMinutes };
  });

  function handleStartChange(newStart: string) {
    if (!newStart) {
      onSelectSlot('', '');
      return;
    }

    const availableEnds = getValidEndTimes(
      newStart,
      slots,
      bookingsOnDate,
      isToday,
      currentTimeStr,
      isPastDate
    );

    if (availableEnds.length === 0) {
      onSelectSlot(newStart, '');
      return;
    }

    if (endTime && availableEnds.includes(endTime)) {
      onSelectSlot(newStart, endTime);
    } else {
      onSelectSlot(newStart, availableEnds[0]);
    }
  }

  function handleEndChange(newEnd: string) {
    if (!startTime) return;
    onSelectSlot(startTime, newEnd);
  }

  function handlePillClick(slot: TimeSlot, isDisabled: boolean) {
    if (isDisabled) return;

    if (!startTime || !endTime || slot.start < startTime) {
      onSelectSlot(slot.start, slot.end);
      return;
    }

    if (slot.start === startTime) {
      if (endTime > slot.end) {
        onSelectSlot(slot.start, slot.end);
      }
      return;
    }

    if (validEndTimes.includes(slot.end)) {
      onSelectSlot(startTime, slot.end);
    } else {
      onSelectSlot(slot.start, slot.end);
    }
  }
</script>

<div class="space-y-3.5">
  <!-- Header and Duration Indicator -->
  <div class="flex flex-wrap justify-between items-center gap-2">
    <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
      <Clock class="w-3.5 h-3.5 text-orange-600" />
      <span>ช่วงเวลาที่ต้องการจอง (ระบุเวลาหรือคลิกเลือกช่วง)</span>
    </span>
    {#if durationSummary}
      <div class="flex items-center gap-1.5 text-xs text-orange-800 font-semibold bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
        <CheckCircle2 class="w-3.5 h-3.5 text-orange-600" />
        <span>
          {startTime} - {endTime} น. (รวม {durationSummary.text})
        </span>
      </div>
    {/if}
  </div>

  <!-- Mode 1: Manual Start Time & End Time Dropdowns -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/90 border border-slate-200/90 rounded-2xl">
    <div>
      <label for="slot-start-select" class="block text-[11px] font-bold text-slate-700 mb-1">
        เวลาเริ่มต้น (Start Time) <span class="text-rose-500">*</span>
      </label>
      <select
        id="slot-start-select"
        value={startTime}
        onchange={(e) => handleStartChange((e.currentTarget as HTMLSelectElement).value)}
        class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-2xs"
      >
        {#if validStartTimes.length === 0}
          <option value="">ไม่มีช่วงเวลาว่างในวันที่เลือก</option>
        {:else}
          {#if !startTime}
            <option value="">-- เลือกเวลาเริ่มต้น --</option>
          {/if}
          {#each validStartTimes as time}
            <option value={time}>
              {time} น.
            </option>
          {/each}
        {/if}
      </select>
    </div>

    <div>
      <label for="slot-end-select" class="block text-[11px] font-bold text-slate-700 mb-1">
        เวลาสิ้นสุด (End Time) <span class="text-rose-500">*</span>
      </label>
      <select
        id="slot-end-select"
        value={endTime}
        disabled={!startTime || validEndTimes.length === 0}
        onchange={(e) => handleEndChange((e.currentTarget as HTMLSelectElement).value)}
        class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed shadow-2xs"
      >
        {#if validEndTimes.length === 0}
          <option value="">
            {!startTime ? 'กรุณาเลือกเวลาเริ่มต้นก่อน' : 'ไม่สามารถขยายเวลาเพิ่มได้'}
          </option>
        {:else}
          {#each validEndTimes as time}
            <option value={time}>
              {time} น.
            </option>
          {/each}
        {/if}
      </select>
    </div>
  </div>

  <!-- Mode 2: Interactive 2-Click Range Selection Pills -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <span class="text-[11px] text-slate-500 font-medium flex items-center gap-1">
        <Info class="w-3 h-3 text-slate-400" />
        คลิกเลือกช่องเริ่มต้น และคลิกช่องถัดไปเพื่อจองหลายชั่วโมงต่อเนื่อง
      </span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {#each slots as slot}
        {@const isSelected = Boolean(startTime) && Boolean(endTime) && startTime <= slot.start && endTime >= slot.end}
        {@const conflict = isSlotBooked(slot.start, slot.end, bookingsOnDate)}
        {@const isSlotPastToday = isToday && slot.start <= currentTimeStr}
        {@const isDisabled = isPastDate || isSlotPastToday || Boolean(conflict)}

        <button
          type="button"
          disabled={isDisabled}
          onclick={() => handlePillClick(slot, isDisabled)}
          class="p-2.5 rounded-2xl border text-center transition-all duration-150 flex flex-col items-center justify-center cursor-pointer {conflict
            ? conflict.status === 'APPROVED'
              ? 'bg-rose-50 border-rose-200 text-rose-700 opacity-90 cursor-not-allowed'
              : 'bg-amber-50 border-amber-200 text-amber-700 opacity-90 cursor-not-allowed'
            : isPastDate || isSlotPastToday
            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
            : isSelected
            ? 'bg-orange-600 text-white border-orange-600 shadow-warm-xs scale-102 font-bold ring-2 ring-orange-200'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300'}"
        >
          <span class="font-mono tabular-nums text-xs font-semibold">{slot.label}</span>
          <span
            class="text-[10px] mt-0.5 {isSelected
              ? 'text-orange-100 font-bold'
              : conflict?.status === 'APPROVED'
              ? 'text-rose-600 font-bold'
              : conflict?.status === 'PENDING'
              ? 'text-amber-600 font-bold'
              : 'text-slate-400'}"
          >
            {#if conflict}
              {conflict.status === 'APPROVED' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
            {:else if isPastDate || isSlotPastToday}
              เลยเวลาแล้ว
            {:else if isSelected}
              ✓ เลือกอยู่
            {:else}
              ว่าง
            {/if}
          </span>
        </button>
      {/each}
    </div>
  </div>
</div>
