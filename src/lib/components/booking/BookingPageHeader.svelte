<script lang="ts">
  import { Calendar as CalendarIcon, Landmark, Lock, Search, CalendarCheck, ArrowLeft } from 'lucide-svelte';
  import type { FacilityConfig } from '$lib/facility-config';

  interface Props {
    siteTitle?: string;
    siteSubtitle?: string;
    facilityConfig: FacilityConfig;
  }

  let {
    siteTitle = 'สภานักศึกษา มจพ.',
    siteSubtitle = 'Student Council KMUTNB',
    facilityConfig,
  }: Props = $props();
</script>

<header class="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs">
  <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
    <a href="/" class="flex items-center space-x-3 group">
      <div class="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform">
        <Landmark class="w-5 h-5 stroke-[2.2]" />
      </div>
      <div>
        <h1 class="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">{siteTitle}</h1>
        <p class="text-[11px] text-orange-100 font-medium tracking-wide">{siteSubtitle}</p>
      </div>
    </a>
    <nav class="hidden md:flex items-center space-x-1 text-sm font-medium">
      <a href="/" class="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition">หน้าหลัก</a>
      <a href="/booking" class="px-3 py-1.5 rounded-xl bg-orange-700/60 text-white font-semibold shadow-inner border border-orange-400/30 flex items-center gap-1.5">
        <CalendarIcon class="w-4 h-4" /> จองห้องประชุม
      </a>
      <a href="/track" class="px-3 py-1.5 rounded-xl text-orange-100 hover:text-white hover:bg-orange-500/40 transition flex items-center gap-1.5">
        <Search class="w-4 h-4" /> ตรวจสอบสถานะ
      </a>
      <a href="/admin/login" class="bg-orange-950/40 hover:bg-orange-950/60 text-orange-100 hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-orange-400/30 shadow-xs transition active-press flex items-center gap-1.5 ml-2">
        <Lock class="w-3.5 h-3.5" /> แอดมิน
      </a>
    </nav>
  </div>
</header>

<section class="bg-gradient-to-b from-orange-600 to-amber-600 text-white py-10 px-4 relative overflow-hidden">
  <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
    <div>
      <div class="inline-flex items-center gap-1.5 bg-orange-950/30 text-orange-100 px-3 py-1 rounded-full text-xs font-medium mb-2 border border-orange-400/30 backdrop-blur-xs">
        <CalendarCheck class="w-3.5 h-3.5 text-amber-300" />
        <span>{facilityConfig.roomName} • {facilityConfig.roomLocation}</span>
      </div>
      <h2 class="text-2xl md:text-3xl font-extrabold tracking-tight">ปฏิทินตรวจสอบและจองห้องประชุม</h2>
      <p class="text-orange-100 text-xs md:text-sm mt-1 max-w-xl font-light">เวลาทำการ {facilityConfig.openTime} - {facilityConfig.closeTime} น. • จองล่วงหน้าได้สูงสุด {facilityConfig.maxAdvanceBookingDays} วัน</p>
    </div>
    <div class="flex items-center gap-2.5">
      <a href="/" class="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2.5 rounded-xl border border-white/20 transition active-press flex items-center gap-1.5">
        <ArrowLeft class="w-3.5 h-3.5" /> กลับหน้าหลัก
      </a>
      <a href="/track" class="bg-white text-orange-600 hover:bg-orange-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-warm-xs transition active-press flex items-center gap-1.5">
        <Search class="w-3.5 h-3.5" /> ตรวจสอบสถานะการจอง
      </a>
    </div>
  </div>
</section>
