'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Landmark,
  Lock,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';

interface InviteInfo {
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  suggestedUsername?: string;
}

function MobileSetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenError('ไม่พบรหัสโทเค็นในลิงก์คำเชิญ กรุณาตรวจสอบอีเมลอีกครั้ง');
      setIsLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/setup-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setTokenError(data.error || 'ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุแล้ว');
        } else {
          setInviteInfo(data.user);
          if (data.user?.suggestedUsername) {
            setUsername(data.user.suggestedUsername);
          }
        }
      } catch (err) {
        console.error(err);
        setTokenError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบคำเชิญได้');
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          username: username.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่าน');
        return;
      }

      // Success! Auto-logged in, navigate to mobile admin dashboard
      router.push('/m/admin/dashboard');
    } catch (err) {
      console.error(err);
      setSubmitError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <RotateCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
        <div className="text-slate-400 text-xs">กำลังตรวจสอบลิงก์คำเชิญ...</div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-5 shadow-xl text-center space-y-3">
        <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">ลิงก์คำเชิญไม่ถูกต้อง</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{tokenError}</p>
        <div className="pt-2">
          <Link
            href="/m/admin/login"
            className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
          >
            ไปยังหน้าเข้าสู่ระบบ &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
      {/* Account Info Pill */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
            {inviteInfo?.fullName.slice(0, 1) || 'A'}
          </div>
          <div className="truncate">
            <div className="font-bold text-xs text-white truncate">{inviteInfo?.fullName}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate">{inviteInfo?.email}</div>
          </div>
        </div>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            inviteInfo?.role === 'SUPER_ADMIN'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
          }`}
        >
          {inviteInfo?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
        </span>
      </div>

      {submitError && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        {/* Username */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            ตั้งชื่อผู้ใช้ (Username)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 font-bold font-mono text-xs">
              @
            </span>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={20}
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, ''))
              }
              placeholder="somchai.k"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">ใช้เข้าสู่ระบบแทนอีเมลยาวๆ</p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            ยืนยันรหัสผ่านอีกครั้ง
          </label>
          <div className="relative">
            <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-orange-600/30 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          {isSubmitting ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <span>บันทึกและเข้าสู่ระบบ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function MobileSetupPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 p-4">
      <div className="w-full max-w-sm mx-auto pt-6 space-y-5">
        <div className="text-center space-y-1.5">
          <Link
            href="/m"
            className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> หน้าหลัก
          </Link>
          <div className="w-12 h-12 bg-gradient-to-tr from-orange-600 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-orange-600/30">
            <Landmark className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            สร้างรหัสผ่านผู้ดูแลระบบ
          </h2>
          <p className="text-[11px] text-slate-400">สภานักศึกษา มจพ. (Mobile Portal)</p>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-12 text-xs text-slate-400">กำลังโหลด...</div>
          }
        >
          <MobileSetupPasswordForm />
        </Suspense>
      </div>

      <ViewSwitcherFooter currentMode="mobile" />
    </div>
  );
}
