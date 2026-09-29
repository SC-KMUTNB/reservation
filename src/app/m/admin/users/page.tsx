'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, RotateCw, CheckCircle2, AlertCircle, X, Trash2, Edit2 } from 'lucide-react';

interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export default function MobileAdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setMessage(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'เพิ่มผู้ใช้งานไม่สำเร็จ');
        return;
      }

      setMessage('เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว');
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
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-xs block">{u.fullName}</span>
                  <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.role === 'SUPER_ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

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
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl text-xs active:scale-98 transition shadow-xs"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'เพิ่มผู้ใช้งาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
