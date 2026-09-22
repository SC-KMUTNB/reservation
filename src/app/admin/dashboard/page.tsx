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
  X,
  User,
  Building,
  ChevronRight,
  ShieldCheck,
  AlertCircle
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

const PRESET_REJECTION_REASONS = [
  'ช่วงเวลาดังกล่าวมีการใช้งานกิจกรรมของสภานักศึกษา',
  'ข้อมูลผู้ขอใช้บริการไม่ครบถ้วน หรือไม่สามารถติดต่อได้',
  'วัตถุประสงค์ไม่ตรงตามระเบียบการใช้ห้องประชุม',
  'มีคำขออื่นได้รับการอนุมัติในเวลาเดียวกันแล้ว',
];

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
      setActionError('ไม่สามารถดึงข้อมูลการจองได้');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string, rejectionReason?: string) => {
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

      setActionSuccess(
        status === 'APPROVED'
          ? 'อนุมัติการจองเรียบร้อยแล้ว'
          : status === 'REJECTED'
          ? 'ปฏิเสธคำขอการจองเรียบร้อยแล้ว'
          : 'อัปเดตสถานะสำเร็จ'
      );
      setRejectingBooking(null);
      setRejectionReasonInput('');
      fetchBookings();
    } catch (e) {
      console.error(e);
      setActionError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const deleteBooking = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบรายการจองของ ${name} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

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
      {/* Top Header & Quick Export */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            แผงควบคุมการจองห้องประชุม
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-light">
            ตรวจสอบความถูกต้อง อนุมัติ และจัดการคำขอจองห้องประชุมสภานักศึกษา มจพ.
          </p>
        </div>

        <Link
          href="/admin/reports"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-warm-xs transition flex items-center gap-2 active-press self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" /> ส่งออกรายงาน Excel
        </Link>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-warm-xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>คำขอทั้งหมด</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2 tabular-nums font-mono">
            {stats.total}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 bg-amber-50/20 shadow-warm-xs">
          <div className="flex justify-between items-center text-amber-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-200"></span> รอการอนุมัติ
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-900 mt-2 tabular-nums font-mono">
            {stats.pending}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 bg-emerald-50/20 shadow-warm-xs">
          <div className="flex justify-between items-center text-emerald-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span> อนุมัติแล้ว
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-900 mt-2 tabular-nums font-mono">
            {stats.approved}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200/80 bg-rose-50/20 shadow-warm-xs">
          <div className="flex justify-between items-center text-rose-800 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200"></span> ถูกปฏิเสธ
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-rose-900 mt-2 tabular-nums font-mono">
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 font-bold p-1 cursor-pointer">
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
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-warm p-5 md:p-6 space-y-5">
        {/* Controls Toolbar: Segmented Tabs & Search */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 pb-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
            >
              รออนุมัติ ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:text-emerald-900'
              }`}
            >
              อนุมัติแล้ว ({stats.approved})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active-press whitespace-nowrap cursor-pointer ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-800 hover:text-rose-900'
              }`}
            >
              ถูกปฏิเสธ ({stats.rejected})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสนักศึกษา, รหัสจอง, สังกัด..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Bookings Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">วันที่ & เวลา</th>
                <th className="p-3.5">ผู้จอง & ข้อมูลติดต่อ</th>
                <th className="p-3.5">หน่วยงาน & วัตถุประสงค์</th>
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5">ผู้พิจารณา</th>
                <th className="p-3.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    กำลังดึงข้อมูลคำขอจองล่าสุด...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <div>ไม่พบรายการจองตามเงื่อนไขที่เลือก</div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 tabular-nums font-mono">{b.date}</div>
                      <div className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5 tabular-nums font-mono">
                        <Clock className="w-3 h-3 text-slate-400" /> {b.startTime} - {b.endTime} น.
                      </div>
                      <div className="font-mono text-[10px] text-orange-600 mt-1 bg-orange-50 px-1.5 py-0.5 rounded inline-block border border-orange-200/60">
                        {b.bookingCode}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 text-xs">{b.fullName}</div>
                      <div className="text-slate-500 text-[11px] font-mono mt-0.5">รหัส: {b.studentId}</div>
                      <div className="text-slate-400 text-[10px] mt-0.5">โทร: {b.phone}</div>
                    </td>

                    <td className="p-3.5 max-w-xs">
                      <div className="font-medium text-slate-800">{b.department}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-2 mt-0.5" title={b.reason}>
                        {b.reason}
                      </div>
                      {b.rejectionReason && (
                        <div className="text-rose-700 text-[10px] mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          เหตุผลที่ปฏิเสธ: {b.rejectionReason}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs ${
                          b.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : b.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {b.status === 'APPROVED'
                          ? 'อนุมัติแล้ว'
                          : b.status === 'PENDING'
                          ? 'รออนุมัติ'
                          : 'ถูกปฏิเสธ'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      {b.approvedBy ? (
                        <div>
                          <div className="font-medium text-slate-800">{b.approvedBy.fullName}</div>
                          {b.approvedAt && (
                            <div className="text-slate-400 text-[10px] tabular-nums font-mono mt-0.5">
                              {new Date(b.approvedAt).toLocaleDateString('th-TH')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateBookingStatus(b.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="อนุมัติคำขอ"
                            >
                              <Check className="w-3.5 h-3.5" /> อนุมัติ
                            </button>
                            <button
                              onClick={() => {
                                setRejectingBooking(b);
                                setRejectionReasonInput('');
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition active-press flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="ปฏิเสธคำขอ"
                            >
                              <X className="w-3.5 h-3.5" /> ปฏิเสธ
                            </button>
                          </>
                        )}

                        {b.status !== 'PENDING' && (
                          <button
                            onClick={() => updateBookingStatus(b.id, 'PENDING')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-medium transition active-press flex items-center gap-1 cursor-pointer"
                            title="คืนสถานะเป็นรออนุมัติ"
                          >
                            <RotateCcw className="w-3 h-3" /> คืนสถานะ
                          </button>
                        )}

                        <button
                          onClick={() => deleteBooking(b.id, b.fullName)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Rejection Reason Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ระบุเหตุผลในการปฏิเสธคำขอ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  รายการของ <span className="font-semibold text-slate-800">{rejectingBooking.fullName}</span> วันที่ {rejectingBooking.date}
                </p>
              </div>
              <button
                onClick={() => setRejectingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-semibold text-slate-700">
                เลือกเหตุผลสำเร็จรูป หรือพิมพ์ระบุเอง:
              </label>
              <div className="flex flex-col gap-1.5">
                {PRESET_REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReasonInput(reason)}
                    className="text-left text-xs bg-slate-50 hover:bg-orange-50 hover:text-orange-700 border border-slate-200 hover:border-orange-300 p-2.5 rounded-xl transition cursor-pointer active-press"
                  >
                    • {reason}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="ระบุเหตุผลเพิ่มเติมที่จะแสดงให้ผู้ยื่นคำขอเห็น..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingBooking(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => updateBookingStatus(rejectingBooking.id, 'REJECTED', rejectionReasonInput)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition active-press shadow-warm-xs cursor-pointer"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
