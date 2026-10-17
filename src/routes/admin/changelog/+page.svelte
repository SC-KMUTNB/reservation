<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Sparkles,
		GitCommit,
		Calendar,
		Layers,
		Search,
		CheckCircle2,
		Bug,
		Zap,
		ShieldCheck,
		Tag,
		Rocket,
		Wrench,
		RefreshCw,
		ExternalLink,
		AlertCircle
	} from 'lucide-svelte';
	import type { UpdateRecord, VersionType } from '$lib/changelog';

	let updates = $state<UpdateRecord[]>([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	let source = $state<'github' | 'fallback'>('fallback');
	let repo = $state('SC-KMUTNB/reservation');
	let filterType = $state<'ALL' | VersionType>('ALL');
	let searchQuery = $state('');

	async function fetchChangelog(force = false) {
		if (force) {
			refreshing = true;
		} else {
			loading = true;
		}
		error = null;

		try {
			const url = force ? '/api/changelog?force=true' : '/api/changelog';
			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}
			const data = await res.json();
			if (data.updates && Array.isArray(data.updates)) {
				updates = data.updates;
				source = data.source || 'fallback';
				if (data.repo) repo = data.repo;
			}
		} catch (err: any) {
			console.error('Error fetching changelog:', err);
			error = err?.message || 'ไม่สามารถโหลดประวัติการอัปเดตได้';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	onMount(() => {
		fetchChangelog(false);
	});

	let totalCount = $derived(updates.length);
	let majorCount = $derived(updates.filter((u) => u.type === 'major').length);
	let minorCount = $derived(updates.filter((u) => u.type === 'minor').length);
	let patchCount = $derived(updates.filter((u) => u.type === 'patch').length);
	let latestVersion = $derived(updates[0]?.version || 'v1.0.0');

	let filteredUpdates = $derived(
		updates.filter((item) => {
			const matchType = filterType === 'ALL' || item.type === filterType;
			const matchQuery =
				!searchQuery ||
				item.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.changes.some((c) =>
					c.description.toLowerCase().includes(searchQuery.toLowerCase())
				);
			return matchType && matchQuery;
		})
	);

	function formatThaiDate(dateStr: string) {
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString('th-TH', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}
</script>

<svelte:head>
	<title>บันทึกการอัปเดตระบบ (Changelog) - สภานักศึกษา มจพ.</title>
</svelte:head>

<div class="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
	<div class="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f172a] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-700/60 relative overflow-hidden">
		<div class="absolute right-0 top-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
		<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
			<div class="space-y-2">
				<div class="flex flex-wrap items-center gap-2">
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold">
						<Sparkles class="w-3.5 h-3.5 animate-pulse" /> บันทึกการปล่อยเวอร์ชัน
					</span>
					{#if source === 'github'}
						<a
							href={`https://github.com/${repo}/releases`}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
						>
							<span>GitHub Releases</span>
							<ExternalLink class="w-2.5 h-2.5 opacity-70" />
						</a>
					{:else}
						<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/70 text-xs font-medium">
							สำรองข้อมูลในระบบ (Offline Fallback)
						</span>
					{/if}
				</div>
				<h1 class="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
					ประวัติการอัปเดตระบบ
					<span class="text-sm font-bold bg-slate-800/90 text-orange-400 border border-orange-500/40 px-2.5 py-0.5 rounded-full font-mono">
						{latestVersion}
					</span>
				</h1>
				<p class="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
					ติดตามความเคลื่อนไหว รายการพัฒนาฟีเจอร์ใหม่ การแก้ไขปัญหา และการปรับปรุงประสิทธิภาพของระบบจองห้องประชุม สภาอาจารย์ มจพ.
				</p>
			</div>

			<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
				<div class="grid grid-cols-4 gap-2 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 backdrop-blur-xs">
					<div class="text-center px-2 py-1">
						<div class="text-[11px] text-slate-400 font-medium">ทั้งหมด</div>
						<div class="text-lg font-black text-white">{totalCount}</div>
					</div>
					<div class="text-center px-2 py-1 border-l border-slate-800">
						<div class="text-[11px] text-amber-400 font-medium">Major</div>
						<div class="text-lg font-black text-amber-300">{majorCount}</div>
					</div>
					<div class="text-center px-2 py-1 border-l border-slate-800">
						<div class="text-[11px] text-blue-400 font-medium">Minor</div>
						<div class="text-lg font-black text-blue-300">{minorCount}</div>
					</div>
					<div class="text-center px-2 py-1 border-l border-slate-800">
						<div class="text-[11px] text-teal-400 font-medium">Patch</div>
						<div class="text-lg font-black text-teal-300">{patchCount}</div>
					</div>
				</div>

				<button
					onclick={() => fetchChangelog(true)}
					disabled={refreshing}
					title="ดึงข้อมูลล่าสุดจาก GitHub"
					class="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-60 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
				>
					<RefreshCw class={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
					<span class="hidden sm:inline">รีเฟรช</span>
				</button>
			</div>
		</div>
	</div>

	<div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
		<div class="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
			<button
				onclick={() => (filterType = 'ALL')}
				class={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
					filterType === 'ALL'
						? 'bg-white text-slate-900 shadow-xs'
						: 'text-slate-600 hover:text-slate-900'
				}`}
			>
				<Layers class="w-3.5 h-3.5" /> ทั้งหมด ({totalCount})
			</button>
			<button
				onclick={() => (filterType = 'major')}
				class={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
					filterType === 'major'
						? 'bg-amber-500 text-white shadow-xs'
						: 'text-slate-600 hover:text-amber-700'
				}`}
			>
				<Rocket class="w-3.5 h-3.5" /> Major ({majorCount})
			</button>
			<button
				onclick={() => (filterType = 'minor')}
				class={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
					filterType === 'minor'
						? 'bg-blue-600 text-white shadow-xs'
						: 'text-slate-600 hover:text-blue-700'
				}`}
			>
				<GitCommit class="w-3.5 h-3.5" /> Minor ({minorCount})
			</button>
			<button
				onclick={() => (filterType = 'patch')}
				class={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
					filterType === 'patch'
						? 'bg-teal-600 text-white shadow-xs'
						: 'text-slate-600 hover:text-teal-700'
				}`}
			>
				<Wrench class="w-3.5 h-3.5" /> Patch ({patchCount})
			</button>
		</div>

		<div class="relative w-full md:w-72">
			<Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
			<input
				type="text"
				placeholder="ค้นหาเวอร์ชัน, หัวข้อ หรือฟีเจอร์..."
				bind:value={searchQuery}
				class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
			/>
		</div>
	</div>

	{#if error}
		<div class="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700">
			<AlertCircle class="w-4 h-4 shrink-0 text-rose-600" />
			<span>{error} (แสดงข้อมูลสำรองแทน)</span>
		</div>
	{/if}

	{#if loading}
		<div class="space-y-4">
			{#each [1, 2, 3] as n}
				<div class="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse space-y-4">
					<div class="h-6 bg-slate-200 rounded-md w-1/4"></div>
					<div class="h-4 bg-slate-100 rounded-md w-3/4"></div>
					<div class="h-16 bg-slate-50 rounded-xl"></div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="relative pl-6 md:pl-8 border-l-2 border-slate-200 space-y-8 ml-3 md:ml-4">
			{#if filteredUpdates.length === 0}
				<div class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
					<Layers class="w-10 h-10 mx-auto text-slate-300 mb-3" />
					<div class="font-bold text-slate-700 text-sm">ไม่พบรายการอัปเดตที่ค้นหา</div>
					<p class="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองประเภทอื่น</p>
				</div>
			{:else}
				{#each filteredUpdates as item, index}
					{@const isMajor = item.type === 'major'}
					{@const isPatch = item.type === 'patch'}

					<div class="relative group">
						<div
							class={`absolute -left-[35px] md:-left-[43px] top-1.5 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-slate-100 shadow-md transition ${
								isMajor
									? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-orange-500/30'
									: isPatch
									? 'bg-teal-600 text-white shadow-teal-500/20'
									: 'bg-slate-700 text-slate-200 shadow-slate-400/20'
							}`}
						>
							{#if isMajor}
								<Rocket class="w-3.5 h-3.5 stroke-[2.2]" />
							{:else if isPatch}
								<Wrench class="w-3.5 h-3.5 stroke-[2.2]" />
							{:else}
								<GitCommit class="w-3.5 h-3.5 stroke-[2.2]" />
							{/if}
						</div>

						<div class="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden">
							<div class="p-5 md:p-6 border-b border-slate-100 bg-slate-50/60">
								<div class="flex flex-wrap items-center justify-between gap-3 mb-2">
									<div class="flex flex-wrap items-center gap-2">
										<span class="font-mono text-base md:text-lg font-black text-slate-900 bg-slate-200/80 px-3 py-1 rounded-xl">
											{item.version}
										</span>
										{#if item.type === 'major'}
											<span class="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
												Major Release
											</span>
										{:else if item.type === 'minor'}
											<span class="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
												Minor Update
											</span>
										{:else}
											<span class="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
												Patch / Hotfix
											</span>
										{/if}
										{#if index === 0}
											<span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
												ล่าสุด (Latest)
											</span>
										{/if}
									</div>

									<div class="flex items-center gap-3 text-xs text-slate-500 font-medium">
										{#if item.htmlUrl}
											<a
												href={item.htmlUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline"
											>
												<span>ดูบน GitHub</span>
												<ExternalLink class="w-3 h-3" />
											</a>
										{/if}
										<div class="flex items-center gap-1.5">
											<Calendar class="w-3.5 h-3.5 text-slate-400" />
											<span>{formatThaiDate(item.date)}</span>
										</div>
									</div>
								</div>

								<h2 class="text-base md:text-lg font-bold text-slate-900">
									{item.title}
								</h2>
								{#if item.summary}
									<p class="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">
										{item.summary}
									</p>
								{/if}
							</div>

							{#if item.changes && item.changes.length > 0}
								<div class="p-5 md:p-6 space-y-3">
									<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
										รายการความเปลี่ยนแปลง ({item.changes.length} รายการ)
									</div>
									<ul class="space-y-2.5">
										{#each item.changes as change}
											<li class="flex items-start gap-2.5 text-xs md:text-sm text-slate-700 bg-slate-50/70 hover:bg-slate-100/70 p-2.5 rounded-xl border border-slate-100 transition">
												<div class="shrink-0 pt-0.5">
													{#if change.category === 'feat'}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
															<CheckCircle2 class="w-3 h-3 text-emerald-600" /> ฟีเจอร์ใหม่
														</span>
													{:else if change.category === 'fix'}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
															<Bug class="w-3 h-3 text-rose-600" /> แก้ไขข้อผิดพลาด
														</span>
													{:else if change.category === 'improve'}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
															<Zap class="w-3 h-3 text-blue-600" /> ปรับปรุงระบบ
														</span>
													{:else if change.category === 'security'}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
															<ShieldCheck class="w-3 h-3 text-purple-600" /> ความปลอดภัย
														</span>
													{:else}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
															<Tag class="w-3 h-3" /> ทั่วไป
														</span>
													{/if}
												</div>
												<span class="leading-relaxed text-slate-800">
													{change.description}
												</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>
