'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, RotateCw, CheckCircle2, AlertCircle, X, Trash2, Edit2, Send, Clock, Key, Sparkles, RefreshCw } from 'lucide-react';

interface AdminUserItem {
  id: string;
  email: string;
  username?: string | null;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isActive: boolean;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  createdAt: string;
}

export default function MobileAdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<'invite' | 'direct'>('invite');
  const [isResending, setIsResending] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvite = async (userId: string, userEmail: string) => {
    setIsResending(userId);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${userId}/resend-invite`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'ไม่สามารถส่งคำเชิญซ้ำได้');
        return;
      }
      setMessage(data.message || `ส่งคำเชิญใหม่ไปยัง ${userEmail} เรียบร้อยแล้ว`);
      fetchUsers();
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsResending(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const payload = {
        ...formData,
        sendInvite: creationMode === 'invite',
      };

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'เพิ่มผู้ใช้งานไม่สำเร็จ');
        return;
      }

      setMessage(data.message || 'เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว');
      setIsAddOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'ADMIN' });
      fetchUsers();
    } catch (e) {
      console.error(e);
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">ผู้ดูแลระบบ (Users)</h2>
          <p className="text-xs text-slate-500">จัดการสิทธิ์บัญชีผู้ดูแลและเจ้าหน้าที่</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>เพิ่ม</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Users Card Feed */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <RotateCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
            <span>กำลังโหลดรายชื่อ...</span>
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{u.fullName}</span>
                  {u.username && (
                    <span className="text-[10px] text-orange-600 font-mono font-medium block">
                      @{u.username}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.role === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </span>
                  {u.inviteToken ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> รอตั้งรหัสผ่าน
                    </span>
                  ) : null}
                </div>
              </div>

              {u.inviteToken && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleResendInvite(u.id, u.email)}
                    disabled={isResending === u.id}
                    className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-semibold px-2.5 py-1 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isResending === u.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-orange-600" />
                    ) : (
                      <Send className="w-3 h-3 text-orange-600" />
                    )}
                    <span>ส่งคำเชิญซ้ำ</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add User Bottom Sheet */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-3.5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">เพิ่มผู้ดูแลระบบใหม่</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setCreationMode('invite')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  creationMode === 'invite'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>ส่งคำเชิญ (แนะนำ)</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('direct')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  creationMode === 'direct'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                <Key className="w-3 h-3" />
                <span>กำหนดรหัสผ่านทันที</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="เช่น นายแอดมิน มจพ."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  อีเมล (@email.kmutnb.ac.th หรือ @kmutnb.ac.th)
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@kmutnb.ac.th"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              {creationMode === 'invite' ? (
                <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3 space-y-1">
                  <div className="flex items-center gap-1 text-orange-900 font-bold text-[11px]">
                    <Sparkles className="w-3 h-3 text-orange-600" />
                    <span>ผู้ใช้จะกำหนดรหัสผ่านด้วยตนเอง</span>
                  </div>
                  <p className="text-[10px] text-orange-800/90 leading-relaxed font-light">
                    ระบบจะส่งอีเมลคำเชิญไปยังผู้ใช้ พร้อมปุ่มลิงก์สร้างรหัสผ่าน (มีอายุ 48 ชั่วโมง)
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัวอักษร)
                  </label>
                  <input
                    type="password"
                    required={creationMode === 'direct'}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  บทบาท (Role)
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="ADMIN">ADMIN (เจ้าหน้าที่อนุมัติ)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (สิทธิ์สูงสุด)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs active:scale-98 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : creationMode === 'invite' ? (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งคำเชิญและสร้างบัญชี</span>
                    </>
                  ) : (
                    <span>สร้างบัญชีผู้ใช้งานทันที</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
