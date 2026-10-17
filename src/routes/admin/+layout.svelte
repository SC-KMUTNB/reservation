<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		LayoutDashboard,
		FileSpreadsheet,
		History,
		Users,
		Settings,
		LogOut,
		Landmark,
		Menu,
		X,
		ExternalLink,
		UserCheck,
		Sparkles
	} from 'lucide-svelte';
	import ClaimUsernameModal from '$lib/components/admin/ClaimUsernameModal.svelte';

	let { children } = $props();

	interface AdminUser {
		id: string;
		email: string;
		username?: string | null;
		fullName: string;
		role: 'SUPER_ADMIN' | 'ADMIN';
	}

	let user = $state<AdminUser | null>(null);
	let isLoading = $state(true);
	let isMobileMenuOpen = $state(false);
	let isClaimModalOpen = $state(false);

	let pathname = $derived(page.url.pathname);

	onMount(() => {
		if (pathname === '/admin/login' || pathname === '/admin/setup-password') {
			isLoading = false;
			return;
		}

		const checkAuth = async () => {
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
					goto('/admin/login');
				}
			} catch (e) {
				console.error(e);
				goto('/admin/login');
			} finally {
				isLoading = false;
			}
		};

		checkAuth();
	});

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			goto('/admin/login');
		} catch (e) {
			console.error(e);
		}
	}

	let isSuperAdmin = $derived(user?.role === 'SUPER_ADMIN');

	let navItems = $derived([
		{
			label: 'แผงควบคุมการจอง',
			href: '/admin/dashboard',
			icon: LayoutDashboard,
			desc: 'อนุมัติและจัดการคำขอ'
		},
		{
			label: 'รายงานสำหรับผู้บริหาร',
			href: '/admin/reports',
			icon: FileSpreadsheet,
			desc: 'ส่งออกไฟล์ Excel'
		},
		{
			label: 'ประวัติการทำงาน (Logs)',
			href: '/admin/logs',
			icon: History,
			desc: 'บันทึกการตรวจสอบระบบ'
		},
		{
			label: 'โปรไฟล์ของฉัน',
			href: '/admin/profile',
			icon: UserCheck,
			desc: 'จัดการบัญชีและเชื่อม Google'
		},
		{
			label: 'บันทึกการอัปเดตระบบ',
			href: '/admin/changelog',
			icon: Sparkles,
			desc: 'ประวัติเวอร์ชัน & การเปลี่ยนแปลง'
		},
		...(isSuperAdmin
			? [
					{
						label: 'จัดการผู้ดูแลระบบ',
						href: '/admin/users',
						icon: Users,
						desc: 'เพิ่ม/แก้ไขสิทธิ์เจ้าหน้าที่'
					},
					{
						label: 'ตั้งค่าระบบ & โซเชียล',
						href: '/admin/settings',
						icon: Settings,
						desc: 'ปรับแต่งเนื้อหาและกฎ'
					}
				]
			: [])
	]);
</script>

{#if pathname === '/admin/login' || pathname === '/admin/setup-password'}
	{@render children()}
{:else if isLoading}
	<div class="min-h-dvh flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
		<div class="w-10 h-10 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
		<div class="text-xs font-medium tracking-wide">กำลังยืนยันสิทธิ์ผู้ดูแลระบบ...</div>
	</div>
{:else}
	<div class="min-h-dvh bg-slate-100/90 text-slate-800 flex flex-col md:flex-row antialiased selection:bg-orange-500 selection:text-white">
		<aside class="w-full md:w-68 bg-[#090d16] text-white flex flex-col shrink-0 border-r border-slate-800/80 shadow-2xl relative z-30">
			<div class="p-5 border-b border-slate-800/70 flex justify-between items-center">
				<a href="/admin/dashboard" class="flex items-center space-x-3 group">
					<div class="bg-gradient-to-tr from-orange-600 to-amber-500 text-white p-2 rounded-2xl shadow-warm-xs group-hover:scale-105 transition-transform">
						<Landmark class="w-5 h-5 stroke-[2.2]" />
					</div>
					<div>
						<div class="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
							<span>สภานักศึกษา มจพ.</span>
						</div>
						<div class="text-[10px] text-orange-400 font-bold tracking-widest uppercase font-mono">
							Admin Console
						</div>
					</div>
				</a>
				<button
					onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
					class="md:hidden text-slate-400 hover:text-white p-1 rounded-xl cursor-pointer"
				>
					{#if isMobileMenuOpen}
						<X class="w-5 h-5" />
					{:else}
						<Menu class="w-5 h-5" />
					{/if}
				</button>
			</div>

			{#if user}
				<div class="mx-3.5 my-3.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-3">
					<div class="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
						{user.fullName.slice(0, 2)}
					</div>
					<div class="truncate flex-grow">
						<div class="font-semibold text-white text-xs truncate leading-snug">{user.fullName}</div>
						<div class="flex items-center gap-1.5 mt-0.5">
							{#if user.username}
								<span class="text-[10px] text-orange-400 font-mono font-medium">@{user.username}</span>
							{:else}
								<button
									onclick={() => (isClaimModalOpen = true)}
									class="text-[9px] text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer"
								>
									+ ตั้ง Username
								</button>
							{/if}
							<span
								class={`inline-block px-1.5 py-0.2 rounded-md font-bold text-[9px] uppercase tracking-wide ${
									user.role === 'SUPER_ADMIN'
										? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
										: 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
								}`}
							>
								{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff Admin'}
							</span>
						</div>
					</div>
				</div>
			{/if}

			<nav class={`px-3 py-2 space-y-1 flex-grow ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
				<div class="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
					เมนูการจัดการ
				</div>
				{#each navItems as item}
					{@const isActive = pathname === item.href}
					{@const Icon = item.icon}
					<a
						href={item.href}
						onclick={() => (isMobileMenuOpen = false)}
						class={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group active-press ${
							isActive
								? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-warm-xs'
								: 'text-slate-400 hover:text-white hover:bg-slate-900/80'
						}`}
					>
						<div class="flex items-center gap-3 min-w-0">
							<Icon class={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'}`} />
							<div class="truncate">
								<div>{item.label}</div>
							</div>
						</div>
						{#if isActive}
							<div class="w-1.5 h-1.5 rounded-full bg-white ml-2"></div>
						{/if}
					</a>
				{/each}

				<div class="pt-4 border-t border-slate-800/80 mt-4 space-y-1">
					<a
						href="/"
						target="_blank"
						class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900/80 transition active-press"
					>
						<div class="flex items-center gap-3">
							<ExternalLink class="w-4 h-4 text-slate-500" />
							<span>เปิดดูหน้าเว็บหลัก</span>
						</div>
					</a>

					<button
						onclick={handleLogout}
						class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition active-press cursor-pointer text-left"
					>
						<div class="flex items-center gap-3">
							<LogOut class="w-4 h-4 text-rose-400" />
							<span>ออกจากระบบ</span>
						</div>
					</button>
				</div>
			</nav>
		</aside>

		<main class="flex-grow p-4 md:p-8 overflow-y-auto max-h-screen">
			<div class="max-w-6xl mx-auto space-y-6">
				{@render children()}
			</div>
		</main>

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
