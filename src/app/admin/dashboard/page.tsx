'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Search,
  Check,
  X
} from 'lucide-react';

interface AdminBooking {
  id: string;
  bookingCode: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  studentId: string;
  email: string;
  phone: string;
  department: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  approvedBy?: {
    fullName: string;
    email: string;
  };
  approvedAt?: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [rejectingBooking, setRejectingBooking] = useState<AdminBooking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    let result = [...bookings];

    if (statusFilter !== 'ALL') {
      result = result.filter((b) => b.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.fullName.toLowerCase().includes(q) ||
          b.studentId.toLowerCase().includes(q) ||
          b.bookingCode.toLowerCase().includes(q) ||
          b.department.toLowerCase().includes(q) ||
          b.date.includes(q)
      );
    }

    setFilteredBookings(result);
  }, [bookings, statusFilter, searchQuery]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string, rejectionReason?: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถอัปเดตสถานะได้');
        return;
      }

      setActionSuccess(`อัปเดตสถานะเรียบร้อยแล้ว (${status})`);
      setRejectingBooking(null);
      setRejectionReasonInput('');
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const deleteBooking = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบรายการจองของ ${name} ใช่หรือไม่?`)) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'ไม่สามารถลบรายการจองได้');
        return;
      }

      setActionSuccess('ลบรายการจองเรียบร้อยแล้ว');
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'PENDING').length,
    approved: bookings.filter((b) => b.status === 'APPROVED').length,
    rejected: bookings.filter((b) => b.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">แผงควบคุมการจองห้องประชุม</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ตรวจสอบ อนุมัติ และจัดการคำขอจองห้องประชุมสภานักศึกษา มจพ.
          </p>
        </div>

        <Link
          href="/admin/reports"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" /> ส่งออก Excel สำหรับผู้บริหาร
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-warm-xs">
          <div className="text-slate-500 text-xs font-medium">รายการจองทั้งหมด</div>
          <div className="text-2xl md:text-3xl font-bold text-slate-800 mt-1 tabular-nums font-mono">{stats.total}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-warm-xs">
          <div className="text-amber-800 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200 inline-block"></span> รออนุมัติ
          </div>
          <div className="text-2xl md:text-3xl font-bold text-amber-900 mt-1 tabular-nums font-mono">{stats.pending}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-warm-xs">
          <div className="text-emerald-800 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 inline-block"></span> อนุมัติแล้ว
          </div>
          <div className="text-2xl md:text-3xl font-bold text-emerald-900 mt-1 tabular-nums font-mono">{stats.approved}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-warm-xs">
          <div className="text-rose-800 text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200 inline-block"></span> ถูกปฏิเสธ
          </div>
          <div className="text-2xl md:text-3xl font-bold text-rose-900 mt-1 tabular-nums font-mono">{stats.rejected}</div>
        </div>
      </div>

      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสนักศึกษา, รหัสจอง, คณะ..."
              className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">สถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="PENDING">รออนุมัติ</option>
              <option value="APPROVED">อนุมัติแล้ว</option>
              <option value="REJECTED">ถูกปฏิเสธ</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3 font-semibold rounded-l-xl">วันที่ / เวลา</th>
                <th className="p-3 font-semibold">ผู้จอง / รหัสนักศึกษา</th>
                <th className="p-3 font-semibold">หน่วยงาน / เหตุผล</th>
                <th className="p-3 font-semibold">สถานะ</th>
                <th className="p-3 font-semibold">ผู้อนุมัติ</th>
                <th className="p-3 font-semibold text-right rounded-r-xl">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    กำลังโหลดข้อมูลการจอง...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    ไม่พบรายการจองตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-800">{b.date}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" /> {b.startTime} - {b.endTime} น.
                      </div>
                      <div className="font-mono text-[10px] text-orange-600 mt-0.5">{b.bookingCode}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-800">{b.fullName}</div>
                      <div className="text-slate-400 text-[11px]">รหัส: {b.studentId}</div>
                      <div className="text-slate-400 text-[10px]">โทร: {b.phone} | {b.email}</div>
                    </td>

                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-slate-700">{b.department}</div>
                      <div className="text-slate-500 text-[11px] truncate mt-0.5" title={b.reason}>
                        {b.reason}
                      </div>
                      {b.rejectionReason && (
                        <div className="text-rose-600 text-[10px] mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                          เหตุผลที่ปฏิเสธ: {b.rejectionReason}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          b.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : b.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {b.status === 'APPROVED'
                          ? 'อนุมัติแล้ว'
                          : b.status === 'PENDING'
                          ? 'รออนุมัติ'
                          : 'ถูกปฏิเสธ'}
                      </span>
                    </td>

                    <td className="p-3 text-[11px] text-slate-500">
                      {b.approvedBy ? (
                        <div>
                          <div className="font-medium text-slate-700">{b.approvedBy.fullName}</div>
                          <div className="text-[10px] text-slate-400">
                            {b.approvedAt ? b.approvedAt.slice(0, 10) : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                      {b.status !== 'APPROVED' && (
                        <button
                          onClick={() => updateStatus(b.id, 'APPROVED')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                          title="อนุมัติการจอง"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> อนุมัติ
                        </button>
                      )}

                      {b.status !== 'REJECTED' && (
                        <button
                          onClick={() => {
                            setRejectingBooking(b);
                            setRejectionReasonInput('');
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                          title="ปฏิเสธการจอง"
                        >
                          <XCircle className="w-3.5 h-3.5" /> ปฏิเสธ
                        </button>
                      )}

                      <button
                        onClick={() => deleteBooking(b.id, b.fullName)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        title="ลบรายการ"
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

      {rejectingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-slate-800">ปฏิเสธคำขอจองห้องประชุม</h3>
              <button
                onClick={() => setRejectingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              ปฏิเสธคำขอของ <span className="font-semibold text-slate-800">{rejectingBooking.fullName}</span> วันที่ {rejectingBooking.date} เวลา {rejectingBooking.startTime}-{rejectingBooking.endTime} น.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระบุเหตุผลในการปฏิเสธ (เพื่อแจ้งให้นักศึกษาทราบ)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="เช่น ห้องประชุมติดวาระเร่งด่วนของมหาวิทยาลัย หรือ วัตถุประสงค์ไม่ตรงตามเกณฑ์"
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateStatus(rejectingBooking.id, 'REJECTED', rejectionReasonInput)
                  }
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition cursor-pointer"
                >
                  ยืนยันการปฏิเสธ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
