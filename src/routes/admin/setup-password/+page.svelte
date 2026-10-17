<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		Landmark,
		Lock,
		AlertCircle,
		RotateCw,
		ArrowRight,
		KeyRound
	} from 'lucide-svelte';

	interface InviteInfo {
		email: string;
		fullName: string;
		role: 'SUPER_ADMIN' | 'ADMIN';
		suggestedUsername?: string;
	}

	let token = $derived(page.url.searchParams.get('token'));

	let isLoading = $state(true);
	let tokenError = $state<string | null>(null);
	let inviteInfo = $state<InviteInfo | null>(null);

	let password = $state('');
	let confirmPassword = $state('');
	let username = $state('');
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	onMount(() => {
		if (!token) {
			tokenError = 'ไม่พบรหัสโทเค็นในลิงก์คำเชิญ กรุณาตรวจสอบอีเมลอีกครั้ง';
			isLoading = false;
			return;
		}

		const verifyToken = async () => {
			try {
				const res = await fetch(`/api/auth/setup-password?token=${encodeURIComponent(token)}`);
				const data = await res.json();

				if (!res.ok || !data.valid) {
					tokenError = data.error || 'ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว';
				} else {
					inviteInfo = data.user;
					if (data.user?.suggestedUsername) {
						username = data.user.suggestedUsername;
					}
				}
			} catch (err) {
				console.error(err);
				tokenError = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบลิงก์คำเชิญได้';
			} finally {
				isLoading = false;
			}
		};

		verifyToken();
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitError = null;

		if (password.length < 6) {
			submitError = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
			return;
		}

		if (password !== confirmPassword) {
			submitError = 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน';
			return;
		}

		isSubmitting = true;

		try {
			const res = await fetch('/api/auth/setup-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token,
					password,
					username: username.trim() || undefined
				})
			});

			const data = await res.json();

			if (!res.ok) {
				submitError = data.error || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่าน';
				return;
			}

			goto('/admin/dashboard');
		} catch (err) {
			console.error(err);
			submitError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>สร้างรหัสผ่านผู้ดูแลระบบ - สภานักศึกษา มจพ.</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
	<div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

	<div class="max-w-md w-full relative z-10">
		<div class="text-center mb-6">
			<div class="w-14 h-14 bg-gradient-to-tr from-orange-600 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-600/30">
				<Landmark class="w-7 h-7" />
			</div>
			<h1 class="text-2xl font-black text-white tracking-tight">
				สร้างรหัสผ่านผู้ดูแลระบบ
			</h1>
			<p class="text-slate-400 text-xs mt-1">
				สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
			</p>
		</div>

		{#if isLoading}
			<div class="text-center py-16">
				<RotateCw class="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
				<div class="text-slate-300 text-xs font-medium">กำลังตรวจสอบลิงก์คำเชิญ...</div>
			</div>
		{:else if tokenError}
			<div class="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-4">
				<div class="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
					<AlertCircle class="w-7 h-7" />
				</div>
				<h3 class="text-lg font-bold text-white">ลิงก์คำเชิญไม่สามารถใช้งานได้</h3>
				<p class="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">{tokenError}</p>
				<div class="pt-2">
					<a
						href="/admin/login"
						class="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition"
					>
						ไปยังหน้าเข้าสู่ระบบ &rarr;
					</a>
				</div>
			</div>
		{:else}
			<div class="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
				<div class="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
							{inviteInfo?.fullName.slice(0, 1) || 'A'}
						</div>
						<div>
							<div class="font-bold text-xs text-white">{inviteInfo?.fullName}</div>
							<div class="text-[11px] text-slate-400 font-mono">{inviteInfo?.email}</div>
						</div>
					</div>
					<span
						class={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
							inviteInfo?.role === 'SUPER_ADMIN'
								? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
								: 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
						}`}
					>
						{inviteInfo?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
					</span>
				</div>

				{#if submitError}
					<div class="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl flex items-center gap-2">
						<AlertCircle class="w-4 h-4 shrink-0 text-rose-400" />
						<span>{submitError}</span>
					</div>
				{/if}

				<form onsubmit={handleSubmit} class="space-y-4 text-xs">
					<div>
						<label class="block text-slate-300 font-semibold mb-1" for="username-input">
							ตั้งชื่อผู้ใช้ (Username สำหรับเข้าสู่ระบบ)
						</label>
						<div class="relative">
							<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400 font-bold font-mono text-sm">
								@
							</span>
							<input
								id="username-input"
								type="text"
								autocapitalize="none"
								autocorrect="off"
								maxlength={20}
								bind:value={username}
								placeholder="เช่น somchai.k หรือ admin_sc"
								class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
							/>
						</div>
						<p class="text-[10px] text-slate-400 mt-1">
							สามารถใช้ชื่อผู้ใช้นี้เข้าสู่ระบบแทนการพิมพ์อีเมลยาวๆ ได้
						</p>
					</div>

					<div>
						<label class="block text-slate-300 font-semibold mb-1" for="new-password">
							กำหนดรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
						</label>
						<div class="relative">
							<Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
							<input
								id="new-password"
								type="password"
								required
								minlength={6}
								bind:value={password}
								placeholder="••••••••"
								class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
							/>
						</div>
					</div>

					<div>
						<label class="block text-slate-300 font-semibold mb-1" for="confirm-password">
							ยืนยันรหัสผ่านใหม่อีกครั้ง
						</label>
						<div class="relative">
							<KeyRound class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
							<input
								id="confirm-password"
								type="password"
								required
								minlength={6}
								bind:value={confirmPassword}
								placeholder="••••••••"
								class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
					>
						{#if isSubmitting}
							<RotateCw class="w-4 h-4 animate-spin" />
							<span>กำลังบันทึกรหัสผ่าน...</span>
						{:else}
							<span>บันทึกรหัสผ่านและเข้าสู่ระบบ</span>
							<ArrowRight class="w-4 h-4" />
						{/if}
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
