<script lang="ts">
  import type { Snippet } from 'svelte';
  import MobileBottomNav from '$lib/components/mobile/MobileBottomNav.svelte';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<svelte:head>
  <title>ระบบจองห้องประชุม สภานักศึกษา มจพ. (Mobile)</title>
  <meta name="description" content="ระบบจองห้องประชุมสภานักศึกษา มจพ. สำหรับอุปกรณ์มือถือ" />
</svelte:head>

<div class="min-h-dvh flex flex-col bg-slate-100 text-slate-800">
  <div class="w-full max-w-md mx-auto min-h-dvh flex flex-col bg-slate-50 shadow-md relative pb-20">
    {#if children}
      {@render children()}
    {/if}
    <MobileBottomNav />
  </div>
</div>
