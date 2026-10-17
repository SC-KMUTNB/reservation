<script lang="ts">
	import './globals.css';
	let { children } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content="#ea580c" />
	<title>สภานักศึกษา มจพ. - พอร์ทัลและระบบจองห้องประชุม</title>
	<meta
		name="description"
		content="ระบบจองห้องประชุมและศูนย์บริการนักศึกษา สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.)"
	/>
</svelte:head>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-hidden"
>
	ข้ามไปยังเนื้อหาหลัก
</a>

<div id="main-content" class="flex flex-col flex-grow min-h-dvh">
	{@render children()}
</div>
