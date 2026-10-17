<script lang="ts">
  import QRCode from 'qrcode';
  import { CheckCircle2, Copy, Check, CalendarDays, Download, Search, X } from 'lucide-svelte';
  import type { BookingFormData } from '$lib/types/booking';
  import { buildGoogleCalendarUrl, generateIcsContent } from '$lib/calendar-export';

  interface Props {
    bookingCode: string | null;
    bookingDetails: BookingFormData | null;
    onClose: () => void;
    appBaseUrl?: string;
  }

  let {
    bookingCode,
    bookingDetails,
    onClose,
    appBaseUrl,
  }: Props = $props();

  let copied = $state(false);
  let qrDataUrl = $state('');

  function copyBookingCode() {
    if (!bookingCode) return;
    navigator.clipboard.writeText(bookingCode);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  let originUrl = $derived(
    appBaseUrl || (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '')
  );

  let trackUrl = $derived(
    bookingCode ? `${originUrl}/track?q=${encodeURIComponent(bookingCode)}` : ''
  );

  $effect(() => {
    if (trackUrl) {
      QRCode.toDataURL(trackUrl, {
        width: 120,
        margin: 1,
        color: { dark: '#ea580c', light: '#ffffff' },
      }).then((url) => {
        qrDataUrl = url;
      }).catch((err) => {
        console.error('QR render error:', err);
      });
    }
  });

  let googleCalUrl = $derived.by(() => {
    if (!bookingDetails || !bookingCode) return '';
    return buildGoogleCalendarUrl({
      bookingCode,
      date: bookingDetails.date,
      startTime: bookingDetails.startTime,
      endTime: bookingDetails.endTime,
      fullName: bookingDetails.fullName,
      department: bookingDetails.department,
      reason: bookingDetails.reason,
      status: 'PENDING',
      trackUrl,
    });
  });

  function handleDownloadIcs() {
    if (!bookingDetails || !bookingCode) return;
    const content = generateIcsContent({
      bookingCode,
      date: bookingDetails.date,
      startTime: bookingDetails.startTime,
      endTime: bookingDetails.endTime,
      fullName: bookingDetails.fullName,
      department: bookingDetails.department,
      reason: bookingDetails.reason,
      status: 'PENDING',
      trackUrl,
    });

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bookingCode}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

{#if bookingCode}
  <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
    <div class="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl text-center border border-slate-100 relative text-slate-800 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
      <button
        type="button"
        onclick={onClose}
        class="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer z-10"
      >
        <X class="w-4 h-4" />
      </button>

      <div class="overflow-y-auto flex-1 pr-1 -mr-1">
        <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-warm-xs">
          <CheckCircle2 class="w-8 h-8 stroke-[2.2]" />
        </div>
        <h3 class="text-xl font-extrabold text-slate-900 mb-1 tracking-tight">
          ส่งคำขอจองสำเร็จ
        </h3>
        <p class="text-xs text-slate-500 mb-5 font-light">
          คำขอของคุณอยู่ในสถานะ <span class="text-amber-600 font-semibold">รอการอนุมัติ</span>{' '}
          กรุณาบันทึกรหัสนี้ไว้เพื่อใช้ตรวจสอบ
        </p>

        <!-- Ticket Box -->
        <div class="bg-gradient-to-b from-orange-50 to-amber-50/60 border border-orange-200/90 rounded-2xl p-5 mb-5 relative overflow-hidden text-center">
          <div class="text-[11px] font-bold text-orange-950/70 tracking-wider uppercase mb-1">
            รหัสการจองของท่าน (Booking Code)
          </div>
          <div class="flex items-center justify-center gap-2">
            <span class="font-mono text-xl md:text-2xl font-black text-orange-600 tracking-tight">
              {bookingCode}
            </span>
            <button
              type="button"
              onclick={copyBookingCode}
              class="p-1.5 text-orange-600 hover:bg-orange-100/80 rounded-lg transition active-press cursor-pointer"
              title="คัดลอกรหัสการจอง"
            >
              {#if copied}
                <Check class="w-4 h-4 text-emerald-600" />
              {:else}
                <Copy class="w-4 h-4" />
              {/if}
            </button>
          </div>
          {#if copied}
            <p class="text-[11px] text-emerald-700 font-semibold mt-1">คัดลอกรหัสเรียบร้อยแล้ว!</p>
          {/if}

          <!-- QR Code -->
          {#if qrDataUrl}
            <div class="mt-4 flex justify-center">
              <div class="p-2.5 bg-white rounded-xl shadow-xs border border-orange-100">
                <img src={qrDataUrl} alt="Booking QR Code" class="w-28 h-28" />
              </div>
            </div>
          {/if}
        </div>

        <!-- Calendar Export Actions -->
        {#if bookingDetails}
          <div class="grid grid-cols-2 gap-2 mb-4">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition active-press"
            >
              <CalendarDays class="w-3.5 h-3.5 text-orange-600" />
              Google Calendar
            </a>
            <button
              type="button"
              onclick={handleDownloadIcs}
              class="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-semibold transition active-press cursor-pointer"
            >
              <Download class="w-3.5 h-3.5 text-slate-600" />
              ดาวน์โหลด .ics
            </button>
          </div>
        {/if}
      </div>

      <div class="space-y-2 pt-3 shrink-0 border-t border-slate-100 mt-2">
        <a
          href="/track?q={encodeURIComponent(bookingCode)}"
          class="w-full inline-flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition shadow-warm-xs active-press"
        >
          <Search class="w-3.5 h-3.5" /> ติดตามสถานะคำขอนี้ทันที &rarr;
        </a>
        <button
          type="button"
          onclick={onClose}
          class="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  </div>
{/if}
