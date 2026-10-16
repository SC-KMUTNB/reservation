'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles, Check, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (bookingCode: string) => void;
}

/**
 * Extracts booking code from raw QR text or application URLs
 * Supports:
 * - Direct code: "BK-2026-XXXX"
 * - Dashboard URL: ".../admin/dashboard?checkIn=BK-XXXX"
 * - Track URL: ".../track?q=BK-XXXX"
 */
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
    // If not a valid URL, continue with regex match
  }

  // Check if string contains BK- pattern or return cleaned string
  const bkMatch = trimmed.match(/BK-[A-Za-z0-9_-]+/i);
  if (bkMatch) {
    return bkMatch[0].toUpperCase();
  }

  return trimmed;
}

function playScanFeedback() {
  // 1. Audio feedback via Web Audio API
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

  // 2. Haptic vibration feedback
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {}
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandlingScanRef = useRef(false);
  const scannerContainerId = 'qr-reader-container';

  const handleDetectedCode = useCallback((decodedText: string) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;

    playScanFeedback();

    const code = extractBookingCode(decodedText);
    onScanSuccess(code);
  }, [onScanSuccess]);

  // Clean stop scanner helper
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  // Initialize and start scanner
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    isHandlingScanRef.current = false;
    setIsStarting(true);
    setScannerError(null);

    let isSubscribed = true;

    const startCamera = async () => {
      try {
        await stopScanner();
        if (!isSubscribed) return;

        // Query available camera devices
        try {
          const devices = await Html5Qrcode.getCameras();
          if (isSubscribed && devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch {
          // getCameras might throw if permissions not yet requested
        }

        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

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
            if (isSubscribed) {
              handleDetectedCode(decodedText);
            }
          },
          () => {
            // scan failure callback (ignored for continuous scanning)
          }
        );

        if (isSubscribed) {
          setIsStarting(false);
        }
      } catch (err: unknown) {
        if (!isSubscribed) return;
        setIsStarting(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setScannerError('กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงกล้องถ่ายรูปเพื่อสแกน QR Code');
        } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
          setScannerError('ไม่พบอุปกรณ์กล้องถ่ายรูปในเครื่องนี้ กรุณาใช้การกรอกรหัสด้วยตนเอง');
        } else {
          setScannerError('ไม่สามารถเปิดกล้องได้: ' + msg);
        }
      }
    };

    // Small delay to ensure container element is mounted
    const timer = setTimeout(startCamera, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, selectedCameraId, facingMode, stopScanner, handleDetectedCode]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = extractBookingCode(manualCode);
    playScanFeedback();
    onScanSuccess(code);
  };

  const handleSwitchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIndex].id);
    } else {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">สแกน QR Code เช็กอิน</h3>
              <p className="text-[11px] text-slate-400">ส่องกล้องไปที่ QR Code ของผู้เข้าใช้บริการ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่างสแกน"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          {/* Live Viewport Area */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center border-2 border-slate-800 shadow-inner">
            <div id={scannerContainerId} className="w-full h-full" />

            {/* Target Viewfinder Guides */}
            {!scannerError && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-orange-500/60 rounded-2xl relative">
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>
            )}

            {isStarting && !scannerError && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-white text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-orange-400" />
                <span>กำลังเปิดกล้อง...</span>
              </div>
            )}

            {/* Camera switch toggle button */}
            {!scannerError && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-md border border-slate-700/80 text-xs flex items-center gap-1.5 transition active-press cursor-pointer shadow-md"
                title="สลับกล้องหน้า/หลัง"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">สลับกล้อง</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {scannerError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">ไม่สามารถใช้งานกล้องได้</span>
                <span className="text-slate-600 block leading-relaxed">{scannerError}</span>
              </div>
            </div>
          )}

          {/* Manual Code Input Fallback */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span>หรือกรอกรหัสการจองด้วยตนเอง:</span>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="เช่น BK-2026-XXXX"
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-orange-500 uppercase placeholder:normal-case"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition active-press cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ตรวจสอบ</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0 text-xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            ระบบจะแสดงข้อมูลก่อนยืนยันเช็กอิน
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition cursor-pointer text-xs"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
