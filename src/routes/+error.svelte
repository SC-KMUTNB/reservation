<script lang="ts">
  import { page } from '$app/state';
  import {
    Home,
    Search,
    RefreshCw,
    AlertCircle,
    Calendar,
    ArrowLeft,
    LifeBuoy,
  } from 'lucide-svelte';
  import AppHeader from '$lib/components/ui/AppHeader.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  const status = $derived(page.status || 404);
  const message = $derived(page.error?.message || '');

  const is404 = $derived(status === 404);
  const is500 = $derived(status >= 500);

  // English headline & Thai subtitle definition
  const errorMeta = $derived.by(() => {
    if (is404) {
      return {
        code: '404',
        titleEn: 'Page Not Found',
        titleTh: 'ไม่พบหน้าที่คุณต้องการ',
        descEn: 'The page you are looking for might have been moved, removed, or does not exist.',
        descTh: 'หน้าเว็บนี้อาจถูกย้าย ลบออกไปแล้ว หรือลิงก์ปลายทางไม่ถูกต้อง กรุณาตรวจสอบ URL อีกครั้ง',
      };
    }
    if (is500) {
      return {
        code: status.toString(),
        titleEn: 'Internal Server Error',
        titleTh: 'เกิดข้อผิดพลาดภายในระบบ',
        descEn: 'An unexpected system error occurred while processing your request.',
        descTh: 'ระบบพบปัญหาขัดข้องชั่วคราว ทีมผู้ดูแลระบบได้รับรายงานเรียบร้อยแล้ว กรุณาลองใหม่อีกครั้ง',
      };
    }
    return {
      code: status.toString(),
      titleEn: 'Unexpected Error',
      titleTh: 'เกิดข้อผิดพลาดไม่คาดคิด',
      descEn: message || 'Something went wrong while loading this page.',
      descTh: 'เกิดข้อผิดพลาดขณะโหลดหน้านี้ กรุณากลับสู่หน้าหลักหรือลองใหม่อีกครั้ง',
    };
  });

  function handleReload() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
</script>

<svelte:head>
  <title>{errorMeta.code} - {errorMeta.titleEn} | สภานักศึกษา มจพ.</title>
</svelte:head>

<div class="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
  <!-- Shared AppHeader for unified navigation -->
  <AppHeader activeTab="none" />

  <!-- Error Presentation Card Section -->
  <main class="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-12 relative overflow-hidden">
    <!-- Ambient orange decorative backdrop blobs -->
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-10 right-1/4 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none"></div>

    <div class="w-full max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-warm-lg p-6 sm:p-10 text-center relative z-10 animate-fade-in">
      <!-- Status Badge & Icon -->
      <div class="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 font-bold text-xs uppercase tracking-wider mb-6">
        <span class="w-2 h-2 rounded-full {is500 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}"></span>
        <span>HTTP STATUS {errorMeta.code}</span>
      </div>

      <!-- Hero Number / Icon -->
      <div class="mb-4">
        <h1 class="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 tracking-tight select-none">
          {errorMeta.code}
        </h1>
      </div>

      <!-- Dual Language Headline -->
      <div class="space-y-1.5 mb-4">
        <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {errorMeta.titleEn}
        </h2>
        <p class="text-base sm:text-lg font-semibold text-orange-600">
          {errorMeta.titleTh}
        </p>
      </div>

      <!-- Explanatory Copy -->
      <div class="space-y-1 text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-8 font-light">
        <p>{errorMeta.descTh}</p>
        <p class="text-slate-400 text-[11px] sm:text-xs">{errorMeta.descEn}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
        <a
          href="/"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-warm-xs transition active-press"
        >
          <Home class="w-4 h-4" />
          <span>กลับหน้าหลัก (Home)</span>
        </a>

        <a
          href="/track"
          class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition active-press border border-slate-200"
        >
          <Search class="w-4 h-4" />
          <span>ตรวจสอบสถานะ (Track)</span>
        </a>

        {#if is500}
          <button
            type="button"
            onclick={handleReload}
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-600 font-medium text-sm px-4 py-2.5 rounded-xl transition border border-slate-200 shadow-2xs"
          >
            <RefreshCw class="w-4 h-4" />
            <span>ลองใหม่ (Retry)</span>
          </button>
        {/if}
      </div>

      <!-- Support Footer Note -->
      <div class="mt-8 pt-6 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <LifeBuoy class="w-3.5 h-3.5 text-orange-500" />
        <span>หากพบปัญหาซ้ำ กรุณาติดต่อสภานักศึกษา มจพ. หรือแจ้งเรื่องร้องเรียน</span>
      </div>
    </div>
  </main>
</div>
