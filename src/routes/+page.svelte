<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Calendar as CalendarIcon,
		Clock,
		Landmark,
		Lock,
		Search,
		ExternalLink,
		CalendarCheck,
		FileText,
		ArrowRight,
		Users,
		ChevronRight,
		Tv,
		Wifi
	} from 'lucide-svelte';
	import ViewSwitcherFooter from '$lib/components/mobile/ViewSwitcherFooter.svelte';
	import AppHeader from '$lib/components/ui/AppHeader.svelte';

	let settings = $state<Record<string, string>>({});
	let quickSearchQuery = $state('');

	onMount(() => {
		fetchSettings();
	});

	async function fetchSettings() {
		try {
			const res = await fetch('/api/settings');
			if (res.ok) {
				const data = await res.json();
				settings = data.settings || {};
			}
		} catch (e) {
			console.error(e);
		}
	}

	function handleQuickSearch(e: SubmitEvent) {
		e.preventDefault();
		if (quickSearchQuery.trim()) {
			goto(`/track?q=${encodeURIComponent(quickSearchQuery.trim())}`);
		}
	}
</script>

<svelte:head>
	<title>{settings.site_title || 'สภานักศึกษา มจพ.'} - หน้าหลัก</title>
</svelte:head>

<div class="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
	<AppHeader
		siteTitle={settings.site_title}
		siteSubtitle={settings.site_subtitle}
		activeTab="home"
	/>

	<!-- Hero Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-orange-600 via-orange-600 to-amber-600 text-white pt-16 pb-20 px-4">
		<div class="absolute inset-0 bg-mesh-dots opacity-15 pointer-events-none"></div>
		<div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

		<div class="max-w-4xl mx-auto text-center relative z-10">
			<div class="inline-flex items-center gap-2 bg-orange-950/30 text-orange-100 px-4 py-1.5 rounded-full text-xs font-medium mb-6 border border-orange-400/40 backdrop-blur-md shadow-inner">
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
				</span>
				<span>ระบบบริการออนไลน์ มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ</span>
			</div>

			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-[1.18] text-white">
				{settings.hero_title || 'ยินดีต้อนรับสู่พอร์ทัลสภานักศึกษา มจพ.'}
			</h2>

			<p class="text-orange-50 text-base md:text-lg mb-8 max-w-2xl mx-auto font-light leading-relaxed">
				{settings.hero_description ||
					'ศูนย์รวมข้อมูลข่าวสาร จองห้องประชุมเพื่อกิจกรรมนักศึกษา และช่องทางสื่อสารสำหรับชาวพระจอมเกล้าพระนครเหนือ'}
			</p>

			<div class="flex flex-wrap justify-center items-center gap-3.5">
				<a
					href="/booking"
					class="bg-white text-orange-600 font-bold px-7 py-3.5 rounded-2xl shadow-warm hover:shadow-warm-lg hover:bg-orange-50 transition-all duration-200 active-press flex items-center gap-2.5 text-sm md:text-base group"
				>
					<CalendarIcon class="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
					<span>จองห้องประชุมทันที</span>
					<ArrowRight class="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
				</a>

				<a
					href="/track"
					class="bg-orange-950/40 hover:bg-orange-950/60 text-white font-semibold px-6 py-3.5 rounded-2xl transition-all duration-200 border border-orange-300/40 active-press flex items-center gap-2 text-sm md:text-base backdrop-blur-sm"
				>
					<Search class="w-4 h-4 text-orange-200" />
					<span>ตรวจสอบผลการจอง</span>
				</a>
			</div>
		</div>
	</section>

	<!-- Main Bento Grid Services -->
	<main class="flex-grow max-w-6xl mx-auto px-4 -mt-8 pb-16 w-full space-y-12 relative z-20">
		<section>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
				<!-- Bento Card 1: Featured Main Booking Card -->
				<div class="md:col-span-2 bg-white rounded-3xl p-7 md:p-8 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
					<div class="absolute -right-8 -bottom-8 w-48 h-48 bg-orange-100/40 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-200/50 transition-all duration-500"></div>

					<div>
						<div class="flex flex-wrap items-center justify-between gap-3 mb-5">
							<div class="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/80 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">
								<CalendarCheck class="w-3.5 h-3.5 text-orange-600" />
								<span>บริการเด่น</span>
							</div>
							<div class="flex items-center gap-3 text-slate-400 text-xs">
								<span class="flex items-center gap-1"><Users class="w-3.5 h-3.5" /> รองรับ 20-30 คน</span>
								<span class="flex items-center gap-1"><Tv class="w-3.5 h-3.5" /> จอโปรเจกเตอร์</span>
								<span class="flex items-center gap-1"><Wifi class="w-3.5 h-3.5" /> Wi-Fi มจพ.</span>
							</div>
						</div>

						<h3 class="text-2xl font-extrabold text-slate-900 tracking-tight mb-2.5">
							ระบบจองห้องประชุมสภานักศึกษา
						</h3>
						<p class="text-slate-600 text-sm leading-relaxed mb-6 max-w-xl">
							เลือกดูปฏิทินรายเดือนและตารางช่วงเวลาว่าง (08:00 – 20:00 น.) ระบบล็อกช่วงเวลาที่มีการจองแล้วอัตโนมัติ หมดปัญหาการจองเวลาชนกัน สามารถทราบผลการอนุมัติผ่านรหัสตรวจสอบได้ทันที
						</p>

						<div class="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6">
							<div class="flex justify-between items-center text-xs mb-2">
								<span class="font-semibold text-slate-700 flex items-center gap-1.5">
									<Clock class="w-3.5 h-3.5 text-orange-600" /> เวลาเปิดให้บริการรายวัน
								</span>
								<span class="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
									พร้อมใช้งาน
								</span>
							</div>
							<div class="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] tabular-nums text-slate-500 font-mono">
								<span class="bg-white border border-slate-200 px-2 py-1 rounded-lg">08:00</span>
								<span>→</span>
								<span class="bg-white border border-slate-200 px-2 py-1 rounded-lg">12:00</span>
								<span>→</span>
								<span class="bg-white border border-slate-200 px-2 py-1 rounded-lg">16:00</span>
								<span>→</span>
								<span class="bg-white border border-slate-200 px-2 py-1 rounded-lg">20:00</span>
								<span class="text-[10px] text-slate-400 font-sans ml-2">(บล็อกละ 1 ชม.)</span>
							</div>
						</div>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
						<span class="text-xs text-slate-500 font-medium">
							ฟรีสำหรับชมรม สโมสร และนักศึกษา มจพ. ทุกคณะ
						</span>
						<a
							href="/booking"
							class="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all duration-200 shadow-warm-xs hover:shadow-warm flex items-center gap-2 active-press"
						>
							<span>เปิดหน้าปฏิทินเพื่อเริ่มจอง</span>
							<ArrowRight class="w-4 h-4" />
						</a>
					</div>
				</div>

				<!-- Bento Card 2: Instant Tracking Card -->
				<div class="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between">
					<div>
						<div class="w-12 h-12 bg-amber-50 text-amber-600 border border-amber-200/80 rounded-2xl flex items-center justify-center mb-5 shadow-warm-xs">
							<Search class="w-6 h-6 stroke-[2.2]" />
						</div>
						<h3 class="text-lg font-bold text-slate-900 mb-2 tracking-tight">
							ตรวจสอบสถานะการจอง
						</h3>
						<p class="text-slate-500 text-xs leading-relaxed mb-5">
							พิมพ์รหัสการจอง หรือรหัสนักศึกษา เพื่อเช็คผลการอนุมัติได้ทันที
						</p>

						<form onsubmit={handleQuickSearch} class="space-y-2 mb-4">
							<div class="relative">
								<input
									type="text"
									bind:value={quickSearchQuery}
									placeholder="เช่น 6501012345 หรือ KMUTNB-..."
									class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
								/>
							</div>
							<button
								type="submit"
								class="w-full bg-slate-900 hover:bg-black text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-xs active-press flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<Search class="w-3.5 h-3.5" /> ค้นหาข้อมูล
							</button>
						</form>
					</div>

					<a
						href="/track"
						class="text-xs text-orange-600 font-medium hover:text-orange-700 flex items-center gap-1 mt-2 group"
					>
						<span>ไปยังหน้าค้นหาแบบเต็ม</span>
						<ChevronRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
					</a>
				</div>

				<!-- Bento Card 3: Student Voice & Complaints -->
				<div class="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between">
					<div>
						<div class="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-2xl flex items-center justify-center mb-5 shadow-warm-xs">
							<FileText class="w-6 h-6 stroke-[2.2]" />
						</div>
						<h3 class="text-lg font-bold text-slate-900 mb-2 tracking-tight">
							เรื่องร้องเรียน & เสนอแนะ
						</h3>
						<p class="text-slate-500 text-xs leading-relaxed mb-6">
							ร่วมสะท้อนปัญหาเกี่ยวกับการเรียน กิจกรรม อาคารสถานที่ หรือข้อเสนอแนะในการพัฒนามหาวิทยาลัย
						</p>
					</div>

					<a
						href={settings.complaint_url || 'https://forms.gle/your-google-form-link'}
						target="_blank"
						rel="noreferrer"
						class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition active-press"
					>
						<span>กรอกแบบฟอร์มเสียงนักศึกษา</span>
						<ExternalLink class="w-3.5 h-3.5" />
					</a>
				</div>

				<!-- Bento Card 4: Official Social Channels Strip -->
				<div id="channels" class="scroll-mt-24 md:col-span-2 bg-white rounded-3xl p-7 border border-slate-200/90 shadow-warm hover:shadow-warm-lg transition-all duration-300 flex flex-col justify-between">
					<div class="mb-5 flex flex-wrap justify-between items-center gap-2">
						<div>
							<h3 class="text-lg font-bold text-slate-900 tracking-tight">
								ช่องทางติดต่อสื่อสารทางการ
							</h3>
							<p class="text-slate-500 text-xs mt-0.5">
								ติดตามข่าวสารกิจกรรม นโยบาย และประกาศเร่งด่วนจากสภานักศึกษา
							</p>
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<a
							href={settings.social_facebook || 'https://www.facebook.com'}
							target="_blank"
							rel="noreferrer"
							class="bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-300 p-4 rounded-2xl transition flex items-center gap-3.5 group active-press"
						>
							<div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
								f
							</div>
							<div class="truncate">
								<div class="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition">Facebook</div>
								<div class="text-[11px] text-slate-500 truncate">{settings.social_facebook_title || 'สภานักศึกษา มจพ.'}</div>
							</div>
						</a>

						<a
							href={settings.social_instagram || 'https://www.instagram.com'}
							target="_blank"
							rel="noreferrer"
							class="bg-slate-50 hover:bg-pink-50/70 border border-slate-200/80 hover:border-pink-300 p-4 rounded-2xl transition flex items-center gap-3.5 group active-press"
						>
							<div class="w-10 h-10 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
								IG
							</div>
							<div class="truncate">
								<div class="font-bold text-xs text-slate-800 group-hover:text-pink-600 transition">Instagram</div>
								<div class="text-[11px] text-slate-500 truncate">{settings.social_instagram_title || 'Instagram สภานักศึกษา มจพ.'}</div>
							</div>
						</a>

						<a
							href={settings.social_tiktok || 'https://www.tiktok.com'}
							target="_blank"
							rel="noreferrer"
							class="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-400 p-4 rounded-2xl transition flex items-center gap-3.5 group active-press"
						>
							<div class="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
								TT
							</div>
							<div class="truncate">
								<div class="font-bold text-xs text-slate-800 group-hover:text-slate-950 transition">TikTok</div>
								<div class="text-[11px] text-slate-500 truncate">{settings.social_tiktok_title || 'สภานักศึกษา มจพ.'}</div>
							</div>
						</a>
					</div>
				</div>
			</div>
		</section>

		<!-- Complaint Callout Banner -->
		<section
			id="complaint"
			class="scroll-mt-24 bg-gradient-to-r from-slate-900 via-slate-800 to-zinc-900 text-white p-8 md:p-10 rounded-3xl shadow-warm border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6"
		>
			<div class="space-y-1.5 text-center md:text-left">
				<div class="inline-flex items-center gap-1.5 text-orange-400 text-xs font-semibold uppercase tracking-wider">
					<span>ศูนย์รับเรื่องราวร้องทุกข์</span>
				</div>
				<h3 class="text-xl md:text-2xl font-bold tracking-tight">
					พบปัญหาหรือต้องการความช่วยเหลือในมหาวิทยาลัย?
				</h3>
				<p class="text-slate-300 text-xs md:text-sm max-w-xl font-light leading-relaxed">
					สภานักศึกษาพร้อมเป็นตัวกลางในการประสานงานกับหน่วยงานที่เกี่ยวข้องเพื่อสิทธิและสวัสดิการของเพื่อนนักศึกษาทุกคน
				</p>
			</div>
			<a
				href={settings.complaint_url || 'https://forms.gle/your-google-form-link'}
				target="_blank"
				rel="noreferrer"
				class="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-warm hover:shadow-warm-lg transition-all duration-200 whitespace-nowrap flex items-center gap-2 text-xs md:text-sm active-press cursor-pointer shrink-0"
			>
				<span>ส่งเรื่องร้องเรียนออนไลน์</span>
				<ExternalLink class="w-4 h-4" />
			</a>
		</section>
	</main>

	<!-- Footer -->
	<footer class="bg-slate-900 text-slate-400 py-12 text-xs mt-auto border-t border-slate-800/80">
		<div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
			<div class="text-center md:text-left space-y-1">
				<p class="font-semibold text-slate-200 text-sm">
					สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)
				</p>
				<p class="text-slate-400 font-light">
					อาคาร 40 ปี มจพ. ชั้น 6, 1518 ถนนประชาราษฎร์ 1 แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพฯ 10800
				</p>
				<p class="text-slate-500 text-[11px] pt-1">
					อีเมล: <span class="text-slate-300">{settings.contact_email || 'council@kmutnb.ac.th'}</span> • โทร: <span class="text-slate-300">{settings.contact_phone || '02-555-2000 ต่อ 1135'}</span>
				</p>
			</div>
			<div class="flex items-center space-x-5 text-slate-300 text-xs font-medium">
				<a href="/booking" class="hover:text-white transition">
					จองห้องประชุม
				</a>
				<a href="/track" class="hover:text-white transition">
					ตรวจสอบสถานะ
				</a>
				<a href="/admin/login" class="hover:text-white transition">
					ระบบแอดมิน
				</a>
			</div>
		</div>
	</footer>
	<ViewSwitcherFooter currentMode="desktop" />
</div>
