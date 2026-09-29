'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Landmark, Lock, Mail, ArrowLeft, AlertCircle, RotateCw, User } from 'lucide-react';
import ViewSwitcherFooter from '@/components/mobile/ViewSwitcherFooter';

function MobileLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const oauthError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }

      router.push('/m/admin/dashboard');
    } catch (e) {
      console.error(e);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 p-4">
      <div className="w-full max-w-sm mx-auto pt-6 space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/m"
            className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <div className="w-12 h-12 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-600/30">
            <Landmark className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">เข้าสู่ระบบแอดมิน</h2>
          <p className="text-[11px] text-slate-400">สภานักศึกษา มจพ. (Mobile Portal)</p>
        </div>

        <div className="bg-slate-800 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
          {(error || oauthError) && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error || oauthError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ชื่อผู้ใช้ หรือ อีเมล
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ชื่อผู้ใช้ หรือ email@kmutnb.ac.th"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-xs active:scale-98 transition flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบ &rarr;</span>
              )}
            </button>
          </form>

          {/* Google OAuth Link */}
          <div className="pt-2 text-center border-t border-slate-700/60">
            <a
              href="/api/auth/google"
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl active:scale-98 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>เข้าสู่ระบบด้วย Google (@email.kmutnb)</span>
            </a>
          </div>
        </div>
      </div>

      <ViewSwitcherFooter currentMode="mobile" />
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs text-slate-400">
          กำลังโหลด...
        </div>
      }
    >
      <MobileLoginForm />
    </Suspense>
  );
}
