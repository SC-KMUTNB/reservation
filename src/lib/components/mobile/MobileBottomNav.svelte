<script lang="ts">
  import { page } from '$app/state';
  import { Home, CalendarCheck, Search, Shield } from 'lucide-svelte';

  const pathname = $derived(page.url.pathname);

  const navItems = $derived([
    {
      label: 'หน้าแรก',
      href: '/m',
      icon: Home,
      isActive: pathname === '/m',
    },
    {
      label: 'จองห้อง',
      href: '/m/booking',
      icon: CalendarCheck,
      isActive: pathname === '/m/booking',
    },
    {
      label: 'ติดตามผล',
      href: '/m/track',
      icon: Search,
      isActive: pathname === '/m/track',
    },
    {
      label: 'ผู้ดูแล',
      href: '/m/admin/dashboard',
      icon: Shield,
      isActive: pathname.startsWith('/m/admin'),
    },
  ]);
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
  <div class="max-w-md mx-auto flex items-center justify-around">
    {#each navItems as item (item.href)}
      {@const Icon = item.icon}
      {@const active = item.isActive}
      <a
        href={item.href}
        class="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 {active
          ? 'text-orange-600 font-bold scale-105'
          : 'text-slate-600 hover:text-slate-800 font-medium'}"
      >
        <div
          class="p-1.5 rounded-xl transition-colors {active ? 'bg-orange-100 text-orange-600' : 'text-slate-600'}"
        >
          <Icon class="w-5 h-5 stroke-[2.2]" />
        </div>
        <span class="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
      </a>
    {/each}
  </div>
</nav>
