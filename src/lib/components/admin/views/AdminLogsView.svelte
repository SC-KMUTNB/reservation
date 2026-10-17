<script lang="ts">
	import { onMount } from 'svelte';
	import {
		History,
		CheckCircle,
		XCircle,
		Activity,
		LogIn,
		Settings,
		Clock,
		Globe,
		Trash2,
		CalendarX2,
		AlertTriangle,
		X,
		RotateCw
	} from 'lucide-svelte';

	interface AuditLogItem {
		id: string;
		action: string;
		details: string;
		actorName: string;
		actorEmail?: string;
		actorRole?: string;
		ipAddress?: string;
		bookingId?: string;
		createdAt: string;
		booking?: {
			id?: string;
			bookingCode: string;
			fullName: string;
			date: string;
		};
	}

	const ACTION_TABS = [
		{ id: 'ALL', label: 'ทั้งหมด' },
		{ id: 'BOOKING_APPROVED', label: 'อนุมัติการจอง' },
		{ id: 'BOOKING_REJECTED', label: 'ปฏิเสธการจอง' },
		{ id: 'BOOKING_CREATED', label: 'สร้างคำขอใหม่' },
		{ id: 'ADMIN_LOGIN', label: 'เข้าสู่ระบบ' },
		{ id: 'SETTINGS', label: 'แก้ไขการตั้งค่า' },
		{ id: 'FAILED', label: 'รายการล้มเหลว' }
	];

	type ConfirmMode = 'all' | 'before' | null;

	let logs = $state<AuditLogItem[]>([]);
	let actionFilter = $state('ALL');
	let isLoading = $state(true);
	let isSuperAdmin = $state(false);

	let confirmMode = $state<ConfirmMode>(null);
	let beforeDate = $state('');
	let isClearing = $state(false);
	let clearResult = $state<string | null>(null);

	let retryingLogId = $state<string | null>(null);
	let retryResult = $state<string | null>(null);

	onMount(() => {
		fetch('/api/auth/me')
			.then((r) => r.json())
			.then((data) => {
				if (data.user?.role === 'SUPER_ADMIN') isSuperAdmin = true;
			})
			.catch(() => {});
	});

	$effect(() => {
		fetchLogs(actionFilter);
	});

	async function fetchLogs(action: string) {
		isLoading = true;
		try {
			const res = await fetch(`/api/logs?action=${action}`);
			if (res.ok) {
				const data = await res.json();
				let loadedLogs: AuditLogItem[] = data.logs || [];
				if (action === 'FAILED') {
					loadedLogs = loadedLogs.filter((l) => l.action.includes('FAILED'));
				}
				logs = loadedLogs;
			}
		} catch (e) {
			console.error(e);
		} finally {
			isLoading = false;
		}
	}

	async function handleRetrySyncFromLog(logId: string, bookingCodeOrId?: string) {
		if (!bookingCodeOrId) return;
		retryingLogId = logId;
		retryResult = null;
		try {
			const res = await fetch('/api/admin/retry-sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bookingCode: bookingCodeOrId, syncType: 'ALL' })
			});
			const data = await res.json();
			if (!res.ok) {
				retryResult = `ซิงก์ซ้ำล้มเหลว: ${data.error || 'ไม่ทราบสาเหตุ'}`;
			} else {
				retryResult = `ซิงก์ข้อมูลและส่งอีเมลซ้ำสำหรับ ${bookingCodeOrId} สำเร็จ`;
				fetchLogs(actionFilter);
			}
		} catch {
			retryResult = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
		} finally {
			retryingLogId = null;
		}
	}

	async function handleClear() {
		if (!confirmMode) return;
		setIsClearing(true);
		try {
			let url = '/api/logs?mode=all';
			if (confirmMode === 'before') {
				if (!beforeDate) return;
				url = `/api/logs?mode=before&before=${encodeURIComponent(new Date(beforeDate).toISOString())}`;
			}
			const res = await fetch(url, { method: 'DELETE' });
			const data = await res.json();
			if (res.ok) {
				clearResult = `ล้างบันทึกสำเร็จ — ${data.deletedCount} รายการถูกลบ`;
				fetchLogs(actionFilter);
			} else {
				clearResult = `เกิดข้อผิดพลาด: ${data.error}`;
			}
		} catch {
			clearResult = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
		} finally {
			isClearing = false;
			confirmMode = null;
			beforeDate = '';
		}
	}

	function setIsClearing(val: boolean) {
		isClearing = val;
	}
</script>

<svelte:head>
	<title>บันทึกการตรวจสอบระบบ (Audit Logs) - สภานักศึกษา มจพ.</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
		<div>
			<h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
				บันทึกการตรวจสอบระบบ (Audit Logs)
			</h2>
			<p class="text-xs text-slate-500 mt-1 font-light">
				บันทึกประวัติการกระทำทั้งหมดในระบบโดยอัตโนมัติ เพื่อความโปร่งใสและตรวจสอบย้อนหลังได้
			</p>
		</div>

		{#if isSuperAdmin}
			<div class="flex items-center gap-2 shrink-0">
				<button
					onclick={() => (confirmMode = 'before')}
					class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active-press cursor-pointer"
				>
					<CalendarX2 class="w-3.5 h-3.5" />
					ล้างตามวันที่
				</button>
				<button
					onclick={() => (confirmMode = 'all')}
					class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition active-press cursor-pointer"
				>
					<Trash2 class="w-3.5 h-3.5" />
					ล้างทั้งหมด
				</button>
			</div>
		{/if}
	</div>

	{#if clearResult}
		<div class="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl">
			<span>{clearResult}</span>
			<button onclick={() => (clearResult = null)} class="text-emerald-600 hover:text-emerald-800 cursor-pointer">
				<X class="w-3.5 h-3.5" />
			</button>
		</div>
	{/if}

	{#if retryResult}
		<div class="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-3 rounded-2xl">
			<span>{retryResult}</span>
			<button onclick={() => (retryResult = null)} class="text-blue-600 hover:text-blue-800 cursor-pointer">
				<X class="w-3.5 h-3.5" />
			</button>
		</div>
	{/if}

	<div class="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-5">
		<div class="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto">
			{#each ACTION_TABS as tab}
				<button
					onclick={() => (actionFilter = tab.id)}
					class={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
						actionFilter === tab.id
							? 'bg-white text-slate-900 shadow-xs'
							: 'text-slate-500 hover:text-slate-900'
					}`}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="space-y-3">
			{#if isLoading}
				<div class="p-10 text-center text-slate-400 text-xs">
					กำลังโหลดบันทึกการตรวจสอบ...
				</div>
			{:else if logs.length === 0}
				<div class="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
					<History class="w-8 h-8 text-slate-300 mx-auto mb-2" />
					<div class="text-xs">ไม่พบบันทึกการตรวจสอบในหมวดหมู่นี้</div>
				</div>
			{:else}
				{#each logs as log}
					{@const formattedDate = new Date(log.createdAt).toLocaleString('th-TH', {
						dateStyle: 'medium',
						timeStyle: 'short'
					})}
					{@const isFailedSync =
						log.action === 'EMAIL_DELIVERY_FAILED' ||
						log.action === 'SHEET_SYNC_FAILED' ||
						log.action.includes('FAILED')}
					{@const targetBookingCode = log.booking?.bookingCode || log.bookingId}

					<div class="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 p-4 rounded-2xl transition space-y-2.5">
						<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
							<div class="flex items-center gap-2 flex-wrap">
								{#if log.action.includes('FAILED')}
									<span class="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<AlertTriangle class="w-3 h-3 text-rose-600" /> ล้มเหลว ({log.action})
									</span>
								{:else if log.action === 'AUDIT_LOGS_CLEARED'}
									<span class="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<Trash2 class="w-3 h-3 text-rose-600" /> ล้าง Audit Logs
									</span>
								{:else if log.action.includes('APPROVED')}
									<span class="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<CheckCircle class="w-3 h-3 text-emerald-600" /> อนุมัติการจอง
									</span>
								{:else if log.action.includes('REJECTED')}
									<span class="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<XCircle class="w-3 h-3 text-rose-600" /> ปฏิเสธการจอง
									</span>
								{:else if log.action.includes('CANCELLED')}
									<span class="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<XCircle class="w-3 h-3 text-slate-500" /> ยกเลิกการจอง
									</span>
								{:else if log.action.includes('CHECK_IN')}
									<span class="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<CheckCircle class="w-3 h-3 text-amber-600" /> เช็กอินเข้าห้อง
									</span>
								{:else if log.action.includes('SYNC') || log.action.includes('RETRY')}
									<span class="bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<RotateCw class="w-3 h-3 text-blue-600" /> ซิงก์ข้อมูลซ้ำ
									</span>
								{:else if log.action.includes('CREATED')}
									<span class="bg-blue-50 text-blue-800 border border-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<Activity class="w-3 h-3 text-blue-600" /> สร้างคำขอใหม่
									</span>
								{:else if log.action.includes('LOGIN')}
									<span class="bg-purple-50 text-purple-800 border border-purple-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<LogIn class="w-3 h-3 text-purple-600" /> เข้าสู่ระบบ
									</span>
								{:else if log.action.includes('SETTINGS')}
									<span class="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
										<Settings class="w-3 h-3 text-amber-600" /> อัปเดตการตั้งค่า
									</span>
								{:else}
									<span class="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
										{log.action}
									</span>
								{/if}

								<span class="font-semibold text-xs text-slate-800">{log.actorName}</span>
								{#if log.actorRole}
									<span class="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-mono">
										{log.actorRole}
									</span>
								{/if}
							</div>

							<div class="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums font-mono">
								<Clock class="w-3.5 h-3.5 text-slate-400" />
								<span>{formattedDate}</span>
							</div>
						</div>

						<div class="text-xs text-slate-700 leading-relaxed font-normal">
							{log.details}
						</div>

						<div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
							<div class="flex items-center gap-3 text-slate-400">
								{#if log.ipAddress}
									<span class="flex items-center gap-1 font-mono text-[10px]">
										<Globe class="w-3 h-3" /> IP: {log.ipAddress}
									</span>
								{/if}
								{#if log.actorEmail}
									<span class="text-[10px] text-slate-400">
										{log.actorEmail}
									</span>
								{/if}
							</div>

							<div class="flex items-center gap-2">
								{#if log.booking}
									<span class="text-orange-600 bg-orange-50 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">
										{log.booking.bookingCode} ({log.booking.date})
									</span>
								{/if}

								{#if isFailedSync && targetBookingCode}
									<button
										type="button"
										onclick={() => handleRetrySyncFromLog(log.id, targetBookingCode)}
										disabled={retryingLogId === log.id}
										class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer active-press disabled:opacity-50"
										title="สั่งซิงก์ข้อมูลหรือส่งอีเมลซ้ำไปยังปลายทาง"
									>
										<RotateCw class={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
										<span>{retryingLogId === log.id ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูล/ส่งอีเมลซ้ำ'}</span>
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	{#if confirmMode}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm">
			<div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
						<AlertTriangle class="w-5 h-5 text-rose-600" />
					</div>
					<div>
						<div class="font-bold text-sm text-slate-900">
							{confirmMode === 'all' ? 'ล้างบันทึกทั้งหมด?' : 'ล้างบันทึกตามวันที่?'}
						</div>
						<div class="text-xs text-slate-500 mt-0.5">
							{confirmMode === 'all'
								? 'รายการทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้'
								: 'รายการก่อนหน้าวันที่เลือกจะถูกลบถาวร'}
						</div>
					</div>
				</div>

				{#if confirmMode === 'before'}
					<div>
						<label class="block text-xs font-semibold text-slate-700 mb-1" for="before-date-input">
							ลบรายการก่อนวันที่:
						</label>
						<input
							id="before-date-input"
							type="date"
							bind:value={beforeDate}
							class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
						/>
					</div>
				{/if}

				<div class="flex justify-end gap-2 pt-2">
					<button
						onclick={() => (confirmMode = null)}
						class="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
					>
						ยกเลิก
					</button>
					<button
						onclick={handleClear}
						disabled={isClearing || (confirmMode === 'before' && !beforeDate)}
						class="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition cursor-pointer active-press shadow-xs"
					>
						{isClearing ? 'กำลังล้าง...' : 'ยืนยันการล้าง'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
