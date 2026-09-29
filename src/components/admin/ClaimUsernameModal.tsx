'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface ClaimUsernameModalProps {
  isOpen: boolean;
  userFullName?: string;
  onClose: () => void;
  onSuccess: (claimedUsername: string) => void;
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/;

export default function ClaimUsernameModal({
  isOpen,
  userFullName,
  onClose,
  onSuccess,
}: ClaimUsernameModalProps) {
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setIsAvailable(null);
      setAvailabilityMessage(null);
      return;
    }

    if (!USERNAME_REGEX.test(trimmed)) {
      setIsAvailable(false);
      setAvailabilityMessage(
        'ความยาว 3-20 ตัวอักษร ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ _ . - เท่านั้น'
      );
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const res = await fetch(
          `/api/auth/claim-username?username=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        if (data.available) {
          setIsAvailable(true);
          setAvailabilityMessage('ชื่อผู้ใช้นี้สามารถใช้งานได้');
        } else {
          setIsAvailable(false);
          setAvailabilityMessage(data.error || 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
        }
      } catch {
        setIsAvailable(null);
        setAvailabilityMessage(null);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !USERNAME_REGEX.test(cleanUsername)) {
      setError('กรุณากรอกชื่อผู้ใช้ให้ถูกต้องตามรูปแบบ');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/claim-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ไม่สามารถบันทึกชื่อผู้ใช้ได้');
        return;
      }

      onSuccess(cleanUsername);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('username_prompt_dismissed', 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Glow effect background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close / Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          title="ไว้คราวหลัง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 mb-0.5">
              <ShieldCheck className="w-3 h-3" /> แนะนำสำหรับแอดมิน
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              ตั้งชื่อผู้ใช้ (Claim Username)
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          ยินดีต้อนรับ {userFullName ? <b className="text-white">{userFullName}</b> : 'คุณ'}! เพื่อความสะดวกในการเข้าสู่ระบบครั้งถัดไป คุณสามารถตั้ง <b className="text-orange-400">Username</b> สั้นๆ แทนการพิมพ์อีเมลยาวๆ ได้แล้ววันนี้
        </p>

        {/* Form Error */}
        {error && (
          <div className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ชื่อผู้ใช้ที่ต้องการ (Username)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400 font-bold font-mono text-sm">
                @
              </span>
              <input
                type="text"
                autoFocus
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                maxLength={20}
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, ''))
                }
                placeholder="somchai.k หรือ admin_sc"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && (
                  <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                )}
                {!isChecking && isAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {!isChecking && isAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>

            {/* Availability feedback */}
            {availabilityMessage && (
              <div
                className={`mt-1.5 text-[11px] flex items-center gap-1.5 ${
                  isAvailable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span>{availabilityMessage}</span>
              </div>
            )}

            <div className="mt-1 text-[10px] text-slate-400">
              * 3-20 ตัวอักษร (a-z, 0-9, จุด ., ขีดล่าง _, ขีดกลาง -)
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              ไว้คราวหลัง
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAvailable === false || !username.trim()}
              className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold transition shadow-lg shadow-orange-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <span>ยืนยันชื่อผู้ใช้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
