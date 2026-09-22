'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Landmark, Lock, Mail, ArrowLeft, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="min-h-dvh bg-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
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
        </div>
      </div>
    </div>
  );
}
