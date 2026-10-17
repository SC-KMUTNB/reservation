<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Landmark } from 'lucide-svelte';

  interface Props {
    title?: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    rightAction?: Snippet;
  }

  let {
    title = 'สภานักศึกษา มจพ.',
    subtitle = 'Student Council KMUTNB',
    rightAction,
  }: Props = $props();
</script>

<header class="sticky top-0 z-40 bg-orange-600 text-white shadow-warm-xs backdrop-blur-md bg-orange-600/95 border-b border-orange-500/40">
  <div class="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
    <a href="/m" class="flex items-center space-x-2.5 active:scale-95 transition-transform">
      <div class="bg-white text-orange-600 p-1.5 rounded-xl font-bold w-8 h-8 flex items-center justify-center shadow-xs">
        <Landmark class="w-4 h-4 stroke-[2.4]" />
      </div>
      <div class="overflow-hidden">
        <h1 class="font-bold text-sm leading-tight text-white tracking-tight truncate">
          {title}
        </h1>
        <p class="text-[10px] text-orange-100 font-medium tracking-wide truncate">
          {subtitle}
        </p>
      </div>
    </a>

    {#if rightAction}
      <div>{@render rightAction()}</div>
    {:else}
      <a
        href="/m/track"
        class="text-[11px] font-semibold bg-white/15 hover:bg-white/25 active:bg-white/30 text-white px-2.5 py-1.5 rounded-xl transition-colors"
      >
        เช็คสถานะ
      </a>
    {/if}
  </div>
</header>
