<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import QRCode from 'qrcode';
  import {
    Search,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    ArrowLeft,
    Landmark,
    FileText,
    Copy,
    Check,
    CalendarPlus,
    X,
    User,
    AlertTriangle,
    Download,
    CalendarDays,
    ShieldCheck,
  } from 'lucide-svelte';
  import ViewSwitcherFooter from '$lib/components/mobile/ViewSwitcherFooter.svelte';
  import { isBackdated } from '$lib/date-utils';
  import { buildGoogleCalendarUrl, generateIcsContent } from '$lib/calendar-export';
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';

  interface BookingTrackItem {
    id: string;
    bookingCode: string;
    date: string;
    startTime: string;
    endTime: string;
    fullName: string;
    studentId: string;
    department: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    rejectionReason?: string | null;
    approvedAt?: string | null;
    checkedInAt?: string | null;
    createdAt: string;
  }

  let query = $state('');
  let results = $state<BookingTrackItem[] | null>(null);
  let isLoading = $state(false);
  let searched = $state(false);
  let copiedId = $state<string | null>(null);
  let appBaseUrl = $state('');
  let qrCodes = $state<Record<string, string>>({});

  // Cancellation Modal State
  let cancellingBooking = $state<BookingTrackItem | null>(null);
  let cancelStudentId = $state('');
  let cancelPhoneLast4 = $state('');
  let cancelReason = $state('');
  let isCancelling = $state(false);
  let cancelError = $state<string | null>(null);

  onMount(() => {
    const q = page.url.searchParams.get('q') || '';
    if (q) {
      query = q;
      handleSearch(q);
    }

    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const val = String(data?.settings?.app_base_url || '').trim().replace(/\/+$/, '');
        appBaseUrl = val;
      })
      .catch(() => {});
  });

  async function handleSearch(searchTerm: string) {
    if (!searchTerm.trim()) return;
    isLoading = true;
    searched = true;
    try {
      const res = await fetch(`/api/bookings/track?q=${encodeURIComponent(searchTerm.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.bookings || [];
        results = list;
        generateAllQrs(list);
      } else {
        results = [];
      }
    } catch (e) {
      console.error(e);
      results = [];
    } finally {
      isLoading = false;
    }
  }

  let qrBaseUrl = $derived(
    appBaseUrl || (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '')
  );

  function generateAllQrs(items: BookingTrackItem[]) {
    items.forEach((item) => {
      const isApproved = item.status === 'APPROVED';
      const isPending = item.status === 'PENDING';
      const targetUrl = isApproved
        ? `${qrBaseUrl}/admin/dashboard?checkIn=${encodeURIComponent(item.bookingCode)}`
        : `${qrBaseUrl}/track?q=${encodeURIComponent(item.bookingCode)}`;
      const fgColor = isApproved ? '#059669' : isPending ? '#d97706' : '#e11d48';

      QRCode.toDataURL(targetUrl, {
        width: 100,
        margin: 1,
        color: { dark: fgColor, light: '#ffffff' },
      }).then((url) => {
        qrCodes[item.id] = url;
      }).catch(() => {});
    });
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    handleSearch(query);
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    copiedId = id;
    setTimeout(() => (copiedId = null), 2000);
  }

  function handleOpenCancelModal(booking: BookingTrackItem) {
    cancellingBooking = booking;
    cancelStudentId = booking.studentId || (query.match(/^\d{13}$/) ? query : '');
    cancelPhoneLast4 = '';
    cancelReason = '';
    cancelError = null;
  }

  async function handleConfirmCancel(e: SubmitEvent) {
    e.preventDefault();
    if (!cancellingBooking) return;
    if (!cancelStudentId.trim() || !cancelPhoneLast4.trim()) {
      cancelError = 'กรุณากรอกรหัสนักศึกษาและเบอร์โทรศัพท์ 4 ตัวท้าย';
      return;
    }

    isCancelling = true;
    cancelError = null;

    try {
      const res = await fetch('/api/bookings/track', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingCode: cancellingBooking.bookingCode,
          studentId: cancelStudentId.trim(),
          phoneLast4: cancelPhoneLast4.trim(),
          cancelReason: cancelReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        cancelError = data.error || 'ไม่สามารถยกเลิกการจองได้';
        return;
      }

      if (results) {
        results = results.map((item) =>
          item.bookingCode === cancellingBooking?.bookingCode
            ? {
                ...item,
                status: 'CANCELLED',
                rejectionReason: `[ผู้จองยกเลิกเอง]: ${cancelReason.trim() || 'ไม่ระบุเหตุผล'}`,
              }
            : item
        );
      }

      cancellingBooking = null;
    } catch (error) {
      console.error(error);
      cancelError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isCancelling = false;
    }
  }

  function handleDownloadIcs(item: BookingTrackItem) {
    const icsContent = generateIcsContent({
      bookingCode: item.bookingCode,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      fullName: item.fullName,
      department: item.department,
      reason: item.reason,
      status: item.status,
      trackUrl: `${qrBaseUrl}/track?q=${encodeURIComponent(item.bookingCode)}`,
    });

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.bookingCode}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
</script>

<div class="min-h-dvh bg-slate-50 flex flex-col text-slate-800">
  <!-- Sticky Header -->
  <header class="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs">
    <div class="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
      <a href="/" class="flex items-center space-x-3 group">
        <div class="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform">
          <Landmark class="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <h1 class="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">
            สภานักศึกษา มจพ.
          </h1>
          <p class="text-[11px] text-orange-100 font-medium tracking-wide">
            Student Council KMUTNB
          </p>
        </div>
      </a>
      <div class="flex items-center gap-2">
        <a
          href="/booking"
          class="text-xs font-semibold bg-white text-orange-600 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition active-press flex items-center gap-1.5 shadow-warm-xs"
        >
          <Calendar class="w-3.5 h-3.5" /> จองห้องประชุม
        </a>
        <a
          href="/"
          class="text-xs font-medium bg-orange-950/30 hover:bg-orange-950/50 px-3.5 py-2 rounded-xl transition active-press flex items-center gap-1.5 border border-orange-400/30 text-white"
        >
          <ArrowLeft class="w-3.5 h-3.5" /> หน้าหลัก
        </a>
      </div>
    </div>
  </header>

  <!-- Subheader Banner -->
  <section class="bg-gradient-to-b from-orange-600 to-amber-600 text-white py-12 px-4 relative overflow-hidden">
    <div class="absolute inset-0 bg-mesh-dots opacity-15 pointer-events-none"></div>
    <div class="max-w-xl mx-auto text-center relative z-10">
      <div class="w-12 h-12 bg-orange-950/30 text-amber-300 border border-orange-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner backdrop-blur-xs">
        <Search class="w-6 h-6 stroke-[2.2]" />
      </div>
      <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight">
        ตรวจสอบสถานะการจองห้องประชุม
      </h2>
      <p class="text-orange-100 text-xs md:text-sm mt-1.5 font-light">
        ระบุรหัสนักศึกษา (13 หลัก) หรือรหัสการจอง (BK-...) เพื่อดูความคืบหน้าและการเช็กอิน
      </p>
    </div>
  </section>

  <!-- Main Content & Search -->
  <main class="flex-grow max-w-4xl mx-auto px-4 -mt-6 pb-16 w-full space-y-6 relative z-20">
    <!-- Search Card -->
    <div class="max-w-2xl mx-auto bg-white p-3 md:p-3.5 rounded-3xl shadow-warm border border-slate-200/90">
      <form onsubmit={onSubmit} class="flex gap-2">
        <div class="relative flex-grow">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            bind:value={query}
            placeholder="ระบุรหัสนักศึกษา หรือรหัสการจอง เช่น BK-2026-..."
            class="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
          />
          {#if query}
            <button
              type="button"
              onclick={() => (query = '')}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          {/if}
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          class="rounded-2xl px-5 md:px-6 py-2.5 text-xs md:text-sm shrink-0"
        >
          {isLoading ? 'กำลังค้นหา...' : 'ค้นหาข้อมูล'}
        </Button>
      </form>
    </div>

    <!-- Results Container -->
    {#if searched}
      <div class="space-y-4 max-w-2xl mx-auto">
        <div class="flex justify-between items-center px-1">
          <h3 class="font-bold text-sm text-slate-800 tracking-tight">
            ผลการค้นหา {results ? `(${results.length} รายการ)` : ''}
          </h3>
        </div>

        <!-- Empty State -->
        {#if results && results.length === 0}
          <div class="bg-white rounded-3xl p-10 text-center border border-slate-200/90 shadow-warm">
            <div class="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText class="w-7 h-7" />
            </div>
            <h4 class="text-base font-bold text-slate-800 mb-1">ไม่พบประวัติการจอง</h4>
            <p class="text-slate-500 text-xs max-w-sm mx-auto mb-6">
              ไม่พบข้อมูลตามคำค้นหา กรุณาตรวจสอบรหัสนักศึกษาหรือรหัสการจอง หรือส่งคำขอจองห้องประชุมใหม่
            </p>
            <a
              href="/booking"
              class="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-warm-xs transition active-press"
            >
              <CalendarPlus class="w-4 h-4" /> เริ่มจองห้องประชุม
            </a>
          </div>
        {/if}

        <!-- Result Cards -->
        {#if results}
          {#each results as item}
            {@const isApproved = item.status === 'APPROVED'}
            {@const isPending = item.status === 'PENDING'}
            {@const isRejected = item.status === 'REJECTED'}
            {@const isCancelled = item.status === 'CANCELLED'}
            {@const isFutureBooking = !isBackdated(item.date, item.startTime).isBackdated}
            {@const canCancel = isPending || (isApproved && isFutureBooking)}
            {@const googleCalUrl = buildGoogleCalendarUrl({
              bookingCode: item.bookingCode,
              date: item.date,
              startTime: item.startTime,
              endTime: item.endTime,
              fullName: item.fullName,
              department: item.department,
              reason: item.reason,
              status: item.status,
              trackUrl: `${qrBaseUrl}/track?q=${encodeURIComponent(item.bookingCode)}`,
            })}

            <div class="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-warm space-y-4 transition-all duration-200">
              <div class="flex flex-col sm:flex-row justify-between sm:items-start gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono tabular-nums font-bold text-orange-600 text-sm bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200/80">
                      {item.bookingCode}
                    </span>
                    <button
                      type="button"
                      onclick={() => copyCode(item.bookingCode, item.id)}
                      class="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
                      title="คัดลอกรหัสการจอง"
                    >
                      {#if copiedId === item.id}
                        <Check class="w-3.5 h-3.5 text-emerald-600" />
                      {:else}
                        <Copy class="w-3.5 h-3.5" />
                      {/if}
                    </button>
                  </div>
                  <h4 class="font-bold text-base text-slate-800 mt-2">{item.fullName}</h4>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  {#if isApproved}
                    <Badge status="APPROVED" class="text-xs font-bold px-3 py-1.5 shadow-2xs">
                      <CheckCircle2 class="w-4 h-4 text-emerald-600" /> อนุมัติแล้ว (ยืนยัน)
                    </Badge>
                  {:else if isPending}
                    <Badge status="PENDING" class="text-xs font-bold px-3 py-1.5 shadow-2xs">
                      <AlertCircle class="w-4 h-4 text-amber-600" /> รอตรวจสอบ (Pending)
                    </Badge>
                  {:else if isRejected}
                    <Badge status="REJECTED" class="text-xs font-bold px-3 py-1.5 shadow-2xs">
                      <XCircle class="w-4 h-4 text-rose-600" /> ปฏิเสธคำขอ
                    </Badge>
                  {:else if isCancelled}
                    <Badge status="CANCELLED" class="text-xs font-bold px-3 py-1.5 shadow-2xs">
                      <X class="w-4 h-4 text-slate-500" /> ยกเลิกแล้ว (Cancelled)
                    </Badge>
                  {/if}

                  {#if canCancel}
                    <button
                      type="button"
                      onclick={() => handleOpenCancelModal(item)}
                      class="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full transition active-press cursor-pointer"
                    >
                      ยกเลิกการจอง
                    </button>
                  {/if}
                </div>
              </div>

              <!-- Booking Details Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div class="text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar class="w-3.5 h-3.5" /> วันที่จองใช้งาน
                  </div>
                  <div class="font-mono tabular-nums font-bold text-slate-700">{item.date}</div>
                </div>

                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div class="text-slate-400 mb-1 flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5" /> ช่วงเวลาที่ใช้
                  </div>
                  <div class="font-mono tabular-nums font-bold text-slate-700">
                    {item.startTime} - {item.endTime} น.
                  </div>
                </div>

                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div class="text-slate-400 mb-1 flex items-center gap-1">
                    <User class="w-3.5 h-3.5" /> รหัสนักศึกษา / สังกัด
                  </div>
                  <div class="font-bold text-slate-700 truncate">
                    {item.studentId} ({item.department})
                  </div>
                </div>
              </div>

              <div class="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                <span class="font-semibold text-slate-700">เหตุผลและวาระ: </span>
                {item.reason}
              </div>

              {#if item.checkedInAt}
                <div class="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2">
                  <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    เช็กอินเข้าห้องแล้วเมื่อ{' '}
                    {new Date(item.checkedInAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    น.
                  </span>
                </div>
              {/if}

              {#if (isRejected || isCancelled) && item.rejectionReason}
                <div class="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs">
                  <span class="font-bold">
                    {isCancelled ? 'เหตุผลการยกเลิก: ' : 'เหตุผลที่ไม่สามารถอนุมัติได้: '}
                  </span>
                  {item.rejectionReason}
                </div>
              {/if}

              {#if isCancelled}
                <div class="pt-2 flex justify-end">
                  <a
                    href="/booking"
                    class="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition border border-orange-200"
                  >
                    <CalendarPlus class="w-3.5 h-3.5" /> จองใหม่อีกครั้ง (Book Another Slot) &rarr;
                  </a>
                </div>
              {/if}

              {#if isApproved || isPending}
                <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={googleCalUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press"
                  >
                    <CalendarDays class="w-3.5 h-3.5 text-orange-600" />
                    เพิ่มใน Google Calendar
                  </a>
                  <button
                    type="button"
                    onclick={() => handleDownloadIcs(item)}
                    class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer"
                  >
                    <Download class="w-3.5 h-3.5 text-slate-600" />
                    ดาวน์โหลด .ics
                  </button>
                </div>
              {/if}

              <!-- QR Code Section -->
              <div class="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
                <div class="shrink-0 p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                  {#if qrCodes[item.id]}
                    <img src={qrCodes[item.id]} alt="Booking QR Code" class="w-24 h-24" />
                  {:else}
                    <div class="w-24 h-24 bg-slate-100 animate-pulse rounded-lg"></div>
                  {/if}
                </div>
                <div class="text-xs text-slate-600 text-center sm:text-left">
                  <div class="font-bold text-slate-800 mb-1">QR Code สำหรับการจอง</div>
                  <div class="text-slate-500 mb-2">
                    {isApproved
                      ? 'แสดง QR Code นี้ให้แอดมินสแกนเพื่อเช็กอินเข้าห้องประชุม'
                      : 'สแกนเพื่อตรวจสอบสถานะการจองได้ทันที'}
                  </div>
                  {#if isApproved}
                    <div class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl font-semibold">
                      ✓ แอดมินสแกน QR นี้เพื่อเช็กอินเข้าใช้งานห้อง
                    </div>
                  {:else if isPending}
                    <div class="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl font-semibold">
                      ⏳ รอการอนุมัติ — กรุณาตรวจสอบสถานะอีกครั้ง
                    </div>
                  {:else if isRejected}
                    <div class="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl font-semibold">
                      ✕ คำขอนี้ถูกปฏิเสธแล้ว
                    </div>
                  {:else if isCancelled}
                    <div class="text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl font-semibold">
                      — รายการนี้ถูกยกเลิกแล้ว
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {/if}
  </main>

  <!-- Cancellation Confirmation Modal -->
  {#if cancellingBooking}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-800 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
        <div class="overflow-y-auto flex-1 pr-1 -mr-1">
          <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-warm-xs">
            <AlertTriangle class="w-6 h-6 stroke-[2.2]" />
          </div>
          <h3 class="text-lg font-bold text-slate-900 text-center mb-1">
            ยืนยันการยกเลิกการจองห้อง
          </h3>
          <p class="text-xs text-slate-500 text-center mb-4">
            รหัสการจอง: <span class="font-mono font-bold text-orange-600">{cancellingBooking.bookingCode}</span>
          </p>

          {#if cancelError}
            <div class="mb-4 bg-rose-50 border border-rose-300 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
              <span>{cancelError}</span>
            </div>
          {/if}

          <form id="cancel-booking-form" onsubmit={handleConfirmCancel} class="space-y-3.5 text-xs">
            <div>
              <label for="cancel-student-id" class="block font-semibold text-slate-700 mb-1">
                รหัสนักศึกษา 13 หลัก
              </label>
              <input
                id="cancel-student-id"
                type="text"
                required
                bind:value={cancelStudentId}
                placeholder="เช่น 6501012345678"
                class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label for="cancel-phone-last4" class="block font-semibold text-slate-700 mb-1">
                เบอร์โทรศัพท์ 4 ตัวท้ายของผู้จอง
              </label>
              <input
                id="cancel-phone-last4"
                type="text"
                required
                maxlength={4}
                bind:value={cancelPhoneLast4}
                placeholder="เช่น 5678"
                class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label for="cancel-reason-input" class="block font-semibold text-slate-700 mb-1">
                เหตุผลในการยกเลิก (ไม่บังคับ)
              </label>
              <textarea
                id="cancel-reason-input"
                rows={2}
                bind:value={cancelReason}
                placeholder="ระบุเหตุผลที่ขอยกเลิก เช่น ติดภารกิจด่วน, เลื่อนการประชุม"
                class="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              ></textarea>
            </div>
          </form>
        </div>

        <div class="flex gap-2.5 pt-3 border-t border-slate-100 shrink-0 mt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => (cancellingBooking = null)}
            class="flex-1 text-xs"
          >
            ย้อนกลับ
          </Button>
          <Button
            type="submit"
            variant="destructive"
            form="cancel-booking-form"
            disabled={isCancelling}
            class="flex-1 text-xs"
          >
            {isCancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกการจอง'}
          </Button>
        </div>
      </div>
    </div>
  {/if}

  <ViewSwitcherFooter currentMode="desktop" />
</div>
