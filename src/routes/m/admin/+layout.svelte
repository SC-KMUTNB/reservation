<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import {
    LayoutDashboard,
    FileSpreadsheet,
    Settings,
    History,
    User,
    LogOut,
    Shield,
    RotateCw,
    Sparkles,
    Database,
  } from 'lucide-svelte';
  import ViewSwitcherFooter from '$lib/components/mobile/ViewSwitcherFooter.svelte';
  import ClaimUsernameModal from '$lib/components/admin/ClaimUsernameModal.svelte';

  interface AdminUser {
    id: string;
    email: string;
    username?: string | null;
    fullName: string;
    role: 'SUPER_ADMIN' | 'ADMIN';
  }

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  let user = $state<AdminUser | null>(null);
  let isLoading = $state(true);
  let isClaimModalOpen = $state(false);

  const pathname = $derived(page.url.pathname);
  const isAuthRoute = $derived(pathname === '/m/admin/login' || pathname === '/m/admin/setup-password');
  const isSuperAdmin = $derived(user?.role === 'SUPER_ADMIN');

  onMount(async () => {
    if (isAuthRoute) {
      isLoading = false;
      return;
    }

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        user = data.user;

        const dismissed =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('username_prompt_dismissed')
            : null;
        if (!data.user?.username && !dismissed) {
          isClaimModalOpen = true;
        }
      } else {
        goto('/m/admin/login');
      }
    } catch (e) {
      console.error(e);
      goto('/m/admin/login');
    } finally {
      isLoading = false;
    }
  });

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      goto('/m/admin/login');
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = $derived([
    {
      label: 'คำขอ',
      href: '/m/admin/dashboard',
      icon: LayoutDashboard,
      isActive: pathname === '/m/admin/dashboard',
    },
    {
      label: 'รายงาน',
      href: '/m/admin/reports',
      icon: FileSpreadsheet,
      isActive: pathname === '/m/admin/reports',
    },
    ...(isSuperAdmin
      ? [
          {
            label: 'สำรองข้อมูล',
            href: '/m/admin/backups',
            icon: Database,
            isActive: pathname === '/m/admin/backups',
          },
          {
            label: 'ตั้งค่า',
            href: '/m/admin/settings',
            icon: Settings,
            isActive: pathname === '/m/admin/settings',
          },
          {
            label: 'บันทึก',
            href: '/m/admin/logs',
            icon: History,
            isActive: pathname === '/m/admin/logs',
          },
        ]
      : []),
    {
      label: 'บัญชี',
      href: '/m/admin/profile',
      icon: User,
      isActive: pathname === '/m/admin/profile',
    },
  ]);
</script>

{#if isAuthRoute}
  {#if children}
    {@render children()}
  {/if}
{:else if isLoading}
  <div class="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
    <RotateCw class="w-8 h-8 text-orange-500 animate-spin" />
    <div class="text-xs font-medium">กำลังยืนยันสิทธิ์ผู้ดูแลระบบ...</div>
  </div>
{:else}
  <div class="min-h-screen flex flex-col bg-slate-50">
    <!-- Mobile Admin Header -->
    <header class="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div class="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="bg-orange-600 text-white p-1.5 rounded-xl font-bold w-8 h-8 flex items-center justify-center shadow-xs">
            <Shield class="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div class="font-bold text-xs text-white flex items-center gap-1.5">
              <span>{user?.fullName || 'ผู้ดูแลระบบ'}</span>
              <span class="text-[9px] bg-orange-950 text-orange-400 border border-orange-700/50 px-1.5 py-0.2 rounded-full font-bold">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-[10px] font-mono">
              {#if user?.username}
                <span class="text-orange-400 font-medium">@{user.username}</span>
              {:else}
                <button
                  onclick={() => (isClaimModalOpen = true)}
                  class="text-[9px] text-amber-400 underline font-medium cursor-pointer"
                >
                  + ตั้ง Username
                </button>
              {/if}
              <span class="text-slate-400 truncate max-w-[140px]">{user?.email}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-1">
          <a
            href="/m/admin/changelog"
            title="ประวัติการอัปเดตระบบ"
            class="p-1.5 rounded-xl transition cursor-pointer {pathname === '/m/admin/changelog'
              ? 'bg-orange-500/20 text-orange-400'
              : 'text-slate-400 hover:text-orange-400 active:bg-slate-800'}"
          >
            <Sparkles class="w-4 h-4" />
          </a>

          <button
            onclick={handleLogout}
            title="ออกจากระบบ"
            class="text-slate-400 hover:text-red-400 p-1.5 rounded-xl active:bg-slate-800 transition cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>

    <!-- Main Admin Content -->
    <main class="flex-1 pb-20">
      {#if children}
        {@render children()}
      {/if}
    </main>

    <!-- Switch to Desktop Footer -->
    <ViewSwitcherFooter currentMode="mobile" />

    <!-- Fixed Admin Bottom Navigation Bar -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 shadow-xl px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <div class="max-w-md mx-auto flex items-center justify-around">
        {#each navItems as item (item.href)}
          {@const Icon = item.icon}
          {@const active = item.isActive}
          <a
            href={item.href}
            class="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all {active
              ? 'text-orange-500 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 font-medium'}"
          >
            <div
              class="p-1.5 rounded-xl transition-colors {active ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400'}"
            >
              <Icon class="w-5 h-5 stroke-[2.2]" />
            </div>
            <span class="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
          </a>
        {/each}
      </div>
    </nav>

    <!-- First-time Username Claim Modal -->
    <ClaimUsernameModal
      isOpen={isClaimModalOpen}
      userFullName={user?.fullName}
      onClose={() => (isClaimModalOpen = false)}
      onSuccess={(claimedUsername) => {
        if (user) user.username = claimedUsername;
        isClaimModalOpen = false;
      }}
    />
  </div>
{/if}
