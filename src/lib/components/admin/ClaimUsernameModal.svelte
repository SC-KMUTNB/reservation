<script lang="ts">
	import {
		Sparkles,
		CheckCircle2,
		AlertCircle,
		X,
		Loader2,
		ArrowRight,
		ShieldCheck
	} from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		userFullName?: string;
		onClose: () => void;
		onSuccess: (claimedUsername: string) => void;
	}

	let { isOpen, userFullName, onClose, onSuccess }: Props = $props();

	let username = $state('');
	let isChecking = $state(false);
	let isAvailable = $state<boolean | null>(null);
	let availabilityMessage = $state<string | null>(null);
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/;

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const trimmed = username.trim().toLowerCase();
		if (debounceTimer) clearTimeout(debounceTimer);

		if (!trimmed) {
			isAvailable = null;
			availabilityMessage = null;
			return;
		}

		if (!USERNAME_REGEX.test(trimmed)) {
			isAvailable = false;
			availabilityMessage =
				'ความยาว 3-20 ตัวอักษร ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ _ . - เท่านั้น';
			return;
		}

		debounceTimer = setTimeout(async () => {
			isChecking = true;
			try {
				const res = await fetch(
					`/api/auth/claim-username?username=${encodeURIComponent(trimmed)}`
				);
				const data = await res.json();
				if (data.available) {
					isAvailable = true;
					availabilityMessage = 'ชื่อผู้ใช้นี้สามารถใช้งานได้';
				} else {
					isAvailable = false;
					availabilityMessage = data.error || 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว';
				}
			} catch {
				isAvailable = null;
				availabilityMessage = null;
			} finally {
				isChecking = false;
			}
		}, 400);

		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
		};
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const cleanUsername = username.trim().toLowerCase();

		if (!cleanUsername || !USERNAME_REGEX.test(cleanUsername)) {
			error = 'กรุณากรอกชื่อผู้ใช้ให้ถูกต้องตามรูปแบบ';
			return;
		}

		error = null;
		isSubmitting = true;

		try {
			const res = await fetch('/api/auth/claim-username', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: cleanUsername })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || 'ไม่สามารถบันทึกชื่อผู้ใช้ได้';
				return;
			}

			onSuccess(cleanUsername);
		} catch {
			error = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
		} finally {
			isSubmitting = false;
		}
	}

	function handleDismiss() {
		try {
			sessionStorage.setItem('username_prompt_dismissed', 'true');
		} catch {}
		onClose();
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
		<div class="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
			<div class="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

			<button
				onclick={handleDismiss}
				class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition cursor-pointer z-10"
				title="ไว้คราวหลัง"
			>
				<X class="w-5 h-5" />
			</button>

			<div class="overflow-y-auto flex-1 pr-1 -mr-1 relative">
				<div class="flex items-center gap-3 mb-4">
					<div class="w-12 h-12 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
						<Sparkles class="w-6 h-6 text-white" />
					</div>
					<div>
						<div class="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 mb-0.5">
							<ShieldCheck class="w-3 h-3" /> แนะนำสำหรับแอดมิน
						</div>
						<h2 class="text-base sm:text-lg font-bold text-white">
							ตั้งชื่อผู้ใช้ (Claim Username)
						</h2>
					</div>
				</div>

				<p class="text-xs text-slate-300 leading-relaxed mb-4">
					ยินดีต้อนรับ {userFullName ? userFullName : 'คุณ'}! เพื่อความสะดวกในการเข้าสู่ระบบครั้งถัดไป คุณสามารถตั้ง <b class="text-orange-400">Username</b> สั้นๆ แทนการพิมพ์อีเมลยาวๆ ได้แล้ววันนี้
				</p>

				{#if error}
					<div class="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
						<AlertCircle class="w-4 h-4 shrink-0 text-rose-400" />
						<span>{error}</span>
					</div>
				{/if}

				<form id="claim-username-form" onsubmit={handleSubmit} class="space-y-4">
					<div>
						<label class="block text-xs font-semibold text-slate-300 mb-1.5" for="claim-input">
							ชื่อผู้ใช้ที่ต้องการ (Username)
						</label>
						<div class="relative">
							<span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400 font-bold font-mono text-sm">
								@
							</span>
							<input
								id="claim-input"
								type="text"
								required
								autocapitalize="none"
								autocorrect="off"
								spellcheck="false"
								maxlength={20}
								bind:value={username}
								placeholder="somchai.k หรือ admin_sc"
								class="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
							/>
							<div class="absolute right-3 top-1/2 -translate-y-1/2">
								{#if isChecking}
									<Loader2 class="w-4 h-4 text-orange-400 animate-spin" />
								{:else if isAvailable === true}
									<CheckCircle2 class="w-4 h-4 text-emerald-400" />
								{:else if isAvailable === false}
									<AlertCircle class="w-4 h-4 text-rose-400" />
								{/if}
							</div>
						</div>

						{#if availabilityMessage}
							<div
								class={`mt-1.5 text-[11px] flex items-center gap-1.5 ${
									isAvailable ? 'text-emerald-400' : 'text-rose-400'
								}`}
							>
								<span>{availabilityMessage}</span>
							</div>
						{/if}

						<div class="mt-1 text-[10px] text-slate-400">
							* 3-20 ตัวอักษร (a-z, 0-9, จุด ., ขีดล่าง _, ขีดกลาง -)
						</div>
					</div>
				</form>
			</div>

			<div class="flex items-center gap-2.5 pt-3 border-t border-slate-800 shrink-0 mt-2">
				<button
					type="button"
					onclick={handleDismiss}
					class="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
				>
					ไว้คราวหลัง
				</button>
				<button
					type="submit"
					form="claim-username-form"
					disabled={isSubmitting || isAvailable === false || !username.trim()}
					class="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition shadow-lg shadow-orange-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
				>
					{#if isSubmitting}
						<Loader2 class="w-3.5 h-3.5 animate-spin" />
						<span>กำลังบันทึก...</span>
					{:else}
						<span>ยืนยันชื่อผู้ใช้</span>
						<ArrowRight class="w-3.5 h-3.5" />
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
