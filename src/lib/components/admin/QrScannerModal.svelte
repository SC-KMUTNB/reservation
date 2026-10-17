<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Camera, X, RefreshCw, AlertCircle, Sparkles, Check, Keyboard } from 'lucide-svelte';
  import { Html5Qrcode } from 'html5-qrcode';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (bookingCode: string) => void;
  }

  let { isOpen, onClose, onScanSuccess }: Props = $props();

  export function extractBookingCode(scannedText: string): string {
    const trimmed = scannedText.trim();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const url = new URL(trimmed);
        const checkInParam = url.searchParams.get('checkIn');
        if (checkInParam) return checkInParam.trim();
        const qParam = url.searchParams.get('q');
        if (qParam) return qParam.trim();
      }
    } catch {
      // ignore
    }

    const bkMatch = trimmed.match(/BK-[A-Za-z0-9_-]+/i);
    if (bkMatch) {
      return bkMatch[0].toUpperCase();
    }
    return trimmed;
  }

  function playScanFeedback() {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {}

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch {}
  }

  let scannerError = $state<string | null>(null);
  let isStarting = $state(true);
  let manualCode = $state('');
  let cameras = $state<Array<{ id: string; label: string }>>([]);
  let selectedCameraId = $state<string | null>(null);
  let facingMode = $state<'environment' | 'user'>('environment');

  let scannerInstance: Html5Qrcode | null = null;
  let isHandlingScan = false;
  const scannerContainerId = 'qr-reader-container';

  function handleDetectedCode(decodedText: string) {
    if (isHandlingScan) return;
    isHandlingScan = true;
    playScanFeedback();
    const code = extractBookingCode(decodedText);
    onScanSuccess(code);
  }

  async function stopScanner() {
    if (scannerInstance) {
      try {
        if (scannerInstance.isScanning) {
          await scannerInstance.stop();
        }
        await scannerInstance.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerInstance = null;
    }
  }

  async function startCamera() {
    try {
      await stopScanner();

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          cameras = devices;
        }
      } catch {
        // Permissions not yet requested
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      scannerInstance = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode };

      await html5QrCode.start(
        cameraConfig,
        config,
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {}
      );

      isStarting = false;
    } catch (err: unknown) {
      isStarting = false;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        scannerError = 'กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้องถ่ายรูปเพื่อสแกน QR Code';
      } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
        scannerError = 'ไม่พบอุปกรณ์กล้องถ่ายรูปในเครื่องนี้ กรุณาใช้การกรอกรหัสด้วยตนเอง';
      } else {
        scannerError = 'ไม่สามารถเปิดกล้องได้: ' + msg;
      }
    }
  }

  $effect(() => {
    if (isOpen) {
      isHandlingScan = false;
      isStarting = true;
      scannerError = null;
      const timer = setTimeout(startCamera, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  });

  onDestroy(() => {
    stopScanner();
  });

  function handleManualSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = extractBookingCode(manualCode);
    playScanFeedback();
    onScanSuccess(code);
  }

  function handleSwitchCamera() {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      selectedCameraId = cameras[nextIndex].id;
      startCamera();
    } else {
      facingMode = facingMode === 'environment' ? 'user' : 'environment';
      startCamera();
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
    <div class="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0 bg-slate-900 text-white">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
            <Camera class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold tracking-tight">สแกน QR Code เช็กอิน</h3>
            <p class="text-[11px] text-slate-400">ส่องกล้องไปที่ QR Code ของผู้เข้าใช้บริการ</p>
          </div>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          title="ปิดหน้าต่างสแกน"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Scanner Body -->
      <div class="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
        <!-- Live Viewport Area -->
        <div class="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center border-2 border-slate-800 shadow-inner">
          <div id={scannerContainerId} class="w-full h-full"></div>

          <!-- Target Viewfinder Guides -->
          {#if !scannerError}
            <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div class="w-56 h-56 border-2 border-orange-500/60 rounded-2xl relative">
                <div class="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-orange-500 rounded-tl-lg"></div>
                <div class="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-orange-500 rounded-tr-lg"></div>
                <div class="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-orange-500 rounded-bl-lg"></div>
                <div class="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-orange-500 rounded-br-lg"></div>
                <div class="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
              </div>
            </div>
          {/if}

          {#if isStarting && !scannerError}
            <div class="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-white text-xs">
              <RefreshCw class="w-6 h-6 animate-spin text-orange-400" />
              <span>กำลังเปิดกล้อง...</span>
            </div>
          {/if}

          <!-- Camera switch toggle button -->
          {#if !scannerError}
            <button
              type="button"
              onclick={handleSwitchCamera}
              class="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md border border-slate-700/80 text-xs flex items-center gap-1.5 transition active-press cursor-pointer shadow-md"
              title="สลับกล้องหน้า/หลัง"
            >
              <RefreshCw class="w-3.5 h-3.5" />
              <span class="text-[11px] font-medium">สลับกล้อง</span>
            </button>
          {/if}
        </div>

        <!-- Error Message -->
        {#if scannerError}
          <div class="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div class="space-y-1">
              <span class="font-semibold block">ไม่สามารถใช้งานกล้องได้</span>
              <span class="text-slate-600 block leading-relaxed">{scannerError}</span>
            </div>
          </div>
        {/if}

        <!-- Manual Code Input Fallback -->
        <div class="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Keyboard class="w-3.5 h-3.5 text-slate-500" />
            <span>หรือกรอกรหัสการจองด้วยตนเอง:</span>
          </div>
          <form onsubmit={handleManualSubmit} class="flex gap-2">
            <input
              type="text"
              bind:value={manualCode}
              oninput={() => (manualCode = manualCode.toUpperCase())}
              placeholder="เช่น BK-2026-XXXX"
              class="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-orange-500 uppercase placeholder:normal-case"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              class="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition active-press cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
            >
              <Check class="w-3.5 h-3.5" />
              <span>ตรวจสอบ</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0 text-xs">
        <span class="text-[11px] text-slate-500 flex items-center gap-1">
          <Sparkles class="w-3.5 h-3.5 text-orange-500" />
          ระบบจะแสดงข้อมูลก่อนยืนยันเช็กอิน
        </span>
        <button
          type="button"
          onclick={onClose}
          class="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
        >
          ปิด
        </button>
      </div>
    </div>
  </div>
{/if}
