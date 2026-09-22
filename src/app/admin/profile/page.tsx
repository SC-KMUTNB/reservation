'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  User,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Lock,
  Check,
  X,
  ExternalLink,
  Unlink,
  Link2
} from 'lucide-react';

interface ProfileUser {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isGoogleLinked: boolean;
  googleEmail?: string | null;
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const [fullNameInput, setFullNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Check URL query params for OAuth status
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const attemptedEmail = searchParams.get('attemptedEmail');

    if (success === 'LINKED') {
      setActionSuccess('ผูกบัญชี Google (@email.kmutnb.ac.th) เข้ากับบัญชีผู้ดูแลระบบเรียบร้อยแล้ว');
    } else if (error === 'INVALID_DOMAIN') {
      setActionError(
        `ไม่สามารถผูกบัญชีได้: บัญชี Google (${attemptedEmail || ''}) ไม่ถูกต้อง ต้องใช้อีเมลที่ลงท้ายด้วย @email.kmutnb.ac.th เท่านั้น`
      );
    } else if (error === 'ALREADY_LINKED_TO_OTHER') {
      setActionError('ไม่สามารถผูกบัญชีได้: บัญชี Google นี้ถูกผูกไว้กับผู้ดูแลระบบท่านอื่นแล้ว');
    } else if (error === 'GOOGLE_NOT_CONFIGURED') {
      setActionError('ระบบยังไม่ได้กำหนดค่า GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET ในระบบ');
    } else if (error) {
      setActionError(`เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google: ${error}`);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setFullNameInput(data.user.fullName || '');
      } else {
        router.push('/admin/login');
      }
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setActionSuccess(null);
    setActionError(null);

    if (passwordInput && passwordInput.length < 6) {
      setActionError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (passwordInput && passwordInput !== confirmPasswordInput) {
      setActionError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload: any = {
        fullName: fullNameInput.trim(),
      };
      if (passwordInput.trim()) {
        payload.password = passwordInput.trim();
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
        return;
      }

      setActionSuccess('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
      setPasswordInput('');
      setConfirmPasswordInput('');
      fetchProfile();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm('คุณต้องการยกเลิกการผูกบัญชี Google ใช่หรือไม่? หลังจากยกเลิก คุณจะไม่สามารถเข้าสู่ระบบด้วย Google ได้จนกว่าจะผูกบัญชีใหม่')) return;

    setIsUnlinking(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const res = await fetch('/api/auth/google/unlink', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถยกเลิกการผูกบัญชีได้');
        return;
      }

      setActionSuccess('ยกเลิกการผูกบัญชี Google เรียบร้อยแล้ว');
      fetchProfile();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsUnlinking(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center text-slate-400 text-xs">กำลังโหลดข้อมูลส่วนตัว...</div>;
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          โปรไฟล์และข้อมูลส่วนตัว
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-light">
          จัดการข้อมูลผู้ใช้งาน เปลี่ยนรหัสผ่าน และผูกบัญชี Google (@email.kmutnb.ac.th) เพื่อความสะดวกในการเข้าสู่ระบบ
        </p>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-start justify-between shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-rose-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Google Account Linking Card */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
              <GoogleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                การเชื่อมต่อบัญชี Google (@email.kmutnb.ac.th)
              </h3>
              <p className="text-[11px] text-slate-500">
                ผูกบัญชีเพื่อเปิดใช้งานปุ่ม "เข้าสู่ระบบด้วย Google" บนหน้าหลักผู้ดูแลระบบ
              </p>
            </div>
          </div>

          <div>
            {user.isGoogleLinked ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ผูกบัญชีแล้ว
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium px-3 py-1 rounded-full">
                ยังไม่ได้ผูกบัญชี
              </span>
            )}
          </div>
        </div>

        {user.isGoogleLinked ? (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-500">บัญชี Google ที่เชื่อมโยงอยู่ในปัจจุบัน:</div>
              <div className="font-mono text-sm font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-600" />
                <span>{user.googleEmail}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                ท่านสามารถกด "เข้าสู่ระบบด้วย Google" ที่หน้าเข้าสู่ระบบเพื่อเข้าใช้งานได้ทันที
              </p>
            </div>

            <button
              type="button"
              disabled={isUnlinking}
              onClick={handleUnlinkGoogle}
              className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 font-semibold px-4 py-2 rounded-xl text-xs transition active-press shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>{isUnlinking ? 'กำลังยกเลิก...' : 'ยกเลิกการผูกบัญชี'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-orange-50/60 border border-orange-200/80 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="text-xs font-bold text-orange-900">
                ต้องการเข้าสู่ระบบแบบไม่ต้องจำรหัสผ่าน?
              </div>
              <p className="text-xs text-orange-800 leading-relaxed font-light">
                คลิกปุ่มด้านล่างเพื่อเชื่อมต่อบัญชี Google ของมหาวิทยาลัย (รูปแบบ <span className="font-mono font-semibold">@email.kmutnb.ac.th</span>) ระบบจะบันทึกการเชื่อมโยงอย่างปลอดภัย
              </p>
            </div>

            <a
              href="/api/auth/google?action=link"
              className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold px-5 py-2.5 rounded-xl text-xs transition active-press shadow-2xs flex items-center gap-2.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>ผูกบัญชี Google ทันที</span>
            </a>
          </div>
        )}
      </div>

      {/* Account Info & Password Update */}
      <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/90 shadow-warm space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <User className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">ข้อมูลผู้ใช้งานและรหัสผ่าน</h3>
            <p className="text-[11px] text-slate-500">แก้ไขชื่อที่แสดง และเปลี่ยนรหัสผ่านส่วนตัว</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมลผู้ดูแลระบบ (ล็อกอิน)</label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ระดับสิทธิ์การใช้งาน (Role)</label>
            <div className="py-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  user.role === 'SUPER_ADMIN'
                    ? 'bg-orange-50 text-orange-800 border border-orange-300'
                    : 'bg-blue-50 text-blue-800 border border-blue-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {user.role === 'SUPER_ADMIN' ? 'Super Admin (สิทธิ์สูงสุด)' : 'Staff Admin (เจ้าหน้าที่)'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล ที่แสดงในระบบ</label>
          <input
            type="text"
            required
            value={fullNameInput}
            onChange={(e) => setFullNameInput(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>เปลี่ยนรหัสผ่านส่วนตัว (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">รหัสผ่านใหม่</label>
              <input
                type="password"
                minLength={6}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ยืนยันรหัสผ่านใหม่อีกครั้ง</label>
              <input
                type="password"
                minLength={6}
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition active-press shadow-warm-xs cursor-pointer disabled:opacity-50"
          >
            {isSavingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400 text-xs">กำลังโหลด...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
