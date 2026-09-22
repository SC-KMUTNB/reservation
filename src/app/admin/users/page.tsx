'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Key,
  CheckCircle,
  XCircle,
  Trash2,
  Lock,
  Mail,
  User,
  X,
  AlertTriangle
} from 'lucide-react';

interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  _count?: {
    approvedBookings: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });

  const [editFormData, setEditFormData] = useState({
    fullName: '',
    role: 'ADMIN',
    isActive: true,
    password: '',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      } else {
        setErrorMsg('ไม่สามารถเข้าถึงข้อมูลผู้ดูแลระบบได้');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'ไม่สามารถเพิ่มผู้ดูแลระบบได้');
        return;
      }

      setSuccessMsg(`เพิ่มผู้ดูแลระบบ ${data.user.fullName} เรียบร้อยแล้ว`);
      setIsAddModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'ADMIN',
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        fullName: editFormData.fullName,
        role: editFormData.role,
        isActive: editFormData.isActive,
      };
      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้');
        return;
      }

      setSuccessMsg(`อัปเดตข้อมูล ${data.user.fullName} เรียบร้อยแล้ว`);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleDeleteUser = async (user: AdminUserItem) => {
    if (!confirm(`คุณต้องการลบบัญชีผู้ใช้ ${user.fullName} (${user.email}) ใช่หรือไม่?`)) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'ไม่สามารถลบบัญชีผู้ใช้ได้');
        return;
      }

      setSuccessMsg('ลบบัญชีผู้ดูแลระบบเรียบร้อยแล้ว');
      fetchUsers();
    } catch (e) {
      console.error(e);
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const openEditModal = (u: AdminUserItem) => {
    setSelectedUser(u);
    setEditFormData({
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      password: '',
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">จัดการรายชื่อผู้ดูแลระบบ (Multi-User Admins)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เพิ่ม แก้ไข และกำหนดสิทธิ์การเข้าถึงระบบระหว่าง Super Admin และ เจ้าหน้าที่ทั่วไป
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddModalOpen(true);
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> เพิ่มผู้ดูแลระบบใหม่
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3.5 font-semibold">ชื่อ-นามสกุล</th>
                <th className="p-3.5 font-semibold">อีเมลล็อกอิน</th>
                <th className="p-3.5 font-semibold">ระดับสิทธิ์ (Role)</th>
                <th className="p-3.5 font-semibold">สถานะบัญชี</th>
                <th className="p-3.5 font-semibold">ประวัติการอนุมัติ</th>
                <th className="p-3.5 font-semibold text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    กำลังโหลดรายชื่อผู้ดูแลระบบ...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{u.fullName}</div>
                      <div className="text-[10px] text-slate-400">
                        สร้างเมื่อ {u.createdAt.slice(0, 10)}
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">{u.email}</td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {u.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {u.isActive ? 'เปิดใช้งาน' : 'ระงับบัญชี'}
                      </span>
                    </td>

                    <td className="p-3.5 text-slate-600 font-medium">
                      {u._count ? `${u._count.approvedBookings} รายการ` : '-'}
                    </td>

                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(u)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                      >
                        แก้ไข
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        title="ลบบัญชี"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">เพิ่มผู้ดูแลระบบใหม่</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="เช่น นายเอกชัย ภักดี"
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมลสำหรับเข้าสู่ระบบ</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="staff@kmutnb.ac.th"
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ระดับสิทธิ์ (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="ADMIN">Admin (เจ้าหน้าที่: ตรวจสอบ/อนุมัติ/ส่งออก Excel)</option>
                  <option value="SUPER_ADMIN">Super Admin (สิทธิ์สูงสุด: จัดการผู้ใช้ & ตั้งค่าระบบ)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition cursor-pointer shadow-sm"
                >
                  บันทึกผู้ใช้ใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">แก้ไขข้อมูลผู้ดูแลระบบ</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ระดับสิทธิ์ (Role)</label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="ADMIN">Admin (เจ้าหน้าที่ทั่วไป)</option>
                  <option value="SUPER_ADMIN">Super Admin (ผู้ดูแลระบบสูงสุด)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">สถานะบัญชี</label>
                <select
                  value={editFormData.isActive ? 'true' : 'false'}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, isActive: e.target.value === 'true' })
                  }
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
                >
                  <option value="true">เปิดใช้งาน (Active)</option>
                  <option value="false">ระงับบัญชี (Suspended)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="รหัสผ่านใหม่..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition cursor-pointer shadow-sm"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
