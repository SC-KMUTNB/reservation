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
  Sparkles,
  KeyRound
} from 'lucide-react';

interface InviteInfo {
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  suggestedUsername?: string;
}

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
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
        setTokenError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบลิงก์คำเชิญได้');
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

      // Success! Auto-logged in, navigate to admin dashboard
      router.push('/admin/dashboard');
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
        <RotateCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
        <div className="text-slate-300 text-xs font-medium">กำลังตรวจสอบลิงก์คำเชิญ...</div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">ลิงก์คำเชิญไม่สามารถใช้งานได้</h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">{tokenError}</p>
        <div className="pt-2">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition"
          >
            ไปยังหน้าเข้าสู่ระบบ &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
      {/* Account Info Pill */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
            {inviteInfo?.fullName.slice(0, 1) || 'A'}
          </div>
          <div>
            <div className="font-bold text-xs text-white">{inviteInfo?.fullName}</div>
            <div className="text-[11px] text-slate-400 font-mono">{inviteInfo?.email}</div>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
            inviteInfo?.role === 'SUPER_ADMIN'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
          }`}
        >
          {inviteInfo?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
        </span>
      </div>

      {submitError && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Username (Optional) */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            ตั้งชื่อผู้ใช้ (Username สำหรับเข้าสู่ระบบ)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400 font-bold font-mono text-sm">
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
              placeholder="เช่น somchai.k หรือ admin_sc"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            สามารถใช้ชื่อผู้ใช้นี้เข้าสู่ระบบแทนการพิมพ์อีเมลยาวๆ ได้
          </p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            กำหนดรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            ยืนยันรหัสผ่านใหม่อีกครั้ง
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          {isSubmitting ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>กำลังบันทึกรหัสผ่าน...</span>
            </>
          ) : (
            <>
              <span>บันทึกรหัสผ่านและเข้าสู่ระบบ</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-orange-600 to-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-600/30">
            <Landmark className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            สร้างรหัสผ่านผู้ดูแลระบบ
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
          </p>
        </div>

        <Suspense
          fallback={
            <div className="text-center py-16 text-xs text-slate-400">กำลังโหลด...</div>
          }
        >
          <SetupPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
