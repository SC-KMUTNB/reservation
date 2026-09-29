'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Shield, Key, Lock, CheckCircle2, AlertCircle, RotateCw, Sparkles, ChevronRight } from 'lucide-react';
import ClaimUsernameModal from '@/components/admin/ClaimUsernameModal';

interface ProfileUser {
  id: string;
  email: string;
  username?: string | null;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isGoogleLinked: boolean;
  googleEmail?: string | null;
}

function MobileProfileContent() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      } else {
        router.push('/m/admin/login');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และการยืนยันไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPassword,
          currentPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
        return;
      }

      setSuccessMsg('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <RotateCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
        <span>กำลังโหลดข้อมูลโปรไฟล์...</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">โปรไฟล์ผู้ดูแลระบบ</h2>
        <p className="text-xs text-slate-500">จัดการข้อมูลบัญชีผู้ใช้และความปลอดภัย</p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800">{user?.fullName}</h3>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <span className="inline-block mt-1 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin (สิทธิ์สูงสุด)' : 'Admin (เจ้าหน้าที่)'}
            </span>
          </div>
        </div>
      </div>

      {/* Username Setup Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <User className="w-4 h-4 text-orange-600" />
            <span>ชื่อผู้ใช้สำหรับล็อกอิน (Username)</span>
          </div>
          <button
            type="button"
            onClick={() => setIsClaimModalOpen(true)}
            className="text-xs text-orange-600 hover:text-orange-700 font-bold bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-xl transition cursor-pointer"
          >
            {user?.username ? 'แก้ไขชื่อผู้ใช้' : '+ ตั้งชื่อผู้ใช้'}
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="text-[10px] text-slate-400">Username สำหรับล็อกอินแทนอีเมล:</div>
          <div className="font-mono text-xs font-bold text-slate-800 mt-0.5">
            {user?.username ? (
              <span className="text-orange-600 text-sm">@{user.username}</span>
            ) : (
              <span className="text-slate-400 font-normal italic">ยังไม่ได้ตั้งชื่อผู้ใช้ (ใช้อีเมลเข้าสู่ระบบ)</span>
            )}
          </div>
        </div>
      </div>

      {/* System Changelog Link Card */}
      <Link
        href="/m/admin/changelog"
        className="block bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-4 border border-slate-700/80 shadow-md active:scale-98 transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1.5">
                <span>บันทึกการอัปเดตระบบ</span>
                <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                  Changelog
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ดูประวัติเวอร์ชันและฟีเจอร์ใหม่
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </Link>

      {/* Change Password Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Key className="w-4 h-4 text-orange-600" />
          <span>เปลี่ยนรหัสผ่านบัญชี</span>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs active:scale-98 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            {isUpdatingPassword ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึกรหัสผ่านใหม่...</span>
              </>
            ) : (
              <span>บันทึกรหัสผ่านใหม่</span>
            )}
          </button>
        </form>
      </div>

      {/* Claim / Edit Username Modal */}
      <ClaimUsernameModal
        isOpen={isClaimModalOpen}
        userFullName={user?.fullName}
        onClose={() => setIsClaimModalOpen(false)}
        onSuccess={(claimedUsername) => {
          setUser((prev) => (prev ? { ...prev, username: claimedUsername } : null));
          setIsClaimModalOpen(false);
          setSuccessMsg(`บันทึกชื่อผู้ใช้ @${claimedUsername} เรียบร้อยแล้ว`);
        }}
      />
    </div>
  );
}

export default function MobileAdminProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">กำลังโหลด...</div>
      }
    >
      <MobileProfileContent />
    </Suspense>
  );
}
