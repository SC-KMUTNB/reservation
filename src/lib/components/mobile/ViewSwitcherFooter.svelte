<script lang="ts">
	import { page } from '$app/state';
	import { Monitor, Smartphone } from 'lucide-svelte';

	let { currentMode = 'mobile' }: { currentMode?: 'mobile' | 'desktop' } = $props();

	function handleSwitch(mode: 'desktop' | 'mobile') {
		const pathname = page.url.pathname;
		let targetPath = pathname;
		if (mode === 'desktop') {
			targetPath = pathname.replace(/^\/m(?=\/|$)/, '') || '/';
		} else {
			targetPath = pathname === '/' ? '/m' : pathname.startsWith('/m') ? pathname : `/m${pathname}`;
		}

		document.cookie = `view_preference=${mode}; path=/; max-age=${60 * 60 * 24 * 365}`;
		window.location.href = `${targetPath}?view=${mode}`;
	}
</script>

<div class="py-6 text-center text-xs text-slate-500 border-t border-slate-200/80 bg-slate-100/60 mt-auto">
	<div class="max-w-md mx-auto px-4 space-y-2">
		<div class="flex items-center justify-center gap-2">
			{#if currentMode === 'mobile'}
				<button
					onclick={() => handleSwitch('desktop')}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-200 shadow-2xs font-medium text-[11px] transition-all cursor-pointer active:scale-95"
				>
					<Monitor class="w-3.5 h-3.5 text-slate-500" />
					<span>สลับไปใช้เวอร์ชันเดสก์ท็อป (Desktop Version)</span>
				</button>
			{:else}
				<button
					onclick={() => handleSwitch('mobile')}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-orange-600 hover:border-orange-200 shadow-2xs font-medium text-[11px] transition-all cursor-pointer active:scale-95"
				>
					<Smartphone class="w-3.5 h-3.5 text-orange-600" />
					<span>สลับไปใช้เวอร์ชันมือถือ (Mobile Version)</span>
				</button>
			{/if}
		</div>
		<p class="text-[10px] text-slate-400">
			สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)
		</p>
	</div>
</div>
