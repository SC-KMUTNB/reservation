'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Landmark, Lock, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  NOT_LINKED: 'บัญชี Google นี้ยังไม่ได้เชื่อมกับบัญชีผู้ดูแลระบบ — กรุณาเข้าสู่ระบบด้วยรหัสผ่านแล้วเชื่อมบัญชีในหน้าโปรไฟล์',
  INVALID_DOMAIN: 'อนุญาตเฉพาะอีเมล @email.kmutnb.ac.th เท่านั้น',
  ACCOUNT_SUSPENDED: 'บัญชีของคุณถูกระงับ — กรุณาติดต่อ Super Admin',
  GOOGLE_NOT_CONFIGURED: 'ระบบ Google OAuth ยังไม่ได้ตั้งค่า — กรุณาติดต่อผู้ดูแลระบบ',
  GOOGLE_CANCELLED: 'ยกเลิกการเข้าสู่ระบบด้วย Google',
  INVALID_STATE: 'เซสชันหมดอายุ กรุณาลองใหม่อีกครั้ง',
  GOOGLE_ERROR: 'เกิดข้อผิดพลาดจาก Google — กรุณาลองใหม่',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Read OAuth error from URL query params
  const oauthError = searchParams.get('error');
  const attemptedEmail = searchParams.get('attemptedEmail');
  const oauthErrorMessage = oauthError
    ? OAUTH_ERROR_MESSAGES[oauthError] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google'
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }

      router.push('/admin/dashboard');
    } catch (e) {
      console.error(e);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full relative z-10">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center space-x-2 text-xs text-orange-400 hover:text-orange-300 mb-6 transition">
          <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
        </Link>
        <div className="w-14 h-14 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-600/30">
          <Landmark className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">เข้าสู่ระบบผู้ดูแลระบบ</h2>
        <p className="text-slate-400 text-xs mt-1">สภานักศึกษา มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl">
        {/* OAuth error from URL */}
        {oauthErrorMessage && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span>{oauthErrorMessage}</span>
              {attemptedEmail && (
                <div className="mt-1 text-rose-400/70 text-[11px]">({attemptedEmail})</div>
              )}
            </div>
          </div>
        )}

        {/* Form-level error */}
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">อีเมลผู้ดูแลระบบ</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kmutnb.ac.th"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-md shadow-orange-600/20 cursor-pointer disabled:opacity-50 active-press"
          >
            {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">หรือ</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        {/* Google OAuth Button */}
        <a
          href="/api/auth/google?action=login"
          className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold py-2.5 rounded-xl text-xs transition shadow-sm active-press"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>เข้าสู่ระบบด้วย Google</span>
        </a>
        <p className="text-[10px] text-slate-500 text-center mt-3">
          ใช้ได้เฉพาะบัญชี @email.kmutnb.ac.th ที่เชื่อมไว้แล้ว
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <Suspense fallback={
        <div className="text-slate-400 text-xs">กำลังโหลด...</div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
