<script lang="ts">
	import { onMount } from 'svelte';
	import {
		FileSpreadsheet,
		Download,
		CheckCircle2,
		ShieldCheck,
		ArrowRight,
		Sparkles,
		UploadCloud,
		FileUp,
		AlertTriangle,
		RefreshCw,
		X,
		Database,
		FileText,
		Trash2,
		ExternalLink
	} from 'lucide-svelte';
	import { formatDisplayDate } from '$lib/date-utils';

	let startDate = $state('');
	let endDate = $state('');
	let status = $state('ALL');
	let isExporting = $state(false);
	let activePreset = $state<number | null>(0);

	let isSuperAdmin = $state(false);
	let isImportModalOpen = $state(false);
	let importMode = $state<'overwrite' | 'add'>('overwrite');
	let defaultStatusForBlanks = $state<'PENDING' | 'APPROVED'>('PENDING');
	let selectedFile = $state<File | null>(null);
	let isDragging = $state(false);
	let fileInputRef: HTMLInputElement | undefined = $state();

	let isMigrating = $state(false);
	let migrationResult = $state<{
		mode: 'overwrite' | 'add';
		source: string;
		totalRows: number;
		imported: number;
		updated: number;
		skipped: number;
		statusBreakdown: {
			APPROVED: number;
			PENDING: number;
			REJECTED: number;
			CANCELLED: number;
		};
		sampleRecords: Array<{
			bookingCode: string;
			fullName: string;
			date: string;
			startTime: string;
			endTime: string;
			status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
		}>;
		errors: Array<{ row: number; error: string }>;
	} | null>(null);
	let migrationError = $state<string | null>(null);
	let migrationSuccess = $state<string | null>(null);

	onMount(() => {
		const today = new Date();
		const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
		const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

		startDate = firstDay.toISOString().slice(0, 10);
		endDate = lastDay.toISOString().slice(0, 10);

		fetch('/api/auth/me')
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data?.user?.role === 'SUPER_ADMIN') {
					isSuperAdmin = true;
				}
			})
			.catch(console.error);
	});

	function setMonthRange(offset: number) {
		activePreset = offset;
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
		const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
		startDate = start.toISOString().slice(0, 10);
		endDate = end.toISOString().slice(0, 10);
	}

	function handleDownload() {
		isExporting = true;
		const params = new URLSearchParams();
		if (startDate) params.append('startDate', startDate);
		if (endDate) params.append('endDate', endDate);
		if (status) params.append('status', status);

		const downloadUrl = `/api/reports/export?${params.toString()}`;
		window.location.href = downloadUrl;

		setTimeout(() => {
			isExporting = false;
		}, 2000);
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
				selectedFile = file;
				migrationError = null;
			} else {
				migrationError = 'กรุณาเลือกไฟล์ Microsoft Excel นามสกุล .xlsx หรือ .xls';
			}
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			const file = e.dataTransfer.files[0];
			if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
				selectedFile = file;
				migrationError = null;
			} else {
				migrationError = 'กรุณาเลือกไฟล์ Microsoft Excel นามสกุล .xlsx หรือ .xls';
			}
		}
	}

	function clearSelectedFile(e?: MouseEvent) {
		if (e) e.stopPropagation();
		selectedFile = null;
		if (fileInputRef) {
			fileInputRef.value = '';
		}
	}

	function formatFileSize(bytes: number) {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function executeMigration() {
		isImportModalOpen = false;
		isMigrating = true;
		migrationError = null;
		migrationSuccess = null;
		migrationResult = null;

		try {
			let res: Response;
			if (selectedFile) {
				const formData = new FormData();
				formData.append('file', selectedFile);
				formData.append('mode', importMode);
				formData.append('defaultStatus', defaultStatusForBlanks);
				res = await fetch('/api/admin/migrate-sheet', {
					method: 'POST',
					body: formData
				});
			} else {
				res = await fetch('/api/admin/migrate-sheet', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						mode: importMode,
						defaultStatus: defaultStatusForBlanks
					})
				});
			}

			const data = await res.json();

			if (!res.ok) {
				migrationError = data.error || 'การนำเข้าข้อมูลล้มเหลว';
			} else {
				migrationSuccess = data.message || 'นำเข้าข้อมูลประวัติสำเร็จ';
				migrationResult = data.result;
			}
		} catch (err: any) {
			migrationError = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
		} finally {
			isMigrating = false;
		}
	}
</script>

<svelte:head>
	<title>ศูนย์ส่งออกรายงาน & จัดการข้อมูลประวัติ - สภานักศึกษา มจพ.</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
			ศูนย์ส่งออกรายงาน & จัดการข้อมูลประวัติ
		</h2>
		<p class="text-xs text-slate-500 mt-1 font-light">
			ส่งออกไฟล์ Microsoft Excel (.xlsx) สองแผ่นงานเพื่อใช้ประกอบการรายงานผล และนำเข้าข้อมูลประวัติเดิม
		</p>
	</div>

	<div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-warm space-y-6">
		<div>
			<div class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
				1. เลือกช่วงเวลาที่ต้องการสรุปข้อมูล
			</div>
			<div class="flex flex-wrap gap-2 mb-4">
				<button
					type="button"
					onclick={() => setMonthRange(0)}
					class={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer ${
						activePreset === 0
							? 'bg-orange-600 text-white shadow-warm-xs'
							: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
					}`}
				>
					เดือนปัจจุบัน
				</button>
				<button
					type="button"
					onclick={() => setMonthRange(-1)}
					class={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer ${
						activePreset === -1
							? 'bg-orange-600 text-white shadow-warm-xs'
							: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
					}`}
				>
					เดือนที่แล้ว
				</button>
				<button
					type="button"
					onclick={() => {
						activePreset = null;
						startDate = '';
						endDate = '';
					}}
					class={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active-press cursor-pointer ${
						activePreset === null && !startDate && !endDate
							? 'bg-orange-600 text-white shadow-warm-xs'
							: 'bg-slate-100 text-slate-700 hover:bg-slate-200'
					}`}
				>
					ข้อมูลทั้งหมด (ไม่จำกัดเวลา)
				</button>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-xs font-bold text-slate-700 mb-1.5" for="report-start-date">
						ตั้งแต่วันที่
					</label>
					<div class="relative">
						<input
							id="report-start-date"
							type="date"
							bind:value={startDate}
							onchange={() => (activePreset = null)}
							class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
						/>
					</div>
				</div>
				<div>
					<label class="block text-xs font-bold text-slate-700 mb-1.5" for="report-end-date">
						ถึงวันที่
					</label>
					<div class="relative">
						<input
							id="report-end-date"
							type="date"
							bind:value={endDate}
							onchange={() => (activePreset = null)}
							class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
						/>
					</div>
				</div>
			</div>
		</div>

		<div class="pt-4 border-t border-slate-100">
			<div class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
				2. กรองตามสถานะคำขอ (Status Filter)
			</div>
			<div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
				{#each [
					{ id: 'ALL', label: 'ทั้งหมด (ทุกสถานะ)' },
					{ id: 'APPROVED', label: 'อนุมัติแล้ว (Approved)' },
					{ id: 'PENDING', label: 'รออนุมัติ (Pending)' },
					{ id: 'REJECTED', label: 'ไม่อนุมัติ (Rejected)' },
					{ id: 'CANCELLED', label: 'ยกเลิก (Cancelled)' }
				] as item}
					<button
						type="button"
						onclick={() => (status = item.id)}
						class={`p-3 rounded-2xl border text-xs font-bold text-left transition active-press cursor-pointer flex flex-col justify-between gap-2 ${
							status === item.id
								? 'border-orange-500 bg-orange-50/60 shadow-xs ring-2 ring-orange-500/20 text-orange-950'
								: 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
						}`}
					>
						<span>{item.label}</span>
						{#if status === item.id}
							<CheckCircle2 class="w-4 h-4 text-orange-600 self-end" />
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80">
			<div class="flex items-center gap-2 mb-3 text-slate-900 font-bold text-xs">
				<Sparkles class="w-4 h-4 text-orange-500" />
				<span>โครงสร้างไฟล์ Excel รายงานสองแผ่นงานอัตโนมัติ:</span>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
				<div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-warm-xs flex items-start gap-3">
					<div class="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0 text-xs">
						1
					</div>
					<div>
						<div class="font-bold text-slate-800">แผ่นงานที่ 1: รายการจองทั้งหมด</div>
						<div class="text-[11px] text-slate-500 mt-0.5">
							ตารางสรุปละเอียดทุกคำขอ พร้อมสถานะ ผู้อนุมัติ รหัสจอง และข้อมูลติดต่อ
						</div>
					</div>
				</div>
				<div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-warm-xs flex items-start gap-3">
					<div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 text-xs">
						2
					</div>
					<div>
						<div class="font-bold text-slate-800">แผ่นงานที่ 2: สรุปสถิติผู้บริหาร</div>
						<div class="text-[11px] text-slate-500 mt-0.5">
							สรุปผลรวมคำขอ อัตราการอนุมัติ สถิติแยกตามสังกัด/ชมรม และช่วงเวลาใช้งาน
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
			<div class="text-xs text-slate-500 font-light">
				รูปแบบไฟล์: <span class="font-mono text-slate-700 font-bold">KMUTNB_Council_Reservation_Report_YYYY-MM-DD.xlsx</span>
			</div>
			<button
				type="button"
				disabled={isExporting}
				onclick={handleDownload}
				class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-3 rounded-2xl text-xs shadow-warm hover:shadow-warm-lg transition-all duration-200 flex items-center justify-center gap-2 active-press cursor-pointer disabled:opacity-50"
			>
				<Download class="w-4 h-4" />
				<span>{isExporting ? 'กำลังเตรียมไฟล์ Excel...' : 'ดาวน์โหลดรายงาน Excel ทันที'}</span>
			</button>
		</div>
	</div>

	{#if isSuperAdmin}
		<div class="bg-white rounded-3xl p-6 md:p-8 border border-orange-200/90 shadow-warm space-y-5">
			<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
						<FileUp class="w-5 h-5" />
					</div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="font-bold text-sm text-slate-900">
								นำเข้าข้อมูลประวัติจากไฟล์ชีต (Import Sheet History)
							</h3>
							<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
								Super Admin Only
							</span>
						</div>
						<p class="text-[11px] text-slate-500 mt-0.5">
							เลือกไฟล์ Excel (.xlsx / .xls) จากอุปกรณ์ของคุณ หรือใช้ไฟล์เริ่มต้นในระบบเพื่อนำเข้าประวัติการจองห้องประชุมเก่า
						</p>
					</div>
				</div>

				<button
					type="button"
					onclick={() => (isImportModalOpen = true)}
					disabled={isMigrating}
					class="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-warm-xs transition flex items-center justify-center gap-2 active-press cursor-pointer disabled:opacity-50 shrink-0"
				>
					<RefreshCw class={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
					<span>{isMigrating ? 'กำลังประมวลผลข้อมูลชีต...' : 'นำเข้าข้อมูลประวัติ (Import)'}</span>
				</button>
			</div>

			<input
				type="file"
				bind:this={fileInputRef}
				onchange={handleFileChange}
				accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
				class="hidden"
			/>

			<div>
				<div class="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
					<span>เลือกไฟล์จากอุปกรณ์ของคุณ (Select File from Device)</span>
					{#if selectedFile}
						<button
							type="button"
							onclick={clearSelectedFile}
							class="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
						>
							<Trash2 class="w-3.5 h-3.5" />
							<span>ยกเลิกไฟล์ที่เลือก</span>
						</button>
					{/if}
				</div>

				{#if selectedFile}
					<div class="bg-orange-50/50 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div class="flex items-center gap-3 min-w-0">
							<div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
								<FileSpreadsheet class="w-5 h-5" />
							</div>
							<div class="min-w-0">
								<div class="font-bold text-xs text-slate-900 truncate">
									{selectedFile.name}
								</div>
								<div class="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
									<span>ขนาด: {formatFileSize(selectedFile.size)}</span>
									<span>•</span>
									<span class="text-emerald-600 font-semibold flex items-center gap-1">
										<CheckCircle2 class="w-3 h-3" />
										พร้อมนำเข้าจากเครื่อง
									</span>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-2 shrink-0">
							<button
								type="button"
								onclick={() => fileInputRef?.click()}
								class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
							>
								เปลี่ยนไฟล์
							</button>
							<button
								type="button"
								onclick={() => (isImportModalOpen = true)}
								class="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-warm-xs transition flex items-center gap-1.5 cursor-pointer"
							>
								<span>นำเข้าไฟล์นี้</span>
								<ArrowRight class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				{:else}
					<div
						tabindex="0"
						role="button"
						onclick={() => fileInputRef?.click()}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') fileInputRef?.click();
						}}
						ondragover={(e) => {
							e.preventDefault();
							isDragging = true;
						}}
						ondragleave={() => (isDragging = false)}
						ondrop={handleDrop}
						class={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
							isDragging
								? 'border-orange-500 bg-orange-50/70 scale-[0.99]'
								: 'border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/20'
						}`}
					>
						<div class="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
							<UploadCloud class="w-5 h-5" />
						</div>
						<div class="text-xs font-bold text-slate-800">
							คลิกเพื่อเลือกไฟล์ Excel จากเครื่อง หรือลากไฟล์มาวางที่นี่ (.xlsx, .xls)
						</div>
						<div class="text-[11px] text-slate-500 font-light max-w-md">
							หากไม่ได้เลือกไฟล์ ระบบจะใช้นำเข้าจากไฟล์เริ่มต้นของระบบ (<code class="text-orange-600 font-mono">sheetexample/*.xlsx</code>)
						</div>
					</div>
				{/if}
			</div>

			{#if migrationError}
				<div class="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<AlertTriangle class="w-4 h-4 text-rose-600 shrink-0" />
						<span class="font-medium">{migrationError}</span>
					</div>
					<button
						type="button"
						onclick={() => (migrationError = null)}
						class="text-rose-600 font-bold p-1 cursor-pointer"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			{/if}

			{#if migrationSuccess}
				<div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
						<span class="font-medium">{migrationSuccess}</span>
					</div>
					<button
						type="button"
						onclick={() => (migrationSuccess = null)}
						class="text-emerald-600 font-bold p-1 cursor-pointer"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			{/if}

			{#if migrationResult}
				<div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
						<div class="space-y-0.5">
							<div class="text-xs font-bold text-slate-800 flex items-center gap-2">
								<span>ผลการนำเข้าประวัติการจองสำเร็จ</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
									เสร็จสิ้น
								</span>
							</div>
							<div class="text-[11px] text-slate-500">
								แหล่งที่มา: <span class="font-medium text-slate-700">{migrationResult.source}</span> • โหมด: {migrationResult.mode === 'overwrite' ? 'เขียนทับข้อมูลเดิม (Overwrite)' : 'เพิ่มเฉพาะรายการใหม่ (Add into)'}
							</div>
						</div>

						<a
							href="/admin/dashboard"
							class="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 shrink-0 self-start sm:self-center"
						>
							<span>ไปดูรายการในแดชบอร์ด</span>
							<ExternalLink class="w-3.5 h-3.5" />
						</a>
					</div>

					<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<div class="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
							<div class="text-[11px] text-slate-500 font-medium">แถวทั้งหมดในไฟล์</div>
							<div class="text-xl font-extrabold text-slate-900 mt-0.5">{migrationResult.totalRows}</div>
						</div>
						<div class="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
							<div class="text-[11px] text-emerald-600 font-medium">นำเข้าใหม่สำเร็จ</div>
							<div class="text-xl font-extrabold text-emerald-600 mt-0.5">+{migrationResult.imported}</div>
						</div>
						<div class="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
							<div class="text-[11px] text-blue-600 font-medium">เขียนทับ/อัปเดต</div>
							<div class="text-xl font-extrabold text-blue-600 mt-0.5">{migrationResult.updated}</div>
						</div>
						<div class="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
							<div class="text-[11px] text-slate-500 font-medium">ข้ามรายการเดิม</div>
							<div class="text-xl font-extrabold text-slate-400 mt-0.5">{migrationResult.skipped}</div>
						</div>
					</div>

					{#if migrationResult.statusBreakdown}
						<div class="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
							<div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
								<ShieldCheck class="w-4 h-4 text-emerald-600" />
								<span>ยืนยันสถานะคำขอที่ถูกบันทึกลงระบบ (Reservation Status Breakdown):</span>
							</div>
							<div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
								<div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
									<span class="text-xs font-semibold">อนุมัติแล้ว (Approved)</span>
									<span class="text-sm font-extrabold text-emerald-700">
										{migrationResult.statusBreakdown.APPROVED || 0}
									</span>
								</div>
								<div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
									<span class="text-xs font-semibold">รออนุมัติ (Pending)</span>
									<span class="text-sm font-extrabold text-amber-700">
										{migrationResult.statusBreakdown.PENDING || 0}
									</span>
								</div>
								<div class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between">
									<span class="text-xs font-semibold">ไม่อนุมัติ (Rejected)</span>
									<span class="text-sm font-extrabold text-rose-700">
										{migrationResult.statusBreakdown.REJECTED || 0}
									</span>
								</div>
								<div class="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between">
									<span class="text-xs font-semibold">ยกเลิก (Cancelled)</span>
									<span class="text-sm font-extrabold text-slate-700">
										{migrationResult.statusBreakdown.CANCELLED || 0}
									</span>
								</div>
							</div>
						</div>
					{/if}

					{#if migrationResult.sampleRecords && migrationResult.sampleRecords.length > 0}
						<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
							<div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
								<span>ตัวอย่างข้อมูลที่นำเข้าพร้อมสถานะ (Sample Imported Records):</span>
								<span class="text-[10px] text-slate-500 font-normal">แสดง {migrationResult.sampleRecords.length} รายการแรก</span>
							</div>
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs">
									<thead class="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
										<tr>
											<th class="py-2 px-3">รหัสการจอง</th>
											<th class="py-2 px-3">ชื่อผู้จอง</th>
											<th class="py-2 px-3">วันที่จอง</th>
											<th class="py-2 px-3">เวลา</th>
											<th class="py-2 px-3 text-right">สถานะในระบบ</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-100">
										{#each migrationResult.sampleRecords as item}
											<tr class="hover:bg-slate-50/80">
												<td class="py-2 px-3 font-mono text-[11px] font-bold text-slate-800">
													{item.bookingCode}
												</td>
												<td class="py-2 px-3 text-slate-900 font-medium">
													{item.fullName}
												</td>
												<td class="py-2 px-3 text-slate-600 font-mono text-[11px]">
													{formatDisplayDate(item.date)}
												</td>
												<td class="py-2 px-3 text-slate-600 font-mono text-[11px]">
													{item.startTime} - {item.endTime}
												</td>
												<td class="py-2 px-3 text-right">
													<span
														class={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
															item.status === 'APPROVED'
																? 'bg-emerald-100 text-emerald-800'
																: item.status === 'PENDING'
																? 'bg-amber-100 text-amber-800'
																: item.status === 'REJECTED'
																? 'bg-rose-100 text-rose-800'
																: 'bg-slate-200 text-slate-700'
														}`}
													>
														{item.status === 'APPROVED'
															? 'อนุมัติแล้ว'
															: item.status === 'PENDING'
															? 'รออนุมัติ'
															: item.status === 'REJECTED'
															? 'ไม่อนุมัติ'
															: 'ยกเลิก'}
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if isImportModalOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain bg-slate-950/60 backdrop-blur-xs">
			<div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col animate-in fade-in zoom-in-95 duration-150">
				<div class="flex justify-between items-start pb-4 border-b border-slate-100 shrink-0">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
							<Database class="w-5 h-5" />
						</div>
						<div>
							<h3 class="font-extrabold text-base text-slate-900">
								ยืนยันและตั้งค่าการนำเข้าข้อมูลประวัติ
							</h3>
							<p class="text-xs text-slate-500 mt-0.5">
								กำหนดแหล่งที่มา โหมดการนำเข้า และสถานะเริ่มต้นก่อนประมวลผล
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => (isImportModalOpen = false)}
						class="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<div class="overflow-y-auto flex-1 pr-1 -mr-1 space-y-5 pt-4">
					<div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
						<div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
							{#if selectedFile}
								<FileSpreadsheet class="w-5 h-5 text-emerald-600" />
							{:else}
								<FileText class="w-5 h-5 text-orange-600" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
								แหล่งไฟล์ที่ใช้ประมวลผล:
							</div>
							<div class="text-xs font-extrabold text-slate-900 truncate">
								{selectedFile ? selectedFile.name : 'sheetexample/ฟอร์มสำหรับจองห้องประชุมสภานักศึกษา (การตอบกลับ).xlsx'}
							</div>
							<div class="text-[10px] text-slate-500">
								{selectedFile ? `ไฟล์จากเครื่อง (${formatFileSize(selectedFile.size)})` : 'ไฟล์เริ่มต้นบนเซิร์ฟเวอร์'}
							</div>
						</div>
					</div>

					<div class="space-y-2">
						<div class="text-xs font-bold text-slate-800 uppercase tracking-wider">
							1. เลือกโหมดการนำเข้า (Import Mode):
						</div>
						<div class="space-y-2.5">
							<label
								class={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition ${
									importMode === 'overwrite'
										? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
										: 'border-slate-200 hover:bg-slate-50'
								}`}
							>
								<input
									type="radio"
									name="importMode"
									value="overwrite"
									checked={importMode === 'overwrite'}
									onchange={() => (importMode = 'overwrite')}
									class="mt-1 text-orange-600 focus:ring-orange-500"
								/>
								<div class="space-y-0.5">
									<div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
										<span>เขียนทับข้อมูลเดิม (Overwrite)</span>
										<span class="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
											แนะนำ
										</span>
									</div>
									<p class="text-[11px] text-slate-600 leading-relaxed">
										หากพบรหัสการจองตรงกัน จะอัปเดตข้อมูลและสถานะให้ตรงกับไฟล์ชีตล่าสุด และนำเข้ารายการใหม่ที่ยังไม่เคยมี
									</p>
								</div>
							</label>

							<label
								class={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition ${
									importMode === 'add'
										? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
										: 'border-slate-200 hover:bg-slate-50'
								}`}
							>
								<input
									type="radio"
									name="importMode"
									value="add"
									checked={importMode === 'add'}
									onchange={() => (importMode = 'add')}
									class="mt-1 text-orange-600 focus:ring-orange-500"
								/>
								<div class="space-y-0.5">
									<div class="text-xs font-bold text-slate-900">
										เพิ่มเฉพาะรายการใหม่ (Add into)
									</div>
									<p class="text-[11px] text-slate-600 leading-relaxed">
										ข้ามรายการเดิมที่มีอยู่ในระบบ และเพิ่มเฉพาะรายการใหม่เท่านั้น
									</p>
								</div>
							</label>
						</div>
					</div>

					<div class="space-y-2">
						<div class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
							<span>2. สถานะเริ่มต้นสำหรับแถวที่เว้นว่าง (Default Status):</span>
						</div>
						<div class="space-y-2.5">
							<label
								class={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition ${
									defaultStatusForBlanks === 'PENDING'
										? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
										: 'border-slate-200 hover:bg-slate-50'
								}`}
							>
								<input
									type="radio"
									name="defaultStatusForBlanks"
									value="PENDING"
									checked={defaultStatusForBlanks === 'PENDING'}
									onchange={() => (defaultStatusForBlanks = 'PENDING')}
									class="mt-1 text-orange-600 focus:ring-orange-500"
								/>
								<div class="space-y-0.5">
									<div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
										<span>รออนุมัติ (PENDING)</span>
										<span class="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
											ค่าเริ่มต้นแนะนำ
										</span>
									</div>
									<p class="text-[11px] text-slate-600 leading-relaxed">
										หากแถวใดในชีตไม่มีคำว่า "Approved" หรือช่องสถานะเว้นว่าง จะบันทึกเป็นสถานะ <strong class="text-amber-700">รออนุมัติ</strong> เพื่อให้แอดมินตรวจสอบผล
									</p>
								</div>
							</label>

							<label
								class={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition ${
									defaultStatusForBlanks === 'APPROVED'
										? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
										: 'border-slate-200 hover:bg-slate-50'
								}`}
							>
								<input
									type="radio"
									name="defaultStatusForBlanks"
									value="APPROVED"
									checked={defaultStatusForBlanks === 'APPROVED'}
									onchange={() => (defaultStatusForBlanks = 'APPROVED')}
									class="mt-1 text-orange-600 focus:ring-orange-500"
								/>
								<div class="space-y-0.5">
									<div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
										<span>อนุมัติแล้ว (APPROVED)</span>
										<span class="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
											ประวัติเก่าที่ใช้งานแล้ว
										</span>
									</div>
									<p class="text-[11px] text-slate-600 leading-relaxed">
										ถือว่าทุกแถวที่เว้นว่างในชีตได้รับสถานะ <strong class="text-emerald-700">อนุมัติแล้ว</strong> ทั้งหมด (เหมาะกับไฟล์ประวัติการใช้ห้องประชุมในอดีต)
									</p>
								</div>
							</label>
						</div>
					</div>
				</div>

				<div class="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
					<button
						type="button"
						onclick={() => (isImportModalOpen = false)}
						class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
					>
						ยกเลิก
					</button>
					<button
						type="button"
						onclick={executeMigration}
						class="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer"
					>
						<CheckCircle2 class="w-4 h-4" />
						<span>ยืนยันเริ่มนำเข้า</span>
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
