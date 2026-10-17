<script lang="ts">
  import { page } from '$app/state';
  import {
    Calendar as CalendarIcon,
    Landmark,
    Lock,
    Search,
    Menu,
    X,
  } from 'lucide-svelte';

  interface Props {
    siteTitle?: string;
    siteSubtitle?: string;
    activeTab?: 'home' | 'booking' | 'track' | 'admin' | 'none';
  }

  let {
    siteTitle = 'สภานักศึกษา มจพ.',
    siteSubtitle = 'Student Council KMUTNB',
    activeTab,
  }: Props = $props();

  let mobileMenuOpen = $state(false);

  // Derive active tab from props or current pathname
  const currentTab = $derived.by(() => {
    if (activeTab) return activeTab;
    const pathname = page.url.pathname;
    if (pathname === '/' || pathname === '/m') return 'home';
    if (pathname.startsWith('/booking') || pathname.startsWith('/m/booking')) return 'booking';
    if (pathname.startsWith('/track') || pathname.startsWith('/m/track')) return 'track';
    if (pathname.startsWith('/admin')) return 'admin';
    return 'none';
  });
</script>

<header class="sticky top-0 z-40 bg-orange-600/95 backdrop-blur-md border-b border-orange-500/40 text-white shadow-warm-xs transition-all">
  <div class="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
    <!-- Brand / Logo -->
    <a href="/" class="flex items-center space-x-3 group">
      <div class="bg-white text-orange-600 p-2 rounded-2xl font-bold w-10 h-10 flex items-center justify-center shadow-warm-xs group-hover:scale-105 transition-transform duration-200">
        <Landmark class="w-5 h-5 stroke-[2.2]" />
      </div>
      <div>
        <h1 class="font-bold text-base leading-tight tracking-tight text-white drop-shadow-2xs">
          {siteTitle}
        </h1>
        <p class="text-[11px] text-orange-100 font-medium tracking-wide">
          {siteSubtitle}
        </p>
      </div>
    </a>

    <!-- Desktop Navigation Links -->
    <nav class="hidden md:flex items-center space-x-1.5 text-sm font-medium">
      <a
        href="/"
        class="px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 {currentTab === 'home'
          ? 'bg-orange-700/70 text-white font-semibold shadow-inner border border-orange-400/40'
          : 'text-orange-100 hover:text-white hover:bg-orange-500/40'}"
      >
        หน้าหลัก
      </a>

      <a
        href="/booking"
        class="px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 {currentTab === 'booking'
          ? 'bg-orange-700/70 text-white font-semibold shadow-inner border border-orange-400/40'
          : 'text-orange-100 hover:text-white hover:bg-orange-500/40'}"
      >
        <CalendarIcon class="w-4 h-4 stroke-[2]" /> จองห้องประชุม
      </a>

      <a
        href="/track"
        class="px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 {currentTab === 'track'
          ? 'bg-orange-700/70 text-white font-semibold shadow-inner border border-orange-400/40'
          : 'text-orange-100 hover:text-white hover:bg-orange-500/40'}"
      >
        <Search class="w-4 h-4 stroke-[2]" /> ตรวจสอบสถานะ
      </a>

      <div class="pl-2">
        <a
          href="/admin/login"
          class="bg-orange-950/40 hover:bg-orange-950/60 text-orange-100 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-orange-400/30 shadow-xs transition active-press flex items-center gap-1.5 {currentTab === 'admin'
            ? 'ring-2 ring-white/50 text-white'
            : ''}"
        >
          <Lock class="w-3.5 h-3.5" /> แอดมิน
        </a>
      </div>
    </nav>

    <!-- Mobile Hamburger Toggle -->
    <div class="flex items-center gap-2 md:hidden">
      <a
        href="/admin/login"
        class="text-xs bg-orange-950/30 text-orange-100 border border-orange-400/30 px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-medium"
      >
        <Lock class="w-3 h-3" /> แอดมิน
      </a>
      <button
        type="button"
        class="p-2 text-white hover:bg-orange-500/40 rounded-xl transition focus:outline-hidden"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
        aria-label="เมนูหลัก"
      >
        {#if mobileMenuOpen}
          <X class="w-6 h-6" />
        {:else}
          <Menu class="w-6 h-6" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile Dropdown Menu -->
  {#if mobileMenuOpen}
    <div class="md:hidden border-t border-orange-500/30 bg-orange-600 px-4 py-3 space-y-1.5">
      <a
        href="/"
        onclick={() => (mobileMenuOpen = false)}
        class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium {currentTab === 'home'
          ? 'bg-orange-700/80 text-white font-semibold shadow-inner'
          : 'text-orange-100 hover:bg-orange-500/40'}"
      >
        หน้าหลัก
      </a>
      <a
        href="/booking"
        onclick={() => (mobileMenuOpen = false)}
        class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium {currentTab === 'booking'
          ? 'bg-orange-700/80 text-white font-semibold shadow-inner'
          : 'text-orange-100 hover:bg-orange-500/40'}"
      >
        <CalendarIcon class="w-4 h-4" /> จองห้องประชุม
      </a>
      <a
        href="/track"
        onclick={() => (mobileMenuOpen = false)}
        class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium {currentTab === 'track'
          ? 'bg-orange-700/80 text-white font-semibold shadow-inner'
          : 'text-orange-100 hover:bg-orange-500/40'}"
      >
        <Search class="w-4 h-4" /> ตรวจสอบสถานะการจอง
      </a>
    </div>
  {/if}
</header>
