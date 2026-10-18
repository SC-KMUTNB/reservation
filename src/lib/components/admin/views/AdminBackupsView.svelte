<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Database,
    UploadCloud,
    Download,
    RefreshCw,
    Trash2,
    ShieldAlert,
    CheckCircle2,
    AlertTriangle,
    X,
    FileSpreadsheet,
    FileJson,
    ArrowRight,
    RotateCcw,
    Layers,
    Lock,
    Clock,
  } from 'lucide-svelte';

  interface BackupItem {
    url: string;
    pathname: string;
    size: number;
    uploadedAt: string;
    downloadUrl: string;
  }

  let backups = $state<BackupItem[]>([]);
  let isBlobConfigured = $state(true);
  let isFetchingBackups = $state(false);
  let isCreatingBackup = $state(false);
  let isSuperAdmin = $state(false);

  let statusMessage = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);

  // Restore Modal State
  let isRestoreModalOpen = $state(false);
  let restoreSource = $state<'blob' | 'upload'>('blob');
  let selectedBlob = $state<BackupItem | null>(null);
  let restoreFile = $state<File | null>(null);
  let restoreFileInputRef: HTMLInputElement | undefined = $state();
  let restoreMode = $state<'merge' | 'replace'>('merge');
  let confirmationCode = $state('');
  let isRestoring = $state(false);

  let restoreSuccessResult = $state<{
    mode: string;
    restoredBookings: number;
    restoredSettings: number;
    restoredAuditLogs: number;
  } | null>(null);

  onMount(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.role === 'SUPER_ADMIN') {
          isSuperAdmin = true;
          fetchBackups();
        }
      })
      .catch(console.error);
  });

  async function fetchBackups() {
    isFetchingBackups = true;
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        isBlobConfigured = data.configured !== false;
        backups = data.backups || [];
      }
    } catch (e) {
      console.error('Error fetching backups:', e);
    } finally {
      isFetchingBackups = false;
    }
  }

  async function handleCreateBackup() {
    isCreatingBackup = true;
    statusMessage = null;
    errorMessage = null;
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        errorMessage = data.error || 'สร้างไฟล์สำรองข้อมูลไม่สำเร็จ';
      } else {
        statusMessage = `สร้างไฟล์สำรองข้อมูลสำเร็จ: ${data.backup?.pathname} (${data.metadata?.counts?.bookings} รายการจอง)`;
        await fetchBackups();
      }
    } catch (e: any) {
      errorMessage = e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isCreatingBackup = false;
    }
  }

  async function handleDeleteBackup(url: string) {
    if (!confirm('คุณต้องการลบไฟล์สำรองข้อมูลนี้จากคลาวด์ใช่หรือไม่?')) return;
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        await fetchBackups();
      } else {
        const data = await res.json();
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function openRestoreModal(target?: BackupItem) {
    if (target) {
      restoreSource = 'blob';
      selectedBlob = target;
      restoreFile = null;
    } else {
      restoreSource = 'upload';
      selectedBlob = null;
    }
    restoreMode = 'merge';
    confirmationCode = '';
    errorMessage = null;
    statusMessage = null;
    restoreSuccessResult = null;
    isRestoreModalOpen = true;
  }

  function handleFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      if (file.name.endsWith('.json')) {
        restoreFile = file;
        errorMessage = null;
      } else {
        errorMessage = 'กรุณาเลือกไฟล์สำรองข้อมูลนามสกุล .json เท่านั้น';
      }
    }
  }

  async function executeRestore() {
    if (restoreMode === 'replace' && confirmationCode.trim().toUpperCase() !== 'RESTORE') {
      alert('กรุณาพิมพ์คำว่า RESTORE ให้ถูกต้องเพื่อยืนยันการล้างข้อมูลเดิม');
      return;
    }

    isRestoring = true;
    errorMessage = null;
    statusMessage = null;

    try {
      let res: Response;

      if (restoreSource === 'upload') {
        if (!restoreFile) {
          throw new Error('กรุณาเลือกไฟล์ JSON สำหรับการกู้คืน');
        }
        const formData = new FormData();
        formData.append('file', restoreFile);
        formData.append('mode', restoreMode);
        formData.append('confirmText', confirmationCode);
        res = await fetch('/api/admin/backups/restore', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!selectedBlob) {
          throw new Error('กรุณาเลือกไฟล์สำรองข้อมูลบนคลาวด์');
        }
        res = await fetch('/api/admin/backups/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blobUrl: selectedBlob.url,
            pathname: selectedBlob.pathname,
            mode: restoreMode,
            confirmText: confirmationCode,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        errorMessage = data.error || 'เกิดข้อผิดพลาดในการกู้คืนฐานข้อมูล';
      } else {
        statusMessage = data.message || 'กู้คืนฐานข้อมูลสำเร็จ';
        restoreSuccessResult = data.result;
      }
    } catch (e: any) {
      errorMessage = e.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    } finally {
      isRestoring = false;
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<svelte:head>
  <title>ระบบสำรองและกู้คืนฐานข้อมูล - สภานักศึกษา มจพ.</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
          ศูนย์สำรอง & กู้คืนฐานข้อมูล (Database Backup & Restore)
        </h2>
        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Super Admin Only
        </span>
      </div>
      <p class="text-xs text-slate-500 mt-1 font-light">
        จัดการไฟล์สำรองข้อมูลบน Vercel Blob อัตโนมัติทุกวัน และกู้คืนข้อมูลแบบ Merge หรือ Clean Replace อย่างปลอดภัย
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => openRestoreModal()}
        class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-200 active-press cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5 text-orange-600" />
        <span>กู้คืนจากไฟล์เครื่อง (Restore File)</span>
      </button>

      <button
        type="button"
        onclick={handleCreateBackup}
        disabled={isCreatingBackup}
        class="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer disabled:opacity-50"
      >
        <UploadCloud class={`w-4 h-4 ${isCreatingBackup ? 'animate-spin' : ''}`} />
        <span>{isCreatingBackup ? 'กำลังสำรองข้อมูล...' : 'สำรองข้อมูลเดี๋ยวนี้ (Backup Now)'}</span>
      </button>
    </div>
  </div>

  <!-- Cron Schedule Banner -->
  <div class="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div class="flex items-start sm:items-center gap-3.5">
      <div class="w-11 h-11 rounded-2xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-warm-xs">
        <Clock class="w-5 h-5" />
      </div>
      <div>
        <div class="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span>กำหนดการสำรองข้อมูลอัตโนมัติ (Vercel Cron)</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            เปิดใช้งานอยู่
          </span>
        </div>
        <p class="text-xs text-slate-600 mt-0.5">
          ทำงานทุกวันเวลา <strong>02:00 น.</strong> (ประเทศไทย) โดยบันทึกสำเนาลง Vercel Blob และคงเหลือ 30 ชุดล่าสุด
        </p>
      </div>
    </div>

    <div class="text-[11px] font-mono text-slate-500 bg-white/80 px-3.5 py-2 rounded-xl border border-orange-200/80 shrink-0">
      CRON SCHEDULE: 0 19 * * * (UTC)
    </div>
  </div>

  <!-- Messages -->
  {#if statusMessage}
    <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between animate-fade-in">
      <div class="flex items-center gap-2.5">
        <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
        <span class="font-medium">{statusMessage}</span>
      </div>
      <button type="button" onclick={() => (statusMessage = null)} class="text-emerald-700 font-bold p-1 cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if errorMessage}
    <div class="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between animate-fade-in">
      <div class="flex items-center gap-2.5">
        <AlertTriangle class="w-4 h-4 text-rose-600 shrink-0" />
        <span class="font-medium">{errorMessage}</span>
      </div>
      <button type="button" onclick={() => (errorMessage = null)} class="text-rose-600 font-bold p-1 cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Blob Backups Table Card -->
  <div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-warm space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
      <div class="flex items-center gap-2.5">
        <Database class="w-5 h-5 text-orange-600" />
        <h3 class="font-bold text-sm text-slate-900">
          ประวัติไฟล์สำรองข้อมูลบนคลาวด์ ({backups.length} ไฟล์)
        </h3>
      </div>
      <button
        type="button"
        onclick={fetchBackups}
        disabled={isFetchingBackups}
        class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        <RefreshCw class={`w-3.5 h-3.5 ${isFetchingBackups ? 'animate-spin' : ''}`} />
        <span>รีเฟรชรายการ</span>
      </button>
    </div>

    {#if !isBlobConfigured}
      <div class="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-4 rounded-2xl flex items-center gap-2.5">
        <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          ยังไม่ได้เชื่อมต่อ Vercel Blob กรุณาระบุตัวแปร <code class="font-mono font-bold">BLOB_READ_WRITE_TOKEN</code> ในการตั้งค่า Environment Variables
        </span>
      </div>
    {/if}

    <div class="border border-slate-200 rounded-2xl overflow-hidden">
      {#if isFetchingBackups}
        <div class="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw class="w-4 h-4 animate-spin text-orange-600" />
          <span>กำลังโหลดรายการสำรองข้อมูล...</span>
        </div>
      {:else if backups.length === 0}
        <div class="p-12 text-center text-xs text-slate-400">
          ยังไม่มีไฟล์สำรองข้อมูลใน Vercel Blob (คลิก "สำรองข้อมูลเดี๋ยวนี้" เพื่อสร้างชุดแรก)
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th class="py-3 px-4 font-semibold">ชื่อไฟล์สำรองข้อมูล</th>
                <th class="py-3 px-4 font-semibold">ประเภท</th>
                <th class="py-3 px-4 font-semibold">ขนาดไฟล์</th>
                <th class="py-3 px-4 font-semibold">เวลาที่สร้าง</th>
                <th class="py-3 px-4 font-semibold text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each backups as item}
                <tr class="hover:bg-slate-50/70 transition">
                  <td class="py-3 px-4 font-mono text-[11px] text-slate-800 font-medium">
                    {item.pathname.replace('backups/', '')}
                  </td>
                  <td class="py-3 px-4">
                    {#if item.pathname.includes('-cron-')}
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        CRON (อัตโนมัติ)
                      </span>
                    {:else}
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                        MANUAL (ผู้ดูแลระบบ)
                      </span>
                    {/if}
                  </td>
                  <td class="py-3 px-4 text-slate-600">
                    {formatFileSize(item.size)}
                  </td>
                  <td class="py-3 px-4 text-slate-500">
                    {new Date(item.uploadedAt).toLocaleString('th-TH')}
                  </td>
                  <td class="py-3 px-4 text-right space-x-1.5">
                    <button
                      type="button"
                      onclick={() => openRestoreModal(item)}
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-bold transition cursor-pointer border border-orange-200/70 shadow-2xs"
                      title="กู้คืนฐานข้อมูลจากไฟล์นี้"
                    >
                      <RotateCcw class="w-3 h-3" />
                      <span>กู้คืน (Restore)</span>
                    </button>

                    <a
                      href={`/api/admin/backups/download?pathname=${encodeURIComponent(item.pathname)}&url=${encodeURIComponent(item.url)}`}
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition"
                      title="ดาวน์โหลดไฟล์ JSON"
                    >
                      <Download class="w-3 h-3" />
                      <span>ดาวน์โหลด</span>
                    </a>

                    <button
                      type="button"
                      onclick={() => handleDeleteBackup(item.url)}
                      class="inline-flex items-center gap-1 p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition cursor-pointer"
                      title="ลบไฟล์นี้"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>

  <!-- Interactive Restore Modal -->
  {#if isRestoreModalOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain bg-slate-950/60 backdrop-blur-xs">
      <div class="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="flex justify-between items-start pb-4 border-b border-slate-100 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <RotateCcw class="w-5 h-5" />
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900">
                กู้คืนฐานข้อมูลจากไฟล์สำรอง (Database Restore)
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">
                เลือกรูปแบบการนำข้อมูลกลับเข้าสู่ระบบ และยืนยันความปลอดภัย
              </p>
            </div>
          </div>
          <button
            type="button"
            onclick={() => (isRestoreModalOpen = false)}
            class="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        {#if restoreSuccessResult}
          <!-- Success Summary Screen -->
          <div class="py-6 space-y-4 text-center">
            <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 class="w-8 h-8" />
            </div>
            <div>
              <h4 class="font-bold text-lg text-slate-900">กู้คืนฐานข้อมูลเสร็จสมบูรณ์!</h4>
              <p class="text-xs text-slate-500 mt-1">
                ระบบได้ปรับปรุงและกู้คืนข้อมูลเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว
              </p>
            </div>

            <div class="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <div>
                <div class="text-[11px] text-slate-500 font-semibold">การจอง (Bookings)</div>
                <div class="text-lg font-extrabold text-emerald-600 mt-0.5">
                  +{restoreSuccessResult.restoredBookings}
                </div>
              </div>
              <div>
                <div class="text-[11px] text-slate-500 font-semibold">การตั้งค่า (Settings)</div>
                <div class="text-lg font-extrabold text-blue-600 mt-0.5">
                  +{restoreSuccessResult.restoredSettings}
                </div>
              </div>
              <div>
                <div class="text-[11px] text-slate-500 font-semibold">บันทึกตรวจ (Logs)</div>
                <div class="text-lg font-extrabold text-slate-700 mt-0.5">
                  +{restoreSuccessResult.restoredAuditLogs}
                </div>
              </div>
            </div>

            <div class="pt-3">
              <button
                type="button"
                onclick={() => {
                  isRestoreModalOpen = false;
                  window.location.reload();
                }}
                class="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                เสร็จสิ้นและรีเฟรชหน้าเว็บ
              </button>
            </div>
          </div>
        {:else}
          <!-- Modal Body Form -->
          <div class="overflow-y-auto flex-1 pr-1 -mr-1 space-y-5 pt-4">
            <!-- Source Card -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <FileJson class="w-5 h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  แหล่งข้อมูลที่ใช้กู้คืน:
                </div>
                {#if restoreSource === 'blob' && selectedBlob}
                  <div class="text-xs font-extrabold text-slate-900 truncate font-mono">
                    {selectedBlob.pathname.replace('backups/', '')}
                  </div>
                  <div class="text-[10px] text-slate-500">
                    Vercel Blob • ขนาด {formatFileSize(selectedBlob.size)}
                  </div>
                {:else}
                  <div class="text-xs font-extrabold text-slate-900 truncate">
                    {restoreFile ? restoreFile.name : 'ยังไม่ได้เลือกไฟล์จากเครื่อง'}
                  </div>
                  {#if restoreFile}
                    <div class="text-[10px] text-emerald-600 font-semibold">
                      ไฟล์พร้อมกู้คืน ({formatFileSize(restoreFile.size)})
                    </div>
                  {:else}
                    <button
                      type="button"
                      onclick={() => restoreFileInputRef?.click()}
                      class="text-[11px] text-orange-600 hover:underline font-bold mt-0.5 block cursor-pointer"
                    >
                      + คลิกเพื่อเลือกไฟล์ JSON จากเครื่อง
                    </button>
                  {/if}
                {/if}
              </div>
            </div>

            <input
              type="file"
              bind:this={restoreFileInputRef}
              onchange={handleFileSelected}
              accept=".json, application/json"
              class="hidden"
            />

            <!-- Mode Selector -->
            <div class="space-y-2">
              <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. เลือกรูปแบบการกู้คืน (Restore Mode):
              </div>
              <div class="space-y-2.5">
                <label
                  class={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition ${
                    restoreMode === 'merge'
                      ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-2 ring-orange-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onchange={() => (restoreMode = 'merge')}
                    class="mt-1 text-orange-600 focus:ring-orange-500"
                  />
                  <div class="space-y-0.5">
                    <div class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>รวมข้อมูลเดิม (Merge / Upsert)</span>
                      <span class="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        แนะนำ • ปลอดภัย
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-600 leading-relaxed">
                      อัปเดตข้อมูลการจองและการตั้งค่าที่มีอยู่เดิม และเพิ่มรายการใหม่ โดยไม่ลบข้อมูลอื่นที่ถูกสร้างหลังจากไฟล์สำรอง
                    </p>
                  </div>
                </label>

                <label
                  class={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition ${
                    restoreMode === 'replace'
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onchange={() => (restoreMode = 'replace')}
                    class="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div class="space-y-0.5">
                    <div class="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <span>ล้างและแทนที่ข้อมูลทั้งหมด (Clean Replace)</span>
                      <span class="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                        ลบข้อมูลปัจจุบัน
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-600 leading-relaxed">
                      ล้างข้อมูลการจองและการตั้งค่าปัจจุบันทั้งหมด แล้วกู้คืนตรงตามไฟล์สำรองข้อมูล (ใช้เมื่อต้องการย้อนระบบกลับไปจุดเดิมแบบ 100%)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Danger Zone for Replace Mode -->
            {#if restoreMode === 'replace'}
              <div class="bg-rose-50 border border-rose-300 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div class="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <ShieldAlert class="w-4 h-4 text-rose-600" />
                  <span>การยืนยันความปลอดภัยเพื่อล้างและแทนที่ข้อมูล:</span>
                </div>
                <p class="text-[11px] text-rose-700 leading-relaxed">
                  ข้อมูลการจองและการตั้งค่าปัจจุบันทั้งหมดจะถูกลบและแทนที่ด้วยข้อมูลจากไฟล์สำรอง กรุณาพิมพ์คำว่า <strong class="underline font-mono">RESTORE</strong> ด้านล่างเพื่อยืนยัน:
                </p>
                <input
                  type="text"
                  bind:value={confirmationCode}
                  placeholder="พิมพ์คำว่า RESTORE"
                  class="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-xs font-mono font-bold uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>
            {/if}
          </div>

          <!-- Modal Footer -->
          <div class="flex justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onclick={() => (isRestoreModalOpen = false)}
              class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onclick={executeRestore}
              disabled={isRestoring || (restoreSource === 'upload' && !restoreFile) || (restoreMode === 'replace' && confirmationCode.trim().toUpperCase() !== 'RESTORE')}
              class="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-warm-xs transition flex items-center gap-2 active-press cursor-pointer disabled:opacity-50"
            >
              <RotateCcw class={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
              <span>{isRestoring ? 'กำลังกู้คืนข้อมูล...' : 'ยืนยันเริ่มกู้คืนฐานข้อมูล'}</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
