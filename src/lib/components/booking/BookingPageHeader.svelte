<script lang="ts">
  import { CalendarCheck, ArrowLeft, Search } from 'lucide-svelte';
  import type { FacilityConfig } from '$lib/facility-config';
  import AppHeader from '$lib/components/ui/AppHeader.svelte';

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

<AppHeader {siteTitle} {siteSubtitle} activeTab="booking" />

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
